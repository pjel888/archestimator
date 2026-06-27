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

### Iteration 24 - Linked Provider Direct Storage Denial Operation Proof

- Hardened `scripts/prove-upload-storage-denial-postgres.mjs` with an
  Archestimator project-ref guard, proof-scoped opt-in `.env.local` loading,
  temporary Supabase Auth user setup/cleanup, anon/auth direct insert, update,
  download, and delete checks for all three upload buckets, and service-role
  readback for delete attempts where Storage `remove()` can report success after
  deleting zero rows.
- Captured `evidence/upload-storage-denial-proof.json` from linked Supabase
  project `ebxxqidacheyapmmzavr`: `proofBoundary=linked-provider`,
  `passed=true`, `skipped=false`, `failedChecks=[]`, `cleanupErrors=[]`, and
  `temporaryUserDeleted=true`.
- Added `tests/vitest/upload-storage-denial-proof.test.ts` to verify the live
  proof artifact covers all expected direct operation labels and contains no
  temporary email/password/session material.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-PROVIDER-STORAGE-DENIAL-OPERATION-PROOF`, removed
  `UPLOAD-GATE-PROVIDER-STORAGE-DENIAL` from closed-beta blockers, and narrowed
  the component-image privacy blocker to only the non-empty publication snapshot
  migration exercise.
- Fresh verification passed: focused storage-proof/release-gate matrix 3 files /
  5 tests, scoped ESLint, release-gate/storage-denial JSON parse, expanded
  upload matrix 26 files / 165 tests, `bunx tsc --noEmit --pretty false`,
  six-artifact JSON parse, and `git diff --check`.

### Iteration 25 - Non-Empty Publication Snapshot Migration Proof

- Added `collectPublicationSnapshotImageReferences` to
  `src/lib/uploads/component-image-backfill.ts` so stored publication snapshot
  rows, including legacy v1.2 tab rows, can be passed through component-image
  backfill classification.
- Added a non-empty publication snapshot fixture that builds a stored snapshot
  row with a legacy public Supabase `component-images` URL, verifies publication
  snapshot normalization preserves it, and classifies it as
  `backfill_to_private_resolver`; a local derivative row is classified as ready.
- Added
  `evidence/upload-component-image-publication-snapshot-migration-proof.json`.
  The artifact pairs the local non-empty migration exercise with linked-provider
  scan evidence showing zero persisted publication/version snapshot image rows,
  so no provider rows required mutation.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-COMPONENT-IMAGE-PUBLICATION-SNAPSHOT-MIGRATION-LOCAL` and marked
  `closedBeta.status=ready` with no closed-beta blockers. Production/platform
  blockers remain unchanged.
- Fresh verification passed: focused component-image backfill test 1 file / 6
  tests, focused publication-snapshot/release-gate matrix 2 files / 8 tests,
  scoped ESLint, publication/release-gate JSON parse, expanded upload matrix
  26 files / 167 tests, `bunx tsc --noEmit --pretty false`, seven-artifact JSON
  parse, and `git diff --check`.

### Iteration 26 - Linked Provider Upload Cleanup Execution Proof

- Added `scripts/prove-upload-cleanup-provider-postgres.ts` as an opt-in Bun
  proof guarded to Supabase project `ebxxqidacheyapmmzavr`.
- The proof builds upload cleanup records for failed/deleted/expired/reserved
  candidates plus finalized, active, cross-workspace, wrong-extension,
  traversal, duplicate, and thumbnail cases; runs `planUploadStorageCleanup`;
  deletes only planner-approved temporary objects; verifies removed objects read
  back missing; and verifies rejected/finalized/active seedable objects remain
  present.
- A read-only adversarial subagent flagged the unsafe raw-delete proof shape;
  the implementation was adjusted to exercise the upload planner and readback
  every deleted/preserved fixture before accepting the proof.
- Added `evidence/upload-cleanup-provider-proof.json` with
  `proofBoundary=linked-provider-cleanup-execution-readback`, `passed=true`,
  `candidateCount=5`, `rejectedCount=5`, `removedCount=5`,
  `readbackMissingCount=5`, `preservedReadbackCount=4`, `failedChecks=[]`, and
  `cleanupErrors=[]`.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-CLEANUP-PROVIDER-EXECUTION-READBACK` under production
  `localPasses`, while keeping production blocked for durable scheduled TTL
  cleanup, persisted retry/audit job execution, dashboard emission, quota
  alerts, production backpressure hooks, hosted runtime proof, scanner/CDR, and
  the retention runbook.
- Fresh verification passed: live provider cleanup proof, focused
  cleanup-provider/release-gate matrix 4 files / 13 tests, scoped ESLint,
  eight-artifact JSON parse, expanded upload matrix 28 files / 171 tests, and
  `git diff --check`.
- Current validation gap: broad `bunx tsc --noEmit --pretty false` now fails in
  unrelated dirty estimate-row adjustment files (`adjustmentPercentage` type
  mismatches), outside this upload cleanup proof slice.

### Iteration 27 - Linked Provider Scanner RPC State/Readback Proof

- Added `scripts/prove-upload-scan-rpc-provider-postgres.ts` as an opt-in Bun
  proof guarded to Supabase project `ebxxqidacheyapmmzavr`.
- First live proof attempts exposed linked-provider drift: the scanner RPC still
  had an older no-checksum signature, `upload_assets.scanned_at` was missing,
  and the session-consistency trigger blocked `scan_status` transitions.
- Applied and mirrored forward repair migrations:
  `20260627024155_upload_scan_rpc_checksum_contracts.sql`,
  `20260627024318_upload_scan_lifecycle_scanned_at_readback.sql`, and
  `20260627024438_upload_asset_session_consistency_scan_mutability.sql`.
- Captured `evidence/upload-scan-rpc-provider-proof.json` from the linked
  provider: `proofBoundary=linked-provider-scan-rpc-readback`, `passed=true`,
  `assetFixtureCount=7`, clean/transient/infected/permanent/unsupported
  outcomes recorded, permanent/unsupported rows read back as
  `override_approved`, checksum and non-attachment denials passed,
  `failedChecks=[]`, and `cleanupErrors=[]`.
- Refreshed `evidence/upload-provider-readback.json` with the scan RPC repair
  migration ledger, `scanned_at` column, and checksum-bound service-role-only
  function signatures.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-SCANNER-RPC-PROVIDER-READBACK` under production `localPasses`,
  while keeping production blocked for the scanner/CDR provider, queue worker,
  provider-backed file scanning, provider-backed clean download proof,
  operational override UI/runbook, hosted runtime proof, cleanup scheduler/
  observability, and real signed/resumable provider implementation.
- Fresh verification passed: live provider scan RPC proof, focused
  scanner/provider-readback/release-gate matrix 5 files / 14 tests, scoped
  ESLint, nine-artifact JSON parse, expanded upload matrix 30 files / 177
  tests, linked dry-run with no pending upload scan repair migrations, and
  `git diff --check`.
- Current validation gap: broad `bunx tsc --noEmit --pretty false` remains red
  in unrelated dirty estimate-row adjustment work at
  `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:857`
  (`adjustmentPercentage` is not in `UpdateEstimateRowInput`).

### Iteration 28 - Supabase Signed Single-Part Provider Proof

