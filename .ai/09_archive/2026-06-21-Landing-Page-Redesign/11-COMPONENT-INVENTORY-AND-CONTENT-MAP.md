# 11 — Component Inventory & Content Map

> **STATUS: PLANNING ONLY · 2026-06-22 (revised per ratified keystone decisions D-1…D-5) · not code.**
> **Direction:** THE GLASS BRAND (D-1). Every component below re-skins to the same
> liquid-glass-over-warm-canvas vocabulary the Workshop Dashboard + Estimate Sheet ship
> (`.dashboard-glass` / `.dashboard-glass-warm`, `data-glass="ready"`, `--glass-*` tokens), with
> Doto (`--font-display`) + Roboto Mono (`--font-numeric`) + SF Pro (`--font-sf-pro`) type and
> signal-orange presence (D-3). The prior paper + Source Serif 4 direction is demoted to
> Alternative D in `01-DESIGN-DIRECTION.md` and is NOT the default for any component here.

**Purpose (one line):** own the React/RSC component inventory for the landing redesign — every
component's file path, props, RSC/client designation, the copy → component map, the
nav/header/footer anatomy, the auth component set, and the removals. This doc is the
implementer's pick-list: a competent dev reads `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` (the
section map) + `23-AUTH-EXPERIENCE.md` (the auth anatomy) + this doc (the component anatomy) and
can build without a clarifying conversation.

This doc owns the **components**. It does not own section order (→ `02`), tokens (→ `03`), the
plate's content (→ `04`), copy (→ `05`), claims discipline (→ `06`), the RSC architecture
(→ `07`), or the auth layout rationale (→ `23`). It consumes all of them.

---

## 0. Recon-verified facts (read before editing any signature)

The signatures below were grepped against the live source on 2026-06-22, not assumed. The redesign
reorganizes components into sub-directories (the §1 tree is the proposed structure) and extracts
the inline RSC markup into reusable leaves; it does **not** change the auth server actions, the
closed-beta RPC, the A/B assignment logic, or the error-code contract.

| Fact | Source | Note for this doc |
|---|---|---|
| **A/B variant is computed in the RSC page, not the shell.** `src/app/page.tsx:4` imports `getVariant` from `@/lib/ab-testing/variant-assigner`; `:26` resolves `heroVariant`; `:31` passes it to `<ABExperimentProvider experimentId="hero-cta-copy" variant={heroVariant}>`. | `src/app/page.tsx`, `src/lib/ab-testing/variant-assigner.ts` | `LandingShellClient` does NOT compute `experimentId`/`variant` — it **receives** them from the RSC page and forwards to `ABExperimentProvider`. See §2.1. |
| **Auth state is resolved server-side.** `getLandingAuthState()` (`src/lib/landing/get-landing-auth-state`) is awaited in the RSC page (`page.tsx:18`). | `src/app/page.tsx:1,18` | `LandingHeader` receives `isLoggedIn` as a prop from the RSC; the header's client islandy only needs it for the desktop/mobile nav toggle, not for the auth state itself. |
| **`ABExperimentProvider` is the real client wrapper.** Props `{ experimentId: string; variant: string; children }`; fires `trackExperimentView(experimentId)` on mount, consent-gated. | `src/components/landing/ABExperimentProvider.tsx:8-26` | `LandingAnalyticsBoot` (§2.5) **wraps** this, not replaces it. |
| **`LandingHeader` is `"use client"` today** (mobile-menu + footer-overlap state via `useState`). | `src/components/landing/LandingHeader.tsx:1,13-14` | The redesign either keeps it client (simpler) or splits into an RSC shell + a `LandingHeaderNav` client leaf for the toggle. §2.1 records both; default = keep client (smaller diff, the toggle is the only interactivity). |
| **No `src/components/landing/shell|sections|commercial-graph-plate|claims-ledger|shared` sub-dirs exist today.** | `ls src/components/landing/` | The §1 tree is the **proposed reorg** — the implementer creates the sub-dirs and moves files in. |
| **No `src/components/auth/` dir exists today** — login is an inline RSC in `src/app/login/page.tsx`. | `ls src/components/auth/` → absent | §2.6 introduces the new dir; `23-AUTH-EXPERIENCE.md` owns the layout rationale + the server-action wiring (unchanged). |
| **`--glass-logo-orange #F24405`** is a real token (`globals.css:131`) — the auth brand-panel logo slab consumes it (D-2/D-3). | `src/app/globals.css:131` | Cited in §2.6 `AuthGlassPanel`. |
| **`MotionReveal.tsx` exists** (`src/components/landing/MotionReveal.tsx:5`); reused as the scroll-reveal driver (§2.5), not reinvented. | `src/components/landing/MotionReveal.tsx` | The §8 motion stance in `03-VISUAL-LANGUAGE-AND-TOKENS.md` is built on this. |
| **`LandingAnalyticsLoader.tsx` + `ClarityScript.tsx` + `CookieConsentBanner.tsx` exist.** | `src/components/landing/` | `LandingAnalyticsBoot` (§2.5) composes them; it does not replace them. |

---

## 1. File layout

All landing components live under `src/components/landing/` (existing convention). The redesign
organizes them into sub-directories by section for navigability. The sub-dirs are **new** (none
exist today); the implementer creates them and moves files in per the §4 removal/move table.

