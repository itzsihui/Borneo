import {
  createWalletClient,
  http,
  publicActions,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalanche, avalancheFuji } from "viem/chains";
import { resolveBuyerTarget } from "@/lib/agents/discover";
import { config, explorerTx } from "@/lib/config";
import { emit } from "@/lib/protocol/events";

const erc20 = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

export type BuyerStep = {
  type: "info" | "http" | "chain" | "error" | "success";
  text: string;
};

export type BuyerReceipt = {
  orderId?: string;
  explorerUrl?: string;
  txHash?: string;
  amount?: string;
  rail?: string;
  status?: string;
  [key: string]: unknown;
};

export { extractRequestedProduct } from "@/lib/agents/discover";

/** Deterministic x402 handshake — works with or without Bedrock. */
export async function payX402Tool(args: {
  origin: string;
  slug?: string;
  message?: string;
  /** Product name or sku id the buyer asked for */
  product?: string;
}): Promise<{ steps: BuyerStep[]; receipt?: BuyerReceipt }> {
  const steps: BuyerStep[] = [];

  const resolved = await resolveBuyerTarget({
    slug: args.slug,
    message: args.message,
    product: args.product,
  });

  if (!resolved.ok) {
    steps.push({
      type: "info",
      text: args.slug || args.message?.includes("/s/")
        ? "Resolving store"
        : "Searching Aisle network registry (no /s/{slug} in prompt)",
    });
    steps.push({
      type: "error",
      text: resolved.available
        ? `${resolved.reason} Available: ${resolved.available}.`
        : resolved.reason,
    });
    return { steps };
  }

  const { slug, sku, via } = resolved;
  const base = `${args.origin}/s/${slug}`;

  if (via === "registry") {
    steps.push({
      type: "info",
      text: `Network registry → matched ${sku.title} @ /s/${slug}`,
    });
    emit({
      status: 200,
      method: "GET",
      path: "/registry.json",
      store: slug,
      message: `buyer matched ${sku.title}`,
    });
  }

  steps.push({ type: "info", text: `Discovering ${base}/llms.txt` });
  const llms = await fetch(`${base}/llms.txt`);
  const llmsText = await llms.text();
  steps.push({
    type: "http",
    text: `GET llms.txt → ${llms.status} (${llmsText.split("\n")[0]})`,
  });

  steps.push({ type: "info", text: "Loading ACP catalog" });
  const catalogRes = await fetch(`${base}/catalog.json`);
  steps.push({
    type: "http",
    text: `GET catalog.json → ${catalogRes.status} matched ${sku.title}`,
  });

  const orderId = crypto.randomUUID();
  steps.push({ type: "info", text: `POST ${base}/buy (no payment)` });
  const first = await fetch(`${base}/buy`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ skuId: sku.id, quantity: 1, orderId }),
  });
  const challenge = (await first.json()) as {
    accepts?: Array<{
      maxAmountRequired: string;
      payTo: `0x${string}`;
    }>;
  };
  steps.push({
    type: "http",
    text: `HTTP ${first.status} ${first.status === 402 ? "Payment Required" : ""}`,
  });

  if (first.status !== 402) {
    steps.push({ type: "error", text: "Expected 402 challenge" });
    return { steps };
  }

  const accept = challenge.accepts?.[0];
  if (!accept) {
    steps.push({ type: "error", text: "402 missing accepts[]" });
    return { steps };
  }

  if (!config.buyerPrivateKey) {
    emit({
      status: 402,
      method: "POST",
      path: `${base}/buy`,
      store: slug,
      orderId,
      rail: "x402",
      message: "402 unpaid: BUYER_PRIVATE_KEY missing, cannot sign on Avalanche",
    });
    steps.push({
      type: "error",
      text: "402 is the challenge. Add BUYER_PRIVATE_KEY + funded XSGD, then Buy again.",
    });
    return { steps, receipt: challenge as BuyerReceipt };
  }

  const chain = config.network === "avalanche" ? avalanche : avalancheFuji;
  const account = privateKeyToAccount(config.buyerPrivateKey);
  const wallet = createWalletClient({
    account,
    chain,
    transport: http(config.rpcUrl),
  }).extend(publicActions);

  steps.push({
    type: "chain",
    text: `Signing ${config.tokenSymbol} transfer ${accept.maxAmountRequired} → ${accept.payTo} on Avalanche`,
  });
  let txHash: `0x${string}`;
  try {
    txHash = await wallet.writeContract({
      address: config.tokenAddress,
      abi: erc20,
      functionName: "transfer",
      args: [accept.payTo, BigInt(accept.maxAmountRequired)],
      gas: 150_000n,
    });
    await wallet.waitForTransactionReceipt({ hash: txHash });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "transfer failed";
    emit({
      status: 402,
      method: "POST",
      path: `${base}/buy`,
      store: slug,
      orderId,
      rail: "x402",
      message: `402 unsigned: ${reason}`,
    });
    steps.push({ type: "error", text: reason });
    return { steps, receipt: challenge as BuyerReceipt };
  }
  const snowtrace = explorerTx(txHash);
  steps.push({ type: "chain", text: `Settled ${txHash}` });
  steps.push({ type: "success", text: snowtrace });

  const signature = Buffer.from(JSON.stringify({ txHash })).toString("base64");
  const second = await fetch(`${base}/buy`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "PAYMENT-SIGNATURE": signature,
    },
    body: JSON.stringify({ skuId: sku.id, quantity: 1, orderId }),
  });
  const secondText = await second.text();
  let receipt: BuyerReceipt;
  try {
    receipt = JSON.parse(secondText) as BuyerReceipt;
  } catch {
    const snippet = secondText.slice(0, 160).replace(/\s+/g, " ");
    steps.push({
      type: "error",
      text: `HTTP ${second.status} non-JSON from /buy: ${snippet}`,
    });
    return {
      steps,
      receipt: { txHash, explorerUrl: snowtrace, status: "verify-failed" },
    };
  }
  if (!receipt.explorerUrl && txHash) {
    receipt.explorerUrl = snowtrace;
    receipt.txHash = txHash;
  }
  steps.push({
    type: second.ok ? "success" : "error",
    text: `HTTP ${second.status} ${second.ok ? "receipt unlocked" : JSON.stringify(receipt)}`,
  });
  if (second.ok && receipt.explorerUrl) {
    steps.push({ type: "success", text: receipt.explorerUrl });
  }
  return { steps, receipt };
}
