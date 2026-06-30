import type { ReactNode } from "react";

import { AuthGlassPanel } from "@/components/auth/AuthGlassPanel";
import { AuthStatusBanner } from "@/components/auth/AuthStatusBanner";

/**
 * AuthLayout — the full-page 2-column brand-forward shell for the auth surface
 * (keystone decision D-2 / `23-AUTH-EXPERIENCE.md`).
 *
 *   ┌────────────────────────┬──────────────────────┐
 *   │ LEFT  ~52%             │ RIGHT                │
 *   │ AuthGlassPanel         │ AuthStatusBanner     │
 *   │ (decorative brand,     │   (aria-live, first) │
 *   │  aria-hidden)          │ children (the form)  │
 *   └────────────────────────┴──────────────────────┘
 *
 * Layout: `min-h-screen` over the `bg-warm-canvas` canvas wash; outer grid
 * `lg:grid-cols-[1.1fr_1fr]` in a centered `max-w-[1280px]` container. The
 * fields column is `max-w-[440px]` and identical across breakpoints (no layout
 * shift).
 *
 * Responsive collapse (<768px): the LEFT panel collapses from the `full` brand
 * slab to a `compact` ~120px brand header. Implemented as two AuthGlassPanel
 * instances — the `full` is visible at `lg:` only; the `compact` is visible
 * below `lg:`. The hidden one carries BOTH `aria-hidden` AND `hidden` so it is
 * removed from both the a11y tree and layout in one move.
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
      className="min-h-screen bg-warm-canvas text-landing-ink"
    >
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col gap-2 px-4 py-4 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-2">
        {/* LEFT column — decorative brand panel.
            - full:   visible at lg: and above (a full-height brand slab)
            - compact: visible below lg: (a ~120px brand header)
            The off-breakpoint instance is removed via Tailwind `hidden`/`lg:hidden`
            (NOT the HTML hidden attribute, which would override the responsive
            un-hide). AuthGlassPanel itself is aria-hidden; the wrapper stays in
            the a11y tree only when visible. */}
        <div className="hidden lg:block">
          <AuthGlassPanel variant="full" className="h-full min-h-0" />
        </div>
        <div className="block lg:hidden">
          <AuthGlassPanel variant="compact" />
        </div>

        {/* RIGHT column — status banner (announced first) + the form. */}
        <div className="flex flex-1 items-center">
          <div className="mx-auto flex w-full max-w-[440px] flex-col gap-6 py-6">
            {statusSlot ?? <AuthStatusBanner sent={sent} errorCode={errorCode} />}
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
