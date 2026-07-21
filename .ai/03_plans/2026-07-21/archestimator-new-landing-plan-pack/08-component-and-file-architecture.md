# Component and File Architecture

## Architectural objective

Build `/new` as a server-first public page with two focused client islands:

1. a route motion controller;
2. the real product demonstration and auth-aware CTA behavior.

Do not reproduce the current landing’s all-client root unless a framework constraint proves it necessary.

## Target file tree

```text
src/app/new/page.tsx

src/components/landing-new/
  ArchestimatorNewLandingPage.tsx
  NewLandingHeroDemo.tsx
  NewLandingMotionController.tsx
  NewLandingPrimitives.tsx
  new-landing-content.ts
  new-landing.module.css
```

Conditional shared edit:

```text
src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx
```

No barrel export is required unless the repository already expects one for public component folders.

## `src/app/new/page.tsx`

### Responsibilities

- define accurate noindex metadata;
- preserve `force-static`;
- mount `PublicPageShell isHomePage`;
- render `ArchestimatorNewLandingPage`;
- avoid A/B experiment ownership;
- contain no section copy.

### Recommended shape

```tsx
import type { Metadata } from "next";

import { PublicPageShell } from "@/components/landing";
import { ArchestimatorNewLandingPage } from "@/components/landing-new/ArchestimatorNewLandingPage";

export const metadata: Metadata = {
  title: {
    absolute: "Archestimator — Construction estimating from estimate to proposal",
  },
  description:
    "Build structured estimates, reuse cost knowledge, present clearer proposals, and keep reviews and revisions connected. Request early access to Archestimator.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

export default function NewLandingRoute() {
  return (
    <PublicPageShell isHomePage>
      <ArchestimatorNewLandingPage />
    </PublicPageShell>
  );
}
```

Do not add a canonical URL while `/new` is a preview unless the owner directs otherwise.

## `ArchestimatorNewLandingPage.tsx`

### Preferred ownership

Keep this component server-compatible. It should:

- import static content;
- render landmarks and sections;
- use route-owned primitives;
- mount client islands;
- generate FAQ JSON-LD from the same FAQ array;
- avoid hooks;
- avoid browser APIs;
- avoid creating a page-wide client boundary.

### Suggested composition

```tsx
export function ArchestimatorNewLandingPage() {
  return (
    <div className={styles.root} data-new-landing-root>
      <NewLandingMotionController />
      <SkipLink />
      <NewLandingHeader />
      <main id="main-content">
        <HeroSection />
        <OutcomeSection />
        <AudienceMarquee />
        <ProductBentoSection />
        <ConnectedRecordSection />
        <ActivitySection />
        <PrinciplesSection />
        <ConnectionMatrixSection />
        <EarlyAccessSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <NewLandingFooter />
    </div>
  );
}
```

If `NewLandingHeader`, CTA groups, or footer must read client auth hints, isolate only the smallest auth-dependent label or group rather than converting the entire page.

## `new-landing-content.ts`

### Responsibilities

- contain all visible copy;
- expose readonly typed arrays;
- keep hrefs centralized;
- generate FAQ schema from the visible content;
- make claim review possible without reading layout markup.

### Recommended constants

```ts
export const EARLY_ACCESS_HREF = "/contact?intent=beta-request";
export const WORKSPACE_HREF = "/workshop";
export const LOGIN_HREF = "/login?next=/workshop/projects";

export const navItems = [...];
export const workflowOutcomes = [...];
export const audiences = [...];
export const bentoChapters = [...];
export const recordFlow = [...];
export const activityEntries = [...];
export const principles = [...];
export const connectionPairs = [...];
export const earlyAccessCards = [...];
export const faqs = [...];
export const footerLinks = [...];
```

Use `as const` where practical.

### Types

```ts
type IconComponent = typeof SomePhosphorIcon;

export type LandingNavItem = {
  label: string;
  href: `#${string}` | `/${string}`;
};

export type WorkflowOutcome = {
  number: `0${1 | 2 | 3 | 4}`;
  title: string;
  body: string;
  icon: IconComponent;
};

