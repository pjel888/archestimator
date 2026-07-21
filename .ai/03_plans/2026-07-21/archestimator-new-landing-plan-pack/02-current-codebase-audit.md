# Current Codebase Audit

## Audit scope

This audit covers the minimum direct and transitive surface needed to implement `/new` without disturbing the live landing route.

The implementation target is the current private repository `pjel888/archestimator` on `main`.

## Route baseline

### `src/app/new/page.tsx`

Observed blob revision: `e697b810738399313433d10d3d08f507e7351d93`

Current behavior:

- exports a simple `Metadata` object;
- sets `robots` to `index: false, follow: false`;
- sets `dynamic = "force-static"`;
- returns `null`.

This is an ideal isolated preview route. The implementation should replace the `null` return but preserve static rendering and noindex behavior.

### `src/app/page.tsx`

Observed blob revision: `b1d4095bffa4323a04f41fe31a3f6b0cc7bf1e84`

The live `/` route:

- uses `PublicPageShell` with `isHomePage={true}`;
- mounts an A/B provider;
- renders `ArchestimatorLandingPage` from `landing-v3`;
- owns its own header and footer.

Do not change this file. `/new` should use the same shell mode but its own new page component. Do not place `/new` inside the current A/B experiment.

## Public-route policy

`AGENTS.md` explicitly classifies `/new` as a public design surface. Public work may use a distinct composition, palette, typography, spacing, component strategy, and motion system. It does not need to inherit the authenticated application design system.

That freedom does not remove duties for:

- accessibility;
- truthfulness;
- privacy;
- framework correctness;
- performance;
- repository safety;
- test authorization.

The route can therefore have a new `landing-new` component folder and a scoped CSS system without modifying `DESIGN.md` or authenticated UI primitives.

## Current landing implementation

### `src/components/landing-v3/ArchestimatorLandingPage.tsx`

Observed blob revision: `ee628bead2b00200b638345d3b1be405e3fbf5ae`

The current landing is one large client component. It already includes:

- custom sticky navigation;
- a hero and product mockup;
- audience, problem, workflow, feature, comparison, specialty, proof, FAQ, final CTA, and footer sections;
- JSON-LD for the FAQ;
- auth-aware CTAs;
- GSAP entry and scroll effects.

It is useful as a source of reusable product proof and existing utilities, but it should not be cloned as the `/new` architecture. A new server-first composition will reduce unnecessary client ownership and make the new page easier to reason about.

### Current copy risk

The current landing contains useful product language but also lines that are not safe to inherit automatically, including numeric metric cards and stronger tracking/sign-off language. The new page must use the copy deck in this package, not copy current landing strings wholesale.

## Hero product demonstration

### `src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx`

Observed blob revision: `03f94e0502741b1ec00812b17d46bca2fbb28e58`

This is the key reusable asset.

It:

- mounts the real `EstimateWorkspaceClient`;
- uses sanitized project, estimate, tab, node, and row IDs;
- provides local library folders and construction-material rows;
- cycles through a deterministic drag/drop/replace state machine;
- updates the TanStack Query cache for the estimate tree;
- disables route synchronization;
- prevents pointer interaction;
- cleans up shared drag state on unmount.

Existing phase order:

```text
ready
hover-faucet
drag-faucet
faucet-inserted
hover-ceramic
drag-ceramic
ceramic-inserted
hover-fauxwood
drag-fauxwood
fauxwood-replaced
```

Existing durations range from roughly one to 2.4 seconds per phase. The visual cursor transition is 1.8 seconds.

### Reuse decision

Reuse this component instead of creating a fake dashboard or screenshot-only illustration.

The safest extension is a backward-compatible optional playback contract:

```ts
export type HeroEstimateWorkspaceMockupProps = {
  playback?: "loop" | "static";
  staticPhase?: HeroAnimationPhase;
  pauseWhenDocumentHidden?: boolean;
  className?: string;
};
```

Defaults must preserve current behavior:

```ts
playback = "loop"
staticPhase = "fauxwood-replaced"
pauseWhenDocumentHidden = false
```

The `/new` wrapper may set:

- loop mode only when the demonstration is in view, the document is visible, reduced motion is not requested, and the viewport is large enough;
- static final-state mode on mobile, reduced motion, or when autoplay should pause.

Do not change public exports or state semantics used by existing tests unless unavoidable. Do not change the sanitized data, product action behavior, or query keys simply to fit the new design.

### Query-provider dependency

`src/app/layout.tsx` mounts `AppProviders`, and `AppProviders` mounts a shared `QueryClientProvider`. The hero mockup can therefore render at `/new` without adding a route-specific provider.

### Drag-state lifecycle

The hero writes to shared estimate-workshop drag state while drag phases run and calls `endEstimateWorkshopDrag()` outside those phases and on unmount. Preserve this cleanup exactly. A playback pause must also end any active drag state so a hidden or static demo cannot leave the store in a dragging state.

## Current hero styling

### `src/components/landing-v3/landing-v3.module.css`

Observed blob revision: `5b76e7df0bb659a484d4a517cf7d36f10d0e02ae`

Relevant implementation details:

- the browser/product frame is separately styled from the product demo;
- the real workspace is rendered at `1780px × 900px` and scaled to its container with a container-query unit;
- controls and resizers are hidden inside the demo;
- cursor positions and item highlights are phase-specific;
- reduced-motion CSS disables transitions and continuous animation;
- the current frame is hidden entirely below `820px`.

### Required responsive correction

The `/new` design must not hide the product proof on mobile.

The new wrapper should provide its own frame and keep the inner demo visible in a reserved aspect-ratio viewport. Mobile should show a static, legible crop or scaled final state rather than autoplay. The old `landing-v3` mobile rule is scoped to the old wrapper and should not be broadened.

