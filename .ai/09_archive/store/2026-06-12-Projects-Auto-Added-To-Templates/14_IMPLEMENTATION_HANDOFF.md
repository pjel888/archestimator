# 14 — Implementation Handoff

**Date:** 2026-06-12 · For the future implementation agent. This planning pass wrote documents only — implementation is entirely future work.

---

## 1. Scope statement

Implement, in phases: (1) first-class estimate tabs (`estimate_tabs` + `estimate_nodes.estimate_tab_id`) with backfill; (2) multi-tab estimate editor UI; (3) user-facing "sheet"→"tab"/"estimate" rebrand; (4) unified templates panel with virtual project-derived sources; (5) tab-aware XLSX export with worksheet-name sanitization — per documents 02–10 of this folder.

## 2. Non-goals

- No tab-level access control (D-5). No cross-tab node drag/move (D-7). No `/tabs/[tabId]` route (D-4). No beta-visible multi-tab creation before tab-aware export support (D-15). No renaming of DB tables/RPCs/stored event values/`sheet_code` (01 §17). No awakening of the dormant version/snapshot feature (03 §9). No persistence of project content into template tables except explicit save-as-template (D-11). No remediation of `profile_role_hardening_audit` RLS (08 §10 — separate authorization). No internal `EstimateSheet*` symbol renames before Phase 8.

## 3. Required reading order

1. [00_INDEX.md](00_INDEX.md) — orientation
2. [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) — repo reality (re-verify hot files against live code; the repo moves fast)
3. [02_TARGET_ARCHITECTURE.md](02_TARGET_ARCHITECTURE.md) — decisions + diagrams
4. [10_IMPLEMENTATION_PHASES.md](10_IMPLEMENTATION_PHASES.md) — your execution spine
5. The per-domain doc for your current phase (03/04/05/06/07/08)
6. [09_TEST_AND_VALIDATION_PLAN.md](09_TEST_AND_VALIDATION_PLAN.md) + [11_RISK_REGISTER.md](11_RISK_REGISTER.md) before claiming any phase done
7. [12_OPEN_QUESTIONS_AND_DECISIONS.md](12_OPEN_QUESTIONS_AND_DECISIONS.md) — do not re-litigate decided items

## 4. Recommended first implementation slice — and why

**Phase 1 (database tab foundation), authored and proven locally first** ([10](10_IMPLEMENTATION_PHASES.md) Phase 1; [03](03_DATABASE_MIGRATION_PLAN.md) §3–13). It is the safest first slice because: it is invisible to users (no app code reads tabs); it carries the project's only hard-to-reverse risk (constraint swap + validator update) and therefore deserves first, isolated attention with the proof harness (`scripts/prove-estimate-tabs-postgres.mjs`) before any UI exists; every later phase depends on it; and its rollback story is cleanest while nothing consumes the new schema. Note the repo's standing constraint: **agents have no hosted-DB channel** — local harness proof first; linked apply (`npx supabase@2.98.2 db push` + type regen) is owner-authorized separately.

## 5. Phase-by-phase handoff

For each phase, [10_IMPLEMENTATION_PHASES.md](10_IMPLEMENTATION_PHASES.md) defines objective/files/DB/UI/tests/rollback/DoD. Condensed contract:

| Phase | Entry criteria | Work scope | Exit criteria / validation |
|---|---|---|---|
| 0 | this pack reviewed | baseline failure recording; terminology map confirm | baseline list logged; no source edits |
| 1 | Phase 0 logged | M1 migration + proof harness + schema test + default-tab on create | P1–P5 pass; VG; app behavior identical |
| 2 | 1 done (local proof at minimum) | tab loaders/actions/keys/types + wrappers | wrapper equivalence; characterization green |
| 3 | 2 done | tab strip + CRUD UI + per-tab state + cursor filter | e2e 1–5; perf suites green; QA 1–8; create/duplicate controls internal-only until Phase 6 |
| 4 | 3 done | copy table flip (atomic DELETE-phrase pair) | residue grep; copy-coupled tests updated |
| 5 | 2 done (3–4 parallelizable) | unified panel + insert RPC + denial tests | denial 1–6 proven; template suites green |
| 6 | 2 done (5 recommended first) | sanitizer + multi-tab workbook + `?tab=` | single-tab assertions unmodified-green; e2e 8 |
| 7 | 3–6 done | full hardening matrix | zero new failures; RLS harness; manual QA |
| 8 | 7 done + cleanup gate | docs/truth surfaces; shim deletion; rename batches | grep gates; `.ai` updated |

**Files/tables most likely touched per phase** are enumerated in [10](10_IMPLEMENTATION_PHASES.md) (Affected files lists) — treat those lists as the disjoint write scopes if parallelizing lanes.

## 6. "Do not do" warnings

