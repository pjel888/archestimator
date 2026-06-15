# Landing Page Motion and Microinteraction Plan

**Date:** 2026-05-21
**Status:** Planning only; Lenis/package-carousel slice has since been implemented, but functional-tabs/reveal work is not implemented yet.
**Scope:** Public `/` landing page below the accepted hero.
**Hard boundary:** Do not change the hero/above-fold animation or visual treatment in this pass.

## Purpose

Explore interactivity for the landing page while protecting performance, accessibility, and the Archestimator brand tone. Motion should make the page feel clearer and more tactile, not more decorative.

## Current package state

From `package.json`, the app already uses:

- Next `16.2.6`
- React `19.2.4`
- Tailwind CSS v4 via CSS/theme files
- `three`
- `@firecms/neat`
- `@phosphor-icons/react`

Dedicated landing animation package state:

- `lenis` is installed and scoped to the public landing page through `LandingSmoothScrollProvider`.
- no `gsap`
- no `framer-motion`
- no `motion`
- no `animejs`
- no `react-spring`
- no `lottie`

## Recommendation

Do not add GSAP or any new animation package in the immediate interactivity pass. Lenis is already present for landing-only smooth-scroll feel. The next interactive layer should be functional product tabs plus CSS/Tailwind microinteractions and, if needed, one small IntersectionObserver reveal helper.

Recommended sequence:

1. Preserve the placeholder-safe full-width company carousel immediately after the locked hero.
2. Preserve the landing-only Lenis provider as a controlled smooth-scroll enhancement, not a global app-shell change.
3. Keep below-carousel content in focused middle containers.
4. Convert `ProductShowcaseSection` visual-only tabs into functional accessible tabs.
5. Replace visible placeholder media in `SolutionSection` with a credible static estimating visual.
6. Add CSS/Tailwind microinteractions for hover, focus, active states, and reveal/stagger.
7. Add a very small IntersectionObserver reveal helper only where it improves scanning rhythm.
8. Only run a GSAP spike if the page later needs choreographed scroll timelines, scrubbed product storytelling, SVG/path sequencing, or complex timeline control that CSS/IntersectionObserver/Lenis cannot handle cleanly.

This keeps the current pass focused: Lenis improves scroll feel; CSS handles the logo carousel; functional tabs add product proof; IntersectionObserver provides optional reveal rhythm; GSAP remains deferred for true timeline choreography.

## Package decision matrix

### CSS/Tailwind transitions

Use for:

- CTA hover/focus/active states;
- card hover lift;
- subtle border/accent changes;
- simple opacity/transform reveals with CSS classes;
- reduced-motion-safe defaults;
- full-width logo marquee animation with `prefers-reduced-motion` fallback.

Pros:

- no dependency;
- easiest to maintain;
- fastest path;
- aligns with current code style.

Cons:

- limited timeline orchestration;
- scroll-triggering still needs a small JS helper if reveal-on-enter is desired.

Decision: use first.

### IntersectionObserver reveal helper

Use for:

- section intro reveal;
- card stagger after entering viewport;
- one-time product preview emphasis.

Pros:

- tiny client island;
- lower overhead than scroll listeners;
- easy reduced-motion handling;
- enough for this landing page.

Cons:

- adds client component(s);
- needs tests/mocks for `IntersectionObserver`.

Decision: use only after the container pass if static page still feels flat.

### Lenis

Use for:

- smooth vertical page scrolling on the public landing page;
- calmer long-form scroll rhythm between below-hero sections;
- anchor-link smoothing if header links jump to sections.

Pros:

- lighter and more targeted than GSAP for page-scroll feel;
- official React entrypoint via `lenis/react`;
- documented recommended CSS via `lenis/dist/lenis.css`;
- supports `prefers-reduced-motion` gating through a small provider decision.

Cons:

- new dependency;
- global scroll interception can be risky if applied to dense app/workshop surfaces;
- nested scroll containers need `data-lenis-prevent` or a `prevent` option;
- Safari/iOS and iframe limitations must be browser-checked.