- Added `createSupabaseDirectUploadProvider` in
  `src/lib/uploads/provider-portability.ts`. The adapter issues Supabase
  Storage signed single-part upload sessions, reads provider object metadata via
  `info`, validates finalization with provider-neutral object-head checks, and
  explicitly fails closed for direct multipart/resumable methods until a real
  TUS/multipart provider path exists.
- Added `scripts/prove-upload-signed-provider-postgres.ts` as an opt-in live
  provider proof guarded to Supabase project `ebxxqidacheyapmmzavr`.
- Captured `evidence/upload-signed-provider-proof.json` from the linked
  provider: `proofBoundary=linked-provider-signed-upload-readback`,
  `provider=supabase-storage`, `uploadMode=signed_single_part`,
  `resumableImplemented=false`, `signedUrlRecorded=false`,
  `tokenRecorded=false`, `uploadedWithAuthorizationHeader=false`,
  ETag-backed object-head validation, upload asset recording,
  `failedChecks=[]`, and `cleanupErrors=[]`.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-SUPABASE-SIGNED-UPLOAD-PROVIDER-READBACK` under platform
  `localPasses`, while keeping `platform.status=blocked` for app-route signed
  upload integration and real resumable/TUS/multipart provider flows.
- Fresh verification passed: live signed-provider proof, focused
  signed-provider/release-gate matrix 4 files / 10 tests, scoped ESLint,
  ten-artifact JSON parse, expanded upload matrix 32 files / 183 tests,
  `supabase db push --linked --dry-run` with only unrelated
  `20260627123000_signed_quantity_and_row_adjustments.sql` pending,
  `git diff --check`, and broad `bunx tsc --noEmit --pretty false`.

### Iteration 29 - Signed App-Route Provider Session Proof

- Added `src/app/api/component-library/attachments/direct-upload/route.ts` and
  `src/lib/uploads/direct-upload-records.ts`. The route authenticates and checks
  workspace editor access before body parsing, keeps files up to 20 MB on the
  existing server-mediated route, creates signed single-part sessions for larger
  component attachments, stores only reserved session metadata through
  service-role `create_upload_session`, validates provider object-head proof
  before finalization, and records finalized upload assets/events through
  service-role `finalize_upload_session`.
- Applied linked Supabase direct-upload RPC repairs to project
  `ebxxqidacheyapmmzavr` and aligned local migration filenames to provider
  ledger versions `20260627032615`, `20260627034126`, `20260627034336`, and
  `20260627034619`. The repairs reconcile the provider
  `upload_sessions.file_name`, `expires_at`, and `scan_status` schema, use
  `session_reserved` reservation events, cast scan/finalization event CASE
  expressions to `public.upload_event_type`, and keep direct-upload RPCs
  service-role-only.
- Added `scripts/prove-upload-signed-route-provider-postgres.ts` as an opt-in
  live provider proof guarded to Supabase project `ebxxqidacheyapmmzavr`.
- Captured `evidence/upload-signed-route-provider-proof.json` from the linked
  provider: `proofBoundary=linked-provider-signed-route-readback`,
  `route=component-attachment-direct-upload`, `provider=supabase-storage`,
  `uploadMode=signed_single_part`, `sessionStatusFlow=["reserved","finalized"]`,
  `signedUrlRecorded=false`, `tokenRecorded=false`,
  `uploadedWithAuthorizationHeader=false`, ETag-backed object-head validation,
  finalized asset/event readback, `failedChecks=[]`, and `cleanupErrors=[]`.
- Refreshed `evidence/upload-provider-readback.json` with direct-upload
  migration ledger versions, `expires_at`/`file_name`/`scan_status` session
  columns, `session_reserved`/`scan_pending`/`asset_finalized` event labels,
  service-role-only `create_upload_session` and `finalize_upload_session`
  grants, and direct-upload RPC signatures.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-SIGNED-UPLOAD-APP-ROUTE-PROVIDER-READBACK` under platform
  `localPasses`, while keeping `platform.status=blocked` for browser/client
  direct-upload UX integration and real resumable/TUS/multipart provider flows.
- Fresh verification passed: live signed-route proof, focused
  signed-route/readback/release-gate matrix 7 files / 21 tests, scoped ESLint,
  eleven-artifact JSON parse, expanded upload matrix 35 files / 193 tests,
  `supabase db push --linked --dry-run` with only unrelated
  `20260627123000_signed_quantity_and_row_adjustments.sql` pending,
  `git diff --check`, and broad `bunx tsc --noEmit --pretty false`.

### Iteration 30 - Browser Client Signed Direct Upload Integration

- Added `src/lib/uploads/component-attachment-client.ts` with the shared
  browser/client attachment validator and uploader. It keeps files within the
  20 MB server-mediated cap on `/api/component-library/attachments`, routes
  larger files under the 64 MB multipart threshold through
  `/api/component-library/attachments/direct-upload`, uploads the raw `File` to
  the provider signed URL without an Authorization header, then finalizes the
  upload session.
- Wired the Add Component modal attachment upload path to the shared validator/
  uploader and changed the large-file progress copy to signed-session language.
- Removed the modal-local attachment upload helper/constants. A scoped ESLint
  pass on the touched modal exposed an existing render-time ref read; fixed it
  by using a memoized reducer initializer instead of reading
  `initialDraftRef.current` during render.
- Added `tests/vitest/upload-component-attachment-client.test.ts`, covering
  small-file FormData route selection, signed direct-upload create/PUT/finalize
  sequencing, no Authorization header on provider upload, extension-based
  content-type inference, and fail-closed rejection once the unimplemented
  multipart threshold is reached.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-SIGNED-UPLOAD-BROWSER-CLIENT-LOCAL` under platform `localPasses`.
  Platform remains blocked for real resumable/TUS/multipart provider flows, not
  browser/client signed-direct integration.
- Fresh verification passed: focused client test 1 file / 4 tests, scoped
  ESLint for the helper/modal/test, eleven-artifact JSON parse, focused
  client/release-gate matrix 2 files / 6 tests, scoped ESLint including the
  release-gate test, expanded upload matrix 36 files / 197 tests,
  `bunx tsc --noEmit --pretty false`, and `git diff --check`.

### Iteration 31 - Supabase Signed TUS Resumable Upload Provider Flow

- Added Supabase signed TUS resumable session support in
  `src/lib/uploads/provider-portability.ts`: direct storage
  `/storage/v1/upload/resumable/sign` endpoint derivation from the provider
  signed URL, encoded TUS metadata, fixed 6 MB chunk size, and a short-lived
  signed token returned only to the caller.
- Extended `src/app/api/component-library/attachments/direct-upload/route.ts`
  so files at or above the 64 MB threshold reserve `tus_resumable` sessions,
  persist only non-secret metadata, and finalize larger resumable objects with
  provider object-head validation.
- Extended `src/lib/uploads/component-attachment-client.ts` and the Add
  Component modal so large attachments use TUS creation-with-upload plus PATCH
  chunks with `x-signature` and no Authorization header, then finalize through
  the existing upload session route.
- Added `scripts/prove-upload-tus-provider-postgres.ts` and focused proof
  tests. Linked provider proof against project `ebxxqidacheyapmmzavr` passed
  with 2 TUS chunks, ETag-backed object-head validation, finalized asset/event
  readback, no token/upload-location persistence, and `cleanupErrors=[]`.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-TUS-RESUMABLE-APP-ROUTE-LOCAL`,
  `UPLOAD-GATE-TUS-RESUMABLE-BROWSER-CLIENT-LOCAL`, and
  `UPLOAD-GATE-SUPABASE-TUS-RESUMABLE-PROVIDER-READBACK`; `platform.status` is
  now `ready`, while production remains blocked for scanner/CDR, queue worker,
  provider-backed clean download proof, durable cleanup scheduler/observability,
  hosted runtime evidence, and operational override UI/runbook.
