"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowUp,
  Loader2,
  Paperclip,
  Plus,
  Store,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  ChainOfThought as BuyerChainOfThought,
  type ChainStep,
} from "@/components/agent/chain-of-thought";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MerchantDraft } from "@/lib/inventory/parse";
import { shortAddress } from "@/lib/wallet/ethereum";

export type ChatLine = {
  role: "merchant" | "borneo";
  text: string;
  llm?: string;
};

export type StarterAction = "describe" | "import" | "url" | "wallet";

export type ComposerMode = "choose" | StarterAction;

const STARTERS: Array<{ action: StarterAction; label: string }> = [
  { action: "describe", label: "Add product" },
  { action: "import", label: "Import CSV" },
  { action: "url", label: "Store URL" },
  { action: "wallet", label: "Connect MetaMask" },
];

export function MerchantChat({
  lines,
  message,
  setMessage,
  busy,
  onSubmit,
  onFile,
  storeUrl,
  setStoreUrl,
  onImportUrl,
  belowMessages,
  merchantAddress,
  walletAuthenticated,
  onConnectWallet,
  onStarter,
  steps,
  showReasoning,
  className,
}: {
  lines: ChatLine[];
  message: string;
  setMessage: (value: string) => void;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onFile: (file: File) => void;
  storeUrl?: string;
  setStoreUrl?: (value: string) => void;
  onImportUrl?: () => void;
  belowMessages?: ReactNode;
  merchantAddress?: string | null;
  walletAuthenticated?: boolean;
  onConnectWallet?: () => void;
  onStarter?: (action: StarterAction) => void;
  /** Merchant setup steps — same CoT as buyer shop. */
  steps?: ChainStep[];
  /** Show embedded reasoning while agent work is in flight / after progress. */
  showReasoning?: boolean;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ComposerMode>("choose");
  const reasoning = Boolean(showReasoning && steps?.length);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lines, busy, belowMessages, reasoning, steps]);

  function pick(action: StarterAction) {
    setMode(action);
    onStarter?.(action);
  }

  function backToChoose() {
    setMode("choose");
  }

  const empty = lines.length <= 1 && !reasoning;

  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden border border-border bg-background",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <Store className="size-3.5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold tracking-tight">
              Merchant agent
            </h2>
            <p className="truncate text-[11px] text-foreground/50">
              Inventory · prices · wallet · publish
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-foreground/55">
          {walletAuthenticated && merchantAddress ? (
            <span
              className="hidden rounded-full border border-border bg-muted/40 px-2.5 py-0.5 font-mono text-[11px] text-foreground/80 sm:inline"
              title={merchantAddress}
            >
              {shortAddress(merchantAddress)}
            </span>
          ) : null}
          {walletAuthenticated ? (
            <button
              type="button"
              disabled={busy}
              onClick={onConnectWallet}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
            >
              <Wallet className="size-3.5" />
              Re-auth
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-6"
        >
          {empty ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center px-4 text-center">
              <p className="font-[family-name:var(--font-syne)] text-lg font-semibold tracking-tight">
                What are you selling?
              </p>
              <p className="mt-2 max-w-[40ch] text-sm text-foreground/55">
                Apparel, accessories, shoes — describe stock, import a CSV, or
                paste a Shopify URL. Then set USDC prices and publish.
              </p>
            </div>
          ) : null}

          {lines.map((line, index) => {
            const isUser = line.role === "merchant";
            return (
              <div key={`${line.role}-${index}`} className="space-y-2">
                <div
                  className={cn(
                    "flex",
                    isUser ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[min(90%,42rem)] min-w-0 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                      isUser
                        ? "bg-foreground text-background"
                        : "border border-border bg-muted/40 text-foreground",
                    )}
                  >
                    {line.text}
                    {line.llm ? (
                      <span
                        className={cn(
                          "mt-1 block text-[11px]",
                          isUser ? "text-background/60" : "text-foreground/45",
                        )}
                      >
                        {line.llm}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {belowMessages}

          {reasoning && steps ? (
            <BuyerChainOfThought
              steps={steps}
              variant="chat"
              live={Boolean(busy)}
              liveSummary="Setting up store…"
              errorSummary="Setup needs attention"
              title="Merchant setup"
            />
          ) : null}

          {busy && !reasoning ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground/60">
                <Loader2 className="size-3.5 animate-spin" />
                Working…
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border p-3 sm:px-6">
          {mode === "choose" && !busy ? (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {STARTERS.map((chip) => (
                <button
                  key={chip.action}
                  type="button"
                  onClick={() => pick(chip.action)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-foreground/70 transition-colors hover:bg-muted"
                >
                  {chip.label}
                </button>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={() => {}}
                className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-foreground/40"
                title="Placeholder for the demo"
              >
                Connect CRM
              </button>
            </div>
          ) : null}

          {mode === "choose" ? (
            <form
              onSubmit={onSubmit}
              className="flex items-end gap-2 rounded-2xl border border-border bg-muted/20 p-2 shadow-sm"
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                disabled={busy}
                placeholder="Describe your fashion inventory…"
                className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-foreground/40"
              />
              <button
                type="submit"
                disabled={busy || !message.trim()}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-40"
                aria-label="Send"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-xs text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
                  onClick={backToChoose}
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </button>
                <p className="text-xs font-medium text-foreground/60">
                  {mode === "describe"
                    ? "Add product"
                    : mode === "import"
                      ? "Import CSV"
                      : mode === "url"
                        ? "Store URL"
                        : "Connect MetaMask"}
                </p>
              </div>

              {mode === "describe" ? (
                <div className="flex items-end gap-2 rounded-2xl border border-border bg-muted/20 p-2 shadow-sm">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    disabled={busy}
                    autoFocus
                    placeholder='e.g. "10 linen shirts, 8 tote bags, 6 sneakers"'
                    className="max-h-28 min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-foreground/40"
                  />
                  <button
                    type="submit"
                    disabled={busy || !message.trim()}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-40"
                    aria-label="Send"
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </button>
                </div>
              ) : null}

              {mode === "import" ? (
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-muted/20 px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-40"
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip className="size-4" />
                  {busy ? "Uploading…" : "Choose CSV file"}
                </button>
              ) : null}

              {mode === "url" ? (
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/20 p-2 shadow-sm">
                  <input
                    value={storeUrl ?? ""}
                    onChange={(e) => setStoreUrl?.(e.target.value)}
                    placeholder="your-store.myshopify.com"
                    disabled={busy}
                    autoFocus
                    className="min-h-[40px] flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-foreground/40"
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if ((storeUrl ?? "").trim()) onImportUrl?.();
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy || !(storeUrl ?? "").trim()}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-40"
                    onClick={() => onImportUrl?.()}
                    aria-label="Import URL"
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </button>
                </div>
              ) : null}

              {mode === "wallet" ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-foreground/55">
                    {walletAuthenticated
                      ? `Signed in as ${shortAddress(merchantAddress ?? "")}. Re-auth or go back to add products.`
                      : "Approve MetaMask on Base Sepolia, then sign — no funds move. That address becomes x402 payTo."}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-xs font-medium text-background transition-opacity disabled:opacity-40"
                    onClick={onConnectWallet}
                  >
                    <Wallet className="size-3.5" />
                    {walletAuthenticated
                      ? "Re-auth MetaMask"
                      : "Sign in with MetaMask"}
                  </button>
                </div>
              ) : null}

              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.tsv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFile(file);
                  e.target.value = "";
                }}
              />
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export function PriceDraftForm({
  draft,
  setDraft,
  prices,
  setPrices,
  quantities,
  setQuantities,
  busy,
  onSubmit,
  walletReady,
}: {
  draft: MerchantDraft;
  setDraft: (draft: MerchantDraft) => void;
  prices: string[];
  setPrices: (prices: string[]) => void;
  quantities: string[];
  setQuantities: (quantities: string[]) => void;
  busy: boolean;
  onSubmit: () => void;
  walletReady?: boolean;
}) {
  const hasLines = draft.lines.length > 0;
  const allTitled = draft.lines.every((line) => line.title.trim().length > 0);
  const allPriced = draft.lines.every((_, i) => String(prices[i] ?? "").trim());
  const allQtyOk = draft.lines.every((_, i) => {
    const q = Number(String(quantities[i] ?? "").trim());
    return Number.isFinite(q) && q > 0;
  });
  const canPublish = hasLines && allTitled && allPriced && allQtyOk;
  const hasSuggestions = draft.lines.some((line) => Boolean(line.price));

  function updateTitle(index: number, title: string) {
    setDraft({
      ...draft,
      lines: draft.lines.map((line, i) =>
        i === index ? { ...line, title, name: title } : line,
      ),
    });
  }

  function removeLine(index: number) {
    setDraft({
      ...draft,
      lines: draft.lines.filter((_, i) => i !== index),
    });
    setPrices(prices.filter((_, i) => i !== index));
    setQuantities(quantities.filter((_, i) => i !== index));
  }

  function addLine() {
    setDraft({
      ...draft,
      lines: [
        ...draft.lines,
        { quantity: 1, title: "", description: undefined, price: undefined },
      ],
    });
    setQuantities([...quantities, "1"]);
    setPrices([...prices, ""]);
  }

  const ctaLabel = busy
    ? walletReady
      ? "Publishing…"
      : "Opening MetaMask…"
    : walletReady
      ? hasSuggestions
        ? "Confirm & publish"
        : "Submit prices"
      : "Sign in & publish";

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-3.5">
      <p className="font-[family-name:var(--font-syne)] text-sm font-semibold tracking-tight">
        Edit inventory
      </p>
      <p className="mt-0.5 text-xs text-foreground/50">
        Title, qty, price (USDC) — add or remove before publish.
      </p>
      {!walletReady ? (
        <p className="mt-1 text-xs text-foreground/50">
          MetaMask signature sets your x402 payout address (Base Sepolia).
        </p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        {draft.lines.map((line, index) => (
          <div
            key={index}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)_6.5rem_2rem] items-center gap-2"
          >
            <Input
              inputMode="numeric"
              placeholder="qty"
              value={quantities[index] ?? ""}
              onChange={(event) => {
                const next = [...quantities];
                next[index] = event.target.value;
                setQuantities(next);
              }}
              aria-label={`Quantity for row ${index + 1}`}
              className="rounded-xl"
            />
            <Input
              placeholder="Product title"
              value={line.title}
              onChange={(event) => updateTitle(index, event.target.value)}
              aria-label={`Title for row ${index + 1}`}
              className="rounded-xl"
            />
            <Input
              inputMode="decimal"
              placeholder="0.00"
              value={prices[index] ?? ""}
              onChange={(event) => {
                const next = [...prices];
                next[index] = event.target.value;
                setPrices(next);
              }}
              aria-label={`Price for row ${index + 1}`}
              className="rounded-xl"
            />
            <button
              type="button"
              disabled={busy}
              className="flex size-9 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
              onClick={() => removeLine(index)}
              aria-label={`Remove ${line.title || `row ${index + 1}`}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {draft.lines.length === 0 ? (
          <p className="text-xs text-foreground/50">
            No products yet — add a row or import a catalog.
          </p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
          onClick={addLine}
        >
          <Plus className="size-3.5" />
          Add product
        </button>
        <MovingBorderButton
          type="button"
          disabled={busy || !canPublish}
          onClick={onSubmit}
          borderRadius="1.5rem"
          containerClassName="h-10 w-auto min-w-[9.5rem] disabled:opacity-40"
          borderClassName="bg-[radial-gradient(#3d9b72_40%,transparent_60%)]"
          className="border-border bg-foreground px-4 text-xs font-medium text-background"
          duration={2500}
        >
          {ctaLabel}
        </MovingBorderButton>
      </div>
    </div>
  );
}
