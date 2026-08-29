"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtocolLog } from "@/components/marketing/protocol-log";
import {
  evaluatePolicy,
  mandateSpendCap,
  markCardIssued,
  readBuyerAccount,
  recordSpend,
} from "@/lib/buyer-account";
import { readDemoSession, writeDemoSession } from "@/lib/demo-session";
import { ProductPayModal } from "./_components/product-pay-modal";
import { SalespersonChat } from "./_components/salesperson-chat";
import {
  catalogResultMessage,
  createInitialState,
  INITIAL_STEPS,
  profileBullets,
  selectedPick,
  sleep,
  updateStep,
  WELCOME_MESSAGE,
  type BuyerFlowState,
  type ChainStep,
  type ChatMessage,
  type FashionProfile,
  type MarketProductPick,
  type PaymentRail,
} from "./_lib/buyer-flow";
import { discoverFashionPicks } from "./_lib/discover-client";
import { purchaseMessage } from "./_lib/fashion-prompts";
import type { SalespersonResult } from "./_lib/salesperson";

const META_ROLE = "buyer-flow-meta";

type PersistedMeta = {
  selectedId: string | null;
  rail: PaymentRail | null;
  phase: BuyerFlowState["phase"];
  picks: MarketProductPick[];
  snowtrace: string | null;
  messages: ChatMessage[];
  suggestions: string[];
  profile: FashionProfile | null;
  intent: string;
};

function stepsToLines(
  steps: ChainStep[],
): Array<{ role: string; text: string }> {
  const lines: Array<{ role: string; text: string }> = [];
  for (const step of steps) {
    lines.push({
      role: `cot/${step.status}`,
      text: step.title + (step.description ? ` — ${step.description}` : ""),
    });
    for (const bullet of step.bullets ?? []) {
      lines.push({ role: "cot/bullet", text: bullet });
    }
    for (const proto of step.protocolLines ?? []) {
      lines.push(proto);
    }
  }
  return lines;
}

function encodeSessionLines(
  steps: ChainStep[],
  meta: PersistedMeta,
): Array<{ role: string; text: string }> {
  return [
    { role: META_ROLE, text: JSON.stringify(meta) },
    ...stepsToLines(steps),
  ];
}

function parseSessionMeta(
  lines: Array<{ role: string; text: string }> | undefined,
): PersistedMeta | null {
  const raw = lines?.find((l) => l.role === META_ROLE)?.text;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedMeta;
  } catch {
    return null;
  }
}