- Fresh verification passed: live TUS proof, focused provider/route/client/TUS
  matrix 5 files / 21 tests, release-gates/TUS evidence matrix 2 files / 4
  tests, scoped ESLint, expanded upload matrix 38 files / 205 tests,
  eleven-artifact JSON parse, `bunx tsc --noEmit --pretty false`, and
  `git diff --check`.

### Iteration 32 - Provider-Backed Clean Attachment Download Proof

- Hardened `src/app/api/component-library/attachments/route.ts` so GET download
  brokering now requires `review_status=approved` and
  `is_current_approved=true` before matching the finalized, scan-clean upload
  asset, auditing `download_url_issued`, or reading private storage bytes.
- Added route and governance regression coverage for unapproved/non-current
  attachment rows.
- Added `scripts/prove-upload-clean-download-provider-postgres.ts` plus focused
  script/evidence tests. Linked provider proof against project
  `ebxxqidacheyapmmzavr` passed with an approved/current temporary attachment,
  scan-clean finalized upload asset readback through `record_upload_scan_result`,
  `download_url_issued` audit event, private provider byte readback, safe header
  contract, `failedChecks=[]`, and `cleanupErrors=[]`.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-CLEAN-DOWNLOAD-PROVIDER-READBACK`; production remains blocked for
  scanner/CDR provider execution, queue worker, provider-backed file scanning,
  durable cleanup scheduler/observability/runtime work, hosted runtime evidence,
  and operational override UI/runbook.
- Fresh verification passed: linked clean download proof, focused
  route/governance/evidence/script matrix 5 files / 70 tests, scoped ESLint for
  the changed route/proof/test files, twelve-artifact JSON parse, expanded
  upload matrix 40 files / 216 tests, `bunx tsc --noEmit --pretty false`, and
  `git diff --check`.

### Iteration 33 - Cleanup Job Retry/Audit Proof

- Added `src/lib/uploads/cleanup-job.ts`, a reusable cleanup executor that
  records `cleanup_queued` before storage deletion, refuses deletes when the
  queue audit event cannot be persisted, records `cleanup_failed` for failed
  attempts, records `cleanup_succeeded` after retry success, and keeps cleanup
  event metadata path-safe with storage path hashes.
- Added secret-gated `GET`/`POST /api/internal/upload-cleanup` as the
  scheduler-safe service-role route. It is `nodejs`, `force-dynamic`, accepts a
  bounded `limit`, fails closed without `UPLOAD_CLEANUP_JOB_SECRET`/`CRON_SECRET`
  or a matching bearer token, and returns only sanitized cleanup summaries.
- Upgraded `scripts/prove-upload-cleanup-provider-postgres.ts` so linked proof
  now includes a real temporary upload asset retry/audit lane. The forced first
  attempt records `cleanup_queued` + `cleanup_failed` and leaves the provider
  object present; the retry performs real Supabase Storage deletion, records
  `cleanup_succeeded`, verifies the object reads back missing, and reads back
  `cleanup_queued=2`, `cleanup_failed=1`, `cleanup_succeeded=1`,
  `rawStoragePathRecorded=false`.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-CLEANUP-JOB-RETRY-AUDIT-READBACK`; production remains blocked for
  hosted scheduled TTL invocation, real dashboard emission, quota alerts,
  production backpressure hooks, exercised retention runbook, scanner/CDR
  provider/queue/file scanning, hosted runtime evidence, and operational
  override UI/runbook.
- Fresh verification passed: linked cleanup proof with `failedChecks=[]` and
  `cleanupErrors=[]`; focused cleanup job/route/script matrix 3 files / 8 tests;
  scoped ESLint for the cleanup job/route/proof files.

### Iteration 34 - Cleanup Scheduler Config

- Added Vercel Cron source config in `vercel.json` for daily
  `/api/internal/upload-cleanup` invocation on five-field schedule `0 3 * * *`.
- Hardened cleanup route authorization to accept the Vercel-native
  `CRON_SECRET` bearer token even when the manual/internal
  `UPLOAD_CLEANUP_JOB_SECRET` fallback is also configured.
- Extended `scripts/check-vercel-env-readiness.ts` with a scheduled-jobs group
  requiring `CRON_SECRET`, so overall Vercel env readiness fails if the cron
  secret name is absent.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-CLEANUP-SCHEDULER-CONFIG-LOCAL`; production remains blocked for
  observed hosted cleanup invocation, real dashboard emission, quota alerts,
  production backpressure hooks, exercised retention runbook, scanner/CDR
  provider/queue/file scanning, hosted runtime evidence, and operational
  override UI/runbook.
- Fresh verification passed: focused cleanup cron config/route/env-readiness
  matrix 4 files / 12 tests; scoped ESLint for cron config route/readiness
  files; twelve-artifact JSON parse; `bunx tsc --noEmit --pretty false`.

### Iteration 35 - Upload Operational Telemetry Seam

- Added `src/lib/uploads/operational-telemetry.ts` as an injectable,
  non-blocking upload operations telemetry seam.
- `runUploadCleanupJob` now emits one path-safe cleanup run event with status,
  severity, retry-after guidance, cleanup counts, audit write failure count,
  failed bucket count, and alert codes. The internal cron route reaches the same
  emitter.
- `reserveUploadAdmission` now emits path-safe telemetry for actor/client
  request rate denials, actor quota denials, and workspace active-upload
  backpressure denials without client IPs or storage paths.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-OPERATIONAL-TELEMETRY-SEAM-LOCAL`; production remains blocked for
  observed hosted cleanup invocation, real dashboard emission, quota alert
  delivery, production backpressure hooks, exercised retention runbook,
  scanner/CDR provider/queue/file scanning, hosted runtime evidence, and
  operational override UI/runbook.
- Fresh verification passed: focused cleanup/admission telemetry matrix 3 files
  / 16 tests; scoped ESLint for the telemetry/cleanup/admission files and
  focused tests; release-gate regression 1 file / 2 tests; `bunx tsc --noEmit
  --pretty false`.

### Iteration 36 - Attachment Status UX

- Preserved upload response scan metadata in Add Component draft attachment
  state.
- Updated draft attachment rows to render non-color scan, review, and download
  status badges plus blocked-state copy. Approval/download actions remain
  unavailable unless scanner-clean and Library review/current approval exist.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-ATTACHMENT-STATUS-UX-LOCAL`; production scanner/download gates
  remain blocked for scanner/CDR provider execution, queue worker,
  provider-backed file scanning, operational override UI/runbook, and hosted
  production proof.
- Fresh verification passed: Add Component attachment status DOM test 1 file /
  7 tests; scoped ESLint for the Add Component modal and DOM test; release-gate
  regression 1 file / 2 tests.

### Iteration 37 - Upload Scan Job Runner Local Seam

- Added `src/lib/uploads/scan-job.ts` with a local scan-job runner seam that
  lists finalized pending/retryable component attachment upload assets,
  downloads through an injectable storage adapter, invokes an injected scanner
  provider, and records checksum-bound scan results through
  `record_upload_scan_result`.
- Storage and scanner exceptions now become path-safe `failed_transient`
  scanner outcomes with hashed failure messages, not raw provider paths or file
  details.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-SCAN-JOB-RUNNER-LOCAL`; production remains blocked for real
  scanner/CDR provider execution, deployed queue worker proof, provider-backed
  file scanning proof, and operational override UI/runbook.
