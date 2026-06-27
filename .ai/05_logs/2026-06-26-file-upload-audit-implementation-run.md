# File Upload Audit Implementation Run

## Run Receipt

AGENT_RECEIPT:
mode=implementation
scope=file-upload-audit-plan: project images, component images, estimate-row images, component attachments, upload broker/data/UX/security/provider proof
non_goals=no new branch; no production deploy; no paid add-ons; no unrelated provider projects; no destructive git operations
writes=scoped source/tests/migrations/docs/evidence files required by the approved plan
validation=targeted tests, type/lint where relevant, provider proof when configured, review, UltraQA, final completion audit
proof_boundary=local-plus-linked-provider-readback for upload-domain catalog shape plus linked migration dry-run parity; direct storage operations, browser, manual, and production proof still require explicit evidence
stop_condition=done/blocker/owner-decision/destructive-approval
orchestrator=Codex lead on current checkout
loop_phase=execute-verify-partial
lead_lane=Codex highest-capability orchestration/integration
worker_lanes=read-only native subagents for route/test/architecture/UI/security/verification mapping, then disjoint write scopes only when safe
loop_memory=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/LOOP_LEDGER.md; .ai/05_logs/2026-06-26-file-upload-audit-implementation-run.md
research_boundary=local-only for current repo; official docs required before dependency/API uncertainty
manual_qa_channel=none yet

## Start Snapshot

- UTC start: 2026-06-26T17:45:01Z.
- Branch: `main`.
- Commit: `9019d2809a42ced36b88eaf8ab095434a0936f2d`.
- Initial status: clean (`## main...origin/main`).
- Active Codex goal: full no-branch implementation of the file upload audit and
  improvement plan.

## Source Of Truth Read

