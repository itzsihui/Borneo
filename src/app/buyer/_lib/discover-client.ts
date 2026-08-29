import { imageForProduct } from "@/lib/market/product-images";
import type { MarketProductPick } from "./buyer-flow";
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

const FASHION_BIAS = /shirt|tee|cap|hat|apparel|wear|hackathon/i;

function normalizeProductToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productMatchScore(
  requested: string,
  product: { id: string; title: string },
): number {
  const req = normalizeProductToken(requested);
  const title = normalizeProductToken(product.title);
  const id = normalizeProductToken(product.id);
  if (!req) return 0;
  if (title === req || id === req) return 100;
  const stem = (s: string) => s.replace(/s$/i, "");
  if (stem(title) === stem(req) || stem(id) === stem(req)) return 90;
  if (title.startsWith(req) || req.startsWith(title)) return 80;
  if (title.includes(req)) return 70;
  if (req.includes(title) && title.length >= 3) return 60;
  if (id.includes(req) || req.includes(id)) return 40;
  const reqTokens = req.split(" ").filter((t) => t.length > 2);
  const titleTokens = new Set(title.split(" "));
  const hits = reqTokens.filter(
    (t) => titleTokens.has(t) || stem(title).includes(t),
  );
  if (hits.length > 0) return 30 + hits.length * 10;
  return 0;
}

function fashionBonus(product: { title: string; storeSlug: string }): number {
  let bonus = 0;
  if (FASHION_BIAS.test(product.title)) bonus += 15;
  if (product.storeSlug === "hackathon-shirts") bonus += 25;
  return bonus;
}

export async function discoverFashionPicks(
  intent: string,
): Promise<{
  picks: MarketProductPick[];
  decomposed: ReturnType<typeof decomposeIntent>;
  storeSlugs: string[];
}> {
  const decomposed = decomposeIntent(intent);
  const hints = decomposed.itemHints.length
    ? decomposed.itemHints
    : extractItemHints(intent);

  const q = hints[0] || intent.trim() || "shirt";
  const res = await fetch(`/api/market?q=${encodeURIComponent(q)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Market search failed (HTTP ${res.status})`);
  }
  const data = (await res.json()) as MarketPayload;
  let products = data.products ?? [];

  // Bias empty / weak queries toward apparel demo store
  if (products.length === 0 || !hints.length) {
    const fallback = await fetch("/api/market?q=shirt", { cache: "no-store" });
    if (fallback.ok) {
      const fb = (await fallback.json()) as MarketPayload;
      products = [...products, ...(fb.products ?? [])];
    }
  }

  const scored = new Map<string, MarketProductPick>();

  for (const product of products) {
    let best = 0;
    if (hints.length === 0) {
      best = fashionBonus(product) + 20;
    } else {
      for (const hint of hints) {
        best = Math.max(best, productMatchScore(hint, product));
      }
      best += fashionBonus(product);
    }

    // Soft threshold — keep fashion-biased demo items even on weak match
    if (best < 40 && product.storeSlug !== "hackathon-shirts") continue;

    const key = `${product.storeSlug}:${product.id}`;
    const pick: MarketProductPick = {
      id: key,
      title: product.title,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      storeSlug: product.storeSlug,
      storeName: product.storeName,
      imageUrl:
        product.imageUrl ||
        imageForProduct(product.title, product.description, product.id),
      score: best,
    };
    const existing = scored.get(key);
    if (!existing || pick.score > existing.score) scored.set(key, pick);
  }

  // Prefer hackathon apparel when still empty
  if (scored.size === 0) {
    const all = await fetch("/api/market", { cache: "no-store" });
    if (all.ok) {
      const payload = (await all.json()) as MarketPayload;
      for (const product of payload.products ?? []) {
        if (product.storeSlug !== "hackathon-shirts") continue;
        const key = `${product.storeSlug}:${product.id}`;
        scored.set(key, {
          id: key,
          title: product.title,
          description: product.description,
          price: product.price,
          quantity: product.quantity,
          storeSlug: product.storeSlug,
          storeName: product.storeName,
          imageUrl:
            product.imageUrl ||
            imageForProduct(product.title, product.description, product.id),
          score: 50 + fashionBonus(product),
        });
      }
    }
  }

  const picks = [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const storeSlugs = [...new Set(picks.map((p) => p.storeSlug))];

  return { picks, decomposed, storeSlugs };
}