export default function BuyerPage() {
  const [hydrated, setHydrated] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [state, setState] = useState<BuyerFlowState>(() =>
    createInitialState(),
  );
  const [receiptNote, setReceiptNote] = useState<string | null>(null);
  const [cardIssued, setCardIssued] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([WELCOME_MESSAGE]);
  const profileRef = useRef<FashionProfile | null>(null);

  useEffect(() => {
    messagesRef.current = state.messages;
    profileRef.current = state.profile;
  }, [state.messages, state.profile]);

  useEffect(() => {
    const session = readDemoSession();
    const store = session.lastStore ?? null;
    setStoreSlug(store?.slug ?? null);
    setCardIssued(Boolean(readBuyerAccount()?.card.issued));

    const meta = parseSessionMeta(session.buyer?.lines);
    const next = createInitialState();

    if (meta) {
      next.intent = meta.intent || "";
      next.messages =
        meta.messages?.length > 0 ? meta.messages : [WELCOME_MESSAGE];
      next.suggestions = meta.suggestions ?? next.suggestions;
      next.profile = meta.profile;
      next.picks = meta.picks ?? [];
      next.selectedId = meta.selectedId;
      next.rail = meta.rail;
      next.snowtrace = meta.snowtrace;

      const rawPhase = String(meta.phase || "chat");
      const phase =
        rawPhase === "intent" ? "chat" : (rawPhase as BuyerFlowState["phase"]);

      if (phase === "thinking") {
        next.phase = "chat";
      } else {
        next.phase = phase || "chat";
      }

      if (meta.picks?.length) {
        next.steps = INITIAL_STEPS.map((s) => ({
          ...s,
          status: "complete" as const,
          description:
            s.id === "rank"
              ? `Restored ${meta.picks.length} catalog pick(s)`
              : s.description,
        }));
      }
    }

    setState(next);
    messagesRef.current = next.messages;
    profileRef.current = next.profile;
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeDemoSession({
      buyer: {
        input: state.intent || state.messages.at(-1)?.content || "",
        lines: encodeSessionLines(state.steps, {
          selectedId: state.selectedId,
          rail: state.rail,
          phase: state.phase,
          picks: state.picks,
          snowtrace: state.snowtrace,
          messages: state.messages,
          suggestions: state.suggestions,
          profile: state.profile,
          intent: state.intent,
        }),
      },
    });
  }, [hydrated, state]);

  const selected = useMemo(() => selectedPick(state), [state]);

  const runDiscovery = useCallback(
    async (query: string, profile: FashionProfile | null) => {
      const intent = query.trim();
      if (!intent) return;

      setState((prev) => ({
        ...prev,
        phase: "thinking",
        intent,
        profile,
        busy: true,
        chatBusy: false,
        error: null,
        picks: [],
        selectedId: null,
        rail: null,
        detailOpen: false,
        snowtrace: null,
        suggestions: [],
        steps: INITIAL_STEPS.map((s) => ({ ...s })),
      }));
      setReceiptNote(null);

      try {
        setState((prev) => ({
          ...prev,
          steps: updateStep(prev.steps, "parse", {
            status: "active",
            description: `Reading: “${intent}”`,
          }),
        }));
        await sleep(200);

        setState((prev) => ({
          ...prev,
          steps: updateStep(prev.steps, "parse", {
            status: "complete",
            description: "Intent locked from salesperson chat",
          }),
        }));

        setState((prev) => ({
          ...prev,
          steps: updateStep(prev.steps, "decompose", {
            status: "active",
            bullets: profileBullets(profile),
          }),
        }));
        await sleep(220);

        const discoveryPromise = discoverFashionPicks(intent, profile);
        await sleep(160);
        const { picks, decomposed, storeSlugs } = await discoveryPromise;

        setState((prev) => ({
          ...prev,
          steps: updateStep(prev.steps, "decompose", {
            status: "complete",
            bullets: [
              ...profileBullets(profile),
              ...decomposed.constraints.filter(
                (c) => !c.startsWith("Category:"),
              ),
            ],
          }),
        }));

        setState((prev) => ({
          ...prev,
          steps: updateStep(prev.steps, "search", {
            status: "active",
            description: "GET /registry.json · matching catalogs…",
          }),
        }));
        await sleep(180);

        setState((prev) => ({
          ...prev,
          steps: updateStep(prev.steps, "search", {
            status: "complete",
            description:
              storeSlugs.length > 0
                ? `Matched ${storeSlugs.length} store(s)`
                : "No store hits",
            links: [
              { label: "/registry.json", href: "/registry.json" },
              ...storeSlugs.map((slug) => ({
                label: `/s/${slug}/catalog.json`,
                href: `/s/${slug}/catalog.json`,
              })),
            ],
          }),
        }));

        setState((prev) => ({
          ...prev,
          steps: updateStep(prev.steps, "rank", {
            status: "active",
            description: "Scoring catalog relevance…",
          }),
        }));
        await sleep(200);

        const resultText = catalogResultMessage(intent, picks, profile);

        if (picks.length === 0) {
          setState((prev) => ({
            ...prev,
            phase: "chat",
            busy: false,
            picks: [],
            suggestions: ["I want a t-shirt", "Looking for a cap", "Browse Market"],
            messages: [
              ...prev.messages,
              { role: "assistant", content: resultText },
            ],
            steps: updateStep(prev.steps, "rank", {
              status: "error",
              description: "No catalog matches for this request.",
              links: [{ label: "Browse Market", href: "/market" }],
            }),
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          phase: "chat",
          busy: false,
          picks,
          suggestions: ["Something else?", "Looking for a tee", "Looking for a cap"],
          messages: [
            ...prev.messages,
            {
              role: "assistant",
              content: resultText,
              products: picks,
            },
          ],
          steps: updateStep(prev.steps, "rank", {
            status: "complete",
            description: `Top ${picks.length} catalog pick(s)`,
            bullets: picks.map(
              (p) =>
                `${p.title} @ /s/${p.storeSlug} · ${p.price} USDC (score ${p.score})`,
            ),
          }),
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Discovery failed";
        setState((prev) => ({
          ...prev,
          phase: "chat",
          busy: false,
          error: message,
          messages: [
            ...prev.messages,
            {
              role: "assistant",
              content: `Search failed: ${message}. Try again?`,
            },
          ],
          steps: updateStep(prev.steps, "search", {
            status: "error",
            description: message,
          }),
        }));
      }
    },
    [],
  );

  const sendChat = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      if (!userMsg.content) return;

      const priorProfile = profileRef.current;

      const nextMessages = [...messagesRef.current, userMsg];
      messagesRef.current = nextMessages;

      setState((prev) => ({
        ...prev,
        messages: nextMessages,
        chatBusy: true,
        error: null,
        suggestions: [],
      }));

      try {
        const res = await fetch("/api/buyer-chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        });
        const data = (await res.json()) as SalespersonResult & {
          error?: string;
        };

        const profile = data.profile ?? priorProfile;
        const ready = data.status === "ready" && Boolean(data.searchQuery);

        const assistant: ChatMessage = {
          role: "assistant",
          content: ready
            ? data.reply?.match(/found|here'?s what/i)
              ? "I'll search the Borneo network for that now."
              : data.reply || "I'll search the Borneo network for that now."
            : data.reply || "Tell me a bit more about what you want.",
        };

        const withAssistant = [...messagesRef.current, assistant];
        messagesRef.current = withAssistant;

        setState((prev) => ({
          ...prev,
          messages: withAssistant,
          suggestions: ready ? [] : (data.suggestions ?? []),
          profile,
          chatBusy: false,
        }));

        if (ready && data.searchQuery) {
          await runDiscovery(data.searchQuery, profile);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Chat failed";
        setState((prev) => ({
          ...prev,
          chatBusy: false,
          error: message,
          messages: [
            ...prev.messages,
            {
              role: "assistant",
              content: "I hit a snag — try that again?",
            },
          ],
          suggestions: ["I want a t-shirt", "Looking for a cap"],
        }));
      }
    },
    [runDiscovery],
  );

  const authorizePurchase = useCallback(async () => {
    const product = selectedPick(state);
    const rail = state.rail;
    if (!product || !rail) return;

    const account = readBuyerAccount();
    if (!account) {
      setState((prev) => ({
        ...prev,
        error: "Complete buyer onboarding before checkout",
        detailOpen: false,
      }));
      return;
    }

    const amount = Number(product.price);
    if (!Number.isFinite(amount) || amount < 0) {
      setState((prev) => ({
        ...prev,
        error: "Invalid product price",
      }));
      return;
    }

    const policyCheck = evaluatePolicy(account, amount);
    if (!policyCheck.ok) {
      setState((prev) => ({
        ...prev,
        error: policyCheck.reason,
        detailOpen: true,
        busy: false,
        phase: "chat",
      }));
      return;
    }

    const spendCap = mandateSpendCap(account, amount);

    const message = purchaseMessage({
      storeSlug: product.storeSlug,
      productTitle: product.title,
    });
    // picks use `${storeSlug}:${skuId}`
    const skuId = product.id.includes(":")
      ? product.id.slice(product.id.indexOf(":") + 1)
      : product.id;

    setState((prev) => ({
      ...prev,
      phase: "settle",
      busy: true,
      detailOpen: false,
      error: null,
      steps: [
        ...prev.steps.filter((s) => s.id !== "settle"),
        {
          id: "settle",
          title:
            rail === "visa"
              ? "Settling Visa card rail"
              : "Settling USDC x402 rail on Base Sepolia",
          status: "active",
          description: "Authorized — agent executing payment…",
        },
      ],
    }));

    try {
      if (rail === "stablecoin") {
        const res = await fetch("/api/buyer-agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message }),
        });
        const data = (await res.json()) as {
          steps?: Array<{ type: string; text: string }>;
          error?: string;
          receipt?: { explorerUrl?: string; orderId?: string };
          llm?: string;
        };
        const protocolLines = (data.steps ?? []).map((step) => ({
          role: `x402/${step.type}`,
          text: step.text,
        }));
        if (data.llm) {
          protocolLines.push({ role: "info", text: `llm=${data.llm}` });
        }
        if (protocolLines.length === 0) {
          throw new Error(data.error || `x402 failed (HTTP ${res.status})`);
        }
        if (
          (data.steps ?? []).some((s) => s.type === "error") ||
          !(data.steps ?? []).some((s) => s.type === "success")
        ) {
          const errStep = (data.steps ?? []).find((s) => s.type === "error");
          throw new Error(
            errStep?.text || data.error || "x402 settlement failed",
          );
        }
        const explorer =
          data.receipt?.explorerUrl ||
          (data.steps ?? []).find(
            (s) =>
              s.type === "success" && /^https?:\/\//i.test(s.text.trim()),
          )?.text.trim() ||
          undefined;
        recordSpend({
          amount,
          rail: "x402",
          title: product.title,
          storeSlug: product.storeSlug,
          storeName: product.storeName,
          merchantDisplayName: product.merchantDisplayName,
          merchantReceive: product.merchantAddress,
          skuId,
          imageUrl: product.imageUrl,
          explorerUrl: explorer,
          orderId: data.receipt?.orderId,
        });
        setReceiptNote(null);
        setState((prev) => ({
          ...prev,
          phase: "done",
          busy: false,
          snowtrace: explorer ?? null,
          detailOpen: false,
          messages: [
            ...prev.messages,
            {
              role: "assistant",
              content: `Purchase complete for ${product.title} via USDC / x402.`,
              links: explorer
                ? [{ label: "View on Basescan", href: explorer }]
                : undefined,
            },
          ],
          steps: updateStep(prev.steps, "settle", {
            status: "complete",
            description: explorer
              ? "Stablecoin settlement complete"
              : "x402 flow finished",
            protocolLines,
            links: explorer
              ? [{ label: "Open Basescan", href: explorer }]
              : undefined,
          }),
        }));
      } else {
        const res = await fetch("/api/card-mandate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            checkout: true,
            merchant: product.storeSlug,
            skuId,
            price: product.price,
            title: product.title,
            spendCap: String(spendCap),
            message,
          }),
        });
        const data = (await res.json()) as {
          steps?: Array<{ type: string; text: string }>;
          error?: string;
          mandate?: {
            truncatedPan?: string;
            source?: string;
            cardOpaqueId?: string;
          };
          receipt?: { orderId?: string; amount?: string };
        };
        const protocolLines = (data.steps ?? []).map((step) => ({
          role: `visa/${step.type}`,
          text: step.text,
        }));
        if (protocolLines.length === 0) {
          throw new Error(
            data.error || `Visa card rail failed (HTTP ${res.status})`,
          );
        }
        if (
          (data.steps ?? []).some((s) => s.type === "error") ||
          !(data.steps ?? []).some((s) => s.type === "success")
        ) {
          const errStep = (data.steps ?? []).find((s) => s.type === "error");
          throw new Error(
            errStep?.text || data.error || "Visa card checkout failed",
          );
        }
        recordSpend({
          amount,
          rail: "straitsx-card",
          title: product.title,
          storeSlug: product.storeSlug,
          storeName: product.storeName,
          merchantDisplayName: product.merchantDisplayName,
          merchantReceive:
            product.visaReceiveLabel ||
            product.visaReceiveId ||
            product.storeSlug,
          skuId,
          imageUrl: product.imageUrl,
          orderId: data.receipt?.orderId,
          cardOpaqueId: data.mandate?.cardOpaqueId,
          truncatedPan: data.mandate?.truncatedPan,
        });
        markCardIssued({
          truncatedPan: data.mandate?.truncatedPan,
          source: data.mandate?.source,
        });
        setCardIssued(true);
        setReceiptNote(null);
        setState((prev) => ({
          ...prev,
          phase: "done",
          busy: false,
          detailOpen: false,
          messages: [
            ...prev.messages,
            {
              role: "assistant",
              content: `Purchase complete for ${product.title} via Visa card.`,
            },
          ],
          steps: updateStep(prev.steps, "settle", {
            status: "complete",
            description: "Visa agent-authorized card flow complete",
            protocolLines,
          }),
        }));
      }
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Payment failed";
      setState((prev) => ({
        ...prev,
        phase: "chat",
        busy: false,
        error: messageText,
        steps: updateStep(prev.steps, "settle", {
          status: "error",
          description: messageText,
        }),
      }));
    }
  }, [state]);

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-2 px-3 py-3 sm:px-6">
      {storeSlug ? (
        <p className="shrink-0 px-1 text-[11px] text-foreground/45">
          Last handoff{" "}
          <span className="font-mono text-foreground/70">/s/{storeSlug}</span>
        </p>
      ) : null}

      {state.error ? (
        <p className="shrink-0 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SalespersonChat
        messages={state.messages}
        suggestions={state.suggestions}
        steps={state.steps}
        onSend={(text) => void sendChat(text)}
        onProductClick={(product) =>
          setState((prev) => ({
            ...prev,
            selectedId: product.id,
            picks: prev.picks.some((p) => p.id === product.id)
              ? prev.picks
              : [...prev.picks, product],
            detailOpen: true,
            rail: prev.rail,
            error: null,
          }))
        }
        chatBusy={state.chatBusy}
        searching={state.busy}
        disabled={state.busy && state.phase === "settle"}
      />

      <ProductPayModal
        open={state.detailOpen}
        product={selected}
        rail={state.rail}
        busy={state.busy}
        receiptNote={receiptNote}
        firstVisaIssue={!cardIssued}
        onRailChange={(rail) =>
          setState((prev) => ({ ...prev, rail, error: null }))
        }
        onClose={() =>
          setState((prev) => ({
            ...prev,
            detailOpen: false,
          }))
        }
        onPay={() => void authorizePurchase()}
      />

      {state.rail === "stablecoin" &&
      (state.phase === "settle" || state.phase === "done") ? (
        <ProtocolLog className="max-h-32 shrink-0 overflow-auto" />
      ) : null}
    </main>
  );
}