- Fresh verification passed: scan job/scanner/release-gate matrix 3 files / 11
  tests; scoped ESLint for scan-job source/tests and release-gate test;
  twelve-artifact upload evidence JSON parse; `bunx tsc --noEmit --pretty
  false`.

### Iteration 38 - Upload Scan Override Route Local Seam

- Added `src/lib/uploads/scan-override.ts` and
  `POST /api/component-library/attachments/scan-override` as a thin
  platform-admin route over the existing service-role
  `approve_upload_scan_override` RPC.
- The route authenticates and checks `ceo`/`admin` role before parsing request
  JSON, validates the target asset id, expected SHA-256 checksum, documented
  reason, and future expiry, passes the actor id to the audited RPC, and returns
  generic failures without leaking asset ids or storage paths.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-SCAN-OVERRIDE-ROUTE-LOCAL`; production remains blocked for real
  scanner/CDR provider execution, deployed queue worker proof, provider-backed
  file scanning proof, and operator-facing override UI/runbook rehearsal.
- Fresh verification passed: scan override route test 1 file / 5 tests;
  scanner/override/release-gate matrix 4 files / 16 tests; scoped ESLint for
  override route/helper, scan job, and release-gate tests; twelve-artifact upload
  evidence JSON parse; `bunx tsc --noEmit --pretty false`.

### Iteration 39 - Upload Scan Operational Telemetry

- Extended `src/lib/uploads/operational-telemetry.ts` with
  `upload_scan_job_completed` telemetry for scan-job run status, result counts,
  failure counts, outcome counts, and alert codes.
- `runUploadScanJob` now emits one path-safe, non-blocking telemetry record per
  scan run. The telemetry carries no raw storage path, file path, or client IP.
- Updated `upload-release-gates.json` so
  `UPLOAD-GATE-OPERATIONAL-TELEMETRY-SEAM-LOCAL` covers cleanup, admission, and
  scan-job telemetry. Production remains blocked for real dashboard emission,
  quota alert delivery, production backpressure hooks, and retention runbook
  exercise.
- Fresh verification passed: scan telemetry/release-gate matrix 4 files / 19
  tests; scoped ESLint for operational telemetry, scan job, focused tests, and
  release-gate test; twelve-artifact upload evidence JSON parse; `bunx tsc
  --noEmit --pretty false`.

### Iteration 40 - Upload Operations Runbook Local Drill

- Added `scripts/prove-upload-operations-runbook-local.ts` to generate
  provider-free local evidence for the Orphan Cleanup Backlog and Scan Backlog
  operational paths.
- The script writes
  `evidence/upload-operations-runbook-local-proof.json` after simulating cleanup
  delete failure, blocked retry guidance, successful cleanup retry with
  `cleanup_queued=2`, `cleanup_failed=1`, `cleanup_succeeded=1`, one clean scan
  result, one `failed_transient` scan download failure, and path-safe
  cleanup/scan telemetry.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-OPERATIONS-RUNBOOK-DRILL-LOCAL`; production remains blocked for
  observed hosted cleanup invocation, real dashboard emission, quota alert
  delivery, production backpressure hooks, production retention runbook
  exercise, hosted runtime evidence, scanner/CDR provider execution, deployed
  queue worker, provider-backed file scanning, and operator-facing override
  UI/runbook rehearsal.
- Fresh verification passed: local operations runbook proof script; runbook
  proof tests 2 files / 4 tests; release-gate/runbook proof matrix 3 files / 6
  tests; final upload operations matrix 9 files / 37 tests; scoped ESLint for
  the upload operations proof/script/route/service/test files; thirteen-artifact
  upload evidence JSON parse; `bunx tsc --noEmit --pretty false`; `git diff
  --check`.

### Iteration 41 - Upload Scan Worker Route Local Source Proof

- Added `src/app/api/internal/upload-scan/route.ts` as a Node/dynamic,
  bearer-secret-gated internal scan worker route that accepts `CRON_SECRET` or
  `UPLOAD_SCAN_JOB_SECRET`.
- The route creates the service-role scan-job client, lists finalized
  pending/retryable component attachment assets, downloads bytes through the
  scan storage adapter, runs the local policy scanner, and writes
  checksum-bound scanner results through `record_upload_scan_result`.
- Added `src/lib/uploads/policy-scanner.ts` for local source-proof fixture
  classification: clean PDF/XLS/XLSX, EICAR infected, active-content
  unsupported, unsupported content type, and empty-file permanent failure. This
  is not real scanner/CDR production proof.
- Hardened the scan storage byte adapter for cross-realm `ArrayBufferView`
  downloads, source-configured `/api/internal/upload-scan` as a daily Vercel
  Cron job, and updated `upload-release-gates.json` with
  `UPLOAD-GATE-SCAN-WORKER-ROUTE-LOCAL`.
- Fresh verification passed: scan worker route/config/release-gate matrix 4
  files / 13 tests; scoped ESLint for the route, policy scanner, byte adapter,
  cron config, and focused tests; thirteen-artifact upload evidence JSON parse;
  `bunx tsc --noEmit --pretty false`; `git diff --check`.

### Iteration 42 - ClamD Scanner Provider Source Protocol

- Added `src/lib/uploads/clamd-scanner.ts` with opt-in
  `UPLOAD_SCAN_PROVIDER=clamd` scanner-provider selection for the internal scan
  worker.
- The provider implements ClamD INSTREAM TCP framing with `zINSTREAM`, 4-byte
  chunk lengths, a zero-length terminator, timeout handling, OK/infected,
  stream-limit, and unexpected-reply result mapping, and path-safe scanner
  metadata.
