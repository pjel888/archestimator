# Lenis Smooth Scroll and Placeholder Company Proof Plan

**Date:** 2026-05-21
**Status:** Planning only; no code implementation and no package installation yet.
**Scope:** Public `/` landing page only.
**User update:** Try Lenis for landing-page smooth scrolling. Placeholder company list is acceptable first.

## Decisions

1. Use `lenis` as the preferred smooth-scroll spike package instead of GSAP for page-level scroll feel.
2. Keep GSAP deferred for choreographed section timelines only.
3. Allow placeholder company/logo entries during the first implementation slice, but treat them as scaffolding data, not real social proof.
4. Do not let Lenis affect authenticated `/workshop` product surfaces.
5. Keep the accepted hero locked.

## Current Lenis research

Checked 2026-05-21:

- Website: `https://www.lenis.dev/`
- Repository: `https://github.com/darkroomengineering/lenis`
- Package: `lenis`
- Current npm version from `npm view`: `1.3.23`
- License from npm metadata: `MIT`
- Package description: `How smooth scroll should be`
- React entrypoint documented by the project: `lenis/react`

Relevant Lenis docs findings:

- Install with `npm i lenis`; for this repo use `bun add lenis` if implementation is approved.
- Basic core import is `import Lenis from 'lenis'`.
- React usage is `import { ReactLenis, useLenis } from 'lenis/react'`.
- Recommended CSS import is `import 'lenis/dist/lenis.css'`.
- `ReactLenis root` uses the default `<html>` scroll container and makes the instance globally accessible to `useLenis` while mounted.
- Useful options include `autoRaf`, `anchors`, `lerp`, `smoothWheel`, `wheelMultiplier`, `touchMultiplier`, `prevent`, and `allowNestedScroll`.
- Lenis documents nested-scroll guard attributes such as `data-lenis-prevent`, `data-lenis-prevent-wheel`, and `data-lenis-prevent-touch`.
- Documented limitations include no native CSS scroll-snap support without `lenis/snap`, Safari frame-rate caps, iframe wheel-event limits, possible fixed-position lag on older Mac Safari, iOS touch caveats with `syncTouch`, and nested-scroll configuration requirements.

## Package decision

### Recommended for this landing pass

Use Lenis as a controlled landing-page enhancement:

```bash
bun add lenis
```

Use it only when the implementation slice is explicitly approved. Do not install during planning.

### Why Lenis fits better than GSAP here

- The immediate need is smoother page feel and anchor movement, not complex timelines.
- The company carousel itself should still be CSS-driven, not Lenis-driven.
- Lenis can improve the long-form landing scroll rhythm without forcing a GSAP dependency.
- GSAP remains available later if product-story sections need choreographed scroll timelines.

### Why not use Lenis everywhere

Authenticated workshop pages use dense nested panes, pinned headers/footers, sidebars, and independent scroll containers. Smooth-scroll interception can fight that model. Scope Lenis to `/` only unless Philip explicitly approves a separate app-shell experiment.

## Proposed implementation shape for later

### Files likely involved

- Create: `src/components/landing/LandingSmoothScrollProvider.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx` if the package CSS must be imported globally
- Modify: `src/components/landing/CompanyProofCarouselSection.tsx`
- Modify/create: `src/components/landing/company-proof-data.ts`
- Optional tests: `tests/vitest/landing-page.test.tsx`
- Optional browser test: `e2e/landing-page.spec.ts`

### Provider pattern

Use a small client component so Lenis does not leak through all public/app surfaces:

```tsx
'use client';

import { ReactLenis } from 'lenis/react';
import { useEffect, useState } from 'react';

export function LandingSmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  if (reducedMotion) return <>{children}</>;

  return (
    <>
      <ReactLenis
        root
        options={{
          anchors: true,
          lerp: 0.08,
          smoothWheel: true,
          wheelMultiplier: 0.9,
          touchMultiplier: 1,
        }}
      />
      {children}
    </>
  );
}
```

Notes:

- Final option values should be tuned in browser QA, not guessed as final.
- If sticky-header anchors need offset, use Lenis `anchors` options or section-level `scroll-margin-top`.
- If the landing page later contains nested scroll elements, add `data-lenis-prevent` to those elements rather than enabling expensive global nested-scroll detection by default.
- If `lenis/dist/lenis.css` must be imported in `src/app/layout.tsx`, keep Lenis activation itself scoped to the landing page provider.