- Active prompt AGENTS.md instructions.
- `.ai/10_state/current-state.md` fast path.
- `.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/` all 20 plan docs.
- `.ai/08_prompts/000_Planning Prompts/Executing-Plan-Prompt.md`.
- `/Users/philiplewis/.codex/attachments/b1fb5c2e-ba11-47e3-af6e-f1e47910b5d3/pasted-text-1.txt`.
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`.
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.
- `.ai/03_plans/README.md`.
- `package.json`.

## Skills And Tools

- Skills read: `ultragoal`, `ultraqa`, `ultrawork`, `autopilot`,
  `executing-plans`, `using-superpowers`, `subagent-driven-development`,
  `requesting-code-review`, `verification-before-completion`.
- Native subagents are available; write-capable implementation will be
  serialized or assigned disjoint write scopes only.
- No branch/worktree creation due explicit user constraint.

## Acceptance Gates

1. Phase 0 safety and regression gates pass before later-phase implementation.
2. Every `UPLOAD-REQ-*` requirement is implemented or explicitly release-blocked
   with evidence and without weakening scope.
3. Provider, browser, manual, and production evidence are not claimed from local
   checks.
4. Code review and UltraQA gates are clean before completion.
5. The plan folder is archived only after the full implementation is verified.

## Command Evidence

| UTC | Command | Exit | Evidence |
|---|---|---:|---|
| 2026-06-26T17:45:01Z | `git status --short --branch` | 0 | `## main...origin/main` |
| 2026-06-26T17:45:01Z | `wc -l .ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/*.md` | 0 | 20 docs / 2451 lines |
| 2026-06-26T17:45:01Z | `git rev-parse HEAD` | 0 | `9019d2809a42ced36b88eaf8ab095434a0936f2d` |
| 2026-06-26T18:00Z | `node scripts/prove-upload-storage-denial-postgres.mjs` | 0 | Wrote provider-proof-skipped artifact because `ARCH_UPLOAD_STORAGE_PROOF` was not set. |
| 2026-06-26T18:00Z | `node scripts/measure-upload-smoke-benchmark.mjs` | 0 | Wrote local-only smoke/profile artifacts; local smoke passed. |
| 2026-06-26T18:20Z | `bunx eslint src/lib/uploads/client-state.ts src/lib/uploads/client-upload.ts src/components/workshop/estimate-sheet/rows/cells.tsx tests/vitest/upload-client-state.test.ts tests/vitest/estimate-component-drag.test.tsx` | 0 | Touched client upload files linted clean. |
| 2026-06-26T18:20Z | `git diff --check -- <upload/client touched paths>` | 0 | No whitespace errors. |
| 2026-06-26T18:21Z | `bunx tsc --noEmit --pretty false` | 2 | Blocked by unrelated dirty estimate-row table prop mismatch in `src/components/workshop/estimate-sheet/rows/branch.tsx`. |
| 2026-06-26T18:22:54Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts --maxWorkers=1` | 0 | 12 files / 77 tests passed. |
| 2026-06-26T18:47Z | `bunx vitest run tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 7 files / 72 tests passed. |
| 2026-06-26T18:48Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts --maxWorkers=1` | 0 | 12 files / 87 tests passed. |
| 2026-06-26T18:48Z | `bunx eslint src/lib/uploads/admission-control.ts src/lib/uploads/upload-records.ts src/app/api/estimate-row-images/route.ts src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/estimate-sheet/rows/row-table.tsx src/components/workshop/estimate-sheet/rows/branch.tsx src/components/workshop/EstimateSheetContent.tsx tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/estimate-component-drag.test.tsx` | 1 | Hit pre-existing React lint errors in dirty `EstimateSheetContent.tsx` and `rows/branch.tsx`; upload-specific lint rerun separately. |
| 2026-06-26T18:48Z | `bunx eslint src/lib/uploads/admission-control.ts src/lib/uploads/upload-records.ts src/app/api/estimate-row-images/route.ts src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/estimate-sheet/rows/row-table.tsx tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/estimate-component-drag.test.tsx` | 0 | Upload implementation/tests linted clean. |
| 2026-06-26T18:49Z | `node scripts/prove-upload-storage-denial-postgres.mjs` | 0 | Wrote provider-proof-skipped artifact covering `project-images`, `component-images`, and `component-attachments` because `ARCH_UPLOAD_STORAGE_PROOF` was not set. |
| 2026-06-26T18:49Z | `node scripts/measure-upload-smoke-benchmark.mjs` | 0 | Wrote local-only smoke/profile artifacts; local smoke passed. |
| 2026-06-26T18:51Z | `bunx tsc --noEmit --pretty false` | 0 | No TypeScript errors. |
| 2026-06-26T18:51:28Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts --maxWorkers=1` | 0 | 12 files / 87 tests passed after release-gate artifact update. |
| 2026-06-26T18:52Z | `bunx eslint src/lib/uploads/admission-control.ts src/lib/uploads/upload-records.ts src/app/api/estimate-row-images/route.ts src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/estimate-sheet/rows/row-table.tsx tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/upload-release-gates.test.ts` | 0 | Final scoped upload lint pass clean. |
| 2026-06-26T18:52Z | `bunx tsc --noEmit --pretty false` | 0 | Final typecheck clean. |
| 2026-06-26T18:52Z | `git diff --check -- <upload touched paths>` | 0 | No whitespace errors. |
| 2026-06-26T19:05Z | `bunx vitest run tests/vitest/estimate-component-drag.test.tsx tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/project-component-projection.test.ts tests/vitest/upload-domain-contracts.test.ts --maxWorkers=1` | 0 | 4 files / 52 tests passed for asset finality. |
| 2026-06-26T19:05Z | `bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts --maxWorkers=1` | 0 | 1 file / 29 tests passed for route auth boundaries. |
| 2026-06-26T19:05Z | `bunx eslint src/app/api/estimate-row-images/route.ts src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/estimate-sheet/rows/editable-row-model.ts src/components/workshop/estimate-sheet/rows/row-table.tsx src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts src/lib/estimates/actions.ts src/lib/component-library/project-component-projection.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/project-component-projection.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts` | 0 | No lint errors; `project-component-projection.ts` still has pre-existing unused helper warnings. |
| 2026-06-26T19:06Z | `bunx tsc --noEmit --pretty false` | 2 | Blocked by unrelated untracked `src/hooks/use-estimate-row-update-broadcast.ts`: `candidate.rowRevision` is possibly undefined. |
| 2026-06-26T19:08Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 13 files / 101 tests passed after asset-finality implementation. |
| 2026-06-26T19:09Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 1 file / 2 tests passed after release-gate artifact update. |
| 2026-06-26T19:09Z | `git diff --check -- <upload/finality touched paths>` | 0 | No whitespace errors. |
| 2026-06-26T19:13Z | `node scripts/prove-upload-domain-rls-postgres.mjs` | 0 | Wrote provider-proof-skipped artifact because `ARCH_UPLOAD_DOMAIN_RLS_PROOF` is not set. |
| 2026-06-26T19:13Z | `bunx vitest run tests/vitest/upload-domain-proof-script.test.ts --maxWorkers=1` | 0 | 1 file / 1 test passed for proof-script contract. |
| 2026-06-26T19:14Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 14 files / 102 tests passed after domain-proof script addition. |
| 2026-06-26T19:15Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 1 file / 2 tests passed after release-gate count update. |
| 2026-06-26T19:15Z | `node --check scripts/prove-upload-domain-rls-postgres.mjs` | 0 | Script syntax valid. |
| 2026-06-26T19:15Z | `bunx eslint scripts/prove-upload-domain-rls-postgres.mjs tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-release-gates.test.ts` | 0 | No lint errors. |
| 2026-06-26T19:15Z | `git diff --check -- <upload-domain proof touched paths>` | 0 | No whitespace errors. |
| 2026-06-26T19:20Z | `bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts --maxWorkers=1` | 0 | 1 file / 31 tests passed after component-image resolver tests. |
| 2026-06-26T19:20Z | `bunx eslint src/app/api/component-library/images/route.ts src/app/api/estimate-row-images/route.ts tests/vitest/auth-sensitive-api-boundaries.test.ts` | 0 | No lint errors. |
| 2026-06-26T19:21Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 1 file / 2 tests passed after resolver gate update. |
| 2026-06-26T19:21Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 14 files / 104 tests passed after resolver tests. |
| 2026-06-26T19:22Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 1 file / 2 tests passed after release-gate count update. |
| 2026-06-26T19:22Z | `git diff --check -- <component-image resolver touched paths>` | 0 | No whitespace errors. |
| 2026-06-26T19:30Z | `bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts --maxWorkers=1` | 0 | 2 files / 36 tests passed after fail-closed attachment broker. |
| 2026-06-26T19:30Z | `bunx eslint src/app/api/component-library/attachments/route.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/upload-release-gates.test.ts` | 0 | No lint errors for attachment broker slice. |
| 2026-06-26T19:30Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts --maxWorkers=1` | 0 | 3 files / 38 tests passed after release-gate artifact update. |
| 2026-06-26T19:30Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 14 files / 107 tests passed after attachment broker tests. |
| 2026-06-26T19:31Z | `bunx tsc --noEmit --pretty false` | 0 | No TypeScript errors. |
| 2026-06-26T19:31Z | `git diff --check -- <attachment broker touched paths>` | 0 | No whitespace errors. |
| 2026-06-26T19:31Z | `bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts --maxWorkers=1` | 0 | 1 file / 34 tests passed after final evidence update. |
| 2026-06-26T19:37Z | `bunx vitest run tests/vitest/upload-cleanup.test.ts --maxWorkers=1` | 0 | 1 file / 4 tests passed for upload cleanup planning core. |
| 2026-06-26T19:37Z | `bunx eslint src/lib/uploads/cleanup.ts tests/vitest/upload-cleanup.test.ts` | 0 | No lint errors for cleanup core. |
| 2026-06-26T19:38Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 1 file / 2 tests passed after cleanup gate update. |
| 2026-06-26T19:38Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 15 files / 111 tests passed after cleanup core tests. |
| 2026-06-26T19:38Z | `bunx tsc --noEmit --pretty false` | 0 | No TypeScript errors. |
| 2026-06-26T19:38Z | `git diff --check -- <upload cleanup/broker touched paths>` | 0 | No whitespace errors. |
| 2026-06-26T19:41Z | `bunx vitest run tests/vitest/upload-storage-provider.test.ts --maxWorkers=1` | 0 | 1 file / 3 tests passed for storage provider read/signed-read contract. |
| 2026-06-26T19:41Z | `bunx eslint src/lib/uploads/storage-provider.ts tests/vitest/upload-storage-provider.test.ts` | 0 | No lint errors for storage provider contract. |
| 2026-06-26T19:42Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 1 file / 2 tests passed after provider adapter gate update. |
| 2026-06-26T19:42Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 16 files / 114 tests passed after provider contract tests. |
| 2026-06-26T19:42Z | `bunx tsc --noEmit --pretty false` | 0 | No TypeScript errors. |
| 2026-06-26T19:42Z | `git diff --check -- <provider adapter/cleanup touched paths>` | 0 | No whitespace errors. |
| 2026-06-26T19:45Z | `bunx vitest run tests/vitest/upload-domain-contracts.test.ts --maxWorkers=1` | 0 | 1 file / 9 tests passed after scan-status taxonomy migration. |
| 2026-06-26T19:45Z | `bunx eslint tests/vitest/upload-domain-contracts.test.ts` | 0 | No lint errors for scan taxonomy test update. |
| 2026-06-26T19:46Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 1 file / 2 tests passed after scan taxonomy gate update. |
| 2026-06-26T19:46Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 16 files / 115 tests passed after scan taxonomy test. |
| 2026-06-26T19:47Z | `bunx tsc --noEmit --pretty false` | 0 | No TypeScript errors. |
| 2026-06-26T19:47Z | `git diff --check -- <scan taxonomy/provider touched paths>` | 0 | No whitespace errors. |
| 2026-06-26T20:05Z | `bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-scanning.test.ts --maxWorkers=1` | 0 | 3 files / 68 tests passed after private estimate-row bucket and scanner lifecycle contracts. |
| 2026-06-26T20:05Z | `bunx eslint src/app/api/estimate-row-images/route.ts src/lib/uploads/scanning.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-scanning.test.ts` | 0 | No lint errors for privacy/scanner slice. |
| 2026-06-26T20:05Z | `bunx tsc --noEmit --pretty false` | 0 | No TypeScript errors after a one-line shared-worktree `sort_order` parser coordination fix. |
| 2026-06-26T20:05Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 17 files / 140 tests passed after expanded upload matrix. |
| 2026-06-26T20:06Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 1 file / 2 tests passed after release-gate evidence update. |
| 2026-06-26T20:06Z | `node -e 'JSON.parse(require("fs").readFileSync(".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json","utf8")); console.log("json ok")'` | 0 | Release-gate JSON parsed successfully. |
| 2026-06-26T20:14Z | `bunx vitest run tests/vitest/upload-cleanup.test.ts --maxWorkers=1` | 0 | 1 file / 7 tests passed after retention/observability cleanup operations contract. |
| 2026-06-26T20:14Z | `bunx vitest run tests/vitest/upload-cleanup.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 2 files / 9 tests passed. |
| 2026-06-26T20:14Z | `bunx eslint src/lib/uploads/cleanup.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-release-gates.test.ts` | 0 | No lint errors for cleanup operations contract. |
| 2026-06-26T20:14Z | `node -e 'JSON.parse(require("fs").readFileSync(".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json","utf8")); console.log("json ok")'` | 0 | Release-gate JSON parsed successfully. |
| 2026-06-26T20:15Z | `bunx tsc --noEmit --pretty false` | 0 | No TypeScript errors. |
| 2026-06-26T20:15Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 17 files / 143 tests passed. |
| 2026-06-26T20:22Z | `bunx vitest run tests/vitest/upload-component-image-backfill.test.ts --maxWorkers=1` | 0 | 1 file / 4 tests passed. |
| 2026-06-26T20:22Z | `bunx eslint src/lib/uploads/component-image-backfill.ts tests/vitest/upload-component-image-backfill.test.ts` | 0 | No lint errors for component-image backfill readiness classifier. |
| 2026-06-26T20:22Z | `bunx vitest run tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 2 files / 6 tests passed. |
| 2026-06-26T20:22Z | `node -e 'JSON.parse(require("fs").readFileSync(".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json","utf8")); console.log("json ok")'` | 0 | Release-gate JSON parsed successfully. |
| 2026-06-26T20:23Z | `bunx tsc --noEmit --pretty false` | 0 | No TypeScript errors after classifier type fix. |
| 2026-06-26T20:23Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 18 files / 147 tests passed. |
| 2026-06-26T20:31Z | `bunx vitest run tests/vitest/upload-session-strategy.test.ts --maxWorkers=1` | 0 | 1 file / 4 tests passed. |
| 2026-06-26T20:31Z | `bunx eslint src/lib/uploads/session-strategy.ts tests/vitest/upload-session-strategy.test.ts` | 0 | No lint errors for upload session strategy contract. |
| 2026-06-26T20:31Z | `bunx vitest run tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 2 files / 6 tests passed. |
| 2026-06-26T20:31Z | `node -e 'JSON.parse(require("fs").readFileSync(".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json","utf8")); console.log("json ok")'` | 0 | Release-gate JSON parsed successfully. |
| 2026-06-26T20:32Z | `bunx tsc --noEmit --pretty false` | 0 | No TypeScript errors. |
| 2026-06-26T20:32Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 19 files / 151 tests passed. |
| 2026-06-27T00:17Z | Supabase connector migration ledger and read-only upload catalog query for project `ebxxqidacheyapmmzavr` | 0 | Linked provider readback passed; five upload migrations present, upload tables RLS-enabled, expected upload table policies/function grants present, and known broad direct storage policies absent. |
| 2026-06-27T00:18Z | `bunx vitest run tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 2 files / 3 tests passed after provider-readback evidence update. |
| 2026-06-27T00:18Z | `bunx eslint tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-release-gates.test.ts` | 0 | No lint errors for provider-readback/release-gate tests. |
| 2026-06-27T00:28Z | `bunx vitest run tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts --maxWorkers=1` | 0 | 4 files / 18 tests passed after restoring semicolon-only upload migration files. |
| 2026-06-27T00:28Z | `bunx tsc --noEmit --pretty false` | 0 | No TypeScript errors. |
| 2026-06-27T00:29Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 20 files / 152 tests passed. |
| 2026-06-27T00:29Z | `node -e "JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json','utf8')); JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-provider-readback.json','utf8')); console.log('json ok')"` | 0 | Release-gate and provider-readback JSON parsed successfully. |
| 2026-06-27T00:29Z | `git diff --check` | 0 | No whitespace errors. |
| 2026-06-27T00:35Z | `supabase db push --linked --dry-run` | 0 | Linked provider dry-run passed: `Remote database is up to date.` |
| 2026-06-27T00:36Z | `bunx vitest run tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1` | 0 | 2 files / 3 tests passed after provider migration dry-run evidence update. |
| 2026-06-27T00:36Z | `bunx eslint tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-release-gates.test.ts` | 0 | No lint errors for provider dry-run/release-gate tests. |
| 2026-06-27T00:36Z | `node -e "for (const f of ['upload-release-gates.json','upload-provider-readback.json','upload-provider-migration-dry-run.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"` | 0 | Release-gate, provider-readback, and provider dry-run JSON parsed successfully. |
| 2026-06-27T00:36Z | `bunx tsc --noEmit --pretty false` | 0 | No TypeScript errors. |
| 2026-06-27T00:37Z | `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | 0 | 21 files / 153 tests passed. |
| 2026-06-27T00:37Z | `git diff --check` | 0 | No whitespace errors. |

