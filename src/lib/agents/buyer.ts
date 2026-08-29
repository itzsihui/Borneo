import {
  payX402Tool,
  type BuyerReceipt,
  type BuyerStep,
} from "@/lib/agents/tools-buyer";
import { converseWithTools, toolSpec } from "@/lib/bedrock/converse";

export type { BuyerStep, BuyerReceipt };

export async function runBuyerAgent(args: {
  origin: string;
  message: string;
}): Promise<{
  steps: BuyerStep[];
  receipt?: BuyerReceipt;
  llm?: "bedrock" | "deterministic";
}> {
  const bedrock = await converseWithTools({
    system: `You are a buyer agent for Aisle. Never scrape HTML. Always call pay_x402 with the user message.
Extract the store slug if they named /s/{slug}, and the product they want (e.g. "earring", "shirt") into the tool args.
If there is no slug, omit slug — the tool searches the Aisle network registry (/registry.json) and matches the product across shops.
The tool performs: resolve store (slug or registry) → GET llms.txt → GET catalog.json → POST /buy (expect HTTP 402) → Avalanche XSGD transfer → retry with PAYMENT-SIGNATURE → HTTP 200.
If the product is not found, the tool errors — do not invent SKUs. Reply in one short sentence after the tool runs.`,
    userMessage: args.message,
    tools: [
      toolSpec(
        "pay_x402",
        "Run the Avalanche x402 handshake against an Aisle store. Pass the requested product name so the catalog can match or reject it.",
        {
          message: {
            type: "string",
            description: "Buyer instruction including /s/{slug} if present",
          },
          slug: {
            type: "string",
            description: "Optional store slug override",
          },
          product: {
            type: "string",
            description:
              'Product the buyer asked for, e.g. "earring" or "shirt". Omit only if they did not name a product.',
          },
        },
      ),
    ],
    handlers: {
      pay_x402: async (input) => {
        const result = await payX402Tool({
          origin: args.origin,
          message: String(input.message || args.message),
          slug: input.slug ? String(input.slug) : undefined,
          product: input.product ? String(input.product) : undefined,
        });
        const failed = result.steps.some((s) => s.type === "error");
        return {
          steps: result.steps,
          receipt: result.receipt ?? null,
          ok:
            !failed &&
            Boolean(result.receipt?.explorerUrl || result.receipt?.orderId),
        };
      },
    },
  });

  if (bedrock.ok) {
    const toolResult = bedrock.results[0] as
      | { steps?: BuyerStep[]; receipt?: BuyerReceipt }
      | undefined;
    if (toolResult?.steps?.length) {
      const steps = [...toolResult.steps];
      if (bedrock.text) {
        steps.push({ type: "info", text: `Bedrock: ${bedrock.text}` });
      }
      return {
        steps,
        receipt: toolResult.receipt,
        llm: "bedrock",
      };
    }
  }

  const fallback = await payX402Tool(args);
  if (bedrock.ok === false) {
    fallback.steps.unshift({
      type: "info",
      text: `Bedrock skipped → deterministic tools (${bedrock.reason})`,
    });
  }
  return { ...fallback, llm: "deterministic" };
}
