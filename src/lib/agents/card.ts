import { config } from "@/lib/config";
import { resolveBuyerTarget } from "@/lib/agents/discover";
import { emit } from "@/lib/protocol/events";
import { issueScopedCard } from "@/lib/straitsx/mcp";
import { repo } from "@/lib/store/repo";

export type CardStep = {
  type: "info" | "http" | "card" | "error" | "success";
  text: string;
};

export async function runCardAgent(args: {
  origin: string;
  message?: string;
  slug?: string;
}): Promise<{ steps: CardStep[]; receipt?: unknown; mandate?: unknown }> {
  const steps: CardStep[] = [];

  const resolved = await resolveBuyerTarget({
    slug: args.slug,
    message: args.message,
  });

  if (!resolved.ok) {
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
  }

  steps.push({ type: "info", text: `Discovering ${base}/llms.txt` });
  const llms = await fetch(`${base}/llms.txt`);
  steps.push({
    type: "http",
    text: `GET llms.txt → ${llms.status}`,
  });

  const catalogRes = await fetch(`${base}/catalog.json`);
  const store = await repo.getStore(slug);
  const price =
    store?.skus.find((s) => s.id === sku.id)?.price ??
    store?.skus[0]?.price ??
    "0.01";
  steps.push({
    type: "http",
    text: `GET catalog.json → ${catalogRes.status} ${sku.title} @ ${price}`,
  });

  steps.push({
    type: "card",
    text: `Issuing via StraitsX Card MCP (${config.straitsxMcpUrl}) · cap ≥${price} · merchant ${slug}`,
  });
  const mandate = await issueScopedCard({
    spendCap: price,
    merchant: slug,
    ttlMinutes: 15,
  });
  steps.push({
    type: "card",
    text: `Mandate ${mandate.cardOpaqueId} pan ${mandate.truncatedPan} source ${mandate.source}${
      mandate.settlementTx ? ` settle ${mandate.settlementTx}` : ""
    }`,
  });
  if (mandate.note) {
    steps.push({ type: "info", text: mandate.note });
  }

  const orderId = crypto.randomUUID();
  steps.push({ type: "info", text: `POST ${base}/checkout with scoped mandate` });
  const checkout = await fetch(`${base}/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      skuId: sku.id,
      quantity: 1,
      orderId,
      mandate,
    }),
  });
  const checkoutText = await checkout.text();
  let receipt: unknown;
  try {
    receipt = JSON.parse(checkoutText);
  } catch {
    emit({
      status: checkout.status,
      method: "POST",
      path: `/s/${slug}/checkout`,
      store: slug,
      orderId,
      rail: "straitsx-card",
      message: `checkout non-JSON: ${checkoutText.slice(0, 120)}`,
    });
    steps.push({
      type: "error",
      text: `HTTP ${checkout.status} non-JSON from /checkout`,
    });
    return { steps, mandate };
  }

  emit({
    status: checkout.status,
    method: "POST",
    path: `/s/${slug}/checkout`,
    store: slug,
    orderId,
    rail: "straitsx-card",
    message: checkout.ok
      ? `card mandate accepted, burn ${mandate.cardOpaqueId}`
      : `checkout failed: ${JSON.stringify(receipt).slice(0, 160)}`,
  });

  if (!checkout.ok) {
    steps.push({
      type: "error",
      text: `HTTP ${checkout.status} ${JSON.stringify(receipt)}`,
    });
    return { steps, mandate, receipt };
  }

  const paid = receipt as { amount?: string; orderId?: string };
  steps.push({
    type: "success",
    text: `Checkout OK · ${paid.amount ?? price} ${config.tokenSymbol} · order ${paid.orderId ?? orderId}`,
  });
  return { steps, mandate, receipt };
}
