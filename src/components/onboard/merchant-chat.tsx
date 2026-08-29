"use client";

import { FormEvent, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Paperclip, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { MerchantDraft } from "@/lib/inventory/parse";
import { shortAddress } from "@/lib/wallet/ethereum";

export type ChatLine = {
  role: "merchant" | "aisle";
  text: string;
  llm?: string;
};

export type StarterAction = "describe" | "import" | "url" | "wallet";

export type ComposerMode = "choose" | StarterAction;

function ChoiceButtons({
  busy,
  onPick,
  compact,
}: {
  busy: boolean;
  onPick: (action: StarterAction) => void;
  compact?: boolean;
}) {
  const cls = compact ? "h-8 text-xs" : "h-9 text-sm";
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        className={cls}
        onClick={() => onPick("describe")}
      >
        Add product
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        className={cls}
        onClick={() => onPick("import")}
      >
        Import CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        className={cls}
        onClick={() => onPick("url")}
      >
        Store URL
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        className={cls}
        onClick={() => onPick("wallet")}
      >
        Connect MetaMask
      </Button>
    </div>
  );
}

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
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ComposerMode>("choose");

  function pick(action: StarterAction) {
    setMode(action);
    onStarter?.(action);
  }

  function backToChoose() {
    setMode("choose");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <p className="text-xs text-foreground/55">Merchant setup</p>
        <div className="flex items-center gap-2">
          {walletAuthenticated && merchantAddress ? (
            <span
              className="rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-[11px] text-foreground/80"
              title={merchantAddress}
            >
              {shortAddress(merchantAddress)} · Fuji
            </span>
          ) : null}
          {walletAuthenticated ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onConnectWallet}
              className="h-8 gap-1.5 text-xs"
            >
              <Wallet className="size-3.5" />
              Re-auth MetaMask
            </Button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-4 py-4">
        <div className="flex flex-col gap-4">
          {lines.map((line, index) => (
            <div key={index} className="text-sm leading-relaxed">
              <p className="whitespace-pre-wrap">
                <span className="font-medium text-foreground">
                  {line.role === "aisle" ? "aisle" : "you"}:
                </span>{" "}
                <span className="text-foreground/80">{line.text}</span>
                {line.llm ? (
                  <span className="text-foreground/45"> · {line.llm}</span>
                ) : null}
              </p>
              {mode === "choose" && index === 0 && line.role === "aisle" ? (
                <div className="mt-3">
                  <ChoiceButtons busy={busy} onPick={pick} compact />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </ScrollArea>
      {belowMessages}

      <div className="shrink-0 border-t border-border bg-background/90 p-4">
        {mode === "choose" ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-foreground/55">
              Choose how you want to add products
            </p>
            <ChoiceButtons busy={busy} onPick={pick} />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                className="h-8 gap-1.5 px-2 text-xs text-foreground/70"
                onClick={backToChoose}
              >
                <ArrowLeft className="size-3.5" />
                Back
              </Button>
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
              <>
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder='e.g. "phone store with 5 iPhones and 5 Samsungs"'
                  rows={3}
                  className="resize-none"
                  autoFocus
                />
                <Button type="submit" disabled={busy || !message.trim()}>
                  {busy ? "Working…" : "Send"}
                </Button>
              </>
            ) : null}

            {mode === "import" ? (
              <>
                <p className="text-xs text-foreground/55">
                  CSV columns: title, description, quantity, price. Quote any
                  description that contains commas.
                </p>
                <Button
                  type="button"
                  disabled={busy}
                  className="w-fit gap-2"
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip className="size-4" />
                  {busy ? "Uploading…" : "Choose CSV file"}
                </Button>
              </>
            ) : null}

            {mode === "url" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={storeUrl ?? ""}
                  onChange={(event) => setStoreUrl?.(event.target.value)}
                  placeholder="Shopify store URL… e.g. your-store.myshopify.com"
                  disabled={busy}
                  className="text-xs"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    if ((storeUrl ?? "").trim()) onImportUrl?.();
                  }}
                />
                <Button
                  type="button"
                  disabled={busy || !(storeUrl ?? "").trim()}
                  className="shrink-0"
                  onClick={() => onImportUrl?.()}
                >
                  {busy ? "Importing…" : "Import URL"}
                </Button>
              </div>
            ) : null}

            {mode === "wallet" ? (
              <div className="flex flex-col gap-3 rounded-md border border-dashed border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-foreground/55">
                  {walletAuthenticated
                    ? `Signed in as ${shortAddress(merchantAddress ?? "")}. You can re-auth or go back to add products.`
                    : "Approve connect in MetaMask, switch to Avalanche Fuji if asked, then sign — no funds move. That address becomes your x402 payTo."}
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  className="shrink-0 gap-1.5"
                  onClick={onConnectWallet}
                >
                  <Wallet className="size-3.5" />
                  {walletAuthenticated
                    ? "Re-auth MetaMask"
                    : "Sign in with MetaMask"}
                </Button>
              </div>
            ) : null}

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.tsv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFile(file);
                event.target.value = "";
              }}
            />
          </form>
        )}
      </div>
    </div>
  );
}

export function PriceDraftForm({
  draft,
  prices,
  setPrices,
  quantities,
  setQuantities,
  busy,
  onSubmit,
  walletReady,
}: {
  draft: MerchantDraft;
  prices: string[];
  setPrices: (prices: string[]) => void;
  quantities: string[];
  setQuantities: (quantities: string[]) => void;
  busy: boolean;
  onSubmit: () => void;
  walletReady?: boolean;
}) {
  const allPriced = draft.lines.every((_, i) => String(prices[i] ?? "").trim());
  const allQtyOk = draft.lines.every((_, i) => {
    const q = Number(String(quantities[i] ?? "").trim());
    return Number.isFinite(q) && q > 0;
  });
  const hasSuggestions = draft.lines.some((line) => Boolean(line.price));
  return (
    <div className="shrink-0 border-t border-border bg-muted/40 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/55">
        {hasSuggestions
          ? `Confirm or edit qty + ${draft.lines.length === 1 ? "price" : "prices"} (XSGD)`
          : `Set qty + ${draft.lines.length === 1 ? "price" : "prices"} (XSGD)`}
      </p>
      {!walletReady ? (
        <p className="mt-1 text-xs text-foreground/50">
          Sign in with MetaMask before publishing — we verify ownership via a
          signature (Avalanche Fuji).
        </p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        {draft.lines.map((line, index) => (
          <div
            key={`${line.title}-${index}`}
            className="grid grid-cols-[4.5rem_1fr_7rem] items-center gap-3"
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
              aria-label={`Quantity for ${line.title}`}
            />
            <p className="truncate text-sm text-foreground/85" title={line.title}>
              {line.title}
            </p>
            <Input
              inputMode="decimal"
              placeholder="0.00"
              value={prices[index] ?? ""}
              onChange={(event) => {
                const next = [...prices];
                next[index] = event.target.value;
                setPrices(next);
              }}
              aria-label={`Price for ${line.title}`}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        className="mt-3"
        disabled={busy || !allPriced || !allQtyOk}
        onClick={onSubmit}
      >
        {busy
          ? walletReady
            ? "Publishing…"
            : "Opening MetaMask…"
          : walletReady
            ? hasSuggestions
              ? "Confirm & publish"
              : "Submit prices"
            : "Sign in with MetaMask & publish"}
      </Button>
    </div>
  );
}