- Added fake-ClamD TCP tests for clean, EICAR `FOUND`, stream-limit, and
  configured-provider selection. The route still uses the local policy scanner
  unless the ClamD env selector is configured.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-CLAMD-SCANNER-PROVIDER-LOCAL`; production remains blocked for
  observed hosted scan worker invocation, live scanner/CDR service execution,
  provider-backed file scanning, and operator-facing override UI/runbook
  rehearsal.
- Fresh verification passed: ClamD scanner provider/release-gate matrix 5 files
  / 17 tests; scoped ESLint for ClamD provider, scan worker route, policy
  scanner, byte adapter, cron config, release gate, and focused tests;
  final focused scanner/operations matrix 12 files / 47 tests; thirteen-artifact
  upload evidence JSON parse; `bunx tsc --noEmit --pretty false`; `git diff
  --check`.

### Iteration 43 - Upload Scan Override Operator Surface

- Added the platform-admin `/workshop/settings/scan-overrides` review surface,
  backed by `readUploadScanOverrideReviewQueue`. The helper role-gates before
  constructing a service-role client and returns only review metadata, not raw
  storage paths.
- Added `UploadScanOverridePanel` to submit the existing checksum-bound scan
  override API contract with readonly expected SHA-256, operator reason, future
  expiry, and generic failure copy that does not echo asset ids or private
  paths.
- Updated Workshop Settings platform navigation to expose Scan overrides to
  admins, and updated component attachment download brokering to use the shared
  scan gate for clean or unexpired `override_approved` assets.
- Extended the local operations runbook proof with Scan Override Review
  rehearsal and updated `upload-release-gates.json` with
  `UPLOAD-GATE-SCAN-OVERRIDE-UI-RUNBOOK-LOCAL`.
- Fresh verification passed: local operations runbook script; focused scan
  override UI/runbook matrix 6 files / 22 tests; combined scan override/route
  release matrix 8 files / 29 tests; scoped ESLint; `bunx tsc --noEmit --pretty
  false`; upload release-gate/runbook JSON parse.

### Iteration 44 - Upload Operations Dashboard Query Local Proof

- Added `src/lib/uploads/operations-dashboard.ts` as a server-only
  platform-admin query artifact for upload operations metrics.
- The helper role-gates before creating a service-role client and aggregates
  upload outcomes, content-type counts, size buckets, scan queue backlog,
  blocked scan counts, scan provider counts, cleanup backlog, retention cutoffs,
  cleanup events, and download/override/backpressure/scan-failure event counts.
- The query selects only path-safe aggregate fields from `upload_assets`,
  `upload_sessions`, and `upload_events`: no storage paths, filenames, metadata,
  signed tokens, or provider object paths.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-OPERATIONS-DASHBOARD-QUERY-LOCAL`; production remains blocked for
  hosted dashboard emission and alert delivery.
- Fresh verification passed: upload operations dashboard query test 1 file / 4
  tests.

### Iteration 45 - Upload Scan Worker Provider Readback Proof

- Added `scripts/prove-upload-scan-worker-provider-postgres.ts` as an opt-in
  linked-provider scan worker proof guarded by
  `ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF=1` and the Archestimator Supabase
  project ref `ebxxqidacheyapmmzavr`.
- The proof seeds a temporary `component-attachments` object and pending
  finalized component-attachment upload asset, verifies
  `listUploadScanJobRecords` can see it, runs `runUploadScanJob` through real
  Supabase Storage byte download, policy scanner, and checksum-bound result
  writer, then reads back `scan_status=clean`, `scan_clean` event persistence,
  and path-safe scan telemetry.
- The evidence artifact redacts raw provider ids and storage paths
  (`rawStoragePathRecorded=false`, no UUIDs), and the script cleans up the
  temporary object/workspace/user fixture.
- Added proof script/evidence regression tests and updated
  `upload-release-gates.json` with
  `UPLOAD-GATE-SCAN-WORKER-PROVIDER-READBACK`; production remains blocked for
  observed hosted scan worker invocation and live scanner/CDR service execution.
- Fresh verification passed: linked-provider scan worker proof command; proof
  script/evidence tests 2 files / 6 tests; release/proof matrix 3 files / 8
  tests; scoped ESLint; upload release-gate and scan-worker proof JSON parse.

### Iteration 46 - Upload Operations Dashboard Settings Surface

- Added `UploadOperationsDashboardPanel` as a compact operator dashboard for the
  existing path-safe upload operations snapshot.
- Added `/workshop/settings/upload-operations` as a platform-admin page with a
  bounded window selector, generic unauthorized/error copy, and metrics for
  upload outcomes, scan queue/blocked counts/provider counts, cleanup backlog
  and events, download/override/backpressure counters, and audit retention.
- Updated the Workshop Settings platform rail to expose Upload operations
  alongside Scan overrides.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-OPERATIONS-DASHBOARD-SURFACE-LOCAL`; production remains blocked
  for observed hosted cleanup/scan worker invocation, real hosted dashboard
  emission, quota alert delivery, production backpressure hooks, production
  retention runbook exercise, hosted runtime proof, and live scanner/CDR service
  execution.
- Fresh verification passed: upload dashboard query/page/settings matrix 3 files
  / 11 tests; dashboard/release matrix 4 files / 13 tests; scoped ESLint; upload
  release-gate/scan-worker/runbook JSON parse.

### Iteration 47 - Upload Operational Alert Webhook Sink Local Proof

- Extended `operational-telemetry.ts` with an opt-in, non-blocking upload
  operations alert sink. Warning and critical telemetry can post sanitized JSON
  to an HTTPS webhook only when `UPLOAD_OPERATIONS_ALERTS_ENABLED=1`,
  `UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL`, and
  `UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN` are configured.
- The alert payload carries operational counts and routing hints for quota,
  backpressure, cleanup backlog, scan queue/failures, retry timing, event,
  severity, status, surface, workspace id, and alert codes, while omitting
  storage paths, filenames, tokens, client IPs, cleanup run ids, and scan run
  ids.
- Updated Vercel env readiness so upload alert webhook env names are tracked as
  their own readiness group without making general closed-beta/runtime readiness
  claim alert delivery.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-OPERATIONS-ALERT-WEBHOOK-SINK-LOCAL`; production remains blocked
  for observed hosted cleanup/scan worker invocation, real hosted dashboard
  emission, observed alert delivery, production backpressure hooks, production
  retention runbook exercise, hosted runtime proof, and live scanner/CDR service
  execution.
- Fresh verification passed: operational alert/admission/readiness matrix 3
  files / 16 tests; alert/admission/readiness/release matrix 4 files / 18 tests;
  scoped ESLint; upload release-gate and scan-worker proof JSON parse.

### Iteration 48 - Direct Upload Reserved-Session Backpressure Local Proof

- Added `readActiveUploadSessionCapacity` so upload routes can count existing
  unexpired reserved `upload_sessions` by workspace, actor, and surface.
- Updated the component attachment direct-upload route to check durable reserved
  session capacity before issuing signed single-part or TUS provider
  credentials. Actor and workspace caps return `429` with `Retry-After`, emit
  path-safe quota/backpressure telemetry, and stop before provider credential
  issuance or `create_upload_session`.
