# 06 — Section-by-Section Improvement Spec

Status: complete. Target page architecture with per-section spec: purpose, layout, copy (final
text from 04), visual treatment (tokens from 05), motion, responsive, accessibility, and
acceptance criteria. File-level implementation steps live in `07_IMPLEMENTATION_PLAN.md`.

## Target page architecture (9 sections, ~6 viewports, vs. current 8 sections / 7.1 viewports)

| # | Section | Status vs today | Background |
| --- | --- | --- | --- |
| 0 | Header | refine | `--paper-0`, petrol state over dark sections |
| 1 | Hero with product-proof artifact | rebuild visual, keep copy skeleton | `--paper-0` |
| 2 | Rough-flow diagram band ("the method") | upgrade in place | graph-paper |
| 3 | Problem section | **new** (copy ready in 04 §4) | `--paper-1` |
| 4 | Capability proof ×3 (workspace / library / handoff+history) | rebuilt from drench section | `--paper-0` alternating rows |
| 5 | Product showcase (petrol anchor) | restyle + retitle | `--brand-petrol` |
| 6 | Honest proof strip | **new** (replaces testimonials) | `--paper-1` |
| 7 | Beta & pricing + FAQ | refine + add FAQ | `--paper-1` |
| 8 | Final CTA (the one clay moment) | restyle | `--brand-clay`, ≤60vh |
| 9 | Footer | keep + cookie link | `--brand-petrol-deep` |

