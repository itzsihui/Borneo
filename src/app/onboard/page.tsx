"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import type { ChainStep } from "@/components/agent/chain-of-thought";
import {
  MerchantChat,
  PriceDraftForm,
  type ChatLine,
  type StarterAction,
} from "@/components/onboard/merchant-chat";
import {
  DiscoveryPane,
  EndpointLab,
} from "@/components/onboard/discovery-panes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMerchantAuth } from "@/app/merchant/_components/merchant-auth-provider";
import {
  normalizeDraft,
  type MerchantDraft,
} from "@/lib/inventory/parse";
import { isFashionLineComplete } from "@/lib/inventory/fashion";
import {
  DEFAULT_ONBOARD_LINES,
  DEFAULT_ONBOARD_MESSAGE,
  defaultBuyerPrompt,
  readDemoSession,
  storeRefFromPublish,
  writeDemoSession,
} from "@/lib/demo-session";
import {
  authenticateWithMetaMask,
  onMetaMaskAccountsChanged,
  shortAddress,
  type MerchantAuthProof,
} from "@/lib/wallet/ethereum";

function buildMerchantSteps({
  draft,
  merchantAuth,
  visaReady,
  slug,
  busy,
}: {
  draft: MerchantDraft | null;
  merchantAuth: MerchantAuthProof | null;
  visaReady: boolean;
  slug: string | null;
  busy: boolean;
}): ChainStep[] {
  const hasDraft = Boolean(draft?.lines.length);
  const fashionReady =
    hasDraft && Boolean(draft?.lines.every((l) => isFashionLineComplete(l)));
  const priced =
    hasDraft &&
    Boolean(draft?.lines.every((l) => String(l.price ?? "").trim()));
  const wallet = Boolean(merchantAuth);
  const live = Boolean(slug);

  const inventoryStatus: ChainStep["status"] = live
    ? "complete"
    : hasDraft
      ? "complete"
      : busy
        ? "active"
        : "active";

  const variantStatus: ChainStep["status"] = live
    ? "complete"
    : !hasDraft
      ? "pending"
      : fashionReady
        ? "complete"
        : "active";

  const priceStatus: ChainStep["status"] = live
    ? "complete"
    : !hasDraft || !fashionReady
      ? "pending"
      : priced
        ? "complete"
        : "active";

  const walletStatus: ChainStep["status"] = live
    ? "complete"
    : wallet
      ? "complete"
      : hasDraft
        ? "active"
        : "pending";

  const visaStatus: ChainStep["status"] = live
    ? "complete"
    : visaReady
      ? "complete"
      : wallet
        ? "active"
        : "pending";

  const publishStatus: ChainStep["status"] = live
    ? "complete"
    : busy && hasDraft && fashionReady && priced && wallet && visaReady
      ? "active"
      : "pending";

  const liveStatus: ChainStep["status"] = live ? "complete" : "pending";

  return [
    {
      id: "inventory",
      title: "Add fashion inventory",
      status: inventoryStatus,
      description: hasDraft
        ? `${draft!.lines.length} product(s) drafted`
        : "Describe stock, import CSV, or paste a Shopify URL",
      bullets: hasDraft
        ? draft!.lines.slice(0, 4).map((l, i) => {
            const style = l.fashion?.style || l.title;
            const color = l.fashion?.attrs?.color;
            const size =
              l.fashion?.attrs?.size ||
              (l.fashion?.attrs?.waist && l.fashion?.attrs?.inseam
                ? `${l.fashion.attrs.waist}x${l.fashion.attrs.inseam}`
                : undefined);
            const bits = [style, color, size].filter(Boolean).join(" / ");
            return `${l.quantity}× ${bits || l.title} (#${i + 1})`;
          })
        : undefined,
    },
    {
      id: "variants",
      title: "Complete sizes & attributes",
      status: variantStatus,
      description: fashionReady
        ? "Fashion details complete"
        : hasDraft
          ? "Fill subcategory, size, color (etc.) in the form"
          : undefined,
    },
    {
      id: "prices",
      title: "Confirm USDC prices",
      status: priceStatus,
      description: priced
        ? "Prices ready for publish"
        : hasDraft
          ? "Edit qty + price in the chat panel"
          : undefined,
    },
    {
      id: "wallet",
      title: "Crypto receiving wallet",
      status: walletStatus,
      description: wallet
        ? `USDC / x402 → ${shortAddress(merchantAuth!.address)}`
        : "MetaMask bind — receiving address for x402",
    },
    {
      id: "visa",
      title: "Visa fiat receiving account",
      status: visaStatus,
      description: visaReady
        ? "Visa rail can settle to your account"
        : "Account label + receive id for card checkout",
    },
    {
      id: "publish",
      title: "Publish agent storefront",
      status: publishStatus,
      description: live
        ? `Live at /s/${slug}`
        : "Requires both receive rails + prices",
      links: live
        ? [
            { label: `/s/${slug}/llms.txt`, href: `/s/${slug}/llms.txt` },
            {
              label: `/s/${slug}/catalog.json`,
              href: `/s/${slug}/catalog.json`,
            },
          ]
        : undefined,
    },
    {
      id: "market",
      title: "Listed on Market",
      status: liveStatus,
      description: live
        ? "Buying agents can discover this store"
        : "Appears on /market after publish",
      links: live
        ? [
            { label: "Open Market", href: "/market" },
            { label: "Shop", href: "/buyer" },
          ]
        : undefined,
    },
  ];
}