- Updated the local operations runbook proof wording so it no longer treats
  local runbook drills as hosted alert or hosted backpressure proof.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-DIRECT-UPLOAD-RESERVED-SESSION-BACKPRESSURE-LOCAL`; production
  remains blocked for observed hosted cleanup/scan worker invocation, real
  hosted dashboard emission, observed alert delivery, observed hosted
  backpressure exercise, production retention runbook exercise, hosted runtime
  proof, and live scanner/CDR service execution.
- Fresh verification passed: signed direct-session backpressure/admission matrix
  2 files / 16 tests; direct-session/release/runbook matrix 5 files / 22 tests;
  scoped ESLint; release-gate/runbook JSON parse; `bunx tsc --noEmit --pretty
  false`.

### Iteration 49 - Atomic Direct Upload Session Capacity Repair

- A reviewer found the reserved-session backpressure hook was still a
  check-then-create race under concurrent signed/direct-upload session creation.
- Added migration `20260627151000_upload_direct_session_atomic_capacity.sql` so
  service-role `create_upload_session` serializes component-attachment capacity
  checks with a workspace/surface advisory transaction lock, then counts and
  inserts the reserved session in that locked path.
- Kept the route precheck as a fast-fail for already-full actors/workspaces and
  mapped atomic RPC capacity rejections to the same `429`/`Retry-After`
  path-safe telemetry response.
- Updated release-gate evidence and regression tests to cover atomic
  create-session race-denial mapping. Production still needs observed hosted
  backpressure exercise plus hosted cleanup/scan/dashboard/alert/runtime proof.
- Applied `20260627151000_upload_direct_session_atomic_capacity.sql` to the
  linked Archestimator Supabase project. A post-apply
  `supabase db push --linked --dry-run` reported `Remote database is up to
  date`; a later `supabase migration list --linked` attempt hit Supabase
  temp-role auth/circuit-breaker retries, but Supabase connector read-only SQL
  confirmed `migration_recorded=true` and live `create_upload_session` function
  flags for `pg_advisory_xact_lock`, the `upload-session-capacity` namespace,
  actor/workspace cap checks, and actor/workspace capacity errors.
- Fresh verification passed: signed direct-session backpressure/admission matrix
  2 files / 18 tests; direct-session/release matrix 3 files / 20 tests; scoped
  ESLint; `bunx tsc --noEmit --pretty false`; release-gate JSON parse;
  `git diff --check`; linked migration apply; linked post-apply dry-run;
  Supabase connector read-only SQL.
- Added safe hosted upload operations dry-run proof surfaces:
  `/api/internal/upload-cleanup?dryRun=1` and `/api/internal/upload-scan?dryRun=1`
  remain bearer-secret gated, return no-store path-safe summaries, and avoid
  storage deletion, cleanup audit writes, storage downloads, scanner invocation,
  and scan-result writes. `scripts/verify-hosted-upload-operations.ts` can now
  collect hosted fail-closed proof and authenticated hosted dry-run proof without
  recording bearer secrets.
- Added and ran `scripts/prove-upload-session-capacity-provider-postgres.ts`
  against linked project `ebxxqidacheyapmmzavr`: 8 parallel same-actor
  `create_upload_session` calls admitted/read back exactly 3 reserved sessions
  with 5 `active_actor` rejections, and 8 parallel same-workspace/different-actor
  calls admitted/read back exactly 6 reserved sessions with 2 `active_workspace`
  rejections. `failedChecks=[]`, `cleanupErrors=[]`; evidence is
  `upload-session-capacity-provider-proof.json`.
- Fresh follow-up verification passed: focused upload dry-run/capacity/release
  matrix 8 files / 40 tests; scoped ESLint for touched routes/scripts/tests;
  `bunx tsc --noEmit --pretty false`; upload evidence JSON parse.

### Iteration 50 - Live ClamD Scanner Proof Harness

- Added `scripts/prove-upload-clamd-live.ts` as an explicit live scanner
  evidence path for `UPLOAD_SCAN_PROVIDER=clamd`.
- The script requires `ARCH_UPLOAD_CLAMD_LIVE_PROOF=1`, refuses non-ClamD
  scanner configuration, scans generated clean and EICAR fixtures through the
  existing ClamD INSTREAM provider, requires EICAR detection, and writes
  sanitized JSON without raw network targets or fixture filenames.
- Added `tests/vitest/upload-clamd-live-proof-script.test.ts` with a fake
  ClamD-compatible TCP service covering clean/EICAR pass behavior, EICAR
  non-detection failure, opt-in/refusal markers, and sanitization.
- Updated release-gate evidence with
  `UPLOAD-GATE-CLAMD-LIVE-PROOF-HARNESS-LOCAL` while keeping production blocked
  for observed hosted scan worker invocation and actual live scanner/CDR service
  execution. No live ClamD configuration was present in `.env.local`, so no live
  service proof was claimed.
- Fresh verification passed: live ClamD proof-script test 1 file / 3 tests;
  live-ClamD/release-gate matrix 2 files / 5 tests; scoped ESLint for the live
  proof harness and release-gate test; `bunx tsc --noEmit --pretty false`;
  upload evidence JSON parse; `git diff --check`.

### Iteration 51 - Hosted Upload Runtime Proof Harness

- Added secret-gated `/api/internal/upload-runtime` as a no-store, non-mutating
  hosted runtime proof route.
- The route accepts `UPLOAD_RUNTIME_PROOF_SECRET` or `CRON_SECRET`, fails closed
  before service-role creation when unconfigured/unauthorized/oversized, reports
  sanitized Node runtime/configured limit facts/memory snapshots, measures
  Supabase Storage bucket latency, and reads only bounded POST body probes
  without echoing bytes.
- Added `scripts/verify-hosted-upload-runtime.ts` to collect hosted fail-closed
  proof without secrets and authenticated runtime/body/concurrency probes with a
  scoped bearer secret. The script never records bearer secrets or uploaded
  bytes and only marks production proof ready when authenticated probes pass and
  configured limit facts are present.
- Updated release-gate evidence with
  `UPLOAD-GATE-HOSTED-RUNTIME-PROOF-HARNESS-LOCAL` while keeping production
  blocked until the route is deployed and hosted body-size, memory, duration,
  concurrency, and storage-latency observations are collected from the real
  runtime.
- Fresh verification passed: runtime route/verifier matrix 2 files / 10 tests;
  runtime/release-gate matrix 3 files / 12 tests; scoped ESLint for the runtime
  route, verifier, and release-gate test; `bunx tsc --noEmit --pretty false`;
  upload evidence JSON parse; `git diff --check`.

### Iteration 52 - Upload Production Proof Env Preflight

- Extended `scripts/check-vercel-env-readiness.ts` with separate hosted upload
  runtime proof and live ClamD scanner env groups.
- Preserved the existing `vercelEnvReady` meaning for the closed-beta runtime
  plus `CRON_SECRET`.
- Added `uploadProductionProofReady`, requiring `CRON_SECRET`, upload alert
  webhook env names, `UPLOAD_RUNTIME_PROOF_SECRET`, hosted runtime configured
  limit fact names, and `UPLOAD_SCAN_PROVIDER`/`UPLOAD_CLAMD_HOST`/
  `UPLOAD_CLAMD_PORT`.
- Updated release-gate evidence with
  `UPLOAD-GATE-PRODUCTION-PROOF-ENV-PREFLIGHT-LOCAL` without removing the
  production blockers for hosted cleanup/scan/runtime observations, alert
  delivery, dashboard/backpressure/runbook exercises, and live scanner/CDR
  proof.
- Fresh verification passed: focused env/cron/alert/release-gate matrix 4 files
  / 17 tests; scoped ESLint for the env readiness script and related tests;
  `bunx tsc --noEmit --pretty false`; upload evidence JSON parse; `git diff
  --check`.
- Result: hosted/live upload production proof now has an env-name readiness
  preflight. Production remains blocked because env-name readiness does not prove
  secret values, hosted route execution, alert delivery, dashboard observation,
  live scanner reachability, or production runtime behavior.

### Iteration 53 - Hosted No-Secret Proof Route Observation

- Ran read-only no-secret hosted probes against `https://www.archestimator.com`
  using the existing hosted upload proof scripts. No production mutation or
  deploy was performed.
- `scripts/verify-hosted-upload-runtime.ts` wrote
  `evidence/upload-hosted-runtime-fail-closed-proof.json` and exited 1 because
  `/api/internal/upload-runtime` returned `404` with public cache headers;
  `productionProofReady=false`.
- `scripts/verify-hosted-upload-operations.ts` wrote
  `evidence/upload-hosted-operations-fail-closed-proof.json` and
  `evidence/upload-hosted-operations-fail-closed-proof.md` and exited 1 because
  `/api/internal/upload-cleanup?limit=1&dryRun=1` and
  `/api/internal/upload-scan?limit=1&dryRun=1` returned `404` with public cache
  headers; `productionProofReady=false`.
