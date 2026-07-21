import type { CSSProperties, ReactNode } from "react";

import { AuthGlassPanel } from "@/components/auth/AuthGlassPanel";
import { AuthStatusBanner } from "@/components/auth/AuthStatusBanner";
import { PreReleaseBetaBanner } from "@/components/landing-new/PreReleaseBetaBanner";

/**
 * AuthLayout - the full-page 2-column brand-forward shell for the auth surface
 * (keystone decision D-2 / `23-AUTH-EXPERIENCE.md`).
 *
 *   ┌────────────────────────┬──────────────────────┐
 *   │ LEFT  ~52%             │ RIGHT                │
 *   │ AuthGlassPanel         │ AuthStatusBanner     │
 *   │ (brand copy +          │   (aria-live, first) │
 *   │  decorative panel)     │ children (the form,  │
 *   │                        │  in a raised card)   │
 *   └────────────────────────┴──────────────────────┘
 *
 * Layout: `min-h-dvh`; the outer grid spans the FULL viewport width -
 * `lg:grid-cols-[1.05fr_1fr]` with no max-width container and no side
 * gutters, so the left brand wash runs truly edge-to-edge and the page is
 * exactly two columns. The form column content is `max-w-[480px]` and
 * identical across breakpoints (no layout shift). `min-h-dvh` avoids the
 * iOS Safari viewport jump of `100vh`.
 *
 * The form card is a single clean white surface - one hairline border, one
 * soft shadow, generous padding. No nested bezels; the page reads as one
 * seamless composition (full-bleed brand wash left, canvas right).
 *
 * Entrance motion is pure CSS (`.auth-enter` / `.auth-panel-enter` in
 * globals.css): one cubic-bezier curve, transform+opacity only, collapses to
 * an instant settled state under `prefers-reduced-motion`.
 *
 * Responsive collapse (<1024px): the LEFT panel collapses from the `full`
 * brand slab to a `compact` brand header. Implemented as two AuthGlassPanel
 * instances - the `full` is visible at `lg:` only; the `compact` is visible
 * below `lg:`. The hidden one carries BOTH `aria-hidden` AND Tailwind
 * `hidden` so it is removed from both the a11y tree and layout in one move.
 *
 * RSC-safe: no hooks, no "use client".
 */
export interface AuthLayoutProps {
  children: ReactNode;
  route: "login" | "signup";
  sent?: string | null;
  errorCode?: string | null;
  statusSlot?: ReactNode;
}

export function AuthLayout({ children, route, sent, errorCode, statusSlot }: AuthLayoutProps) {
  return (
    <main
      data-auth-route={route}
      className="grid min-h-dvh grid-rows-[auto_1fr] bg-warm-canvas text-landing-ink"
    >
      <PreReleaseBetaBanner />
      <div className="grid min-h-0 w-full lg:grid-cols-[1.05fr_1fr]">
        {/* LEFT column - brand panel.
            - full:    visible at lg: and above (a full-height brand slab)
            - compact: visible below lg: (a slim brand header)
            The off-breakpoint instance is removed via Tailwind `hidden`/`lg:hidden`
            (NOT the HTML hidden attribute, which would override the responsive
            un-hide). */}
        <div className="hidden lg:block">
          <AuthGlassPanel variant="full" className="h-full min-h-0" />
        </div>
        <div className="block lg:hidden">
          <AuthGlassPanel variant="compact" />
        </div>

        {/* RIGHT column - status banner (announced first) + the form card. */}
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="flex w-full max-w-[480px] flex-col gap-5">
            {statusSlot ?? <AuthStatusBanner sent={sent} errorCode={errorCode} />}

            {/* Single clean white surface - one soft shadow, generous
                padding, no nested bezels. */}
            <div className="auth-enter" style={{ "--auth-delay": "90ms" } as CSSProperties}>
              <div className="flex flex-col gap-8 rounded-[16px] border border-landing-hairline bg-white p-8 shadow-[0_1px_2px_rgba(23,23,23,0.04),0_24px_48px_-24px_rgba(23,23,23,0.12)] sm:p-10">
                {children}
              </div>
            </div>

            {/* Quiet expectation-setter below the card - passwordless is the
                product's real auth model, so say it out loud. */}
            <p
              className="auth-enter text-center text-[13px] leading-5 text-landing-ink-muted"
              style={{ "--auth-delay": "220ms" } as CSSProperties}
            >
              Passwordless sign-in. A secure link lands in your inbox.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
