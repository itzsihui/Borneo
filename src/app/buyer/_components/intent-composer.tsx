"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FASHION_CHIPS } from "../_lib/fashion-prompts";

export function IntentComposer({
  value,
  onChange,
  onSubmit,
  busy,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim() || busy || disabled) return;
    onSubmit();
  }

  return (
    <section className="flex flex-col border border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold tracking-tight">
          What are you looking for?
        </h2>
        <p className="mt-1 text-xs text-foreground/55">
          Fashion intent — the agent decomposes this live before searching.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {FASHION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy || disabled}
              onClick={() => onChange(chip)}
              className={cn(
                "rounded-full border border-border px-3 py-1 text-xs transition-colors",
                value === chip
                  ? "border-foreground bg-foreground text-background"
                  : "text-foreground/70 hover:bg-muted",
              )}
            >
              {chip}
            </button>
          ))}
        </div>

        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          disabled={busy || disabled}
          placeholder="e.g. Buy the hackathon tee"
          className="min-h-[88px] resize-none"
        />

        <Button
          type="submit"
          disabled={busy || disabled || !value.trim()}
          className="w-fit"
        >
          {busy ? "Searching…" : "Start search"}
        </Button>
      </form>
    </section>
  );
}
