# 01 — Executive Summary

**Date:** 2026-06-21 · **Status:** PLANNING / READINESS ONLY · **Branch:** `main`
**Posture:** Pre-launch closed beta, owner-only, no external users. Bias toward deletion/consolidation over speculative backward-compat — except security, auth, audit, data-integrity, and the active estimate-tree unification corridor.

## Headline

Archestimator is a **large, healthy, well-instrumented** codebase (16,148 graph nodes, 1,429 files, 11,288 functions, 190,581 edges, 3,352 tests). It carries a normal amount of pre-launch **over-engineering** — the kind ponytail was designed to catch: unused dependencies, single-use visual packages, mega-files that grew one PR at a time, and speculative features gated off behind env flags.

Ponytail v4.7.0 is now installed for OpenCode, Claude Code, and Codex. The plugin's benchmark shows **~54% less code** (up to 94% where an agent over-builds) on real Claude Code sessions. Applied to Archestimator, the biggest payoffs are:

1. **2 zero-risk dependency removals** already validated by the existing cleanup plan (`three`, `class-variance-authority`) — Wave 1A, execute after a fresh baseline snapshot.
2. **2 contained dependency swaps/narrowings** (`@next/third-parties` -> `next/script`, `d3` -> `d3-shape`) — Wave 1A, but not zero-risk: analytics needs CSP/consent/network proof and charts need hydration proof.
3. **4 visual dependency decisions** (`@firecms/neat`, `lenis`, `rough-notation`, `roughjs`) — Wave 2, owner input needed on which flourishes survive closed beta.
4. **7 mega-files >1500 LOC** — not refactored in one shot, but shrunk diff-by-diff via `/ponytail-review` on every PR that touches them. **57 dead exports** identified across the 7 files — the safest first PRs.
5. **2 speculative feature surfaces** (AI routes, project cursors) — Wave 2A owner decision on whether to keep hidden or cut for closed beta. AI routes default disabled; project-wide cursors default disabled, while estimate-sheet cursor broadcast is already enabled and must not be cut accidentally.
6. **14 small over-engineering fixes** (barrel files, `as unknown as` casts, empty catches, hand-rolled HTML stripping, auth boilerplate, fixtures, registry bridges, duplicate formatting/parsing, and route evaluations) — Wave 2B/2C.

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

## The single most valuable next step

**Execute Wave 1A** (see `07_IMPLEMENTATION_WAVES.md`) after a fresh baseline snapshot:

1. Remove `class-variance-authority` from `package.json` (0 imports, zero risk)
2. Remove `three` from `package.json` (0 imports, zero risk)
3. Swap `@next/third-parties` GoogleAnalytics → `next/script` in `LandingAnalyticsLoader.tsx`, then remove `@next/third-parties` dep (low risk, pattern exists)
4. Narrow `d3` → `d3-shape` (low risk, only `d3-shape` is imported)
5. Gate: `bun install && bun run type-check && bun run build`, targeted tests, and baseline-diff validation from `08_VERIFICATION_STRATEGY.md`

This is ~15 minutes of work and immediately shrinks the dependency tree. Then decide Wave 2A (visual deps and feature cuts) with the owner using `13_VISUAL_DECISION_AND_QA_MATRIX.md`.

## Ponytail operating model (the ongoing discipline)

The one-time cuts are Wave 1-2. The **ongoing value** is making ponytail the default for new feature work and running `/ponytail-review` on any PR touching a Tier 2 file. See `10_PONYTAIL_OPERATING_MODEL.md` for the full ruleset reference, mode selection, and command spec.

**Default for Archestimator right now:** ponytail `full` on for new feature work and dependency additions; `/ponytail-review` on any PR that touches a Tier 2 file; skip ponytail for hot-bug-fix turns and auth/RLS/data-integrity work (ponytail preserves these automatically, but don't lean on it).
