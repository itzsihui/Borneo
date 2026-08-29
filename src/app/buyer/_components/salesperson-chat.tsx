"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, MarketProductPick } from "../_lib/buyer-flow";
import { FASHION_STARTERS, FASHION_WELCOME } from "../_lib/fashion-prompts";

export function SalespersonChat({
  messages,
  suggestions,
  onSend,
  onProductClick,
  busy,
  disabled,
  className,
}: {
  messages: ChatMessage[];
  suggestions: string[];
  onSend: (text: string) => void;
  onProductClick: (product: MarketProductPick) => void;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chips =
    suggestions.length > 0 ? suggestions : [...FASHION_STARTERS];

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy || disabled) return;
    setDraft("");
    onSend(value);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit(draft);
  }

  const empty = messages.length <= 1;

  return (
    <section
      className={cn(
        "flex h-[min(640px,75vh)] min-h-[420px] flex-col overflow-hidden border border-border bg-background",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-background">
          <Sparkles className="size-3.5" />
        </span>
        <div>
          <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold tracking-tight">
            Fashion salesperson
          </h2>
          <p className="text-[11px] text-foreground/50">
            Clarifies intent · then searches the Borneo network
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
        >
          {empty ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center px-4 text-center">
              <p className="font-[family-name:var(--font-syne)] text-lg font-semibold tracking-tight">
                What are you looking for?
              </p>
              <p className="mt-2 max-w-[36ch] text-sm text-foreground/55">
                {FASHION_WELCOME}
              </p>
            </div>
          ) : null}

          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={`${msg.role}-${i}`} className="space-y-2">
                <div
                  className={cn(
                    "flex",
                    isUser ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      isUser
                        ? "bg-foreground text-background"
                        : "border border-border bg-muted/40 text-foreground",
                    )}
                  >
                    {msg.content}
                  </div>
                </div>

                {msg.products && msg.products.length > 0 ? (
                  <div className="grid max-w-[95%] gap-2 sm:grid-cols-2">
                    {msg.products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => onProductClick(product)}
                        className="flex overflow-hidden rounded-xl border border-border bg-background text-left transition-colors hover:border-foreground/50"
                      >
                        <div className="relative size-20 shrink-0 bg-muted sm:size-24">
                          <Image
                            src={product.imageUrl}
                            alt={product.title}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 p-2.5">
                          <p className="truncate text-sm font-medium">
                            {product.title}
                          </p>
                          <p className="truncate font-mono text-[10px] text-foreground/45">
                            /s/{product.storeSlug}
                          </p>
                          <p className="text-sm font-medium">
                            {product.price}{" "}
                            <span className="text-foreground/45">USDC</span>
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          {busy ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground/60">
                <Loader2 className="size-3.5 animate-spin" />
                Searching network…
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border p-3">
          {!busy && !disabled && chips.length > 0 ? (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => submit(chip)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-foreground/70 transition-colors hover:bg-muted"
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 rounded-2xl border border-border bg-muted/20 p-2 shadow-sm"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(draft);
                }
              }}
              rows={1}
              disabled={busy || disabled}
              placeholder="Describe what you want to wear…"
              className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-foreground/40"
            />
            <button
              type="submit"
              disabled={busy || disabled || !draft.trim()}
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
        </div>
      </div>
    </section>
  );
}
