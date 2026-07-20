# Context Precedence and Applicability

## Task-Specific Precedence

The founder's 2026-07-20 instruction for this task is the controlling design directive:

- redesign `/new` from scratch;
- do not reuse the current `/new` design or its components;
- preserve only the canonical Archestimator logo/wordmark and Signal orange as visual brand carryovers;
- use the current Attio homepage as the primary reference, with structure, motion, and typography reproduced as closely as possible while using original Archestimator content and assets;
- use Comand and Intercom only as secondary cues.

This latest directive supersedes conflicting passages in the supplied creative brief that recommend retaining/refactoring the existing `/new`, reusing its Three/WebGL scaffold, using Edra as a reference, forbidding a new landing-page type direction, or treating reference cloning as categorically disallowed. Those instructions are stale for this task.

Freshness applies to the current route composition as well as its visible tree. `src/components/landing/PublicPageShell.tsx`, `src/lib/landing/seo-metadata.ts`, the existing `/new` title/description, and every file under `src/components/landing-new/**` are not approved carryovers. The replacement may independently declare `dynamic = "force-static"` because that is a framework output constraint, but it must author a fresh route composition and literal metadata object. The only existing implementation imports approved for the new marketing tree are the canonical logo/wordmark exports; the only existing visual tokens approved are Signal orange and its accessible dark companion.

## Still Authoritative

The following corpus contracts remain in force:

- category: construction estimating software;
- descriptor: an estimate-to-proposal workspace built around reusable cost intelligence;
- hero: “Make every estimate easier to build, clearer to present, and simpler to approve.”;
- subheadline: “Archestimator helps AEC teams reduce rework, communicate project costs clearly, and move decisions forward without losing context through reviews and revisions.”;
- primary CTA: “Request early access”;
- benefit line: “Less rework. Clearer proposals. Better cost decisions.”;
- one primary conversion goal;
- no fabricated customers, logos, testimonials, metrics, traction, ROI, accuracy, AI, automation, or autonomous-estimating claims;
- distinguish live, partial, planned, deferred, and prohibited capabilities;
- accessibility, reduced-motion, finite-motion, progressive-rendering, and performance discipline;
- only show a sample-proposal CTA when a real public sample exists.

## Clause-Level Authority

[`claim-reconciliation.md`](./claim-reconciliation.md) is the controlling clause-level ledger for every material directive, public message, capability proof, partial workflow, and prohibited implication used by this plan. Its exact current-source paths supersede document-level generalities when implementation strength is decided.

## Corpus Roles

| File | Role in this plan | Design applicability |
|---|---|---|
| `ARCHESTIMATOR_CORE_V2_2026-07-20.md` | Canonical product definition, outcome, hero, subheadline, CTA, claim boundaries | Current |
| `ARCHESTIMATOR_BRAND_BUSINESS_STARTUP_CORPUS_V2_2026-07-20.md` | Message hierarchy, audience, product truth, public FAQ, proof discipline | Current |
| `ARCHESTIMATOR_CORPUS_V2_P0_CHANGELOG_2026-07-20.md` | Records what V2 changed and which statements became canonical | Current |
| `ARCHESTIMATOR_LANDING_PAGE_CREATIVE_DIRECTION_IMPLEMENTATION_BRIEF_V1_2026-07-20.md` | Product fidelity, accessibility, performance, fallback, and proof constraints | Partially current; prior design/scaffold/reference instructions superseded |
| `ARCHESTIMATOR_BEYOND_YC_A16Z_CORPUS_V2_ENHANCEMENT_BLUEPRINT_2026-07-19.md` | Positioning rationale, wedge, value architecture, proof roadmap | Current as strategy, not page layout |
| `ARCHESTIMATOR_YC_A16Z_STRATEGIC_CORPUS_AUDIT_V1_2026-07-19.md` | Strategic critique and claim discipline | Current as supporting analysis, not page layout |

## Conflict Rule

When a corpus statement conflicts with the task-specific design directive, keep only the product/claim truth accepted by the clause-level ledger and replace the design method. In particular, preserve the connected estimate-to-proposal-to-review narrative, but express it through new DOM/SVG product scenes and the Attio-led page system—not the existing `/new` WebGL experience or route shell.
