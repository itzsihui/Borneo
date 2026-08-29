export type AvalancheNetwork = "avalanche-fuji" | "avalanche";

function env(name: string, fallback: string) {
  return process.env[name] || fallback;
}

export const config = {
  rpcUrl: env(
    "AVALANCHE_RPC_URL",
    "https://api.avax-test.network/ext/bc/C/rpc",
  ),
  network: env("AVALANCHE_NETWORK", "avalanche-fuji") as AvalancheNetwork,
  chainId: Number(env("CHAIN_ID", "43113")),
  tokenAddress: env(
    "TOKEN_ADDRESS",
    "0xd769410dc8772695A7f55a304d2125320A65c2a5",
  ) as `0x${string}`,
  tokenSymbol: env("TOKEN_SYMBOL", "XSGD"),
  tokenDecimals: Number(env("TOKEN_DECIMALS", "6")),
  /**
   * Demo unit price in XSGD. StraitsX sandbox card issuance requires 5–30 SGD;
   * keep store SKUs at this floor so x402 + card rails stay aligned.
   */
  demoUnitPriceXsgd: "0.01",
  merchantAddress: env(
    "MERCHANT_ADDRESS",
    "0x0000000000000000000000000000000000000000",
  ) as `0x${string}`,
  get buyerPrivateKey() {
    const raw = process.env.BUYER_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "");
    if (!raw) return undefined;
    const key = raw.startsWith("0x") ? raw : `0x${raw}`;
    // Private keys are 32 bytes = 66 hex chars with 0x. Addresses are 42 — reject those.
    return key.length === 66 && /^0x[0-9a-fA-F]{64}$/.test(key)
      ? (key as `0x${string}`)
      : undefined;
  },
  explorerBase: env("EXPLORER_BASE", "https://testnet.snowtrace.io"),
  straitsxMcpUrl: env(
    "STRAITSX_MCP_URL",
    "https://card.straitsx.ai/sandbox/sse",
  ),
  /** DevRel-issued Card MCP auth — not business API (KYB). Accepts either env name. */
  get straitsxMcpToken() {
    return (
      process.env.STRAITSX_MCP_TOKEN?.trim() ||
      process.env.STRAITSX_API_KEY?.trim() ||
      undefined
    );
  },
  bedrockRegion: env("AWS_REGION", "ap-southeast-1"),
  bedrockModel: env(
    "BEDROCK_MODEL_ID",
    "anthropic.claude-3-haiku-20240307-v1:0",
  ),
  /** When set, buyer/card agents hit API Gateway instead of the Next origin. */
  get protocolBaseUrl() {
    return (
      process.env.PROTOCOL_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_PROTOCOL_BASE_URL?.trim() ||
      undefined
    );
  },
};

export function explorerTx(hash: string) {
  return `${config.explorerBase}/tx/${hash}`;
}

export function toAtomic(price: string) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid price: ${price}`);
  }
  return BigInt(Math.round(n * 10 ** config.tokenDecimals)).toString();
}

export function fromAtomic(atomic: string) {
  const v = Number(atomic) / 10 ** config.tokenDecimals;
  return v.toFixed(2);
}
