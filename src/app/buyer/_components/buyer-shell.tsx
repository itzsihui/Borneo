"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { readBuyerAccount } from "@/lib/buyer-account";
import { cn } from "@/lib/utils";
import { useBuyerAuth } from "./buyer-auth-provider";

const NAV = [
  { href: "/buyer", label: "Shop", exact: true },
  { href: "/buyer/activity", label: "Activity" },
  { href: "/buyer/profile", label: "Profile" },
  { href: "/buyer/governance", label: "Governance" },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BuyerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useBuyerAuth();
  const [ready, setReady] = useState(false);

  const isAuthPage =
    pathname === "/buyer/login" || pathname === "/buyer/signup";
  const isOnboard = pathname === "/buyer/onboard";

  useEffect(() => {
    if (!auth.ready) return;

    // Without Firebase: keep localStorage-only gate
    if (!auth.configured) {
      const account = readBuyerAccount();
      if (!account && !isOnboard) {
        router.replace("/buyer/onboard");
        return;
      }
      if (account && isOnboard) {
        router.replace("/buyer");
        return;
      }
      setReady(true);
      return;
    }

    if (!auth.user && !isAuthPage) {
      router.replace("/buyer/login");
      return;
    }

    if (auth.user && isAuthPage) {
      const account = auth.account ?? readBuyerAccount();
      router.replace(account ? "/buyer" : "/buyer/onboard");
      return;
    }

    if (auth.user && !isAuthPage) {
      const account = auth.account ?? readBuyerAccount();
      if (!account && !isOnboard) {
        router.replace("/buyer/onboard");
        return;
      }
      if (account && isOnboard) {
        router.replace("/buyer");
        return;
      }
    }

    setReady(true);
  }, [
    auth.ready,
    auth.configured,
    auth.user,
    auth.account,
    pathname,
    isAuthPage,
    isOnboard,
    router,
  ]);

  if (!auth.ready || !ready) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-[1400px] px-6 pt-24">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      </div>
    );
  }

  if (isOnboard || isAuthPage) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <SiteHeader />
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <SiteHeader />
      <div className="shrink-0 border-b border-border/60 bg-background/80 pt-16">
        <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-6">
          {NAV.map((item) => {
            const active = isActive(
              pathname,
              item.href,
              "exact" in item && item.exact,
            );
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "border-b-2 px-3 py-3 text-sm transition-colors",
                  active
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-foreground/55 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
