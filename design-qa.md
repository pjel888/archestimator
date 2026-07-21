# Public Landing Design QA

## Scope

- **Baseline:** `.wrangler/tmp/new-landing-design-qa/01-production-baseline-desktop.png`
- **Implementation captures:**
  - `.wrangler/tmp/new-landing-design-qa/03-local-hero-desktop.png`
  - `.wrangler/tmp/new-landing-design-qa/02-local-product-desktop.png`
  - `.wrangler/tmp/new-landing-design-qa/04-local-mobile.png`
- **Intentional differences from the baseline:** a shorter hero, a persistent
  pre-release beta announcement, beta-specific CTA copy, and a more direct
  estimate-to-decision narrative.

## Checks

- Desktop header has one clear public path: `Sign in` plus `Request beta access`.
- Signed-in header behavior is covered by `new-landing-auth-cta.test.tsx`: only
  the `Open workspace` primary action remains after the auth hint resolves.
- The beta banner stays readable at desktop width and stacks into a clear
  message-plus-link treatment on a 390px viewport.
- The hero fits its new message into two balanced lines on desktop and mobile;
  the CTA remains immediately visible without competing with the announcement.
- Product cards retain hierarchy and readable contrast at the desktop product
  section capture.
- Hover checks confirm the CTA lifts and scales, while primary navigation
  underlines expand without affecting layout. Reduced-motion rules also cover
  the new underline and banner link.

## Result

`passed` — no remaining P0, P1, or P2 visual issues were found in the reviewed
public signed-out desktop and mobile states. Authenticated browser capture was
not available without a user session; the focused auth CTA test verifies that
state instead.
