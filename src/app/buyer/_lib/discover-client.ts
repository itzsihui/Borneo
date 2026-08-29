import { imageForProduct } from "@/lib/market/product-images";
import type { FashionProfile, MarketProductPick } from "./buyer-flow";
import { decomposeIntent, extractItemHints } from "./intent-decompose";

type MarketApiProduct = {
  id: string;
  title: string;
  description?: string;
  price: string;
  quantity: number;
  storeSlug: string;
  storeName: string;
  imageUrl?: string;
};

type MarketPayload = {
  products: MarketApiProduct[];
};

const STOP = new Set([
  "a",
  "an",
  "the",
  "i",
  "im",
  "i'm",
  "want",
  "wanna",
  "need",
  "get",
  "buy",
  "looking",
  "for",
  "with",
  "my",
  "me",
  "to",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "it",
  "its",
  "is",
  "are",
  "be",
  "as",
  "long",
  "really",
  "just",
  "something",
  "anything",
  "please",
  "under",
  "below",
  "about",
  "going",
  "hang",
  "out",
  "friends",
  "comfortable",
  "comfort",
  "key",
  "preferred",
  "preference",
  "color",
  "colour",
  "budget",
  "usdc",
  "xsgd",
  "usd",
  "sgd",
]);

/** Light synonym expansion so "tee" can match "shirt" titles — not category enums. */
const SYNONYMS: Record<string, string[]> = {
  tee: ["tee", "tshirt", "t-shirt", "shirt"],
  tshirt: ["tee", "tshirt", "shirt"],
  shirt: ["shirt", "tee", "tshirt"],
  cap: ["cap", "hat", "beanie"],
  hat: ["hat", "cap", "beanie"],
  jeans: ["jeans", "denim", "pants"],
  pants: ["pants", "jeans", "denim", "trousers"],
  trousers: ["trousers", "pants", "jeans"],
  sneakers: ["sneakers", "shoes", "trainers"],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/t-shirt/g, "tshirt")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(s: string) {
  if (s.endsWith("ies") && s.length > 4) return `${s.slice(0, -3)}y`;
  if (s.endsWith("sses")) return s.slice(0, -2);
  if (s.endsWith("s") && !s.endsWith("ss") && s.length > 3) return s.slice(0, -1);
  return s;
}

function tokensFrom(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .map(stem)
    .filter((t) => t.length > 1 && !STOP.has(t) && !/^\d+(\.\d+)?$/.test(t));
}

function expandToken(token: string): string[] {
  const base = stem(token);
  const syn = SYNONYMS[base] || SYNONYMS[token];
  if (!syn) return [base];
  return [...new Set(syn.map(stem))];
}

function queryTerms(
  intent: string,
  profile?: FashionProfile | null,
  hints?: string[],
): string[] {
  const parts = [
    intent,
    profile?.item,
    profile?.style,
    profile?.color,
    ...(hints || []),
  ]
    .filter(Boolean)
    .join(" ");
  const raw = tokensFrom(parts);
  const expanded = new Set<string>();
  for (const t of raw) {
    for (const e of expandToken(t)) expanded.add(e);
  }
  return [...expanded];
}

function productTokens(product: MarketApiProduct): string[] {
  return tokensFrom(`${product.id} ${product.title} ${product.description || ""}`);
}

/** Score a catalog product against free-text intent — no hard-coded category kinds. */
function scoreProduct(
  product: MarketApiProduct,
  terms: string[],
): number {
  if (terms.length === 0) return 0;
  const hayTokens = new Set(productTokens(product));
  const title = normalize(product.title);
  const id = normalize(product.id);
  let score = 0;
  let hits = 0;

  for (const term of terms) {
    if (hayTokens.has(term)) {
      hits += 1;
      score += 40;
      continue;
    }
    if (title.includes(term) || id.includes(term)) {
      hits += 1;
      score += 35;
      continue;
    }
    // partial stem containment
    for (const ht of hayTokens) {
      if (ht.includes(term) || term.includes(ht)) {
        hits += 1;
        score += 20;
        break;
      }
    }
  }

  // Require at least one real token hit — never rank on store membership alone
  if (hits === 0) return 0;

  // Prefer denser overlap
  score += Math.round((hits / terms.length) * 25);
  return score;
}

function parseBudgetMax(profile?: FashionProfile | null): number | null {
  if (!profile?.budget) return null;
  const m = profile.budget.match(/([\d.]+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function toPick(product: MarketApiProduct, score: number): MarketProductPick {
  return {
    id: `${product.storeSlug}:${product.id}`,
    title: product.title,
    description: product.description,
    price: product.price,
    quantity: product.quantity,
    storeSlug: product.storeSlug,
    storeName: product.storeName,
    imageUrl:
      product.imageUrl ||
      imageForProduct(product.title, product.description, product.id),
    score,
  };
}

export async function discoverFashionPicks(
  intent: string,
  profile?: FashionProfile | null,
): Promise<{
  picks: MarketProductPick[];
  decomposed: ReturnType<typeof decomposeIntent>;
  storeSlugs: string[];
}> {
  const decomposed = decomposeIntent(intent);
  const hints = decomposed.itemHints.length
    ? decomposed.itemHints
    : extractItemHints(intent);
  const terms = queryTerms(intent, profile, hints);

  // Always load full market, then rank client-side against catalog text
  // (avoids storeSlug false-positives like q="shirt" → hackathon-shirts).
  const res = await fetch("/api/market", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Market search failed (HTTP ${res.status})`);
  }
  const data = (await res.json()) as MarketPayload;
  let products = data.products ?? [];

  const budgetMax = parseBudgetMax(profile);
  if (budgetMax != null) {
    products = products.filter((p) => {
      const price = Number(p.price);
      return !Number.isFinite(price) || price <= budgetMax;
    });
  }

  const scored = new Map<string, MarketProductPick>();
  for (const product of products) {
    const score = scoreProduct(product, terms);
    if (score <= 0) continue;
    const pick = toPick(product, score);
    const existing = scored.get(pick.id);
    if (!existing || pick.score > existing.score) scored.set(pick.id, pick);
  }

  let picks = [...scored.values()].sort((a, b) => b.score - a.score);

  // Keep strong matches only (relative to best), unless comparing many options
  if (picks.length > 1) {
    const top = picks[0]!.score;
    const floor = Math.max(30, top * 0.55);
    picks = picks.filter((p) => p.score >= floor);
  }

  picks = picks.slice(0, 3);

  // If nothing matched tokens, surface top catalog items that share any hint word
  // still requiring title/id hit — never dump whole store.
  if (picks.length === 0 && terms.length > 0) {
    for (const product of products) {
      const hay = normalize(`${product.title} ${product.id}`);
      if (terms.some((t) => hay.includes(t))) {
        picks.push(toPick(product, 25));
      }
    }
    picks = picks.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  const storeSlugs = [...new Set(picks.map((p) => p.storeSlug))];

  return { picks, decomposed, storeSlugs };
}
