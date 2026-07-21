import Link from "next/link";
import type { CSSProperties } from "react";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { cn } from "@/lib/ui/cn";

/**
 * AuthGlassPanel — the LEFT column of the full-page 2-col auth surface
 * (keystone decision D-2 / `23-AUTH-EXPERIENCE.md`).
 *
 * Composition: the real dashboard gradients as a seamless full-bleed wash
 * directly on the column — edge-to-edge, no inset box, no corner radius, no
 * illustration, no fake product screenshots, no stock photos (D-2 / radical
 * honesty) — with REAL, honest product copy layered on top: the brand slab,
 * a short editorial statement, and the three capabilities the product
 * actually ships. Decorative layers stay `aria-hidden`; the copy is real
 * content and remains in the a11y tree.
 *
 * RSC-safe: no hooks, no "use client".
 *
 * Variants:
 *  - "full":     the brand panel visible at `lg:` and above.
 *  - "compact":  the slim brand header the panel collapses to below `lg:`.
 */
export type AuthGlassPanelVariant = "full" | "compact";

export interface AuthGlassPanelProps {
  variant?: AuthGlassPanelVariant;
  className?: string;
}

const CAPABILITIES: Array<{ title: string; detail: string }> = [
  {
    title: "Structured estimates",
    detail: "Itemized estimate trees, not spreadsheets.",
  },
  {
    title: "A cost library that stays yours",
    detail: "Your prices, your suppliers, reusable everywhere.",
  },
  {
    title: "Client-ready proposals",
    detail: "Documents your clients understand and trust.",
  },
];

export function AuthGlassPanel({ variant = "full", className }: AuthGlassPanelProps) {
  if (variant === "compact") {
    return (
      <div className={cn("relative isolate overflow-hidden", className)}>
        {/* Thin brand strip echoing the full panel's bloom. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--brand-orange)_0%,var(--brand-amber)_55%,var(--brand-peach)_100%)] opacity-[0.14]"
        />
        <div className="relative z-10 flex items-center justify-between px-5 py-4">
          <Link
            href="/"
            aria-label="Archestimator home"
            className="inline-flex items-center rounded-landing-dense outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
          >
            <ArchestimatorLogo
              tone="dark"
              markSize={26}
              showWordmark={true}
              className="text-landing-ink"
              wordmarkClassName="text-[14px] font-medium text-landing-ink"
            />
          </Link>
          <span aria-hidden="true" className="text-[12px] text-landing-ink-secondary">
            Estimating &amp; proposal workspace
          </span>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="About Archestimator"
      className={cn(
        "auth-panel-enter relative isolate flex h-full min-h-[560px] flex-col justify-between overflow-hidden p-10 xl:p-12",
        className,
      )}
      style={{
        // Seamless full-bleed brand wash: the real dashboard gradients
        // (token-anchored) directly on the column — edge-to-edge, no inset
        // box, no corner radius, no illustration.
        backgroundColor: "var(--warm-canvas)",
        backgroundImage: "var(--grad-hero-continue), var(--grad-hero-create)",
        backgroundBlendMode: "screen",
      }}
    >
      {/* Soft top-down wash so the ink copy keeps AA contrast over the
          gradient peak. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.12)_42%,rgba(255,255,255,0)_100%)]"
      />

      {/* Signal-orange logo slab pinned to the top; links back to the site. */}
      <div className="relative z-10">
        <Link
          href="/"
          aria-label="Archestimator home"
          className="inline-flex items-center gap-2 rounded-landing-dense bg-brand-orange px-3 py-2 outline-none transition-colors duration-200 hover:bg-brand-orange-dark focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-orange"
        >
          <ArchestimatorLogo
            tone="light"
            markSize={26}
            showWordmark={true}
            wordmarkClassName="text-[14px] font-medium text-white"
          />
        </Link>
      </div>

      {/* Honest product copy — real content, not decoration. */}
      <div className="relative z-10 flex flex-col gap-8">
        <p
          className="auth-enter max-w-[26ch] font-display text-[clamp(1.75rem,2.4vw,2.5rem)] leading-[1.12] tracking-[0.02em] text-landing-ink"
          style={{ "--auth-delay": "120ms" } as CSSProperties}
        >
          Build the number.
          <br />
          Stand behind it.
        </p>

        <ul className="flex flex-col">
          {CAPABILITIES.map((capability, index) => (
            <li
              key={capability.title}
              className="auth-enter flex gap-4 border-t border-landing-ink/10 py-4"
              style={{ "--auth-delay": `${200 + index * 70}ms` } as CSSProperties}
            >
              <span
                aria-hidden="true"
                className="mt-[7px] size-1.5 shrink-0 rounded-[1px] bg-brand-orange"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-medium leading-5 text-landing-ink">
                  {capability.title}
                </span>
                <span className="text-[14px] leading-5 text-landing-ink-secondary">
                  {capability.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p
          className="auth-enter text-[13px] leading-5 text-landing-ink-secondary"
          style={{ "--auth-delay": "430ms" } as CSSProperties}
        >
          The estimating and proposal workspace for contractors, estimators,
          and design-build teams.
        </p>
      </div>
    </section>
  );
}
