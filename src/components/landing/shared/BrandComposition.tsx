import type { CSSProperties } from "react";
import { cn } from "@/lib/ui/cn";

/**
 * BrandComposition - pure-presentational RSC that hints at the app's
 * liquid-glass material without ever faking a product screenshot (D-2,
 * `23-AUTH-EXPERIENCE.md` §1.2, doc 03 §1.1).
 *
 * The composition is built entirely from the real dashboard gradients
 * (`--grad-hero-continue`, `--grad-hero-create`) + a material-frost SVG
 * tile (zero raster). It is the "tasteful brand composition" D-2 mandates
 * for the hero material panel and the auth left panel.
 *
 * RSC-safe: no hooks, no "use client". `aria-hidden` by default - it is
 * decorative brand, not information.
 *
 * Variants:
 *  - "hero":        the homepage first-viewport material panel
 *  - "auth-panel":  the LEFT column of the full-page 2-col auth surface
 *  - "og":          tight composition sized for OG image generation
 */
export type BrandCompositionVariant = "hero" | "auth-panel" | "og";

export interface BrandCompositionProps {
  variant?: BrandCompositionVariant;
  className?: string;
  /** Decorative by default; pass `label` only when a screen-reader note is wanted. */
  label?: string;
}

const HEIGHT_CLASS: Record<BrandCompositionVariant, string> = {
  hero: "min-h-[320px] sm:min-h-[440px] lg:h-[540px]",
  "auth-panel": "h-full min-h-[480px]",
  og: "h-[420px]",
};

export function BrandComposition({
  variant = "hero",
  className,
  label,
}: BrandCompositionProps) {
  return (
    <div
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      data-landing-brand-composition={variant}
      className={cn(
        "relative isolate overflow-hidden rounded-landing-panel border border-landing-hairline-strong",
        // The Glass Brand surface (doc 03 §4.2): frosted-white tint over the
        // canvas wash, with the deferred-glass arming pattern gated on data-glass.
        "dashboard-glass",
        HEIGHT_CLASS[variant],
        className,
      )}
      style={
        {
          // The two real dashboard gradients carry the brand-orange → amber → peach
          // bloom. They are token-anchored in globals.css, not magic numbers.
          backgroundImage:
            "var(--grad-hero-continue), var(--grad-hero-create)",
          backgroundBlendMode: "screen",
        } satisfies CSSProperties
      }
    >
      {/* Material-frost tile - abstract grid hinting at the estimate tree +
          component-library dock + activity rails. Pure SVG, zero raster,
          no feTurbulence/feDisplacementMap (Hallmark/AI-slop ban, doc 04 §4.1). */}
      <svg
        className="pointer-events-none absolute inset-0 size-full opacity-[0.18] mix-blend-multiply"
        viewBox="0 0 360 360"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern
            id="landing-brand-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M40 0H0V40"
              fill="none"
              stroke="var(--ink)"
              strokeOpacity="0.12"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="360" height="360" fill="url(#landing-brand-grid)" />
        {/* Three abstract "rails" - the estimate tree / library / proposal handoff,
            hinted not labelled. Signal-orange presence mark on the active rail (D-3). */}
        <rect x="32" y="64" width="6" height="232" rx="3" fill="var(--brand-orange)" opacity="0.85" />
        <rect x="78" y="104" width="6" height="168" rx="3" fill="var(--ink)" opacity="0.18" />
        <rect x="124" y="88" width="6" height="200" rx="3" fill="var(--ink)" opacity="0.18" />
        {/* A faint node cluster - the "commercial graph" without naming it. */}
        <circle cx="172" cy="132" r="5" fill="var(--brand-orange-dark)" opacity="0.55" />
        <circle cx="200" cy="180" r="4" fill="var(--ink)" opacity="0.22" />
        <circle cx="232" cy="220" r="4" fill="var(--ink)" opacity="0.22" />
        <line x1="172" y1="132" x2="200" y2="180" stroke="var(--ink)" strokeOpacity="0.16" strokeWidth="1" />
        <line x1="200" y1="180" x2="232" y2="220" stroke="var(--ink)" strokeOpacity="0.16" strokeWidth="1" />
      </svg>
      {/* Soft top-down wash so text-on-glass keeps AA contrast over the gradient peak
          (doc 03 §4.5 - worst-case backdrop is the amber peak). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.12)_42%,rgba(255,255,255,0)_100%)]"
      />
    </div>
  );
}