```
src/components/landing/
├── shell/
│   ├── LandingShellClient.tsx       # "use client" — the single client shell (doc 07 §1.1)
│   ├── LandingHeader.tsx            # "use client" — masthead nav (replaces existing)
│   ├── LandingFooter.tsx            # RSC — glass sitemap (replaces logo-only)
│   └── MaturityTag.tsx              # RSC — "Pre-launch MVP preview" persistent badge
├── sections/
│   ├── HeroSection.tsx              # §11.1 hero (replaces hype hero)
│   ├── ProblemSection.tsx           # The Problem
│   ├── LayerSection.tsx             # The Layer prose (wraps the plate)
│   ├── WhatYouGetSection.tsx        # Three benefit blocks (§11.2)
│   ├── HowItWorksSection.tsx        # 5-step workflow (§7.3)
│   ├── WhoItIsForSection.tsx        # Tiered roles (§11.3, §6.2)
│   ├── WhyNotSpreadsheetSection.tsx # §11.4
│   ├── FounderSection.tsx           # §11.5 (⚠️ GATED on bio assets L-FND-1)
│   ├── PricingPhilosophySection.tsx # §9.3 philosophy + cement anchor CONCEPT
│   └── FinalCtaSection.tsx          # Both CTAs + one-liner
├── commercial-graph-plate/
│   ├── ArchitecturePlate.tsx        # RSC — the SVG plate (doc 04)
│   ├── PlateNode.tsx                # RSC — a single node (label, sub-label, StatusPill)
│   ├── PlateEdge.tsx                # RSC — a single edge (solid hairline / dashed redline)
│   └── PlateCaption.tsx             # "use client" — the hover/focus caption island
├── claims-ledger/
│   ├── ClaimsLedger.tsx             # RSC — renders the matrix (doc 06 §3)
│   ├── ClaimRow.tsx                 # RSC — a single row (claim, status, source, note)
│   └── ClaimFilter.tsx              # "use client" — All / Live / Building / Planned filter
├── shared/
│   └── StatusPill.tsx               # RSC — the D-4 single ClaimStatus component
├── motion/
│   └── ScrollReveal.tsx             # "use client" — fallback reveal only; not enough for doc 24
├── gpt-taste/
│   ├── GsapLandingMotion.tsx        # "use client" — GSAP provider/registration island
│   ├── GsapPinnedProof.tsx          # "use client" — ScrollTrigger pinned proof section
│   ├── GsapScrubbedWords.tsx        # "use client" — scrubbed editorial text reveal
│   ├── GsapCardStack.tsx            # "use client" — card stacking / dense proof motion
│   └── gpt-taste-design-plan.ts     # deterministic RNG selections from <design_plan>
└── analytics/
    └── LandingAnalyticsBoot.tsx     # "use client" — composes ABExperimentProvider + LandingAnalyticsLoader + ClarityScript + cookie consent (reused per doc 07 §1.2)
```

The existing `src/components/landing/index.ts` barrel is updated (§4.2) to export the new
components and **drop** the removed ones (`TestimonialSection`, `CompanyProofCarouselSection`,
`ProcessBandSection` testimonial machinery, `company-proof-data.ts`). The removal is gated on
owner confirmation per `LOOP_LEDGER.md` L-REM-1…L-REM-4.

---

## 2. Component inventory

### 2.1 Shell components

#### `LandingShellClient.tsx` — `"use client"`

The single client boundary for each marketing route (doc 07 §1.1). Mirrors the
`WorkshopHomebaseClient` pattern: accepts `children: ReactNode` from the RSC page, mounts the
`ScrollReveal` driver once, and is the parent for the interactive leaves (`PlateCaption`,
`ClaimFilter`, `LandingAnalyticsBoot`, `LandingHeader`).

**SSR-vs-client split for the A/B (PINNED — closes a known gap):** the **RSC page** computes the
experiment id + variant server-side via `getVariant` (`src/lib/ab-testing/variant-assigner.ts`,
`src/app/page.tsx:4,26`) and **passes them as props** to `LandingShellClient`. The shell does NOT
compute the assignment — it forwards `experimentId`/`variant` to `LandingAnalyticsBoot`, which
wraps `ABExperimentProvider` (the real client consumer, `src/components/landing/ABExperimentProvider.tsx:13`).
This keeps the assignment deterministic on the server (no client flicker, no hydration mismatch)
and the shell a pure pass-through for the experiment metadata.

```ts
"use client";
import { ReactNode } from "react";

export type RouteName = "/" | "/features" | "/pricing" | "/about" | "/contact" | "/trust";

export interface LandingShellClientProps {
  children: ReactNode;
  route: RouteName;          // for the `route_view` analytics event prop
  experimentId?: string;     // computed in the RSC page (getVariant); forwarded to LandingAnalyticsBoot
  variant?: string;          // ditto — server-assigned, deterministic
}
```

RSC page usage (e.g., `src/app/page.tsx` post-cutover):

```tsx
// RSC — computes auth state + A/B variant server-side
const isLoggedIn = await getLandingAuthState();
const heroVariant = await getVariant("hero-cta-copy");   // deterministic server assignment

<LandingShellClient route="/" experimentId="hero-cta-copy" variant={heroVariant}>
  <LandingHeader isLoggedIn={isLoggedIn} isHomePage />
  <main>
    <HeroSection variant={heroVariant} isLoggedIn={isLoggedIn} />
    <ProblemSection />
    <LayerSection><ArchitecturePlate /></LayerSection>
    <WhatYouGetSection />
    <HowItWorksSection />
    <WhoItIsForSection />
    <ClaimsLedger />     {/* section 7 */}
    <WhyNotSpreadsheetSection />
    <FounderSection />
    <PricingPhilosophySection />
    <FinalCtaSection isLoggedIn={isLoggedIn} />
  </main>
  <LandingFooter />
</LandingShellClient>
```

#### `LandingHeader.tsx` — `"use client"` (kept client for the nav toggle)

The masthead-leaning nav (doc 02 §3). **Kept `"use client"`** because the mobile hamburger +
footer-overlap state needs `useState` (the existing component already does this,
`src/components/landing/LandingHeader.tsx:13-14`). The redesign is a **re-skin**, not a designation
change: the glass-on-warm-canvas vocabulary (`.dashboard-glass` at `--landing-z-sticky`,
`--glass-nav-radius`, the signal-orange logo slab via `--glass-logo-orange #F24405` — D-2/D-3)
replaces the current chrome.

Renders: the Doto wordmark (links to `/`), the nav items (`Features · Pricing · About · Contact ·
Trust`), the persistent `MaturityTag`, and the two CTAs (`Start free` primary → `/signup`
path settled; self-serve behavior gated on L-FUN-2; until enabled it routes to `/login` (magic link
handles signup) or `/contact`; `Book a walkthrough` secondary → `/contact`). Sticky on scroll; responsive collapse
to a hamburger at ≤768px (doc 02 §3, doc 07 §2).

