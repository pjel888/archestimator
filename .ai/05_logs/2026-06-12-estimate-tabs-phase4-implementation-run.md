# Estimate Tabs Phase 4 Implementation Run — Terminology Rebrand

**Date:** 2026-06-12 local / 2026-06-12Z
**Branch:** `feat/estimate-tabs-phase4-terminology`
**Scope:** Phase 4 user-facing terminology only: “estimate sheet/sheet” meaning the estimate became “estimate”; tree containers became “tabs”; `sheet_code` is displayed as “Estimate code”.
**Non-goals / keep-list:** No DB/RPC/table/type/key/file-component renames; no linked Supabase apply/typegen; no Vercel deploy; no hosted/manual/provider proof. Excel worksheet vocabulary, overlay `Sheet`, construction material/unit strings, and compatibility tokens stay intentionally unchanged.

## Implementation summary

- Rebranded project estimate list/create/edit/delete copy, mass-deletion confirmations, table/metadata labels, publication/share labels, invite/collaboration copy, pending-invite/homebase copy, activity labels, AI/read-context labels, template insertion labels, component-library aria copy, and landing/marketing copy where the plan allowed local alignment.
- Kept internal compatibility symbols such as `EstimateSheet*`, `estimate_sheet_*`, `sheetCode`, `sheet_code`, mass-deletion RPC names, stored history event names, and localStorage/data attributes.
- Updated copy-coupled unit/Vitest/e2e expectations in the same phase so tests assert the new visible copy while keeping old prompt phrases where they are deliberate backward-compatibility inputs.
- Restored `next-env.d.ts` route-type churn after Next build.

## Files changed (high-level clusters)

- App/marketing/share/invite surfaces: `src/app/**`, `src/components/landing/**`, `src/components/share/**`.
- Workshop UI: `src/components/workshop/**`, including estimate list/table, editor center chrome, publication header, teamspace header, homebase, template picker/gallery/editor, and component-library manager copy.
- Domain/copy helpers: `src/lib/activity/**`, `src/lib/ai/**`, `src/lib/collaboration/**`, `src/lib/component-library/actions.ts`, `src/lib/estimates/actions.ts`, `src/lib/mass-deletion/bulk-action.ts`, `src/lib/publication/types.ts`, `src/lib/repositories/workspace-repository.ts`, `src/lib/workshop/actions.ts`.
- Tests/e2e/story copy assertions: `tests/vitest/**`, `tests/unit/reset-baseline.test.ts`, `e2e/shared-link-receiver.spec.ts`, `e2e/workshop-library-demo-smoke.spec.ts`, `src/stories/trees/tree-panel-header.stories.tsx`.
- Evidence logs: `.ai/05_logs/2026-06-12-estimate-tabs-phase4/`.

## Verification evidence

| Command / gate | Result | Evidence |
|---|---:|---|
| `bunx vitest run` Phase 4 targeted copy batch (`15` files) | PASS: 176 tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-targeted-final.log` |
| Adjacent copy-sensitive Vitest batch without known MCP baseline test | PASS: 64 tests / 5 files | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-adjacent-copy-without-baseline-mcp.log` |
| AI/package-builder copy and intent-adjacent batch | PASS: 88 tests / 4 files | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-ai-package-builder.log` |
| Project total/running-total copy guards | PASS: 8 tests + 41 tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-project-total-header.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-running-totals-rerun.log` |
| Teamspace/invite copy rerun after final placeholder fix | PASS: 29 tests / 3 files | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-teamspace-invite-copy-rerun.log` |
| History cursor label isolated rerun after `Sheet activity` -> `Estimate activity` | PASS: 1 test / 24 skipped | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-history-cursor-copy-rerun.log` |
| Source-only exact legacy user-facing/copy residue scan | PASS: no output under the exact pattern list | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/terminology-exact-final.log` |
| `bun run type-check` after final source-string edits | PASS | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-type-check-final.log` |
| `bun run build` after final source-string edits | PASS | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-build-final.log` |
| `bun run lint:design-system` | PASS | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-lint-design-system.log` |
| `bun run lint:design` | PASS | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-lint-design.log` |
| `git diff --check` | PASS after final docs/source edits | `.ai/05_logs/2026-06-12-estimate-tabs-phase4/git-diff-check-final.log` |

## Known baseline / non-Phase-4 failures still open

- `bun run lint` and `bun run validate` still stop on the known repo lint baseline: 551 problems, 3 errors (`command-dialog.tsx` set-state-in-effect and `tabs.stories.tsx` `any` x2) / 548 warnings. Evidence: `.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-lint.log`, `.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-validate.log`.
- `bun test tests/unit` still fails the known `tests/unit/reset-baseline.test.ts:54` homebase class baseline. Evidence: `.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-test-unit-rerun.log`.
- The broader adjacent copy run still includes the pre-existing MCP hook/package contract failure in `tests/vitest/security-findings-contracts.test.ts:140`; the copy-sensitive batch excluding that baseline passes. Evidence: `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-adjacent-copy-rerun.log`.
- The additional mixed rerun after source-label cleanup hit known unrelated baselines: stale generated Supabase function types (`archive_estimate_tab_with_history`) and workshop reset UI expectations. The newly edited cursor-label assertion passes in isolation. Evidence: `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-additional-copy-rerun.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-history-cursor-copy-rerun.log`.

## Proof boundary

- **Local-only proven:** copy/source/test changes, TypeScript, production build, design-system/design checks, targeted Vitest batches, exact source-copy scan.
- **Provider-proven:** none in this phase.
- **Manual/browser proof pending:** hosted/publication/manual collaboration/export proof, real browser visual pass, linked Supabase apply/typegen, advisor checks, and Vercel deploy/promote remain unperformed by design.

## RTM / phase status

- Phase 4 local evidence advances R2.1, R2.2, R2.3, R2.5, and the Phase-4 keep-list portion of R3.1 in `13_REQUIREMENTS_TRACEABILITY_MATRIX.md`.
- R2.4 marketing/landing copy received local alignment, but owner review remains the product-decision boundary.
- Later phases remain open: templates panel unification (Phase 5), all-tabs export (Phase 6), collaboration/publication/provider proof (Phase 7), and cleanup/archive (Phase 8/final).
