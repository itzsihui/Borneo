"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Terminal } from "@/components/ui/terminal";
import { TracingBeam } from "@/components/ui/tracing-beam";
import { LandingLenis } from "@/components/landing/lenis-root";
import { MetalHumanStage } from "@/components/landing/metal-human-stage";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

const HANDSHAKE = [
  {
    n: "01",
    title: "Converse a store",
    body: "Merchant chat drafts catalog, prices, and agent surfaces — no admin form marathon.",
    mono: "POST /api/merchant-agent",
    accent: "jade" as const,
  },
  {
    n: "02",
    title: "Agents discover",
    body: "Listed on /market and the network /llms.txt. Agents match SKUs, then open the store card.",
    mono: "GET /llms.txt → /s/{slug}",
    accent: "ember" as const,
  },
  {
    n: "03",
    title: "x402 challenges",
    body: "POST /buy returns Payment Required with PAYMENT-REQUIRED on Avalanche.",
    mono: "HTTP/1.1 402 Payment Required",
    accent: "fog" as const,
  },
  {
    n: "04",
    title: "Settle in XSGD",
    body: "Transfer clears. Gateway returns 200 and an explorer receipt — cart optional forever.",
    mono: "HTTP/1.1 200 OK · snowtrace",
    accent: "jade" as const,
  },
];

