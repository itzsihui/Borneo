"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMerchantAuth } from "@/app/merchant/_components/merchant-auth-provider";
import { shortAddress } from "@/lib/wallet/ethereum";
import type { Order, StoreRecord } from "@/lib/store/types";

export default function DashboardPage() {
  const router = useRouter();
  const merchant = useMerchantAuth();
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [aws, setAws] = useState<{
    table: string | null;
    protocolBase: string | null;
    region: string | null;
  } | null>(null);

  useEffect(() => {
    if (!merchant.ready) return;
    if (merchant.configured && !merchant.user) {
      router.replace("/merchant/login");
    }
  }, [merchant.ready, merchant.configured, merchant.user, router]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/ops");
      const data = (await res.json()) as {
        stores: StoreRecord[];
        orders: Order[];
        aws?: {
          table: string | null;
          protocolBase: string | null;
          region: string | null;
        };
      };
      setStores(data.stores);
      setOrders(data.orders);
      setAws(data.aws ?? null);
    };
    load();
    const timer = setInterval(load, 2500);
    return () => clearInterval(timer);
  }, []);

  const myStores = useMemo(() => {
    if (!merchant.user) return [];
    const uid = merchant.user.uid;
    const fromOwner = stores.filter((s) => s.ownerUid === uid);
    if (fromOwner.length > 0) return fromOwner;
    // Fallback: match profile storeSlugs (e.g. before ownerUid backfill)
    const slugs = new Set(merchant.profile?.storeSlugs ?? []);
    return stores.filter((s) => slugs.has(s.slug));
  }, [stores, merchant.user, merchant.profile?.storeSlugs]);

  const mySlugs = useMemo(
    () => new Set(myStores.map((s) => s.slug)),
    [myStores],
  );

  const myOrders = useMemo(
    () =>
      mySlugs.size > 0
        ? orders.filter((o) => mySlugs.has(o.slug))
        : [],
    [orders, mySlugs],
  );

  const store = myStores[0];
  const wallet =
    merchant.profile?.walletAddress || store?.merchantAddress || null;
  const visa = merchant.profile?.visaReceive || store?.visaReceive;

  if (!merchant.ready || (merchant.configured && !merchant.user)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-muted/40">
        <p className="text-sm text-muted-foreground">Loading ops…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-muted/40">
      <SiteHeader />
      <div className="flex min-h-[100dvh] pt-16">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-background p-6 md:block">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Merchant ops
          </p>
          <nav className="mt-4 flex flex-col gap-3 text-sm text-foreground/70">
            <span className="text-foreground">Orders</span>
            <span>Receiving</span>
            <Link href="/onboard" className="text-primary hover:underline">
              Publish store
            </Link>
            {store ? (
              <Link
                href={`/s/${store.slug}/llms.txt`}
                className="text-primary hover:underline"
              >
                llms.txt
              </Link>
            ) : null}
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Orders
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {merchant.profile?.displayName || merchant.user?.email}
                {myStores.length > 0
                  ? ` · ${myStores.length} store${myStores.length === 1 ? "" : "s"}`
                  : " · no stores yet"}
                {myOrders.length > 0
                  ? ` · ${myOrders.filter((o) => o.rail === "x402").length} x402 · ${myOrders.filter((o) => o.rail === "straitsx-card").length} Visa card`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-foreground/50 underline-offset-2 hover:underline"
              onClick={() =>
                void merchant.signOut().then(() => router.push("/merchant/login"))
              }
            >
              Sign out
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="border border-border bg-background px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Crypto receive
              </p>
              <p className="mt-1 font-mono text-sm">
                {wallet ? shortAddress(wallet) : "Not bound"}
              </p>
              {wallet ? (
                <p className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">
                  {wallet}
                </p>
              ) : (
                <Link
                  href="/onboard"
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  Bind MetaMask on onboard
                </Link>
              )}
            </div>
            <div className="border border-border bg-background px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Visa fiat receive
              </p>
              <p className="mt-1 text-sm">
                {visa?.accountLabel || "Not set up"}
              </p>
              {visa?.receiveId ? (
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {visa.receiveId}
                </p>
              ) : null}
              {visa?.settlementNote ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {visa.settlementNote}
                </p>
              ) : null}
            </div>
          </div>

          {myStores.length > 1 ? (
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {myStores.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/s/${s.slug}/llms.txt`}
                    className="text-foreground hover:underline"
                  >
                    {s.name}
                  </Link>{" "}
                  · /s/{s.slug} · {s.skus.length} SKUs
                </li>
              ))}
            </ul>
          ) : null}

          {aws && (aws.table || aws.protocolBase) ? (
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              AWS:{" "}
              {aws.protocolBase
                ? `API Gateway live`
                : "local Next routes"}
              {aws.table ? ` · DynamoDB ${aws.table}` : ""}
              {aws.region ? ` · ${aws.region}` : ""}
            </p>
          ) : null}
          <div className="mt-6 border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Rail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Proof</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      {myStores.length === 0
                        ? "No stores linked to this merchant yet. Publish from Sell / onboard."
                        : "No agent checkouts on your stores yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  myOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {order.slug}
                      </TableCell>
                      <TableCell>
                        {order.rail === "straitsx-card"
                          ? "Visa card"
                          : "x402 Base Sepolia"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "paid" ? "default" : "secondary"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.explorerUrl ? (
                          <a
                            className="text-primary underline-offset-4 hover:underline"
                            href={order.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Basescan
                          </a>
                        ) : order.mandate?.cardOpaqueId ? (
                          <span className="font-mono text-xs">
                            {order.mandate.cardOpaqueId}
                            {order.mandate.status === "burned"
                              ? " · burned"
                              : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </main>
      </div>
    </div>
  );
}
