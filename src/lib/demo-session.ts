const SESSION_KEY = "borneo.demo.session.v1";

export type SessionStoreRef = {
  slug: string;
  name: string;
  productHint: string;
};

export type OnboardSession = {
  message: string;
  lines: Array<{ role: "merchant" | "borneo"; text: string; llm?: string }>;
  draft: {
    name?: string;
    lines: Array<{ quantity: number; title: string; price?: string }>;
  } | null;
  prices: string[];
  quantities?: string[];
  slug: string | null;
  merchantAddress?: string | null;
  merchantAuth?: {
    address: string;
    message: string;
    signature: string;
    chainId: number;
    authenticatedAt: string;
  } | null;
};

export type BuyerSession = {
  input: string;
  lines: Array<{ role: string; text: string }>;
};

export type BorneoDemoSession = {
  lastStore?: SessionStoreRef;
  onboard?: OnboardSession;
  buyer?: BuyerSession;
};

function canUseSession() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function readDemoSession(): BorneoDemoSession {
  if (!canUseSession()) return {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BorneoDemoSession;
  } catch {
    return {};
  }
}

export function writeDemoSession(patch: Partial<BorneoDemoSession>) {
  if (!canUseSession()) return;
  try {
    const next = { ...readDemoSession(), ...patch };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode — ignore
  }
}

/** "iphones" → "iphone", "jeans" → "jeans" */
export function singularProductHint(title: string) {
  const t = title.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return "item";
  if (t.endsWith("ies") && t.length > 4) return `${t.slice(0, -3)}y`;
  if (t.endsWith("sses")) return t.slice(0, -2);
  if (t.endsWith("s") && !t.endsWith("ss") && t.length > 3) return t.slice(0, -1);
  return t;
}

export function storeRefFromPublish(store: {
  slug: string;
  name?: string;
  skus?: Array<{ title: string }>;
}): SessionStoreRef {
  const first = store.skus?.[0]?.title || store.name || "item";
  return {
    slug: store.slug,
    name: store.name || store.slug,
    productHint: singularProductHint(first),
  };
}

export function defaultBuyerPrompt(store?: SessionStoreRef | null) {
  if (!store?.slug) {
    return "Agent, buy a tote bag.";
  }
  const product = store.productHint || "item";
  const article = /^[aeiou]/i.test(product) ? "an" : "a";
  return `Agent, go to /s/${store.slug} and buy ${article} ${product}.`;
}

export const DEFAULT_ONBOARD_MESSAGE = "";

export const DEFAULT_ONBOARD_LINES: OnboardSession["lines"] = [
  {
    role: "borneo",
    text: "Add your first fashion product\n\nWhat are you selling — apparel, accessories, shoes?\n\nYou've got a few ways to get inventory into your store:\n\n• Add product — Describe what you stock (e.g. linen shirts, tote bags, sneakers) and I'll draft titles + quantities, then ask for USDC prices.\n• Import CSV — Bring a catalog via CSV (title, description, quantity, price).\n• Store URL — Paste a Shopify storefront; we'll suggest USD≈USDC prices for you to confirm.\n• Connect CRM — Salesforce / CRM inventory (placeholder for the demo).\n• Sign in with MetaMask — Prove your payout address for x402 on Base Sepolia (no funds move).\n\nAfter import you can edit titles, add or remove rows, then publish. Buying agents read your store — not HTML.",
  },
];

export const DEFAULT_BUYER_LINES: BuyerSession["lines"] = [
  {
    role: "agent",
    text: "Buyer agent ready. I read /llms.txt + /registry.json (and store catalogs) — not HTML. You can name a product without a slug.",
  },
];
