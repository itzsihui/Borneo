export type BuyerPhase =
  | "intent"
  | "thinking"
  | "pick"
  | "rail"
  | "consent"
  | "settle"
  | "done";

export type PaymentRail = "visa" | "stablecoin";

export type ChainStepStatus = "pending" | "active" | "complete" | "error";

export type ChainStep = {
  id: string;
  title: string;
  status: ChainStepStatus;
  description?: string;
  bullets?: string[];
  links?: Array<{ label: string; href: string }>;
  protocolLines?: Array<{ role: string; text: string }>;
};

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

export type BuyerFlowState = {
  phase: BuyerPhase;
  intent: string;
  steps: ChainStep[];
  picks: MarketProductPick[];
  selectedId: string | null;
  rail: PaymentRail | null;
  consentOpen: boolean;
  busy: boolean;
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
    title: "Rank apparel matches",
    status: "pending",
  },
];

export function createInitialState(intent: string): BuyerFlowState {
  return {
    phase: "intent",
    intent,
    steps: INITIAL_STEPS.map((s) => ({ ...s })),
    picks: [],
    selectedId: null,
    rail: null,
    consentOpen: false,
    busy: false,
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