## Iteration Notes

### Iteration 1 - Discovery And Coordination

- Read the active plan pack and execution prompt.
- Confirmed no current dirty files before adding coordination artifacts.
- Added `LOOP_LEDGER.md` and this run log.
- Next: dispatch read-only subagents and inspect upload source/test seams.

### Iteration 2 - Phase 0 Backend Containment

- Added explicit project/library edit authorization before service-role storage
  operations.
- Dropped broad direct component image/attachment storage write/update/delete
  policies in a containment migration.
- Froze attachment approval/supersede RPCs until scanning exists.
- Added upload admission caps before expensive route work where route shape
  allows it.

### Iteration 3 - Upload Domain Foundation

- Added policy/object-key/provider/recording modules under `src/lib/uploads/`.
- Added upload-domain tables, RLS/revokes, scoped descriptor RPC, and route
  dual-write of asset/session/event records.
- Preserved legacy route response fields while adding `uploadSessionId`,
  `assetId`, and `scanStatus`.

### Iteration 4 - Proof And Readiness Artifacts

- Added env-gated provider storage proof script and local Sharp/upload benchmark.
- Added release-gate artifact:
  `.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json`.
- Current readiness is intentionally `blocked` for closed-beta, production, and
  platform gates where provider proof, asset finality, component image privacy,
  scanner/download, cleanup/observability, hosted runtime, and provider
  portability remain incomplete.

