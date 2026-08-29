"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ProtocolLog } from "@/components/marketing/protocol-log";
import { readDemoSession, writeDemoSession } from "@/lib/demo-session";
import { BuyerChainOfThought } from "./_components/buyer-chain-of-thought";
import { IntentComposer } from "./_components/intent-composer";
import { PaymentConsentModal } from "./_components/payment-consent-modal";
import { PaymentRailPicker } from "./_components/payment-rail-picker";
import { ProductPicker } from "./_components/product-picker";
import {
  createInitialState,
  INITIAL_STEPS,
  selectedPick,
  sleep,
  updateStep,
  type BuyerFlowState,
  type ChainStep,
  type MarketProductPick,
  type PaymentRail,
} from "./_lib/buyer-flow";
import { discoverFashionPicks } from "./_lib/discover-client";
import {
  DEFAULT_FASHION_INTENT,
  FASHION_HEADLINE,
  FASHION_SUBCOPY,
  isStaleTotePrompt,
  purchaseMessage,
} from "./_lib/fashion-prompts";

const META_ROLE = "buyer-flow-meta";

type PersistedMeta = {
  selectedId: string | null;
  rail: PaymentRail | null;
  phase: BuyerFlowState["phase"];
  picks: MarketProductPick[];
  snowtrace: string | null;
};

