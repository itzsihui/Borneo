import { sampleMarketStores } from "@/lib/market/sample-stores";
import type { StoreRepo } from "@/lib/store/types-repo";
import type { CardMandate, Order, StoreRecord } from "@/lib/store/types";

type Db = {
  stores: Map<string, StoreRecord>;
  orders: Map<string, Order>;
  mandates: Map<string, CardMandate>;
};

const globalForDb = globalThis as typeof globalThis & { __aisleDbV4?: Db };

function seed(): Db {
  const stores = new Map<string, StoreRecord>();
  const orders = new Map<string, Order>();
  const mandates = new Map<string, CardMandate>();
  for (const store of sampleMarketStores()) {
    stores.set(store.slug, store);
  }
  return { stores, orders, mandates };
}

function db(): Db {
  if (!globalForDb.__aisleDbV4) {
    globalForDb.__aisleDbV4 = seed();
  }
  const current = globalForDb.__aisleDbV4 as Db & {
    mandates?: Map<string, CardMandate>;
  };
  if (!current.mandates) {
    current.mandates = new Map();
  }
  return current;
}

export const memoryRepo: StoreRepo = {
  async listStores() {
    return [...db().stores.values()];
  },
  async getStore(slug) {
    return db().stores.get(slug) ?? null;
  },
  async putStore(store) {
    db().stores.set(store.slug, store);
    return store;
  },
  async listOrders(slug) {
    const all = [...db().orders.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    return slug ? all.filter((o) => o.slug === slug) : all;
  },
  async getOrder(id) {
    return db().orders.get(id) ?? null;
  },
  async putOrder(order) {
    db().orders.set(order.id, order);
    return order;
  },
  async getMandate(cardOpaqueId) {
    return db().mandates.get(cardOpaqueId) ?? null;
  },
  async putMandate(mandate) {
    if (mandate.cardOpaqueId) {
      db().mandates.set(mandate.cardOpaqueId, mandate);
    }
    return mandate;
  },
  async burnMandate(cardOpaqueId) {
    const existing = db().mandates.get(cardOpaqueId);
    if (!existing) return null;
    const burned: CardMandate = {
      ...existing,
      status: "burned",
      burnedAt: new Date().toISOString(),
    };
    db().mandates.set(cardOpaqueId, burned);
    return burned;
  },
};