### Iteration 5 - Shared Upload UX Slice

- Added shared client upload state machine and abort/timeout fetch transport.
- Wired estimate-row reference image modal to cancel in-flight upload and retry a
  selected file after route failure.
- Added DOM/unit coverage for selected/uploading/error/cancel/retry status,
  abort propagation, alert/status roles, and preserved route compatibility.

### Iteration 6 - Reviewer Blocker Closure

- Tightened direct storage containment for project images and pending component
  attachment reads; provider proof script now checks project/component buckets.
- Made upload admission actor-bound independent of rotating forwarded IPs.
- Moved upload session/asset/event persistence behind the atomic
  `record_upload_asset` RPC and added DB constraints plus a session/asset
  consistency trigger.
- Added estimate-scoped reference-image route and threaded project/estimate ids
  through the estimate row UI without weakening library-manager routes.
- Isolated stale cancelled upload attempts and cleaned up uploaded attachments
  when upload-record persistence fails.
- Updated release gates to 12 files / 87 tests, provider proof skipped boundary,
  local smoke pass, scoped lint pass, typecheck pass, and whitespace pass.

### Iteration 7 - Estimate Row Asset Finality

- Made `/api/estimate-row-images` require row scope and record finalized assets
  against that row.
- Returned a canonical `imageAsset` descriptor from the broker while preserving
  legacy URL response fields.
