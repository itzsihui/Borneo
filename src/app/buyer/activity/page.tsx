"use client";

import { useEffect, useState } from "react";
import { TransactionHistory } from "../_components/transaction-history";
import { readBuyerAccount, type SpendEvent } from "@/lib/buyer-account";

export default function BuyerActivityPage() {
  const [events, setEvents] = useState<SpendEvent[]>([]);

  useEffect(() => {
    setEvents(readBuyerAccount()?.ledger ?? []);
  }, []);

  const total = events.reduce((sum, e) => sum + e.amount, 0);
  const visa = events.filter((e) => e.rail === "straitsx-card").length;
  const x402 = events.filter((e) => e.rail === "x402").length;

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-2 max-w-[58ch] text-sm text-foreground/70">
          Transaction history for this demo buyer. USDC payments include a
          Basescan link; Visa shows the scoped card mandate used at checkout.
        </p>
      </div>

      {events.length > 0 ? (
        <p className="font-mono text-xs text-muted-foreground">
          {events.length} purchase{events.length === 1 ? "" : "s"} ·{" "}
          {total.toFixed(2)} total · {x402} x402 · {visa} Visa
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-background p-5">
        <TransactionHistory events={events} />
      </section>
    </main>
  );
}
