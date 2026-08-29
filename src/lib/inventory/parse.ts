import type { Sku, StoreRecord } from "@/lib/store/types";
import { config } from "@/lib/config";
import Papa from "papaparse";

export type ParsedInventory = {
  name: string;
  slug: string;
  skus: Omit<Sku, "id">[];
};

export type MerchantDraftLine = {
  quantity: number;
  title: string;
  name?: string;
  /** Optional product blurb (e.g. from Shopify body_html). */
  description?: string;
  /** Set when inventory is priced but wallet is still missing. */
  price?: string;
};

export type MerchantDraft = {
  name?: string;
  slug?: string;
  lines: MerchantDraftLine[];
};

/** Accept legacy single-line drafts from older clients. */
export function normalizeDraft(
  draft:
    | MerchantDraft
    | { quantity: number; title: string; name?: string; lines?: MerchantDraftLine[] }
    | null
    | undefined,
): MerchantDraft | null {
  if (!draft) return null;
  if (Array.isArray(draft.lines) && draft.lines.length > 0) {
    return {
      name: draft.name,
      slug: "slug" in draft ? draft.slug : undefined,
      lines: draft.lines.map((line) => ({
        quantity: Number(line.quantity),
        title: String(line.title).trim(),
        name: line.name,
        description: line.description,
        price: line.price,
      })),
    };
  }
  if ("quantity" in draft && "title" in draft && draft.title) {
    return {
      name: draft.name,
      lines: [
        {
          quantity: Number(draft.quantity),
          title: String(draft.title).trim(),
          name: draft.name,
        },
      ],
    };
  }
  return null;
}

export type InventoryParseResult =
  | { ok: true; inventory: ParsedInventory }
  | {
      ok: false;
      missing: "price";
      draft: MerchantDraft;
      ask: string;
    }
  | {
      ok: false;
      missing: "inventory";
      draft: null;
      ask: string;
    };

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "store"
  );
}

