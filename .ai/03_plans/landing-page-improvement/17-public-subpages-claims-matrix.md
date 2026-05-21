# Public Subpages Claims Matrix

**Date:** 2026-05-21 18:33 PST
**Status:** Planning and claim-safety source of truth before `/features`, `/pricing`, `/about`, `/contact`, or homepage copy expansion.
**Scope:** Public marketing claims for Archestimator landing/subpages.
**Hard boundary:** Do not change the accepted homepage hero as part of this claims pass.

## Purpose

This matrix separates product truth from brand ambition before public subpages are implemented. Any public page may use a claim only if its maturity label is clear and the copy does not imply more capability than the current product supports.

## Label definitions

- `live` — implemented and demonstrable in the current product.
- `mvp-preview` — partially implemented or usable in the current MVP, but not mature enough for broad production claims.
- `mockup/static-preview` — shown in public visuals or static scaffolding only; must not imply finished workflow behavior.
- `planned` — valid product/brand direction, but should be labeled as future direction or omitted from public feature claims.
- `unsafe/do-not-publish` — do not publish until Philip confirms facts or product evidence exists.

## Evidence inspected

Brand and planning sources:

- `.ai/06_specs/brand/README.md`
- `.ai/06_specs/brand/brand-foundation.md`
- `.ai/06_specs/brand/brand-narrative.md`
- `.ai/06_specs/brand/brand-voice.md`
- `.ai/06_specs/brand/clarity-and-mess-narrative.md`
- `.ai/06_specs/brand/hero-message-thesis.md`
- `.ai/06_specs/brand/spatial-hierarchy-narrative.md`
- `.ai/06_specs/brand/the-archestimator-way.md`
- `.ai/06_specs/brand/landing-brand-narrative-map.md`
- `.ai/06_specs/brand/benefits-and-value-props.md`
- `.ai/06_specs/brand/public-facing-feature-copy.md`
- `.ai/06_specs/brand/marketable-benefit-copy.md`
- `.ai/06_specs/brand/combined-benefit-title-system.md`
- `.ai/03_plans/landing-page-improvement/14-public-subpages-analysis-plan.md`
- `.ai/03_plans/landing-page-improvement/15-public-subpages-research-plan.md`
- `.ai/03_plans/landing-page-improvement/16-public-subpages-readiness-and-gate-plan.md`

Live product and source evidence:

- `src/app/page.tsx`
- `src/components/landing/SecondaryClaimSection.tsx`
- `src/components/landing/ProductShowcaseSection.tsx`
- `src/components/landing/FeaturesSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/company-proof-data.ts`
- `src/app/workshop/projects/page.tsx`
- `src/app/workshop/projects/[projectId]/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/lib/projects/actions.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/tree-hierarchy.ts`
- `src/lib/auth/session.ts`
- `src/lib/repositories/cost-library-repository.ts`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/component-library/*`
- `supabase/migrations/20260518090000_archestimator_core_schema.sql`
- `supabase/migrations/20260520222038_enforce_two_kind_estimate_nodes.sql`

## Claims matrix

| Public claim                                        | Status                                                | Evidence                                                                                                                                                                                                                    | Safe public wording                                                                         | Unsafe wording to avoid                                                                                |
| --------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Estimate Workspace                                  | `live` with `mvp-preview` framing                     | Projects, estimates, selected estimate node, estimate tree, estimate sheet content, totals, and protected workspace routes exist.                                                                                           | “Create and manage project-based estimate sheets in an early workspace.”                    | “Production-ready estimating platform for teams.”                                                      |
| Authenticated workspace access                      | `live`                                                | `requireCurrentUserContext()` redirects unauthenticated users to `/login`; local dev bypass exists only for development.                                                                                                    | “Workspace access is protected by login.”                                                   | Security/compliance claims beyond login protection.                                                    |
| Project records                                     | `live`                                                | Project create/update/delete actions persist name, client, location, project code, currency, and metadata.                                                                                                                  | “Keep project identity and estimate sheets together.”                                       | “Full CRM/project management suite.”                                                                   |
| Multiple estimate sheets in one project             | `live`                                                | `createEstimateSheetDraft()`, generated `ES-###` sheet codes, and project estimate listing exist.                                                                                                                           | “A project can contain multiple estimate sheets.”                                           | “Compare every proposal side by side” unless comparison UI is shown as preview/planned.                |
| Project-shaped estimate hierarchy                   | `live` with wording caution                           | Current enforced tree kinds are only `group` and `area`; groups can nest, rows belong to areas.                                                                                                                             | “Organize the estimate with flexible groups and areas that follow the project.”             | “Native lot/structure/floor/trade node types” as if they are data kinds.                               |
| Spatial labels such as lot, structure, floor, trade | `mvp-preview` / copy-level                            | Brand docs use these as user language; live model stores them as group names, not enum kinds.                                                                                                                               | “Use groups named for lots, floors, trades, scopes, and areas.”                             | “Archestimator has dedicated lot, structure, floor, and trade node types.”                             |
| Area-targeted estimate rows                         | `live`                                                | DB trigger and server actions require `estimate_row_items` to belong to `area` nodes.                                                                                                                                       | “Rows are placed inside estimate areas.”                                                    | “Rows can be attached anywhere in the tree.”                                                           |
| Estimate row editing                                | `live`                                                | Row actions update quantity, supplementary cost, labor cost, discipline, designation, and linked state.                                                                                                                     | “Edit quantities, costs, labor, discipline, and designation in the estimate.”               | “Full estimating audit trail for every row edit.”                                                      |
| Running totals                                      | `live`                                                | Estimate totals are calculated from rows and shown by project estimate listing/tree content.                                                                                                                                | “See running totals from estimate rows.”                                                    | “Certified cost validation” or “guaranteed accuracy.”                                                  |
| Component Library as public feature                 | `mvp-preview`                                         | UI has searchable/filterable component-library panel and can insert/replace rows from library-like items; repository/schema exist, but current UI still uses sample/in-memory/local component behavior in important places. | “Use an early component-library workflow to insert reusable cost logic into estimates.”     | “Team-wide production component library is finished.”                                                  |
| Reusable cost components                            | `mvp-preview`                                         | Insert/replace server actions save source snapshots and linked states on rows.                                                                                                                                              | “Insert reusable cost components and adjust them per project in the MVP flow.”              | “Reusable components are fully governed, versioned, and organization-approved.”                        |
| Supplier/source/pricing metadata                    | `mvp-preview`                                         | Source snapshots include supplier, pricing date/source, source URL, tags, and image URL when available.                                                                                                                     | “Keep source context beside inserted cost rows where available.”                            | “Verified supplier pricing database.”                                                                  |
| Revision Intelligence                               | `planned` with small `mvp-preview` pieces             | Estimate sheet codes and version-label metadata exist; no full revision history, diff UI, or issued-snapshot system was found.                                                                                              | “Revision intelligence is part of the product direction; early sheets are version-labeled.” | “Track every change, delta, and issued snapshot today.”                                                |
| Traceable revisions                                 | `planned` / use cautiously                            | Brand copy and `FeaturesSection` mention version history, change deltas, and issued snapshots; source does not show finished revision history.                                                                              | “Designed to make revisions easier to trace as the product matures.”                        | “Complete version history and change deltas are available now.”                                        |
| Proposal Comparisons                                | `planned` with `live` prerequisite                    | Multiple estimate sheets exist; no dedicated comparison UI/charts were found.                                                                                                                                               | “Multiple sheets create the basis for future proposal comparisons.”                         | “Compare alternates visually inside the product today” unless labeled preview/mockup.                  |
| Visual Cost Breakdowns                              | `planned` with `live` totals prerequisite             | Totals exist; no finished chart/breakdown comparison workflow found.                                                                                                                                                        | “The product direction includes visual cost breakdowns for clearer client explanation.”     | “Clients can already explore complete visual cost stories.”                                            |
| Proposal-Ready Outputs                              | `planned`                                             | No proposal package builder or proposal route was found.                                                                                                                                                                    | “Proposal-ready output is planned and should stay connected to estimate logic.”             | “Generate client-ready proposals today.”                                                               |
| Industry Standard Export Formats                    | `planned`                                             | No Excel/PDF export module, action, or route was found.                                                                                                                                                                     | “Excel/PDF handoff is a planned workflow.”                                                  | “Export to Excel/PDF now,” “exports teams can actually use,” or similar live-capability wording.       |
| Excel handoff                                       | `planned`                                             | No current `.xlsx`, CSV, or spreadsheet export implementation found in source.                                                                                                                                              | “Planned Excel handoff.”                                                                    | “Move line items to Excel now.”                                                                        |
| PDF proposal package                                | `planned`                                             | No current PDF generation route/action found in source.                                                                                                                                                                     | “Planned PDF proposal output.”                                                              | “Share PDF proposal packages today.”                                                                   |
| Pricing / early access                              | `mvp-preview` / needs Philip approval                 | Current landing pricing section frames the product as early-access/MVP and includes `₱0`-style preview posture in prior planning.                                                                                           | “MVP preview / early access; pricing may change.”                                           | “Permanent free plan” or finalized tier promises.                                                      |
| Public `/features` route                            | `planned`                                             | No `/features` route exists in `src/app`.                                                                                                                                                                                   | “Planned features page.”                                                                    | Linking as if the page already exists.                                                                 |
| Public `/pricing` route                             | `planned`                                             | No dedicated `/pricing` route exists in `src/app`; homepage has an in-page section.                                                                                                                                         | “Pricing section / future pricing page.”                                                    | Route-level pricing page claims before implementation.                                                 |
| Public `/about` route                               | `planned` / fact-gated                                | No `/about` route exists; founder/company facts are not yet approved for public copy.                                                                                                                                       | “About page pending approved founder/company facts.”                                        | Founder, legal entity, team size, client, or location claims without Philip confirmation.              |
| Public `/contact` route                             | `planned` / mechanism-gated                           | No `/contact` route exists; current nav uses `#contact` / CTA behavior.                                                                                                                                                     | “Contact flow pending final destination.”                                                   | Promising response times or sales/demo operations not actually staffed.                                |
| Company/customer proof                              | `mockup/static-preview` and `unsafe` for trust claims | `company-proof-data.ts` contains placeholder-style entries.                                                                                                                                                                 | “Sample profiles” only in non-misleading scaffolding, or hide until verified.               | “Trusted by,” “used by,” “customers include,” real logos, testimonials, ratings, counts.               |
| Security/privacy/compliance                         | `unsafe/do-not-publish` beyond basic auth             | Supabase auth exists, but no public privacy/security policy or certification evidence inspected.                                                                                                                            | “Protected login” only.                                                                     | SOC 2, ISO, encrypted-at-rest marketing claims, enterprise security claims, privacy-policy guarantees. |
| AI-powered estimating                               | `unsafe/do-not-publish`                               | Brand guardrails say not to overuse AI; no approved public AI workflow was inspected.                                                                                                                                       | Avoid for now.                                                                              | “AI-powered estimates,” “AI guarantees accurate costs.”                                                |
| Guaranteed time savings or accuracy                 | `unsafe/do-not-publish`                               | No analytics, customer proof, benchmark, or validation study inspected.                                                                                                                                                     | “Designed to reduce repeated work” or “helps reduce file hunting.”                          | “Cuts estimating time by X%,” “eliminates mistakes,” “guaranteed accurate estimates.”                  |

## Immediate homepage copy risks before subpages

These existing public-copy areas should be corrected or labeled before expanding into subpages:

1. `FeaturesSection.tsx` is not currently mounted in `src/app/page.tsx`, but if it is reused later, its export/proposal/revision language overstates current implementation.
2. `PricingSection.tsx` says users can “Explore the early flow for ... proposal comparisons, visual cost breakdowns, and Excel/PDF exports.” This is safer than claiming completion, but it still risks implying those flows are already explorable. Prefer separating `available in MVP` from `planned next`.
3. `SecondaryClaimSection.tsx` includes “Excel/PDF handoff” in the five pillars. Keep only if visually labeled as a future handoff pillar or change to “proposal handoff direction” until export exists.
4. Placeholder company proof must never become real customer proof by wording drift.

## Safe public feature set for the next homepage/subpage pass

Use these as the high-confidence set:

1. **Estimate Workspace** — `live` / MVP preview.
2. **Project-shaped hierarchy** — `live`, but described as flexible groups and areas.
3. **Multiple estimate sheets** — `live`.
4. **Component Library workflow** — `mvp-preview`.
5. **Area-targeted cost rows and running totals** — `live`.

Use these only with future/preview framing:

1. **Revision Intelligence** — planned, with early sheet/version signals.
2. **Proposal Comparisons** — planned, enabled later by multiple sheets.
3. **Visual Cost Breakdowns** — planned, enabled later by totals/comparison data.
4. **Proposal-Ready Outputs** — planned.
5. **Industry Standard Export Formats** — planned.

## Readiness rule for public subpages

Before implementing each subpage, add a maturity label to every feature block:

- `Available in MVP preview`
- `Partially available in MVP preview`
- `Planned next`
- `Not for public claim yet`

If a section cannot accept one of these labels honestly, do not publish it.
