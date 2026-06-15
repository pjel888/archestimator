# 01 — Current State Audit (Evidence-Gated)

Status: audit complete, verified against source code and a live browser session on 2026-06-11.
Branch at audit time: `claude/unification-plan-components-templates` (landing code unchanged on this branch; matches `main`).
Live evidence: `next dev` on `http://localhost:3000`, Chrome session, desktop viewport 1497×977.

This document records what the landing page **is** today. Improvement direction lives in
`02_UX_UI_ANALYSIS.md` and `06_SECTION_BY_SECTION_IMPROVEMENT_SPEC.md`.

---

## 1. Route and composition

| Item | Fact | Evidence |
| --- | --- | --- |
| Route | `/` (public homepage), server component | `src/app/page.tsx` (50 lines) |
| Page `<title>` | "Archestimator \| Quote, Proposal & Estimate Workspace" | live tab title, `src/app/page.tsx` metadata |
| Auth behavior | Server-side auth check switches CTA targets (`/contact` vs `/workshop`) | `src/lib/landing/get-landing-auth-state.ts` |
| A/B testing | Hero copy variant A/B assigned server-side, gated on cookie consent | `src/components/landing/ABExperimentProvider.tsx`, `src/app/page.tsx:24-26` |
| Smooth scroll | Lenis (`lenis@1.3.23`), lerp 0.105, wheelMultiplier 0.86, disabled under reduced motion | `src/components/landing/LandingSmoothScrollProvider.tsx` |
| Analytics | GA4 + Microsoft Clarity, consent-gated; GDPR cookie banner | `LandingAnalyticsLoader.tsx`, `ClarityScript.tsx`, `CookieConsentBanner.tsx` |

### Render order (verified live, with measured geometry)

| # | Section | Component file | Live anchor | Top (px) | Height (px) | Background |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Sticky header | `src/components/landing/LandingHeader.tsx` | — | 0 | 73 | `#fffdf9`; switches to brand tone over footer |
| 1 | Hero | `src/components/landing/HeroSection.tsx` (332 lines) | — | 73 | 849 | `#fffdf9` |
| 2 | Rough.js proposal-record diagram | `src/components/landing/AnimatedProposalRecordSection.tsx` | — | 1011 | 474 | `landing-quote-grid-paper` (graph-paper cream), borders `#e5e0d8` |
| 3 | Brand drench: workflow video + 4 feature cards + testimonials | `src/components/landing/CompanyProofCarouselSection.tsx` | — | 1485 | 1658 | `bg-brand-orange` `rgb(170,65,42)` |
| 4 | Secondary claim | `src/components/landing/SecondaryClaimSection.tsx` (27 lines) | `#method` | 3142 | 432 | `#fffdf9` |
| 5 | Product showcase tabs | `src/components/landing/ProductShowcaseSection.tsx` | `#product` | 3575 | 1139 | `#f7f1ea` |
| 6 | Pricing / closed beta | `src/components/landing/PricingSection.tsx` (50 lines) | `#pricing` | 4714 | 611 | `#f7f1ea` |
| 7 | Final CTA | `src/components/landing/FinalCTASection.tsx` (39 lines) | `#contact` | 5325 | 540 | `#fffdf9` |
| 8 | Footer | `src/components/landing/LandingFooter.tsx` | — | ~5865 | ~1090 | `rgb(8, 50, 65)` blue-green |

Total document height at 1497px wide: **6,958px** (~7.1 viewports).

### Dead weight in the barrel file

`src/components/landing/index.ts` exports **7 unused section components**: `SolutionSection`,
`EstimatorEngineSection`, `FeaturesSection`, `PartnerSection`, `TestimonialSection`, `FAQSection`,
`ProductPreview`. `AnnouncementBanner` is also unused.

---

## 2. The two brand color systems

The user's "orange/red thing" and "blue/green thing", verified:

### Orange/red — terracotta brand accent