- Threaded `imageAsset` through the reference-image editor, row diffing, and row
  update handler.
- Added `validate_estimate_row_image_asset` as a security-definer RPC that checks
  project, estimate, row, actor, bucket, surface, upload session, and metadata
  binding before returning a canonical descriptor.
- Updated `updateEstimateRowItem` to validate/canonicalize asset descriptors
  before calling `update_estimate_row_item_with_history`, and to reject tampered
  descriptors fail-closed.
- Carried the descriptor through project-component projection metadata.
- Updated `upload-release-gates.json`: `UPLOAD-GATE-ESTIMATE-ROW-ASSET-FINALITY`
  is now a local pass; provider storage proof, upload-domain applied proof,
  component image privacy/backfill, scanner/download, cleanup/observability,
  hosted runtime, and provider portability remain blocked.

### Iteration 8 - Upload Domain Provider Proof Harness

- Added `scripts/prove-upload-domain-rls-postgres.mjs`.
- The script skips by default unless `ARCH_UPLOAD_DOMAIN_RLS_PROOF=1`, writes
  `evidence/upload-domain-rls-proof.json`, and requires scoped Supabase URL,
  anon key, service role key, auth token, workspace/user, project, estimate, and
  row IDs for linked-provider proof.
- Enabled proof checks include direct table select denial for anon/authenticated
  roles, authenticated denial for `record_upload_asset`, anon denial for
  descriptor RPCs, authenticated own-asset descriptor reads, row-bound
  `validate_estimate_row_image_asset`, wrong-row null behavior, and service-role
  cleanup.
- Added `tests/vitest/upload-domain-proof-script.test.ts` and updated
  `upload-release-gates.json` to record the skipped proof boundary.
- The applied-proof gate remains blocked until the script is run against the
  linked provider with `ARCH_UPLOAD_DOMAIN_RLS_PROOF=1`.

### Iteration 9 - Component Image Private Resolver For New Uploads

