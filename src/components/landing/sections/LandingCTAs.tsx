import Link from "next/link";
import { cn } from "@/lib/ui/cn";

/**
 * LandingCTAs — the canonical CTA pair for the landing surface.
 *
 * Per keystone decision D-1 + the locked CTA decision:
 *   Primary   = "Start free"   (self-serve Free-tier signup)
 *   Secondary = "Book a walkthrough" (founder-led motion, ungated)
 *
 * L-FUN-2 GATED: until beta-onboarding + self-serve is enabled, "Start free"
 * routes to /login (the magic-link action already doubles as signup via
 * shouldCreateUser:true) rather than /signup. This is the carried-default
 * branch — never silently resolved. When L-FUN-2 closes "on", flip the href
 * constant to "/signup" in one place.
 *
 * `isLoggedIn` swaps the primary to "Open workspace" → /workshop.
 *
 * RSC-safe: these are <Link>s, no client JS.
 */

// L-FUN-2 GATED — carried default. Flip to "/signup" when self-serve is enabled.
export const START_FREE_HREF = "/login";
export const BOOK_WALKTHROUGH_HREF = "/contact";

export interface LandingCTAsProps {
  isLoggedIn?: boolean;
  /** "row" (hero/final-cta) | "stack" (mobile). */
  layout?: "row" | "stack";
  className?: string;
  /** Hide the secondary CTA (used in the header where space is tight). */
  secondary?: boolean;
  /** Analytics location tag (passed to data attribute, not a track call — RSC). */
  location?: "hero" | "final-cta" | "header";
}

export function LandingCTAs({
  isLoggedIn = false,
  layout = "row",
  className,
  secondary = true,
  location = "hero",
}: LandingCTAsProps) {
  const primaryHref = isLoggedIn ? "/workshop" : START_FREE_HREF;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Start free";
  return (
    <div
      className={cn(
        "flex flex-wrap gap-[var(--landing-space-sm)]",
        layout === "stack" && "flex-col",
        layout === "stack" && "sm:flex-row",
        className,
      )}
      data-landing-cta-group={location}
    >
      <Link
        href={primaryHref}
        data-landing-cta="primary"
        data-landing-cta-location={location}
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-landing-pill",
          "bg-brand-orange px-[var(--landing-space-lg)]",
          "text-[13px] font-semibold uppercase tracking-landing-label text-white",
          "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-landing-canvas",
          "hover:bg-brand-orange-dark",
        )}
      >
        {primaryLabel}
      </Link>
      {secondary ? (
        <Link
          href={BOOK_WALKTHROUGH_HREF}
          data-landing-cta="secondary"
          data-landing-cta-location={location}
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-landing-pill",
            "border border-landing-hairline-strong bg-surface px-[var(--landing-space-lg)]",
            "text-[13px] font-semibold uppercase tracking-landing-label text-landing-ink",
            "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-landing-canvas",
            "hover:bg-surfaceMuted",
          )}
        >
          Book a walkthrough
        </Link>
      ) : null}
    </div>
  );
}
