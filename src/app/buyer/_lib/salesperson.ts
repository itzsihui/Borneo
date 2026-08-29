export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type FashionProfile = {
  category?: string;
  item?: string;
  style?: string;
  color?: string;
  budget?: string;
};

export type SalespersonResult = {
  reply: string;
  suggestions?: string[];
  status: "clarifying" | "ready";
  searchQuery?: string;
  profile?: FashionProfile;
  llm: "openai" | "bedrock" | "deterministic";
};

const SYSTEM = `You are Borneo's fashion buyer salesperson — a personal shopper for apparel.
Ask 1–2 short clarifying questions at a time (style, color, budget, fit).
NEVER invent products, SKUs, stock, or claim you "found" an item. You cannot see the live catalog.
When ready to search, set status to "ready" with a concrete searchQuery (e.g. "cap", "pants", "hackathon tee").
For ready replies, ONLY say you will search the network — e.g. "I'll search the Borneo network for that." Do not say you found anything.
After ~4 user turns, force status "ready" with your best searchQuery guess.
Respond ONLY with JSON:
{"reply":"string","suggestions":["chip1","chip2"],"status":"clarifying"|"ready","searchQuery":"optional","profile":{"category":"fashion","item":"","style":"","color":"","budget":""}}`;

function userTurnCount(messages: ChatMessage[]) {
  return messages.filter((m) => m.role === "user").length;
}

function lastUser(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return messages[i]!.content;
  }
  return "";
}

function detectItem(text: string): "tee" | "cap" | "compare" | "unknown" {
  const t = text.toLowerCase();
  if (/\b(compare|vs|versus)\b/.test(t) && /\b(shirt|tee|cap|hat)\b/.test(t)) {
    return "compare";
  }
  if (/\b(cap|hat)\b/.test(t)) return "cap";
  if (/\b(t-?shirt|tee|shirt)\b/.test(t)) return "tee";
  return "unknown";
}

function parseJsonResult(raw: string): SalespersonResult | null {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence?.[1]?.trim() || trimmed;
  try {
    const data = JSON.parse(body) as Partial<SalespersonResult>;
    if (!data.reply || (data.status !== "clarifying" && data.status !== "ready")) {
      return null;
    }
    return {
      reply: String(data.reply),
      suggestions: Array.isArray(data.suggestions)
        ? data.suggestions.map(String).slice(0, 4)
        : undefined,
      status: data.status,
      searchQuery: data.searchQuery ? String(data.searchQuery) : undefined,
      profile: data.profile,
      llm: "openai",
    };
  } catch {
    return null;
  }
}

/** Demo-safe scripted fashion Q&A when no LLM keys. */
export function runDeterministicSalesperson(
  messages: ChatMessage[],
): SalespersonResult {
  const turns = userTurnCount(messages);
  const latest = lastUser(messages);
  const item = detectItem(messages.map((m) => m.content).join(" "));
  const lower = latest.toLowerCase();

  const profile: FashionProfile = {
    category: "fashion",
    item:
      item === "cap"
        ? "cap"
        : item === "compare"
          ? "shirt vs cap"
          : item === "tee"
            ? "tee"
            : undefined,
  };

  if (/\b(graphic|plain|oversized|black|white|budget|under|0\.0)/i.test(lower)) {
    if (/\bgraphic\b/i.test(lower)) profile.style = "graphic";
    if (/\bplain\b/i.test(lower)) profile.style = "plain";
    if (/\boversized\b/i.test(lower)) profile.style = "oversized";
    if (/\bblack\b/i.test(lower)) profile.color = "black";
    if (/\bwhite\b/i.test(lower)) profile.color = "white";
    const budget = lower.match(/under\s+([\d.]+)\s*(usdc|xsgd|usd)?/i);
    if (budget) profile.budget = `${budget[1]} ${(budget[2] || "USDC").toUpperCase()}`;
  }

  // Opening / unknown
  if (turns === 0 || (!latest && turns <= 1)) {
    return {
      reply:
        "Hey — I'm your fashion buyer agent. What are you looking to wear today?",
      suggestions: [
        "I want a t-shirt",
        "Looking for a cap",
        "Compare shirt vs cap",
      ],
      status: "clarifying",
      profile,
      llm: "deterministic",
    };
  }

  if (item === "unknown" && turns === 1) {
    return {
      reply:
        "Happy to help. Are we shopping a tee, a cap, or comparing both?",
      suggestions: ["A t-shirt", "A cap", "Compare both under 0.02 USDC"],
      status: "clarifying",
      profile,
      llm: "deterministic",
    };
  }

  if (item === "tee" && turns === 1) {
    return {
      reply:
        "Nice — what kind of tee? Graphic hackathon print, plain, or oversized?",
      suggestions: ["Graphic tee", "Plain black", "Oversized fit"],
      status: "clarifying",
      profile: { ...profile, item: "tee" },
      llm: "deterministic",
    };
  }

  if (item === "cap" && turns === 1) {
    return {
      reply: "Got it — looking for a cap. Any color preference, or under a budget?",
      suggestions: ["Black cap", "Under 0.02 USDC", "Just show me options"],
      status: "clarifying",
      profile: { ...profile, item: "cap" },
      llm: "deterministic",
    };
  }

  if (item === "compare" && turns === 1) {
    return {
      reply:
        "I can compare the hackathon tee and Borneo cap. Prefer budget under 0.02 USDC, or just show both?",
      suggestions: ["Under 0.02 USDC", "Show both", "Focus on the tee"],
      status: "clarifying",
      profile: { ...profile, item: "shirt vs cap" },
      llm: "deterministic",
    };
  }

  // Second+ turn or force ready — never claim catalog hits here
  if (/\bpants?\b|\bjeans\b|\btrousers?\b/.test(lower) || /\bpants?\b/.test(messages.map(m => m.content).join(" ").toLowerCase()) && turns >= 2) {
    const allText = messages.map((m) => m.content).join(" ").toLowerCase();
    if (/\bpants?\b|\bjeans\b/.test(allText)) {
      return {
        reply: "I'll search the Borneo network for pants now.",
        suggestions: [],
        status: "ready",
        searchQuery: "pants",
        profile: { ...profile, item: profile.item?.includes("cap") ? `${profile.item} and pants` : "pants" },
        llm: "deterministic",
      };
    }
  }

  if (item === "cap" || /\bcap\b|\bhat\b/.test(lower)) {
    return {
      reply: "I'll search the Borneo network for a cap now.",
      suggestions: [],
      status: "ready",
      searchQuery: "cap",
      profile: { ...profile, item: "cap", color: profile.color || "black" },
      llm: "deterministic",
    };
  }

  if (item === "compare") {
    return {
      reply: "I'll search the Borneo network to compare tee and cap options.",
      suggestions: [],
      status: "ready",
      searchQuery: "shirt",
      profile: { ...profile, item: "shirt vs cap", budget: profile.budget || "0.02 USDC" },
      llm: "deterministic",
    };
  }

  // Default tee ready
  const styleHint = profile.style || (/\bgraphic\b/i.test(lower) ? "graphic" : "hackathon");
  return {
    reply: "I'll search the Borneo network for that tee now.",
    suggestions: [],
    status: "ready",
    searchQuery: "hackathon tee",
    profile: {
      ...profile,
      item: "tee",
      style: styleHint,
      category: "fashion",
    },
    llm: "deterministic",
  };
}

