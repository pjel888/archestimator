# 12 — Docs / .ai Plans / Archive Cleanup Audit

## README / features-page accuracy (CLEAN-F33/F34/F35)

| Claim | Actual | Action |
|---|---|---|
| README "67 migration files" | 91 | update |
| README "Vitest 115 test files" | ~240 `.test.*` (296 in run) | update |
| README "Playwright 7 spec files" | 18 | update |
| README "8 custom hooks" | 11 | update |
| README "Bun unit 2 files" | 3 | update |
| README "32 landing section components" | ~28–30 actual sections (count includes index/constants/css) | recount/clarify; **and** 9 of them are dead (F03) |
| README "Collaboration invitations … Available" | invite **email** is config-gated (`PROJECT_INVITE_ENTRY_ENABLED`, pepper); entry works only with explicit env | qualify: "Available; email invite delivery requires env configuration" (F35) |
| `src/app/features/page.tsx` "Excel & PDF Handoff — Planned next … Planned Excel (.xlsx) export" | Excel export **is implemented + live** (route + `ProposalExportPreviewDialog`) | fix to "Available (.xlsx); PDF planned" (F34) |
| README CI/CD "GitHub Actions … triggers on PRs/pushes" | verify against `2026-06-05-agentic-development-cicd-standardization` (CI was deferred); confirm enabled vs disabled | verify + reconcile |

AGENTS.md and DESIGN.md: accurate, no stale references found.

## Stale / misleading code comments (CLEAN-F36)

| Path:Line | Issue | Action |
|---|---|---|
| `src/components/workshop/ProjectEstimatesClient.tsx:17–21` | "Temporary backout aid, removed after P0 browser QA" but `OPTIMISTIC_ESTIMATE_LIST_ENABLED=true` still present and on `main` | hardcode `true` + remove temporary framing, or update comment |
| `src/lib/publication/actions.ts:724` | "Temporary local shape until supabase types regen (Docker blocked per P3)" — Docker is a persistent constraint, not temporary | reword to "local type extension; local typegen unavailable" |

**KEEP (active-corridor comments, look legacy, are intentional):** all `// legacy … kept for compatibility; see plan 2026-06-12 §01-17` in `use-estimate-query.ts:14`, `EstimateSheetContent.tsx:124,132`, `estimates/actions.ts:783,1161`; `legacy-main` synthetic tab handling; `decodeLegacySharedLinkActivityCursor`; `LegacyPublicationSnapshotRow`; `legacyStoredTab` localStorage migration. These document the unification/tabs corridor — do not "clean" them.

## .ai plans — archive / classify / list (CLEAN-F37)

| Path | Status | Action |
|---|---|---|
| `.ai/03_plans/2026-06-06-notification-system/` | implemented + in `main` (RLS-proven) | **Archive** → `.ai/09_archive/store/` (keep `00_INDEX.md` with `prove:notification-rls` pointer) |
| `.ai/03_plans/2025-06-11-Landing-Page-Comprehensive-Improvement-Plan/` | superseded by `landing-page-improvement/`; folder name has wrong year (2025) | **Archive / mark-historical** |
| `.ai/03_plans/2026-06-03-react-joyride-onboarding-implementation-plan/` | planning-only, never implemented (`react-joyride` not in deps) | **Mark-historical / archive** |
| `.ai/03_plans/2026-06-04-archestimator-user-access-planning/` | Types 1-2 done; Type 3 (client archive/Stripe) speculative | **Mark-historical**; split done vs deferred |
| `.ai/03_plans/2026-06-05-performance-and-speed/` | docs-only; likely folded into `route-transition-performance-optimization/` | review → archive if superseded |
| `.ai/03_plans/2026-06-10-Landing-Page-Ultimate/` | only `evidence/` gate logs, no plan doc | add `00_INDEX.md` or absorb/archive |
| `.ai/03_plans/2026-06-11-templates-panel-ux/` | "IMPLEMENTED (uncommitted, in working tree)" | verify reached `main`; archive if yes |
| `.ai/03_plans/2026-06-07-archives-feature/` | refined, not implemented | **KEEP** (future-ready) + status header |
| 5 active-but-unlisted plans: `2026-06-11-Library-Tree-UI-Replacement`, `2026-06-11-Unification-Plan-For-Components-And-Templates`, `2026-06-11-Library-page-ux-and-ui-improvement`, `2026-06-11-Templates-Page-UX-UI-Audit`, (+ `2026-06-07-archives-feature`) | implementation-ready, missing from README active list | **Add to `.ai/03_plans/README.md`** |
| `2026-06-11-Library-Unification-Plan-For-Components-And-Templates/` vs `2026-06-11-Unification-Plan-For-Components-And-Templates/` | likely duplicate | confirm + archive the superseded one |

Doc-structure tests (`agentic-framework-routing-docs`, `closed-beta-readiness-docs`, `dbidx-repo-audit`) assert `.ai` layout — update them when archiving (P6, gate `test:dom`).

## Watchlist speculative remnants (CLEAN-F27/F38)

| Feature | Footprint | Built? | Classification |
|---|---|---|---|
| Revision Intelligence | `features/page.tsx`, `pricing/page.tsx`, brand specs, dead `ProductPreviewVariants.tsx`. (`row_revision` conflict-guard + `revision_label`/`sheet_code` are a **separate, live** concern.) | doc-only product feature | mark-planned in docs (F38); delete dead component (F27/F03) |
| Proposal Comparisons | `features/page.tsx`, brand specs, `ProductPreviewVariants`. Live "comparison" = project-charts (`/workshop/projects/[id]/charts`), distinct. | doc-only | annotate brand specs to distinguish planned vs the live charts surface (F38) |
| A/B testing | live on landing; `results-calculator` test-only | partial | F18 (code) |
| Deferred AI | implemented, flag-gated; README accurate; spec lacks status note | built-deferred | add "Implemented; deferred" note to `ai-assistant-and-package-builder-spec.md` (F25 doc) |
| Follow mode / page cursors | flags off; follow-mode helpers 0 callers | infra/deferred | F07/F26 |
| AEC classification | test-only | speculative | F17 |
| Glide / prototype / workshop-reset | none in `src/`; README.md correctly marks plans superseded | — | no code action |

## KEEP docs (historical/security/legal/corridor)
`.ai/02_audits/2026-06-01-security-owasp-compliance-audit/`, `.ai/01_roadmap/{02-security…,08-legal…}`, `.ai/09_archive/store/2026-06-06-terms-…-complete/`, `.ai/13_research/single-node-type-sheet-tree-2026-06-13/`, `.ai/10_state/{decisions,known-issues}.md`, `.ai/15_Bugs/*`. Do not archive these as "stale" — they are the decision/security/legal/corridor record.
