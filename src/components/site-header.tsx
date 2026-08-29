import Link from "next/link";
import { cn } from "@/lib/utils";

export function SiteHeader({
  className,
  tone = "light",
}: {
  className?: string;
  /** Agent discovery / dark surfaces need light nav ink */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <header
      className={cn(
        "absolute inset-x-0 top-0 z-20 h-16 border-b backdrop-blur-md",
        dark
          ? "border-neutral-800 bg-neutral-950/90"
          : "border-border/60 bg-background/80",
        className,
      )}
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6">
        <Link
          href="/"
          className={cn(
            "font-[family-name:var(--font-syne)] text-lg font-extrabold tracking-[-0.04em]",
            dark ? "text-neutral-100" : "text-foreground",
          )}
        >
          Aisle
        </Link>
        <nav
          className={cn(
            "flex items-center gap-5 text-sm",
            dark ? "text-neutral-300" : "text-foreground/65",
          )}
        >
          <Link
            href="/market"
            className={dark ? "hover:text-white" : "hover:text-foreground"}
          >
            Market
          </Link>
          <Link
            href="/onboard"
            className={dark ? "hover:text-white" : "hover:text-foreground"}
          >
            Open a store
          </Link>
          <Link
            href="/buyer"
            className={dark ? "hover:text-white" : "hover:text-foreground"}
          >
            Buyer
          </Link>
          <Link
            href="/demo"
            className={cn(
              "hidden sm:inline",
              dark ? "hover:text-white" : "hover:text-foreground",
            )}
          >
            Handshake
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ops
          </Link>
        </nav>
      </div>
    </header>
  );
}
