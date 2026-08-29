/** Fashion-focused buyer copy — targets live hackathon-shirts SKUs only. */

export const FASHION_HEADLINE = "Fashion buyer agent";

export const FASHION_SUBCOPY =
  "Chat with your personal salesperson to clarify what you want. When ready, the agent reads /llms.txt + /registry.json (not HTML), ranks apparel, then you choose Visa card or USDC on Base Sepolia — and approve before anything pays.";

export const FASHION_WELCOME =
  "I'm your fashion buyer agent — tell me what you're looking for.";

export const FASHION_STARTERS = [
  "I want a t-shirt",
  "Looking for a cap",
  "Compare shirt vs cap under 0.02 USDC",
] as const;

export function purchaseMessage(args: {
  storeSlug: string;
  productTitle: string;
}) {
  const product = args.productTitle.trim().toLowerCase();
  const article = /^[aeiou]/i.test(product) ? "an" : "a";
  return `Agent, go to /s/${args.storeSlug} and buy ${article} ${product}.`;
}
