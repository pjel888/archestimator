"use client";

import { useState } from "react";
import Link from "next/link";
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { MaturityTag } from "@/components/landing/shell/MaturityTag";
import { START_FREE_HREF, BOOK_WALKTHROUGH_HREF } from "@/components/landing/sections/LandingCTAs";
import { workshopHref, loginHref } from "./constants";

/**
 * LandingHeader — sticky glass nav (doc 02 §3, doc 03 §4.2, doc 05 §Section 0).
 *
 * The SAME glass material as the Workshop top bar (`.dashboard-glass`) floats
 * over the canvas wash at `--landing-z-sticky`, carrying both CTAs site-wide.
 * Nav items: Features · Pricing · About · Contact · Trust (funnel order).
 *
 * The mobile hamburger disclosure is the ONE client leaf in the header
 * (doc 02 §3). The "Start free" primary CTA honors the L-FUN-2 carried
 * default (routes to /login meanwhile). `isLoggedIn` swaps the primary to
 * "Open workspace" → /workshop.
 */
const NAV_ITEMS: Array<{ label: string; href: string }> = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Trust", href: "/trust" },
  { label: "Contact", href: "/contact" },
];

export function LandingHeader({ isLoggedIn, isHomePage = false }: { isLoggedIn: boolean; isHomePage?: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const primaryHref = isLoggedIn ? workshopHref : START_FREE_HREF;
  const primaryLabel = isLoggedIn ? "Workspace" : "Start free";

  return (
    <header
      className="sticky top-0 z-[var(--landing-z-sticky)] border-b border-landing-hairline backdrop-blur-2xl backdrop-saturate-150"
      onKeyDown={(event) => {
        if (event.key === "Escape") setIsMenuOpen(false);
      }}
    >
      <div className="dashboard-glass">
        <div className="relative mx-auto flex h-[64px] w-full max-w-[1180px] items-center justify-between px-[var(--landing-section-pad-x)]">
          {/* Wordmark + maturity tag */}
          <Link
            href="/"
            className="inline-flex items-center gap-[var(--landing-space-sm)]"
            aria-label="Archestimator home"
          >
            <ArchestimatorLogo
              tone="dark"
              markSize={32}
              markClassName="size-8"
              separatorClassName="hidden"
              wordmarkClassName="text-[15px] text-landing-ink"
            />
            <span className="hidden sm:inline-flex">
              <MaturityTag size="sm" />
            </span>
          </Link>

          {/* Primary nav */}
          <nav aria-label="Primary" className="hidden items-center gap-[var(--landing-space-lg)] lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-landing-text-body-sm font-medium text-landing-ink-secondary transition hover:text-landing-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-landing-canvas"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Account / CTAs */}
          <nav aria-label="Account" className="flex items-center gap-[var(--landing-space-sm)]">
            <Link
              href={primaryHref}
              data-landing-cta="primary"
              data-landing-cta-location="header"
              className="inline-flex min-h-9 items-center justify-center rounded-landing-pill bg-brand-orange px-[var(--landing-space-md)] text-landing-text-label font-semibold uppercase tracking-landing-label text-white transition hover:bg-brand-orange-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-landing-canvas"
            >
              {primaryLabel}
            </Link>
            {!isLoggedIn ? (
              <Link
                href={loginHref}
                className="hidden text-landing-text-body-sm font-medium text-landing-ink-secondary transition hover:text-landing-ink sm:inline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-landing-canvas"
              >
                Sign in
              </Link>
            ) : null}
            <button
              type="button"
              aria-expanded={isMenuOpen}
              aria-controls="landing-mobile-menu"
              onClick={() => setIsMenuOpen((current) => !current)}
              className="inline-flex min-h-9 items-center justify-center rounded-landing-pill border border-landing-hairline bg-surface px-[var(--landing-space-md)] text-landing-text-label font-semibold uppercase tracking-landing-label text-landing-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange lg:hidden"
            >
              Menu
            </button>
          </nav>
        </div>
      </div>

      {/* Mobile menu disclosure — the header's one client leaf */}
      <div
        id="landing-mobile-menu"
        hidden={!isMenuOpen}
        className="dashboard-glass mx-[var(--landing-section-pad-x)] mt-[var(--landing-space-2xs)] rounded-landing-pill border border-landing-hairline p-[var(--landing-space-sm)] lg:hidden"
      >
        <nav aria-label="Mobile primary" className="grid gap-[var(--landing-space-2xs)]">
          {NAV_ITEMS.map((item) => (
            <Link
              key={`mobile-${item.label}`}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="rounded-landing-dense px-[var(--landing-space-sm)] py-[var(--landing-space-2xs)] text-landing-text-body-sm font-medium text-landing-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={BOOK_WALKTHROUGH_HREF}
            onClick={() => setIsMenuOpen(false)}
            className="rounded-landing-dense px-[var(--landing-space-sm)] py-[var(--landing-space-2xs)] text-landing-text-body-sm font-medium text-landing-ink-secondary transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            Book a walkthrough
          </Link>
        </nav>
      </div>
    </header>
  );
}