Decision: already implemented as a landing-only enhancement; preserve this scope and do not apply to `/workshop`.

Current package note: `lenis` is installed in this repo as `^1.3.23`. The active interactivity pass should not install additional animation packages.

### GSAP

Use for future spike only if:

- product story needs a scroll-scrubbed timeline;
- multiple elements must coordinate with precise sequencing;
- SVG/path/number/row animations become central to the landing pitch;
- CSS/IntersectionObserver creates brittle code.

Pros:

- excellent timeline control;
- proven for complex landing-page animation;
- ScrollTrigger can handle advanced scroll narratives.

Cons:

- new dependency and bundle cost;
- imperative cleanup needed in React/Next client islands;
- higher risk of over-animating a B2B estimating product;
- requires strict reduced-motion and no-JS fallback rules.

Decision: defer. Create a separate animation spike plan before installing.

### `motion` / Framer Motion successor package

Use if future component-level React animation is needed:

- stateful tabs;
- layout transitions;
- animated disclosure panels;
- small React interaction islands.

Pros:

- declarative React ergonomics;
- better fit than GSAP for component-state animations.

Cons:

- still a package addition;
- unnecessary for static reveal/hover work.

Decision: defer.

## Brand motion language

Motion should express:

- scattered → structured;
- hidden cost logic → visible cost logic;
- messy revisions → traceable revisions;
- estimate work → proposal handoff.

Motion should not express:

- spectacle;
- nightclub SaaS polish;
- fake urgency;
- toy-like bouncing;
- infinite decoration.

## Recommended interactions by section

### Page-level scroll feel

Motion plan:

- Use Lenis only on the public landing page if implementation is approved.
- Keep Lenis separate from the company carousel; Lenis handles vertical page scroll, while carousel motion remains CSS.
- Disable Lenis entirely for `prefers-reduced-motion: reduce`.
- Do not mount Lenis on `/workshop` or other dense app surfaces.
- Use `data-lenis-prevent` or a `prevent` option if future landing modals/menus/nested panes need native scrolling.

Avoid:

- applying Lenis globally in the root app shell;
- using Lenis to fake product proof or drive horizontal logo motion;
- using smooth scroll if anchor positioning becomes inaccurate or sluggish.

### CompanyProofCarouselSection

Motion plan:

- Use CSS marquee/track translation only; no GSAP required.
- Duplicate the logo track visually for seamless looping, but mark duplicate content `aria-hidden`.
- Pause on hover/focus only if logos are interactive links.
- In `prefers-reduced-motion: reduce`, stop auto-scroll and show a static/wrappable or manually scrollable logo row.
- Keep speed slow enough to read; the carousel is trust support, not a distraction.

Avoid:

- fake company proof in production;
- placeholder company data that is not visibly marked in source and guarded from production trust claims;
- fast ticker/news-crawl motion;
- 3D logo effects;
- scroll-scrubbing;
- forcing motion when reduced-motion is enabled.

### ProductShowcaseSection / ProductPreview

Required next interaction:

- convert the visual-only buttons into functional accessible tabs;
- use four credible static panels: Estimate Workspace, Component Library, Revision Intelligence, Proposal Comparisons;
- keep transitions subtle: opacity/translate only, roughly 250ms, reduced-motion instant swap;
- use real tab semantics and keyboard behavior;
- do not add scroll-scrubbed animation before tab content is useful.

Optional polish after tabs work:

- subtle panel entry build within the selected tab;
- row highlight that implies estimate logic being organized;
- small total-settle emphasis when a panel first appears.

Avoid:

- complex scroll-scrubbing before the product preview content is final;
- fake data counting that implies real project totals if they are illustrative.

### SecondaryClaimSection

Future motion ideas:

- intro fades in once;
- supporting pillars/cards reveal in a short stagger;
- no continuous loops.

### SolutionSection

Future motion ideas:

- card reveal following workflow order;
- hover/focus border accent using brand orange;
- tiny translateY lift, not large scale.

### EstimatorEngineSection

Future motion ideas:

- simple progress/flow line: build → revise → compare → export;
- sequence can be CSS plus IntersectionObserver;
- only escalate to GSAP if this becomes a real narrative animation.

