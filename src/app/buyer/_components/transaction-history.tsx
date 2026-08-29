"use client";

import Image from "next/image";
import { railLabel, type SpendEvent } from "@/lib/buyer-account";
import { cn } from "@/lib/utils";

function shortHash(url: string) {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").filter(Boolean).pop() || url;
    if (last.length <= 14) return last;
    return `${last.slice(0, 8)}…${last.slice(-4)}`;
  } catch {
    return url.length > 18 ? `${url.slice(0, 10)}…` : url;
  }
}

export function TransactionHistory({
  events,
  emptyHint = "No purchases yet. Shop something and it will show up here.",
  className,
}: {
  events: SpendEvent[];
  emptyHint?: string;
  className?: string;
}) {
  if (events.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>{emptyHint}</p>
    );
  }

  const rows = events.slice().reverse();

  return (
    <ul className={cn("divide-y divide-border", className)}>
      {rows.map((e) => (
        <li key={e.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
            {e.imageUrl ? (
              <Image
                src={e.imageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                SKU
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="truncate font-medium text-foreground">{e.title}</p>
              <p className="shrink-0 font-mono text-sm text-foreground">
                {e.amount}{" "}
                <span className="text-foreground/45">USDC</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/55">
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 font-medium",
                  e.rail === "x402"
                    ? "border-border bg-muted/50 text-foreground/70"
                    : "border-border bg-muted/50 text-foreground/70",
                )}
              >
                {railLabel(e.rail)}
              </span>
              {e.storeSlug ? (
                <span className="font-mono">/s/{e.storeSlug}</span>
              ) : e.storeName ? (
                <span>{e.storeName}</span>
              ) : null}
              <span aria-hidden>·</span>
              <time dateTime={e.at}>
                {new Date(e.at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {e.rail === "x402" && e.explorerUrl ? (
                <a
                  href={e.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-primary underline-offset-2 hover:underline"
                >
                  Basescan {shortHash(e.explorerUrl)}
                </a>
              ) : null}
              {e.rail === "straitsx-card" && e.cardOpaqueId ? (
                <span className="font-mono text-foreground/55">
                  card {e.cardOpaqueId.slice(0, 12)}
                  {e.cardOpaqueId.length > 12 ? "…" : ""}
                </span>
              ) : null}
              {e.rail === "straitsx-card" && e.truncatedPan ? (
                <span className="font-mono text-foreground/55">
                  {e.truncatedPan}
                </span>
              ) : null}
              {e.orderId ? (
                <span className="font-mono text-foreground/45">
                  order {e.orderId.slice(0, 8)}…
                </span>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
