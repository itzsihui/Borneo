"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { TransactionHistory } from "../_components/transaction-history";
import {
  clearBuyerAccount,
  formatPolicySummary,
  readBuyerAccount,
  type BuyerAccount,
} from "@/lib/buyer-account";
import { cn } from "@/lib/utils";

export default function BuyerProfilePage() {
  const router = useRouter();
  const [account, setAccount] = useState<BuyerAccount | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const reload = useCallback(() => {
    setAccount(readBuyerAccount());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function startFresh() {
    clearBuyerAccount();
    setConfirmReset(false);
    router.replace("/buyer/onboard");
  }

  if (!account) {
    return (
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <p className="text-sm text-muted-foreground">No buyer profile yet.</p>
      </main>
    );
  }

  const limits = formatPolicySummary(account.policy);
  const onboarded = new Date(account.onboardedAt).toLocaleString();
  const recent = account.ledger.slice(-5);

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-2 max-w-[58ch] text-sm text-foreground/70">
          Demo buyer account for this browser. Card details appear after your
          first Visa checkout.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Identity
          </p>
          <p className="mt-3 text-xl font-semibold tracking-tight">
            {account.displayName}
          </p>
          <p className="mt-1 text-sm text-foreground/60">
            Onboarded {onboarded}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Visa card
          </p>
          {account.card.issued ? (
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-medium">Scoped card issued (last checkout)</p>
              {account.card.truncatedPan ? (
                <p className="font-mono text-foreground/70">
                  {account.card.truncatedPan}
                </p>
              ) : null}
              {account.card.source ? (
                <p className="text-foreground/55">
                  Source: {account.card.source}
                </p>
              ) : null}
              {account.card.lastIssuedAt ? (
                <p className="text-foreground/55">
                  Last issued{" "}
                  {new Date(account.card.lastIssuedAt).toLocaleString()}
                </p>
              ) : null}
              <p className="pt-2 text-xs text-muted-foreground">
                Mandates stay single-use and burn after payment.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-foreground/70">
              Not set up yet. A scoped Visa card is issued the first time you
              pay with Visa at checkout.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Active limits
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-foreground/80">
              {limits.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <Link
            href="/buyer/governance"
            className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3")}
          >
            Edit governance
          </Link>
        </div>
        {account.rules.length > 0 ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs font-medium text-foreground/50">
              Approved natural-language rules
            </p>
            <ul className="mt-2 space-y-2">
              {account.rules
                .slice()
                .reverse()
                .slice(0, 5)
                .map((rule) => (
                  <li
                    key={rule.id}
                    className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm"
                  >
                    <p className="text-foreground/85">{rule.summary}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      “{rule.sourceText}”
                    </p>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Recent activity
          </p>
          <Link
            href="/buyer/activity"
            className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3")}
          >
            View all
          </Link>
        </div>
        <div className="mt-4">
          <TransactionHistory
            events={recent}
            emptyHint="No purchases yet. Completed checkouts show up under Activity."
          />
        </div>
      </section>

      <section className="rounded-lg border border-destructive/25 bg-destructive/5 p-5">
        <p className="font-medium text-foreground">Start fresh</p>
        <p className="mt-1 max-w-[58ch] text-sm text-foreground/70">
          Clears this buyer profile, spend ledger, and shop chat session. Merchant
          store data is not touched.
        </p>
        {!confirmReset ? (
          <Button
            type="button"
            variant="destructive"
            className="mt-4 h-9 px-3"
            onClick={() => setConfirmReset(true)}
          >
            Start fresh
          </Button>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <p className="text-sm text-destructive">
              Reset everything for this buyer?
            </p>
            <Button
              type="button"
              variant="destructive"
              className="h-9 px-3"
              onClick={startFresh}
            >
              Confirm reset
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3"
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
