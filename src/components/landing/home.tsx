"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChatCircleIcon,
  CreditCardIcon,
  IdentificationCardIcon,
  ShieldCheckIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";
import { LandingLenis } from "@/components/landing/lenis-root";
import { MetalHumanStage } from "@/components/landing/metal-human-stage";
import { Reveal } from "@/components/landing/reveal";
import { TracingBeam } from "@/components/ui/tracing-beam";
import { cn } from "@/lib/utils";

const SHIRT_IMG =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&h=1500&fit=crop&auto=format";
const CAP_IMG =
  "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=900&h=900&fit=crop&auto=format";

const TURNS = [
  { who: "You", text: "I want a t-shirt." },
  {
    who: "Agent",
    text: "Two apparel picks in stock. Shirt at 0.01 USDC, cap as a lighter option.",
  },
  { who: "You", text: "Compare them." },
  {
    who: "Agent",
    text: "Shirt is the official tee. Cap is lower profile. Both ready to buy.",
  },
  { who: "You", text: "Buy the shirt." },
  {
    who: "Agent",
    text: "Preview is ready. I will not pay until you authorize.",
  },
];

const MERCHANT = [
  {
    title: "Talk the catalog",
    body: "Type inventory, drop a CSV, or paste a store URL. No admin form marathon.",
    mono: "50 shirts at 0.01 USDC",
  },
  {
    title: "Connect what you already have",
    body: "Chat, file upload, or API pointer. Same path for a single shop or a multi-location retailer.",
    mono: "CSV, Shopify URL, or chat",
  },
  {
    title: "Go live for agents and people",
    body: "Published store sits on the market. Agents read the catalog as text, not HTML.",
    mono: "GET /s/{slug}/llms.txt",
  },
];

const SAFEGUARDS = [
  {
    icon: IdentificationCardIcon,
    title: "Identity first",
    body: "Merchants prove a wallet before a store publishes. Buyers stay in a named session.",
  },
  {
    icon: CreditCardIcon,
    title: "Transaction preview",
    body: "Item, merchant, amount, and rail are visible before anything moves.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Confirm, then pay",
    body: "The agent does not transact until you tap Authorize purchase.",
  },
  {
    icon: ChatCircleIcon,
    title: "Scoped mandate",
    body: "Visa rail: spend cap, merchant lock, short TTL, then the card burns.",
  },
];

const btnPrimary =
  "inline-flex h-11 items-center rounded-md bg-[var(--landing-jade)] px-5 text-sm font-medium text-[var(--landing-ink)] transition-opacity hover:opacity-90 active:scale-[0.98]";
const btnGhost =
  "inline-flex h-11 items-center rounded-md border border-[var(--landing-fog)]/25 bg-black/25 px-5 text-sm font-medium text-[var(--landing-fog)] backdrop-blur-sm transition-colors hover:border-[var(--landing-fog)]/45 hover:bg-black/40 active:scale-[0.98]";