function stepsToLines(steps: ChainStep[]): Array<{ role: string; text: string }> {
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
    createInitialState(DEFAULT_FASHION_INTENT),
  );

  useEffect(() => {
    const session = readDemoSession();
    const store = session.lastStore ?? null;
    setStoreSlug(store?.slug ?? null);

    let intent = session.buyer?.input || DEFAULT_FASHION_INTENT;
    if (isStaleTotePrompt(intent)) intent = DEFAULT_FASHION_INTENT;

    const meta = parseSessionMeta(session.buyer?.lines);
    const next = createInitialState(intent);

    if (meta?.picks?.length) {
      next.picks = meta.picks;
      next.selectedId = meta.selectedId;
      next.rail = meta.rail;
      next.snowtrace = meta.snowtrace;
      next.phase =
        meta.phase === "intent" || meta.phase === "thinking"
          ? meta.picks.length
            ? "pick"
            : "intent"
          : meta.phase;
      if (meta.picks.length) {
        next.steps = INITIAL_STEPS.map((s) => ({
          ...s,
          status: "complete" as const,
          description:
            s.id === "rank"
              ? `Restored ${meta.picks.length} apparel pick(s) from session`
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
        input: state.intent,
        lines: encodeSessionLines(state.steps, {
          selectedId: state.selectedId,
          rail: state.rail,
          phase: state.phase,
          picks: state.picks,
          snowtrace: state.snowtrace,
        }),
      },
    });
  }, [hydrated, state]);

  const selected = useMemo(() => selectedPick(state), [state]);

  const runDiscovery = useCallback(async () => {
    const intent = state.intent.trim();
    if (!intent) return;

    setState((prev) => ({
      ...prev,
      phase: "thinking",
      busy: true,
      error: null,
      picks: [],
      selectedId: null,
      rail: null,
      consentOpen: false,
      snowtrace: null,
      steps: INITIAL_STEPS.map((s) => ({ ...s })),
    }));

    try {
      // Step 1 — parse
      setState((prev) => ({
        ...prev,
        steps: updateStep(prev.steps, "parse", {
          status: "active",
          description: `Reading: “${intent}”`,
        }),
      }));
      await sleep(220);

      setState((prev) => ({
        ...prev,
        steps: updateStep(prev.steps, "parse", {
          status: "complete",
          description: "Intent captured · fashion buyer agent",
        }),
      }));

      // Step 2 — decompose (runs while we prepare search)
      setState((prev) => ({
        ...prev,
        steps: updateStep(prev.steps, "decompose", { status: "active" }),
      }));
      await sleep(280);

      const discoveryPromise = discoverFashionPicks(intent);

      // Soft wait so decompose feels live, then search
      await sleep(180);
      const { picks, decomposed, storeSlugs } = await discoveryPromise;

      setState((prev) => ({
        ...prev,
        steps: updateStep(prev.steps, "decompose", {
          status: "complete",
          bullets: decomposed.constraints,
        }),
      }));

      // Step 3 — search
      setState((prev) => ({
        ...prev,
        steps: updateStep(prev.steps, "search", {
          status: "active",
          description: "GET /registry.json · matching catalogs…",
        }),
      }));
      await sleep(200);

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

      // Step 4 — rank
      setState((prev) => ({
        ...prev,
        steps: updateStep(prev.steps, "rank", {
          status: "active",
          description: "Scoring apparel relevance…",
        }),
      }));
      await sleep(250);

      if (picks.length === 0) {
        setState((prev) => ({
          ...prev,
          phase: "pick",
          busy: false,
          picks: [],
          steps: updateStep(prev.steps, "rank", {
            status: "error",
            description:
              "No apparel matches on the network. Try another intent or open Market.",
            links: [{ label: "Browse Market", href: "/market" }],
          }),
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        phase: "pick",
        busy: false,
        picks,
        steps: updateStep(prev.steps, "rank", {
          status: "complete",
          description: `Top ${picks.length} fashion pick(s)`,
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
        phase: "intent",
        busy: false,
        error: message,
        steps: updateStep(prev.steps, "search", {
          status: "error",
          description: message,
        }),
      }));
    }
  }, [state.intent]);

  const authorizePurchase = useCallback(async () => {
    const product = selectedPick(state);
    const rail = state.rail;
    if (!product || !rail) return;

    const message = purchaseMessage({
      storeSlug: product.storeSlug,
      productTitle: product.title,
    });

    setState((prev) => ({
      ...prev,
      phase: "settle",
      busy: true,
      consentOpen: false,
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
        setState((prev) => ({
          ...prev,
          phase: "done",
          busy: false,
          snowtrace: explorer,
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
        setState((prev) => ({
          ...prev,
          phase: "done",
          busy: false,
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
        phase: "rail",
        busy: false,
        error: messageText,
        steps: updateStep(prev.steps, "settle", {
          status: "error",
          description: messageText,
        }),
      }));
    }
  }, [state]);

  const showPicker =
    state.phase === "pick" ||
    state.phase === "rail" ||
    state.phase === "consent" ||
    state.phase === "settle" ||
    state.phase === "done";

  const showRail =
    (state.phase === "rail" ||
      state.phase === "consent" ||
      state.phase === "settle" ||
      state.phase === "done") &&
    state.selectedId;

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
                  or try “Buy the hackathon tee”.
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
          <IntentComposer
            value={state.intent}
            onChange={(intent) =>
              setState((prev) => ({ ...prev, intent, error: null }))
            }
            onSubmit={() => void runDiscovery()}
            busy={state.busy && state.phase === "thinking"}
            disabled={state.busy && state.phase === "settle"}
          />
          <BuyerChainOfThought
            steps={state.steps}
            className="min-h-[320px] lg:min-h-[420px]"
          />
        </div>

        {showPicker ? (
          <ProductPicker
            products={state.picks}
            selectedId={state.selectedId}
            disabled={state.busy}
            onSelect={(id) =>
              setState((prev) => ({
                ...prev,
                selectedId: id,
                phase: "rail",
                error: null,
              }))
            }
          />
        ) : null}

        {showRail ? (
          <PaymentRailPicker
            value={state.rail}
            disabled={state.busy}
            canContinue={Boolean(state.selectedId && state.rail)}
            onChange={(rail) =>
              setState((prev) => ({ ...prev, rail, error: null }))
            }
            onContinue={() =>
              setState((prev) => ({
                ...prev,
                phase: "consent",
                consentOpen: true,
              }))
            }
          />
        ) : null}

        <PaymentConsentModal
          open={state.consentOpen}
          product={selected}
          rail={state.rail}
          busy={state.busy}
          onCancel={() =>
            setState((prev) => ({
              ...prev,
              consentOpen: false,
              phase: "rail",
            }))
          }
          onAuthorize={() => void authorizePurchase()}
        />

        <ProtocolLog className="max-w-none" />
      </main>
    </div>
  );
}