## Placeholder company proof policy

Philip approved placeholders first. This changes the implementation path but not the production truth standard.

### Allowed in first implementation slice

A placeholder company list may be used to establish layout, spacing, marquee timing, responsive behavior, and reduced-motion behavior.

Allowed placeholder fields:

```ts
export type CompanyProofLogo = {
  name: string;
  logoSrc?: string;
  initials?: string;
  websiteHref?: string;
  relationship: 'placeholder' | 'customer' | 'pilot-user' | 'design-partner' | 'internal-team';
  permissionConfirmed: boolean;
  isPlaceholder?: boolean;
  publicLabel: string;
};
```

Placeholder examples should be visibly generic in source data, such as:

- `Northline Builders`
- `Formworks Studio`
- `Civic Quantity Group`
- `Atlas Site Works`
- `Draftline Contractors`

### Required guardrails

- Placeholder data must be clearly named as placeholder data in code.
- Do not use real recognizable company logos unless permission is known.
- Do not claim `Trusted by`, `Used by`, or `Customers include` for placeholders.
- Preferred temporary section label: `Company proof carousel placeholder` in dev notes, or a neutral public label such as `Built for estimating teams like these` only if Philip accepts that wording.
- Before launch, replace placeholders with verified company proof or hide the section.
- Tests should make the placeholder state explicit so it cannot accidentally become an inflated production trust claim.

### Preferred rendering rule

During early implementation, allow placeholders only behind an explicit constant:

```ts
const ALLOW_PLACEHOLDER_COMPANY_PROOF = process.env.NODE_ENV !== 'production';
```

Production behavior:

- render verified logos only; or
- hide the carousel if no verified entries exist.

If Philip explicitly wants public placeholder-style fictive companies in production for aesthetics, the copy must not imply real usage. That is a separate content decision, not the default.

## Lenis + carousel relationship

Lenis controls vertical page scroll feel. It should not drive the logo carousel.

Company carousel still uses:

- CSS marquee / track translation;
- duplicated visual track with duplicate content `aria-hidden`;
- `prefers-reduced-motion` fallback;
- no GSAP;
- no Lenis horizontal/infinite scroll feature.

## Testing and QA plan

### Static/source checks

- Confirm `lenis` appears in `package.json` only after approved implementation.
- Confirm Lenis provider is imported only by the landing page or a landing-only wrapper.
- Confirm no workshop/app route imports Lenis provider.
- Confirm placeholder company data is explicitly marked with `relationship: 'placeholder'` or `isPlaceholder: true`.
- Confirm production rendering does not claim real trust from placeholder entries.

### Browser QA

Check `/` at:

- 360–390px
- 414–430px
- 768px
- 1280–1440px
- 1728px+

For each viewport:

- hero remains unchanged;
- page scroll feels smoother but not sluggish;
- anchor links still land at the right sections;
- company carousel appears immediately after the hero;
- carousel spans the viewport without horizontal page overflow;
- reduced-motion disables Lenis and carousel auto-motion;
- keyboard focus order remains normal;
- no nested scroll trap appears in header/menu/CTA interactions.

### Validation commands after implementation

```bash
git diff --check
bun run validate
bun run build
```

If browser coverage is added:

```bash
bun run test:e2e -- landing-page
```

## Stop conditions

Stop and reassess if:

- Lenis causes any app/workshop scroll behavior change;
- reduced-motion users still receive smoothed or continuous scrolling;
- anchor navigation becomes inaccurate under the sticky header;
- carousel placeholder wording reads as real social proof;
- Lenis introduces hydration/runtime errors in Next/React;
- browser QA shows sluggish, seasick, or over-designed scroll feel.

## Updated implementation sequence

1. Confirm the hero remains locked.
2. Add placeholder-safe company carousel data and full-width carousel section.
3. Add Lenis landing-only smooth-scroll provider as an enhancement.
4. Containerize the remaining post-carousel sections.
5. QA motion/reduced-motion/anchor behavior.
6. Replace placeholders with verified company proof before production social-proof claims.