- Updated `upload-release-gates.json` with a separate `hostedEvidence` section
  for the failed read-only hosted observations and updated production blocker
  wording to state that the hosted proof routes have not been observed deployed.
- Fresh verification passed: hosted verifier/release-gate matrix 3 files / 14
  tests; scoped ESLint for the hosted verifiers and release-gate test; `bunx tsc
  --noEmit --pretty false`; upload evidence JSON parse; `git diff --check`.
- Result: production remains blocked for deployed hosted cleanup/scan/runtime
  observations, alert delivery, dashboard/backpressure/runbook exercises, and
  live scanner/CDR proof.

### Iteration 54 - Production Evidence Bundle Checker

- Added `scripts/check-upload-production-proof-evidence.ts` as a fail-closed
  checker for the remaining hosted/live production evidence bundle.
- The checker requires seven evidence classes before
  `productionProofReady=true`: hosted cleanup/scan authenticated dry-run proof,
  hosted runtime authenticated body/concurrency/storage-latency proof, live
  ClamD scanner proof, observed hosted alert delivery, observed hosted dashboard
  metrics, observed hosted backpressure exercise, and production retention
  runbook exercise.
- Added `tests/vitest/upload-production-proof-evidence-checker.test.ts` to prove
  the checker fails closed against current evidence, passes only with a complete
  synthetic hosted/live bundle, rejects malformed/partial artifacts, and writes
  sanitized output.
- Ran the checker against current evidence:
  `OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-production-proof-evidence-check.json bun run scripts/check-upload-production-proof-evidence.ts`.
  It intentionally exited 1 with `productionProofReady=false`, `required=7`,
  `passed=0`, `failed=2`, `missing=5`, and `invalid=0`.
- Updated release gates with
  `UPLOAD-GATE-PRODUCTION-EVIDENCE-BUNDLE-CHECKER-LOCAL` without closing the
  production blockers.
- Fresh verification passed: production evidence checker/release-gate matrix 2
  files / 8 tests; scoped ESLint for the checker and release-gate tests; `bunx
  tsc --noEmit --pretty false`; targeted upload evidence JSON parse; `git diff
  --check`.
- Result: production readiness now has a bundle-level fail-closed guard, but
  production remains blocked until the missing hosted/live observations exist and
  pass the checker.

### Iteration 55 - Alert Delivery Production Proof Harness

- Added `scripts/verify-upload-alert-delivery.ts` as the fail-closed production
  alert-delivery proof harness for upload operations alerts.
- The harness sends no webhook unless explicit proof opt-in and hosted
  observation gates are satisfied. It requires
  `ARCH_UPLOAD_ALERT_DELIVERY_PROOF=1`, Vercel production context or
  `ARCH_UPLOAD_ALERT_DELIVERY_HOSTED_OBSERVED=1`, upload alert env config, HTTPS
  webhook URL, bearer token, and observed 2xx delivery before it can pass.
- Added `tests/vitest/upload-alert-delivery-proof-script.test.ts` to cover
  no-opt-in refusal, hosted-context refusal, passing 2xx delivery through the
  existing alert sink, non-2xx webhook rejection, and sanitized artifact writes.
- Generated current fail-closed artifact:
  `OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-alert-delivery-production-proof.json bun run scripts/verify-upload-alert-delivery.ts`.
  It intentionally exited 1 with `passed=false`,
  `proofBoundary=hosted-alert-delivery-proof-skipped`, `delivered=false`,
  secret and webhook URL redaction true, and payload path-safety unproven because
  no hosted delivery occurred.
- Regenerated `evidence/upload-production-proof-evidence-check.json`. It now
  intentionally exits 1 with `productionProofReady=false`, `required=7`,
  `passed=0`, `failed=3`, `missing=4`, and `invalid=0`. Failed artifacts are
  hosted operations, hosted runtime, and alert delivery; missing artifacts are
  live scanner, hosted dashboard, hosted backpressure, and retention runbook.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-ALERT-DELIVERY-PROOF-HARNESS-LOCAL` while preserving
  `production.status=blocked`.
- Fresh verification passed: alert proof/checker/release-gate matrix 3 files /
  13 tests; scoped ESLint for the alert proof script/checker/tests; `bunx tsc
  --noEmit --pretty false`; targeted upload evidence JSON parse; `git diff
  --check`.
- Result: alert delivery now has a deterministic, secret-safe production proof
  path. Production remains blocked until a real hosted 2xx alert delivery is
  observed and the bundle checker receives all remaining hosted/live artifacts.

### Iteration 56 - Live ClamD Fail-Closed Artifact

- Ran the existing live ClamD proof harness without production opt-in:
  `bun run scripts/prove-upload-clamd-live.ts`.
- The harness did not contact a scanner and wrote
  `evidence/upload-clamd-live-proof.json` with `passed=false`, `skipped=true`,
  `proofBoundary=live-clamd-proof-skipped`, and reason
  `ARCH_UPLOAD_CLAMD_LIVE_PROOF is not set to 1`.
- Regenerated `evidence/upload-production-proof-evidence-check.json`. It now
  intentionally exits 1 with `productionProofReady=false`, `required=7`,
  `passed=0`, `failed=4`, `missing=3`, and `invalid=0`. Failed artifacts are
  hosted operations, hosted runtime, live ClamD, and alert delivery; missing
  artifacts are hosted dashboard, hosted backpressure, and retention runbook.
- Updated `evidence/upload-release-gates.json` and release-gate tests to treat
  live scanner proof as failed/skipped rather than missing.
- Result: the live scanner production gate has a current fail-closed artifact,
  but production remains blocked until the harness runs with explicit opt-in
  against the configured live ClamD/CDR service and observes clean plus EICAR
  scan outcomes.

### Iteration 57 - Production Observation Proof Harnesses

- Added `scripts/verify-upload-production-observations.ts` as a fail-closed
  serializer/validator for sanitized operator observations covering hosted
  dashboard, hosted backpressure, and production retention runbook evidence.
- The harness requires `ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_PROOF=1` and a
  sanitized observation input file before any artifact can pass. It rejects
  observation string values containing URLs, storage paths, filenames, provider
  paths, signed URLs, bearer/access tokens, or Supabase Storage URLs.
- Added `tests/vitest/upload-production-observations-proof-script.test.ts` to
  cover default skipped artifacts, complete path-safe hosted observations,
  unsafe path rejection without echoing raw paths, and writing all three
  checker-compatible artifacts.
- Ran `bun run scripts/verify-upload-production-observations.ts`; it
  intentionally exited 1 and wrote skipped fail-closed artifacts:
  `upload-dashboard-production-proof.json`,
  `upload-backpressure-production-proof.json`, and
  `upload-retention-runbook-production-proof.json`.
- Regenerated `evidence/upload-production-proof-evidence-check.json`. It now
  intentionally exits 1 with `productionProofReady=false`, `required=7`,
  `passed=0`, `failed=7`, `missing=0`, and `invalid=0`.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-PRODUCTION-OBSERVATION-PROOF-HARNESSES-LOCAL` and kept
  `production.status=blocked`.
- Fresh verification passed: alert/observation/checker/release-gate matrix 4
  files / 17 tests.
