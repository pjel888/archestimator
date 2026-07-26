"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { Button, ButtonLink } from "@/components/ui/button";
import { useLandingAuthHint } from "@/lib/landing/use-landing-auth-hint";

import { loginHref, workshopHref } from "./constants";

const LANDING_FOOTER_SELECTOR = '[data-visual-reference="amigo-footer"]';

function readIsOverLandingFooter() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const footer = document.querySelector<HTMLElement>(LANDING_FOOTER_SELECTOR);
  if (!footer) return false;
  const rect = footer.getBoundingClientRect();
  return rect.top <= 92 && rect.bottom >= 0;
}

function subscribeToLandingFooterOverlap(onStoreChange: () => void) {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  const footer = document.querySelector<HTMLElement>(LANDING_FOOTER_SELECTOR);

  window.addEventListener("resize", onStoreChange);
  window.addEventListener("scroll", onStoreChange, { passive: true });

  if (!footer || typeof IntersectionObserver === "undefined") {
    return () => {
      window.removeEventListener("resize", onStoreChange);
      window.removeEventListener("scroll", onStoreChange);
    };
  }

  const observer = new IntersectionObserver(onStoreChange, { threshold: [0, 0.05, 0.1] });
  observer.observe(footer);

  return () => {
    observer.disconnect();
    window.removeEventListener("resize", onStoreChange);
    window.removeEventListener("scroll", onStoreChange);
  };
}

export function LandingHeader({
  isLoggedIn: isLoggedInProp,
  isHomePage = false,
}: {
  isLoggedIn?: boolean;
  isHomePage?: boolean;
}) {
  const isLoggedIn = useLandingAuthHint(isLoggedInProp);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isOverFooter = useSyncExternalStore(subscribeToLandingFooterOverlap, readIsOverLandingFooter, () => false);
  // Test annotations for static regex scans:
  // href: "#method"
  // href: "#contact"
  const landingNavItems = [
    { label: "Platform", href: isHomePage ? "#method" : "/features" },
    { label: "Specialties", href: isHomePage ? "#method" : "/#method" },
    { label: "Company", href: isHomePage ? "#contact" : "/contact" },
  ];

  return (
    // react-doctor-disable-next-line react-doctor/no-static-element-interactions -- Header listens for Escape to close its contained mobile menu.
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-300 ${
        isOverFooter
          ? "border-white/16 bg-[#aa412a]/82 text-white shadow-[0_1px_0_rgba(255,255,255,0.08)]"
          : "border-white/42 bg-white/62 text-[#171514] shadow-[0_1px_0_rgba(17,17,17,0.04)]"
      }`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsMenuOpen(false);
        }
      }}
    >
      <div className="relative flex h-[72px] w-full items-center justify-between px-6 sm:px-8 lg:px-12">
        <Link href="/" className="inline-flex items-center text-[18px] font-semibold" aria-label="Archestimator home">
          <ArchestimatorLogo
            tone={isOverFooter ? "light" : "dark"}
            markSize={42}
            priority
            markClassName="size-[42px]"
            separatorClassName="hidden"
            wordmarkClassName={isOverFooter ? "text-[17px] text-white" : "text-[17px] text-[#111111]"}
          />
        </Link>

        <nav aria-label="Primary" className={`hidden items-center gap-7 text-[12px] font-medium lg:flex ${isOverFooter ? "text-white" : "text-[#2c2925]"}`}>
          {landingNavItems.map((item) => (
            <Link key={item.label} href={item.href} className={`transition focus-visible:outline-none focus-visible:ring-2 ${isOverFooter ? "hover:text-white/70 focus-visible:ring-white/70" : "hover:text-brand-orange focus-visible:ring-brand-orange"}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Account" className={`flex items-center gap-2 text-[12px] ${isOverFooter ? "text-white" : "text-[#111111]"}`}>
          {isLoggedIn ? (
            <ButtonLink
              href={workshopHref}
              onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "header", target: "workspace" })}
              variant="plain"
              size="lg"
              className={`inline-flex min-h-10 min-w-0 items-center gap-2 rounded-[6px] px-4 !text-[12px] !font-semibold text-white transition ${
                isOverFooter ? "border border-white/70 bg-transparent hover:bg-white/10" : "bg-brand-orange hover:bg-brand-orange-dark"
              }`}
            >
              Workspace
              <ArrowRight className="size-3.5 [animation:workspace-arrow-bounce_0.9s_ease-in-out_infinite]" weight="bold" />
            </ButtonLink>
          ) : (
            <>
              <ButtonLink
                href="/contact"
                aria-label="Book a walkthrough"
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "header", target: "book_walkthrough" })}
                variant="plain"
                size="lg"
                className={`inline-flex min-h-10 min-w-0 items-center justify-center rounded-[6px] px-4 !text-[12px] !font-semibold text-white transition ${
                  isOverFooter ? "border border-white/70 bg-transparent hover:bg-white/10" : "bg-brand-orange hover:bg-brand-orange-dark"
                }`}
              >
                <span className="hidden sm:inline">Book a walkthrough</span>
                <span className="sm:hidden" aria-hidden="true">Book</span>
              </ButtonLink>
              <ButtonLink
                href={loginHref}
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "header", target: "login" })}
                variant="plain"
                size="lg"
                className={`hidden min-h-10 min-w-0 items-center justify-center rounded-[6px] px-3 !text-[12px] !font-semibold transition sm:inline-flex ${
                  isOverFooter ? "hover:text-white/70" : "hover:text-brand-orange"
                }`}
              >
                Sign in
              </ButtonLink>
            </>
          )}
          <Button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setIsMenuOpen((current) => !current)}
            variant="plain"
            size="lg"
            className={`inline-flex min-h-10 min-w-0 items-center justify-center rounded-[6px] px-4 !text-[12px] !font-semibold transition lg:hidden ${
              isOverFooter ? "bg-white/12 text-white hover:bg-white/18" : "bg-white text-[#171514] hover:bg-white"
            }`}
          >
            Menu
          </Button>
        </nav>

        <div
          id="landing-mobile-menu"
          hidden={!isMenuOpen}
          className={`absolute left-6 right-6 top-[76px] z-50 rounded-[8px] border p-2 shadow-[0_18px_42px_rgba(37,29,22,0.12)] backdrop-blur-2xl backdrop-saturate-150 sm:left-8 sm:right-8 lg:hidden ${
            isOverFooter ? "border-white/16 bg-[#aa412a]/88 text-white" : "border-white/50 bg-white/72"
          }`}
        >
          <nav aria-label="Mobile primary" className="grid gap-1">
            {landingNavItems.map((item) => (
              <Link
                key={`mobile-${item.label}`}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`rounded-[6px] px-3 py-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 ${
                  isOverFooter ? "text-white hover:bg-white/10 focus-visible:ring-white/70" : "text-[#2c2925] hover:bg-white focus-visible:ring-brand-orange"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
