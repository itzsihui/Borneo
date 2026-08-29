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

Rules:
- Read the FULL conversation. Never repeat a question you already asked.
- If the user already named an item (t-shirt, tee, shirt, cap, hat), do NOT ask what type of apparel they want.
- Short answers like "casual", "black", or "under 0.02" count as progress — acknowledge and move on.
- Ask at most ONE new clarifying question, then set status "ready".
- Prefer status "ready" once you know the item (and optionally style/color/budget).
- NEVER invent products, SKUs, or stock. You cannot see the live catalog.
- When ready, reply ONLY that you will search the network (e.g. "I'll search the Borneo network for that.") with a concrete searchQuery.
- After 2 user turns with a known item, you MUST set status "ready".

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

function lastAssistant(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "assistant") return messages[i]!.content;
  }
  return "";
}

function corpusText(messages: ChatMessage[]) {
  return messages.map((m) => m.content).join(" ");
}

function normalizeQuestion(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** LLM often re-asks this even after the user named a tee/cap. */
function isUselessClarify(text: string) {
  const n = normalizeQuestion(text);
  if (!n) return false;
  return (
    n.includes("type of apparel") ||
    n.includes("kind of apparel") ||
    n.includes("what apparel") ||
    /\bwhat (?:are you|do you)\b.*\blooking for\b/.test(n) ||
    /\bwhat type of\b/.test(n) ||
    /\bwhat kind of\b/.test(n)
  );
}

function detectItem(text: string): "tee" | "cap" | "compare" | "unknown" {
  const t = text.toLowerCase().replace(/t\s+shirt/g, "tshirt");
  if (/\b(compare|vs|versus)\b/.test(t) && /\b(shirt|tee|cap|hat|tshirt)\b/.test(t)) {
    return "compare";
  }
  if (/\b(cap|hat)\b/.test(t)) return "cap";
  if (/\b(t-?shirt|tshirt|tee|shirt)\b/.test(t)) return "tee";
  return "unknown";
}

function detectStyle(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/\bcasual\b/.test(t)) return "casual";
  if (/\bformal\b/.test(t)) return "formal";
  if (/\bgraphic\b/.test(t)) return "graphic";
  if (/\bplain\b/.test(t)) return "plain";
  if (/\boversized\b/.test(t)) return "oversized";
  if (/\bstreet\b/.test(t)) return "streetwear";
  return undefined;
}

function inferSearchQuery(
  messages: ChatMessage[],
  profile?: FashionProfile,
): string {
  const corpus = corpusText(messages);
  const item = detectItem(corpus);
  if (item === "cap" || profile?.item === "cap") return "cap";
  if (item === "compare" || profile?.item?.includes("vs")) return "shirt";
  if (item === "tee" || profile?.item === "tee") {
    const style = profile?.style || detectStyle(corpus);
    if (style === "graphic") return "graphic tee";
    if (style === "plain") return "plain tee";
    return "hackathon tee";
  }
  const latest = lastUser(messages).trim();
  return latest.slice(0, 80) || "fashion";
}

function enrichProfile(
  messages: ChatMessage[],
  profile?: FashionProfile,
): FashionProfile {
  const corpus = corpusText(messages);
  const item = detectItem(corpus);
  const style = detectStyle(corpus);
  const lower = corpus.toLowerCase();
  const next: FashionProfile = {
    category: "fashion",
    ...profile,
  };
  if (!next.item) {
    next.item =
      item === "cap"
        ? "cap"
        : item === "compare"
          ? "shirt vs cap"
          : item === "tee"
            ? "tee"
            : profile?.item;
  }
  if (!next.style && style) next.style = style;
  if (!next.color) {
    if (/\bblack\b/.test(lower)) next.color = "black";
    if (/\bwhite\b/.test(lower)) next.color = "white";
  }
  const budget = lower.match(/under\s+([\d.]+)\s*(usdc|xsgd|usd)?/i);
  if (!next.budget && budget) {
    next.budget = `${budget[1]} ${(budget[2] || "USDC").toUpperCase()}`;
  }
  return next;
}

/**
 * Stops clarifying loops: known item → search. Never re-ask "what apparel?".
 */
