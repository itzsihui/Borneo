import { config } from "@/lib/config";
import type { StoreRecord } from "@/lib/store/types";

export function originFromRequest(request: Request) {
  const url = new URL(request.url);
  return process.env.PROTOCOL_ORIGIN || url.origin;
}

export function renderLlmsTxt(store: StoreRecord, origin: string) {
  const base = `${origin}/s/${store.slug}`;
  return `# ${store.name}

> AI-native storefront on the Agentic Storefront Protocol (Aisle).
> Humans use a GUI. Agents use this file.

This store sells in ${config.tokenSymbol} on Avalanche (${config.network}).
Do not scrape HTML. Do not open a checkout page.

## For agents
1. Read the agent card: ${base}/agent.json
2. Load machine catalog: ${base}/catalog.json
3. Pay via x402 POST ${base}/buy (expect HTTP 402) or StraitsX POST ${base}/checkout
4. Fetch receipts at ${base}/orders/{orderId}

## Discovery
- Agent card (JSON): ${base}/agent.json
- Catalog (ACP JSON): ${base}/catalog.json
- These instructions: ${base}/llms.txt

## Checkout rails
- Rail A x402: POST ${base}/buy
  - Expect HTTP 402 Payment Required with PAYMENT-REQUIRED.
  - Pay exact amount in ${config.tokenSymbol} to the merchant address, then retry with PAYMENT-SIGNATURE (tx hash).
- Rail B StraitsX virtual card: POST ${base}/checkout
  - Issue a one-time card via StraitsX MCP, scoped to spend cap, merchant whitelist, and expiry.
  - Burn the card after success.

## Receipts
- GET ${base}/orders/{orderId}

## Currency
- Token: ${config.tokenSymbol}
- Decimals: ${config.tokenDecimals}
- Asset: ${config.tokenAddress}
- Network: ${config.network} (chain ${config.chainId})
- Merchant payTo: ${store.merchantAddress}
`;
}