export type BentoChapter = {
  id: "structure" | "reuse" | "present" | "revise";
  kicker: string;
  title: string;
  body: string;
  visual: "scope-tree" | "saved-component" | "outputs" | "revision";
  icon: IconComponent;
};

export type Faq = {
  question: string;
  answer: string;
};
```

Do not make the data schema more abstract than the page requires.

## `NewLandingPrimitives.tsx`

### Purpose

Hold route-owned structural primitives that improve consistency without hiding page meaning.

Candidate components:

- `LandingContainer`;
- `SectionHeading`;
- `PrimaryCta`;
- `AuthAwareActionGroup`;
- `MiniScopeTree`;
- `MiniSavedComponent`;
- `MiniOutputBridge`;
- `MiniRevisionTrail`;
- `ConnectionNode`;
- `WorkflowDock`.

### Rules

- use semantic native elements;
- accept `className` only where real composition requires it;
- do not recreate a general design system;
- do not place content arrays inside primitives;
- do not mark the whole file `"use client"` because one nested action needs auth state;
- split an auth-aware CTA into its own client component if necessary;
- no `any`;
- no index-based key when stable content IDs exist.

If the primitive file becomes larger than the page component, split only by genuinely independent behavior, not by visual atom count.

## Auth-aware CTA contract

The current public site uses `useLandingAuthHint`. Preserve useful behavior.

A small client component may expose:

```tsx
type EarlyAccessCtaProps = {
  location: "header" | "hero" | "early-access" | "final-cta";
  className?: string;
};

export function EarlyAccessCta({ location, className }: EarlyAccessCtaProps) {
  const isLoggedIn = useLandingAuthHint();

  return (
    <Link
      href={isLoggedIn ? WORKSPACE_HREF : EARLY_ACCESS_HREF}
      data-landing-cta="primary"
      data-landing-cta-location={location}
      className={className}
    >
      {isLoggedIn ? "Open workspace" : "Request early access"}
    </Link>
  );
}
```

Do not pass auth state through every server section.

## `NewLandingHeroDemo.tsx`

### Responsibilities

- own viewport/media/intersection/visibility decisions;
- render the product frame;
- pass playback mode to the existing hero mockup;
- preserve a stable server-first product frame;
- label sanitized data;
- keep product UI pointer-inert;
- expose no route sync.

### Suggested contract

```ts
export type NewLandingHeroDemoProps = {
  className?: string;
};
```

Internal behavior:

```ts
const shouldLoop =
  inView &&
  documentVisible &&
  !prefersReducedMotion &&
  desktopViewport;

<HeroEstimateWorkspaceMockup
  playback={shouldLoop ? "loop" : "static"}
  staticPhase="fauxwood-replaced"
  pauseWhenDocumentHidden
/>
```

### Observer

Use one intersection observer with a threshold around `0.25`. Do not observe every element inside the product UI.

### Server render

The initial render must contain a stable product UI state. Avoid `ssr: false` unless bundle evidence later proves the cost justifies replacing the initial proof with an accessible poster. The first implementation should favor truthful visible proof over an empty deferred frame.

### Frame layers

```text
heroDemoShell
  heroDemoGlow (aria-hidden)
  heroDemoBeam (aria-hidden)
  browserFrame
    browserChrome (aria-hidden)
    productViewport (aria-label)
      HeroEstimateWorkspaceMockup
  demoDisclosure
```

## Shared hero extension

### Existing behavior must remain default

Suggested implementation:

```ts
export type HeroEstimateWorkspaceMockupProps = {
  playback?: "loop" | "static";
  staticPhase?: HeroAnimationPhase;
  pauseWhenDocumentHidden?: boolean;
  className?: string;
};