async function runOpenAI(
  messages: ChatMessage[],
): Promise<SalespersonResult | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          ...(userTurnCount(messages) >= 4
            ? [
                {
                  role: "system" as const,
                  content:
                    "User has clarified enough — respond with status ready and a searchQuery now.",
                },
              ]
            : []),
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = parseJsonResult(content);
    if (!parsed) return null;
    return { ...parsed, llm: "openai" };
  } catch {
    return null;
  }
}

async function runBedrock(
  messages: ChatMessage[],
): Promise<SalespersonResult | null> {
  try {
    const { bedrockWanted } = await import("@/lib/bedrock/converse");
    if (!bedrockWanted()) return null;

    const {
      BedrockRuntimeClient,
      ConverseCommand,
    } = await import("@aws-sdk/client-bedrock-runtime");
    const { config } = await import("@/lib/config");

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
    const client =
      accessKeyId && secretAccessKey
        ? new BedrockRuntimeClient({
            region: config.bedrockRegion,
            credentials: { accessKeyId, secretAccessKey },
          })
        : new BedrockRuntimeClient({ region: config.bedrockRegion });

    const forceReady =
      userTurnCount(messages) >= 4
        ? "\n\nUser has clarified enough — respond with status ready and a searchQuery now."
        : "";

    const response = await client.send(
      new ConverseCommand({
        modelId: config.bedrockModel,
        system: [{ text: SYSTEM + forceReady }],
        messages: messages.map((m) => ({
          role: m.role,
          content: [{ text: m.content }],
        })),
        inferenceConfig: { maxTokens: 512, temperature: 0.3 },
      }),
    );

    const text = (response.output?.message?.content || [])
      .map((b) => b.text)
      .filter(Boolean)
      .join("\n")
      .trim();
    if (!text) return null;
    const parsed = parseJsonResult(text);
    if (!parsed) return null;
    return { ...parsed, llm: "bedrock" };
  } catch {
    return null;
  }
}

export async function runSalesperson(
  messages: ChatMessage[],
): Promise<SalespersonResult> {
  const normalized = messages.filter((m) => m.content.trim());

  const openai = await runOpenAI(normalized);
  if (openai) {
    if (openai.status === "ready" && !openai.searchQuery) {
      openai.searchQuery =
        openai.profile?.item === "cap" ? "cap" : "hackathon tee";
    }
    return openai;
  }

  const bedrock = await runBedrock(normalized);
  if (bedrock) {
    if (bedrock.status === "ready" && !bedrock.searchQuery) {
      bedrock.searchQuery =
        bedrock.profile?.item === "cap" ? "cap" : "hackathon tee";
    }
    return bedrock;
  }

  return runDeterministicSalesperson(normalized);
}
