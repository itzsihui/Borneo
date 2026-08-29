"use client";

import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { Reveal } from "@/components/landing/reveal";

const BUYER_PLACEHOLDERS = [
  "I'm looking for a black linen shirt",
  "I need a cap I can wear with the hackathon tee",
  "Compare the viscose shirt and the structured cap",
  "Find me something for a dinner, not a gym",
  "I want a crewneck under 0.01 USDC",
];

const BUYER_MAP = [
  {
    problem: "Five screens and a redirect to buy a shirt",
    solution: "Ask once. The fashion agent ranks live SKUs.",
  },
  {
    problem: "Tabs for search, cart, checkout, then pay",
    solution: "Discover, compare, and pay in the same chat.",
  },
  {
    problem: "A bot that might charge before you see the bill",
    solution: "Preview item, merchant, amount, rail. Then you authorize.",
  },
];

const SELLER_MAP = [
  {
    problem: "Admin forms to list fifty SKUs",
    solution: "Talk the catalog, drop a CSV, or paste a store URL.",
  },
  {
    problem: "Agents cannot read an HTML shop",
    solution: "The store publishes as text agents already shop.",
  },
  {
    problem: "No trusted pay inside the conversation",
    solution: "Bind Visa receive and crypto. Same chat, both rails.",
  },
];

const SELLER_WORDS =
  "Type what you sell. The store is live for people and for other agents.";

function Mapping({
  rows,
}: {
  rows: { problem: string; solution: string }[];
}) {
  return (
    <ul className="mt-8 space-y-6">
      {rows.map((row) => (
        <li
          key={row.problem}
          className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-5"
        >
          <p className="text-sm leading-relaxed text-[var(--landing-fog)]/55 md:text-right">
            {row.problem}
          </p>
          <ArrowRightIcon
            className="hidden size-5 text-[var(--landing-jade)] md:block"
            weight="bold"
            aria-hidden
          />
          <ArrowDownIcon
            className="size-5 text-[var(--landing-jade)] md:hidden"
            weight="bold"
            aria-hidden
          />
          <p className="text-sm leading-relaxed text-[var(--landing-fog)]">
            {row.solution}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function LandingPitch() {
  const router = useRouter();

  return (
    <div className="relative mx-auto max-w-[1100px] space-y-24 md:space-y-32">
      <Reveal>
        <h2 className="font-[family-name:var(--font-syne)] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-[var(--landing-fog)]">
          For buyers
        </h2>
        <p className="mt-3 max-w-[42ch] text-base leading-relaxed text-[var(--landing-fog)]/55">
          Tell the agent what you want on. It shops the live catalog.
        </p>
        <div className="mt-8">
          <PlaceholdersAndVanishInput
            placeholders={BUYER_PLACEHOLDERS}
            onChange={() => {}}
            onSubmit={() => {
              window.setTimeout(() => {
                router.push("/buyer/login");
              }, 700);
            }}
          />
        </div>
        <Mapping rows={BUYER_MAP} />
      </Reveal>

      <Reveal>
        <h2 className="font-[family-name:var(--font-syne)] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-[var(--landing-fog)]">
          For sellers
        </h2>
        <div className="mt-5 max-w-[34ch] text-[var(--landing-fog)]">
          <TextGenerateEffect words={SELLER_WORDS} />
        </div>
        <Mapping rows={SELLER_MAP} />
      </Reveal>

      <Reveal>
        <h2 className="font-[family-name:var(--font-syne)] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-[var(--landing-fog)]">
          What you both get
        </h2>
        <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-[var(--landing-fog)]/70">
          Shoppers stay in one chat from browse to pay. Merchants go live by
          talking. Visa and USDC sit in that conversation, and nothing moves
          until someone confirms.
        </p>
      </Reveal>
    </div>
  );
}
