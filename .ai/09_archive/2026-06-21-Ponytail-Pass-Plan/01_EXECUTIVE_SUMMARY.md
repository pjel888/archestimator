# 01 — Executive Summary

**Date:** 2026-06-21 · **Last audited:** 2026-06-24 (see `16_AUDIT_LOG_2026-06-24.md`) · **Status:** PLANNING / READINESS ONLY · **Branch:** `main`
**Posture:** Pre-launch closed beta, owner-only, no external users. Bias toward deletion/consolidation over speculative backward-compat — except security, auth, audit, data-integrity, and the active estimate-tree unification corridor.

## Headline (refreshed 2026-06-24)

Archestimator is a **large, healthy, well-instrumented** codebase (16,148 graph nodes, 1,429 files, 11,288 functions, 190,581 edges, 3,352 tests at the 2026-06-19 snapshot; current source has drifted — see `16_AUDIT_LOG_2026-06-24.md`). It carries a normal amount of pre-launch **over-engineering** — the kind ponytail was designed to catch: unused dependencies, single-use visual packages, mega-files that grew one PR at a time, and speculative features gated off behind env flags.

Ponytail v4.7.0 (Claude) / v4.8.2 (Codex, drifted from plan's v4.7.0 claim — see `10_PONYTAIL_OPERATING_MODEL.md`) / v4.7.0+ (OpenCode) is installed. Applied to Archestimator, the **post-2026-06-24 audit** payoffs are:

1. **✅ DONE (Wave 1A + Wave 2A consumed by React Doctor cleanup):** `class-variance-authority` (commit `e65e2848`, 2026-06-23), `three`, `lenis`, `rough-notation`, `roughjs` all removed outright between 2026-06-23 and 2026-06-24. See `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md` and `.ai/10_state/current-state.md` 2026-06-24 entries. **5 of the original 8 deps are gone.**
2. **⏳ Still pending — Wave 1A:**
   - **T1.3 `@next/third-parties` → `next/script`** — 1 importer (`LandingAnalyticsLoader.tsx`), dep still in `package.json`. Swap must preserve `window.gtag` for `experiment-tracker.ts`. CSP/consent/network proof required.
   - **T1.4 `d3` → `d3-shape`** — only `d3-shape` imported by `CostDonutChart.tsx`; `d3` umbrella + `@types/d3` still in `package.json`.
3. **⏳ Still pending — Wave 2A:**
   - **T1.5 `@firecms/neat`** — 1 importer (`NeatWireframeBackground.tsx`), dep still in `package.json`. Owner decision required: keep or swap to CSS/SVG.
4. **⚠️ Tier 2 mega-files — ALL GREW since plan snapshot.** 7 files, all >1500 LOC, total +2460 LOC drift since 2026-06-21 (largest: T2.2 component-library/index.tsx +868, T2.1 EstimateSheetContent.tsx +600, T2.3 workspace-repository.ts +547). React Doctor flagged 31 `no-giant-component` findings; locally suppressed, tracked as deferred structural work in `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md`. **57 dead exports identified at 2026-06-21 baseline** — re-verify before removal PRs because reducer extractions and subcomponent splits landed.
5. **⏳ Speculative feature surfaces (owner decision):**
   - **SF.1 AI surface** — flags still default false; all surfaces still present (`EstimateCopilotFloatingButton.tsx` 1036 LOC, `read-context.ts` 2020 LOC, `draft.ts` 2443 LOC, `apply.ts` 1366 LOC, `api/ai/ask/` + `api/ai/package-builder/`).
   - **SF.2 Project cursors** — flag defaults unchanged (sheet cursor broadcast true, project-wide cursors false, follow mode false); surfaces all still present.
6. **⚠️ Tier 3 quick cuts — partial drift.** See `06_TIER_3_QUICK_CUTS.md` for the refreshed status. T3.3 empty catches FIXED; T3.1 barrel shrunk 27→8 LOC; T3.7 publication RBAC grew 7→10 occurrences; T3.4 cast moved from line 192-217 to line 207 + new cast at line 434.

## What we found (by weight)

### Tier 1A — Pure or contained dependency wins

| # | Item | Evidence | Payoff |
|---|------|----------|--------|
| T1.1 | `class-variance-authority` — unused | 0 imports repo-wide (validated by cleanup plan + this pass) | dep removed, 0 LOC delta in app |
| T1.2 | `three` — unused | 0 imports repo-wide (validated by cleanup plan + this pass) | dep removed, 0 LOC delta in app |
| T1.3 | `@next/third-parties` -> `next/script` | Only used in `LandingAnalyticsLoader.tsx` for GoogleAnalytics; `ClarityScript.tsx` already uses `next/script` as the established pattern | dep removed, ~5 LOC swap; CSP/consent/network proof required |
| T1.4 | `d3` -> `d3-shape` only | Only `d3-shape` is imported (`arc`, `pie` in `CostDonutChart.tsx`); full `d3` umbrella is unused | dep weight reduced, 0 LOC delta in app |

### Tier 1B — Visual owner decisions

These are implementation-ready decision records, not automatic cuts. See `13_VISUAL_DECISION_AND_QA_MATRIX.md` for the exact owner payload, visual intent, must-not-change criteria, viewports, reduced-motion checks, and artifact paths.

| # | Item | Evidence | Payoff |
|---|------|----------|--------|
| T1.5 | `@firecms/neat` | Only `NeatWireframeBackground.tsx`; has static fallback | dep removed, replaced by CSS/SVG |
| T1.6 | `lenis` | Only `LandingSmoothScrollProvider.tsx`; wraps `ReactLenis` | dep removed, `scroll-behavior: smooth` or local handler |
| T1.7 | `rough-notation` | `HeroSection.tsx` + `LaunchFeatureHeading.tsx` underline highlights | dep removed, CSS/SVG underline |
| T1.8 | `roughjs` | `AnimatedProposalRecordSection.tsx` illustration | dep removed, authored SVG |

### Tier 2 — Mega-files (apply ponytail on any edit, run `/ponytail-review` on PRs touching these)

| # | File | LOC | Importers | Dead exports | Ponytail strategy |
|---|------|----:|---:|---:|---|
| T2.1 | `src/components/workshop/EstimateSheetContent.tsx` | 2950 | 1 (dynamic) | **25** | Extract dead exports to helpers module, then split by concern; diff-by-diff |
| T2.2 | `src/components/workshop/component-library/index.tsx` | 2541 | 2 | 0 | Peel off local hooks/helpers; split by concern; diff-by-diff |
| T2.3 | `src/lib/repositories/workspace-repository.ts` | 2695 | **37** | **13** | Remove dead exports, then split access/query/mapping; diff-by-diff |
| T2.4 | `src/lib/ai/package-builder/draft.ts` | 2412 | 1 | 0 | Diff-by-diff (narrow fanout); only if AI kept |
| T2.5 | `src/lib/ai/read-context.ts` | 2023 | 1 | 2 | Diff-by-diff; only if AI kept |
| T2.6 | `src/lib/publication/actions.ts` | ~1538 | 5 | 1 | Extract shared auth/rate-limit helper; diff-by-diff |
| T2.7 | `src/lib/component-library/actions.ts` | ~1591 | **14** | **16** | Remove dead exports, then factor shared access check; diff-by-diff |

**Total dead exports across Tier 2: 57** — these are the safest first PRs (shrink public API surface without touching consumed exports). See `05_TIER_2_MEGA_FILE_STRATEGY.md` for the full validated coupling data and two defensible priority orders.

### Tier 3 — Small over-engineering (quick cuts)

- `src/components/landing/index.ts` — 27-line pure barrel re-export
- `src/lib/activity/index.ts` — 6-line pure barrel re-export
- `src/components/workshop/ProjectEstimatesTable.tsx:99-121` — localStorage wrappers with empty `catch` blocks (ponytail: data-loss handling is never on the chopping block — handle or drop the wrapper)
- `src/lib/reusable-sources/actions.ts:192-217` — `supabase as unknown as` cast for one optional tab query (ponytail: no cast escapes — replace with typed helper)
- `src/lib/share/sanitize-recipient-text.ts` — hand-rolled HTML stripping (ponytail: `DOMParser` or trusted sanitizer)
- Additional findings from the second codebase pass are in `02_CODEBASE_ANALYSIS.md` § "Second-pass findings"

### Tier 4 — Ponytail won't help (leave alone)

- `src/lib/supabase/types.ts` (4509 LOC) — generated
- `.agents/`, `.claude/`, `.github/` skill scripts — third-party (impeccable detector)
- `supabase/migrations/*` — schema source of truth
- Tests (3352 test nodes) — ponytail preserves tests

### Speculative features (owner decision, not auto-cut)

- **AI surface** — `src/lib/ai/feature-flags.ts` defaults routes/UI to `false`. Ask Flip UI and package-builder are effectively off unless env enables them. Keep hidden or cut until AI is real beta scope. (Overlaps with cleanup plan OG-1/F25.)
- **Project cursors** — `src/lib/collaboration/feature-flags.ts` defaults project-wide cursors/follow mode to `false`, but `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST` estimate-sheet cursor broadcast defaults to `true`. Any SF.2 cut must preserve estimate-sheet cursor collaboration unless the owner explicitly broadens the cut. (Overlaps with cleanup plan OG-3/F26.)

## What we deliberately did NOT touch

No source edited, no files deleted, no `package.json` changed, no migrations applied, no Supabase/Vercel/GitHub/DNS mutated, no secrets exposed, no archestimator or unrelated provider projects touched. All findings are static (no live DB queried, no provider APIs called).

## Honest quality notes

- **Overlap with `2026-06-14-Codebase-Cleanup-Plan`**: that plan already found `three`, `d3`→`d3-shape`, `cva`, AI surface, follow-mode, and ~9.9 MB unreferenced assets. This plan cross-references it rather than re-auditing. Read that plan first for the shared dep findings — its evidence is more detailed for those items.
- **This plan adds**: the ponytail operating model, the 4 visual deps the cleanup plan didn't cover, the `@next/third-parties` swap, the Tier 2 mega-file strategy, and the ongoing `/ponytail-review`-on-PR discipline.
- **Mega-file LOC counts** are from the code-review-graph index (last updated 2026-06-19). Real LOC may drift; re-verify with `wc -l` before any refactor.
- **Second codebase pass** ran in parallel with this plan; its findings are appended to `02_CODEBASE_ANALYSIS.md` § "Second-pass findings" and routed into `06_TIER_3_QUICK_CUTS.md`.

## The single most valuable next step (refreshed 2026-06-24)

**Execute Wave 1A残余** (see `07_IMPLEMENTATION_WAVES.md`) after a fresh baseline snapshot — T1.1 and T1.2 are already done, so the remaining Wave 1A is:

1. ~~Remove `class-variance-authority`~~ — ✅ DONE 2026-06-23 (`e65e2848`)
2. ~~Remove `three`~~ — ✅ DONE 2026-06-24 (React Doctor cleanup)
3. **Swap `@next/third-parties` GoogleAnalytics → `next/script`** in `LandingAnalyticsLoader.tsx`, then remove `@next/third-parties` dep (low risk, `ClarityScript.tsx` pattern exists; MUST preserve `window.gtag`)
4. **Narrow `d3` → `d3-shape`** (low risk, only `d3-shape` is imported by `CostDonutChart.tsx`)
5. Gate: `bun install && bun run type-check && bun run build`, targeted tests, and baseline-diff validation from `08_VERIFICATION_STRATEGY.md`

Then decide Wave 2A residual: the **T1.5 `@firecms/neat`** owner decision using `13_VISUAL_DECISION_AND_QA_MATRIX.md`. (T1.6/T1.7/T1.8 are already executed via cleanup — `lenis`, `rough-notation`, `roughjs` are gone.)

This is ~10 minutes of remaining Wave 1A work plus one owner decision. Then the ongoing Wave 3 discipline (`/ponytail-review` on every PR touching a Tier 2 file) is where the durable value lives.

## Ponytail operating model (the ongoing discipline)

The one-time cuts are Wave 1-2. The **ongoing value** is making ponytail the default for new feature work and running `/ponytail-review` on any PR touching a Tier 2 file. See `10_PONYTAIL_OPERATING_MODEL.md` for the full ruleset reference, mode selection, and command spec.

**Default for Archestimator right now:** ponytail `full` on for new feature work and dependency additions; `/ponytail-review` on any PR that touches a Tier 2 file; skip ponytail for hot-bug-fix turns and auth/RLS/data-integrity work (ponytail preserves these automatically, but don't lean on it).