```ts
"use client";
export interface LandingHeaderProps {
  isLoggedIn: boolean;       // from getLandingAuthState(), resolved in the RSC page
  isHomePage?: boolean;      // controls anchor-vs-route nav hrefs (existing behavior, preserved)
}
```

> **RSC-split alternative (deferred to implementation):** if the header's client payload is later
> deemed too heavy, split into an RSC `LandingHeader.tsx` (renders the static chrome + CTAs) + a
> `LandingHeaderNav.tsx` client leaf (the toggle only). Both satisfy a11y; the default is the
> single client component (smaller diff). Not gated — a perf-call at build time.

#### `LandingFooter.tsx` — RSC

The glass-sitemap footer (doc 02 §4). Re-skinned from logo-only to a `.dashboard-glass-warm`
three-column sitemap: **Product** (Features · Pricing · Trust · Start free), **Company** (About ·
Contact · Book a walkthrough), **Status** (`MaturityTag` + "in active development" line). Below:
the one-liner colophon (`Archestimator — the cost intelligence layer for AEC teams. From cost
proposal to client approval.`) + the honesty line + copyright + privacy/terms links.

Replaces the existing logo-only footer (L-REM-4).

```ts
export interface LandingFooterProps {
  // no props today — the sitemap is static copy from 05-COPY-SKELETON.md
}
```

#### `MaturityTag.tsx` — RSC

A small SF Pro uppercase pill rendering `Pre-launch MVP preview` in `--landing-ink-secondary`
(`#5D5D5D`, alias of `--secondary` `globals.css:11` — AA-safe; never `#7F7F7F` per the `03` §6
rail). Rides near the wordmark in the header and as a status badge in the footer. The maturity
disclosure MASTER §15 / §7.4 mandates.

```ts
export interface MaturityTagProps {
  size?: "sm" | "md";        // sm in header, md in footer
}
```

### 2.2 Section components (all RSC unless marked)

Each section component renders the copy from `05-COPY-SKELETON.md` for its section, styled per
`03-VISUAL-LANGUAGE-AND-TOKENS.md` (Glass Brand tokens, glass surfaces, Doto/Mono/SF Pro) plus the
mandatory `$gpt-taste` overlay in `24-GPT-TASTE-EXECUTION-CONTRACT.md`. They are **server
components by default**, but the public landing must include the doc-24 GSAP islands for the
RNG-selected AIDA/Desire motion. The old `ScrollReveal` wrapper is a fallback convenience, not the
taste gate.

| Component | Section (per `02`) | Copy source | RSC? | Notes |
|---|---|---|---|---|
| `HeroSection` | 1 | `05` §1 | **RSC parent + client CTA leaf** | LCP element = server-rendered H1 text headline. Includes a server-rendered `HeroMaterialPanel` local subcomponent: a restrained glass material specimen hinting at the estimate tree, reusable component library, Activity record, and proposal handoff. No fake screenshots, no redrawn browser chrome, no stock dashboard art. The existing client interactivity is narrowed to a small CTA/analytics leaf so the hero does not carry the whole route's JS budget. |
| `ProblemSection` | 2 | `05` §2 | RSC | — |
| `LayerSection` | 3 (prose) | `05` §3 | RSC | Wraps `<ArchitecturePlate />` as children. |
| `WhatYouGetSection` | 4 | `05` §4 | RSC + optional GSAP leaf | Three to five intentional cards as a gapless bento or dense mechanic grid. Must use `grid-flow-dense` or equivalent span proof per doc 24; no dead cells. |
| `HowItWorksSection` | 5 | `05` §5 | RSC + optional accordion leaf | Ordered list; `<ol>` (semantic sequence). If the RNG selects horizontal accordions, the expanding slices live in a client leaf while the list remains crawlable. |
| `WhoItIsForSection` | 6 | `05` §6 | RSC | Three `<RoleTier>` sub-components (Tier 1/2/3). |
| `ClaimsLedger` | 7 | `06` §3 (matrix) | RSC + `ClaimFilter` client leaf | See §2.4 below. |
| `WhyNotSpreadsheetSection` | 8 | `05` §8 | RSC | — |
| `FounderSection` | 9 | `05` §9 | RSC | ⚠️ GATED on founder bio assets (L-FND-1); renders the §11.5 paragraph fallback (§2.2.1) until assets land. |
| `PricingPhilosophySection` | 10 | `05` §10 | RSC | Cement anchor as CONCEPT; no numbers. |
| `FinalCtaSection` | 11 | `05` §11 | RSC | Massive high-contrast action block per doc 24; both CTAs + one-liner + `MaturityTag`. |

#### 2.2.1 `FounderSection.tsx` — concrete fallback render (closes the L-FND-1 gap)

Until founder-bio assets land (L-FND-1), `FounderSection` renders the **§11.5 paragraph alone** —
no portrait, no credentials row, no "one-liner" pull-quote. The fallback is a complete, honest
section on its own (the bio depth is a richness upgrade, not a launch blocker). Concretely:

```tsx
// RSC — fallback render when L-FND-1 is open
export function FounderSection() {
  return (
    <section data-reveal className="…">
      <h2 className="font-[family-name:var(--landing-font-display)] …">
        Built by someone who has lived this estimate-to-approval loop.
      </h2>
      <p className="max-w-[--landing-measure-prose] text-[--landing-ink] …">
        {/* the §11.5 paragraph, verbatim from 05-COPY-SKELETON.md §9 */}
      </p>
      {/* NO portrait, NO credentials row, NO one-liner pull-quote until L-FND-1 closes */}
    </section>
  );
}
```

When L-FND-1 closes, the section adds: a founder portrait (`next/image`, asset pipeline doc 19),
a credentials sub-row, and the one-liner pull-quote — all behind a feature check so the fallback
path stays the default until the assets are signed off. **No fabricated credentials or photo at
any point** (§15).

### 2.3 The commercial-graph plate (doc 04)

#### `ArchitecturePlate.tsx` — RSC

The static SVG plate (doc 04 §4). Renders from a data model (doc 04 §4.8) — **not** hand-authored
geometry. The implementer authors the data model once; the SVG renders from it at desktop
(composition in doc 04 §4.2) and collapses to a vertical stack at ≤768px (doc 04 §4.6). The plate
container is a `.dashboard-glass-warm` floating panel at `--landing-radius-panel` with a
`--landing-hairline-strong` frame (Glass Brand surface, `03` §4.2).