| Token | Value | Defined at |
| --- | --- | --- |
| `--brand-orange` | `rgb(170, 65, 42)` = `#aa412a` | `src/app/globals.css:22` + Tailwind `@theme inline` (`globals.css:57-58`) |
| `--brand-orange-dark` (hover) | `rgb(140, 54, 35)` = `#8c3623` | `src/app/globals.css:23` |

Used for: all CTAs ("Start Winning", "Request access", "Open workspace"), hero eyebrow ("Close
Projects Faster."), rough-notation underlines (color `rgb(170,65,42)`, `HeroSection.tsx:97`), the
entire Section-3 drench background, "Planned preview" badges, header CTA, hover states.

### Blue/green — deep teal "trust" color

| Usage | Value | Defined at |
| --- | --- | --- |
| Footer background | `rgb(8, 50, 65)` = `#083241` | `LandingFooter.tsx:10` (`const footerColor`) |
| Rough.js diagram strokes | `#083241` (`BLUE_GREEN` const) | `AnimatedProposalRecordSection.tsx:48` |
| Header-over-footer state | same tone | `LandingHeader.tsx:47-51` (IntersectionObserver) |

**Key gap:** the blue-green is **not a CSS token**. It is a per-component constant, so it cannot be
reused consistently (and is invisible to Tailwind utilities). The orange is tokenized; the teal is not.

### Supporting diagram colors (rough.js only)

- Muted yellow `#d8a84f`, olive `#6f7a3d` — `AnimatedProposalRecordSection.tsx`.

### Section background rhythm (current)

`#fffdf9` (cream-white) → graph-paper cream → **terracotta drench** → `#fffdf9` → `#f7f1ea` (tan)
→ `#f7f1ea` → `#fffdf9` → **deep teal footer**. The teal appears **only** at the footer; the page
reads "orange brand" for 6 of 7 viewports and introduces the second brand color only at the exit.

---

## 3. Hero section — current implementation

`src/components/landing/HeroSection.tsx` (332 lines). Layout: left copy column + right visual.

### Copy (verbatim, A/B variants)

| Slot | Variant A (default) | Variant B |
| --- | --- | --- |
| Eyebrow | "Close Projects Faster." | "Win More Bids." |
| H1 | "The fastest path from proposal to approval." | "Estimate with Precision. Win with Clarity." |
| Support | "Stop wasting time on messy spreadsheets and scattered feedback. archestimator gives you a single, centralized workflow to build pricing, manage revisions, and get faster approvals." | "Replace the chaos of manual data entry with a system that scales. archestimator connects your proven pricing data directly to your client proposals, keeping every revision organized until the contract is signed." |
| CTA | "Start Winning" → `/contact` (signed out) or `/workshop` (signed in) | same |

The word "archestimator" in support copy gets a **rough-notation** hand-drawn underline
(`rough-notation@0.5.1`, stroke 1.7–2.2px, iterations 2, 620–720ms draw, staggered 520ms/980ms,
disabled under reduced motion). This is the "rough notation" signature the owner wants kept.

### Right visual stack (bottom to top)

1. **9 rotating construction JPEGs** with Ken Burns zoom — 72s full cycle, 8s stagger
   (`public/landing/hero-slides/construction-slide-0[1-9].jpg`, 204–407KB each, **~2.8MB total**;
   plus a legacy unused 2.3MB PNG `archestimator-frosted-construction.png`).
2. Frosted gradient + 1.5px blur overlay (`HeroSection.tsx:265-266`).
3. **Neat.js procedural canvas** wireframe gradient, mix-blend-screen, 45% opacity, deferred to
   idle callback (`NeatWireframeBackground.tsx`).
4. **Hero diagram flow** (hidden < lg): three numbered cards — "01 Estimate Faster", "02 Centralized
   Workflow", "03 Accelerate Approvals" — with Phosphor icons and small detail copy, connected by
   animated flow lines (20s infinite pulses).
5. **Signal rail** (right edge): 5 scanning items — "Project-Shaped Workflow", "Reusable Component
   Library", "Intuitive Estimating Experience", "Proposal Handoff", "Activity History" (12s cycle).
6. Status badge: "Now On Closed Beta".

### Live visual observations (desktop screenshot evidence)

- The composited photo+blur+canvas backdrop renders **muddy brown and out of focus**; the three
  floating cards sit on it at ~12px body size with low figure-ground separation.
- A **large vertical whitespace gap** (~250px) sits between the H1 and the support copy in the left
  column; the column reads as two disconnected fragments.
- No real product UI is visible anywhere in the hero. The diagram cards describe outcomes;
  the photo describes "construction", not the product.
- Title-case headline fragments ("Estimate Faster", "Accelerate Approvals") and the CTA
  "Start Winning" carry a salesy register that the brand-voice spec explicitly avoids.

---

## 4. The rough-notation diagram section

`AnimatedProposalRecordSection.tsx` + `AnimatedProposalRecordSection.module.css`, drawn with
`roughjs@4.6.6` on a 1000×320 SVG canvas (stroke 2px, iterations 2).

Flow: **Project Workflow → Component Library → Estimating Experience → Estimate → Proposal →
Feedback/Decide → Approved**, with sketch circles ("Intuitive Estimating Experience", "Reusable
Component Library") and hand-drawn arrows. Colors: `#083241`, `#aa412a` family, `#d8a84f`, `#6f7a3d`
on graph-paper cream (`landing-quote-grid-paper`, `globals.css:251-279`).

Right column prose (verbatim): "Build the estimate and turn it into a clear cost proposal your
client can review, comment on, and approve." / "Keep the pricing, scope, feedback, revisions, and
final decision in one place, without stitching together spreadsheets, PDFs, email threads, and
scattered comments by hand."

**Live defects observed:**

- Sketch-circle labels **break words mid-syllable**: "Reusable Componen t Library", "Intuitive
  Estimating Experienc e" (fixed-width circles + no text wrapping strategy).
- The diagram canvas is `aria-hidden` with no text alternative for the flow it communicates.
- At 1497px the diagram occupies the left ~62% with the prose right column; below `lg` the
  composition stacks and the canvas scales down until stroke labels approach illegibility.

---

## 5. Brand drench section (terracotta)

`CompanyProofCarouselSection.tsx` (196 lines), bg `rgb(170,65,42)`, 1,658px tall (~1.7 viewports).

Contents in order:

1. **Empty company-logo carousel viewport** — `aria-hidden`, currently renders nothing (placeholder
   for a logo marquee, 68s animation when populated).
2. Eyebrow "Launch feature video" + H2 "See the complete archestimator workflow" (with white
   rough underline on "archestimator") + support copy: "A single launch-ready walkthrough for
   estimating, reusable components, proposal handoff, review, and client decision records."
3. **Video placeholder** (aspect-video, grid texture, play icon — no actual video).
4. **4 feature cards**, each with another small video placeholder + copy (verbatim headers):
   - "Project-Shaped Workflow" — "Structure your proposal the way you think about the work"
   - "Reusable Component Library" — "Build it once. Use it everywhere."
   - "Proposal Handoff" — "From costing to client-ready in one flow"
   - "Activity History" — "Every revision. Every decision. Always on record."
5. **Testimonial crossfade carousel** (3 slides, 18s infinite, blur transitions), quotes attributed
   to "Estimating lead / Commercial interiors beta workflow", "Preconstruction manager / General
   contractor", "Proposal owner / Specialty trade".

**Claims-safety conflict:** `.ai/06_specs/brand/brand-narrative.md` ("Proof types to avoid until
real: fake testimonials") and `landing-brand-narrative-map.md` §13 ("Fake customer logos and
testimonial blocks should not appear on the public homepage until they are real") — yet the
testimonial carousel ships with invented attributions, and the empty logo-marquee scaffolding waits
for logos that do not exist. **Five video placeholders** (1 large + 4 cards) ship with no videos.

---

## 6. Below-drench sections (verbatim copy)

### `#method` — SecondaryClaimSection

- Eyebrow: "Built around construction estimate patterns"
- H2: "Workflows designed for every estimating specialty."
- Support: "Every team names scope differently. Archestimator gives the quote enough structure to
  carry rooms, assemblies, supplier context, allowances, and revisions without flattening the work
  into one brittle spreadsheet."

### `#product` — ProductShowcaseSection

- Eyebrow: "Platform method"; H2: "The Archestimator estimate residency"
- Support: "A structured workspace for training your own estimate logic: the project tree, reusable
  library, revision memory, and proposal path all stay visible as the quote matures."
- 4 tabs with status badges: Estimate Workspace (MVP preview), Component Library (MVP preview),
  Revision Intelligence (Planned preview), Proposal Comparisons (Planned preview).
- Tab panels are **synthetic mockups** (`ProductPreviewVariants.tsx`), not screenshots: estimate
  table with tree sidebar and component picker; rows like "Lighting rough-in … ₱46,800 … ₱148,800",
  "Painter day rate — Drag or insert into Kitchen". Currency is **PHP (₱)**.
- Keyboard support on tabs: ArrowLeft/Right, Home/End. Status badge is color-distinguished.

Note: "estimate residency" is a direct echo of amigo.ai's "The Amigo Digital Residency" concept
(see `.omx/artifacts/visual-ralph/landing-amigo-reference/amigo-reference-structure.json`), not a
term from the Archestimator brand vocabulary.

### `#pricing` — PricingSection

- Eyebrow: "Closed beta partnership"; H2: "A partnership focused on quote-to-proposal value."
- Support: "Request access to the closed beta for structured quote sheets, reusable catalog logic,
  and connected estimate organization. Payment, checkout, and public plans are deferred until after
  beta."
- Card: giant "0", "No payment during beta", "Pricing decisions come after beta learning, workflow
  fit, and owner review." CTA "Request access" → `/contact`.

### `#contact` — FinalCTASection

- Eyebrow: "Start quoting"; H2: "Reliable estimating infrastructure for construction proposals."
- CTA: "Open workspace" + arrow → `/workshop`.

### Footer — LandingFooter

Deep teal `rgb(8,50,65)`, nav groups, logo, decorative graph backdrop with pale lavender accents
(`#d8c3d2`). The sticky header swaps to the teal/brand state over the footer via
IntersectionObserver.

---

## 7. Typography and motion

| Aspect | Current fact | Evidence |
| --- | --- | --- |
| Font actually rendered | SF Pro stack (`--font-sf-pro`), body and `[data-landing-page-root]` | `globals.css:34,88,93` |
| Font loaded but unused | **Inter is downloaded via `next/font` yet not applied to landing** | `src/app/layout.tsx:2,7` vs `globals.css:88-94` |
| DESIGN.md landing scale | Specifies **Inter** display 4rem/400/-0.055em … body 1rem/350 (scope: landing-only) | `DESIGN.md` typography block |
| Live H1 size | 38px → 48px (sm) → 54px (lg) | `HeroSection.tsx:200-208` |
| Animation inventory | 20+ keyframes: Ken Burns ×9, testimonial crossfade 18s, marquee 68s, signal scan 12s, diagram pulses 20s, MotionReveal fade/slide 700ms | `globals.css:175-844` |
| Scroll reveal | `MotionReveal.tsx` — IntersectionObserver, threshold 0.1, bottom margin −40px, stagger via transition-delay | `MotionReveal.tsx` |
| Reduced motion | Comprehensively honored (rough-notation animate:false, Lenis off, CSS media block) | `HeroSection.tsx:131,142-143`, `globals.css:791-844` |

**Critical motion defect (reproduced live):** with rAF throttled (background tab / busy main
thread), scrolled-to sections render **fully blank** — the terracotta band and `#pricing`/footer
captured as empty color fields. Reveal-gated visibility means content visibility depends on
animation timing. This also risks blank paints during fast scrolling on low-end devices and during
headless/social-preview rendering.

---

## 8. Performance traits

| Aspect | Fact |
| --- | --- |
| Hero media | 9 JPGs ≈ 2.8MB total, all mounted at load; only ~1–2 ever seen per visit (72s cycle); plus 2.3MB unused legacy PNG in `public/landing/` |
| LCP candidate | Hero slide 01 (308KB, `preload`); composited under 3 overlay layers |
| JS on landing | All sections are client components; rough.js imported eagerly (~50KB gz); Neat.js deferred to idle; Lenis always loaded |
| Fonts | No webfont request for landing rendering (SF Pro system stack) — but Inter downloads anyway via `next/font` in the root layout |
| Third-party | GA4 + Clarity, consent-gated (good) |

---

## 9. Accessibility snapshot

Good: semantic landmarks, alt text on hero slides, keyboard-navigable tabs, focus-visible rings,
thorough reduced-motion handling, consent-gated tracking.

Gaps:

1. Testimonial carousel autoplays (18s) with **no pause control** and no `aria-live` strategy (WCAG 2.2.2).
2. "Planned preview" vs "MVP preview" badges distinguished by **color only**.
3. Rough.js flow diagram has no text alternative describing the flow.
4. Hero diagram + signal rail are `hidden lg:block` — mobile users get **zero product narrative** in the hero.
5. Orange `#aa412a` on cream `#fffdf9` ≈ 4.6:1 — passes AA for body, but the **12px** usages leave no margin; white-on-orange small text in the drench section is similar.
6. Five video placeholders use `role="img"` + label, announcing media that does not exist.

---

## 10. Prior art on file (do not re-derive)

| Source | What it already contains |
| --- | --- |
| `.ai/03_plans/landing-page-improvement/` (23 docs) | 2026-05 era: below-hero layout, motion plan, Lenis + placeholder-proof plan, scroll-snap correction, GDPR/A-B stack decisions, public-subpages claims matrix, prior audits |
| `.ai/09_archive/store/2026-05-28-landing-page-below-hero-complete/` | Snapshot of completed below-hero work |
| `.ai/09_archive/store/2026-05-28-landing-page-ab-testing-and-consent-complete/` | GDPR + A/B implementation snapshot |
| `.omx/artifacts/visual-ralph/landing-amigo-reference/` | Scraped amigo.ai DOM structure JSON + desktop/mobile screenshots used for the current layout |
| `.omx/context/landing-amigo-redesign-20260607T173011Z.md` | The original "redesign to amigo composition" brief and constraints |
| `Landing-Page-Research-Report.md` (this folder) | 2026-06 conversion-pattern research: hero/CTA/proof/pricing patterns, copy templates, GA4 taxonomy, SEO metadata, CWV targets |

## 11. App reality check (what landing claims must stay true to)

Implemented today (route evidence): `/workshop/projects` (projects + estimate sheets),
`/workshop/library` (reusable component library), `/workshop/templates`, `/workshop/components`,
`/workshop/settings`, `/workshop/feedback`, `/share/[token]` (client-facing share page),
plus public `/contact`, `/about`, `/pricing`, `/features`, `/terms`, `/privacy`, `/login`.

Landing claims mapped to reality:

| Landing claim | Status |
| --- | --- |
| Project-shaped workflow / estimate workspace | Real (MVP) |
| Reusable component library | Real (MVP) |
| Proposal handoff | Partially real — share page exists; export/proposal-package maturity must be verified before strengthening claims |
| Activity history / revision intelligence | **Marketed in feature cards but tabbed as "Planned preview"** — internally inconsistent on the same page |
| Proposal comparisons | Planned |
| Testimonials & logos | Not real — placeholder content (violates brand guardrails) |
