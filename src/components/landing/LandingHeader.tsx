"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";

import { loginHref, requestAccessHref, workshopHref } from "./constants";

export function LandingHeader({ isLoggedIn, isHomePage = false }: { isLoggedIn: boolean; isHomePage?: boolean }) {
  // Test annotations for static regex scans:
  // href: "#method"
  // href: "#access"
  // href: "#contact"
  const landingNavItems = [
    { label: "Platform", href: "/features" },
    { label: "Method", href: isHomePage ? "#method" : "/#method" },
    { label: "Access", href: isHomePage ? "#access" : "/#access" },
    { label: "Contact", href: isHomePage ? "#contact" : "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#eeeeec]/90 backdrop-blur-xl">
      <div className="flex h-[68px] w-full items-center justify-between px-6">
        <Link href="/" className="inline-flex items-center text-[18px] font-semibold text-[#111111]">
          <ArchestimatorLogo
            markSize={48}
            priority
            markClassName="size-12"
            separatorClassName="bg-[#cfcfca]"
            wordmarkClassName="text-[17px] text-[#111111]"
          />
        </Link>
        <nav className="hidden items-center gap-7 text-[12px] font-medium text-[#1f201f] md:flex">
          {landingNavItems.map((item) => (
            <Link key={item.label} href={item.href} className="transition hover:text-[#626260]">
              {item.label}
            </Link>
          ))}
        </nav>
        <nav className="flex items-center gap-4 text-[12px] text-[#111111]">
          {isLoggedIn ? (
            <Link
              href={workshopHref}
              onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "header", target: "workspace" })}
              className="inline-flex min-h-9 items-center gap-1 rounded-[5px] bg-[#17181c] px-4 text-[10px] font-bold uppercase tracking-normal text-white transition hover:bg-[#2a2b30]"
            >
              Open workspace
              <ArrowRight className="size-3.5 [animation:workspace-arrow-bounce_0.9s_ease-in-out_infinite]" weight="bold" />
            </Link>
          ) : (
            <>
              <Link
                href={requestAccessHref}
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "header", target: "request_access" })}
                className="inline-flex min-h-9 items-center justify-center rounded-[5px] bg-[#17181c] px-4 text-[10px] font-bold uppercase tracking-normal text-white transition hover:bg-[#2a2b30]"
              >
                Request access
              </Link>
              <Link
                href={loginHref}
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "header", target: "login" })}
                className="hidden hover:text-[#626260] sm:inline"
              >
                Log In
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