Cut from today: empty logo marquee, fake testimonials, 5 video placeholders, 9-slide Ken Burns
rotation, `#method` as standalone 432px text band (its copy moves into section 4's intro).

---

## 0. Header

**Keep:** sticky behavior, logo, IntersectionObserver color-swap mechanic (extend to all dark
sections, not just footer).
**Change:** nav = `How it works (#method) · Product (#product) · Beta & pricing (#pricing) ·
Contact (/contact)`; CTA = signed-out "Request beta access" → `/contact`, signed-in "Open the
workspace" → `/workshop`. 3px radius on CTA.
**Acceptance:** anchors scroll with −80px offset (existing Lenis config); keyboard focus visible in
both color states; mobile menu lists the same four anchors + CTA.

## 1. Hero — "precise document, human pencil" (rebuild of the visual, copy mostly kept)

**Purpose:** in one screen: category (eyebrow), outcome (H1), who/how (support), product proof
(artifact), one primary action + one quiet path.

**Layout (lg):** 12-col grid. Copy cols 1–5: eyebrow → H1 → support → CTA row — as one continuous
block, `gap` rhythm 12px/20px/28px (kills the ~250px dead band, 02 §B4). Artifact cols 6–12.
**Layout (<lg):** copy stack, then a compact artifact (see responsive note) — mobile keeps product
proof (02 §B5).

**Copy (final, from 04):**
- Eyebrow: `Estimating & proposal workspace for construction teams`
- H1: `The fastest path from proposal to approval.` (display token, `text-wrap: balance`)
- Support: `Stop wasting time on messy spreadsheets and scattered feedback. archestimator gives
  you one connected workspace to build pricing, manage revisions, and get faster approvals.`
  (rough underline on "archestimator" — keep)
- CTAs: primary `Request beta access` / signed-in `Open the workspace`; secondary text-link
  `See how it works ↓` → `#method`
- Badge: `Now on closed beta` (sentence case), pinned to the artifact frame's title block.

**The artifact (replaces photo rotation):** a composed estimate-sheet document on a `--paper-2`
mat with hairline rule and a title-block tab reading `Estimate — Kitchen fit-out — Rev B`:
- Left rail: mini project tree (Kitchen / Bathroom / Project-wide — reuse
  `ProductPreviewVariants` content).
- Body: 5–6 line items with mono quantities/rates/amounts (₱ or neutral per owner decision 02 §G4),
  a totals row.
- One library card half-overlapping the sheet edge ("Painter day rate — drag into Kitchen") to
  show the component-reuse story.
- Hand-drawn layer: rough circle around the total (clay), one margin note + arrow
  ("clients see this →" pointing at a proposal-preview chip).
- Backdrop: optional single warm-toned photo strip at ≤12% opacity behind the mat, or nothing.
  Total hero media budget ≤500KB.

**Motion:** on load (once): rows fade in sequentially (~1.6s total), total sums up in mono, rough
circle draws (720ms), underline draws in support copy (existing timing). Reduced motion: all
pre-rendered. No infinite hero animation.

**Acceptance:** H1+eyebrow+support+CTA+artifact all visible at 1280×800 without scroll; artifact
text ≥12px and real (no lorem); CTA says what happens next; LCP element is the artifact mat
(styled DOM/SVG, not a JPEG); zero CLS from font/artifact load.

## 2. Rough-flow diagram band — "Quote in the shape of the offer."

**Keep:** graph-paper background, rough.js hand-drawn flow concept, right-column prose (best copy
on page, now leading the section), reduced-motion discipline.
**Fix:** whole-word labels (shorten: `Component Library` → two lines pre-broken at word boundary;
`Intuitive Estimating Experience` → `Estimating`), linework-palette strokes with single clay
emphasis on the active node (05 §3.2).
**Upgrade:** continuous stroke-dashoffset draw, 25–35s loop, sequence Workflow → Library →
Estimate → Proposal → Decision; visually-hidden `<ol>` text alternative.
**New heading:** H2 `Quote in the shape of the offer.` above the band (headline-lg token).
**Acceptance:** no mid-word breaks at 360px–1920px; flow legible at 768px (stack diagram above
prose below lg); screen reader hears the 5-step flow; loop pauses under reduced motion (static
fully-drawn state).

## 3. Problem section — new

**Copy:** exactly 04 §4 (eyebrow "The old way", H2 "The hard part is not the total…", body, rough
circle on "feels normal").
**Layout:** single centered column ≤68ch on `--paper-1`; no cards, no icons — let the words work.
One sketch mark only.
**Acceptance:** body contrast ≥4.5:1 (`--ink-2` on `--paper-1`); section ≤70vh; no eyebrow if the
rhythm already has two eyebrowed sections in view (05 §2.3).

## 4. Capability proof — three rows, one job each (rebuilt from the drench section)

**Intro (replaces `#method` standalone band, keeps its copy):** H2 `Workflows designed for every
estimating specialty.` + the existing "Every team names scope differently…" paragraph.

Then three alternating rows (text 5 cols / proof 7 cols, swapping sides), each with a **distinct
proof form** (no identical card grid — 02 §D6):

| Row | Copy block (from 04 §3 — kept verbatim) | Proof form |
| --- | --- | --- |
| 4a Project-shaped workflow | "Project-Shaped Workflow / Structure your proposal the way you think about the work / Organize costs around the real shape of the engagement…" | Mini project-tree + grouped estimate table mockup; margin note "by phase, room, or package" |
| 4b Reusable component library | "Build it once. Use it everywhere. / Save any component, materials, services, labor, packages…" | Library-card cluster with one card mid-drag onto a sheet; rough arrow "reused from last project" |
| 4c Proposal handoff + record | "From costing to client-ready in one flow / Carry your line items, totals, exclusions, and assumptions…" + reframed revision line ("Revision history — in progress…", 04 §3) | Split artifact: estimate sheet → share-page preview; small "Planned" tag (icon+text) on the revision timeline element |

**Treatment:** mockups on `--paper-2` mats with title-block tabs (05 §4); mono numbers; one sketch
mark per row max.
**Motion:** standard enhance-only reveal (05 §6).
**Acceptance:** each row's claim maps to a real or explicitly-planned capability (01 §11 matrix);
no play-button placeholders anywhere; rows stack cleanly <lg with proof above text.

## 5. Product showcase — the petrol anchor (restyle in place)

**Keep:** tab structure, keyboard nav, honest MVP/Planned badges, mockup panels.
**Change:** background `--brand-petrol`, light text (`#f4efe9` family, lh +0.05); panels stay as
light paper mats so the product reads as a lit document on a dark drafting table — this is where
the page's second brand color finally gets a body section (02 §D2).
- Eyebrow: `Inside the workspace`; H2: `A structured workspace for the whole quote.` (04 §3)
- Tabs: `Estimate workspace (MVP)` / `Component library (MVP)` / `Revision history (planned)` /
  `Proposal comparison (planned)` — badges icon+text (a11y F2).
- One rough annotation per panel (clay reads well on petrol — verify ≥3:1 for graphical marks).
**Acceptance:** tab text contrast ≥4.5:1 in both states; tab panel swap ≤300ms with no layout
shift; section ≤1.2 viewports.

## 6. Honest proof strip — new (replaces fake testimonials/logos)

**Copy:** 04 §4 honest-proof block — H2 "Built in the open, with the teams using it.", four
verifiable facts as a row of document-chips (mono where numeric), founder line as a single quiet
quote with real attribution (owner to approve).
**Treatment:** `--paper-1`, hairline-ruled chips, no carousel, no autoplay — static. (Removes
WCAG 2.2.2 issue F1 entirely.)
**Acceptance:** every statement verifiable at publish time; no invented personas anywhere in DOM
(including aria/alt text); when real testimonials exist later, they join here with named consent.

## 7. Beta & pricing + FAQ

**Keep:** honest framing, "Request access" CTA, the facts.
**Change:** H2 `Free during the closed beta. Honest pricing after.`; the "0" as a mono set-piece
with rough circle (the section's single clay accent); third card line per 04 §3; add the 4-question
FAQ (04 §4) as an accessible accordion (`<details>`/`<summary>` or button+region with
`aria-expanded`).
**Acceptance:** FAQ keyboard operable, arrow-key optional, all panels reachable; pricing card
reads in <20s; no plan-tier theater (no fake tiers).

## 8. Final CTA — the one clay moment

**Layout:** full-bleed `--brand-clay` band, ≤60vh, single centered block.
**Copy:** H2 mirrors hero: `The fastest path from proposal to approval.` with white rough underline
on "proposal to approval"; sub-line `A clearer way to create quotes, estimates, and proposal-ready
documents.`; CTA (paper-0 button, clay text): signed-out `Request beta access`, signed-in
`Open the workspace`.
**Acceptance:** white-on-clay text ≥4.5:1 at rendered sizes; this is the page's only clay surface
(05 §1.4); CTA target matches hero exactly (research: final CTA mirrors hero).

## 9. Footer

**Keep:** structure, petrol-deep ground, nav groups, header color-swap.
**Add:** "Cookie settings" link inside footer utility row (the floating chip disappears after
first consent decision — 02 §D7). Re-tint decorative graph lines to `--linework-petrol` family
(replace borrowed lavender `#d8c3d2` with a tint derived from our own palette).

---

## Cross-section acceptance (page-level)

1. **Honesty:** zero fake testimonials/logos/metrics; zero empty media frames; live-vs-planned
   claims consistent across all sections (02 §A1–A3).
2. **Visibility robustness:** every section fully readable with JS disabled and with
   IntersectionObserver never firing (02 §D1); motion is enhancement-only.
3. **Color discipline:** ≤1 clay surface, 1–2 petrol surfaces, ~70% paper; accents per 05 §1.4.
4. **Type discipline:** DESIGN.md Inter landing scale; mono numbers; sentence case; ≤3 families.
5. **Hand-drawn discipline:** marks from the 5-item vocabulary only, ≤2 per viewport, always
   annotating real content (05 §3).
6. **Performance:** hero media ≤500KB; total landing image payload ≤900KB; LCP ≤2.5s (4G mid-tier);
   CLS ≤0.1; INP ≤200ms; remove orphan 2.3MB PNG.
7. **Accessibility:** WCAG 2.2 AA pass on the checklist in 08 §4; reduced-motion parity preserved.
8. **Responsive:** 360 / 768 / 1024 / 1440 / 1920 verified; no horizontal overflow; mobile hero
   retains product proof.
