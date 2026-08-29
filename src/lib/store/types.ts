export type Sku = {
  id: string;
  title: string;
  description: string;
  quantity: number;
  price: string;
};

export type StoreRecord = {
  slug: string;
  name: string;
  merchantAddress: `0x${string}`;
  skus: Sku[];
  createdAt: string;
};

export type CardMandate = {
  spendCap: string;
  merchant: string;
  expiresAt: string;
  cardOpaqueId?: string;
  truncatedPan?: string;
  status?: "active" | "burned";
  source?: "straitsx-mcp" | "local-mandate";
  burnedAt?: string;
};

export type Order = {
  id: string;
  slug: string;
  skuId: string;
  quantity: number;
  amountAtomic: string;
  status: "pending" | "paid" | "failed";
  rail: "x402" | "straitsx-card";
  txHash?: string;
  explorerUrl?: string;
  mandate?: CardMandate;
  createdAt: string;
  paidAt?: string;
};

export type ProtocolEvent = {
  ts: number;
  status: number;
  method: string;
  path: string;
  store?: string;
  orderId?: string;
  message: string;
  rail?: Order["rail"];
};
