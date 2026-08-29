"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ProtocolLog } from "@/components/marketing/protocol-log";
import { readDemoSession, writeDemoSession } from "@/lib/demo-session";
import { BuyerChainOfThought } from "./_components/buyer-chain-of-thought";
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
import {
  FASHION_HEADLINE,
  FASHION_SUBCOPY,
  purchaseMessage,
} from "./_lib/fashion-prompts";
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

  useEffect(() => {
    const session = readDemoSession();
    const store = session.lastStore ?? null;
    setStoreSlug(store?.slug ?? null);

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

      let nextMessages: ChatMessage[] = [];
      let priorProfile: FashionProfile | null = null;

      setState((prev) => {
        nextMessages = [...prev.messages, userMsg];
        priorProfile = prev.profile;
        return {
          ...prev,
          messages: nextMessages,
          chatBusy: true,
          error: null,
          suggestions: [],
        };
      });

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

        // When ready: only say we'll search — never claim catalog hits before discovery
        const assistant: ChatMessage = {
          role: "assistant",
          content: ready
            ? data.reply?.match(/found|here'?s what/i)
              ? "I'll search the Borneo network for that now."
              : data.reply || "I'll search the Borneo network for that now."
            : data.reply || "Tell me a bit more about what you want.",
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistant],
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
          receipt?: { explorerUrl?: string };
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
        const explorer = data.receipt?.explorerUrl ?? null;
        setReceiptNote(null);
        setState((prev) => ({
          ...prev,
          phase: "done",
          busy: false,
          snowtrace: explorer,
          detailOpen: false,
          messages: [
            ...prev.messages,
            {
              role: "assistant",
              content: explorer
                ? `Purchase complete for ${product.title} via USDC / x402. ${explorer}`
                : `Purchase complete for ${product.title} via USDC / x402.`,
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
            message,
          }),
        });
        const data = (await res.json()) as {
          steps?: Array<{ type: string; text: string }>;
          error?: string;
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
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 pt-20 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {FASHION_HEADLINE}
            </h1>
            <p className="mt-2 max-w-[58ch] text-foreground/70">
              {FASHION_SUBCOPY}
              {storeSlug ? (
                <>
                  {" "}
                  Last handoff store{" "}
                  <span className="font-mono text-foreground/85">
                    /s/{storeSlug}
                  </span>
                  .
                </>
              ) : (
                <>
                  {" "}
                  Browse{" "}
                  <Link
                    href="/market"
                    className="underline underline-offset-2"
                  >
                    Market
                  </Link>{" "}
                  or say “I want a t-shirt”.
                </>
              )}
            </p>
          </div>
          <Link
            href="/onboard"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
          >
            Open a store
          </Link>
        </div>

        {state.snowtrace ? (
          <p className="text-sm">
            Basescan:{" "}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={state.snowtrace}
              target="_blank"
              rel="noreferrer"
            >
              {state.snowtrace}
            </a>
          </p>
        ) : null}

        {state.error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <SalespersonChat
            messages={state.messages}
            suggestions={state.suggestions}
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
            busy={state.chatBusy || state.busy}
            disabled={state.busy && state.phase === "settle"}
            className="lg:h-[640px]"
          />
          <BuyerChainOfThought
            steps={state.steps}
            className="min-h-[320px] lg:h-[640px]"
          />
        </div>

        <ProductPayModal
          open={state.detailOpen}
          product={selected}
          rail={state.rail}
          busy={state.busy}
          receiptNote={receiptNote}
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
          <ProtocolLog className="max-w-none" />
        ) : null}
      </main>
    </div>
  );
}