```ts
import type { ClaimStatus } from "@/components/landing/shared/StatusPill";

// The plate uses the D-4 ClaimStatus SUBSET (no NotUs nodes) — narrowed at the call site.
export type PlateNodeStatus = Exclude<ClaimStatus, "NotUs">;   // "Live" | "Building" | "Planned"

export interface PlateNode {
  id: "L1" | "L2" | "L3" | "L4" | "B1" | "P1";
  label: string;             // "The Estimate Tree"
  subLabel?: string;         // "Group · Area · rows" (dropped at ≤360px per doc 04 §4.6)
  status: PlateNodeStatus;   // D-4 subset — imported, not redefined
  publicLabel: string;       // "A structured estimate, not a flat sheet."
  edges: { to: PlateNode["id"]; kind: "solid" | "solid-strong" | "accent-dashed" }[];
}

export interface ArchitecturePlateProps {
  nodes: PlateNode[];         // sourced from doc 06 §3 (the matrix), reconciled
  onNodeFocus?: (id: PlateNode["id"]) => void;  // wired by PlateCaption
}
```

> **D-4 hard contract.** `PlateNodeStatus` is `Exclude<ClaimStatus, "NotUs">` — it imports the
> shared type and narrows. There is no divergent status definition in this file.

#### `PlateNode.tsx`, `PlateEdge.tsx` — RSC

Sub-components of `ArchitecturePlate`. A node renders its label, optional sub-label, the shared
`<StatusPill>` (imported from `src/components/landing/shared/StatusPill.tsx` — D-4), and the
`--landing-accent` left-rule on hover/focus (driven by the caption island). An edge renders as an
SVG path with the style per its `kind` (`--landing-hairline` solid, `--landing-hairline-strong`
lighter, `--landing-accent` dashed-redline).

#### `PlateCaption.tsx` — `"use client"`

The single client leaf for the plate (doc 04 §4.5). On node hover/focus (driven by
`:focus-visible` + a `onMouseEnter`/`onFocus` handler), updates a caption panel beneath the plate
with the node's `publicLabel` + status. Keyboard-accessible; the caption updates on focus, not
only hover (doc 04 §4.5). Respects `prefers-reduced-motion` (instant swap).

```ts
"use client";
export interface PlateCaptionProps {
  nodes: PlateNode[];        // the same data model as the plate
  activeNodeId: PlateNode["id"] | null;
}
```

### 2.4 The claims ledger (doc 06)

#### `ClaimsLedger.tsx` — RSC