- Do **not** rename anything on the 01 §17 keep-list, including stored `sheet_*` event values and `sheet_code`.
- Do **not** touch the three "sheet" false-friends: ExcelJS worksheet code, the `Sheet` overlay primitive (`src/components/ui/overlays/sheet-drawer.tsx`), construction-material strings.
- Do **not** flip the `DELETE SHEET` phrase in only one of (`ProjectEstimatesTable.tsx:684`, `src/lib/mass-deletion/bulk-action.ts:76,82`).
- Do **not** run `supabase db push`, hosted SQL, or type regeneration against the linked project without explicit owner authorization (project `ebxxqidacheyapmmzavr` only; never SlateCamp).
- Do **not** use the admin/service-role client for project-derived source reads or the new insert path (08 §5, §9).
- Do **not** default the Projects section to current-project-only. The estimate-editor right sidebar must show all readable workspace projects by default; "Current project only" is an optional narrowing filter, default OFF.
- Do **not** parallelize vitest (`--maxWorkers=1` is load-bearing) or rename `estimate-sheet-*` test files outside Phase 8 batches.
- Do **not** claim provider proof from local checks — label `local-only` / `provider-proven` / `manual-proof-pending` precisely (AGENT_FRAMEWORK_PROTOCOL).
- Do **not** mount the tab strip inside the memoized row-table subtree (perf suites will fail — and they are correct to).
- Do **not** expose tab creation/duplication/reorder to beta users before Phase 6 export support is complete; the internal default-tab-only export banner is a development bridge, not a release posture.

## 6.1 Cleanup gate definition

Phase 8 is not a vague "later" bucket. It has two classes:

- **Immediate cleanup after Phase 7:** delete dead code that has no runtime consumers after wrappers are migrated (`src/stores/estimate-ui-store.ts`, dead `useEstimateQuery` / `useMoveEstimateRowItem`, direct-upsert browser repository methods) only after `rg` confirms no imports, source-contract tests are updated, and VG passes.
- **One-release-cycle cleanup:** delete compatibility wrappers, legacy `areaTree` aliases, route fallback comments, or rename `EstimateSheet*` symbols only after one completed beta release carrying Phases 1–7 has provider/manual proof archived, no rollback opened against estimate tabs/export/templates, and Philip accepts the release evidence. Evidence required: release identifier/commit, hosted export smoke, RLS harness output, browser QA notes, and a before/after `rg -i 'sheet'` keep-list diff.

Owner for both cleanup classes is the implementation lead for the phase; reviewer approval uses [15_REVIEW_CHECKLIST.md](15_REVIEW_CHECKLIST.md) §8–9 before deletion.

## 7. Branch/worktree cleanliness guidance

Branch from current `origin/main` after fetch/prune; scoped feature branches per phase (e.g. `feat/estimate-tabs-phase1-db`); PR-shaped diffs; never direct-edit shared branches. Check `git status --short --branch` before editing; unrelated dirty files must not be staged/reformatted. Fresh worktrees need `.env.local` copied before `next dev` will pass login (project memory). Storybook/dev servers: only one `next dev` instance; verify UI via the user's Chrome session when hosted-auth flows matter.

## 8. Provider/manual proof boundaries

- **Local-only proof:** migration harness, all unit/DOM/e2e suites, `bun run validate`/`build`, local export round-trips.
- **Provider proof (owner-gated):** linked migration apply + `supabase migration list`; type regen against linked project; `bun run launch:verify-hosted-export` against production; Supabase advisor re-check; Vercel deploy/rollback.
- **Manual proof:** spreadsheet-app workbook inspection; two-browser collaboration QA; 375px responsive pass; old-bookmark export link.
Never blur these labels in run logs or completion claims.

## 9. Expected final evidence bundle (after implementation, not now)

Run log(s) under `.ai/05_logs/` per phase (goal/branch/commands/exit codes/files/validation per AGENT_FRAMEWORK_PROTOCOL); archived evidence folder under `.ai/09_archive/store/2026-XX-XX-estimate-tabs-implementation/` containing: P1–P5 proof outputs, RLS harness JSON, before/after `rg -i 'sheet'` bucket-A residue diff, single-tab workbook byte-shape regression note, multi-tab workbook screenshots from a real spreadsheet app, perf suite outputs, e2e results, hosted export smoke proof (when authorized), updated `.ai/10_state/current-state.md` + `decisions.md` entries.

## 10. Pointer prompt (for a future `/goal` or agent handoff)

```
Implement the estimate-tabs feature per the approved plan pack at
.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/.
Read 00_INDEX.md, then execute 10_IMPLEMENTATION_PHASES.md phase by phase,
starting with Phase 1 (database tab foundation, local proof harness first —
linked Supabase apply is owner-authorized separately). Honor the keep-list in
01_CURRENT_STATE_AUDIT.md §17, the decisions in 12_OPEN_QUESTIONS_AND_DECISIONS.md,
and the per-phase validation gates in 09_TEST_AND_VALIDATION_PLAN.md.
Do not re-plan; verify hot files against live code before editing.
```

## Evidence Used

This document consolidates docs 01–13 of this pack; operational constraints from `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` (modes, proof labels, run logs), `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` (safety rules, Supabase boundary), `AGENTS.md` (verification policy), and project memory (no DB channel; worktree `.env.local`; browser verification setup).