- Added `GET /api/component-library/images?path=...` as a private workspace
  image resolver with safe `.webp` path parsing, no-store fail-closed errors,
  private immutable success caching, `nosniff`, and service-role storage
  download.
- Changed component-library image uploads and estimate-row reference image
  uploads to return `/api/component-library/images?path=...` URLs instead of
  Supabase public URLs.
- Added auth-boundary tests for private resolver success, malformed path
  fail-closed behavior before auth, and source assertions that the broker routes
  no longer call `.getPublicUrl(path)`.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-COMPONENT-IMAGE-PRIVATE-RESOLVER-LOCAL` as local evidence while
  keeping `UPLOAD-GATE-COMPONENT-IMAGE-PRIVACY-DECISION` blocked for legacy
  public objects, persisted URLs, publication snapshots, provider read-denial
  proof, and final product/security decision.

### Iteration 10 - Fail-Closed Component Attachment Download Broker

- Added `GET /api/component-library/attachments?id=...` as an authenticated,
  workspace/library-manager-gated broker for component attachments.
- The broker validates UUID ids before auth work, resolves the attachment in the
  current workspace, requires a matching `upload_assets` row with
  `surface=component-attachment`, `status=finalized`, and `scan_status=clean`,
  records `download_url_issued` in `upload_events` before storage download, and
  returns no-store failure responses for malformed, missing, unauditable,
  pending, or unscanned assets.
- Added route tests proving malformed ids fail before auth, pending scan assets
  never reach storage/audit, and clean assets audit then download with safe
  response headers.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-ATTACHMENT-DOWNLOAD-BROKER-FAIL-CLOSED` as local evidence while
  keeping the production scanner gate blocked for scanner/CDR strategy,
  scan-clean transitions, provider-backed clean download proof, and override
  workflow.

### Iteration 11 - Upload Cleanup Planning Core

- Added `src/lib/uploads/cleanup.ts` with conservative cleanup target planning
  for failed/deleted/expired records and expired reserved sessions only.
- The planner rejects finalized assets, unsafe path traversal, cross-workspace
  paths, bucket/surface mismatches, and unsupported attachment extensions before
  a future scheduled job can call provider deletion.
- Cleanup candidates include thumbnails for image uploads, dedupe
  bucket/path pairs, and preserve asset/session/workspace/reason context for a
  future audit-write layer.
- Added summary metrics for candidate, removed, failed, rejected, and
  failed-bucket counts without exposing provider credentials, signed URLs, or
  raw provider internals.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-UPLOAD-CLEANUP-CORE-LOCAL` as local evidence while keeping the
  production cleanup/observability gate blocked for durable scheduled cleanup,
  provider-backed retry/audit execution, retention rules, dashboard emission,
  quota alerts, scanner backpressure, and runbooks.

### Iteration 12 - Provider Adapter Read Parity

- Expanded `UploadStorageProvider` with provider-neutral `downloadObject` and
  `createSignedReadUrl` methods while keeping direct signed uploads out of
  scope.
- Implemented Supabase adapter mappings for storage download and short-lived
  signed-read URLs, with fail-closed error propagation when provider download
  or signing fails.
- Added a fake in-memory provider contract test that exercises upload, signed
  read, download, remove, missing-object failure, Supabase adapter mapping, and
  Supabase download/signing failure behavior.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-PROVIDER-ADAPTER-READ-PARITY-LOCAL` as local platform evidence
  while keeping provider portability blocked for signed/resumable upload session
  semantics, S3-like multipart parity tests, and migration dry-run against asset
  descriptors.

### Iteration 13 - Scan Status Taxonomy

- Added additive migration
  `20260626194500_upload_scan_status_taxonomy.sql` to extend
  `upload_scan_status` with `failed_transient`, `failed_permanent`, and
  `override_approved`.
- Updated upload-domain contracts to lock the new statuses alongside existing
  `pending`, `clean`, `infected`, and `unsupported` states.