## Existing motion tools

### GSAP

The repository already depends on:

- `gsap`;
- `@gsap/react`.

Current landing motion uses:

- `HeroMountMotion.tsx` for a mount timeline;
- `HeroImageZoom.tsx` with `ScrollTrigger`;
- reduced-motion checks and scoped cleanup.

This is sufficient for `/new`.

### Motion/Framer Motion

The Archestimator package does not currently include the `motion` package used by Velora or Framer Motion used by LaunchPad. Do not add either solely to reproduce reference effects.

Use:

- CSS keyframes for ambient, shimmer, border, marquee, and simple hover effects;
- GSAP for coordinated entrance and scroll-progress behavior;
- `IntersectionObserver` and `document.visibilityState` for lifecycle control.

## Font and color baseline

`src/app/globals.css` already provides:

- `--font-geist`;
- `--font-roboto-mono`;
- `--brand-orange: #f24405`;
- `--brand-orange-dark: #c63804`;
- neutral surfaces and text tokens;
- warm amber/peach and cool/olive supporting tones.

The file’s own accessibility note states that signal orange is not suitable for normal small text against white. Use the darker orange for normal-size text and primary CTA fills. Use signal orange for large accents, decorative strokes, the logo mark, and controlled tinted surfaces.

The new route should define aliases and additional surface tokens inside its CSS-module root. Do not add global tokens for a public preview page unless a missing global contract is proven.

## Shell, consent, and analytics

### `src/components/landing/PublicPageShell.tsx`

Observed blob revision: `68aba918ed403a97a732af32251e8ea1ee7c5a85`

With `isHomePage={true}`, the shell:

- lets the child own the header, main, and footer;
- still mounts the cookie-consent banner;
- still mounts the landing analytics loader.

Use this mode for `/new`.

Do not render a nested `<main>` through the shell’s non-home path. The new page should own exactly one main landmark.

### Analytics

`LandingAnalyticsLoader` loads Google Analytics, Clarity, and Cloudflare Web Analytics only when:

- analytics consent is granted;
- production beta telemetry is enabled;
- the corresponding provider identifier exists.

The new page does not need provider code.

CTA elements should preserve the existing public analytics convention:

```html
data-landing-cta="primary"
data-landing-cta-location="header|hero|early-access|final-cta"
```

Use route-specific section data attributes for future analysis, but do not invent new provider events unless existing delegated analytics requires them.

## CTA destination

### `src/components/landing/ContactForm.tsx`

Observed blob revision: `1cd5171ab2024878a4a81af555a0c7a5a4a537d2`

The contact form normalizes both `started` and `beta-request` query intents to the access-request flow.

Use:

```text
/contact?intent=beta-request
```

for every signed-out primary CTA.

This permits the approved label “Request early access” without creating a new backend, database write, or contact route.

For signed-in visitors, preserve the current useful behavior of offering:

```text
/workshop
```

with the label “Open workspace.”

A low-emphasis “Sign in” link may use the existing login destination:

```text
/login?next=/workshop/projects
```

Do not use “Book a walkthrough” on `/new`.

## Metadata and sitemap

### Current route metadata

The existing `/new` metadata is intentionally minimal and noindex. Improve its title and description, but retain:

```ts
robots: { index: false, follow: false }
```

Use an absolute title to avoid duplicating the root title template.

Do not add `/new` to `src/app/sitemap.ts`.

Do not redirect `/` to `/new`.

Do not claim `/new` is canonical production marketing content. Promotion is a separate owner decision.

## Logo and icons

Reuse:

```ts
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
```

Use existing Phosphor icons already installed. Prefer no icon or a simple line icon where copy and a mini product diagram communicate the idea. Do not import Lucide solely to mirror Velora.

## Recommended target files

### Create

```text
src/components/landing-new/ArchestimatorNewLandingPage.tsx
src/components/landing-new/NewLandingHeroDemo.tsx
src/components/landing-new/NewLandingMotionController.tsx
src/components/landing-new/NewLandingPrimitives.tsx
src/components/landing-new/new-landing-content.ts
src/components/landing-new/new-landing.module.css
```

### Edit

```text
src/app/new/page.tsx
src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx
```

The second edit is conditional on needing static/paused playback. Keep it backward-compatible.

### Avoid

```text
src/app/page.tsx
src/components/landing-v3/ArchestimatorLandingPage.tsx
src/components/landing-v3/landing-content.ts
src/components/landing/sections/LandingCTAs.tsx
src/app/contact/page.tsx
src/components/landing/ContactForm.tsx
src/app/sitemap.ts
src/app/globals.css
package.json
bun.lock
```

A file in the avoid list may be changed only if a concrete correctness dependency emerges, and the completion report must explain why.

## Blast-radius checklist

Before editing a shared file, search for:

```bash
rg -n "HeroEstimateWorkspaceMockup" src tests e2e
rg -n "data-landing-cta" src
rg -n "PublicPageShell" src/app src/components
```

For the hero component specifically, verify:

- existing call sites compile with no new props;
- default autoplay behavior is unchanged;
- query cache cleanup remains correct;
- shared drag state ends when loop mode pauses;
- no browser API runs during render;
- reduced-motion static mode does not hydrate into a different first phase;
- CSS-module class ownership remains internal.

## Architectural opportunity

The current `landing-v3` page is client-owned at the root. `/new` should improve this without refactoring the old route:

- server-render the page structure and copy;
- use a small auth-aware CTA client island if needed;
- use one motion-controller client island that attaches to `data-*` targets;
- use one hero-demo client island;
- prefer native `<details>` for mobile navigation and FAQ;
- keep content as static typed data.

This gives the new page the visual richness of the references without making every section a React animation component.
