# Landing Page Comprehensive Improvement Plan — Overview

**Status:** PLANNING COMPLETE — awaiting owner decisions (09 §A), then implementation per 07.
**Created:** 2026-06-11. **Owner:** Philip.
**Scope:** public landing page `/` only (no app/workshop surfaces, no schema work).

## The brief (from Philip)

Make the landing page **more authentic and marketable**, in the spirit of **amigo.ai** and
**intercom.com**, keeping the two existing brand colors (the orange/red and the blue/green) and
keeping most of the existing copy. The hero and the rough-notation diagrams below it are good
**but still greatly need improvement**. Ground everything in a comprehensive understanding of the
app, brand, and company.

## The three sentences that drive this plan

1. **The page is wearing another brand's system** — its two colors are byte-identical to
   amigo.ai's published CSS variables (`#aa412a`, `#083241`), and its section concepts/order are
   amigo's; that is the structural root of the "not authentic" feeling (03 §1).
2. **Its biggest credibility leaks are self-inflicted** — fake testimonials, an empty logo
   marquee, five videoless video frames, and live-vs-planned claims that contradict each other on
   the same page, all of which the project's own brand guardrails already prohibit (02 §A).
3. **Its most ownable asset is already on the page** — the rough-notation "human pencil over a
   precise document" voice, which no AEC competitor occupies; the plan systematizes it instead of
   inventing a new aesthetic (05 §3, 03 §4).

Design thesis: **a precise document with a human pencil over it** — crisp paper surfaces,
mono-set numbers, drafting-paper warmth, terracotta pencil annotations; the two colors re-derived
as Archestimator's own (clay + petrol) with amigo's *deployment discipline* (accents earn signal
value through restraint) and intercom's *confidence lessons* (one job per section, crafted
set-pieces) — without copying either.

## Document index

| Doc | Role | Key outputs |
| --- | --- | --- |
| `Landing-Page-Research-Report.md` | Input research (pre-existing) | Conversion patterns, copy templates, GA4 taxonomy, CWV targets |
| `01_CURRENT_STATE_AUDIT.md` | Evidence-gated current state | Section map w/ live geometry, the two color systems, hero/diagram internals, perf+a11y snapshot, claims-vs-app matrix |
| `02_UX_UI_ANALYSIS.md` | Severity-rated findings (P0–P3) | 30+ findings across trust, conversion, hero/diagrams, visual system, perf, a11y, SEO; baseline scorecard 4.6/10 |
| `03_REFERENCE_ANALYSIS_AMIGO_INTERCOM.md` | Design-layer reference research | Amigo CSS extraction (incl. the identical-palette discovery), Intercom brand mechanics, AEC landscape, transfer map |
| `04_BRAND_COPY_AND_MESSAGING_PLAN.md` | Copy plan honoring "copy is mostly good" | KEEP/REFINE/REPLACE/REMOVE verdict for every text slot; new problem/proof/FAQ copy ready to paste; SEO metadata |
| `05_VISUAL_DESIGN_DIRECTION.md` | Design-system layer | Own-brand tokens (clay/petrol/paper/linework), DESIGN.md Inter scale adoption, mono-number register, 5-mark rough-notation system, motion language |
| `06_SECTION_BY_SECTION_IMPROVEMENT_SPEC.md` | Target page architecture | 9-section spec with layout, copy, treatment, motion, responsive, a11y + acceptance criteria per section |
| `07_IMPLEMENTATION_PLAN.md` | Phased task plan | Phase 0 honesty hotfixes (ship same-day) → tokens/type → hero rebuild → body restructure → gates; 6.5–8 dev-days; exact files per task |
| `08_MEASUREMENT_TESTING_SEO_PLAN.md` | Validation layer | KPIs, event taxonomy, 5-test A/B program, WCAG 2.2 checklist, perf budgets, SEO checklist |
| `09_READINESS_GATE_AND_SCORECARD.md` | Gate | 5 owner decisions, 8 launch gates, target scorecard ≥8.7/10, risks |

## How the brief's asks map to the plan

| Philip's ask | Where answered |
| --- | --- |
| "More authentic" | 02 §A (remove fabricated proof), 03 §1 + 05 §1 (own the palette), 04 (own the vocabulary) |
| "More marketable" | 02 §B (first-screen clarity, CTAs), 06 §1 (product-proof hero), 08 (measurement to prove it) |
| "Like amigo.ai / intercom.com" | 03 transfer map — adopt their *mechanics* (restraint, anchors, living diagram, set-pieces), not their skins |
| "Keep the two colors" | 05 §1 — strategy kept, values re-derived as ours, deployment rules added |
| "Copy mostly good" | 04 §3 — majority KEEP verdicts; strongest existing paragraphs promoted |
| "Hero + rough diagrams good BUT need improvement" | 06 §1–2 — hero keeps its headline/underline and gains product proof; diagram keeps its hand-drawn voice and gains the living draw + fixed labels |
| "Comprehensive understanding of app/brand/company" | 01 §11 claims-vs-app matrix; 04 grounded in `.ai/06_specs/brand/*` + product thesis |

## Fastest path to value

**Phase 0 (≤1 day) is shippable immediately and needs no design decisions:** remove fake
testimonials + empty marquee, fix reveal-gated blank sections, fix diagram label breaks, honest
CTA labels, claims-consistency, delete 2.3MB orphan asset. It resolves every P0 before any
aesthetic work begins.

## Evidence base

Source-code audit (file:line throughout 01), live browser session on `localhost:3000`
(2026-06-11, screenshots of every section state including the blank-paint failure), amigo.ai CSS
bundle extraction, Intercom primary design articles, Procore/Bluebeam register scan, the
project's own brand corpus (`.ai/06_specs/brand/`, `DESIGN.md`, `PRODUCT.md`), prior plan packs
(`.ai/03_plans/landing-page-improvement/`, amigo reference artifact in `.omx/artifacts/`), and the
conversion research report in this folder.

Note: Notion was requested as a brand source but the workspace connector's token is currently
invalid (401); the local brand corpus is marked canonical (`brand-foundation.md`: "Canonical home:
`.ai/06_specs/brand/`"), so coverage is complete. Re-run a Notion sweep after re-auth if desired.