- The attachment download broker remains strict: only `scan_status=clean` can
  reach audit and storage download; override semantics are still blocked until
  a real admin/security workflow exists.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-SCAN-STATUS-TAXONOMY-LOCAL` while keeping scanner execution
  blocked for scanner/CDR strategy, scan queue, clean/failure transitions,
  provider-backed clean download proof, and override workflow.

### Iteration 14 - Private Estimate Row Images And Scanner Lifecycle Contracts

- Moved estimate-row reference image uploads to the private `project-images`
  bucket under an `estimate-row-images` subpath and brokered read URL via
  `/api/projects/images`.
- Updated upload-domain validation contracts so row image descriptors must be
  bound to `surface=project-image`, `target_entity_type=estimate-row`,
  `target_entity_id=<projectId>`, `storage_bucket=project-images`, and matching
  project/estimate/row metadata.
- Added `src/lib/uploads/scanning.ts` and
  `20260626200000_upload_scan_lifecycle_contracts.sql` with local scanner
  policies, transition rules, backpressure evaluation, scan-result RPC
  contracts, and conservative override contracts. The attachment broker still
  serves only `scan_status=clean`.
- Expanded route/security coverage for happy upload paths, malicious/mismatched
  fixtures, stale row denial before storage, workspace mismatch resolvers,
  attachment scan-state denial, and audit-failure fail-closed behavior.
- Updated `upload-release-gates.json` with local passes for domain contracts,
  route/malicious fixture coverage, private estimate-row bucket behavior, and
  scanner lifecycle contracts while keeping provider/backfill/production gates
  honestly blocked.

### Iteration 15 - Cleanup Retention And Observability Contract

- Extended `src/lib/uploads/cleanup.ts` with explicit failed-asset,
  deleted-asset, expired-session, and audit-event retention cutoffs.
- Added retry-after guidance for failed provider cleanup, dashboard-safe cleanup
  metric names, failed-bucket counts, and warning/critical backlog alerts.
- Expanded cleanup tests from 4 to 7 cases to cover retention dates, retry
  status, unsafe rejected records, and backlog pressure without exposing storage
  paths or provider internals.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-CLEANUP-RETENTION-OBSERVABILITY-LOCAL` while keeping the
  production cleanup/observability gate blocked for scheduled TTL cleanup,
  provider-backed retry/audit execution, real dashboard emission, quota alerts,
  production backpressure hooks, and runbook proof.

### Iteration 16 - Component Image Backfill Readiness

- Added `src/lib/uploads/component-image-backfill.ts` as a local classifier for
  component-library, estimate-row source snapshot, and publication snapshot
  image references.
- The classifier treats asset descriptors, brokered `/api/component-library/images`
  and `/api/projects/images` routes, and local component thumbnails as ready;
  it marks Supabase public `component-images` URLs for private-resolver backfill;
  and it sends unsafe, unsupported, or external URLs to manual review.
- Added summary counts for ready, needs-backfill, manual-review, and missing
  references so a future provider/project-data proof can report privacy
  readiness without claiming a bucket policy change from local-only evidence.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-COMPONENT-IMAGE-BACKFILL-READINESS-LOCAL` while keeping the
  component-image privacy decision blocked until persisted data is scanned and
  migrated, provider read denial is proven, publication snapshots are handled,
  and product/security signs off.

### Iteration 17 - Upload Session Strategy Contract

- Added `src/lib/uploads/session-strategy.ts` to choose server-mediated,
  signed single-part, multipart resumable, or rejected session strategies from
  surface and file size.
- Current capped uploads stay server-mediated; future larger direct-provider
  flows require finalize RPC, object existence checks, actor/workspace/surface
  binding, upload asset records, checksum/ETag proof, and scan-before-use.
- Added focused tests for current caps, signed single-part strategy, multipart
  resumable strategy, and unknown/policy-gap/absolute oversize rejections.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-UPLOAD-SESSION-STRATEGY-LOCAL` while keeping provider
  portability blocked for provider implementation, S3-like multipart parity
  tests, and migration dry-run proof.

### Iteration 18 - Linked Provider Readback And Migration Artifact Repair

- Captured read-only Supabase provider evidence for project
  `ebxxqidacheyapmmzavr`: the five upload migrations are present, upload tables
  exist with RLS enabled, expected authenticated upload table policies and
  service-role/authenticated function grants are present, scan lifecycle enum
  values are present, and the broad direct storage policies targeted by the
  containment migration are absent.
- Added `evidence/upload-provider-readback.json` plus
  `tests/vitest/upload-provider-readback.test.ts`, and updated release gates to
  add `UPLOAD-GATE-UPLOAD-DOMAIN-APPLIED-READBACK` while keeping direct storage
  write/update/delete/download operation proof blocked until scoped credentials
  and `ARCH_UPLOAD_STORAGE_PROOF=1` are available.
- Repaired four local upload migrations that the expanded matrix found as
  semicolon-only placeholders: attachment approval freeze, upload-domain tables,
  scan taxonomy, and scan lifecycle contracts. Provider readback had already
  confirmed the linked database contained the applied migration effects.
- Fresh verification passed: focused migration matrix 4 files / 18 tests,
  `bunx tsc --noEmit --pretty false`, expanded upload matrix 20 files / 152
  tests, release/provider JSON parse, and `git diff --check`.

### Iteration 19 - Provider Migration Dry-Run Proof

- Captured `supabase db push --linked --dry-run` evidence after linked
  migration reconciliation. The dry-run exited 0 and reported `Remote database
  is up to date.`
