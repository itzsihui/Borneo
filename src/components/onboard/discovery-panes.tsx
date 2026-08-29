"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type DiscoveryTab = "llms.txt" | "agent.json" | "catalog.json";

export function DiscoveryPane({
  slug,
  refreshKey,
}: {
  slug: string | null;
  refreshKey: number;
}) {
  const [tab, setTab] = useState<DiscoveryTab>("llms.txt");
  const [body, setBody] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setBody("");
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const path =
          tab === "llms.txt"
            ? `/s/${slug}/llms.txt`
            : tab === "agent.json"
              ? `/s/${slug}/agent.json`
              : `/s/${slug}/catalog.json`;
        const res = await fetch(path, { cache: "no-store" });
        const text = await res.text();
        if (cancelled) return;
        if (!res.ok) {
          setError(text || `HTTP ${res.status}`);
          setBody("");
        } else {
          setBody(text);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Fetch failed");
          setBody("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, tab, refreshKey]);

  const tabs: DiscoveryTab[] = ["llms.txt", "agent.json", "catalog.json"];

  return (
    <section className="flex min-h-0 flex-1 flex-col border-b border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/55">
          Agent discovery
        </p>
        <div className="flex gap-1">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "rounded px-2 py-1 font-mono text-[11px] transition-colors",
                tab === item
                  ? "bg-foreground text-background"
                  : "text-foreground/55 hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 bg-[#0f1419] text-[#c8d0d8]">
        <pre className="whitespace-pre-wrap p-4 font-mono text-[11px] leading-relaxed">
          {!slug
            ? "// Store not live yet.\n// Describe inventory on the left — llms.txt builds here."
            : loading
              ? "// Loading…"
              : error
                ? `// ${error}`
                : body}
        </pre>
      </ScrollArea>
    </section>
  );
}

type TestResult = {
  status: number;
  body: string;
} | null;

export function EndpointLab({
  slug,
  refreshKey,
}: {
  slug: string | null;
  refreshKey: number;
}) {
  const [result, setResult] = useState<TestResult>(null);
  const [busy, setBusy] = useState(false);
  const [skuId, setSkuId] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    if (!slug) {
      setSkuId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/s/${slug}/catalog.json`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          products?: Array<{ id?: string; variants?: Array<{ id?: string }> }>;
        };
        const first =
          data.products?.[0]?.variants?.[0]?.id ||
          data.products?.[0]?.id ||
          null;
        if (!cancelled) setSkuId(first);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, refreshKey]);

  async function testBuy() {
    if (!slug) return;
    setBusy(true);
    try {
      const res = await fetch(`/s/${slug}/buy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skuId: skuId || undefined,
          quantity: 1,
        }),
      });
      const text = await res.text();
      setResult({ status: res.status, body: text });
    } catch (err) {
      setResult({
        status: 0,
        body: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setBusy(false);
    }
  }

  const base = slug ? `/s/${slug}` : null;
  const endpoints = base
    ? [
        { method: "GET", path: `${base}/llms.txt` },
        { method: "GET", path: `${base}/agent.json` },
        { method: "GET", path: `${base}/catalog.json` },
        { method: "POST", path: `${base}/buy`, testable: true },
        { method: "POST", path: `${base}/checkout` },
      ]
    : [];

  return (
    <section className="flex min-h-[220px] flex-col lg:min-h-0 lg:flex-1">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/55">
          x402 endpoints
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!slug || busy}
          onClick={testBuy}
        >
          {busy ? "Testing…" : "Test x402 endpoint"}
        </Button>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr]">
        <ul className="space-y-1 border-b border-border px-3 py-3 font-mono text-[11px]">
          {!slug ? (
            <li className="text-foreground/45">Waiting for publish…</li>
          ) : (
            endpoints.map((ep) => (
              <li key={ep.path} className="flex gap-2 text-foreground/75">
                <span className="w-10 shrink-0 text-foreground/45">
                  {ep.method}
                </span>
                <span>{ep.path}</span>
              </li>
            ))
          )}
        </ul>
        <ScrollArea className="min-h-0 bg-[#0f1419]">
          <pre
            className={cn(
              "whitespace-pre-wrap p-4 font-mono text-[11px] leading-relaxed",
              result?.status === 402
                ? "text-[#f0a0a0]"
                : result?.status === 200
                  ? "text-[#a8d4b0]"
                  : "text-[#c8d0d8]",
            )}
          >
            {!result
              ? "// Press Test x402 endpoint — expect HTTP 402 Payment Required\n// (payment challenge JSON, no signature yet)."
              : `// HTTP ${result.status}\n${result.body}`}
          </pre>
        </ScrollArea>
      </div>
    </section>
  );
}