- Result: every required production proof slot now has a current artifact, and
  every artifact fails closed until real hosted/live evidence is collected.

### Iteration 58 - Production Observation Operator Template

- Added `UPLOAD_PRODUCTION_OBSERVATIONS_RUNBOOK.md` to document the hosted
  dashboard, hosted backpressure, and production retention-runbook observation
  workflow for `scripts/verify-upload-production-observations.ts`.
- Added
  `evidence/upload-production-observations-input.template.json` as the
  machine-parseable sanitized input template. The template contains only
  boolean/null status fields and no URLs, storage paths, filenames, provider
  paths, signed URLs, bearer/access tokens, or customer/project data.
- Extended `tests/vitest/upload-production-observations-proof-script.test.ts`
  so the template is parsed from disk, remains fail-closed until filled, and a
  filled path-safe copy satisfies the hosted observation harness contract.
- Updated `evidence/upload-release-gates.json` and release-gate tests with
  `UPLOAD-GATE-PRODUCTION-OBSERVATION-RUNBOOK-TEMPLATE-LOCAL`, while keeping
  `production.status=blocked`.
- Fresh verification passed: alert/observation/checker/release-gate matrix 4
  files / 18 tests, scoped ESLint, targeted upload evidence JSON parse
  including the template, `bunx tsc --noEmit --pretty false`, and
  `git diff --check`.
- Result: future hosted observation capture now has a durable sanitized input
  contract, but no new hosted/live production proof was claimed.

## Proof Boundary

Current evidence is `local-plus-linked-provider-operation-proof`. Linked
provider readback/dry-run proves upload migration presence, catalog shape,
migration ledger parity, aggregate component-image reference counts, and the
`component-images` bucket catalog/policy privacy state. Direct storage operation
proof is separately captured in `upload-storage-denial-proof.json` for anon/auth
insert, update, download, and delete attempts on the three upload buckets.
Cleanup execution proof is separately captured in
`upload-cleanup-provider-proof.json` for planner-approved temporary object
cleanup and service-role before/after readback plus persisted cleanup retry/audit
events against a real temporary upload asset (`cleanup_queued=2`,
`cleanup_failed=1`, `cleanup_succeeded=1`, no raw storage path recorded).
Scanner RPC state/readback proof is separately captured in
`upload-scan-rpc-provider-proof.json` for temporary upload asset rows. Supabase
signed single-part proof is separately captured in
`upload-signed-provider-proof.json` for signed URL issuance, token-only upload,
object metadata readback, and upload asset finalization. Signed app-route
session/finalization proof is separately captured in
`upload-signed-route-provider-proof.json`. Browser/client signed-direct
transport proof is captured in
`tests/vitest/upload-component-attachment-client.test.ts` and release-gate
evidence. Supabase signed TUS resumable provider/session proof is separately
captured in `upload-tus-provider-proof.json`. Provider-backed clean attachment
download proof is separately captured in
`upload-clean-download-provider-proof.json`. Provider-backed scan-worker storage
download/readback proof is separately captured in
`upload-scan-worker-provider-proof.json`. This still does not prove auth-token
RLS/RPC scenarios, full browser/mobile proof beyond focused client transport
tests, manual screen-reader proof, hosted runtime proof, observed hosted cleanup
invocation, real dashboard/alert/backpressure/runbook proof, scanner/CDR worker
execution, observed hosted scan worker invocation, or production proof. The
local operations runbook drill is captured separately in
`upload-operations-runbook-local-proof.json` and does not prove hosted cron,
real dashboards/alerts, observed hosted backpressure exercise, scanner/CDR
execution, or hosted scan worker execution. The operator scan override settings page and
runbook rehearsal prove only local source/DOM/API-contract behavior, not a
hosted production override operation. The upload operations dashboard query
proves only a local path-safe query artifact, and the upload operations settings
page proves only local source/DOM rendering of that snapshot, not hosted
dashboard emission or alert delivery. The upload operations alert webhook sink
proves only local source/unit behavior for sanitized, opt-in, non-blocking
webhook delivery and Vercel env-name readiness coverage; it does not prove a
hosted webhook endpoint, provider delivery, alert routing ownership, paging
policy, or production incident response. The alert delivery proof harness and
current `upload-alert-delivery-production-proof.json` artifact prove only that a
secret-safe hosted alert-delivery evidence path exists and fails closed locally;
the current artifact is not observed alert delivery and does not prove a hosted
2xx webhook delivery, alert routing ownership, paging policy, or production
incident response. The direct-upload reserved-session backpressure hook proves
local route/source behavior, local migration-contract
coverage, linked provider migration application, and linked provider concurrent
`create_upload_session` capacity enforcement; it does not prove hosted
concurrent traffic behavior, provider edge throttling, production traffic shape,
or observed alert/dashboard delivery for a live backpressure event. The hosted
upload operations dry-run harness proves only local/source/test readiness for
safe hosted cleanup/scan invocation probes; it does not prove hosted cron
execution, scanner/CDR execution, alert delivery, dashboard observation, hosted
backpressure, retention runbook completion, or hosted runtime limits. The
secret-gated upload runtime route and
`scripts/verify-hosted-upload-runtime.ts` prove only local/source/test readiness
for collecting hosted runtime observations; they do not prove hosted body-size,
memory, duration, concurrency, or storage-latency behavior until run against a
deployed runtime with scoped secrets and configured limit facts. The upload
production env-name preflight proves only sanitized Vercel transcript readiness
for the needed cron, alert, hosted runtime proof, and live ClamD scanner variable
names; it does not prove secret values, hosted route execution, alert delivery,
live scanner reachability, dashboard observation, or production runtime
behavior. The read-only hosted no-secret probes prove only that the current
public deployment returned 404 for the internal proof routes at probe time; they
do not prove fail-closed route behavior, authenticated dry-run behavior,
scheduler invocation, scanner/CDR execution, alert delivery, dashboard
observation, backpressure traffic, or runtime limits. The production evidence
bundle checker proves only that hosted/live proof artifacts are validated
together and fail closed when incomplete; its current failing report is not
production proof and does not replace any hosted/live observation. The
production observation proof harness proves only that sanitized operator
observations can be serialized into dashboard, backpressure, and retention
runbook evidence artifacts and fail closed by default; the current skipped
artifacts are not hosted observations and do not prove dashboard metrics,
backpressure traffic, hosted cron, cleanup retry behavior, or alert observation.
The local policy scanner
and `/api/internal/upload-scan` source route prove only the in-process worker
seam, not hosted worker invocation or real scanner/CDR engine execution. The
provider-backed scan-worker proof proves the Supabase Storage byte-download and
readback path only. The ClamD source provider proves protocol handling against a
fake daemon only, and `scripts/prove-upload-clamd-live.ts` proves only that a
sanitized live-service proof path exists until it is run with
`ARCH_UPLOAD_CLAMD_LIVE_PROOF=1` against the configured ClamD service; neither
source proof nor harness proof proves a live scanner service, scanner
signatures, provider network reachability, or real file scanning in production by
itself.
Closed-beta and platform upload gates are ready; production remains blocked
until its provider/runtime work is implemented and verified. Current expanded
upload matrix and broad typecheck are green as of the last full matrix recorded
above; the Supabase dry-run still lists unrelated shared-worktree migration
`20260627123000_signed_quantity_and_row_adjustments.sql`.