- Added `evidence/upload-provider-migration-dry-run.json` plus
  `tests/vitest/upload-provider-migration-dry-run.test.ts`.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-PROVIDER-MIGRATION-DRY-RUN-READBACK` and narrowed the provider
  portability blocker to signed/resumable provider implementation, S3-like
  multipart parity, and existing-object migration/asset-descriptor parity.
- Fresh verification passed: focused provider dry-run/release-gate tests 2 files
  / 3 tests, scoped ESLint, artifact JSON parse, `bunx tsc --noEmit --pretty
  false`, expanded upload matrix 21 files / 153 tests, and `git diff --check`.

### Iteration 20 - Local S3-Like Multipart Provider Parity

- Added `src/lib/uploads/provider-portability.ts` with provider-neutral signed
  single-part and multipart resumable contracts for future direct-provider
  upload implementations.
- Added a fake S3-like provider test covering signed single-part finalization,
  object-scope binding, checksum/ETag object-head proof, size/content-type
  guards, multipart part signing/completion, missing-part failure, and abort
  cleanup.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-S3-LIKE-MULTIPART-PARITY-LOCAL` and narrowed the provider
  portability blocker to real-provider signed/resumable implementation plus
  existing object migration/asset-descriptor parity.
- Fresh verification passed: focused provider-portability test 1 file / 2
  tests, focused provider-portability/release-gate matrix 2 files / 4 tests,
  scoped ESLint, three-artifact JSON parse, `bunx tsc --noEmit --pretty false`,
  expanded upload matrix 22 files / 155 tests, and `git diff --check`.

### Iteration 21 - Local Asset Descriptor Migration Parity

- Added `src/lib/uploads/asset-descriptor-migration.ts` with a local parity
  contract for upload asset descriptors, brokered private component/project
  image URLs, and legacy public component-image URLs.
- The contract normalizes safe references into provider-neutral bucket/path
  locators, emits broker rewrite URLs for legacy public component images, and
  leaves unsafe URLs or descriptor/URL mismatches as manual-review failures.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-ASSET-DESCRIPTOR-MIGRATION-PARITY-LOCAL` and narrowed the
  provider portability blocker to real-provider signed/resumable implementation.
- Fresh verification passed: focused asset-descriptor test 1 file / 4 tests,
  focused asset-descriptor/release-gate matrix 2 files / 6 tests, scoped ESLint,
  three-artifact JSON parse, `bunx tsc --noEmit --pretty false`, and expanded
  upload matrix 23 files / 159 tests.

### Iteration 22 - Component Image Provider Aggregate Scan

- Queried linked Supabase project `ebxxqidacheyapmmzavr` for aggregate counts
  across cost-library image columns, estimate row/template snapshots,
  publication/version snapshots, and `upload_assets`.
- Added `evidence/upload-component-image-provider-scan.json` with count-only
  evidence: zero persisted legacy public component-image URLs, zero
  `upload_assets` component-image records, zero publication/version snapshot
  image rows, and three non-provider estimate-row snapshot image references.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-COMPONENT-IMAGE-PERSISTED-SCAN-READBACK` while keeping the
  privacy gate blocked for the public `component-images` bucket, missing
  provider-backed read-denial proof, non-empty publication snapshot migration
  exercise, and final product/security decision.
- Fresh verification passed: focused provider-scan/release-gate matrix 2 files /
  4 tests, scoped ESLint, four-artifact JSON parse, `bunx tsc --noEmit --pretty
  false`, and expanded upload matrix 24 files / 161 tests.

### Iteration 23 - Component Images Private Bucket Provider Readback

- Applied a linked Supabase migration to Archestimator project
  `ebxxqidacheyapmmzavr` that sets `storage.buckets.component-images.public=false`
  and drops the old `component images are publicly readable` storage policy.
- The Supabase connector recorded provider version `20260627010904` with name
  `20260627120000_make_component_images_private`; local migration history is
  aligned at
  `supabase/migrations/20260627010904_20260627120000_make_component_images_private.sql`.
- Provider readback confirms `component-images.public=false`, no named public
  read policies, and no remaining `storage.objects` policies referencing
  `component-images`.
- Added
  `evidence/upload-component-image-private-bucket-readback.json`, updated
  `upload-release-gates.json` with
  `UPLOAD-GATE-COMPONENT-IMAGE-PRIVATE-BUCKET-READBACK`, and changed the linked
  Supabase readiness probe to expect private `component-images`.
- Fresh verification passed: focused private-bucket/readiness/release-gate matrix
  6 files / 15 tests, scoped ESLint, expanded upload matrix 25 files / 163
  tests, `supabase db push --linked --dry-run` (`Remote database is up to
  date.`), five-artifact JSON parse, `bunx tsc --noEmit --pretty false`, and
  `git diff --check`.
- Component-image privacy remains blocked only for direct unauthenticated object
  read-denial operation proof and a non-empty publication snapshot migration
  exercise.

## Proof Boundary

Current evidence is `local-plus-linked-provider-readback`. Linked provider
readback/dry-run proves upload migration presence, catalog shape, migration
ledger parity, aggregate component-image reference counts, and the
`component-images` bucket catalog/policy privacy state; it does not replace
direct storage operation denial proof, auth-token RLS/RPC scenarios, direct
provider object read-denial proof, browser/mobile proof, manual screen-reader
proof, or production proof. Current focused typecheck and expanded upload matrix
are green.
