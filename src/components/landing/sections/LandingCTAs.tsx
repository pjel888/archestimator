"use client";

import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { useLandingAuthHint } from "@/lib/landing/use-landing-auth-hint";

/**
 * Canonical public CTA pair for the marketing shell.
 * Signed-out visitors request access or book a walkthrough.
 * Signed-in visitors go directly to the workspace.
 */

const START_HREF = "/contact?intent=started";
const BOOK_WALKTHROUGH_HREF = "/contact?intent=walkthrough";

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
  isLoggedIn: isLoggedInProp,
  layout = "row",
  className,
  secondary = true,
  location = "hero",
}: LandingCTAsProps) {
  const isLoggedIn = useLandingAuthHint(isLoggedInProp);
  const primaryHref = isLoggedIn ? "/workshop" : START_HREF;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Start with an estimate";
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
      <ButtonLink
        href={primaryHref}
        data-landing-cta="primary"
        data-landing-cta-location={location}
        variant="plain"
        size="lg"
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-landing-pill",
          "bg-brand-orange px-[var(--landing-space-lg)]",
          "!text-[13px] !font-semibold uppercase tracking-landing-label text-white",
          "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-landing-canvas",
          "hover:bg-brand-orange-dark",
        )}
      >
        {primaryLabel}
      </ButtonLink>
      {secondary ? (
        <ButtonLink
          href={BOOK_WALKTHROUGH_HREF}
          data-landing-cta="secondary"
          data-landing-cta-location={location}
          variant="plain"
          size="lg"
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-landing-pill",
            "border border-landing-hairline-strong bg-surface px-[var(--landing-space-lg)]",
            "!text-[13px] !font-semibold uppercase tracking-landing-label text-landing-ink",
            "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-landing-canvas",
            "hover:bg-surfaceMuted",
          )}
        >
          Book a walkthrough
        </ButtonLink>
      ) : null}
    </div>
  );
}
