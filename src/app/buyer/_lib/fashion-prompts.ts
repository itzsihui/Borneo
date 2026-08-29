/** Fashion-focused buyer copy — targets live hackathon-shirts SKUs only. */

export const FASHION_HEADLINE = "Fashion buyer agent";

export const FASHION_SUBCOPY =
  "State what you want to wear. The agent reads /llms.txt + /registry.json (not HTML), ranks apparel across the Borneo network, then you choose Visa card or USDC on Base Sepolia — and approve before anything pays.";

export const DEFAULT_FASHION_INTENT = "Buy the hackathon tee";

export const FASHION_CHIPS = [
  "Buy the hackathon tee",
  "Get the black Borneo cap",
  "Compare shirt vs cap under 0.02 USDC",
] as const;

export function isStaleTotePrompt(input: string) {
  return /tote\s*bag/i.test(input);
}

export function purchaseMessage(args: {
  storeSlug: string;
  productTitle: string;
}) {
  const product = args.productTitle.trim().toLowerCase();
  const article = /^[aeiou]/i.test(product) ? "an" : "a";
  return `Agent, go to /s/${args.storeSlug} and buy ${article} ${product}.`;
}
