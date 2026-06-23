import Link from "next/link";
import { cn } from "@/lib/ui/cn";

/**
 * Canonical public CTA pair for the marketing shell.
 * Signed-out visitors request access or book a walkthrough.
 * Signed-in visitors go directly to the workspace.
 */

export const REQUEST_EARLY_ACCESS_HREF = "/contact?intent=early-access";
export const BOOK_WALKTHROUGH_HREF = "/contact?intent=walkthrough";

export interface LandingCTAsProps {
  isLoggedIn?: boolean;
  /** "row" (hero/final-cta) | "stack" (mobile). */
  layout?: "row" | "stack";
  className?: string;
  /** Hide the secondary CTA (used in the header where space is tight). */
  secondary?: boolean;
  /** Analytics location tag, passed to a data attribute only. */
  location?: "hero" | "final-cta" | "header";
}

export function LandingCTAs({
  isLoggedIn = false,
  layout = "row",
  className,
  secondary = true,
  location = "hero",
}: LandingCTAsProps) {
  const primaryHref = isLoggedIn ? "/workshop" : REQUEST_EARLY_ACCESS_HREF;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Request early access";
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
