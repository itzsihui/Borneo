"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import type { Order, StoreRecord } from "@/lib/store/types";

export default function DashboardPage() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [aws, setAws] = useState<{
    table: string | null;
    protocolBase: string | null;
    region: string | null;
  } | null>(null);

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

  const store = stores[0];

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
            <span>Inventory</span>
            <Link
              href="/s/hackathon-shirts/llms.txt"
              className="text-primary hover:underline"
            >
              llms.txt
            </Link>
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Orders
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {store
              ? `${store.name} · ${store.skus.length} SKUs`
              : "No store yet"}
            {orders.length > 0
              ? ` · ${orders.filter((o) => o.rail === "x402").length} x402 · ${orders.filter((o) => o.rail === "straitsx-card").length} StraitsX card`
              : ""}
          </p>
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
                  <TableHead>Rail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Proof</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No agent checkouts yet. Run the handshake.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {order.rail === "straitsx-card"
                          ? "StraitsX card"
                          : "x402 Avalanche"}
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
                            Snowtrace
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
