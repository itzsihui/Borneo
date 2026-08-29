import { config } from "@/lib/config";
import {
  completeDraftWithPrices,
  normalizeDraft,
  parseCsv,
  resolveMerchantTurn,
  toStore,
  type MerchantDraft,
  type MerchantDraftLine,
  type ParsedInventory,
} from "@/lib/inventory/parse";
import { importShopifyStore } from "@/lib/inventory/shopify";
import { emit } from "@/lib/protocol/events";
import { repo } from "@/lib/store/repo";
import type { StoreRecord } from "@/lib/store/types";
import {
  verifyMerchantAuth,
  type HexAddress,
  type MerchantAuthProof,
} from "@/lib/wallet/ethereum";

export type MerchantToolResult =
  | {
      status: "published";
      store: StoreRecord;
      reply: string;
      draft: null;
    }
  | {
      status: "need_price";
      store: null;
      reply: string;
      draft: MerchantDraft;
    }
  | {
      status: "need_wallet";
      store: null;
      reply: string;
      draft: MerchantDraft | null;
    }
  | {
      status: "clarify";
      store: null;
      reply: string;
      draft: null;
    };

function inventoryFromLines(
  lines: Array<MerchantDraftLine & { price: string }>,
  description?: string,
  storeName?: string,
): ParsedInventory {
  const skus = lines.map((line) => {
    const title = line.title.trim();
    const isHackathon = /hackathon/i.test(title);
    return {
      title: isHackathon ? "StraitsX Hackathon Shirt" : title,
      description:
        description ||
        `${line.quantity} ${title} for ${line.price} ${config.tokenSymbol}`,
      quantity: line.quantity,
      price: Number(line.price).toFixed(2),
    };
  });
  const isHackathon = skus.some((s) => /hackathon/i.test(s.title));
  const name = isHackathon
    ? "StraitsX Hackathon Shirts"
    : storeName ||
      (skus.length === 1
        ? skus[0].title.replace(/\b\w/g, (c) => c.toUpperCase())
        : "Aisle Store");
  return {
    name,
    slug: isHackathon
      ? "hackathon-shirts"
      : name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 48) || "store",
    skus,
  };
}

function draftFromInventory(inventory: ParsedInventory): MerchantDraft {
  return {
    name: inventory.name,
    slug: inventory.slug,
    lines: inventory.skus.map((s) => ({
      quantity: s.quantity,
      title: s.title,
      name: s.title,
      description: s.description,
      price: s.price,
    })),
  };
}

function needWalletResult(draft: MerchantDraft | null): MerchantToolResult {
  return {
    status: "need_wallet",
    store: null,
    reply: `Almost there — click Connect MetaMask. Approve the connection, switch to Avalanche Fuji if asked, then sign the message so we can set your x402 payTo. MetaMask authentication required (pasting an address isn't enough).`,
    draft,
  };
}

async function publishStore(
  inventory: ParsedInventory,
  merchantAuth?: MerchantAuthProof | null,
): Promise<MerchantToolResult> {
  const payTo = await verifyMerchantAuth(merchantAuth);
  if (!payTo) {
    return needWalletResult(draftFromInventory(inventory));
  }
  const store = toStore(inventory, payTo);
  await repo.putStore(store);
  emit({
    status: 200,
    method: "POST",
    path: `/onboard`,
    store: store.slug,
    message: `published /s/${store.slug}/llms.txt`,
  });
  return {
    status: "published",
    store,
    reply: `The store is now live. Agents can read /s/${store.slug}/llms.txt — and the shop is listed on /market and the network /llms.txt registry. There ${store.skus.length === 1 ? "is" : "are"} ${store.skus.length} SKU${store.skus.length === 1 ? "" : "s"} priced in ${config.tokenSymbol}. Payouts go to ${store.merchantAddress}.`,
    draft: null,
  };
}

function needPriceResult(
  draft: MerchantDraft,
  reply?: string,
): MerchantToolResult {
  const list = draft.lines
    .map((l) => `${l.quantity} ${l.title}`)
    .join(", ");
  return {
    status: "need_price",
    store: null,
    reply:
      reply ??
      `Got it — ${list}. Fill in ${config.tokenSymbol} prices below, then submit.`,
    draft,
  };
}