Renders the CLAIMS MATRIX (doc 06 §3) as a list of `<ClaimRow>`. The list is server-rendered from
a signed-off data object (the matrix checked into `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §3, parsed
at build time). The ledger surface sits on a `.dashboard-glass` panel; rows are separated by
`--landing-hairline` (Glass Brand, `03` §4.2). The `ClaimFilter` is the only client leaf; the rest
is static.

```ts
import type { ClaimStatus } from "@/components/landing/shared/StatusPill";

export interface ClaimsLedgerProps {
  rows: ClaimRowData[];       // parsed from doc 06 §3
  title?: string;             // default "What is real today"
}
export interface ClaimRowData {
  claim: string;
  status: ClaimStatus;        // D-4 — the full 4-variant type (Live/Building/Planned/NotUs)
  source: string;             // "§7.2"
  note?: string;
  redlineNote?: string;       // §2.3 of doc 06
}
```

#### `ClaimRow.tsx` — RSC

A single row. Renders the claim (`--landing-ink #3D3D3D`, alias of `--ink` `globals.css:10`), the
shared `<StatusPill>` (imported from `shared/StatusPill.tsx` — D-4), the source tag (Roboto Mono
via `--landing-font-numeric`), the optional note (`--landing-ink-secondary #5D5D5D`, alias of
`--secondary` `globals.css:11` — AA-safe, **never `#7F7F7F`** per the `03` §6 rail), and the
optional redline annotation mark.

#### `ClaimFilter.tsx` — `"use client"`

The All / Live / Building / Planned filter (doc 06 §2). A small client island; toggles row
visibility via CSS classes (no re-render of the list — the list is server-rendered with all rows
present, the filter just shows/hides). Respects `prefers-reduced-motion`.

### 2.5 Shared, motion + analytics

#### `StatusPill.tsx` — RSC (shared, D-4 canonical) — **ELEVATED to `shared/`**

Per D-4, this is the **single** component that defines the `ClaimStatus` type. Both `<ClaimRow>`
and `<PlateNode>` **import** it (and the type) from `src/components/landing/shared/StatusPill.tsx`.
No divergent status definitions anywhere in the tree (grep-enforced in `16-TEST-AND-VERIFICATION-PLAN.md`).

```ts
// src/components/landing/shared/StatusPill.tsx — the D-4 canonical type + component
export type ClaimStatus = "Live" | "Building" | "Planned" | "NotUs";

export interface StatusPillProps {
  status: ClaimStatus;
  redline?: boolean;          // the redline annotation mark (§2.3 of doc 06)
  size?: "sm" | "md";
}
```

Status → color mapping (consumed here, owned by `03` §6.1 — semantic, not accent decoration):

| Status | Color | Token (verified in `globals.css`) |
|---|---|---|
| Live | success green | `--success #15803d` (L92) |
| Building | warning amber | `--warning #b45309` (L94) |
| Planned | ink | `--landing-ink` / `--ink #3D3D3D` (L10) — Planned is a stated intent, rendered in body ink |
| NotUs | muted | `--landing-ink-muted` / `--muted-foreground #6b6b6b` (L26) — the plate subset narrows this out |

A small SF Pro uppercase pill. The signal-orange accent is **separate** from this status palette
(orange marks *presence*, not claim status — D-3 / `03` §6.1). **No `#AA412A`, no clay anywhere
in this component** (D-3 hard contract).

#### `ScrollReveal.tsx` — `"use client"`

Fallback reveal driver only. **Wraps the existing `MotionReveal.tsx`**
(`src/components/landing/MotionReveal.tsx:5`) — it does not reinvent it. A single
IntersectionObserver mounted once in `LandingShellClient`; section components opt in via
`data-reveal`. Respects `prefers-reduced-motion` (instant show, no fade). This component is useful
for secondary sections but does **not** satisfy the doc-24 `$gpt-taste` GSAP requirement.

#### `gpt-taste/*` — `"use client"` GSAP islands (mandatory overlay)

The doc-24 overlay requires real GSAP and `ScrollTrigger`. These leaves own the motion-rich Desire
layer without moving core claims/copy out of server HTML.

```ts
"use client";
export interface GsapTasteSectionProps {
  reducedMotionLabel?: string;
}
```

Rules:

- `GsapLandingMotion.tsx` registers `gsap` / `ScrollTrigger` and handles cleanup.
- `GsapPinnedProof.tsx` implements the pinned proof split or equivalent RNG-selected paradigm.
- `GsapScrubbedWords.tsx` implements scrubbed editorial word reveal; reduced motion renders all
  words at full opacity.
- `GsapCardStack.tsx` implements card stacking or dense-grid reveal; reduced motion renders the
  final stack/grid without scroll dependency.
- `gpt-taste-design-plan.ts` records the deterministic RNG selections from the mandatory
  `<design_plan>`: hero architecture, editorial font, three component architectures, and two GSAP
  paradigms.
- These files never import or define claims data, auth actions, route metadata, or the D-4
  `ClaimStatus` type.

#### `LandingAnalyticsBoot.tsx` — `"use client"`

**Composes** the existing `ABExperimentProvider.tsx` + `LandingAnalyticsLoader.tsx` +
`ClarityScript.tsx` + `CookieConsentBanner.tsx` (reused per doc 07 §1.2 #5 — none are replaced).
Receives `experimentId`/`variant` from `LandingShellClient` (which received them from the RSC
page) and forwards them to `ABExperimentProvider`. Fires the `route_view` event on mount with the
route name as prop. Consent-gated per `15-FORMS-AND-ABUSE-GUARDRAILS.md`.

```ts
"use client";
export interface LandingAnalyticsBootProps {
  route: RouteName;
  experimentId?: string;      // forwarded to ABExperimentProvider
  variant?: string;           // ditto
}
```

### 2.6 Auth components (cross-link `23-AUTH-EXPERIENCE.md`)

All auth components live under **`src/components/auth/`** (a new directory; today
`src/app/login/page.tsx` is a single inline RSC). The layout rationale, the route flows, the
closed-beta gate, the a11y/abuse/SEO/perf/analytics contracts, and the gated items are owned by
`23-AUTH-EXPERIENCE.md` — this section is the **component pick-list** that feeds doc 23. **Zero
changes to the server actions** (`src/lib/auth/actions.ts`), the callback
(`src/app/auth/callback/route.ts`), the closed-beta RPC, or the error-code contract.

| Component | Path | RSC / Client | Props | Notes |
|---|---|---|---|---|
| `AuthLayout` | `src/components/auth/AuthLayout.tsx` | **RSC** | `{ children: ReactNode; route: "login" \| "signup"; next: string; sent?: string; errorCode?: string }` | Renders the 2-col grid (D-2): `AuthGlassPanel` (left) + a right column that renders the error/success live regions (from `errorCode`/`sent`) and `children` (the form). Sets the document shell (`min-h-screen`, `--grad-canvas-wash`). |
| `AuthGlassPanel` | `src/components/auth/AuthGlassPanel.tsx` | **RSC** (pure presentational) | `{ variant: "full" \| "compact" }` | The decorative brand surface. `aria-hidden="true"`. Uses `.dashboard-glass-warm`, the logo slab (`--glass-logo-orange #F24405`, `globals.css:131` — D-2/D-3), and the material-frost + `--grad-hero-continue`/`--grad-hero-create` composition. **NO fake product screenshots, NO stock photos** (D-2, radical honesty doc 06). |
| `SignupForm` | `src/components/auth/SignupForm.tsx` | **Client** (`"use client"`) | `{ next: string }` | Visually near-identical to `LoginForm` (same two server actions — `shouldCreateUser:true` makes them signup-capable). Copy differs ("Create your account"). Renders the beta-gate variant (`ClosedBetaGate`) when self-serve is off (doc 23 §3.2). Cross-links to `/login`. ⚠️ Self-serve GATED L-FUN-2. |
| `LoginForm` | `src/components/auth/LoginForm.tsx` | **Client** (`"use client"`) | `{ next: string }` | Two `<form action={signInWithGoogle}>` and `<form action={signInWithEmail}>` leaves (server actions). Renders `GoogleButton` + divider + email field + submit. `autocomplete` attrs set (doc 23 §5). Cross-links to `/signup`. |
| `MagicLinkButton` | `src/components/auth/MagicLinkButton.tsx` | **Client** (`"use client"`) | `{ next: string; label: string }` | The submit button for the email `<form action={signInWithEmail}>`, co-located with the email `ControlInput`. Use `variant="brand"` after extending `ButtonVariant`; do **not** use `variant="primary"` because today's primary maps to dark ink, not signal orange. |
| `GoogleButton` | `src/components/auth/GoogleButton.tsx` | **Client** (`"use client"`) | `{ next: string; label: string }` | A submit button inside the Google `<form action={signInWithGoogle}>`. `variant="secondary"`. Carries the Google "G" mark (asset — doc 19) + `label` ("Continue with Google"). |
| `ClosedBetaGate` | `src/components/auth/ClosedBetaGate.tsx` | **RSC** | `{ status?: ClosedBetaAccessStatus }` | The request-access variant that replaces `SignupForm` when self-serve is off (doc 23 §3.2). Routes the email capture to `/contact?intent=beta-request` (or waitlist — L-CRM-1). Reuses the same `AuthLayout` shell. |

**Designation rules (cross-link doc 23 §4.1):** the shell, the glass panel, the gate variant, and
the error/success banners are **RSC** — zero client JS. The forms are **client leaves** only
because they host the `ControlInput` focus state + honeypot; the actual submit is a **server
action** (`<form action={...}>`), so there is **no client-side fetch round-trip** for auth. This
matches the Workshop Dashboard RSC pattern (memory `workshop-dashboard-rsc`) and the landing's
RSC-first architecture (doc 07). Server actions stay in `src/lib/auth/actions.ts` under
`"use server"` (memory `use-server-exports-only-async`).

---

## 3. Copy → component map

Every copy block in `05-COPY-SKELETON.md` maps to exactly one component. This is the contract that
keeps the copy and the components in sync.

| `05` section | Copy block | Component | Prop |
|---|---|---|---|
| §0 Masthead | Wordmark | `LandingHeader` | (hardcoded; Doto wordmark) |
| §0 Masthead | Persistent tag | `MaturityTag` | `size="sm"` |
| §0 Masthead | Nav items | `LandingHeader` | (hardcoded) |
| §0 Masthead | CTAs | `LandingHeader` | (`Start free` href follows doc 23 §3.4: `/signup` path settled, with `/login` or `/contact` fallback until self-serve is enabled) |
| §1 Hero | H1 + subhead + CTAs + maturity tag + plain anchor | `HeroSection` | `variant`, `isLoggedIn` (from RSC page) |
| §2 Problem | H2 + body + client-side line | `ProblemSection` | — |
| §3 Layer | H2 + lead + plate intro + honesty anchor + what-this-is-not | `LayerSection` | `children=<ArchitecturePlate />` |
| §4 What you get | 3 × (H3 + body) + honesty footnote | `WhatYouGetSection` | — |
| §5 How it works | H2 + 5 steps + honest line | `HowItWorksSection` | — |
| §6 Who it is for | H2 + lead + 3 tiers × role lines + honesty footnote | `WhoItIsForSection` | — |
| §7 What is real today | H2 + lead + Live/Building/Planned/Not-us rows | `ClaimsLedger` | `rows` from doc 06 §3 |
| §8 Why not a spreadsheet | H2 + body + support line | `WhyNotSpreadsheetSection` | — |
| §9 Founder | H2 + body + (one-liner ⚠️ GATED) | `FounderSection` | ⚠️ L-FND-1 — fallback in §2.2.1 |
| §10 Pricing | H2 + philosophy + cement anchor CONCEPT + CTA | `PricingPhilosophySection` | — |
| §11 Final CTA | H2 + subhead + both CTAs + maturity tag | `FinalCtaSection` | `isLoggedIn` |
| Footer | Wordmark + tagline + sitemap + honesty line | `LandingFooter` | — |
| Auth (doc 23) | H1 + error/success + Google + magic link + legal + cross-link | `AuthLayout` + form leaf | `route`, `next`, `sent`, `errorCode` |

---

## 4. Removals + barrel update

### 4.1 Removals (the components that go away)

Per the Hallmark deletion rail (doc 06 §4; `LOOP_LEDGER.md` L-REM-1…L-REM-4). **Every deletion is
gated on owner confirmation.**

| Existing component | Status | Replacement |
|---|---|---|
| `TestimonialSection.tsx` | **DELETE** (§15 fabricated testimonials) | None — the claims ledger + founder section carry trust by honesty. |
| `CompanyProofCarouselSection.tsx` | **DELETE** (§15 fabricated testimonials) | None. |
| `company-proof-data.ts` | **DELETE** (§15 placeholder partner logos) | None. |
| `ProcessBandSection.tsx` (testimonial machinery) | **DELETE** the testimonial slides; keep the process-band mechanic only if it is repurposable, else delete. | `HowItWorksSection` (the 5-step). |
| `HeroSection.tsx` (current) | **REPLACE** (hype hero + slideshow + 2.3MB PNG) | New `HeroSection.tsx` (§11.1, text-only, Glass Brand). |
| `LandingFooter.tsx` (current) | **REPLACE** (logo-only) | New `LandingFooter.tsx` (glass sitemap). |
| `LandingHeader.tsx` (current) | **REPLACE** (existing nav chrome) | New `LandingHeader.tsx` (glass masthead, same designation). |
| `ProductPreviewVariants.tsx` | **AUDIT** for re-drawn browser/IDE chrome (L-REM-5); delete if it fakes chrome. | None (no product screenshots on the new surface — D-2). |
| `PartnerSection.tsx` | **AUDIT** (§15-adjacent); delete if it implies real partnerships. | None. |
| `PlaceholderMedia.tsx` | **AUDIT**; keep only if it serves a non-deceptive purpose. | None. |
| `NeatWireframeBackground.tsx` | **AUDIT**; likely delete — the warm-canvas wash (`--grad-canvas-wash`) is the background, not a wireframe. | `--grad-canvas-wash` (the Glass Brand canvas, `03` §3.2). |

⚠️ GATED ON owner confirmation of each deletion (L-REM-1 → L-REM-5).

### 4.2 Barrel update (`src/components/landing/index.ts`)

The barrel is updated to: **(a) export the new components** in their sub-dirs, **(b) drop the
removed ones**. Patch (additive exports + commented-out removals — do not delete lines until
L-REM-* closes, to keep the gate visible):

```ts
// ─── Landing redesign (2026-06-22, Glass Brand) — additive exports ───
export { LandingShellClient } from "./shell/LandingShellClient";
export { LandingHeader } from "./shell/LandingHeader";
export { LandingFooter } from "./shell/LandingFooter";
export { MaturityTag } from "./shell/MaturityTag";
export { HeroSection } from "./sections/HeroSection";
export { ProblemSection } from "./sections/ProblemSection";
export { LayerSection } from "./sections/LayerSection";
export { WhatYouGetSection } from "./sections/WhatYouGetSection";
export { HowItWorksSection } from "./sections/HowItWorksSection";
export { WhoItIsForSection } from "./sections/WhoItIsForSection";
export { WhyNotSpreadsheetSection } from "./sections/WhyNotSpreadsheetSection";
export { FounderSection } from "./sections/FounderSection";
export { PricingPhilosophySection } from "./sections/PricingPhilosophySection";
export { FinalCtaSection } from "./sections/FinalCtaSection";
export { ArchitecturePlate } from "./commercial-graph-plate/ArchitecturePlate";
export { ClaimsLedger } from "./claims-ledger/ClaimsLedger";
export { StatusPill } from "./shared/StatusPill";          // D-4 canonical
export type { ClaimStatus } from "./shared/StatusPill";    // D-4 canonical type
export { ScrollReveal } from "./motion/ScrollReveal";
export { LandingAnalyticsBoot } from "./analytics/LandingAnalyticsBoot";

// ─── REMOVALS (uncomment the deletions once L-REM-1…4 close) ───
// export { TestimonialSection } from "./TestimonialSection";           // L-REM-1
// export { CompanyProofCarouselSection } from "./CompanyProofCarouselSection"; // L-REM-2
// export { PartnerSection } from "./PartnerSection";                  // L-REM-3 (audit)
// export { companyProofData } from "./company-proof-data";            // L-REM-2

// ─── KEPT (reused, not reorged) ───
export { ABExperimentProvider } from "./ABExperimentProvider";   // composed by LandingAnalyticsBoot
export { LandingAnalyticsLoader } from "./LandingAnalyticsLoader"; // composed by LandingAnalyticsBoot
export { ClarityScript } from "./ClarityScript";                 // composed by LandingAnalyticsBoot
export { CookieConsentBanner } from "./CookieConsentBanner";     // reused as-is
export { MotionReveal } from "./MotionReveal";                   // wrapped by ScrollReveal
```

> **Auth barrel is separate.** `src/components/auth/` does not export through the landing barrel —
> the auth components are imported directly by `src/app/login/page.tsx` and the new
> `src/app/signup/page.tsx`. This keeps the auth surface isolated (it has its own designation
> rules, its own noindex posture, and its own gated items per doc 23).

---

## 5. The single client boundary + the hydrating leaves

Per doc 07 §1.1, the redesign keeps client JS to a **single shell boundary** with exactly the
interactive leaves hydrating. Everything else is RSC.

| Hydrating leaf | Why it hydrates | Reused or new? |
|---|---|---|
| `LandingShellClient` | Mounts `ScrollReveal` once + is the parent for the leaves below. | New (mirrors `WorkshopHomebaseClient`). |
| `LandingHeader` | Mobile hamburger toggle + footer-overlap state (`useState`). | Kept client (existing designation preserved). |
| `PlateCaption` | Node hover/focus → caption update. | New. |
| `ClaimFilter` | All/Live/Building/Planned filter toggle. | New. |
| `LandingAnalyticsBoot` | Composes `ABExperimentProvider` (fires `trackExperimentView`) + the analytics loaders. | New (composes existing pieces). |

**That is the full hydrating set for the marketing surface** — 5 leaves, matching the Workshop
Dashboard's "5 interactive leaves hydrate" posture (memory `workshop-dashboard-rsc`). Auth
(doc 23) adds its own form leaves (`LoginForm`, `SignupForm`, `GoogleButton`, `MagicLinkButton`)
on a separate route, so they are not simultaneous with the marketing leaves. **`HeroSection` is
client only because the existing one is** (`variant`/`isLoggedIn` interactivity); if the redesign
drops the in-hero toggle, it can return to RSC — a build-time call, not gated.

---

## 6. Cross-links

- `00-OVERVIEW.md` — owns the ratified keystone decisions D-1…D-5 this doc obeys (Glass Brand,
  full-page auth, orange discipline, ClaimStatus type, honest scoring) + the gate table.
- `01-DESIGN-DIRECTION.md` — owns the *direction rationale*; §3.4 preserves the prior "Document"
  direction as Alternative D (deferred).
- `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` — the section order this inventory builds against.
- `03-VISUAL-LANGUAGE-AND-TOKENS.md` — the tokens every component consumes by name (Glass Brand
  surface, Doto/Mono/SF Pro, the `--landing-*` aliases).
- `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` — the plate content + collapse behavior; the D-4
  `ClaimStatus` subset the plate narrows to.
- `05-COPY-SKELETON.md` — the copy each component renders (§3 map above).
- `06-PROOF-AND-CLAIMS-DISCIPLINE.md` — the matrix `<ClaimsLedger>` renders; the D-4 `ClaimStatus`
  type; the §15 removals rail.
- `07-ENGINEERING-CONSTRAINTS.md` — the RSC-first pattern (`LandingShellClient` mirrors
  `WorkshopHomebaseClient`); the responsive floor; the perf budget; the hydrating-leaves budget.
- `10-CANONICAL-DOC-MAP.md` — canonical filenames.
- `16-TEST-AND-VERIFICATION-PLAN.md` — the per-component test plan + the grep check that no
  divergent `ClaimStatus` definition exists.
- `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` — the file-level change inventory (this doc's §4 feeds it).
- `23-AUTH-EXPERIENCE.md` — owns the auth component layout + the closed-beta gate + the gated items;
  §2.6 above is the component pick-list that feeds it.

---

## 7. ⚠️ Gated on / Open decisions

Per D-5, no gate is silently marked closed. Each has a row in `LOOP_LEDGER.md`.

- **G — Owner confirmation of the removals (§4.1).** L-REM-1 → L-REM-5.
- **G — The `/signup` route + "Start free" launch behavior (L-FUN-2; L-FUN-1 superseded).** Blocks the `Start free`
  CTA `href` and the `SignupForm` vs `ClosedBetaGate` choice. Until resolved, "Start free" routes
  to `/login` (magic link handles signup) or `/contact`.
- **G — Founder bio assets (L-FND-1).** Blocks the `FounderSection` portrait/credentials/one-liner.
  The §2.2.1 fallback (the §11.5 paragraph alone) ships meanwhile — a complete, honest section.
- **G — The plate data model sourcing (§2.3).** The plate's nodes are sourced from doc 06 §3
  (the matrix); if the matrix drifts, the plate drifts. The sign-off gate
  (`09-CLAIMS-LEDGER-SIGN-OFF.md`) catches this pre-release.
- **O — `HowItWorksSection` as `<ol>` vs a custom layout.** The semantic is `<ol>` (it is a
  sequence); the visual can still be a horizontal stepper at desktop. Decision deferred to
  implementation; both satisfy a11y.
- **O — `WhoItIsForSection` tier collapse at mobile.** Tier 1 stays visible; Tiers 2/3 may
  collapse behind a disclosure at ≤414px to keep the mobile scroll manageable. Decision deferred
  to doc 02 §5.2 (mobile funnel compression).
- **O — `LandingHeader` RSC-split (§2.1).** Default = keep client (smaller diff). Split into
  RSC + `LandingHeaderNav` leaf only if the client payload is too heavy at build time. Not gated.

**Resolved by this revision (no longer gates):**
- **StatusPill shared path (prior gap #2)** — resolved: `StatusPill` lives at
  `src/components/landing/shared/StatusPill.tsx` and defines the D-4 `ClaimStatus` type; both
  `ClaimRow` and `PlateNode` import it. No divergent definitions.
- **Auth component set (prior gap #1)** — resolved: §2.6 adds the 7 auth components with paths,
  props, and RSC/client designations, cross-linked to doc 23.
- **A/B SSR-vs-client split (prior gap #3)** — resolved: §2.1 pins the RSC page as the
  assignment computer; the shell forwards.
- **`FounderSection` fallback (prior gap #3)** — resolved: §2.2.1 gives the concrete fallback
  render, gated L-FND-1.
- **Glass Brand re-skin (prior gap #4)** — resolved: every component binds to Glass Brand tokens
  (`.dashboard-glass*`, `--grad-canvas-wash`, Doto/Mono/SF Pro); the barrel update (§4.2) drops
  the removed components.

---

## 8. Coherence contracts (this doc honors)

- **D-1 (Glass Brand)** — every component re-skins to `.dashboard-glass` / `.dashboard-glass-warm`
  over `--warm-canvas #f5f5f5`, Doto/Mono/SF Pro type. No paper/serif default. ✅ (§2 throughout)
- **D-2 (full-page 2-col auth)** — §2.6 adds the 7 auth components; layout rationale owned by
  doc 23. ✅
- **D-3 (orange discipline)** — `--brand-orange #F24405` for fills/logo/focus; `--brand-orange-dark
  #C63804` for AA small text; `--glass-logo-orange #F24405` for the auth logo slab. **Clay
  `#AA412A` is NOT a token, NOT referenced.** ✅
- **D-4 (ClaimStatus type)** — single type in `shared/StatusPill.tsx`; `ClaimRow` imports the full
  type, `PlateNode` narrows to the Live/Building/Planned subset. No divergent definitions. ✅
- **D-5 (honest scoring)** — §9; no self-congratulation. Gated items carried, not claimed. ✅
- **Tailwind v4 gotcha** — `bg-[color:var(--x)]`, never `bg-[var(--x)]` (memory
  `tailwind-arbitrary-var-needs-color-hint`); enforced in doc 05/07 review checklists. ✅
- **Rate-limiting = Postgres** — no Redis. Auth forms (`LoginForm`/`SignupForm`) rely on the
  existing Postgres rate-limit + honeypot; Turnstile NOT yet built (doc 15/23). ✅
- **Radical honesty** — no fabricated logos/testimonials/stats/badges; `AuthGlassPanel` is abstract
  gradients + frost only, NO fake screenshots (D-2). ✅

---

## 9. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **95 / 100** | The component tree fully encodes the Glass Brand pivot (D-1), the single-ClaimStatus-type contract (D-4), the auth component set (D-2, cross-linked to doc 23), and the A/B SSR-vs-client split pinned to the real `getVariant`/`ABExperimentProvider` recon. The "single client boundary + 5 hydrating leaves" posture mirrors the proven Workshop Dashboard RSC pattern. Not 100 because L-FUN-2 (self-serve behavior) and L-FND-1 (founder bio) genuinely affect final copy/flow and are owner-open, not doc-resolvable; and the §2.1 RSC-split alternative for `LandingHeader` is deferred to a build-time perf call (honestly open, not silently closed). |
| **Quality** | **95 / 100** | Every token citation is grep-verified against `globals.css` with anchors (`--ink` L10, `--secondary` L11, `--brand-orange` L37, `--success` L92, `--warning` L94, `--glass-logo-orange` L131, `MotionReveal.tsx:5`, `ABExperimentProvider.tsx:13`, `page.tsx:4,26`). The D-4 type is defined once and narrowed via `Exclude<ClaimStatus,"NotUs">` — no divergent definitions. Every cross-link resolves to a canonical filename. No `#AA412A`/clay, no paper/serif default, no `#292929` positive use. Not 100 because the §4.2 barrel patch is a planning sketch (the implementer reconciles it against the actual `index.ts` at build time), and the exact glass composition inside `AuthGlassPanel` is specified as constraints (gradients, frost, no screenshots) but not pixel-designed — correctly deferred per DESIGN.md-as-alpha. |
| **Implementation-Readiness** | **92 / 100** | An implementer can start: real source bindings (§0), exact component paths, RSC/client designations, designation rationale, the concrete `FounderSection` fallback (§2.2.1), the A/B assignment pinned to the RSC page (§2.1), and the barrel patch (§4.2). The new `src/components/auth/` dir and `/signup` route do not exist yet (they are the deliverable, owned by doc 23); the §1 sub-dirs (`shell/`, `sections/`, etc.) are a proposed reorg the implementer executes. Not 100 because L-FUN-2 honestly blocks the `SignupForm` vs `ClosedBetaGate` choice and the final `Start free` launch behavior, and the RSC-vs-client designation of `HeroSection` (client today) is a build-time call that depends on whether the in-hero interactivity survives the redesign. Per D-5 these open gates cap readiness below 100 rather than being silently closed. |

**Carried to LOOP_LEDGER (not silent):** L-REM-1…5 (removals), L-FUN-1 (superseded route record), L-FUN-2
(beta onboarding/self-serve), L-FND-1 (founder bio), L-CRM-1 (waitlist destination for
`ClosedBetaGate`). Plus the open implementation calls (O-items in §7) that are not owner-gated.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.**
Voice throughout = Controlled Confidence (§10). Pricing framing stays hypothesis-labeled per §9.3
(no locked price). Rate-limiting is Postgres (`security_rate_limit_events` table), NOT Redis (project position).
Turnstile is NOT yet built (planned); auth-form abuse = honeypot + Postgres rate-limit +
validation; CAPTCHA escalation-only.
