import { runBuyerAgent } from "@/lib/agents/buyer";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string };
    const origin = config.protocolBaseUrl || new URL(request.url).origin;
    const result = await runBuyerAgent({
      origin,
      message: body.message || "buy a hackathon shirt",
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Buyer agent failed";
    return Response.json(
      { steps: [{ type: "error", text: message }], error: message },
      { status: 500 },
    );
  }
}