export function LandingHome() {
  return (
    <LandingLenis>
      <div className="landing min-h-[100dvh]">
        <section className="landing-stage relative flex min-h-[100dvh] flex-col">
          <MetalHumanStage />
          <div
            className="landing-grain pointer-events-none absolute inset-0 z-[1]"
            aria-hidden
          />
          <div
            className="landing-vignette pointer-events-none absolute inset-0 z-[1]"
            aria-hidden
          />

          <header className="relative z-20 flex h-16 items-center justify-between px-6 md:px-10">
            <Link
              href="/"
              className="landing-brand text-lg text-[var(--landing-fog)]"
            >
              Borneo
            </Link>
            <nav className="flex items-center gap-5 text-sm text-[var(--landing-fog)]/70">
              <Link
                href="/market"
                className="hidden hover:text-[var(--landing-fog)] sm:inline"
              >
                Market
              </Link>
              <Link
                href="/onboard"
                className="hidden hover:text-[var(--landing-fog)] sm:inline"
              >
                Open a store
              </Link>
              <Link href="/buyer" className={cn(btnPrimary, "h-9 px-3")}>
                Shop fashion
              </Link>
            </nav>
          </header>

          <main className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-6 pb-20 pt-6 md:px-10">
            <div className="max-w-xl">
              <h1
                className={cn(
                  "landing-rise font-[family-name:var(--font-syne)] text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.12] tracking-tight text-[var(--landing-fog)] pb-1",
                )}
              >
                Discover, decide, pay in one chat.
              </h1>
              <p
                className={cn(
                  "landing-rise landing-rise-delay-1 mt-4 max-w-[36ch] text-base leading-relaxed text-[var(--landing-fog)]/70",
                )}
              >
                A fashion agent for shoppers. A chat storefront for any
                merchant. Visa never leaves the conversation.
              </p>
              <div
                className={cn(
                  "landing-rise landing-rise-delay-2 mt-9 flex flex-wrap gap-3",
                )}
              >
                <Link href="/buyer" className={btnPrimary}>
                  Shop fashion
                </Link>
                <Link href="/onboard" className={btnGhost}>
                  Open a store
                </Link>
              </div>
            </div>
          </main>
        </section>

        <section
          aria-label="The problem"
          className="relative overflow-hidden bg-[#050708] px-6 py-24 md:px-10 md:py-32"
        >
          <div
            className="landing-grain pointer-events-none absolute inset-0 opacity-30"
            aria-hidden
          />
          <Reveal className="relative mx-auto max-w-[1100px]">
            <h2 className="max-w-[16ch] font-[family-name:var(--font-syne)] text-[clamp(1.85rem,4.2vw,3rem)] font-semibold leading-[1.1] tracking-tight text-[var(--landing-fog)]">
              Shopping is still five screens and a redirect.
            </h2>
            <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-[var(--landing-fog)]/60">
              People bounce across tabs. SMEs cannot ship an AI store with
              trusted pay. Borneo is both doors: fashion agent, merchant chat,
              Visa in the conversation.
            </p>
          </Reveal>
        </section>

        <section
          aria-label="Fashion buyer agent"
          className="relative overflow-hidden border-t border-white/10 bg-[#060908] px-6 py-24 md:px-10 md:py-32"
        >
          <div
            className="landing-grain pointer-events-none absolute inset-0 opacity-25"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
            <Reveal>
              <ChatCircleIcon
                className="size-7 text-[var(--landing-jade)]"
                weight="regular"
                aria-hidden
              />
              <h2 className="mt-5 max-w-[14ch] font-[family-name:var(--font-syne)] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-[var(--landing-fog)]">
                Fashion agent. Discovers, compares, decides.
              </h2>
              <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-[var(--landing-fog)]/60">
                Trained on apparel, not a generic mall bot. It ranks live
                catalog SKUs, compares options, and only then asks how you want
                to pay.
              </p>
              <Link href="/buyer" className={cn(btnPrimary, "mt-8")}>
                Shop fashion
              </Link>
            </Reveal>

            <Reveal delay={0.1} className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
              <figure>
                <div className="relative aspect-[4/5] overflow-hidden rounded-md">
                  <Image
                    src={SHIRT_IMG}
                    alt="White crewneck t-shirt on a hanger"
                    fill
                    sizes="(max-width: 768px) 100vw, 32vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[#050708]/20" />
                </div>
                <figcaption className="mt-2 text-sm text-[var(--landing-fog)]/70">
                  VISA Hackathon Shirt
                </figcaption>
              </figure>
              <div className="flex flex-col gap-4">
                <figure>
                  <div className="relative aspect-square overflow-hidden rounded-md">
                    <Image
                      src={CAP_IMG}
                      alt="Structured baseball cap"
                      fill
                      sizes="(max-width: 768px) 100vw, 24vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-[#050708]/20" />
                  </div>
                  <figcaption className="mt-2 text-sm text-[var(--landing-fog)]/70">
                    Cap
                  </figcaption>
                </figure>
                <ol className="space-y-3 rounded-md border border-white/10 bg-black/30 p-4">
                  {TURNS.map((turn) => (
                    <li key={turn.text}>
                      <p className="text-xs text-[var(--landing-jade)]">
                        {turn.who}
                      </p>
                      <p className="mt-1 text-sm leading-snug text-[var(--landing-fog)]/80">
                        {turn.text}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </div>
        </section>

        <section
          aria-label="Merchant access"
          className="relative overflow-hidden border-t border-white/10 bg-[#050708] px-6 py-24 md:px-10 md:py-32"
        >
          <div
            className="landing-grain pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
          />
          <div className="relative mx-auto max-w-[1100px]">
            <Reveal className="mb-16 max-w-xl md:mb-20">
              <StorefrontIcon
                className="size-7 text-[var(--landing-jade)]"
                weight="regular"
                aria-hidden
              />
              <h2 className="mt-5 font-[family-name:var(--font-syne)] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-[var(--landing-fog)]">
                Any merchant goes live by talking.
              </h2>
              <p className="mt-3 max-w-[48ch] text-[var(--landing-fog)]/55">
                No-code for a single shop. The same chat for a retailer with
                many locations. Upload a catalog, connect an API, or just type.
              </p>
            </Reveal>

            <TracingBeam className="max-w-3xl px-2 md:px-4">
              <div className="ml-2 flex flex-col gap-20 pb-8 pt-2 md:ml-6 md:gap-24">
                {MERCHANT.map((step) => (
                  <article key={step.title}>
                    <h3 className="font-[family-name:var(--font-syne)] text-[clamp(1.4rem,3vw,2rem)] font-semibold leading-[1.12] tracking-tight text-[var(--landing-fog)]">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-[var(--landing-fog)]/55">
                      {step.body}
                    </p>
                    <pre className="landing-code-panel mt-6 overflow-x-auto rounded-md border border-white/10 bg-[oklch(0.12_0.015_160_/_0.85)] px-5 py-4 font-mono text-sm text-[var(--landing-ember)]">
                      <code>{step.mono}</code>
                    </pre>
                  </article>
                ))}
              </div>
            </TracingBeam>

            <Reveal className="mt-14">
              <Link href="/onboard" className={btnPrimary}>
                Open a store
              </Link>
            </Reveal>
          </div>
        </section>

        <section
          aria-label="In-conversation payment"
          className="relative border-t border-white/10 bg-[#070a0c] px-6 py-24 md:px-10 md:py-32"
        >
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.35 0.06 155 / 0.18), transparent 55%)",
            }}
          />
          <div className="relative mx-auto max-w-[1400px]">
            <Reveal>
              <CreditCardIcon
                className="size-7 text-[var(--landing-jade)]"
                weight="regular"
                aria-hidden
              />
              <h2 className="mt-5 max-w-[16ch] font-[family-name:var(--font-syne)] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-[var(--landing-fog)]">
                Visa checkout stays inside the chat.
              </h2>
              <p className="mt-3 max-w-[46ch] text-[var(--landing-fog)]/55">
                Simulated Visa flow for the hackathon. No redirect. No extra
                tab. The agent charges only after you confirm.
              </p>
            </Reveal>

            <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
              <Reveal className="rounded-md border border-[var(--landing-jade)]/35 bg-[oklch(0.18_0.04_160_/_0.45)] p-7 md:p-9">
                <p className="font-[family-name:var(--font-syne)] text-2xl font-semibold text-[var(--landing-fog)]">
                  Visa card, agent-authorized
                </p>
                <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-[var(--landing-fog)]/65">
                  Issue a spend-capped virtual card in the conversation, lock it
                  to the merchant, complete pay, then burn the mandate. Shoppers
                  never leave the chat.
                </p>
                <p className="mt-6 font-mono text-xs leading-relaxed text-[var(--landing-jade)]">
                  Spend cap, merchant lock, 15 min TTL, then burn.
                </p>
              </Reveal>
              <Reveal
                delay={0.1}
                className="rounded-md border border-white/10 bg-black/25 p-7 md:p-9"
              >
                <p className="font-[family-name:var(--font-syne)] text-xl font-semibold text-[var(--landing-fog)]">
                  USDC on Base Sepolia
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--landing-fog)]/55">
                  Second rail, same rule: HTTP 402, on-chain transfer, receipt.
                  Still in the conversation.
                </p>
                <p className="mt-6 font-mono text-xs text-[var(--landing-ember)]">
                  402 → transfer → 200
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        <section
          aria-label="Trust and consent"
          className="relative overflow-hidden border-t border-white/10 bg-[#060908] px-6 py-24 md:px-10 md:py-32"
        >
          <div
            className="landing-grain pointer-events-none absolute inset-0 opacity-30"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-16">
            <Reveal>
              <ShieldCheckIcon
                className="size-7 text-[var(--landing-jade)]"
                weight="regular"
                aria-hidden
              />
              <h2 className="mt-5 max-w-[14ch] font-[family-name:var(--font-syne)] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-[var(--landing-fog)]">
                The agent does not pay until you say so.
              </h2>
              <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-[var(--landing-fog)]/60">
                Every purchase opens a preview. You see the item, the merchant,
                the amount, and the rail. Cancel is always available. Authorize
                is the only path to a charge.
              </p>
              <ul className="mt-10 grid gap-8 sm:grid-cols-2">
                {SAFEGUARDS.map((item) => (
                  <li key={item.title} className="max-w-[32ch]">
                    <item.icon
                      className="size-5 text-[var(--landing-jade)]"
                      weight="regular"
                      aria-hidden
                    />
                    <p className="mt-3 font-[family-name:var(--font-syne)] text-lg font-medium text-[var(--landing-fog)]">
                      {item.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--landing-fog)]/55">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.12} className="lg:pt-16">
              <p className="font-[family-name:var(--font-syne)] text-lg font-medium text-[var(--landing-fog)]">
                What you confirm
              </p>
              <dl className="mt-6 space-y-4 text-sm">
                <div>
                  <dt className="text-[var(--landing-fog)]/45">Item</dt>
                  <dd className="mt-1 text-[var(--landing-fog)]">
                    VISA Hackathon Shirt
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--landing-fog)]/45">Merchant</dt>
                  <dd className="mt-1 font-mono text-xs text-[var(--landing-fog)]">
                    /s/hackathon-shirts
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--landing-fog)]/45">Amount</dt>
                  <dd className="mt-1 text-[var(--landing-fog)]">0.01 USDC</dd>
                </div>
                <div>
                  <dt className="text-[var(--landing-fog)]/45">Rail</dt>
                  <dd className="mt-1 text-[var(--landing-fog)]">
                    Visa, agent-authorized card
                  </dd>
                </div>
              </dl>
              <p className="mt-6 max-w-[36ch] text-[13px] leading-relaxed text-[var(--landing-fog)]/55">
                Spend cap at 0.01 USDC. Merchant locked. Mandate lasts about 15
                minutes, then burns. Confirm once in the agent.
              </p>
              <Link href="/buyer" className={cn(btnPrimary, "mt-8")}>
                Shop fashion
              </Link>
            </Reveal>
          </div>
        </section>

        <section
          aria-label="Architecture"
          className="relative border-t border-white/10 bg-[#050708] px-6 py-20 md:px-10"
        >
          <Reveal className="mx-auto max-w-[1400px]">
            <h2 className="font-[family-name:var(--font-syne)] text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-[var(--landing-fog)]">
              How the pieces connect
            </h2>
            <div className="mt-10 max-w-3xl space-y-8">
              <p className="text-base leading-relaxed text-[var(--landing-fog)]/65">
                <span className="font-[family-name:var(--font-syne)] text-[var(--landing-fog)]">
                  Agents.{" "}
                </span>
                Fashion buyer and merchant chat on Bedrock, with deterministic
                tools if the model is offline.
              </p>
              <p className="text-base leading-relaxed text-[var(--landing-fog)]/65">
                <span className="font-[family-name:var(--font-syne)] text-[var(--landing-fog)]">
                  Payments.{" "}
                </span>
                Visa-style scoped card in chat, plus USDC x402 on Base Sepolia.
                Both wait on explicit consent.
              </p>
              <p className="text-base leading-relaxed text-[var(--landing-fog)]/65">
                <span className="font-[family-name:var(--font-syne)] text-[var(--landing-fog)]">
                  Onboarding.{" "}
                </span>
                One conversation publishes a storefront agents can already shop.
                SME or multi-location, same door.
              </p>
            </div>
          </Reveal>
        </section>

        <section className="relative overflow-hidden border-t border-white/10 bg-[#050708] px-6 py-32 md:px-10 md:py-40">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.28]"
            aria-hidden
          >
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative atmospheric crop */}
              <img
                src="/media/metal-human.jpg"
                alt=""
                className="h-full w-full scale-110 object-cover object-[50%_30%]"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#050708] via-[#050708]/85 to-[#050708]/55" />
          </div>
          <div
            className="landing-grain pointer-events-none absolute inset-0 opacity-50"
            aria-hidden
          />
          <Reveal className="relative mx-auto max-w-[1400px]">
            <p className="landing-brand text-[clamp(3.5rem,12vw,8rem)] text-[var(--landing-fog)]">
              Borneo
            </p>
            <p className="mt-6 max-w-[34ch] text-base text-[var(--landing-fog)]/65 md:text-lg">
              Discover, decide, and pay in one conversation. Merchants go live
              in the same afternoon.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/buyer" className={cn(btnPrimary, "h-12 px-6")}>
                Shop fashion
              </Link>
              <Link href="/onboard" className={cn(btnGhost, "h-12 px-6")}>
                Open a store
              </Link>
            </div>
          </Reveal>
        </section>

        <footer className="border-t border-white/10 px-6 py-8 md:px-10">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 text-sm text-[var(--landing-fog)]/40">
            <span className="font-[family-name:var(--font-syne)] tracking-tight">
              Borneo
            </span>
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/buyer" className="hover:text-[var(--landing-fog)]/70">
                Shop fashion
              </Link>
              <Link
                href="/onboard"
                className="hover:text-[var(--landing-fog)]/70"
              >
                Open a store
              </Link>
              <Link
                href="/market"
                className="hover:text-[var(--landing-fog)]/70"
              >
                Market
              </Link>
              <Link
                href="/dashboard"
                className="hover:text-[var(--landing-fog)]/70"
              >
                Dashboard
              </Link>
              <a
                href="https://getlayers.ai"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] tracking-wide hover:text-[var(--landing-fog)]/70"
              >
                Visual: GetLayers metalHuman
              </a>
            </div>
          </div>
        </footer>
      </div>
    </LandingLenis>
  );
}