function cleanPrompt(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function stripSellerPreamble(text: string) {
  return text
    .replace(
      /^(?:create a store[.!]?\s*)?(?:i(?:'m| am) selling|selling|sell)\s+/i,
      "",
    )
    .replace(
      /^(?:i\s+wanna\s+set\s+up|i\s+want\s+to\s+set\s+up|set\s+up)\s+(?:a\s+)?(?:\w+\s+)*store[,.]?\s*/i,
      "",
    )
    .trim();
}

function normalizeTitle(raw: string) {
  return raw
    .replace(/\s+for\s+\d+(?:\.\d+)?\s*(?:xsgd|sgd)?\.?$/i, "")
    .replace(/[.,!;:?]+$/g, "")
    .trim();
}

function storeNameFromTitle(title: string) {
  if (/hackathon/i.test(title)) return "StraitsX Hackathon Shirts";
  return title.replace(/\b\w/g, (c) => c.toUpperCase());
}

function looksLikeGreetingOrChat(text: string) {
  const t = cleanPrompt(text).toLowerCase().replace(/[!?.]+$/g, "");
  if (!t) return true;
  if (
    /^(hi|hello|hey|yo|sup|thanks|thank you|thx|ok|okay|cool|nice|help|what|whats|what's|whatt|huh|hm+|umm+|idk|lol|haha|test)$/i.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /^(hi|hello|hey)\b/.test(t) &&
    !/\d+\s+\w+/.test(t) &&
    !/\bselling\b/i.test(t)
  ) {
    return true;
  }
  if (
    /^(what|how|why|who|where|can you|could you|help)\b/i.test(t) &&
    !/\bselling\b/i.test(t) &&
    !/\d+\s+[a-z]/i.test(t)
  ) {
    return true;
  }
  return false;
}

function hasSellIntent(text: string) {
  return /(?:create\s+a\s+store|i(?:'m| am)\s+selling|\bselling\b|\bsell\b|set\s+up\s+(?:a\s+)?\w+\s+store)/i.test(
    text,
  );
}

/** Price-only follow-up after we asked "how much?" */
export function parsePriceOnly(text: string): string | null {
  const cleaned = cleanPrompt(text);
  const match = cleaned.match(
    /^(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:xsgd|sgd)?(?:\s+each)?\.?$/i,
  );
  return match ? Number(match[1]).toFixed(2) : null;
}

function guideAsk() {
  return `Tell me what you're selling — quantity, product, and price in ${config.tokenSymbol}. Example: "10 water bottles for 2 XSGD each".`;
}

function priceAsk(draft: MerchantDraft) {
  if (draft.lines.length === 1) {
    const { quantity, title } = draft.lines[0];
    const unit = title.replace(/s$/i, "") || title;
    return `Got it — ${quantity} ${title}. Fill in the ${config.tokenSymbol} price below (or reply e.g. "2 ${config.tokenSymbol} each").`;
  }
  const list = draft.lines
    .map((l) => `${l.quantity} ${l.title}`)
    .join(", ");
  return `Got it — ${list}. Fill in a ${config.tokenSymbol} price for each product below.`;
}

function draftFromLines(
  lines: MerchantDraftLine[],
  storeHint?: string,
): MerchantDraft {
  const name =
    storeHint ||
    (lines.length === 1
      ? storeNameFromTitle(lines[0].title)
      : "Aisle Store");
  return {
    name,
    slug: slugify(name),
    lines,
  };
}

/** Extract "5 shirts, 5 jeans, 10 socks" style lines (optionally with prices). */
export function extractInventoryLines(text: string): {
  lines: Array<MerchantDraftLine & { price?: string }>;
  storeHint?: string;
} | null {
  const cleaned = cleanPrompt(text);
  if (!cleaned) return null;

  const storeMatch = cleaned.match(
    /(?:set\s+up|open|create)\s+(?:a\s+)?([a-z][a-z\s]{0,40}?)\s+store/i,
  );
  const storeHint = storeMatch
    ? storeNameFromTitle(storeMatch[1].trim())
    : undefined;

  const body = stripSellerPreamble(cleaned);
  const withPrices: Array<MerchantDraftLine & { price?: string }> = [];

  // "5 shirts for 2 XSGD, 5 jeans at 10"
  const pricedRe =
    /(\d+)\s+([a-z][a-z0-9\s-]{0,40}?)\s+(?:for|at|@|=)\s+(\d+(?:\.\d+)?)\s*(?:xsgd|sgd)?(?:\s+each)?/gi;
  let m: RegExpExecArray | null;
  const pricedSpans: Array<{ start: number; end: number }> = [];
  while ((m = pricedRe.exec(body)) !== null) {
    withPrices.push({
      quantity: Number(m[1]),
      title: normalizeTitle(m[2]),
      price: Number(m[3]).toFixed(2),
    });
    pricedSpans.push({ start: m.index, end: m.index + m[0].length });
  }

  // Strip priced spans then find qty+title without price
  let remainder = body;
  for (const span of [...pricedSpans].reverse()) {
    remainder =
      remainder.slice(0, span.start) + " " + remainder.slice(span.end);
  }
  remainder = remainder.replace(/\s+/g, " ").trim();

  const bareRe = /(\d+)\s+([a-z][a-z0-9\s-]{1,40}?)(?=\s*(?:,|and|&|\d+\s+[a-z]|$))/gi;
  while ((m = bareRe.exec(remainder)) !== null) {
    const title = normalizeTitle(m[2]);
    if (!title || title.length < 2) continue;
    if (looksLikeGreetingOrChat(title)) continue;
    withPrices.push({ quantity: Number(m[1]), title });
  }

  // Single "10 water bottles" leftover
  if (withPrices.length === 0) {
    const single = remainder.match(/^(\d+)\s+([a-z].+)$/i);
    if (single) {
      const title = normalizeTitle(single[2]);
      if (title && !looksLikeGreetingOrChat(title)) {
        withPrices.push({ quantity: Number(single[1]), title });
      }
    }
  }

  if (withPrices.length === 0) return null;
  return { lines: withPrices, storeHint };
}

export function parseMerchantPrompt(text: string): InventoryParseResult {
  const cleaned = cleanPrompt(text);
  if (!cleaned || looksLikeGreetingOrChat(cleaned)) {
    return { ok: false, missing: "inventory", draft: null, ask: guideAsk() };
  }

  const extracted = extractInventoryLines(cleaned);
  if (extracted && extracted.lines.length > 0) {
    const missingPrice = extracted.lines.some(
      (l) => !l.price || !Number.isFinite(Number(l.price)) || Number(l.price) <= 0,
    );
    if (missingPrice) {
      const draft = draftFromLines(
        extracted.lines.map(({ quantity, title }) => ({ quantity, title })),
        extracted.storeHint,
      );
      return {
        ok: false,
        missing: "price",
        draft,
        ask: priceAsk(draft),
      };
    }
    const skus = extracted.lines.map((line) => {
      const isHackathon = /hackathon/i.test(line.title);
      return {
        title: isHackathon ? "StraitsX Hackathon Shirt" : line.title,
        description: `${line.quantity} ${line.title} for ${line.price} ${config.tokenSymbol}`,
        quantity: line.quantity,
        price: String(line.price),
      };
    });
    const isHackathon = skus.some((s) => /hackathon/i.test(s.title));
    const name = isHackathon
      ? "StraitsX Hackathon Shirts"
      : extracted.storeHint ||
        (skus.length === 1
          ? storeNameFromTitle(skus[0].title)
          : "Aisle Store");
    return {
      ok: true,
      inventory: {
        name,
        slug: isHackathon ? "hackathon-shirts" : slugify(name),
        skus,
      },
    };
  }

  const sellIntent = hasSellIntent(cleaned);
  if (sellIntent && !parsePriceOnly(cleaned)) {
    return {
      ok: false,
      missing: "inventory",
      draft: null,
      ask: `Almost — I need quantity + product (+ price). Example: "5 shirts, 5 jeans, 10 socks" then set prices.`,
    };
  }

  return { ok: false, missing: "inventory", draft: null, ask: guideAsk() };
}

/** Merge a single price reply onto a pending draft (first line without price / only line). */
export function completeDraftWithPrice(
  draft: MerchantDraft,
  priceText: string,
): InventoryParseResult {
  const normalized = normalizeDraft(draft);
  if (!normalized) {
    return { ok: false, missing: "inventory", draft: null, ask: guideAsk() };
  }
  const price = parsePriceOnly(priceText);
  if (!price) {
    return {
      ok: false,
      missing: "price",
      draft: normalized,
      ask: `Still need prices. Use the form below or reply with a number in ${config.tokenSymbol}.`,
    };
  }
  if (normalized.lines.length === 1) {
    return completeDraftWithPrices(normalized, [price]);
  }
  return {
    ok: false,
    missing: "price",
    draft: normalized,
    ask: priceAsk(normalized),
  };
}

/** Apply prices (by index) to every draft line and publish inventory. */
export function completeDraftWithPrices(
  draft: MerchantDraft,
  prices: Array<string | number | null | undefined>,
): InventoryParseResult {
  const normalized = normalizeDraft(draft);
  if (!normalized) {
    return { ok: false, missing: "inventory", draft: null, ask: guideAsk() };
  }

  const skus: Omit<Sku, "id">[] = [];
  for (let i = 0; i < normalized.lines.length; i++) {
    const line = normalized.lines[i];
    const raw = prices[i] ?? line.price;
    const priceNum = Number(String(raw ?? "").replace(/[^\d.]/g, ""));
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return {
        ok: false,
        missing: "price",
        draft: normalized,
        ask: `Need a ${config.tokenSymbol} price for ${line.quantity} ${line.title}.`,
      };
    }
    const price = priceNum.toFixed(2);
    const isHackathon = /hackathon/i.test(line.title);
    skus.push({
      title: isHackathon ? "StraitsX Hackathon Shirt" : line.title,
      description:
        line.description?.trim() ||
        `${line.quantity} ${line.title} for ${price} ${config.tokenSymbol}`,
      quantity: line.quantity,
      price,
    });
  }

  const isHackathon = skus.some((s) => /hackathon/i.test(s.title));
  const name = isHackathon
    ? "StraitsX Hackathon Shirts"
    : normalized.name ||
      (skus.length === 1
        ? storeNameFromTitle(skus[0].title)
        : "Aisle Store");

  return {
    ok: true,
    inventory: {
      name,
      slug: isHackathon
        ? "hackathon-shirts"
        : normalized.slug || slugify(name),
      skus,
    },
  };
}

/**
 * Resolve a turn: price follow-up, new inventory, or chat/clarify.
 * If a draft is pending and the user is confused, re-ask for price.
 */
export function resolveMerchantTurn(args: {
  message: string;
  draft?: MerchantDraft | null;
}): InventoryParseResult {
  const message = cleanPrompt(args.message);
  const draft = normalizeDraft(args.draft);

  if (!message) {
    return draft
      ? {
          ok: false,
          missing: "price",
          draft,
          ask: priceAsk(draft),
        }
      : { ok: false, missing: "inventory", draft: null, ask: guideAsk() };
  }

  if (draft) {
    if (parsePriceOnly(message) && draft.lines.length === 1) {
      return completeDraftWithPrice(draft, message);
    }
    if (looksLikeGreetingOrChat(message)) {
      return {
        ok: false,
        missing: "price",
        draft,
        ask: priceAsk(draft),
      };
    }
    return parseMerchantPrompt(message);
  }

  return parseMerchantPrompt(message);
}

export function parseCsv(csv: string): InventoryParseResult {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  // Headerless fallback: title,quantity,price
  if (
    parsed.meta.fields?.length === 1 ||
    !parsed.meta.fields?.some((f) =>
      /title|name|price|qty|quantity/.test(f),
    )
  ) {
    return parseCsvHeaderless(csv);
  }

  if (parsed.data.length === 0) {
    return parseMerchantPrompt("50 shirts for 50 XSGD");
  }

  const skus: Omit<Sku, "id">[] = [];
  const missingLines: MerchantDraftLine[] = [];
  let storeHint: string | undefined;

  for (const record of parsed.data) {
    const title = String(record.title || record.name || "").trim() || "Untitled";
    // Unquoted commas in description shift columns → __parsed_extra + garbage qty
    const misaligned = Array.isArray(
      (record as { __parsed_extra?: unknown }).__parsed_extra,
    );
    const quantity = Number(
      String(record.quantity ?? record.qty ?? "").trim() || NaN,
    );
    const priceRaw = record.price || record.xsgd;
    const priceNum = Number(String(priceRaw ?? "").replace(/[^\d.]/g, ""));
    const qtyOk =
      !misaligned && Number.isFinite(quantity) && quantity > 0;
    const priceOk =
      !misaligned && Number.isFinite(priceNum) && priceNum > 0;

    if (!qtyOk || !priceOk) {
      missingLines.push({
        quantity: qtyOk ? quantity : 1,
        title,
        name: title,
      });
      continue;
    }

    skus.push({
      title,
      description: String(record.description || title).trim(),
      quantity,
      price: priceNum.toFixed(2),
    });
  }

  if (missingLines.length > 0) {
    // Prefer asking for every line so the merchant can confirm the full catalog
    const draftLines =
      skus.length > 0
        ? [
            ...skus.map((s) => ({
              quantity: s.quantity,
              title: s.title,
              name: s.title,
            })),
            ...missingLines,
          ]
        : missingLines;
    const draft = draftFromLines(draftLines, storeHint);
    return {
      ok: false,
      missing: "price",
      draft,
      ask: `${priceAsk(draft)} (CSV had missing or invalid prices — fill them below.)`,
    };
  }

  if (skus.length === 0) {
    return {
      ok: false,
      missing: "inventory",
      draft: null,
      ask: "That CSV had no products. Use columns title, description, quantity, price.",
    };
  }

  const name =
    storeHint ||
    (skus.length === 1
      ? skus[0].title.replace(/\b\w/g, (c) => c.toUpperCase())
      : "Aisle Store");
  return {
    ok: true,
    inventory: { name, slug: slugify(name), skus },
  };
}

function parseCsvHeaderless(csv: string): InventoryParseResult {
  const parsed = Papa.parse<string[]>(csv.trim(), {
    header: false,
    skipEmptyLines: true,
  });
  const skus: Omit<Sku, "id">[] = [];
  const missingLines: MerchantDraftLine[] = [];

  for (const cols of parsed.data) {
    if (!cols?.length) continue;
    // Skip accidental header row
    if (/^title$/i.test(String(cols[0])) && /price/i.test(String(cols[2] ?? cols[3] ?? ""))) {
      continue;
    }
    const title = String(cols[0] || "Untitled").trim();
    const quantity = Number(cols[1] || 1);
    const priceRaw = cols[2];
    const priceNum = Number(String(priceRaw ?? "").replace(/[^\d.]/g, ""));
    const qtyOk = Number.isFinite(quantity) && quantity > 0;
    const priceOk = Number.isFinite(priceNum) && priceNum > 0;
    if (!qtyOk || !priceOk) {
      missingLines.push({
        quantity: qtyOk ? quantity : 1,
        title,
        name: title,
      });
      continue;
    }
    skus.push({
      title,
      description: title,
      quantity,
      price: priceNum.toFixed(2),
    });
  }

  if (missingLines.length > 0) {
    const draft = draftFromLines(missingLines);
    return {
      ok: false,
      missing: "price",
      draft,
      ask: `${priceAsk(draft)} (CSV had missing or invalid prices — fill them below.)`,
    };
  }

  if (skus.length === 0) {
    return {
      ok: false,
      missing: "inventory",
      draft: null,
      ask: "That CSV had no products. Use title,quantity,price or a header row.",
    };
  }

  const name =
    skus.length === 1
      ? skus[0].title.replace(/\b\w/g, (c) => c.toUpperCase())
      : "Aisle Store";
  return { ok: true, inventory: { name, slug: slugify(name), skus } };
}

export function toStore(
  parsed: ParsedInventory,
  merchantAddress: `0x${string}` = config.merchantAddress,
): StoreRecord {
  return {
    slug: parsed.slug,
    name: parsed.name,
    merchantAddress,
    createdAt: new Date().toISOString(),
    skus: parsed.skus.map((sku, index) => {
      const quantity = Number(sku.quantity);
      const priceNum = Number(sku.price);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for ${sku.title}`);
      }
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        throw new Error(`Invalid price for ${sku.title}`);
      }
      return {
        id:
          parsed.slug === "hackathon-shirts"
            ? "shirt"
            : slugify(sku.title) || `sku-${index + 1}`,
        title: sku.title,
        description: sku.description,
        quantity,
        price: priceNum.toFixed(2),
      };
    }),
  };
}