export function HeroEstimateWorkspaceMockup({
  playback = "loop",
  staticPhase = "fauxwood-replaced",
  pauseWhenDocumentHidden = false,
  className,
}: HeroEstimateWorkspaceMockupProps = {}) {
  // Existing default loop remains unchanged.
}
```

### State transitions

- initialize deterministically;
- when `playback` changes to static, cancel timer, end drag, and set stable phase;
- when loop resumes, either restart at `ready` or continue from a stable index; choose one deterministic behavior and document it;
- when the document becomes hidden and pausing is enabled, cancel timers and end drag;
- do not schedule more than one timer;
- preserve query-cache publication for the chosen phase;
- cleanup on unmount.

### CSS ownership

The existing component imports its own `landing-v3.module.css`; keep internal product-demo phase styling there. The new route CSS owns only the outer frame and sizing.

Do not duplicate the phase CSS into `landing-new`.

## `NewLandingMotionController.tsx`

### Responsibilities

See [`07-motion-and-microinteractions.md`](./07-motion-and-microinteractions.md).

Suggested approach:

```tsx
"use client";

export function NewLandingMotionController() {
  useGSAP(() => {
    const root = document.querySelector("[data-new-landing-root]");
    if (!root) return;

    // scoped reveal, progress, workflow line activation
  }, []);

  return <div aria-hidden className={styles.scrollProgressTrack}>...</div>;
}
```

Prefer passing a root ref from a small client boundary if querying the document creates ambiguity. The controller must not own page content.

Use `gsap.context()` or `useGSAP` scope and return complete cleanup.

## `new-landing.module.css`

### Responsibilities

- scoped token definitions;
- all route layout;
- background fields and patterns;
- header/menu states;
- CTA states;
- hero frame;
- outcome row;
- marquee;
- bento;
- flow diagram;
- activity;
- cards;
- early access;
- FAQ;
- footer;
- responsive behavior;
- reduced-motion behavior.

### Layering

Recommended internal order:

1. root tokens and base;
2. focus and skip link;
3. shared container/heading/CTA;
4. header;
5. hero;
6. outcomes and audience;
7. bento;
8. workflow;
9. activity;
10. principles;
11. connection matrix;
12. early access;
13. FAQ;
14. final CTA and dock;
15. footer;
16. responsive queries;
17. reduced motion.

Keep comments focused on non-obvious constraints, especially the product frame scaling and contrast decisions.

## Data attributes

Use stable selectors for motion and evidence:

```text
data-new-landing-root
data-new-landing-reveal
data-reveal-direction
data-reveal-delay
data-new-landing-spotlight
data-new-landing-flow
data-new-landing-product-frame
data-new-landing-section
data-landing-cta
data-landing-cta-location
```

Do not use style-generated class names from other components as motion selectors.

## FAQ schema

Generate from the same array used visibly:

```tsx
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: answer,
    },
  })),
};
```

Use the repository’s existing `stringifyJsonLd` helper. Do not duplicate or hand-maintain schema copy.

## Import boundaries

Allowed:

- `next/link`;
- type-only `next` metadata in route;
- existing Phosphor icons;
- `ArchestimatorLogo`;
- existing landing JSON-LD and auth-hint utilities;
- `HeroEstimateWorkspaceMockup`;
- `cn`;
- existing GSAP dependencies.

Avoid:

- authenticated shell/header components;
- generic app cards that bring authenticated design constraints;
- reference-template packages;
- direct imports from Velora or LaunchPad;
- a new icon family;
- a second state manager.

## Error and fallback behavior

The landing route should not throw because motion setup fails.

- static markup is the fallback;
- hero playback failure leaves a stable product phase;
- missing analytics environment values produce no script, as today;
- native navigation remains functional without motion;
- the message, sections, and product demonstration require no content/product network request; the existing auth-hint hook may make its current same-origin session-hint request, and consent-gated analytics may load as they do on other public pages;
- no suspense boundary should replace the main message;
- no source should import server-only modules into a client island.

## Route isolation invariant

A change is acceptable only if:

- `/new` gains the new page;
- `/` remains byte-for-byte unchanged unless the shared hero receives a backward-compatible extension;
- shared hero defaults produce the same existing loop;
- no global style selector changes current pages;
- no sitemap or redirect changes occur;
- no contact behavior changes;
- no package or lockfile changes occur.

This invariant receives its own acceptance criterion and must be checked in the final diff.
