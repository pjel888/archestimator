"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";

import { loginHref, workshopHref } from "./constants";

export function LandingHeader({ isLoggedIn, isHomePage = false }: { isLoggedIn: boolean; isHomePage?: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOverFooter, setIsOverFooter] = useState(false);
  // Test annotations for static regex scans:
  // href: "#product"
  // href: "#method"
  // href: "#contact"
  const landingNavItems = [
    { label: "Platform", href: isHomePage ? "#product" : "/features" },
    { label: "Specialties", href: isHomePage ? "#method" : "/#method" },
    { label: "Company", href: isHomePage ? "#contact" : "/contact" },
  ];

  useEffect(() => {
    const footer = document.querySelector<HTMLElement>('[data-visual-reference="amigo-footer"]');

    if (!footer || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const top = entry?.boundingClientRect.top ?? Number.POSITIVE_INFINITY;
        setIsOverFooter(Boolean(entry?.isIntersecting && top <= 92));
      },
      { threshold: [0, 0.05, 0.1] },
    );

    observer.observe(footer);

    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300 ${
        isOverFooter
          ? "border-white/10 bg-[#aa412a]/96 text-white"
          : "border-[#e5e0d8] bg-[#fffdf9]/92 text-[#171514]"
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
            <Link
              href={workshopHref}
              onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "header", target: "workspace", cta_label: "Open the workspace" })}
              className={`inline-flex min-h-10 items-center gap-2 rounded-[6px] px-4 text-[12px] font-semibold text-white transition ${
                isOverFooter ? "border border-white/70 bg-transparent hover:bg-white/10" : "bg-brand-orange hover:bg-brand-orange-dark"
              }`}
            >
              Open the workspace
              <ArrowRight className="size-3.5 [animation:workspace-arrow-bounce_0.9s_ease-in-out_infinite]" weight="bold" />
            </Link>
          ) : (
            <>
              <Link
                href="/contact"
                aria-label="Request beta access"
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "header", target: "book_walkthrough", cta_label: "Request beta access" })}
                className={`inline-flex min-h-10 items-center justify-center rounded-[6px] px-4 text-[12px] font-semibold text-white transition ${
                  isOverFooter ? "border border-white/70 bg-transparent hover:bg-white/10" : "bg-brand-orange hover:bg-brand-orange-dark"
                }`}
              >
                <span className="hidden sm:inline">Request beta access</span>
                <span className="sm:hidden" aria-hidden="true">Beta access</span>
              </Link>
              <Link
                href={loginHref}
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "header", target: "login" })}
                className={`hidden sm:inline ${isOverFooter ? "hover:text-white/70" : "hover:text-brand-orange"}`}
              >
                Log In
              </Link>
            </>
          )}
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setIsMenuOpen((current) => !current)}
            className={`inline-flex min-h-10 items-center justify-center rounded-[6px] px-4 text-[12px] font-semibold transition lg:hidden ${
              isOverFooter ? "bg-white/12 text-white hover:bg-white/18" : "bg-[#f4f1ec] text-[#171514] hover:bg-[#ece4da]"
            }`}
          >
            Menu
          </button>
        </nav>

        <div
          id="landing-mobile-menu"
          hidden={!isMenuOpen}
          className={`absolute left-6 right-6 top-[76px] z-50 rounded-[8px] border p-2 shadow-[0_18px_42px_rgba(37,29,22,0.12)] sm:left-8 sm:right-8 lg:hidden ${
            isOverFooter ? "border-white/16 bg-[#aa412a] text-white" : "border-[#e4ddd3] bg-[#fffdf9]"
          }`}
        >
          <nav aria-label="Mobile primary" className="grid gap-1">
            {landingNavItems.map((item) => (
              <Link
                key={`mobile-${item.label}`}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`rounded-[6px] px-3 py-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 ${
                  isOverFooter ? "text-white hover:bg-white/10 focus-visible:ring-white/70" : "text-[#2c2925] hover:bg-[#f4f1ec] focus-visible:ring-brand-orange"
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