### FeaturesSection

Future motion ideas:

- feature cards reveal in rows;
- hover/focus states emphasize the approved feature name;
- no distracting icon spinning or decorative loops.

### PartnerSection

Future motion ideas:

- calm reveal only;
- avoid motion that makes unsupported partner/proof claims feel like a trust-logo wall.

### PricingSection

Future motion ideas:

- CTA/card hover and focus polish;
- no animated price counters or urgency effects.

### FinalCTASection

Future motion ideas:

- final copy/CTA entrance after preceding section;
- button hover/focus polish;
- no aggressive pulse loop.

## Accessibility and reduced-motion gates

Required in any future implementation:

- Use `motion-safe:*` and `motion-reduce:*` Tailwind variants where possible.
- For users with `prefers-reduced-motion: reduce`:
  - content must render immediately;
  - transform/opacity reveal should be disabled;
  - no parallax;
  - no scroll-scrub;
  - no looping effects;
  - no continuous `requestAnimationFrame` effects.
- Do not hide content by default if JavaScript fails.
- Do not animate reading order or move focus targets.
- Hover states must have `focus-visible` equivalents.
- Interactive visual controls must have correct semantics or remain non-interactive.

## Performance guardrails

- Keep the landing mostly server-rendered.
- Add only small client islands where motion actually needs browser APIs.
- Use one shared IntersectionObserver pattern, not individual scroll listeners in every section.
- Animate `opacity` and `transform`; avoid layout properties, heavy blur, or large animated shadows.
- Use `will-change` sparingly and remove/avoid it after animation when possible.
- Do not add more persistent RAF loops below the hero.
- Do not introduce `VoxelPaperBackground` below the hero in this pass.
- Check for mobile CLS and horizontal overflow after transforms.

## Likely future files if motion is implemented

Possible new helper:

- `src/components/landing/MotionReveal.tsx`

Possible style updates:

- `src/app/globals.css` for shared reveal classes/keyframes if Tailwind utilities are not enough.

Likely touched landing files:

- `src/components/landing/ProductPreview.tsx`
- `src/components/landing/HeroSection.tsx` only for `ProductShowcaseSection`, not `HeroSection`.
- `src/components/landing/SecondaryClaimSection.tsx`
- `src/components/landing/SolutionSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/FinalCTASection.tsx`
- `src/components/landing/CtaLink.tsx`
- `src/components/landing/SectionIntro.tsx`

Dormant files such as `EstimatorEngineSection.tsx`, `FeaturesSection.tsx`, and `PartnerSection.tsx` should not be edited unless a separate section-order decision explicitly reintroduces them.

Package files only if a later package decision is approved:

- `package.json`
- `bun.lock`

## Testing plan for future motion work

Vitest:

- render landing sections with motion helper;
- mock `IntersectionObserver`;
- verify reduced-motion mode renders content immediately;
- verify key copy remains present;
- verify controls with hover/focus changes remain accessible.

Playwright, optional:

- load `/` desktop and mobile;
- assert no horizontal overflow;
- emulate reduced motion and confirm no transform/reveal dependency;
- verify nav anchors and CTAs still work.

Validation commands:

```bash
git diff --check
bun run validate
bun run build
```

Optional E2E command if added:

```bash
bun run test:e2e -- landing-page
```

## GSAP spike criteria

Create a separate spike before installing GSAP. The spike must answer:

1. What specific animation cannot be done cleanly with CSS/IntersectionObserver?
2. Which section owns the timeline?
3. How much client JS does it add?
4. How does it behave under `prefers-reduced-motion: reduce`?
5. What is the no-JS fallback?
6. Does it improve comprehension of construction estimating, or is it decoration?

If the answer to item 6 is decoration, do not add GSAP.

## Definition of done for motion planning

- Container/focused layout remains the first implementation priority.
- Motion is treated as progressive enhancement, not a dependency for understanding content.
- No package is added without a specific spike and acceptance criteria.
- Reduced-motion behavior is specified before implementation.
- Hero remains unchanged.