export function ensureConversationProgress(
  messages: ChatMessage[],
  result: SalespersonResult,
): SalespersonResult {
  const turns = userTurnCount(messages);
  const corpus = corpusText(messages);
  const item = detectItem(corpus);
  const profile = enrichProfile(messages, result.profile);
  const prevAsk = lastAssistant(messages);
  const uselessNow = isUselessClarify(result.reply);
  const repeated =
    result.status === "clarifying" &&
    Boolean(prevAsk) &&
    (normalizeQuestion(result.reply) === normalizeQuestion(prevAsk) ||
      (isUselessClarify(result.reply) && isUselessClarify(prevAsk)) ||
      (normalizeQuestion(result.reply).includes("casual") &&
        normalizeQuestion(result.reply).includes("formal") &&
        normalizeQuestion(prevAsk).includes("casual") &&
        normalizeQuestion(prevAsk).includes("formal")));

  const forceReady = () => {
    const searchQuery = inferSearchQuery(messages, profile);
    return {
      ...result,
      status: "ready" as const,
      searchQuery,
      profile,
      suggestions: [] as string[],
      reply: "I'll search the Borneo network for that now.",
    };
  };

  if (result.status === "ready") {
    return {
      ...result,
      profile,
      searchQuery:
        result.searchQuery?.trim() || inferSearchQuery(messages, profile),
      suggestions: [],
    };
  }

  // Named item → search. Never loop on "what type of apparel?".
  if (item !== "unknown") {
    return forceReady();
  }

  if (repeated || turns >= 3 || uselessNow) {
    return forceReady();
  }

  return { ...result, profile };
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
  const item = detectItem(corpusText(messages));
  const lower = latest.toLowerCase();
  const style = detectStyle(corpusText(messages));

  const profile = enrichProfile(messages, {
    category: "fashion",
    item:
      item === "cap"
        ? "cap"
        : item === "compare"
          ? "shirt vs cap"
          : item === "tee"
            ? "tee"
            : undefined,
    style,
  });

  if (/\b(graphic|plain|oversized|black|white|budget|under|0\.0)/i.test(lower)) {
    if (/\bgraphic\b/i.test(lower)) profile.style = "graphic";
    if (/\bplain\b/i.test(lower)) profile.style = "plain";
    if (/\boversized\b/i.test(lower)) profile.style = "oversized";
    if (/\bblack\b/i.test(lower)) profile.color = "black";
    if (/\bwhite\b/i.test(lower)) profile.color = "white";
    const budget = lower.match(/under\s+([\d.]+)\s*(usdc|xsgd|usd)?/i);
    if (budget) profile.budget = `${budget[1]} ${(budget[2] || "USDC").toUpperCase()}`;
  }

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

  // Item known + any follow-up (casual, color, budget, "just show me") → search
  if (item !== "unknown" && turns >= 2) {
    return ensureConversationProgress(messages, {
      reply: "I'll search the Borneo network for that now.",
      suggestions: [],
      status: "ready",
      searchQuery: inferSearchQuery(messages, profile),
      profile,
      llm: "deterministic",
    });
  }

  if (item === "tee" && turns === 1) {
    // Skip apparel re-asks — go straight to catalog for clear item intents
    return ensureConversationProgress(messages, {
      reply: "I'll search the Borneo network for that now.",
      suggestions: [],
      status: "ready",
      searchQuery: inferSearchQuery(messages, profile),
      profile: { ...profile, item: "tee" },
      llm: "deterministic",
    });
  }

  if (item === "cap" && turns === 1) {
    return ensureConversationProgress(messages, {
      reply: "I'll search the Borneo network for a cap now.",
      suggestions: [],
      status: "ready",
      searchQuery: "cap",
      profile: { ...profile, item: "cap" },
      llm: "deterministic",
    });
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

  if (/\bpants?\b|\bjeans\b|\btrousers?\b/.test(corpusText(messages).toLowerCase()) && turns >= 2) {
    return {
      reply: "I'll search the Borneo network for pants now.",
      suggestions: [],
      status: "ready",
      searchQuery: "pants",
      profile: { ...profile, item: "pants" },
      llm: "deterministic",
    };
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
      profile: {
        ...profile,
        item: "shirt vs cap",
        budget: profile.budget || "0.02 USDC",
      },
      llm: "deterministic",
    };
  }

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
    const turns = userTurnCount(messages);
    const itemKnown = detectItem(corpusText(messages)) !== "unknown";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          ...(turns >= 2 && itemKnown
            ? [
                {
                  role: "system" as const,
                  content:
                    "Enough context — respond with status ready and a searchQuery now. Do not ask another clarifying question.",
                },
              ]
            : turns >= 3
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

    const turns = userTurnCount(messages);
    const itemKnown = detectItem(corpusText(messages)) !== "unknown";
    const forceReady =
      turns >= 2 && itemKnown
        ? "\n\nEnough context — respond with status ready and a searchQuery now. Do not ask another clarifying question."
        : turns >= 3
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
        inferenceConfig: { maxTokens: 512, temperature: 0.2 },
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
  // API only needs role + content (ignore products/links from UI state)
  const normalized = messages
    .filter((m) => m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  const openai = await runOpenAI(normalized);
  if (openai) {
    return ensureConversationProgress(normalized, openai);
  }

  const bedrock = await runBedrock(normalized);
  if (bedrock) {
    return ensureConversationProgress(normalized, bedrock);
  }

  return ensureConversationProgress(
    normalized,
    runDeterministicSalesperson(normalized),
  );
}