/** Import Shopify catalog → always confirm/edit XSGD prices (never auto-publish). */
export async function importStoreFromUrl(
  url: string,
): Promise<MerchantToolResult> {
  const imported = await importShopifyStore(url);
  if (!imported.ok) {
    return {
      status: "clarify",
      store: null,
      reply: imported.reason,
      draft: null,
    };
  }

  const pricedCount = imported.draft.lines.filter((l) => l.price).length;
  const reply = `Imported ${imported.productCount} product${imported.productCount === 1 ? "" : "s"} from ${imported.storeHost}. Demo unit price set to ${config.demoUnitPriceXsgd} ${config.tokenSymbol} each (StraitsX sandbox minimum; FX rate was ${imported.rate.toFixed(4)} SGD/USD via ${imported.rateSource}${pricedCount < imported.productCount ? "; some items need a price" : ""}). Confirm or edit below, then submit.`;

  return needPriceResult(imported.draft, reply);
}

/** Deterministic + Bedrock-structured merchant tool. */
export async function createStoreTool(args: {
  message?: string;
  csv?: string;
  url?: string;
  draft?: MerchantDraft | null;
  /** Bedrock single-SKU fields (legacy). */
  quantity?: number;
  title?: string;
  price?: string;
  /** Bedrock multi-SKU lines. */
  items?: Array<{ quantity: number; title: string; price?: string }>;
  /** UI price-form submit: parallel to draft.lines */
  prices?: Array<string | number | null | undefined>;
  storeName?: string;
  /** MetaMask personal_sign proof — required to publish (x402 payTo). */
  merchantAuth?: MerchantAuthProof | null;
}): Promise<MerchantToolResult> {
  const draft = normalizeDraft(args.draft);
  const auth = args.merchantAuth;

  // Price form submit
  if (draft && args.prices && args.prices.length > 0) {
    const parsed = completeDraftWithPrices(draft, args.prices);
    if (!parsed.ok) {
      if (parsed.missing === "price") {
        return needPriceResult(parsed.draft);
      }
      return {
        status: "clarify",
        store: null,
        reply: parsed.ask,
        draft: null,
      };
    }
    return publishStore(parsed.inventory, auth);
  }

  // Shopify / storefront URL — always confirm prices
  if (args.url?.trim()) {
    return importStoreFromUrl(args.url.trim());
  }

  // Bedrock multi-item path
  if (args.items && args.items.length > 0) {
    const lines = args.items.map((item) => ({
      quantity: Number(item.quantity),
      title: String(item.title).trim(),
      price: item.price?.trim(),
    }));
    const missing = lines.some(
      (l) =>
        !l.price ||
        !Number.isFinite(Number(l.price)) ||
        Number(l.price) <= 0 ||
        !l.title ||
        !Number.isFinite(l.quantity) ||
        l.quantity <= 0,
    );
    if (missing || lines.some((l) => !l.price)) {
      const needDraft: MerchantDraft = {
        name: args.storeName,
        lines: lines.map(({ quantity, title }) => ({ quantity, title })),
      };
      return needPriceResult(needDraft);
    }
    return publishStore(
      inventoryFromLines(
        lines.map((l) => ({
          quantity: l.quantity,
          title: l.title,
          price: String(l.price),
        })),
        args.message,
        args.storeName,
      ),
      auth,
    );
  }

  // Bedrock / structured single-SKU path
  const qty = Number(args.quantity);
  const title = args.title?.trim();
  const priceRaw = args.price?.trim();

  if (title && Number.isFinite(qty) && qty > 0) {
    if (!priceRaw || !Number.isFinite(Number(priceRaw)) || Number(priceRaw) <= 0) {
      return needPriceResult({
        name: title.replace(/\b\w/g, (c) => c.toUpperCase()),
        lines: [{ quantity: qty, title }],
      });
    }
    return publishStore(
      inventoryFromLines(
        [{ quantity: qty, title, price: priceRaw }],
        args.message,
        args.storeName,
      ),
      auth,
    );
  }

  const parsed = args.csv?.trim()
    ? parseCsv(args.csv)
    : resolveMerchantTurn({
        message: args.message?.trim() || "",
        draft,
      });

  if (!parsed.ok) {
    if (parsed.missing === "price") {
      return needPriceResult(parsed.draft);
    }
    return {
      status: "clarify",
      store: null,
      reply: parsed.ask,
      draft: null,
    };
  }

  return publishStore(parsed.inventory, auth);
}

export type { HexAddress, MerchantAuthProof };