export function LandingHome() {
  return (
    <LandingLenis>
      <div className="landing min-h-[100dvh]">
        {/* Hero — full-bleed metalHuman loop */}
        <section className="landing-stage relative flex min-h-[100dvh] flex-col">
          <MetalHumanStage />
          <div className="landing-grain pointer-events-none absolute inset-0 z-[1]" aria-hidden />
          <div className="landing-vignette pointer-events-none absolute inset-0 z-[1]" aria-hidden />

          <header className="relative z-20 flex h-16 items-center justify-between px-6 md:px-10">
            <span className="landing-brand text-lg text-[var(--landing-fog)]">
              Aisle
            </span>
            <nav className="flex items-center gap-5 text-sm text-[var(--landing-fog)]/70">
              <Link href="/market" className="hover:text-[var(--landing-fog)]">
                Market
              </Link>
              <Link href="/onboard" className="hover:text-[var(--landing-fog)]">
                Open a store
              </Link>
              <Link href="/buyer" className="hover:text-[var(--landing-fog)]">
                Buyer
              </Link>
              <Link
                href="/demo"
                className="hidden hover:text-[var(--landing-fog)] sm:inline"
              >
                Handshake
              </Link>
              <Link
                href="/onboard"
                className="rounded-md bg-[var(--landing-jade)] px-3 py-1.5 text-[var(--landing-ink)] transition-opacity hover:opacity-90"
              >
                Start
              </Link>
            </nav>
          </header>

          <main className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-6 pb-28 pt-6 md:px-10">
            <div className="max-w-xl">
              <p
                className={cn(
                  "landing-brand landing-rise text-[clamp(4.5rem,14vw,9.5rem)] text-[var(--landing-fog)]",
                )}
              >
                Aisle
              </p>
              <h1
                className={cn(
                  "landing-rise landing-rise-delay-1 mt-6 max-w-[16ch] font-[family-name:var(--font-syne)] text-[clamp(1.6rem,3.2vw,2.35rem)] font-semibold leading-[1.15] tracking-tight text-[var(--landing-fog)]",
                )}
              >
                Agents are first-class customers.
              </h1>
              <p
                className={cn(
                  "landing-rise landing-rise-delay-2 mt-4 max-w-[34ch] text-base leading-relaxed text-[var(--landing-fog)]/70",
                )}
              >
                Converse a store into existence. Agents read{" "}
                <span className="font-mono text-[0.9em] text-[var(--landing-ember)]">
                  llms.txt
                </span>{" "}
                and pay in XSGD — no human checkout UI.
              </p>
              <div
                className={cn(
                  "landing-rise landing-rise-delay-3 mt-9 flex flex-wrap gap-3",
                )}
              >
                <Link
                  href="/onboard"
                  className="inline-flex h-11 items-center rounded-md bg-[var(--landing-jade)] px-5 text-sm font-medium text-[var(--landing-ink)] transition-opacity hover:opacity-90 active:scale-[0.98]"
                >
                  Open a store
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex h-11 items-center rounded-md border border-[var(--landing-fog)]/25 bg-black/25 px-5 text-sm font-medium text-[var(--landing-fog)] backdrop-blur-sm transition-colors hover:border-[var(--landing-fog)]/45 hover:bg-black/40 active:scale-[0.98]"
                >
                  Watch the handshake
                </Link>
              </div>
            </div>
          </main>

          <p className="landing-scroll-cue absolute bottom-8 left-1/2 z-20 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--landing-fog)]/45">
            Scroll
          </p>
        </section>

        {/* Handshake — TracingBeam scroll narrative */}
        <section
          aria-label="Protocol handshake"
          className="relative overflow-hidden bg-[#050708] px-6 py-24 md:px-10 md:py-32"
        >
          <div className="landing-grain pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <div className="relative mx-auto max-w-[1100px]">
            <Reveal className="mb-16 max-w-xl md:mb-24">
              <h2 className="font-[family-name:var(--font-syne)] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-[var(--landing-fog)]">
                The handshake, frame by frame.
              </h2>
              <p className="mt-3 max-w-[40ch] text-[var(--landing-fog)]/55">
                Follow the beam as an agent walks from discovery to settled
                receipt.
              </p>
            </Reveal>

            <TracingBeam className="max-w-3xl px-2 md:px-4">
              <div className="ml-2 flex flex-col gap-20 pb-8 pt-2 md:ml-6 md:gap-28">
                {HANDSHAKE.map((step) => (
                  <article key={step.n} className="relative">
                    <p
                      className={cn(
                        "font-mono text-xs tracking-[0.22em]",
                        step.accent === "jade" && "text-[var(--landing-jade)]",
                        step.accent === "ember" && "text-[var(--landing-ember)]",
                        step.accent === "fog" && "text-[var(--landing-fog)]/45",
                      )}
                    >
                      {step.n}
                    </p>
                    <h3 className="mt-3 font-[family-name:var(--font-syne)] text-[clamp(1.5rem,3.2vw,2.25rem)] font-semibold leading-[1.12] tracking-tight text-[var(--landing-fog)]">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-[38ch] text-base leading-relaxed text-[var(--landing-fog)]/55">
                      {step.body}
                    </p>
                    <pre className="landing-code-panel mt-6 overflow-x-auto rounded-lg border border-white/10 bg-[oklch(0.12_0.015_160_/_0.85)] px-5 py-5 font-mono text-sm leading-relaxed text-[var(--landing-ember)]">
                      <code>{step.mono}</code>
                    </pre>
                  </article>
                ))}
              </div>
            </TracingBeam>
          </div>
        </section>

        {/* Bob — why human storefronts miss the agent economy */}
        <section
          aria-label="Meet Bob"
          className="relative overflow-hidden border-t border-white/10 bg-[#060908] px-6 py-24 md:px-10 md:py-32"
        >
          <div className="landing-grain pointer-events-none absolute inset-0 opacity-30" aria-hidden />
          <div className="relative mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16">
            <Reveal>
              <Badge
                variant="outline"
                className="rounded-md border-[var(--landing-ember)]/35 bg-transparent font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--landing-ember)]"
              >
                Meet Bob
              </Badge>
              <h2 className="mt-5 font-[family-name:var(--font-syne)] text-[clamp(1.75rem,4vw,2.85rem)] font-semibold leading-[1.1] tracking-tight text-[var(--landing-fog)]">
                Bob had a beautiful shop.
                <span className="mt-2 block text-[var(--landing-fog)]/45">
                  Agents never walked in.
                </span>
              </h2>
              <div className="mt-6 max-w-[42ch] space-y-4 text-base leading-relaxed text-[var(--landing-fog)]/60">
                <p>
                  Last year Bob shipped a polished ecommerce site. Humans loved
                  it. Cart, checkout, CAPTCHA, the works.
                </p>
                <p>
                  Then the buyers changed. Shopping agents hit his homepage,
                  choked on HTML, and moved on to the next merchant. No
                  <span className="font-mono text-[0.9em] text-[var(--landing-ember)]">
                    {" "}
                    llms.txt
                  </span>
                  . No machine catalog. No way to pay without a browser.
                </p>
                <p className="text-[var(--landing-fog)]/80">
                  Every bounce was a sale he never saw. Invisible demand. Empty
                  carts that never formed.
                </p>
              </div>
              <Separator className="my-8 max-w-xs bg-white/10" />
              <p className="max-w-[36ch] font-[family-name:var(--font-syne)] text-lg font-medium leading-snug text-[var(--landing-fog)]">
                Aisle is how Bob opens the door. Agents discover, challenge,
                settle — without a human checkout UI.
              </p>
              <Link
                href="/onboard"
                className="mt-8 inline-flex h-11 items-center rounded-md bg-[var(--landing-jade)] px-5 text-sm font-medium text-[var(--landing-ink)] transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                Don&apos;t be Bob&apos;s old site
              </Link>
            </Reveal>

            <Reveal delay={0.12} className="landing-terminal-shell min-h-[300px] overflow-hidden rounded-lg p-1 lg:min-h-[360px]">
              <Terminal
                className="h-full max-w-none border-0 bg-transparent px-2 py-3 md:px-4"
                username="agent"
                enableSound={false}
                typingSpeed={22}
                commands={[
                  "curl -s https://bobs-shop.com/ | head",
                  "curl -s https://bobs-shop.com/llms.txt",
                  "curl -s https://bobs-shop.com/buy",
                ]}
                outputs={{
                  0: [
                    "<!DOCTYPE html><html>…",
                    "<!-- captcha · cart · cookie banner -->",
                    "agent: cannot parse checkout UI",
                  ],
                  1: ["HTTP/1.1 404 Not Found", "agent: no discovery surface"],
                  2: [
                    "HTTP/1.1 405 Method Not Allowed",
                    "agent: skipping merchant — next store",
                  ],
                }}
              />
            </Reveal>
          </div>
        </section>

        {/* Rails — cinematic strip */}
        <section className="relative border-t border-white/10 bg-[#070a0c] px-6 py-24 md:px-10 md:py-32">
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
              <h2 className="font-[family-name:var(--font-syne)] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-[var(--landing-fog)]">
                Three rails. One protocol.
              </h2>
              <p className="mt-3 max-w-[42ch] text-[var(--landing-fog)]/55">
                Merchants talk. Agents pay. Infrastructure stays Well-Architected.
              </p>
            </Reveal>
            <ul className="mt-16 grid gap-14 md:grid-cols-3 md:gap-12">
              <li>
                <Reveal delay={0.05}>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--landing-jade)]">
                    Avalanche
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-syne)] text-xl font-medium text-[var(--landing-fog)]">
                    x402 is the checkout
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--landing-fog)]/55">
                    HTTP 402 → XSGD transfer → 200 + explorer receipt. No cart UI.
                  </p>
                </Reveal>
              </li>
              <li>
                <Reveal delay={0.12}>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--landing-ember)]">
                    StraitsX
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-syne)] text-xl font-medium text-[var(--landing-fog)]">
                    Scoped agent cards
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--landing-fog)]/55">
                    Spend cap, merchant whitelist, short TTL — then burn.
                  </p>
                </Reveal>
              </li>
              <li>
                <Reveal delay={0.18}>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--landing-fog)]/45">
                    AWS
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-syne)] text-xl font-medium text-[var(--landing-fog)]">
                    Bedrock + protocol slice
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--landing-fog)]/55">
                    Agents on Bedrock. Pay path on API Gateway, Lambda, DynamoDB,
                    CloudWatch.
                  </p>
                </Reveal>
              </li>
            </ul>
          </div>
        </section>

        {/* Close — poster still as atmosphere */}
        <section className="relative overflow-hidden border-t border-white/10 bg-[#050708] px-6 py-32 md:px-10 md:py-40">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.28]"
            aria-hidden
          >
            {/* Closing atmosphere reuses the 2K poster still */}
            <div className="absolute inset-0">
              {/* next/image fill requires positioned parent */}
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative atmospheric crop; avoid layout shift on scroll section */}
              <img
                src="/media/metal-human.jpg"
                alt=""
                className="h-full w-full object-cover object-[50%_30%] scale-110"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#050708] via-[#050708]/85 to-[#050708]/55" />
          </div>
          <div className="landing-grain pointer-events-none absolute inset-0 opacity-50" aria-hidden />
          <Reveal className="relative mx-auto max-w-[1400px] text-center">
            <p className="landing-brand text-[clamp(3.5rem,12vw,8rem)] text-[var(--landing-fog)]">
              Aisle
            </p>
            <p className="mx-auto mt-6 max-w-[32ch] text-base text-[var(--landing-fog)]/65 md:text-lg">
              Spin up a storefront agents can already buy from.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/onboard"
                className="inline-flex h-12 items-center rounded-md bg-[var(--landing-jade)] px-6 text-sm font-medium text-[var(--landing-ink)] transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                Open a store
              </Link>
              <Link
                href="/demo"
                className="inline-flex h-12 items-center rounded-md border border-[var(--landing-fog)]/25 bg-black/30 px-6 text-sm font-medium text-[var(--landing-fog)] backdrop-blur-sm transition-colors hover:border-[var(--landing-fog)]/45 hover:bg-black/45 active:scale-[0.98]"
              >
                Watch the handshake
              </Link>
            </div>
          </Reveal>
        </section>

        <footer className="border-t border-white/10 px-6 py-8 md:px-10">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 text-sm text-[var(--landing-fog)]/40">
            <span className="font-[family-name:var(--font-syne)] tracking-tight">
              Aisle
            </span>
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/onboard" className="hover:text-[var(--landing-fog)]/70">
                Merchant
              </Link>
              <Link href="/buyer" className="hover:text-[var(--landing-fog)]/70">
                Buyer
              </Link>
              <Link href="/dashboard" className="hover:text-[var(--landing-fog)]/70">
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
