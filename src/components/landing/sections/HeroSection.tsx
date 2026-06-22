import Link from "next/link";
import { HeroSignalField } from "@/components/landing/gpt-taste/HeroSignalField";
import { BrandComposition } from "@/components/landing/shared/BrandComposition";

/**
 * HeroSection — the homepage first viewport (Section 1).
 *
 * One bold statement, big type, real air. LCP is the server-rendered H1. The brand panel
 * is an abstract glass composition, not a fake screenshot. RSC.
 *
 * `isLoggedIn` swaps the primary CTA label + destination.
 */

const PRIMARY_HREF_LOGGED_OUT = "/login"; // L-FUN-2 GATED carried default
const PRIMARY_HREF_LOGGED_IN = "/workshop";

export interface HeroSectionProps {
  isLoggedIn?: boolean;
}

export function HeroSection({ isLoggedIn = false }: HeroSectionProps) {
  const primaryHref = isLoggedIn ? PRIMARY_HREF_LOGGED_IN : PRIMARY_HREF_LOGGED_OUT;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Start free";

  return (
    <section
      aria-label="Archestimator cost intelligence layer"
      data-landing-section="hero"
      className="relative isolate overflow-hidden bg-landing-canvas"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(95%_75%_at_76%_8%,var(--brand-orange-soft)_0%,transparent_48%),radial-gradient(80%_60%_at_2%_85%,rgba(255,255,255,0.9)_0%,transparent_56%)]"
      />
      <div className="relative mx-auto grid min-h-[calc(100svh-124px)] w-full max-w-[min(1760px,calc(100vw-24px))] gap-8 px-3 pb-16 pt-20 sm:px-6 sm:pt-24 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.72fr)] lg:items-center lg:gap-10 lg:pb-20 lg:pt-28">
        <div className="gsap-hero-copy flex max-w-[88rem] flex-col gap-6">
          <h1 className="font-landing-display text-[clamp(3.35rem,8.2vw,8.9rem)] font-semibold leading-[0.94] tracking-normal text-landing-ink text-balance">
            Cost intelligence
            <br className="hidden sm:block" />{" "}
            <span className="text-brand-orange-dark">for every estimate.</span>
          </h1>

          <p className="max-w-[46rem] text-[clamp(1.0625rem,0.65vw+1rem,1.35rem)] leading-[1.45] text-landing-ink-secondary text-pretty">
            Build from your own prices, components, suppliers, and templates. Keep revisions on the
            record. Share proposals clients can approve.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={primaryHref}
              data-landing-cta="primary"
              className="inline-flex min-h-12 items-center rounded-landing-pill bg-brand-orange px-6 text-sm font-semibold uppercase tracking-normal text-white transition hover:bg-brand-orange-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-landing-canvas"
            >
              {primaryLabel}
            </Link>
            <Link
              href="/contact"
              data-landing-cta="secondary"
              className="inline-flex min-h-12 items-center rounded-landing-pill border border-landing-hairline-strong bg-surface px-6 text-sm font-semibold uppercase tracking-normal text-landing-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-landing-canvas"
            >
              Book a walkthrough
            </Link>
          </div>

          <ul className="flex flex-wrap gap-2 pt-2" aria-label="Core Archestimator mechanics">
            {["Estimate tree", "Reusable library", "Revision record", "Proposal link"].map((item) => (
              <li
                key={item}
                className="gsap-material-capsule rounded-landing-pill border border-landing-hairline-strong bg-white/70 px-3 py-2 font-numeric text-[11px] uppercase tracking-normal text-landing-ink-secondary shadow-[inset_0_1px_rgba(255,255,255,0.68)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="gsap-hero-plate dashboard-glass-warm relative hidden min-h-[560px] overflow-hidden rounded-landing-panel border border-landing-hairline-strong p-3 lg:block"
          data-hero-brand-panel="true"
        >
          <HeroSignalField />
          <div className="relative z-10">
            <BrandComposition variant="hero" label="Archestimator brand composition" />
          </div>
        </div>
      </div>
    </section>
  );
}
