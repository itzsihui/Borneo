"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ProtocolLog } from "@/components/marketing/protocol-log";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_BUYER_LINES,
  defaultBuyerPrompt,
  readDemoSession,
  writeDemoSession,
} from "@/lib/demo-session";

type Line = { role: string; text: string };

function isUrl(text: string) {
  return /^https?:\/\//i.test(text.trim());
}

export default function BuyerPage() {
  const [hydrated, setHydrated] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [buyerInput, setBuyerInput] = useState(defaultBuyerPrompt(null));
  const [buyerLines, setBuyerLines] = useState<Line[]>(DEFAULT_BUYER_LINES);
  const [busy, setBusy] = useState(false);
  const [snowtrace, setSnowtrace] = useState<string | null>(null);

  useEffect(() => {
    const session = readDemoSession();
    const store = session.lastStore ?? null;
    setStoreSlug(store?.slug ?? null);
    if (session.buyer?.input) {
      setBuyerInput(session.buyer.input);
    } else {
      setBuyerInput(defaultBuyerPrompt(store));
    }
    if (session.buyer?.lines?.length) {
      setBuyerLines(session.buyer.lines);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeDemoSession({
      buyer: {
        input: buyerInput,
        lines: buyerLines,
      },
    });
  }, [hydrated, buyerInput, buyerLines]);

  /** One purchase: Avalanche x402, then StraitsX card — rails labeled in the log. */
  async function runBuy(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setBuyerLines((prev) => [...prev, { role: "you", text: buyerInput }]);

    const merchant =
      storeSlug ||
      buyerInput.match(/\/s\/([a-z0-9-]+)/i)?.[1] ||
      "hackathon-shirts";

    try {
      setBuyerLines((prev) => [
        ...prev,
        { role: "rail", text: "Avalanche x402 — discover → 402 challenge → settle" },
      ]);
      const x402Res = await fetch("/api/buyer-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: buyerInput }),
      });
      const x402 = (await x402Res.json()) as {
        steps?: Array<{ type: string; text: string }>;
        error?: string;
        receipt?: { explorerUrl?: string };
        llm?: string;
      };
      const x402Steps = x402.steps ?? [];
      if (x402Steps.length === 0) {
        setBuyerLines((prev) => [
          ...prev,
          {
            role: "error",
            text: x402.error || `x402 failed (HTTP ${x402Res.status})`,
          },
        ]);
      } else {
        setBuyerLines((prev) => [
          ...prev,
          ...x402Steps.map((step) => ({
            role: `x402/${step.type}`,
            text: step.text,
          })),
          ...(x402.llm ? [{ role: "info", text: `llm=${x402.llm}` }] : []),
        ]);
        if (x402.receipt?.explorerUrl) {
          setSnowtrace(x402.receipt.explorerUrl);
        }
      }

      setBuyerLines((prev) => [
        ...prev,
        {
          role: "rail",
          text: "StraitsX card — scoped virtual card → /checkout → burn",
        },
      ]);
      const cardRes = await fetch("/api/card-mandate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checkout: true,
          merchant,
          message: buyerInput,
        }),
      });
      const card = (await cardRes.json()) as {
        steps?: Array<{ type: string; text: string }>;
        error?: string;
      };
      const cardSteps = card.steps ?? [];
      if (cardSteps.length === 0) {
        setBuyerLines((prev) => [
          ...prev,
          {
            role: "error",
            text: card.error || `StraitsX card failed (HTTP ${cardRes.status})`,
          },
        ]);
      } else {
        setBuyerLines((prev) => [
          ...prev,
          ...cardSteps.map((step) => ({
            role: `straitsx/${step.type}`,
            text: step.text,
          })),
        ]);
      }
    } catch (error) {
      setBuyerLines((prev) => [
        ...prev,
        {
          role: "error",
          text: error instanceof Error ? error.message : "Buy failed",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 pt-20 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Buyer agent
            </h1>
            <p className="mt-2 max-w-[52ch] text-foreground/70">
              Separate from merchant setup. Discovers via /llms.txt + registry
              (slug optional), then pays Avalanche x402 + StraitsX card.
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
                <> Browse <Link href="/market" className="underline underline-offset-2">Market</Link> or try “buy a tote bag”.</>
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

        {snowtrace ? (
          <p className="text-sm">
            Snowtrace:{" "}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={snowtrace}
              target="_blank"
              rel="noreferrer"
            >
              {snowtrace}
            </a>
          </p>
        ) : null}

        <section className="flex min-h-[480px] flex-col border border-border bg-background">
          <h2 className="border-b border-border px-4 py-3 font-[family-name:var(--font-syne)] text-sm font-semibold tracking-tight">
            Buyer agent
          </h2>
          <ScrollArea className="h-72 px-4 py-3">
            <div className="flex flex-col gap-2 font-mono text-xs">
              {buyerLines.map((line, index) => (
                <p key={index} className="whitespace-pre-wrap text-foreground/80">
                  <span className="text-foreground/50">{line.role}: </span>
                  {isUrl(line.text) ? (
                    <a
                      className="text-primary underline-offset-2 hover:underline"
                      href={line.text.trim()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {line.text.trim()}
                    </a>
                  ) : (
                    line.text
                  )}
                </p>
              ))}
            </div>
          </ScrollArea>
          <form
            onSubmit={runBuy}
            className="mt-auto flex flex-col gap-2 border-t border-border p-4"
          >
            <Textarea
              value={buyerInput}
              onChange={(event) => setBuyerInput(event.target.value)}
              rows={3}
            />
            <Button type="submit" disabled={busy} className="w-fit">
              {busy ? "Buying…" : "Buy"}
            </Button>
          </form>
        </section>

        <ProtocolLog className="max-w-none" />
      </main>
    </div>
  );
}
