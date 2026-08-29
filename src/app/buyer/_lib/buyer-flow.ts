import type { ChainStep } from "@/components/agent/chain-of-thought";

export type BuyerPhase =
  | "chat"
  | "thinking"
  | "pick"
  | "rail"
  | "consent"
  | "settle"
  | "done";

export type PaymentRail = "visa" | "stablecoin";

export type {
  ChainStep,
  ChainStepStatus,
} from "@/components/agent/chain-of-thought";

export type MarketProductPick = {
  id: string;
  title: string;
  description?: string;
  price: string;
  quantity: number;
  storeSlug: string;
  storeName: string;
  imageUrl: string;
  score: number;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  /** Catalog hits attached after a real network search — never invent these. */
  products?: MarketProductPick[];
  /** Optional outbound links (e.g. Basescan receipt). */
  links?: Array<{ label: string; href: string }>;
};

export type FashionProfile = {
  category?: string;
  item?: string;
  style?: string;
  color?: string;
  budget?: string;
};

export type BuyerFlowState = {
  phase: BuyerPhase;
  intent: string;
  messages: ChatMessage[];
  suggestions: string[];
  profile: FashionProfile | null;
  steps: ChainStep[];
  picks: MarketProductPick[];
  selectedId: string | null;
  rail: PaymentRail | null;
  detailOpen: boolean;
  busy: boolean;
  chatBusy: boolean;
  snowtrace: string | null;
  error: string | null;
};

export const INITIAL_STEPS: ChainStep[] = [
  {
    id: "parse",
    title: "Parse fashion intent",
    status: "pending",
    description: "Waiting for your request…",
  },
  {
    id: "decompose",
    title: "Decompose constraints",
    status: "pending",
  },
  {
    id: "search",
    title: "Search Borneo network",
    status: "pending",
  },
  {
    id: "rank",
    title: "Rank catalog matches",
    status: "pending",
  },
];

export const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hey — I'm your fashion buyer agent. Tell me what you're looking to wear and I'll narrow it down like a personal salesperson.",
};

export function createInitialState(): BuyerFlowState {
  return {
    phase: "chat",
    intent: "",
    messages: [WELCOME_MESSAGE],
    suggestions: [
      "I want a t-shirt",
      "Looking for a cap",
      "Compare shirt vs cap",
    ],
    profile: null,
    steps: INITIAL_STEPS.map((s) => ({ ...s })),
    picks: [],
    selectedId: null,
    rail: null,
    detailOpen: false,
    busy: false,
    chatBusy: false,
    snowtrace: null,
    error: null,
  };
}

export function selectedPick(
  state: BuyerFlowState,
): MarketProductPick | null {
  if (!state.selectedId) return null;
  return state.picks.find((p) => p.id === state.selectedId) ?? null;
}

export function updateStep(
  steps: ChainStep[],
  id: string,
  patch: Partial<ChainStep>,
): ChainStep[] {
  return steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function profileBullets(profile: FashionProfile | null): string[] {
  if (!profile) return ["Category: apparel / fashion"];
  const out: string[] = ["Category: apparel / fashion"];
  if (profile.item) out.push(`Item: ${profile.item}`);
  if (profile.style) out.push(`Style: ${profile.style}`);
  if (profile.color) out.push(`Color: ${profile.color}`);
  if (profile.budget) out.push(`Budget: ${profile.budget}`);
  return out;
}

/** Honest post-search copy — never claim SKUs that aren't in `picks`. */
export function catalogResultMessage(
  query: string,
  picks: MarketProductPick[],
  profile?: FashionProfile | null,
): string {
  const wanted = (profile?.item || query || "that")
    .trim()
    .replace(/\s+/g, " ");

  if (picks.length === 0) {
    return `I searched the Borneo network (registry + catalogs) and couldn't find anything matching “${wanted}”. Want to try a tee or a cap instead?`;
  }

  const titles = picks.map((p) => p.title);
  const list =
    titles.length === 1
      ? titles[0]
      : `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`;

  // Call out requested nouns that didn't match any returned title
  const wantedTokens = wanted
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  const hay = titles.join(" ").toLowerCase();
  const missing = wantedTokens.filter((t) => {
    if (["and", "the", "for", "with", "black", "white", "casual"].includes(t)) {
      return false;
    }
    // synonym-ish: tee/shirt covered by shirt titles
    if ((t === "tee" || t === "tshirt") && /shirt|tee/.test(hay)) return false;
    if (t === "hat" && /cap|hat/.test(hay)) return false;
    return !hay.includes(t);
  });

  if (missing.length > 0) {
    return `Here's what I actually found on the network: ${list}. I don't see “${missing.join(", ")}” in any catalog right now — tap a card for details and pay.`;
  }

  return `Here's what matched on the Borneo network: ${list}. Tap a card for details, then pay with Visa or USDC.`;
}