export default function OnboardPage() {
  const router = useRouter();
  const merchant = useMerchantAuth();
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState(DEFAULT_ONBOARD_MESSAGE);
  const [lines, setLines] = useState<ChatLine[]>(DEFAULT_ONBOARD_LINES);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<MerchantDraft | null>(null);
  const [prices, setPrices] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<string[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [merchantAuth, setMerchantAuth] = useState<MerchantAuthProof | null>(
    null,
  );
  const [storeUrl, setStoreUrl] = useState("");
  const [visaLabel, setVisaLabel] = useState("");
  const [visaReceiveId, setVisaReceiveId] = useState("");
  const [visaNote, setVisaNote] = useState("");
  const [visaBusy, setVisaBusy] = useState(false);
  const [visaError, setVisaError] = useState<string | null>(null);
  const [visaReceiveLocal, setVisaReceiveLocal] = useState<{
    accountLabel: string;
    receiveId?: string;
    settlementNote?: string;
  } | null>(null);

  const merchantAddress = merchantAuth?.address ?? null;
  const visaReady = Boolean(
    visaReceiveLocal?.accountLabel ||
      merchant.profile?.visaReceive?.accountLabel,
  );
  const visaReceive =
    visaReceiveLocal || merchant.profile?.visaReceive || undefined;

  const steps = useMemo(
    () =>
      buildMerchantSteps({
        draft,
        merchantAuth,
        visaReady,
        slug,
        busy,
      }),
    [draft, merchantAuth, visaReady, slug, busy],
  );

  const showReasoning =
    busy ||
    Boolean(draft?.lines.length) ||
    Boolean(slug) ||
    Boolean(merchantAuth) ||
    visaReady;

  useEffect(() => {
    if (!merchant.ready) return;
    if (merchant.configured && !merchant.user) {
      router.replace("/merchant/login");
    }
  }, [merchant.ready, merchant.configured, merchant.user, router]);

  useEffect(() => {
    if (!merchant.profile?.visaReceive) return;
    setVisaLabel(merchant.profile.visaReceive.accountLabel || "");
    setVisaReceiveId(merchant.profile.visaReceive.receiveId || "");
    setVisaNote(merchant.profile.visaReceive.settlementNote || "");
    setVisaReceiveLocal(merchant.profile.visaReceive);
  }, [merchant.profile?.visaReceive]);

  useEffect(() => {
    if (!merchant.ready || hydrated) return;
    const cloud = merchant.profile?.onboardingDraft;
    if (cloud?.draft) {
      const nextDraft = normalizeDraft(cloud.draft as MerchantDraft);
      if (nextDraft) {
        setDraft(nextDraft);
        setPrices(
          cloud.prices?.length
            ? cloud.prices
            : nextDraft.lines.map((l) => l.price ?? ""),
        );
        setQuantities(
          cloud.quantities?.length
            ? cloud.quantities
            : nextDraft.lines.map((l) => String(l.quantity)),
        );
        setHydrated(true);
        return;
      }
    }
    const session = readDemoSession();
    if (session.onboard) {
      setMessage(session.onboard.message || DEFAULT_ONBOARD_MESSAGE);
      setLines(
        session.onboard.lines?.length
          ? session.onboard.lines
          : DEFAULT_ONBOARD_LINES,
      );
      setDraft(normalizeDraft(session.onboard.draft));
      const nextDraft = normalizeDraft(session.onboard.draft);
      setPrices(
        session.onboard.prices?.length
          ? session.onboard.prices
          : nextDraft?.lines.map((l) => l.price ?? "") ?? [],
      );
      setQuantities(
        session.onboard.quantities?.length
          ? session.onboard.quantities
          : nextDraft?.lines.map((l) => String(l.quantity)) ?? [],
      );
      setSlug(session.onboard.slug);
      if (session.onboard.slug) setRefreshKey((k) => k + 1);
      const saved = session.onboard.merchantAuth as MerchantAuthProof | null;
      if (saved?.address && saved.signature && saved.message) {
        setMerchantAuth(saved);
      }
    }
    setHydrated(true);
  }, [merchant.ready, merchant.profile?.onboardingDraft, hydrated]);

  useEffect(() => {
    return onMetaMaskAccountsChanged((accounts) => {
      if (!merchantAuth) return;
      if (!accounts.includes(merchantAuth.address)) {
        setMerchantAuth(null);
        setLines((prev) => [
          ...prev,
          {
            role: "borneo",
            text: "MetaMask account changed — bind your crypto receiving wallet again.",
          },
        ]);
      }
    });
  }, [merchantAuth]);

  useEffect(() => {
    if (!hydrated) return;
    writeDemoSession({
      onboard: {
        message,
        lines,
        draft,
        prices,
        quantities,
        slug,
        merchantAddress,
        merchantAuth,
      },
    });
  }, [
    hydrated,
    message,
    lines,
    draft,
    prices,
    quantities,
    slug,
    merchantAddress,
    merchantAuth,
  ]);

  useEffect(() => {
    if (!hydrated || !merchant.user || !draft) return;
    const handle = window.setTimeout(() => {
      void merchant.saveOnboardingDraft({
        draft,
        prices,
        quantities,
        status: draft.lines.every((l) => isFashionLineComplete(l))
          ? "need_price"
          : "need_variants",
      });
    }, 600);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- merchant methods are stable enough
  }, [hydrated, merchant.user, draft, prices, quantities]);

  async function callAgent(
    payload: {
      message?: string;
      csv?: string;
      url?: string;
      draft?: MerchantDraft | null;
      prices?: string[];
    },
    authOverride?: MerchantAuthProof | null,
  ) {
    setBusy(true);
    try {
      const res = await fetch("/api/merchant-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: payload.message,
          csv: payload.csv,
          url: payload.url,
          draft: payload.draft,
          prices: payload.prices,
          merchantAuth: authOverride ?? merchantAuth,
          ownerUid: merchant.user?.uid,
          merchantDisplayName:
            merchant.profile?.displayName || merchant.user?.displayName || undefined,
          visaReceive,
        }),
      });
      const raw = await res.text();
      let data: {
        reply: string;
        store: {
          slug: string;
          name?: string;
          skus?: Array<{ title: string }>;
        } | null;
        status?:
          | "published"
          | "need_price"
          | "need_variants"
          | "need_wallet"
          | "clarify";
        draft?: MerchantDraft | null;
        llm?: string;
      };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        throw new Error(
          raw.trim()
            ? `Merchant agent returned non-JSON (${res.status})`
            : `Merchant agent returned empty response (${res.status})`,
        );
      }
      if (!data.reply) {
        data.reply = "No reply from merchant agent.";
      }
      const nextDraft =
        data.status === "need_price" ||
        data.status === "need_variants" ||
        data.status === "need_wallet"
          ? normalizeDraft(data.draft)
          : null;
      setDraft(nextDraft);
      if (nextDraft) {
        setPrices(
          nextDraft.lines.map((line, i) =>
            String(line.price || prices[i] || ""),
          ),
        );
        setQuantities(
          nextDraft.lines.map((line, i) =>
            String(quantities[i] || line.quantity || "100"),
          ),
        );
        void merchant.saveOnboardingDraft({
          draft: nextDraft,
          prices: nextDraft.lines.map((line, i) =>
            String(line.price || prices[i] || ""),
          ),
          quantities: nextDraft.lines.map((line, i) =>
            String(quantities[i] || line.quantity || "100"),
          ),
          status:
            data.status === "need_wallet"
              ? "need_wallet"
              : data.status === "need_variants"
                ? "need_variants"
                : "need_price",
          ask: data.reply,
        });
      } else {
        setPrices([]);
        setQuantities([]);
      }
      if (data.store?.slug) {
        setSlug(data.store.slug);
        setRefreshKey((k) => k + 1);
        await merchant.recordStoreSlug(data.store.slug);
        await merchant.clearOnboardingDraft();
        const ref = storeRefFromPublish(data.store);
        writeDemoSession({
          lastStore: ref,
          buyer: {
            input: defaultBuyerPrompt(ref),
            lines: readDemoSession().buyer?.lines ?? [
              {
                role: "agent",
                text: "Buyer agent ready. I will read llms.txt / agent.json, not HTML.",
              },
            ],
          },
        });
      }
      setLines((prev) => [
        ...prev,
        {
          role: "borneo",
          text: data.reply,
          llm: data.llm,
        },
      ]);
    } catch (error) {
      setLines((prev) => [
        ...prev,
        {
          role: "borneo",
          text:
            error instanceof Error
              ? error.message
              : "Merchant agent request failed",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function applyAuth(proof: MerchantAuthProof) {
    setMerchantAuth(proof);
    try {
      await merchant.bindWallet(proof.address);
    } catch {
      /* profile bind best-effort; publish still uses signed proof */
    }

    const nextPrices = draft
      ? draft.lines.map((l, i) => prices[i] || l.price || "")
      : [];
    const canPublish =
      Boolean(draft) &&
      nextPrices.every((p) => String(p).trim()) &&
      Boolean(visaReceive?.accountLabel);

    setLines((prev) => [
      ...prev,
      {
        role: "merchant",
        text: `Bound crypto receiving wallet ${shortAddress(proof.address)} (Base Sepolia)`,
      },
      ...(canPublish
        ? []
        : [
            {
              role: "borneo" as const,
              text: visaReceive?.accountLabel
                ? `Crypto receive is ${proof.address}. Describe products, import a CSV, or paste a Shopify URL when you're ready.`
                : `Crypto receive is ${proof.address}. Next: set up your Visa fiat receiving account below, then publish.`,
            },
          ]),
    ]);

    if (canPublish && draft) {
      const nextDraft: MerchantDraft = {
        ...draft,
        lines: draft.lines.map((l, i) => ({
          ...l,
          quantity: Math.max(
            1,
            Math.floor(Number(quantities[i]) || l.quantity || 100),
          ),
          price: nextPrices[i],
        })),
      };
      await callAgent(
        {
          draft: nextDraft,
          prices: nextPrices,
        },
        proof,
      );
    }
  }

  async function onSaveVisa(e: FormEvent) {
    e.preventDefault();
    if (!visaLabel.trim()) {
      setVisaError("Account label is required");
      return;
    }
    setVisaBusy(true);
    setVisaError(null);
    try {
      await merchant.bindVisa({
        accountLabel: visaLabel.trim(),
        receiveId: visaReceiveId.trim() || undefined,
        settlementNote: visaNote.trim() || undefined,
      });
      setVisaReceiveLocal({
        accountLabel: visaLabel.trim(),
        receiveId: visaReceiveId.trim() || undefined,
        settlementNote: visaNote.trim() || undefined,
      });
      setLines((prev) => [
        ...prev,
        {
          role: "merchant",
          text: `Visa receiving account: ${visaLabel.trim()}${visaReceiveId.trim() ? ` (${visaReceiveId.trim()})` : ""}`,
        },
        {
          role: "borneo",
          text: "Visa fiat receive saved. Publish when inventory, prices, and MetaMask are ready.",
        },
      ]);
    } catch (err) {
      setVisaError(
        err instanceof Error ? err.message : "Could not save Visa receive",
      );
    } finally {
      setVisaBusy(false);
    }
  }

  async function onConnectWallet() {
    try {
      const proof = await authenticateWithMetaMask();
      await applyAuth(proof);
    } catch (error) {
      setLines((prev) => [
        ...prev,
        {
          role: "borneo",
          text:
            error instanceof Error
              ? error.message
              : "Could not authenticate with MetaMask.",
        },
      ]);
    }
  }

  function onStarter(action: StarterAction) {
    if (action === "describe") {
      setMessage("");
      setLines((prev) => [
        ...prev,
        {
          role: "borneo",
          text: "Share a fashion description — e.g. “10 linen shirts, 8 tote bags, 6 sneakers” — and I'll draft the listing, then ask for USDC prices.",
        },
      ]);
      return;
    }
    if (action === "import") {
      setLines((prev) => [
        ...prev,
        {
          role: "borneo",
          text: "Choose a CSV with title, description, quantity, price. Quote any description that contains commas.",
        },
      ]);
      return;
    }
    if (action === "url") {
      setLines((prev) => [
        ...prev,
        {
          role: "borneo",
          text: "Paste a Shopify storefront URL. We’ll pull products, keep USD≈USDC suggestions, and ask you to confirm prices.",
        },
      ]);
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        role: "borneo",
        text: "Connect MetaMask to bind your crypto receiving wallet for USDC / x402. Approve the popup, switch to Base Sepolia if asked, then sign — no funds move.",
      },
    ]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    setLines((prev) => [...prev, { role: "merchant", text }]);
    setMessage("");
    await callAgent({ message: text, draft });
  }

  async function onFile(file: File) {
    const csv = await file.text();
    setDraft(null);
    setPrices([]);
    setQuantities([]);
    setLines((prev) => [
      ...prev,
      { role: "merchant", text: `Uploaded ${file.name}` },
    ]);
    await callAgent({ csv, draft: null });
  }

  async function onImportUrl() {
    const url = storeUrl.trim();
    if (!url) return;
    setDraft(null);
    setPrices([]);
    setQuantities([]);
    setLines((prev) => [
      ...prev,
      { role: "merchant", text: `Import store ${url}` },
    ]);
    await callAgent({ url, draft: null });
  }

  async function onSubmitPrices() {
    if (!draft) return;
    if (!visaReceive?.accountLabel) {
      setLines((prev) => [
        ...prev,
        {
          role: "borneo",
          text: "Save your Visa fiat receiving account above before publishing. Both crypto and Visa receive are required.",
        },
      ]);
      return;
    }
    const nextDraft: MerchantDraft = {
      ...draft,
      lines: draft.lines.map((line, i) => {
        const qty = Math.max(
          1,
          Math.floor(Number(quantities[i]) || line.quantity || 100),
        );
        return {
          ...line,
          quantity: qty,
        };
      }),
    };
    setDraft(nextDraft);
    setLines((prev) => [
      ...prev,
      {
        role: "merchant",
        text: nextDraft.lines
          .map((line, i) => `${line.quantity} ${line.title} @ ${prices[i]} USDC`)
          .join(", "),
      },
    ]);

    if (!merchantAuth) {
      let proof: MerchantAuthProof;
      try {
        setBusy(true);
        proof = await authenticateWithMetaMask();
        setMerchantAuth(proof);
        try {
          await merchant.bindWallet(proof.address);
        } catch {
          /* ignore */
        }
        setLines((prev) => [
          ...prev,
          {
            role: "merchant",
            text: `Bound crypto receiving wallet ${shortAddress(proof.address)} (Base Sepolia)`,
          },
        ]);
      } catch (error) {
        setBusy(false);
        setLines((prev) => [
          ...prev,
          {
            role: "borneo",
            text:
              error instanceof Error
                ? error.message
                : "Could not authenticate with MetaMask.",
          },
        ]);
        return;
      }
      await callAgent({ draft: nextDraft, prices }, proof);
      return;
    }

    await callAgent({ draft: nextDraft, prices });
  }

  if (!merchant.ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading merchant…</p>
      </div>
    );
  }

  if (merchant.configured && !merchant.user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  if (!merchant.configured) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-6 pt-24">
          <p className="text-sm text-muted-foreground">
            Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* keys, then
            create a merchant account to open a store.
          </p>
          <Link
            href="/merchant/signup"
            className="mt-4 inline-block text-sm underline"
          >
            Merchant signup
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <SiteHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-16">
        <main className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-2 px-3 py-3 sm:px-6">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-[11px] text-foreground/45">
              Signed in as{" "}
              <span className="text-foreground/70">
                {merchant.profile?.displayName || merchant.user?.email}
              </span>
              {slug ? (
                <>
                  {" "}
                  · Live{" "}
                  <span className="font-mono text-foreground/70">/s/{slug}</span>
                </>
              ) : null}
            </p>
            <button
              type="button"
              className="text-[11px] text-foreground/50 underline-offset-2 hover:underline"
              onClick={() => void merchant.signOut().then(() => router.push("/merchant/login"))}
            >
              Sign out
            </button>
          </div>

          <form
            onSubmit={(e) => void onSaveVisa(e)}
            className="shrink-0 rounded-md border border-border bg-muted/30 px-3 py-3"
          >
            <p className="text-xs font-medium text-foreground">
              Visa fiat receiving account
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/55">
              Required with MetaMask for a complete merchant. Demo-safe if live
              StraitsX is unset — saved on your profile and stamped onto each
              store.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <Input
                value={visaLabel}
                onChange={(e) => setVisaLabel(e.target.value)}
                placeholder="Account label"
                className="h-9 text-sm"
                required
              />
              <Input
                value={visaReceiveId}
                onChange={(e) => setVisaReceiveId(e.target.value)}
                placeholder="Receive id (optional)"
                className="h-9 text-sm"
              />
              <Input
                value={visaNote}
                onChange={(e) => setVisaNote(e.target.value)}
                placeholder="SGD settlement note (optional)"
                className="h-9 text-sm"
              />
            </div>
            {visaError ? (
              <p className="mt-2 text-xs text-destructive">{visaError}</p>
            ) : null}
            <div className="mt-2 flex items-center gap-3">
              <Button
                type="submit"
                size="sm"
                disabled={visaBusy}
                className="h-8"
              >
                {visaBusy
                  ? "Saving…"
                  : visaReady
                    ? "Update Visa receive"
                    : "Save Visa receive"}
              </Button>
              {visaReady ? (
                <span className="text-[11px] text-foreground/55">
                  Saved: {merchant.profile?.visaReceive?.accountLabel}
                </span>
              ) : null}
            </div>
          </form>

          <MerchantChat
            lines={lines}
            message={message}
            setMessage={setMessage}
            busy={busy}
            onSubmit={onSubmit}
            onFile={onFile}
            storeUrl={storeUrl}
            setStoreUrl={setStoreUrl}
            onImportUrl={onImportUrl}
            merchantAddress={merchantAddress}
            walletAuthenticated={Boolean(merchantAuth)}
            onConnectWallet={onConnectWallet}
            onStarter={onStarter}
            steps={steps}
            showReasoning={showReasoning}
            belowMessages={
              <>
                {draft ? (
                  <PriceDraftForm
                    draft={draft}
                    setDraft={setDraft}
                    prices={prices}
                    setPrices={setPrices}
                    quantities={quantities}
                    setQuantities={setQuantities}
                    busy={busy}
                    onSubmit={onSubmitPrices}
                    walletReady={Boolean(merchantAuth) && visaReady}
                  />
                ) : null}
                {slug ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    <DiscoveryPane
                      slug={slug}
                      refreshKey={refreshKey}
                      className="min-h-[220px]"
                    />
                    <EndpointLab
                      slug={slug}
                      refreshKey={refreshKey}
                      className="min-h-[220px]"
                    />
                  </div>
                ) : null}
              </>
            }
          />
        </main>
      </div>
    </div>
  );
}
