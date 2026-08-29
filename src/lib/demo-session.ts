const SESSION_KEY = "aisle.demo.session.v3";

export type SessionStoreRef = {
  slug: string;
  name: string;
  productHint: string;
};

export type OnboardSession = {
  message: string;
  lines: Array<{ role: "merchant" | "aisle"; text: string; llm?: string }>;
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

export type AisleDemoSession = {
  lastStore?: SessionStoreRef;
  onboard?: OnboardSession;
  buyer?: BuyerSession;
};

function canUseSession() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function readDemoSession(): AisleDemoSession {
  if (!canUseSession()) return {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AisleDemoSession;
  } catch {
    return {};
  }
}

export function writeDemoSession(patch: Partial<AisleDemoSession>) {
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
    role: "aisle",
    text: "Add your first product\n\nWhat are you selling? That's the most exciting question in e-commerce! 🚀\n\nYou've got a few ways to get your first product into your store:\n\n• Add product — Build a listing from a description. Tell me what you stock and I'll pull title, quantity, and ask for XSGD prices — inventory ready for buying agents.\n• Import CSV — Already have a catalog? Bring it in via CSV (title, description, quantity, price).\n• Store URL — Paste a Shopify storefront (e.g. your-store.myshopify.com); we'll convert USD→XSGD suggestions for you to confirm.\n• Sign in with MetaMask — Approve connect + sign a message on Avalanche Fuji. That proves the payout address for x402 (no funds move).\n\nWhich of these fits where you're at? If you already know what you're selling, tell me about it (or drop a CSV / store URL!) and I'll get your first listing built out.",
  },
];

export const DEFAULT_BUYER_LINES: BuyerSession["lines"] = [
  {
    role: "agent",
    text: "Buyer agent ready. I read /llms.txt + /registry.json (and store catalogs) — not HTML. You can name a product without a slug.",
  },
];
