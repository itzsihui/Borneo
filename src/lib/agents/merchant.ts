import { createStoreTool, importStoreFromUrl } from "@/lib/agents/tools-merchant";
import { converseWithTools, toolSpec } from "@/lib/bedrock/converse";
import {
  normalizeDraft,
  type MerchantDraft,
} from "@/lib/inventory/parse";
import type { StoreRecord } from "@/lib/store/types";
import type { MerchantAuthProof } from "@/lib/wallet/ethereum";

export type { MerchantDraft };

export type MerchantAgentStatus =
  | "published"
  | "need_price"
  | "need_wallet"
  | "clarify";

export async function runMerchantAgent(args: {
  message?: string;
  csv?: string;
  url?: string;
  draft?: MerchantDraft | null;
  prices?: Array<string | number | null | undefined>;
  merchantAuth?: MerchantAuthProof | null;
}): Promise<{
  store: StoreRecord | null;
  reply: string;
  status: MerchantAgentStatus;
  draft?: MerchantDraft | null;
  llm?: "bedrock" | "deterministic";
}> {
  const draft = normalizeDraft(args.draft);
  const merchantAuth = args.merchantAuth;

  // Structured price-form submit — skip Bedrock
  if (draft && args.prices && args.prices.length > 0) {
    const priced = await createStoreTool({
      draft,
      prices: args.prices,
      merchantAuth,
    });
    return {
      store: priced.store,
      status: priced.status,
      reply: priced.reply,
      draft: priced.draft,
      llm: "deterministic",
    };
  }

  // Shopify storefront URL — deterministic import + price confirm
  if (args.url?.trim()) {
    const imported = await importStoreFromUrl(args.url.trim());
    return {
      store: imported.store,
      status: imported.status,
      reply: imported.reply,
      draft: imported.draft,
      llm: "deterministic",
    };
  }

  // Wallet connected after priced catalog — republish from draft line prices
  if (
    draft &&
    merchantAuth &&
    draft.lines.every((l) => l.price) &&
    !args.message?.trim() &&
    !args.csv?.trim() &&
    !args.url?.trim()
  ) {
    const priced = await createStoreTool({
      draft,
      prices: draft.lines.map((l) => l.price),
      merchantAuth,
    });
    return {
      store: priced.store,
      status: priced.status,
      reply: priced.reply,
      draft: priced.draft,
      llm: "deterministic",
    };
  }

  // Chat follow-up with a pending draft — try deterministic parse before Bedrock
  if (draft && args.message?.trim()) {
    const pricedFollowUp = await createStoreTool({
      message: args.message,
      draft,
      merchantAuth,
    });
    if (
      pricedFollowUp.status === "published" ||
      pricedFollowUp.status === "need_price" ||
      pricedFollowUp.status === "need_wallet"
    ) {
      return {
        store: pricedFollowUp.store,
        status: pricedFollowUp.status,
        reply: pricedFollowUp.reply,
        draft:
          pricedFollowUp.status === "published" ? null : pricedFollowUp.draft,
        llm: "deterministic",
      };
    }
  }

  const userMessage =
    args.csv?.trim() ||
    args.message?.trim() ||
    "Create a store selling 50 StraitsX Hackathon Shirts for 0.01 XSGD each.";

  if (args.csv?.trim()) {
    const csvResult = await createStoreTool({
      csv: args.csv,
      draft: null,
      merchantAuth,
    });
    return {
      store: csvResult.store,
      status: csvResult.status,
      reply: csvResult.reply,
      draft: csvResult.draft,
      llm: "deterministic",
    };
  }

  const pending = draft
    ? `\nPending draft awaiting prices: ${draft.lines
        .map((l) => `${l.quantity} × ${l.title}`)
        .join(", ")}.`
    : "";

  const bedrock = await converseWithTools({
    system: `You are Aisle's merchant setup agent for the Agentic Storefront Protocol.
Prices are always in XSGD. Never invent a price.

When the merchant describes inventory, call create_store with extracted fields.
Prefer the "items" array when they list multiple products (e.g. "5 shirts, 5 jeans, 10 socks").
Each item: quantity, title (product name only), price (omit if unknown).
Optional storeName if they named a store type (e.g. "clothing store").

Also support single-SKU fields quantity/title/price for one product.

Rules:
- Greeting / chit-chat with no inventory → do NOT call create_store. Ask them to describe inventory (or import CSV / paste a Shopify store URL / connect wallet).
- Products without prices → call create_store with items (or quantity+title) and omit prices.
- Full inventory with prices → include prices and publish.
- If a pending draft is waiting and they reply with one number for a single-line draft, call create_store with that price.
- After need_price, tell them to fill in the XSGD price form (do not invent prices).
- After published, mention /s/{slug}/llms.txt and SKU count briefly.

Sponsors: StraitsX (XSGD), Avalanche (x402), AWS Bedrock.`,
    userMessage: `${userMessage}${pending}`,
    tools: [
      toolSpec(
        "create_store",
        "Publish a storefront from extracted inventory. Prefer items[] for multiple products. Omit price if unknown.",
        {
          message: {
            type: "string",
            description: "Original merchant text",
          },
          storeName: {
            type: "string",
            description: "Optional store name, e.g. Clothing Store",
          },
          items: {
            type: "array",
            description: "One or more products",
            items: {
              type: "object",
              properties: {
                quantity: { type: "number" },
                title: { type: "string" },
                price: {
                  type: "string",
                  description: "Unit price in XSGD if known",
                },
              },
              required: ["quantity", "title"],
            },
          },
          quantity: {
            type: "number",
            description: "Single-SKU quantity (legacy)",
          },
          title: {
            type: "string",
            description: "Single-SKU product name (legacy)",
          },
          price: {
            type: "string",
            description: "Single-SKU unit price if known",
          },
        },
      ),
    ],
    handlers: {
      create_store: async (input) => {
        const rawItems = Array.isArray(input.items) ? input.items : null;
        const items = rawItems?.map((item) => {
          const row = item as Record<string, unknown>;
          return {
            quantity: Number(row.quantity),
            title: String(row.title || ""),
            price:
              row.price !== undefined && row.price !== null
                ? String(row.price)
                : undefined,
          };
        });

        const result = await createStoreTool({
          message: String(input.message || userMessage),
          draft,
          storeName: input.storeName ? String(input.storeName) : undefined,
          items: items && items.length > 0 ? items : undefined,
          quantity:
            input.quantity !== undefined ? Number(input.quantity) : undefined,
          title: input.title ? String(input.title) : undefined,
          price: input.price !== undefined ? String(input.price) : undefined,
          merchantAuth,
        });
        if (result.status === "published") {
          return {
            status: result.status,
            slug: result.store.slug,
            name: result.store.name,
            skus: result.store.skus.length,
            reply: result.reply,
            llmsTxt: `/s/${result.store.slug}/llms.txt`,
          };
        }
        return {
          status: result.status,
          ask: result.reply,
          reply: result.reply,
          draft: result.draft,
        };
      },
    },
  });

  if (bedrock.ok) {
    const tool = bedrock.results.find((r) => r.tool === "create_store") as
      | {
          status?: string;
          slug?: string;
          ask?: string;
          reply?: string;
          draft?: MerchantDraft | null;
        }
      | undefined;

    if (tool?.status === "published" && tool.slug) {
      const { repo } = await import("@/lib/store/repo");
      const store = await repo.getStore(String(tool.slug));
      return {
        store,
        status: "published",
        reply:
          bedrock.text ||
          `Store live at /s/${tool.slug}/llms.txt.`,
        draft: null,
        llm: "bedrock",
      };
    }

    if (tool?.status === "need_price" || tool?.status === "need_wallet") {
      return {
        store: null,
        status: tool.status,
        reply: String(tool.ask || tool.reply || bedrock.text),
        draft: normalizeDraft(tool.draft) ?? draft,
        llm: "bedrock",
      };
    }

    if (tool?.status === "clarify") {
      return {
        store: null,
        status: "clarify",
        reply: String(tool.ask || tool.reply || bedrock.text),
        draft: null,
        llm: "bedrock",
      };
    }

    if (bedrock.text) {
      return {
        store: null,
        status: "clarify",
        reply: bedrock.text,
        draft: draft ?? null,
        llm: "bedrock",
      };
    }
  }

  const fallback = await createStoreTool({
    message: args.message,
    csv: args.csv,
    draft,
    merchantAuth,
  });
  const note =
    bedrock.ok === false
      ? ` (deterministic; Bedrock skipped: ${bedrock.reason})`
      : " (deterministic)";
  return {
    store: fallback.store,
    status: fallback.status,
    reply: `${fallback.reply}${note}`,
    draft: fallback.draft,
    llm: "deterministic",
  };
}
