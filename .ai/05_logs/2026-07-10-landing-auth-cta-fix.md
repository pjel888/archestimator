# Landing auth CTA fix — ownership (2026-07-10)

## Intent
Fix logged-in users still seeing "Sign in" on the CDN-cached static landing page.

## Files owned by this lane
- `src/lib/landing/landing-auth-session-cookie.ts` — shared cookie-presence helper
- `src/lib/landing/get-landing-auth-state.ts` — server helper re-export
- `src/lib/landing/use-landing-auth-hint.ts` — client hint hook
- `src/app/api/landing/auth-hint/route.ts` — no-store display-only hint endpoint
- `src/components/landing-v3/ArchestimatorLandingPage.tsx` — consume client hint
- `src/components/landing/LandingHeader.tsx` — consume client hint on marketing shells
- `src/components/landing/PublicPageShell.tsx` — stop forcing logged-out CTAs
- `src/components/landing/sections/LandingCTAs.tsx` / `FinalCtaSection.tsx`
- `src/app/page.tsx` — stop hardcoding `isLoggedIn={false}`
- `tests/vitest/landing-auth-cta-wiring.test.ts`
- `tests/vitest/landing-auth-hint-client.test.tsx`

## Must not touch
- Unrelated `.ai/03_plans/**` dirty worktree files from other agents
- Better Auth session validation / workshop fail-closed gates

## Status
Implemented + local vitest evidence. Playwright auth e2e re-run outside sandbox.
Browser retest with a real session recommended for AUTH-LAND-002/003.
