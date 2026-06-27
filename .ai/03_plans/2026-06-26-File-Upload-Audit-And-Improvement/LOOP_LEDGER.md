# Loop Ledger

## Goal

Implement the approved File Upload Audit And Improvement plan in-place on `main`
without creating a new branch, while coordinating with other active agents and
preserving unrelated work.

Intended outcome: Archestimator's current upload surfaces become safe enough for
closed-beta first users, then move through the staged broker, data, UX,
scan/download, cleanup, observability, and provider-portability phases defined in
`11_IMPLEMENTATION_PLAN.md`.

## Scope

- Project cover image upload, private render, replacement, and delete.
- Component/library image upload, render, replacement, and delete.
- Estimate-row project-component `Reference image` modal upload, row snapshot
  update, and project-component projection render.
- Component PDF/XLS/XLSX attachment upload, approval/download/use gating,
  cleanup, and future scan/download lifecycle.
- Upload policy registry, object keys, validators, storage-provider adapter,
  upload-domain records, route compatibility, shared upload UX, observability,
  rate/active-upload caps, and proof artifacts.

## Non-goals

- No new branch, worktree, force checkout, reset, clean, force push, or unrelated
  formatting.
- No production deploy.
- No paid provider add-ons.
- No unrelated provider projects; Supabase/Postgres scope is only project
  `ebxxqidacheyapmmzavr`.
- No weakening tenant isolation, scan gates, or direct-storage containment to
  make tests pass.

## Branch / Status

- Branch: `main`
- Start commit: `9019d2809a42ced36b88eaf8ab095434a0936f2d`
- Start dirty status: clean (`git status --short --branch` showed
  `## main...origin/main`)
- Current phase: `EXECUTE -> VERIFY` partial; release gates remain blocked where
  provider/scanner/privacy/finality proof is absent.
- Proof boundary: `local-only`; provider-backed storage proof is explicitly
  skipped/blocking until configured.

## Source of Truth Read

- `AGENTS.md` instructions supplied in the active prompt.
- `.ai/10_state/current-state.md` fast path.
- Full plan pack under
  `.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/`.
- `.ai/08_prompts/000_Planning Prompts/Executing-Plan-Prompt.md`.
- `/Users/philiplewis/.codex/attachments/b1fb5c2e-ba11-47e3-af6e-f1e47910b5d3/pasted-text-1.txt`.
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`.
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.
- `package.json`.
- Invoked skill docs: `ultragoal`, `ultraqa`, `ultrawork`,
  `autopilot`, `executing-plans`, `using-superpowers`,
  `subagent-driven-development`, `requesting-code-review`, and
  `verification-before-completion`.

## Acceptance Criteria

- Every requirement in `04_REQUIREMENTS_SPECIFICATION.md` maps to implemented
  code, tests, migrations, docs/runbooks, provider evidence, or an explicit
  externally blocked release gate without weakening the requirement.
- Phase 0 exit evidence is satisfied before proceeding past direct-storage
  bypass containment.
- P0 authz, malicious-file, direct-storage denial, attachment scan/use freeze,
  runtime profile, smoke benchmark, rate/active-upload caps, and estimate-row
  image coverage are in place.
- Broker contracts, provider adapter, upload-domain records/RLS, dual-write,
  route compatibility, shared UX, scanner/download gates, cleanup, observability,
  and provider/performance proof are implemented in plan order.
- Targeted route/unit/DOM/DB/provider/performance/security tests pass, with
  local/provider/browser/manual proof boundaries labeled honestly.
- Independent review, simplification, and adversarial QA gates are clean before
  any completion claim.
- Completed planning folder is archived under `.ai/09_archive` only after the
  full implementation and verification gates pass.

## Validation Plan

- Focused upload route contract and malicious fixture Vitest suites.
- Focused authz denial and estimate-row image modal/update/projection tests.
- Storage policy migration/static checks plus provider-backed denial proof when
  environment allows it.
- Upload-domain migration/RLS/grant tests and scoped SQL checks.
- DOM/a11y tests for shared upload state and attachment blocked states.
- Runtime profile and Sharp/upload smoke benchmark artifacts.
- Targeted type-check/lint on changed files, then broader checks where blast
  radius justifies them.
- Code review, code-simplifier pass, and UltraQA scenario matrix before final.

## Coordination Ledger

| Lane | Agent / role | Goal | Owned scope | Dependencies | Status |
|---|---|---|---|---|---|
| Lead | Codex orchestrator | Integrate the full plan, serialize shared edits, own final verification. | All shared source integration, ledgers, final claim. | Specialist lanes and current worktree. | Active |
| L1 | `explore` | Map current upload routes, auth helpers, storage clients, and route test seams. | Read-only: `src/app/api/**/images`, `attachments`, auth/session helpers. | None. | Completed |
| L2 | `test-engineer` | Map existing tests and recommend Phase 0 target test files/fixtures. | Read-only: `tests/vitest`, route test patterns, fixtures. | L1 route facts helpful but not blocking. | Completed |
| L3 | `architect` | Assess upload broker/data-model phase boundaries and migration sequencing. | Read-only: plan docs, migrations, repository/domain action patterns. | None. | Completed |
| L4 | `designer` | Map project/component/estimate-row upload UI states and lowest-risk DOM coverage. | Read-only: upload UI components and existing DOM tests. | None. | Completed |
| L5 | `ce-security-reviewer` | Identify P0 security gaps in current route/storage policy state. | Read-only: upload routes, migrations, RLS/storage policies. | None. | Completed |
| L6 | `verifier` | Build requirement-by-requirement completion checklist and evidence matrix. | Read-only: plan pack plus current repo evidence. | All lane findings eventually. | Completed |

## Iteration Log

### Iteration 1

- Hypothesis: The plan can be executed safely in-place by first satisfying the
  Phase 0 gate and using read-only parallel lanes to avoid write conflicts.
- Action: Loaded source-of-truth docs, active prompt artifacts, skills, package
  scripts, and worktree status; created this ledger.
- Files changed: `LOOP_LEDGER.md` and run log only.
- Evidence: `git status --short --branch` was clean on `main` before ledger
  creation.
- Result: Discovery/coordination started.
- Next decision: Dispatch read-only lanes, inspect current upload source/tests,
  then implement the smallest coherent Phase 0 test/authz slice.

### Iteration 2

- Hypothesis: Immediate closed-beta risk is concentrated in service-role route
  authz, broad storage direct-write policies, missing scan gates, and upload
  resource abuse.
- Action: Completed read-only lane synthesis; implemented app-layer authz before
  route body/storage work for project images, component images, and component
  attachments; added direct storage containment and scan-freeze migrations; added
  in-process upload rate/active caps.
- Files changed: upload routes, upload admission-control module, Phase 0
  migrations, targeted route/storage/scan tests.
- Evidence: upload route/authz, direct-storage, scan-freeze, lifecycle, and
  abuse-cap Vitest suites passed in focused runs.
- Result: Phase 0 backend containment is locally covered, with provider proof
  still explicitly blocked.

### Iteration 3

- Hypothesis: Broker/domain foundation can be introduced without breaking current
  route response shapes by dual-writing asset records after successful storage
  upload.
- Action: Added upload policy registry, provider-neutral object keys, Supabase
  storage adapter, upload asset/session/event recorder, and upload-domain
  migration with RLS/revokes plus a scoped descriptor RPC. Existing upload routes
  now preserve legacy fields while returning `uploadSessionId`, `assetId`, and
  `scanStatus`.
- Files changed: `src/lib/uploads/*`, upload routes, upload-domain migration,
  upload-domain contract tests.
- Evidence: upload-domain tests passed; route compatibility tests continued to
  pass in the upload-focused suite.
- Result: Phase 1 foundation and partial Phase 2 dual-write are locally covered.

### Iteration 4

- Hypothesis: Provider and runtime proof must be executable evidence artifacts,
  but should fail honest/local-only when required provider credentials are not
  configured.
- Action: Added env-gated Supabase storage denial proof script and local
  Sharp/upload smoke benchmark script; captured local evidence artifacts under
  this plan's `evidence/` directory.
- Files changed: `scripts/prove-upload-storage-denial-postgres.mjs`,
  `scripts/measure-upload-smoke-benchmark.mjs`, evidence JSON files, script
  contract tests.
- Evidence: `node scripts/prove-upload-storage-denial-postgres.mjs` exited 0
  with `provider-proof-skipped`; `node scripts/measure-upload-smoke-benchmark.mjs`
  exited 0 with `passedLocalSmoke: true`.
- Result: Runtime/local smoke evidence exists; provider-backed storage denial and
  hosted runtime proof remain release blockers.

### Iteration 5

- Hypothesis: Phase 4 can start safely on a narrow, current caller by extracting
  shared client upload state/transport and wiring cancellable/retryable behavior
  into the estimate-row reference image modal.
- Action: Added shared client upload state machine and fetch transport with
  timeout/abort handling; updated the estimate reference image modal to use
  selected/uploading/cancelled/retryable-error states, abort in-flight uploads,
  and retry the selected file; added a release-gate evidence artifact that
  distinguishes closed-beta, production, and platform blockers.
- Files changed: `src/lib/uploads/client-state.ts`,
  `src/lib/uploads/client-upload.ts`, `src/components/workshop/estimate-sheet/rows/cells.tsx`,
  `tests/vitest/upload-client-state.test.ts`,
  `tests/vitest/estimate-component-drag.test.tsx`,
  `tests/vitest/upload-release-gates.test.ts`, and
  `evidence/upload-release-gates.json`.
- Evidence:
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts --maxWorkers=1` passed 12 files / 77 tests.
  - `bunx eslint src/lib/uploads/client-state.ts src/lib/uploads/client-upload.ts src/components/workshop/estimate-sheet/rows/cells.tsx tests/vitest/upload-client-state.test.ts tests/vitest/estimate-component-drag.test.tsx` exited 0.
  - `git diff --check -- <upload/client touched paths>` exited 0.
  - `bunx tsc --noEmit --pretty false` failed on an unrelated dirty estimate-row table prop mismatch in `src/components/workshop/estimate-sheet/rows/branch.tsx`.
- Result: First shared UX slice is locally covered; overall plan remains
  incomplete and blocked by the release gates recorded in
  `evidence/upload-release-gates.json`.

### Iteration 6

- Hypothesis: Reviewer-identified blockers can be closed locally by tightening
  storage containment, making upload records atomic, preserving estimate editor
  upload rights through an estimate-scoped route, and isolating stale upload
  attempts in the client.
- Action: Dropped direct project-image write/update/delete policies and pending
  component-attachment direct-read policy; extended provider proof coverage;
  added actor-only upload rate limiting; moved upload record persistence behind
  `record_upload_asset` RPC with DB constraints and session/asset consistency
  trigger; added `/api/estimate-row-images` with project/estimate edit checks;
  threaded project/estimate ids through row UI; added stale abort isolation and
  attachment cleanup on record failure.
- Files changed: upload containment/domain migrations, upload admission/recording
  modules, upload proof script, new estimate-row image route, estimate row image
  modal and prop pass-through, route/security/domain/storage/UX/release tests,
  and release-gate evidence.
- Evidence:
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts --maxWorkers=1` passed 12 files / 87 tests.
  - `bunx eslint src/lib/uploads/admission-control.ts src/lib/uploads/upload-records.ts src/app/api/estimate-row-images/route.ts src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/estimate-sheet/rows/row-table.tsx tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/upload-release-gates.test.ts` exited 0.
  - `node scripts/prove-upload-storage-denial-postgres.mjs` exited 0 with
    `provider-proof-skipped`, covering `project-images`, `component-images`, and
    `component-attachments` in the skipped report.
  - `node scripts/measure-upload-smoke-benchmark.mjs` exited 0 with
    `passedLocalSmoke: true`.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `git diff --check -- <upload touched paths>` exited 0.
- Result: All integrated reviewer blockers are locally covered. The full upload
  plan still remains incomplete because provider-applied proof, canonical asset
  finality, component image privacy decision/backfill, scanner/download broker,
  cleanup/observability, hosted runtime proof, and provider portability are
  still blocked in `evidence/upload-release-gates.json`.

### Iteration 7

- Hypothesis: The estimate-row asset-finality blocker can be closed locally by
  carrying brokered asset descriptors through the row edit path and validating
  them server-side before the history RPC persists `sourceSnapshot`.
- Action: Made `/api/estimate-row-images` require a concrete row, record the
  upload asset against that row, and return an `imageAsset` descriptor; threaded
  `imageAsset` through the reference-image editor, row diffing, and row update
  handler; added `validate_estimate_row_image_asset` as a row/project/actor-bound
  security-definer RPC; canonicalized descriptors in `updateEstimateRowItem`
  before `update_estimate_row_item_with_history`; rejected tampered descriptors;
  and carried descriptors through project-component projection metadata.
- Files changed: estimate-row image route, estimate row editor/diff/update
  handler, estimate actions, project-component projection, upload-domain
  migration, focused upload/finality tests, and release-gate evidence.
- Evidence:
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` passed 13 files / 101 tests.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 1 file / 2 tests after the release-gate artifact update.
  - Scoped finality lint exited 0 with no errors; `project-component-projection`
    still reports pre-existing unused helper warnings.
  - `git diff --check -- <upload/finality touched paths>` exited 0.
  - `bunx tsc --noEmit --pretty false` exited 2 on unrelated untracked
    `src/hooks/use-estimate-row-update-broadcast.ts` (`candidate.rowRevision`
    possibly undefined).
- Result: `UPLOAD-GATE-ESTIMATE-ROW-ASSET-FINALITY` is now a local pass in the
  release-gate artifact. The full plan remains incomplete because provider
  storage proof, upload-domain applied proof, component image privacy/backfill,
  scanner/download broker, cleanup/observability, hosted runtime proof, and
  provider portability remain blocked or unimplemented.

### Iteration 8

- Hypothesis: The upload-domain applied-proof blocker can be narrowed by adding
  an env-gated provider proof script that future release runs can execute with
  scoped Supabase credentials.
- Action: Added `scripts/prove-upload-domain-rls-postgres.mjs`, which skips by
  default unless `ARCH_UPLOAD_DOMAIN_RLS_PROOF=1`, writes
  `evidence/upload-domain-rls-proof.json`, and when enabled checks direct table
  select denial for anon/authenticated roles, authenticated denial for
  `record_upload_asset`, anon denial for descriptor RPCs, authenticated own-asset
  descriptor reads, row-bound `validate_estimate_row_image_asset`, wrong-row
  null behavior, and service-role cleanup.
- Files changed: new provider proof script, new script contract test,
  release-gate evidence, and release-gate test.
- Evidence:
  - `node scripts/prove-upload-domain-rls-postgres.mjs` exited 0 with
    `provider-proof-skipped` because `ARCH_UPLOAD_DOMAIN_RLS_PROOF` is not set.
  - `bunx vitest run tests/vitest/upload-domain-proof-script.test.ts --maxWorkers=1`
    passed 1 file / 1 test.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` passed 14 files / 102 tests.
  - `node --check scripts/prove-upload-domain-rls-postgres.mjs` exited 0.
  - `bunx eslint scripts/prove-upload-domain-rls-postgres.mjs tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-release-gates.test.ts` exited 0.
  - `git diff --check -- <upload-domain proof touched paths>` exited 0.
- Result: The proof harness for `UPLOAD-GATE-UPLOAD-DOMAIN-APPLIED-PROOF` now
  exists, but the release gate remains blocked until run against the linked
  provider with scoped proof credentials.

### Iteration 9

- Hypothesis: The component-image privacy blocker can be reduced locally by
  moving new brokered component-image upload responses off Supabase public URLs
  and onto an authenticated workspace resolver.
- Action: Added `GET /api/component-library/images?path=...` as a private
  workspace-gated image resolver with safe `.webp` path parsing, no-store
  fail-closed errors, private immutable success caching, `nosniff`, and service
  role storage download. Switched component-library image uploads and
  estimate-row image uploads to return resolver URLs instead of
  `getPublicUrl(path)`.
- Files changed: component-library image route, estimate-row image route,
  auth-boundary route tests, release-gate evidence, and release-gate test.
- Evidence:
  - `bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts --maxWorkers=1`
    passed 1 file / 31 tests.
  - `bunx eslint src/app/api/component-library/images/route.ts src/app/api/estimate-row-images/route.ts tests/vitest/auth-sensitive-api-boundaries.test.ts`
    exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` passed 14 files / 104 tests.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 1 file / 2 tests after release-gate artifact count update.
  - `git diff --check -- <component-image resolver touched paths>` exited 0.
- Result: New brokered component-image uploads no longer return provider public
  URLs. `UPLOAD-GATE-COMPONENT-IMAGE-PRIVACY-DECISION` remains blocked because
  the bucket is still public for legacy objects, legacy persisted URLs and
  publication snapshots need backfill/decision proof, and provider read-denial
  proof is not captured.

### Iteration 10

- Hypothesis: The attachment scanner/download blocker can be reduced locally by
  adding an attachment download broker that exists but refuses downloads until a
  matching upload-domain asset is finalized and scan-clean.
- Action: Added `GET /api/component-library/attachments?id=...` with UUID
  validation, workspace/library-manager authorization, attachment row lookup,
  matching `upload_assets` scan-clean/finalized verification, no-store
  fail-closed responses, `download_url_issued` audit insertion before storage
  download, safe download headers, and storage download only after all checks
  pass.
- Files changed: component-library attachment route, auth-boundary tests,
  scan-freeze test, release-gate evidence, and release-gate test.
- Evidence:
  - `bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts --maxWorkers=1`
    passed 2 files / 36 tests.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts --maxWorkers=1`
    passed 3 files / 38 tests.
  - `bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts --maxWorkers=1`
    passed 1 file / 34 tests.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 14 files / 107 tests.
  - `bunx eslint src/app/api/component-library/attachments/route.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `git diff --check -- <attachment broker touched paths>` exited 0.
- Result: `UPLOAD-GATE-ATTACHMENT-DOWNLOAD-BROKER-FAIL-CLOSED` is now a local
  pass. Production scanner remains blocked until scanner/CDR strategy, scan
  queue, clean-state transitions, provider-backed clean download proof, and
  override workflow exist.

### Iteration 11

- Hypothesis: The cleanup/observability blocker can be reduced locally by
  extracting a conservative upload cleanup planning core that future scheduled
  jobs can call without risking finalized assets.
- Action: Added `src/lib/uploads/cleanup.ts` with upload cleanup target planning
  for failed/deleted/expired records and expired reserved sessions only; unsafe
  bucket/surface/path/workspace shapes and finalized assets are rejected;
  thumbnail cleanup targets are deduped; cleanup summaries emit candidate,
  removed, failed, rejected, and failed-bucket counts without provider secrets.
- Files changed: upload cleanup helper, cleanup unit test, release-gate
  evidence, and release-gate test.
- Evidence:
  - `bunx vitest run tests/vitest/upload-cleanup.test.ts --maxWorkers=1`
    passed 1 file / 4 tests.
  - `bunx eslint src/lib/uploads/cleanup.ts tests/vitest/upload-cleanup.test.ts`
    exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 1 file / 2 tests.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 15 files / 111 tests.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `git diff --check -- <upload cleanup/broker touched paths>` exited 0.
- Result: `UPLOAD-GATE-UPLOAD-CLEANUP-CORE-LOCAL` is now local evidence.
  Production cleanup/observability remains blocked until durable scheduled
  cleanup, provider-backed retry/audit execution, retention/runbook policy,
  dashboard emission, quota alerts, and scanner backpressure exist.

### Iteration 12

- Hypothesis: The platform provider-portability blocker can be reduced locally
  by broadening the upload storage provider contract beyond write/delete into
  provider-neutral read and signed-read behavior.
- Action: Expanded `UploadStorageProvider` with `downloadObject` and
  `createSignedReadUrl`, implemented the Supabase adapter mappings, and added a
  fake in-memory provider contract test that exercises upload, signed read,
  download, remove, and fail-closed missing-object behavior.
- Files changed: upload storage provider module, provider contract test,
  release-gate evidence, and release-gate test.
- Evidence:
  - `bunx vitest run tests/vitest/upload-storage-provider.test.ts --maxWorkers=1`
    passed 1 file / 3 tests.
  - `bunx eslint src/lib/uploads/storage-provider.ts tests/vitest/upload-storage-provider.test.ts`
    exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 1 file / 2 tests.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 16 files / 114 tests.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `git diff --check -- <provider adapter/cleanup touched paths>` exited 0.
- Result: `UPLOAD-GATE-PROVIDER-ADAPTER-READ-PARITY-LOCAL` is now local platform
  evidence. Platform completion remains blocked until signed/resumable upload
  session semantics, S3-like multipart parity tests, and migration dry-run
  against asset descriptors exist.

### Iteration 13

- Hypothesis: The scanner blocker can be reduced locally by adding the explicit
  fail-closed scan-status taxonomy required by the plan before any scanner or
  override workflow is enabled.
- Action: Added an additive migration for `failed_transient`,
  `failed_permanent`, and `override_approved` upload scan statuses, and locked
  the taxonomy in the upload-domain contract test. The attachment download
  broker still only allows `scan_status = clean`.
- Files changed: scan-status taxonomy migration, upload-domain contract test,
  release-gate evidence, and release-gate test.
- Evidence:
  - `bunx vitest run tests/vitest/upload-domain-contracts.test.ts --maxWorkers=1`
    passed 1 file / 9 tests.
  - `bunx eslint tests/vitest/upload-domain-contracts.test.ts` exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 1 file / 2 tests.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 16 files / 115 tests.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `git diff --check -- <scan taxonomy/provider touched paths>` exited 0.
- Result: `UPLOAD-GATE-SCAN-STATUS-TAXONOMY-LOCAL` is now local evidence.
  Production scanner remains blocked until scanner/CDR strategy, scan queue,
  actual clean/failure transitions, provider-backed clean download proof, and
  override workflow exist.

### Iteration 14

- Hypothesis: Independent security and test review surfaced local privacy,
  scanner, and malicious-fixture gaps that can be reduced without provider
  credentials or production access.
- Action: Moved estimate-row reference image uploads out of the public
  `component-images` bucket and into private `project-images` brokered by
  `/api/projects/images`; updated the row asset validation RPC contract to bind
  row images to `surface=project-image`, `target_entity_type=estimate-row`, and
  the project target id; added a scanner lifecycle module plus service-role-only
  scan-result and override RPC contracts; expanded route/security tests for
  happy uploads, malformed/malicious fixtures, stale row denial, workspace
  mismatch, and attachment scan-state denial; and fixed a one-line unrelated
  `sort_order` parser omission in `workspace-repository.ts` to unblock global
  TypeScript in the shared dirty worktree.
- Files changed: estimate-row image route, upload domain and scan lifecycle
  migrations, scanner helper, auth-boundary tests, upload-domain/scanner tests,
  descriptor/projection tests, release-gate evidence, and the scoped repository
  parser coordination fix.
- Evidence:
  - `bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-scanning.test.ts --maxWorkers=1`
    passed 3 files / 68 tests.
  - `bunx eslint src/app/api/estimate-row-images/route.ts src/lib/uploads/scanning.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-scanning.test.ts`
    exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0 after the shared-worktree
    `sort_order` parser fix.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 17 files / 140 tests.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 1 file / 2 tests after release-gate evidence updates.
  - `node -e 'JSON.parse(require("fs").readFileSync(".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json","utf8")); console.log("json ok")'`
    exited 0.
- Result: The public-bucket estimate-row image finding is locally closed for new
  uploads, scanner lifecycle contracts are locally covered, and the malicious
  route/test matrix is materially broader. The full plan remains incomplete:
  provider storage proof, provider-applied upload-domain proof, legacy
  `component-images` backfill/publication privacy decision, real scanner/CDR
  worker/provider proof, cleanup operations, hosted runtime proof, and provider
  portability remain blocked or partially implemented.

### Iteration 15

- Hypothesis: The cleanup/observability blocker can be reduced further with a
  deterministic local operations contract for retention, retry, metrics, and
  backlog alerting without wiring a scheduler or touching provider state.
- Action: Extended `src/lib/uploads/cleanup.ts` with explicit upload retention
  cutoffs, retry-after guidance for failed cleanup, dashboard-safe cleanup
  metrics, and warning/critical backlog alert classification. Added tests that
  lock failed/deleted/session/audit retention dates, retry behavior, rejected
  record handling, and backlog pressure. Updated release-gate evidence to record
  `UPLOAD-GATE-CLEANUP-RETENTION-OBSERVABILITY-LOCAL` while leaving production
  cleanup blocked for scheduled TTL cleanup, provider-backed retry/audit
  execution, real dashboard emission, quota alerts, and an exercised runbook.
- Files changed: cleanup helper, cleanup tests, release-gate evidence/test, and
  plan/run ledgers.
- Evidence:
  - `bunx vitest run tests/vitest/upload-cleanup.test.ts --maxWorkers=1`
    passed 1 file / 7 tests.
  - `bunx vitest run tests/vitest/upload-cleanup.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 2 files / 9 tests.
  - `bunx eslint src/lib/uploads/cleanup.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - `node -e 'JSON.parse(require("fs").readFileSync(".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json","utf8")); console.log("json ok")'`
    exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 17 files / 143 tests.
- Result: Local cleanup retention and observability semantics are now covered.
  The full cleanup/observability production gate remains blocked until the
  scheduled job, provider-backed delete/retry/audit execution, quota alerts,
  dashboard wiring, production backpressure hooks, and runbook proof exist.

### Iteration 16

- Hypothesis: The component-image privacy blocker can be reduced locally by
  adding a deterministic classifier for persisted image references before any
  provider-backed backfill or bucket privacy change is attempted.
- Action: Added `src/lib/uploads/component-image-backfill.ts` to classify
  component library, estimate-row source snapshot, and publication snapshot
  references as asset-backed, brokered private, local derivative, legacy public
  `component-images` URL requiring private-resolver backfill, missing, or
  unsafe/external requiring manual review. Added summary counts for backfill
  readiness and release-gate evidence that keeps the privacy gate blocked until
  persisted provider/project data is scanned, publication snapshots are
  migrated, provider read denial is captured, and the product/security decision
  is made.
- Files changed: component-image backfill helper/test, release-gate evidence and
  test, and plan/run ledgers.
- Evidence:
  - `bunx vitest run tests/vitest/upload-component-image-backfill.test.ts --maxWorkers=1`
    passed 1 file / 4 tests.
  - `bunx eslint src/lib/uploads/component-image-backfill.ts tests/vitest/upload-component-image-backfill.test.ts`
    exited 0.
  - `bunx vitest run tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 2 files / 6 tests.
  - `node -e 'JSON.parse(require("fs").readFileSync(".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json","utf8")); console.log("json ok")'`
    exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0 after tightening the
    classifier union return type.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 18 files / 147 tests.
- Result: Local backfill readiness is covered. The component-image privacy gate
  remains blocked for real persisted data scan/backfill, provider read-denial
  proof, publication snapshot migration, and final product/security decision.

### Iteration 17

- Hypothesis: The provider-portability blocker can be reduced locally by
  defining upload-session strategy semantics for future direct-provider flows
  while keeping current capped uploads server-mediated.
- Action: Added `src/lib/uploads/session-strategy.ts` to choose
  `server_mediated`, `signed_single_part`, `multipart_resumable`, or rejected
  strategies from surface and file size. The contract requires finalize RPC,
  object existence checks, actor/workspace/surface binding, upload asset records,
  checksum/ETag proof for direct-provider flows, and scan-before-use for larger
  direct uploads. Updated release-gate evidence to record
  `UPLOAD-GATE-UPLOAD-SESSION-STRATEGY-LOCAL` while keeping platform completion
  blocked for real provider implementation, S3-like multipart parity tests, and
  migration dry-run against asset descriptors.
- Files changed: upload session strategy helper/test, release-gate evidence and
  test, and plan/run ledgers.
- Evidence:
  - `bunx vitest run tests/vitest/upload-session-strategy.test.ts --maxWorkers=1`
    passed 1 file / 4 tests.
  - `bunx eslint src/lib/uploads/session-strategy.ts tests/vitest/upload-session-strategy.test.ts`
    exited 0.
  - `bunx vitest run tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 2 files / 6 tests.
  - `node -e 'JSON.parse(require("fs").readFileSync(".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json","utf8")); console.log("json ok")'`
    exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 19 files / 151 tests.
- Result: Local provider-portability strategy semantics are covered. Platform
  completion remains blocked until signed/resumable flows are implemented
  against a provider, S3-like multipart parity tests pass, and migration dry-run
  proof is captured.

### Iteration 18

- Hypothesis: The upload-domain applied blocker can be retired with linked
  provider readback, while still keeping direct storage-operation denial and
  auth-token RLS proof honestly blocked.
- Action: Queried the authorized Supabase project `ebxxqidacheyapmmzavr` through
  the connector and wrote `evidence/upload-provider-readback.json`. The readback
  confirms the five upload migrations are present, `upload_sessions`,
  `upload_assets`, and `upload_events` exist with RLS enabled, authenticated
  upload table SELECT policies exist, broad direct storage policies are absent,
  scan lifecycle enum values are present, and upload RPC grants match the
  expected authenticated/service-role boundary. Updated
  `upload-release-gates.json` to add
  `UPLOAD-GATE-UPLOAD-DOMAIN-APPLIED-READBACK`, remove the stale applied-proof
  blocker, and keep remaining provider-storage denial as direct-operation proof.
- Shared-worktree repair: After provider readback, the expanded upload matrix
  exposed four local upload migration files that had regressed to semicolon-only
  placeholders. Restored the attachment approval freeze, upload-domain tables,
  scan taxonomy, and scan lifecycle SQL files from the tested/provider contract.
- Files changed: provider-readback evidence, release-gate evidence/test,
  provider-readback test, four upload migrations, and plan/run ledgers.
- Evidence:
  - Supabase connector migration ledger and read-only catalog query passed for
    project `ebxxqidacheyapmmzavr`; see `evidence/upload-provider-readback.json`.
  - `bunx vitest run tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 2 files / 3 tests before migration restoration.
  - `bunx eslint tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0 before migration restoration.
  - `bunx vitest run tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts --maxWorkers=1`
    passed 4 files / 18 tests after migration restoration.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 20 files / 152 tests.
  - `node -e "JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json','utf8')); JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-provider-readback.json','utf8')); console.log('json ok')"`
    exited 0.
  - `git diff --check` exited 0.
- Result: Upload-domain linked-provider applied/readback proof is captured and
  the stale applied-proof blocker is retired. Remaining provider blockers are
  direct Supabase Storage operation denial proof, auth-token row-level proof
  scripts, component-image persisted-data/backfill/privacy decision, scanner
  execution, cleanup/observability, hosted-runtime proof, and provider
  portability implementation.

### Iteration 19

- Hypothesis: Since the linked Supabase migration drift was reconciled by another
  lane, the platform provider-portability blocker can be narrowed by capturing
  a current linked dry-run artifact instead of leaving migration dry-run proof
  marked as unexecuted.
- Action: Ran `supabase db push --linked --dry-run` against the authorized
  linked project and recorded `evidence/upload-provider-migration-dry-run.json`.
  Updated `upload-release-gates.json` to add
  `UPLOAD-GATE-PROVIDER-MIGRATION-DRY-RUN-READBACK` and to narrow
  `UPLOAD-GATE-PROVIDER-PORTABILITY` to the still-open signed/resumable
  provider implementation, S3-like multipart parity, and existing-object
  migration/asset-descriptor parity.
- Files changed: provider migration dry-run evidence/test, release-gate
  evidence/test, and plan/run ledgers.
- Evidence:
  - `supabase db push --linked --dry-run` exited 0 and reported
    `Remote database is up to date.`
  - `bunx vitest run tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 2 files / 3 tests.
  - `bunx eslint tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - `node -e "for (const f of ['upload-release-gates.json','upload-provider-readback.json','upload-provider-migration-dry-run.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 21 files / 153 tests.
  - `git diff --check` exited 0.
- Result: Linked provider migration dry-run proof is now captured and no longer
  a platform blocker. Provider portability remains blocked for actual
  signed/resumable provider implementation, S3-like multipart parity, and
  existing object migration/asset descriptor parity.

### Iteration 20

- Hypothesis: The platform provider-portability blocker can be narrowed with a
  local fake S3-like multipart contract without claiming real-provider direct
  upload support.
- Action: Added `src/lib/uploads/provider-portability.ts` with provider-neutral
  signed single-part and multipart session/finalization contracts. Added
  `tests/vitest/upload-provider-portability.test.ts` with a fake S3-like
  provider proving signed single-part object-head validation, checksum/ETag
  proof, object-scope binding, size/content-type guards, multipart part
  signing/completion, missing-part failure, and abort cleanup. Updated
  `upload-release-gates.json` to add
  `UPLOAD-GATE-S3-LIKE-MULTIPART-PARITY-LOCAL` while keeping platform completion
  blocked for real-provider signed/resumable implementation and existing object
  migration/asset-descriptor parity.
- Files changed: provider-portability helper/test, release-gate evidence/test,
  and plan/run ledgers.
- Evidence:
  - `bunx vitest run tests/vitest/upload-provider-portability.test.ts --maxWorkers=1`
    passed 1 file / 2 tests.
  - `bunx eslint src/lib/uploads/provider-portability.ts tests/vitest/upload-provider-portability.test.ts`
    exited 0.
  - `bunx vitest run tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 2 files / 4 tests.
  - `bunx eslint src/lib/uploads/provider-portability.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - `node -e "for (const f of ['upload-release-gates.json','upload-provider-readback.json','upload-provider-migration-dry-run.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 22 files / 155 tests.
  - `git diff --check` exited 0.
- Result: Local S3-like multipart parity is covered and no longer a platform
  sub-blocker. Provider portability remains blocked for real signed/resumable
  provider implementation and existing object migration/asset-descriptor parity.

### Iteration 21

- Hypothesis: The remaining platform asset-descriptor/migration parity blocker
  can be reduced locally by normalizing current asset descriptors, brokered
  private URLs, and legacy public component-image URLs into provider-neutral
  bucket/path locators without attempting a provider data migration.
- Action: Added `src/lib/uploads/asset-descriptor-migration.ts` with a local
  parity contract for upload asset descriptors, brokered component/project image
  routes, and legacy public component-image URLs. The contract emits
  provider-neutral locators, broker rewrite URLs for legacy public component
  images, and manual-review failures for unsafe URLs or descriptor/URL
  mismatches. Updated release-gate evidence with
  `UPLOAD-GATE-ASSET-DESCRIPTOR-MIGRATION-PARITY-LOCAL` and narrowed
  `UPLOAD-GATE-PROVIDER-PORTABILITY` to real signed/resumable provider
  implementation.
- Files changed: asset-descriptor migration helper/test, release-gate
  evidence/test, and plan/run/current-state ledgers.
- Evidence:
  - `bunx vitest run tests/vitest/upload-asset-descriptor-migration.test.ts --maxWorkers=1`
    passed 1 file / 4 tests.
  - `bunx eslint src/lib/uploads/asset-descriptor-migration.ts tests/vitest/upload-asset-descriptor-migration.test.ts`
    exited 0.
  - `bunx vitest run tests/vitest/upload-asset-descriptor-migration.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 2 files / 6 tests.
  - `bunx eslint src/lib/uploads/asset-descriptor-migration.ts tests/vitest/upload-asset-descriptor-migration.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - `node -e "for (const f of ['upload-release-gates.json','upload-provider-readback.json','upload-provider-migration-dry-run.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-asset-descriptor-migration.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 23 files / 159 tests.
- Result: Local asset-descriptor migration parity is covered and no longer a
  platform sub-blocker. Provider portability remains blocked for real
  signed/resumable provider implementation and proof.

### Iteration 22

- Hypothesis: The component-image privacy blocker can be narrowed with a
  linked-provider aggregate scan of persisted component-image references, without
  exposing raw object keys or claiming bucket privacy/read-denial proof.
- Action: Queried the authorized Supabase project `ebxxqidacheyapmmzavr` for
  aggregate counts across cost-library image columns, estimate row/template
  source snapshots, publication/version snapshots, and `upload_assets`. Added
  `evidence/upload-component-image-provider-scan.json` with count-only evidence:
  zero persisted legacy public component-image URLs, zero `upload_assets`
  component-image records, zero publication/version snapshot image rows, and
  three non-provider estimate-row snapshot image references. Updated
  `upload-release-gates.json` with
  `UPLOAD-GATE-COMPONENT-IMAGE-PERSISTED-SCAN-READBACK` and narrowed the
  privacy blocker to the still-open public bucket/read-denial/non-empty
  publication snapshot/final decision work.
- Files changed: provider scan evidence/test, release-gate evidence/test, and
  plan/run/current-state ledgers.
- Evidence:
  - Supabase connector aggregate component-image persisted reference scan passed
    for project `ebxxqidacheyapmmzavr`.
  - `bunx vitest run tests/vitest/upload-component-image-provider-scan.test.ts --maxWorkers=1`
    passed 1 file / 2 tests.
  - `bunx vitest run tests/vitest/upload-component-image-provider-scan.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 2 files / 4 tests.
  - `bunx eslint tests/vitest/upload-component-image-provider-scan.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - `node -e "for (const f of ['upload-release-gates.json','upload-provider-readback.json','upload-provider-migration-dry-run.json','upload-component-image-provider-scan.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-component-image-provider-scan.test.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-asset-descriptor-migration.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 24 files / 161 tests.
- Result: Persisted provider/project data has aggregate component-image privacy
  scan evidence. Component-image privacy remains blocked because
  `component-images` is still public for legacy/provider reads, provider-backed
  read denial is not captured, publication snapshot migration has not been
  exercised against non-empty publication data, and the final product/security
  decision remains unresolved.

### Iteration 23

- Hypothesis: After the brokered resolver migration and aggregate provider scan
  found no persisted legacy public component-image URLs, the remaining public
  `component-images` bucket posture can be fixed through a reviewable provider
  migration and catalog readback without claiming direct object-operation proof.
- Action: Applied a linked Supabase migration to project `ebxxqidacheyapmmzavr`
  to set `storage.buckets.component-images.public=false` and drop the named
  `component images are publicly readable` SELECT policy. The Supabase connector
  assigned provider version `20260627010904`, so the local migration is aligned
  as `supabase/migrations/20260627010904_20260627120000_make_component_images_private.sql`.
  Added `evidence/upload-component-image-private-bucket-readback.json`, updated
  release gates with `UPLOAD-GATE-COMPONENT-IMAGE-PRIVATE-BUCKET-READBACK`, and
  changed the linked readiness probe to expect private `component-images`.
- Files changed: component-image private bucket migration, private-bucket
  evidence/test, release-gate evidence/test, linked Supabase readiness SQL/tests,
  provider-scan limitation wording, provider dry-run evidence/test, and
  plan/run/current-state ledgers.
- Evidence:
  - Supabase connector `_apply_migration` returned success for
    `20260627120000_make_component_images_private` on project
    `ebxxqidacheyapmmzavr`.
  - Supabase connector readback returned `component-images.public=false`, no
    named public read policies, no remaining `storage.objects` policies
    referencing `component-images`, and migration ledger row
    `20260627010904 / 20260627120000_make_component_images_private`.
  - `bunx vitest run tests/vitest/upload-component-image-private-bucket-readback.test.ts tests/vitest/upload-component-image-provider-scan.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-release-gates.test.ts tests/vitest/linked-supabase-readiness-sql.test.ts tests/vitest/supabase-linked-readiness-script.test.ts --maxWorkers=1`
    passed 6 files / 15 tests.
  - `bunx eslint tests/vitest/upload-component-image-private-bucket-readback.test.ts tests/vitest/upload-component-image-provider-scan.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-release-gates.test.ts tests/vitest/linked-supabase-readiness-sql.test.ts tests/vitest/supabase-linked-readiness-script.test.ts`
    exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-component-image-provider-scan.test.ts tests/vitest/upload-component-image-private-bucket-readback.test.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-asset-descriptor-migration.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 25 files / 163 tests.
  - `supabase db push --linked --dry-run` exited 0 and reported `Remote database
    is up to date.`
  - `node -e "for (const f of ['upload-release-gates.json','upload-provider-readback.json','upload-provider-migration-dry-run.json','upload-component-image-provider-scan.json','upload-component-image-private-bucket-readback.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `git diff --check` exited 0.
- Result: The public bucket/policy part of the component-image privacy blocker is
  closed by linked provider catalog readback. The gate remains blocked for direct
  unauthenticated object read-denial operation proof and a non-empty publication
  snapshot migration exercise.

### Iteration 24

- Hypothesis: The remaining direct storage-denial blocker can be closed with a
  live linked-provider operation proof that creates only temporary proof objects
  and a temporary auth user, then deletes all provider-side proof state.
- Action: Hardened `scripts/prove-upload-storage-denial-postgres.mjs` with an
  Archestimator project-ref guard, opt-in proof-scoped env-file loading,
  temporary Supabase Auth user creation/sign-in/deletion, anon/auth direct
  insert/update/download checks for all upload buckets, and direct delete checks
  backed by service-role readback that seeded objects remain when Storage
  `remove()` reports success with zero deleted rows. Added
  `tests/vitest/upload-storage-denial-proof.test.ts` to lock the live proof
  artifact shape and secret-free evidence. Updated release gates with
  `UPLOAD-GATE-PROVIDER-STORAGE-DENIAL-OPERATION-PROOF`, removed
  `UPLOAD-GATE-PROVIDER-STORAGE-DENIAL` from closed-beta blockers, and narrowed
  the component-image privacy blocker to the non-empty publication snapshot
  migration exercise.
- Files changed: storage-denial proof script, proof-script static test,
  storage-denial proof evidence/test, release-gate evidence/test, and
  plan/run/current-state ledgers.
- Evidence:
  - `ARCH_UPLOAD_STORAGE_PROOF=1 ARCH_UPLOAD_STORAGE_PROOF_ENV_FILE=.env.local node scripts/prove-upload-storage-denial-postgres.mjs`
    exited 0 against project `ebxxqidacheyapmmzavr` with `proofBoundary:
    linked-provider`, `passed: true`, `skipped: false`, `failedChecks: []`,
    `cleanupErrors: []`, and `temporaryUserDeleted: true`.
  - The provider proof covers anon/auth direct insert, update, download, and
    delete denial for `project-images`, `component-images`, and
    `component-attachments`. Delete denial is proven by service-role readback
    after each direct delete attempt.
  - `bunx vitest run tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-storage-denial-proof.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 3 files / 5 tests.
  - `bunx eslint scripts/prove-upload-storage-denial-postgres.mjs tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-storage-denial-proof.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - `node -e "for (const f of ['upload-release-gates.json','upload-storage-denial-proof.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-component-image-provider-scan.test.ts tests/vitest/upload-component-image-private-bucket-readback.test.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-asset-descriptor-migration.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-storage-denial-proof.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 26 files / 165 tests.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `node -e "for (const f of ['upload-release-gates.json','upload-provider-readback.json','upload-provider-migration-dry-run.json','upload-component-image-provider-scan.json','upload-component-image-private-bucket-readback.json','upload-storage-denial-proof.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `git diff --check` exited 0.
- Result: Direct provider storage operation denial is no longer a closed-beta
  blocker. Component-image privacy remains blocked only for non-empty
  publication snapshot migration exercise. Production/platform upload blockers
  remain for scanner/CDR execution, cleanup observability/runtime proof, hosted
  runtime evidence, and real signed/resumable provider implementation.

### Iteration 25

- Hypothesis: The final closed-beta component-image privacy blocker can be
  closed by exercising publication snapshot migration classification against
  non-empty representative snapshot data, paired with the linked-provider scan
  that already found zero persisted publication/version snapshot image rows.
- Action: Added `collectPublicationSnapshotImageReferences` to
  `src/lib/uploads/component-image-backfill.ts` so stored publication snapshot
  rows, including legacy v1.2 tab rows, can be classified through the same
  backfill readiness path as component-library and estimate-row snapshots.
  Added a non-empty publication snapshot fixture that preserves a legacy public
  `component-images` URL through publication snapshot normalization and
  classifies it as `backfill_to_private_resolver`, with a local derivative row
  classified as ready. Added
  `evidence/upload-component-image-publication-snapshot-migration-proof.json`
  and updated release gates with
  `UPLOAD-GATE-COMPONENT-IMAGE-PUBLICATION-SNAPSHOT-MIGRATION-LOCAL`.
- Files changed: component-image backfill helper/test, publication snapshot
  migration proof evidence, release-gate evidence/test, and
  plan/run/current-state ledgers.
- Evidence:
  - `bunx vitest run tests/vitest/upload-component-image-backfill.test.ts --maxWorkers=1`
    passed 1 file / 6 tests.
  - `bunx eslint src/lib/uploads/component-image-backfill.ts tests/vitest/upload-component-image-backfill.test.ts`
    exited 0.
  - `node -e "JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-component-image-publication-snapshot-migration-proof.json','utf8')); console.log('json ok')"`
    exited 0.
  - `bunx vitest run tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 2 files / 8 tests.
  - `bunx eslint src/lib/uploads/component-image-backfill.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - `node -e "for (const f of ['upload-release-gates.json','upload-component-image-publication-snapshot-migration-proof.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-component-image-provider-scan.test.ts tests/vitest/upload-component-image-private-bucket-readback.test.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-asset-descriptor-migration.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-storage-denial-proof.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 26 files / 167 tests.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `node -e "for (const f of ['upload-release-gates.json','upload-provider-readback.json','upload-provider-migration-dry-run.json','upload-component-image-provider-scan.json','upload-component-image-private-bucket-readback.json','upload-storage-denial-proof.json','upload-component-image-publication-snapshot-migration-proof.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `git diff --check` exited 0.
- Result: Closed-beta upload release gate is now `ready` with no closed-beta
  blockers. This does not claim production/platform readiness: scanner/CDR,
  cleanup observability/runtime proof, hosted runtime proof, and real
  signed/resumable provider implementation remain blocked.

### Iteration 26

- Hypothesis: The production cleanup/observability blocker can be narrowed by
  proving linked-provider cleanup execution against temporary objects selected
  by the upload-specific cleanup planner, without claiming durable production
  scheduling, audit/retry jobs, dashboards, or runbooks.
- Action: Added `scripts/prove-upload-cleanup-provider-postgres.ts` as an
  opt-in Bun proof with Archestimator project-ref guard and proof-scoped
  environment loading. The proof builds failed/deleted/expired/reserved/
  finalized/active/unsafe/cross-workspace/duplicate/thumbnail
  `UploadCleanupRecord` fixtures, runs `planUploadStorageCleanup`, deletes only
  planner-approved temporary Supabase Storage objects, verifies deleted objects
  read back missing, and verifies rejected/finalized/active seedable objects
  remain present.
- Adversarial review: A read-only `ce-adversarial-reviewer` lane flagged that a
  raw storage `remove()` proof would bypass the upload planner, could overstate
  deletion without readback, and must not mark production cleanup ready. The
  implementation was adjusted before acceptance to import and exercise
  `planUploadStorageCleanup`, verify before/after readbacks, and keep production
  blocked.
- Files changed: cleanup provider proof script, cleanup provider proof evidence
  artifact, cleanup provider proof tests, release-gate evidence/test, and
  plan/run/current-state ledgers.
- Evidence:
  - `ARCH_UPLOAD_CLEANUP_PROOF=1 ARCH_UPLOAD_CLEANUP_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-cleanup-provider-postgres.ts`
    passed against linked Supabase project `ebxxqidacheyapmmzavr` with
    `candidateCount=5`, `rejectedCount=5`, `removedCount=5`,
    `readbackMissingCount=5`, `preservedReadbackCount=4`, `failedChecks=[]`,
    and `cleanupErrors=[]`.
  - `bunx vitest run tests/vitest/upload-cleanup.test.ts tests/vitest/upload-cleanup-provider-proof-script.test.ts tests/vitest/upload-cleanup-provider-proof.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 4 files / 13 tests.
  - `bunx eslint scripts/prove-upload-cleanup-provider-postgres.ts tests/vitest/upload-cleanup-provider-proof-script.test.ts tests/vitest/upload-cleanup-provider-proof.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - `node -e "for (const f of ['upload-release-gates.json','upload-provider-readback.json','upload-provider-migration-dry-run.json','upload-component-image-provider-scan.json','upload-component-image-private-bucket-readback.json','upload-storage-denial-proof.json','upload-component-image-publication-snapshot-migration-proof.json','upload-cleanup-provider-proof.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-component-image-provider-scan.test.ts tests/vitest/upload-component-image-private-bucket-readback.test.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-asset-descriptor-migration.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-cleanup-provider-proof-script.test.ts tests/vitest/upload-cleanup-provider-proof.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-storage-denial-proof.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 28 files / 171 tests.
  - `git diff --check` exited 0.
  - `bunx tsc --noEmit --pretty false` was attempted and currently fails in
    unrelated dirty estimate-row adjustment files with `adjustmentPercentage`
    type mismatches; no upload cleanup proof files are implicated.
- Result: Provider-backed temporary object cleanup execution/readback is now
  proved for planner-approved upload cleanup candidates, with rejected and
  finalized/active proof objects preserved. Production remains blocked for
  durable scheduled TTL cleanup, persisted retry/audit job execution, real
  dashboard emission, quota alerts, production backpressure hooks, hosted
  runtime proof, scanner/CDR execution, and the retention runbook.

### Iteration 27

- Hypothesis: The production scanner blocker can be narrowed by proving the
  linked provider executes the service-role scanner/override RPC lifecycle with
  checksum-bound mutations and provider readback, without claiming that a real
  scanner/CDR engine, queue worker, clean download flow, or operational override
  workflow exists.
- Action: Added `scripts/prove-upload-scan-rpc-provider-postgres.ts` as an
  opt-in Bun proof guarded to Supabase project `ebxxqidacheyapmmzavr`. The first
  provider run exposed remote drift: `record_upload_scan_result` still used an
  older no-checksum signature, `upload_assets.scanned_at` was missing, and the
  live session-consistency trigger compared `scan_status` against
  `upload_sessions`, blocking scanner transitions. Applied forward-only repair
  migrations and mirrored the connector ledger locally:
  `20260627024155_upload_scan_rpc_checksum_contracts.sql`,
  `20260627024318_upload_scan_lifecycle_scanned_at_readback.sql`, and
  `20260627024438_upload_asset_session_consistency_scan_mutability.sql`.
- Provider proof: The final live proof created a temporary auth user/workspace,
  seeded seven temporary `upload_assets` records, recorded clean,
  failed-transient, infected, failed-permanent, and unsupported scan outcomes
  through the checksum-bound scanner RPC, verified checksum mismatch and
  non-attachment scanner denials, approved permanent/unsupported overrides with
  audit fields, read back scan statuses/events, and cleaned up the temporary
  fixture.
- Files changed: scan RPC provider proof script, three upload scan repair
  migrations, scan provider proof evidence artifact, provider-readback evidence
  artifact/test, scan provider proof tests, release-gate evidence/test, and
  plan/run/current-state ledgers.
- Evidence:
  - Supabase connector readback confirmed checksum-bound
    `record_upload_scan_result` and `approve_upload_scan_override` signatures,
    service-role-only execute grants, `upload_assets.scanned_at`, and scan
    mutability trigger repair in project `ebxxqidacheyapmmzavr`.
  - `ARCH_UPLOAD_SCAN_RPC_PROOF=1 ARCH_UPLOAD_SCAN_RPC_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-scan-rpc-provider-postgres.ts`
    passed with `assetFixtureCount=7`, clean/transient/infected/
    permanent/unsupported outcomes, two `override_approved` readbacks,
    checksum/non-attachment denials, scanner event readback, `failedChecks=[]`,
    and `cleanupErrors=[]`.
  - `bunx vitest run tests/vitest/upload-scanning.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-scan-rpc-provider-proof-script.test.ts tests/vitest/upload-scan-rpc-provider-proof.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 5 files / 14 tests.
  - `bunx eslint scripts/prove-upload-scan-rpc-provider-postgres.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-scan-rpc-provider-proof-script.test.ts tests/vitest/upload-scan-rpc-provider-proof.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - `node -e "for (const f of ['upload-release-gates.json','upload-provider-readback.json','upload-provider-migration-dry-run.json','upload-component-image-provider-scan.json','upload-component-image-private-bucket-readback.json','upload-storage-denial-proof.json','upload-component-image-publication-snapshot-migration-proof.json','upload-cleanup-provider-proof.json','upload-scan-rpc-provider-proof.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-component-image-provider-scan.test.ts tests/vitest/upload-component-image-private-bucket-readback.test.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-asset-descriptor-migration.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-cleanup-provider-proof-script.test.ts tests/vitest/upload-cleanup-provider-proof.test.ts tests/vitest/upload-scan-rpc-provider-proof-script.test.ts tests/vitest/upload-scan-rpc-provider-proof.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-storage-denial-proof.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 30 files / 177 tests.
  - `supabase db push --linked --dry-run` exited 0 and showed no pending upload
    scan RPC repair migrations; it would push unrelated shared-worktree
    migration `20260627123000_signed_quantity_and_row_adjustments.sql`.
  - `git diff --check` exited 0.
  - `bunx tsc --noEmit --pretty false` remains red in unrelated dirty
    estimate-row adjustment work:
    `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:857`
    passes `adjustmentPercentage` to `UpdateEstimateRowInput`.
- Result: Linked-provider scanner RPC execution/readback is now proved and the
  production scanner blocker is narrowed. Production remains blocked for the
  actual scanner/CDR provider, queue worker, provider-backed file scanning,
  provider-backed clean download proof, operational override UI/runbook, hosted
  runtime proof, durable cleanup scheduler/observability, and real
  signed/resumable provider portability.

## Iteration 28 - Supabase Signed Single-Part Provider Proof

- Goal: Narrow the provider-portability blocker with a real linked Supabase
  signed-upload proof while keeping app-route integration and resumable/TUS/
  multipart provider flows explicitly blocked.
- Action: Added `createSupabaseDirectUploadProvider` to
  `src/lib/uploads/provider-portability.ts`. The adapter issues signed
  single-part sessions through Supabase Storage, reads object metadata through
  provider `info`, validates finalization with the existing provider-neutral
  object-head guard, and fails closed for direct multipart/resumable methods
  until a real TUS/multipart provider path exists.
- Provider proof: Added `scripts/prove-upload-signed-provider-postgres.ts` as
  an opt-in Bun proof guarded to Supabase project `ebxxqidacheyapmmzavr`. The
  live proof creates a temporary auth user/workspace, asks the Supabase adapter
  for a signed upload session, uploads PDF bytes with the signed token and no
  Authorization header, reads back object metadata by provider `info`, validates
  finalization by ETag, records the finalized `upload_assets` row through
  `record_upload_asset`, proves path-mismatch validation fails closed, and
  removes the temporary object/workspace/user fixture.
- Evidence artifact:
  `evidence/upload-signed-provider-proof.json` records
  `proofBoundary=linked-provider-signed-upload-readback`, `provider=supabase-storage`,
  `uploadMode=signed_single_part`, `resumableImplemented=false`,
  `signedUrlRecorded=false`, `tokenRecorded=false`,
  `uploadedWithAuthorizationHeader=false`, ETag-backed object-head validation,
  `uploadAssetRecorded=true`, `failedChecks=[]`, and `cleanupErrors=[]`.
- Release gates: Added
  `UPLOAD-GATE-SUPABASE-SIGNED-UPLOAD-PROVIDER-READBACK` under platform
  `localPasses`, while preserving `platform.status=blocked` for app-route
  signed-upload integration and real resumable/TUS/multipart provider flows.
- Evidence:
  - `ARCH_UPLOAD_SIGNED_PROVIDER_PROOF=1 ARCH_UPLOAD_SIGNED_PROVIDER_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-signed-provider-postgres.ts`
    passed with Supabase signed URL issuance, token-only upload without
    Authorization header, ETag-backed object-head finalization validation,
    upload asset finalization recording, `failedChecks=[]`, and
    `cleanupErrors=[]`.
  - `bunx vitest run tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-signed-provider-proof-script.test.ts tests/vitest/upload-signed-provider-proof.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 4 files / 10 tests.
  - `bunx eslint src/lib/uploads/provider-portability.ts scripts/prove-upload-signed-provider-postgres.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-signed-provider-proof-script.test.ts tests/vitest/upload-signed-provider-proof.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - `node -e "for (const f of ['upload-release-gates.json','upload-provider-readback.json','upload-provider-migration-dry-run.json','upload-component-image-provider-scan.json','upload-component-image-private-bucket-readback.json','upload-storage-denial-proof.json','upload-component-image-publication-snapshot-migration-proof.json','upload-cleanup-provider-proof.json','upload-scan-rpc-provider-proof.json','upload-signed-provider-proof.json']) JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/'+f,'utf8')); console.log('json ok')"`
    exited 0.
  - `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/upload-provider-readback.test.ts tests/vitest/upload-provider-migration-dry-run.test.ts tests/vitest/upload-component-image-provider-scan.test.ts tests/vitest/upload-component-image-private-bucket-readback.test.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-asset-descriptor-migration.test.ts tests/vitest/upload-client-state.test.ts tests/vitest/upload-cleanup.test.ts tests/vitest/upload-cleanup-provider-proof-script.test.ts tests/vitest/upload-cleanup-provider-proof.test.ts tests/vitest/upload-scan-rpc-provider-proof-script.test.ts tests/vitest/upload-scan-rpc-provider-proof.test.ts tests/vitest/upload-signed-provider-proof-script.test.ts tests/vitest/upload-signed-provider-proof.test.ts tests/vitest/upload-component-image-backfill.test.ts tests/vitest/upload-session-strategy.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/upload-domain-proof-script.test.ts tests/vitest/upload-storage-provider.test.ts tests/vitest/upload-storage-proof-script.test.ts tests/vitest/upload-storage-denial-proof.test.ts tests/vitest/upload-runtime-profile-script.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-direct-storage-proof-contract.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/estimate-component-drag.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
    passed 32 files / 183 tests.
  - `supabase db push --linked --dry-run` exited 0 and showed no pending upload
    signed-provider migrations; it would push unrelated shared-worktree
    migration `20260627123000_signed_quantity_and_row_adjustments.sql`.
  - `git diff --check` exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0.
- Result: Supabase signed single-part upload/readback/finalization is now proved
  against the linked provider. Platform remains blocked for app-route signed
  upload integration and real resumable/TUS/multipart provider implementation;
  production remains blocked for scanner/CDR execution, queue worker, clean
  download proof, hosted runtime proof, and durable cleanup operations.

## Iteration 29 - Signed App-Route Provider Session Proof

- Goal: Narrow the platform provider-portability blocker by proving the
  component attachment direct-upload route boundary against the linked Supabase
  provider, while keeping browser/client UX and real resumable/TUS/multipart
  provider flows explicitly blocked.
- Action: Added
  `src/app/api/component-library/attachments/direct-upload/route.ts` and
  `src/lib/uploads/direct-upload-records.ts`. The route authenticates before
  body parsing, keeps files up to 20 MB on the existing server-mediated route,
  creates signed single-part sessions only for larger component attachments,
  stores only reserved session metadata through service-role
  `create_upload_session`, validates provider object-head proof before
  finalization, and records the finalized upload through service-role
  `finalize_upload_session`.
- Provider repair: Applied linked Supabase direct-upload RPC repairs to project
  `ebxxqidacheyapmmzavr` and aligned local migration filenames to provider
  ledger versions `20260627032615`, `20260627034126`, `20260627034336`, and
  `20260627034619`. The repairs reconcile the live `upload_sessions.file_name`,
  `expires_at`, and `scan_status` schema, use `session_reserved` reservation
  events, cast scan/finalization event CASE expressions to
  `public.upload_event_type`, and keep direct-upload RPCs service-role-only.
- Provider proof: Added
  `scripts/prove-upload-signed-route-provider-postgres.ts` as an opt-in Bun
  proof guarded to Supabase project `ebxxqidacheyapmmzavr`. The live proof
  creates a temporary auth user/workspace, issues a signed single-part upload
  session through the same provider/session helpers as the route, reads back the
  reserved session with workspace/actor binding, uploads PDF bytes using only
  the signed token, validates provider object-head readback by ETag, finalizes
  through `finalize_upload_session`, verifies finalized asset/events, verifies
  signed URL/token metadata is not recorded, and removes the temporary fixture.
- Evidence artifact:
  `evidence/upload-signed-route-provider-proof.json` records
  `proofBoundary=linked-provider-signed-route-readback`,
  `route=component-attachment-direct-upload`, `provider=supabase-storage`,
  `uploadMode=signed_single_part`, `sessionStatusFlow=["reserved","finalized"]`,
  `signedUrlRecorded=false`, `tokenRecorded=false`,
  `uploadedWithAuthorizationHeader=false`, ETag-backed object-head validation,
  `finalizedAssetRecorded=true`, `failedChecks=[]`, and `cleanupErrors=[]`.
- Release gates: Added
  `UPLOAD-GATE-SIGNED-UPLOAD-APP-ROUTE-PROVIDER-READBACK` under platform
  `localPasses`, while preserving `platform.status=blocked` for browser/client
  direct-upload UX integration and real resumable/TUS/multipart provider flows.
- Evidence:
  - `ARCH_UPLOAD_SIGNED_ROUTE_PROOF=1 ARCH_UPLOAD_SIGNED_ROUTE_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-signed-route-provider-postgres.ts`
    passed with reserved session readback, token-only upload without
    Authorization header, ETag-backed object-head finalization validation,
    `finalize_upload_session` asset/event readback, sanitized metadata,
    `failedChecks=[]`, and `cleanupErrors=[]`.
  - Focused signed-route/readback/release-gate matrix passed 7 files / 21 tests.
  - Scoped ESLint for the new route, helper, provider adapter, proof script,
    provider-readback test, evidence tests, and release gates exited 0.
  - Eleven-artifact upload evidence JSON parse exited 0.
  - Expanded upload matrix passed 35 files / 193 tests.
  - `supabase db push --linked --dry-run` exited 0 and showed no pending upload
    signed-route migrations; it would push unrelated shared-worktree migration
    `20260627123000_signed_quantity_and_row_adjustments.sql`.
  - `git diff --check` exited 0.
  - `bunx tsc --noEmit --pretty false` exited 0.
- Result: The signed app-route session/finalization boundary is now proved
  against the linked provider. Platform remains blocked for browser/client
  direct-upload UX integration and real resumable/TUS/multipart provider flows;
  production remains blocked for scanner/CDR execution, queue worker, clean
  download proof, hosted runtime proof, and durable cleanup operations.

## Iteration 30 - Browser Client Signed Direct Upload Integration

- Goal: Narrow the remaining platform portability blocker by wiring the
  component attachment browser/client flow to the signed direct-upload route for
  files above the 20 MB server-mediated cap, without changing the small-file
  FormData route or claiming resumable/multipart readiness.
- Implementation: Added `src/lib/uploads/component-attachment-client.ts` with
  a shared attachment validator/uploader. It resolves PDF/XLS/XLSX content
  types by MIME or extension, keeps files at or below 20 MB on
  `/api/component-library/attachments`, routes larger files below the 64 MB
  multipart threshold through `/api/component-library/attachments/direct-upload`,
  uploads the raw `File` to the provider signed URL without an Authorization
  header, and finalizes the upload session. The Add Component modal now uses the
  shared validator/uploader and shows signed-session upload copy for larger
  attachments.
- Cleanup: Removed the modal-local attachment upload helper and type constants.
  While running scoped lint on the touched modal, fixed the existing
  render-time `initialDraftRef.current` pattern by passing a memoized initializer
  into `useReducer`.
- Tests: Added `tests/vitest/upload-component-attachment-client.test.ts` to
  prove small-file FormData route selection, signed direct-upload create/PUT/
  finalize sequencing, no Authorization header on provider upload, extension
  content-type inference, and fail-closed rejection for files at the unimplemented
  multipart size.
- Release gates: Added
  `UPLOAD-GATE-SIGNED-UPLOAD-BROWSER-CLIENT-LOCAL` under platform `localPasses`.
  `platform.status` remains blocked for real resumable/TUS/multipart provider
  flows; production remains blocked for scanner/CDR execution, queue worker,
  clean download proof, hosted runtime proof, and durable cleanup operations.
- Evidence:
  - `bunx vitest run tests/vitest/upload-component-attachment-client.test.ts --maxWorkers=1`
    passed 1 file / 4 tests.
  - `bunx eslint src/lib/uploads/component-attachment-client.ts src/components/workshop/component-library-manager/AddComponentModal.tsx tests/vitest/upload-component-attachment-client.test.ts`
    exited 0.
  - Eleven-artifact upload evidence JSON parse exited 0.
  - `bunx vitest run tests/vitest/upload-component-attachment-client.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
    passed 2 files / 6 tests.
  - `bunx eslint src/lib/uploads/component-attachment-client.ts src/components/workshop/component-library-manager/AddComponentModal.tsx tests/vitest/upload-component-attachment-client.test.ts tests/vitest/upload-release-gates.test.ts`
    exited 0.
  - Expanded upload matrix with the new client test passed 36 files / 197
    tests.
  - `bunx tsc --noEmit --pretty false` exited 0.
  - `git diff --check` exited 0.
- Result: Browser/client signed-direct route selection and finalization are
  locally proved at the transport/helper boundary and wired into the Add
  Component modal. Full browser/manual proof was intentionally not run; the
  local claim is limited to client transport and modal integration.

### Iteration 31 - Supabase Signed TUS Resumable Upload Provider Flow

- Implemented Supabase signed TUS resumable sessions in
  `src/lib/uploads/provider-portability.ts`, including direct storage
  `/storage/v1/upload/resumable/sign` endpoint derivation, fixed 6 MB chunk
  metadata, and short-lived signed-token session output without adding a new
  dependency.
- Extended `/api/component-library/attachments/direct-upload` so attachment
  files at or above the 64 MB single-part threshold reserve `tus_resumable`
  upload sessions, return only the ephemeral TUS token/metadata to the browser
  response, persist no token/upload location, and finalize resumable objects
  with the larger session cap through provider object-head validation.
- Extended the browser/client attachment helper so files above the signed
  single-part threshold use TUS creation-with-upload plus sequential PATCH
  chunks using `x-signature` and no Authorization header, then finalize through
  the existing route. Add Component modal progress copy now distinguishes
  resumable sessions.
- Added `scripts/prove-upload-tus-provider-postgres.ts` plus focused
  script/evidence tests. Linked provider proof against Supabase project
  `ebxxqidacheyapmmzavr` passed: a temporary 6 MB + tail PDF uploaded through
  signed TUS, provider object-head readback validated by ETag,
  `finalize_upload_session` recorded asset/event readback, token/location
  metadata stayed redacted, and cleanup returned `cleanupErrors=[]`.
- Updated `evidence/upload-release-gates.json` so platform status is now
  `ready`; production remains blocked for scanner/CDR provider, queue worker,
  provider-backed clean download proof, durable cleanup scheduler/observability,
  hosted runtime evidence, and operational override UI/runbook.
- Fresh verification passed: linked TUS proof
  `ARCH_UPLOAD_TUS_PROVIDER_PROOF=1 ARCH_UPLOAD_TUS_PROVIDER_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-tus-provider-postgres.ts`,
  focused provider/route/client/TUS-proof matrix 5 files / 21 tests,
  release-gates/TUS evidence matrix 2 files / 4 tests, scoped ESLint, expanded
  upload matrix 38 files / 205 tests, eleven-artifact JSON parse,
  `bunx tsc --noEmit --pretty false`, and `git diff --check`.

### Iteration 32 - Provider-Backed Clean Attachment Download Proof

- Hardened `/api/component-library/attachments` GET so the download broker now
  requires the persisted attachment row to be `review_status = approved` and
  `is_current_approved = true` before it checks the matching finalized,
  scan-clean upload asset, records `download_url_issued`, or reads private
  storage bytes.
- Added route regression coverage for unapproved/current attachment rows and
  updated static governance coverage so the approved/current download
  requirement is pinned next to the existing cleanup governance checks.
- Added `scripts/prove-upload-clean-download-provider-postgres.ts` plus focused
  script/evidence tests. Linked provider proof against Supabase project
  `ebxxqidacheyapmmzavr` passed: a temporary approved/current component
  attachment was seeded, its upload asset was marked clean through
  `record_upload_scan_result`, `download_url_issued` was recorded before
  provider readback, private `component-attachments` bytes matched by checksum,
  safe response-header semantics were recorded, and cleanup returned
  `cleanupErrors=[]`.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-CLEAN-DOWNLOAD-PROVIDER-READBACK`. Production remains blocked for
  scanner/CDR provider execution, queue worker, provider-backed file scanning,
  durable cleanup scheduler/observability/runtime work, hosted runtime evidence,
  and operational override UI/runbook.
- Fresh verification passed: linked clean download proof
  `ARCH_UPLOAD_CLEAN_DOWNLOAD_PROOF=1 ARCH_UPLOAD_CLEAN_DOWNLOAD_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-clean-download-provider-postgres.ts`,
  focused route/governance/evidence/script matrix 5 files / 70 tests, scoped
  ESLint for the changed route/proof/test files, twelve-artifact JSON parse,
  expanded upload matrix 40 files / 216 tests, `bunx tsc --noEmit --pretty
  false`, and `git diff --check`.

### Iteration 33 - Cleanup Job Retry/Audit Proof

- Added `src/lib/uploads/cleanup-job.ts` with a reusable cleanup executor that
  records `cleanup_queued` before storage deletion, refuses unaudited deletes
  when queue-event persistence fails, records `cleanup_failed` for failed
  attempts, records `cleanup_succeeded` after retry success, summarizes
  dashboard-safe job metrics, and stores storage path hashes instead of raw
  object keys in cleanup event metadata.
- Added secret-gated `GET`/`POST /api/internal/upload-cleanup` as the cron-safe
  service-role wrapper. The route is `nodejs`, `force-dynamic`, accepts bounded
  limits, fails closed when `UPLOAD_CLEANUP_JOB_SECRET`/`CRON_SECRET` is missing
  or mismatched, and returns only sanitized cleanup summaries.
- Upgraded `scripts/prove-upload-cleanup-provider-postgres.ts` so linked proof
  now includes a real temporary upload asset retry/audit lane: first attempt
  records `cleanup_queued` + `cleanup_failed` and leaves the provider object
  present; the retry uses real Supabase Storage deletion, records
  `cleanup_succeeded`, verifies the object reads back missing, and reads back
  `cleanup_queued=2`, `cleanup_failed=1`, `cleanup_succeeded=1` with
  `rawStoragePathRecorded=false`.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-CLEANUP-JOB-RETRY-AUDIT-READBACK`. Production remains blocked for
  hosted scheduled TTL invocation, real dashboard emission, quota alerts,
  production backpressure hooks, exercised retention runbook, scanner/CDR
  provider/queue/file scanning, hosted runtime evidence, and operational
  override UI/runbook.
- Fresh verification passed: linked cleanup proof
  `ARCH_UPLOAD_CLEANUP_PROOF=1 ARCH_UPLOAD_CLEANUP_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-cleanup-provider-postgres.ts`
  with `failedChecks=[]` and `cleanupErrors=[]`; focused cleanup job/route/script
  matrix 3 files / 8 tests; scoped ESLint for the cleanup job/route/proof files.

### Iteration 34 - Cleanup Scheduler Config

- Added Vercel Cron source config in `vercel.json` for daily
  `/api/internal/upload-cleanup` invocation on the five-field schedule
  `0 3 * * *`.
- Hardened cleanup route authorization so the Vercel-native `CRON_SECRET`
  bearer token is accepted even when the manual/internal
  `UPLOAD_CLEANUP_JOB_SECRET` fallback is also configured.
- Extended `scripts/check-vercel-env-readiness.ts` with a scheduled-jobs group
  that requires `CRON_SECRET`; overall Vercel env readiness now fails if the
  cron secret name is absent.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-CLEANUP-SCHEDULER-CONFIG-LOCAL`. Production remains blocked for
  observed hosted cleanup invocation, real dashboard emission, quota alerts,
  production backpressure hooks, exercised retention runbook, scanner/CDR
  provider/queue/file scanning, hosted runtime evidence, and operational
  override UI/runbook.
- Fresh verification passed: focused cleanup cron config/route/env-readiness
  matrix 4 files / 12 tests; scoped ESLint for the cron config route/readiness
  files; twelve-artifact JSON parse; `bunx tsc --noEmit --pretty false`.

### Iteration 35 - Upload Operational Telemetry Seam

- Added `src/lib/uploads/operational-telemetry.ts` as an injectable,
  non-blocking upload operations telemetry seam.
- `runUploadCleanupJob` now emits one path-safe cleanup run event with status,
  severity, retry-after guidance, cleanup counts, audit write failure count,
  failed bucket count, and alert codes; `/api/internal/upload-cleanup` reaches
  the same emitter from the cron route path.
- `reserveUploadAdmission` now emits path-safe operational telemetry for
  actor/client request-rate denials, actor quota denials, and workspace
  active-upload backpressure denials without client IPs or storage paths.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-OPERATIONAL-TELEMETRY-SEAM-LOCAL`. Production remains blocked for
  observed hosted cleanup invocation, real dashboard emission, quota alert
  delivery, production backpressure hooks, exercised retention runbook,
  scanner/CDR provider/queue/file scanning, hosted runtime evidence, and
  operational override UI/runbook.
- Fresh verification passed: focused cleanup/admission telemetry matrix 3 files
  / 16 tests; scoped ESLint for telemetry/cleanup/admission files and focused
  tests; release-gate regression 1 file / 2 tests; `bunx tsc --noEmit --pretty
  false`.

### Iteration 36 - Attachment Status UX

- Preserved upload response scan metadata in Add Component draft attachment
  state.
- Updated draft attachment rows to render non-color scan, review, and download
  status badges plus blocked-state copy. Approval/download actions remain
  unavailable unless scanner-clean and Library review/current approval exist.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-ATTACHMENT-STATUS-UX-LOCAL`. Production scanner/download gates
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
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-SCAN-JOB-RUNNER-LOCAL`. Production remains blocked for real
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
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-SCAN-OVERRIDE-ROUTE-LOCAL`. Production remains blocked for real
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
- Updated `evidence/upload-release-gates.json` so
  `UPLOAD-GATE-OPERATIONAL-TELEMETRY-SEAM-LOCAL` covers cleanup, admission, and
  scan-job telemetry. Production remains blocked for real dashboard emission,
  quota alert delivery, production backpressure hooks, and retention runbook
  exercise.
- Fresh verification passed: scan telemetry/release-gate matrix 4 files / 19
  tests; scoped ESLint for operational telemetry, scan job, focused tests, and
  release-gate test; twelve-artifact upload evidence JSON parse; `bunx tsc
  --noEmit --pretty false`.

### Iteration 40 - Upload Operations Runbook Local Drill

- Added `scripts/prove-upload-operations-runbook-local.ts` to generate a
  provider-free local proof for the Orphan Cleanup Backlog and Scan Backlog
  operational paths.
- The drill simulates a cleanup provider-delete failure, verifies blocked retry
  guidance, retries successfully with `cleanup_queued=2`, `cleanup_failed=1`,
  and `cleanup_succeeded=1`, records one clean scan result plus one
  `failed_transient` download failure, and verifies telemetry/report output does
  not expose raw storage paths.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-OPERATIONS-RUNBOOK-DRILL-LOCAL`. Production remains blocked for
  observed hosted cleanup invocation, real dashboard emission, quota alert
  delivery, production backpressure hooks, production retention runbook
  exercise, scanner/CDR provider execution, deployed queue worker proof,
  provider-backed file scanning proof, hosted runtime evidence, and
  operator-facing override UI/runbook rehearsal.
- Fresh verification passed: local operations runbook proof script; runbook
  proof tests 2 files / 4 tests; release-gate/runbook proof matrix 3 files / 6
  tests; final upload operations matrix 9 files / 37 tests; scoped ESLint for
  the upload operations proof/script/route/service/test files; thirteen-artifact
  upload evidence JSON parse; `bunx tsc --noEmit --pretty false`; `git diff
  --check`.

### Iteration 41 - Upload Scan Worker Route Local Source Proof

- Added `src/app/api/internal/upload-scan/route.ts` as a Node/dynamic internal
  scan worker route using the same fail-closed bearer-secret pattern as upload
  cleanup. It accepts `CRON_SECRET` or `UPLOAD_SCAN_JOB_SECRET`, creates the
  service-role scan-job client, lists pending/retryable finalized attachment
  assets, downloads provider bytes, and records checksum-bound scanner results.
- Added `src/lib/uploads/policy-scanner.ts` as a local source-proof scanner for
  clean PDF/XLS/XLSX fixtures, EICAR signature detection, active-content
  rejection, unsupported types, and empty-file permanent failure. This is not a
  replacement for a real AV/CDR provider.
- Hardened the scan storage byte adapter to accept cross-realm
  `ArrayBufferView` downloads, then source-configured `/api/internal/upload-scan`
  as a daily Vercel Cron job in `vercel.json`.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-SCAN-WORKER-ROUTE-LOCAL`. Production remains blocked for observed
  hosted scan worker invocation, real scanner/CDR provider execution,
  provider-backed file scanning, and operator-facing override UI/runbook
  rehearsal.
- Fresh verification passed: scan worker route/config/release-gate matrix 4
  files / 13 tests; scoped ESLint for the route, policy scanner, byte adapter,
  cron config, and focused tests; thirteen-artifact upload evidence JSON parse;
  `bunx tsc --noEmit --pretty false`; `git diff --check`.

### Iteration 42 - ClamD Scanner Provider Source Protocol

- Added `src/lib/uploads/clamd-scanner.ts` with an opt-in
  `UPLOAD_SCAN_PROVIDER=clamd` scanner provider.
- The provider implements ClamD INSTREAM TCP framing with `zINSTREAM`, 4-byte
  chunk lengths, a zero-length terminator, timeout handling, OK/infected,
  stream-limit, and unexpected-reply result mapping, and path-safe scanner
  metadata.
- Added fake-ClamD TCP tests covering clean, EICAR `FOUND`, stream-limit, and
  configured-provider selection. The internal scan worker still falls back to
  the local policy scanner unless `UPLOAD_SCAN_PROVIDER=clamd` is configured.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-CLAMD-SCANNER-PROVIDER-LOCAL`. Production remains blocked for
  live scanner/CDR service execution and provider-backed file scanning proof.
- Fresh verification passed: ClamD scanner provider/release-gate matrix 5 files
  / 17 tests; scoped ESLint for ClamD provider, scan worker route, policy
  scanner, byte adapter, cron config, release gate, and focused tests;
  final focused scanner/operations matrix 12 files / 47 tests; thirteen-artifact
  upload evidence JSON parse; `bunx tsc --noEmit --pretty false`; `git diff
  --check`.

### Iteration 43 - Upload Scan Override Operator Surface

- Added `src/lib/uploads/scan-override-review.ts` and
  `/workshop/settings/scan-overrides` as a platform-admin review surface for
  failed/permanently failed and unsupported component-attachment scan outcomes.
  The queue helper checks `ceo`/`admin` role before constructing a service-role
  client and selects only review metadata, not storage paths.
- Added `UploadScanOverridePanel` to submit the existing checksum-bound
  `/api/component-library/attachments/scan-override` contract, keep the expected
  SHA-256 readonly, require operator reason/expiry, show generic failure copy,
  and avoid echoing asset ids or private paths on errors.
- Updated Workshop Settings platform navigation to expose Scan overrides for
  platform admins only. Updated component attachment download brokering to use
  the shared scan gate, allowing finalized clean assets and unexpired
  `override_approved` assets while leaving expired, pending, infected, and
  unsupported states blocked.
- Extended the local upload operations runbook proof with a Scan Override Review
  rehearsal that parses the hosted API payload shape and records
  `override_approved` as the target status without recording raw storage paths.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-SCAN-OVERRIDE-UI-RUNBOOK-LOCAL`. Production remains blocked for
  observed hosted cleanup invocation, observed hosted scan worker invocation,
  real dashboard emission, quota alert delivery, production backpressure hooks,
  production retention runbook exercise, hosted runtime evidence, live
  scanner/CDR service execution, and provider-backed file scanning.
- Fresh verification passed: local operations runbook script; focused scan
  override UI/runbook matrix 6 files / 22 tests; combined scan override/route
  release matrix 8 files / 29 tests; scoped ESLint for touched source/tests;
  `bunx tsc --noEmit --pretty false`; upload release-gate/runbook JSON parse.

### Iteration 44 - Upload Operations Dashboard Query Local Proof

- Added `src/lib/uploads/operations-dashboard.ts` as a server-only,
  platform-admin upload operations metrics query. It reads through a service-role
  client only after the same `ceo`/`admin` role gate used by override
  operations.
- The query aggregates upload outcomes by surface, content-type counts, size
  buckets, scan queue backlog, blocked scan counts, scan provider counts,
  cleanup backlog, retention cutoffs, cleanup event counts, and
  download/override/backpressure/scan-failure event counts.
- The helper intentionally selects only aggregate-safe fields from
  `upload_assets`, `upload_sessions`, and `upload_events`: no storage paths,
  filenames, metadata, signed-token fields, or provider object paths.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-OPERATIONS-DASHBOARD-QUERY-LOCAL`. Production remains blocked
  for observed hosted cleanup invocation, observed hosted scan worker
  invocation, real hosted dashboard emission, quota alert delivery, production
  backpressure hooks, production retention runbook exercise, hosted runtime
  evidence, and live scanner/CDR service execution.
- Fresh verification passed: operations dashboard query test 1 file / 4 tests.

### Iteration 45 - Upload Scan Worker Provider Readback Proof

- Added `scripts/prove-upload-scan-worker-provider-postgres.ts` as an opt-in
  linked-provider scan worker proof. It is gated by
  `ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF=1`, can load scoped credentials from
  `ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF_ENV_FILE`, and refuses any Supabase
  project except Archestimator project `ebxxqidacheyapmmzavr`.
- The proof creates a temporary auth user/workspace fixture, uploads clean PDF
  bytes into the private `component-attachments` bucket, records a pending
  finalized component-attachment upload asset through `record_upload_asset`,
  verifies `listUploadScanJobRecords` sees the target asset, and runs
  `runUploadScanJob` through the real Supabase storage adapter, local policy
  scanner, and checksum-bound result writer.
- The generated evidence reads back `scan_status=clean`, `scan_clean` event
  persistence, and upload scan operational telemetry. The durable JSON records
  only shape/presence evidence for provider ids and paths
  (`rawStoragePathRecorded=false`; no UUIDs), then cleans up the temporary
  storage object/workspace/user fixture.
- Added focused proof script and evidence tests:
  `tests/vitest/upload-scan-worker-provider-proof-script.test.ts` and
  `tests/vitest/upload-scan-worker-provider-proof.test.ts`.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-SCAN-WORKER-PROVIDER-READBACK`. The production scanner blocker is
  narrowed to observed hosted scan worker invocation and live scanner/CDR
  service execution.
- Fresh verification passed:
  `ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF=1 ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-scan-worker-provider-postgres.ts`;
  focused proof matrix 2 files / 6 tests; release/proof matrix 3 files / 8
  tests; scoped ESLint for the proof script/tests; upload release-gate and scan
  worker proof JSON parse.

### Iteration 46 - Upload Operations Dashboard Settings Surface

- Added `src/components/workshop/UploadOperationsDashboardPanel.tsx` as a
  compact path-safe operator surface for the existing dashboard snapshot. It
  renders the selected window, upload outcomes by surface, scan queue and
  blocked counts, scan provider counts, cleanup backlog/events, download/scan
  override/backpressure counters, and audit retention without raw storage paths,
  filenames, metadata, signed tokens, or provider object paths.
- Added `/workshop/settings/upload-operations` as a platform-admin settings
  page. It calls `readUploadOperationsDashboardSnapshot` server-side, uses a
  bounded `windowHours` selector, preserves generic unauthorized/error copy, and
  renders the dashboard panel only for authorized platform admins.
- Updated `WorkshopSettingsModalContentView` to expose Upload operations in the
  platform Settings rail alongside Scan overrides.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-OPERATIONS-DASHBOARD-SURFACE-LOCAL`. Production remains blocked
  for observed hosted scheduled cleanup, real hosted dashboard emission, quota
  alert delivery, production backpressure hooks, production retention runbook
  exercise, hosted runtime proof, observed hosted scan worker invocation, and
  live scanner/CDR service execution.
- Fresh verification passed: upload dashboard query/page/settings matrix 3 files
  / 11 tests; dashboard/release matrix 4 files / 13 tests; scoped ESLint for the
  dashboard query, page, panel, settings rail, focused tests, and release-gate
  test; upload release-gate/scan-worker/runbook JSON parse.

### Iteration 47 - Upload Operational Alert Webhook Sink Local Proof

- Extended `src/lib/uploads/operational-telemetry.ts` with an opt-in,
  non-blocking upload operations alert sink. Warning and critical telemetry can
  be delivered to an HTTPS webhook when
  `UPLOAD_OPERATIONS_ALERTS_ENABLED=1`,
  `UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL`, and
  `UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN` are configured.
- The alert payload is sanitized for operational use: it carries event,
  severity, status, surface, workspace id, quota/backpressure details, cleanup
  backlog counts, scan queue/failure counts, retry hints, and alert codes, but
  omits storage paths, filenames, tokens, client IPs, and cleanup/scan run ids.
- Updated `scripts/check-vercel-env-readiness.ts` so Vercel env readiness tracks
  upload alert webhook names separately from the core closed-beta runtime and
  scheduled-job gates. General Vercel readiness still does not claim alert
  delivery.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-OPERATIONS-ALERT-WEBHOOK-SINK-LOCAL`. Production remains blocked
  for observed hosted scheduled cleanup, observed hosted scan worker invocation,
  real hosted dashboard emission, observed alert delivery, production
  backpressure hooks, production retention runbook exercise, hosted runtime
  proof, and live scanner/CDR service execution.
- Fresh verification passed: operational alert/admission/readiness matrix 3
  files / 16 tests; alert/admission/readiness/release matrix 4 files / 18
  tests; scoped ESLint for the operational telemetry, admission-control, Vercel
  readiness script, focused tests, and release-gate test; upload release-gate
  and scan-worker proof JSON parse.

### Iteration 48 - Direct Upload Reserved-Session Backpressure Local Proof

- Added `readActiveUploadSessionCapacity` in
  `src/lib/uploads/direct-upload-records.ts` to count unexpired reserved
  `upload_sessions` for a workspace, actor, and upload surface using the
  existing upload-domain records.
- Updated `/api/component-library/attachments/direct-upload` so signed
  single-part and TUS session creation checks durable reserved-session capacity
  before issuing provider credentials. Actor and workspace caps return `429`
  with `Retry-After`, emit path-safe quota/backpressure telemetry, and stop
  before provider signed URL/TUS creation or `create_upload_session`.
- Updated the local operations runbook proof note to distinguish local
  backpressure drills from observed hosted backpressure exercise.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-DIRECT-UPLOAD-RESERVED-SESSION-BACKPRESSURE-LOCAL`. Production
  remains blocked for observed hosted scheduled cleanup, observed hosted scan
  worker invocation, real hosted dashboard emission, observed alert delivery,
  observed hosted backpressure exercise, production retention runbook exercise,
  hosted runtime proof, and live scanner/CDR service execution.
- Fresh verification passed: signed direct-session backpressure/admission
  matrix 2 files / 16 tests; direct-session/release/runbook matrix 5 files / 22
  tests; scoped ESLint for direct upload records, direct-upload route, runbook
  script, focused tests, and release-gate test; release-gate/runbook JSON parse;
  `bunx tsc --noEmit --pretty false`.

### Iteration 49 - Atomic Direct Upload Session Capacity Repair

- Reviewer pass found the Iteration 48 route-level durable session check was
  still check-then-create under concurrency: simultaneous signed/direct-upload
  create requests could all observe under-cap `upload_sessions` before inserting
  reservations.
- Added forward-only migration
  `20260627151000_upload_direct_session_atomic_capacity.sql`, replacing
  service-role `create_upload_session` with the same signature/grants plus
  component-attachment reserved-session capacity enforcement under a
  workspace/surface `pg_advisory_xact_lock`. The count and reserved-session
  insert now happen in the same locked transaction path.
- Kept the route-level capacity read as an advisory fast-fail for already-full
  actors/workspaces before provider credential creation, and mapped atomic RPC
  capacity denials back to the same `429`/`Retry-After` path-safe telemetry
  response.
- Updated release-gate evidence to describe the atomic RPC gate instead of
  overclaiming the route precheck as concurrency-safe hosted proof. Hosted
  backpressure exercise and alert/dashboard observation remain production
  blockers.
- Applied `20260627151000_upload_direct_session_atomic_capacity.sql` to the
  linked Archestimator Supabase project. A post-apply
  `supabase db push --linked --dry-run` reported `Remote database is up to
  date`; a later `supabase migration list --linked` attempt hit Supabase
  temp-role auth/circuit-breaker retries, but Supabase connector read-only SQL
  confirmed `migration_recorded=true` and live `create_upload_session` function
  flags for `pg_advisory_xact_lock`, the `upload-session-capacity` namespace,
  actor/workspace cap checks, and actor/workspace capacity errors.
- Fresh verification passed: signed direct-session backpressure/admission
  matrix 2 files / 18 tests; direct-session/release matrix 3 files / 20 tests;
  scoped ESLint; `bunx tsc --noEmit --pretty false`; release-gate JSON parse;
  `git diff --check`; linked migration apply; linked post-apply dry-run;
  Supabase connector read-only SQL.

## Iteration 49 - provider concurrency proof and hosted dry-run harness (2026-06-27)

### Hypothesis

Static migration-string checks and route mocks are not enough evidence for the
atomic direct-upload capacity claim. The plan also needs a safe way to collect
hosted upload cleanup/scan invocation evidence without accidentally deleting
storage objects or writing scan/cleanup state during proof gathering.

### Actions

- Added secret-gated `dryRun=1` support to `/api/internal/upload-cleanup` and
  `/api/internal/upload-scan`.
  - Cleanup dry-run reads cleanup candidates and returns the same path-safe
    planner/storage/audit/operational summary shape with zero storage removals
    and zero cleanup audit writes.
  - Scan dry-run reads pending/retryable scan queue records and returns a
    path-safe queue summary with zero storage downloads, zero scanner provider
    calls, and zero scan-result writes.
  - All internal upload operation responses now carry no-store cache headers.
- Added `scripts/verify-hosted-upload-operations.ts`.
  - Without secrets it probes hosted cleanup/scan dry-run URLs for
    fail-closed/no-store behavior.
  - With scoped bearer secrets it can collect authenticated hosted dry-run proof
    without recording the secrets and without mutating upload state.
  - It explicitly does not claim live scanner/CDR execution, real alerts,
    dashboard observation, hosted backpressure, retention-runbook completion, or
    hosted runtime proof.
- Added `scripts/prove-upload-session-capacity-provider-postgres.ts`.
  - The script is opt-in, project-ref guarded to `ebxxqidacheyapmmzavr`, uses
    temporary workspace/user fixtures, omits raw IDs/paths/tokens from evidence,
    and cleans up fixtures.
  - It fires 8 parallel same-actor `create_upload_session` RPC attempts and 8
    parallel same-workspace/different-actor attempts against the linked provider.
- Updated release-gate evidence/tests to treat atomic capacity as provider-proven
  local/provider evidence, not a production blocker, while keeping observed
  hosted backpressure as the production blocker.
- Removed the stale superseded `bunx tsc --noEmit --pretty false` exit-2 entry
  from the release-gate snapshot; later/current typechecks are green.

### Evidence

- Linked provider concurrency proof:
  - `ARCH_UPLOAD_SESSION_CAPACITY_PROOF=1 ARCH_UPLOAD_SESSION_CAPACITY_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-session-capacity-provider-postgres.ts`
  - Passed for project `ebxxqidacheyapmmzavr`.
  - Same-actor scenario: 8 attempts, 3 admitted, 3 reserved sessions read back,
    5 `active_actor` capacity rejections, 0 other errors.
  - Same-workspace scenario: 8 attempts, 6 admitted, 6 reserved sessions read
    back, 2 `active_workspace` capacity rejections, 0 other errors.
  - `failedChecks=[]`, `cleanupErrors=[]`.
  - Evidence file: `evidence/upload-session-capacity-provider-proof.json`.
- Focused regression matrix:
  - `bunx vitest run tests/vitest/upload-cleanup-route.test.ts tests/vitest/upload-scan-route.test.ts tests/vitest/hosted-upload-operations-proof-script.test.ts tests/vitest/upload-session-capacity-provider-proof-script.test.ts tests/vitest/upload-session-capacity-provider-proof.test.ts tests/vitest/upload-release-gates.test.ts tests/vitest/upload-signed-route.test.ts tests/vitest/upload-abuse-caps.test.ts --maxWorkers=1`
  - 8 files / 40 tests passed.
- Scoped lint:
  - `bunx eslint src/app/api/internal/upload-cleanup/route.ts src/app/api/internal/upload-scan/route.ts scripts/verify-hosted-upload-operations.ts scripts/prove-upload-session-capacity-provider-postgres.ts src/lib/uploads/direct-upload-records.ts src/app/api/component-library/attachments/direct-upload/route.ts tests/vitest/upload-cleanup-route.test.ts tests/vitest/upload-scan-route.test.ts tests/vitest/hosted-upload-operations-proof-script.test.ts tests/vitest/upload-session-capacity-provider-proof-script.test.ts tests/vitest/upload-session-capacity-provider-proof.test.ts tests/vitest/upload-release-gates.test.ts tests/vitest/upload-signed-route.test.ts tests/vitest/upload-abuse-caps.test.ts`
  - No lint errors.
- `bunx tsc --noEmit --pretty false` exited 0.
- Upload evidence JSON parse passed for release gates, session-capacity provider
  proof, cleanup proof, scan-worker proof, and clean-download proof.

### Result

The direct-upload reserved-session capacity claim is now backed by live
concurrent Postgres/PostgREST provider proof, not only static SQL inspection and
route mocks. Production remains blocked for observed hosted scheduled cleanup,
observed hosted scan worker invocation, live scanner/CDR service execution, real
hosted dashboard emission, observed alert delivery, observed hosted backpressure
exercise, production retention runbook exercise, and hosted runtime proof.

## Iteration 50 - live ClamD scanner proof harness (2026-06-27)

### Hypothesis

The remaining live scanner/CDR blocker cannot be closed from this session
because no `UPLOAD_SCAN_PROVIDER=clamd` live service configuration is present,
but the plan can still be advanced by making the live scanner proof executable,
sanitized, and regression-covered.

### Actions

- Added `scripts/prove-upload-clamd-live.ts`.
  - The script is opt-in through `ARCH_UPLOAD_CLAMD_LIVE_PROOF=1`.
  - It refuses live proof unless `UPLOAD_SCAN_PROVIDER=clamd`.
  - It scans generated clean and EICAR fixtures through the existing ClamD
    INSTREAM provider.
  - It requires clean-file success and EICAR infection detection.
  - It writes sanitized evidence without raw network targets or fixture names.
- Added `tests/vitest/upload-clamd-live-proof-script.test.ts` with a fake
  ClamD-compatible TCP service covering clean/EICAR pass behavior, EICAR
  failure behavior, opt-in/refusal markers, and sanitization.
- Updated `upload-release-gates.json` and `upload-release-gates.test.ts` with
  `UPLOAD-GATE-CLAMD-LIVE-PROOF-HARNESS-LOCAL`, explicitly leaving live
  scanner/CDR execution as a production blocker until the script runs against a
  real service.

### Evidence

- `bunx vitest run tests/vitest/upload-clamd-live-proof-script.test.ts --maxWorkers=1`
  - 1 file / 3 tests passed.
- `bunx vitest run tests/vitest/upload-clamd-live-proof-script.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
  - 2 files / 5 tests passed.
- `bunx eslint scripts/prove-upload-clamd-live.ts tests/vitest/upload-clamd-live-proof-script.test.ts tests/vitest/upload-release-gates.test.ts`
  - No lint errors.
- `bunx tsc --noEmit --pretty false`
  - No TypeScript errors.
- Upload evidence JSON parse and `git diff --check` passed.

### Result

The live ClamD scanner proof path is now available and locally regression
covered. Production remains blocked for observed hosted scan worker invocation
and actual live scanner/CDR service execution because this session has no live
ClamD configuration and no hosted scan-worker observation.

## Iteration 51 - hosted upload runtime proof harness (2026-06-27)

### Hypothesis

The hosted runtime blocker cannot be closed without a deployed route invocation,
but the repo can provide a safe, secret-gated proof surface for body-probe,
memory, concurrency, route-duration, and storage-latency observations.

### Actions

- Added `/api/internal/upload-runtime`.
  - The route is `runtime = "nodejs"`, `force-dynamic`, no-store, and
    bearer-secret gated by `UPLOAD_RUNTIME_PROOF_SECRET` or `CRON_SECRET`.
  - It fails closed before creating a service-role client when unconfigured,
    unauthorized, or asked to read an oversized body probe.
  - Authenticated GET returns sanitized Node runtime, configured limit facts,
    memory snapshots, and Supabase Storage bucket-latency status.
  - Authenticated POST reads only bounded probe bodies and returns byte counts
    without echoing uploaded bytes.
- Added `scripts/verify-hosted-upload-runtime.ts`.
  - It collects hosted fail-closed proof without secrets.
  - With a scoped bearer secret, it runs authenticated runtime, body, and
    parallel reachability probes without recording the secret.
  - It only marks `productionProofReady=true` when authenticated probes pass and
    hosted configured limit facts are present in the route response.
- Added route/script tests and updated release-gate evidence with
  `UPLOAD-GATE-HOSTED-RUNTIME-PROOF-HARNESS-LOCAL`.

### Evidence

- `bunx vitest run tests/vitest/upload-runtime-route.test.ts tests/vitest/hosted-upload-runtime-proof-script.test.ts --maxWorkers=1`
  - 2 files / 10 tests passed.
- `bunx vitest run tests/vitest/upload-runtime-route.test.ts tests/vitest/hosted-upload-runtime-proof-script.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1`
  - 3 files / 12 tests passed.
- `bunx eslint src/app/api/internal/upload-runtime/route.ts scripts/verify-hosted-upload-runtime.ts tests/vitest/upload-runtime-route.test.ts tests/vitest/hosted-upload-runtime-proof-script.test.ts tests/vitest/upload-release-gates.test.ts`
  - No lint errors.
- `bunx tsc --noEmit --pretty false`
  - No TypeScript errors.
- Upload evidence JSON parse and `git diff --check` passed.

### Result

Hosted runtime proof now has an executable route and verifier harness. Production
remains blocked until the route is deployed and authenticated hosted
body-size/memory/duration/concurrency/storage-latency observations are collected
from the real runtime.

## Iteration 52 - upload production proof env preflight (2026-06-27)

### Hypothesis

The hosted/live production blockers still require deployed route and live
provider observations, but the repo can fail closed earlier by checking that the
required Vercel env names for those proof runs are present before operators run
the hosted scanners and runtime harnesses.

### Actions

- Extended `scripts/check-vercel-env-readiness.ts` with separate hosted/live
  upload proof groups.
- Kept general `vercelEnvReady` tied to closed-beta runtime plus `CRON_SECRET`.
- Added stricter `uploadProductionProofReady`, requiring `CRON_SECRET`, upload
  alert webhook env names, `UPLOAD_RUNTIME_PROOF_SECRET`, hosted runtime
  configured-limit fact names, and live ClamD scanner service env names.
- Updated `upload-release-gates.json` with
  `UPLOAD-GATE-PRODUCTION-PROOF-ENV-PREFLIGHT-LOCAL` while preserving the
  production blockers for hosted cleanup/scan/runtime observations, alert
  delivery, dashboard/backpressure/runbook exercises, and real live scanner/CDR
  proof.

### Evidence

- `bunx vitest run tests/vitest/vercel-env-readiness-script.test.ts tests/vitest/upload-release-gates.test.ts tests/vitest/upload-cleanup-cron-config.test.ts tests/vitest/upload-operational-alerts.test.ts --maxWorkers=1`
  - 4 files / 17 tests passed.
- `bunx eslint scripts/check-vercel-env-readiness.ts tests/vitest/vercel-env-readiness-script.test.ts tests/vitest/upload-release-gates.test.ts tests/vitest/upload-cleanup-cron-config.test.ts tests/vitest/upload-operational-alerts.test.ts`
  - No lint errors.
- `bunx tsc --noEmit --pretty false`
  - No TypeScript errors.
- Upload evidence JSON parse and `git diff --check` passed.

### Result

Hosted/live upload production proof now has a variable-name readiness preflight.
Production remains blocked because env-name readiness does not prove secret
values, hosted route execution, alert delivery, dashboard observation, live
scanner reachability, or runtime behavior.

## Iteration 53 - hosted no-secret proof route observation (2026-06-27)

### Hypothesis

Even without deployment authority or hosted secrets, no-secret hosted proof
probes can safely establish whether the internal proof routes are visible on the
current public deployment and fail closed with the expected no-store responses.

### Actions

- Ran `scripts/verify-hosted-upload-runtime.ts` against
  `https://www.archestimator.com` without a bearer secret and wrote
  `evidence/upload-hosted-runtime-fail-closed-proof.json`.
- Ran `scripts/verify-hosted-upload-operations.ts` against
  `https://www.archestimator.com` without bearer secrets and wrote
  `evidence/upload-hosted-operations-fail-closed-proof.json` plus the markdown
  summary.
- Updated `upload-release-gates.json` with a separate `hostedEvidence` section
  for these read-only hosted observations and updated blocker wording to avoid
  implying the proof routes are deployed.

### Evidence

- `OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-hosted-runtime-fail-closed-proof.json bun run scripts/verify-hosted-upload-runtime.ts`
  - Exited 1 after writing evidence: `/api/internal/upload-runtime` returned
    `404` with public cache headers; `productionProofReady=false`.
- `OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-hosted-operations-fail-closed-proof.json MARKDOWN_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-hosted-operations-fail-closed-proof.md bun run scripts/verify-hosted-upload-operations.ts`
  - Exited 1 after writing evidence: `/api/internal/upload-cleanup?limit=1&dryRun=1`
    and `/api/internal/upload-scan?limit=1&dryRun=1` returned `404` with public
    cache headers; `productionProofReady=false`.
- `bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/hosted-upload-operations-proof-script.test.ts tests/vitest/hosted-upload-runtime-proof-script.test.ts --maxWorkers=1`
  - 3 files / 14 tests passed.
- `bunx eslint tests/vitest/upload-release-gates.test.ts scripts/verify-hosted-upload-operations.ts scripts/verify-hosted-upload-runtime.ts tests/vitest/hosted-upload-operations-proof-script.test.ts tests/vitest/hosted-upload-runtime-proof-script.test.ts`
  - No lint errors.
- `bunx tsc --noEmit --pretty false`
  - No TypeScript errors.
- Upload evidence JSON parse and `git diff --check` passed.

### Result

The current public deployment has not been observed serving the hosted upload
proof routes. Production remains blocked for deployed hosted cleanup/scan/runtime
observations, alert delivery, dashboard/backpressure/runbook exercises, and live
scanner/CDR proof.

## Stop Condition

Stop only when the full objective is proven complete, a strict external blocker
prevents meaningful progress after non-blocked work is exhausted, or the user
explicitly stops/cancels. Do not mark the active Codex goal complete until a
requirement-by-requirement completion audit proves all required implementation,
validation, review, QA, and archival gates.

## Iteration 54 - production evidence bundle checker (2026-06-27)

- Goal: Reduce false-readiness risk for the remaining production upload blockers
  by adding a single fail-closed checker for the required hosted/live evidence
  bundle, without deploying or mutating production.
- Added `scripts/check-upload-production-proof-evidence.ts`, which validates
  seven production evidence classes: hosted cleanup/scan authenticated dry-run
  proof, hosted runtime authenticated body/concurrency/storage-latency proof,
  live ClamD scanner proof, observed hosted alert delivery, observed hosted
  dashboard metrics, observed hosted backpressure exercise, and production
  retention runbook exercise.
- Added `tests/vitest/upload-production-proof-evidence-checker.test.ts` for the
  checker. The test matrix proves the checker fails closed against the current
  incomplete plan evidence, passes only with a synthetic complete hosted/live
  bundle, treats malformed/partial artifacts as not ready, and writes sanitized
  output without bearer tokens.
- Ran the checker against current evidence:
  `OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-production-proof-evidence-check.json bun run scripts/check-upload-production-proof-evidence.ts`.
  It intentionally exited `1` with `productionProofReady=false`,
  `required=7`, `passed=0`, `failed=2`, `missing=5`, `invalid=0`.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-PRODUCTION-EVIDENCE-BUNDLE-CHECKER-LOCAL` while preserving
  `production.status=blocked`. The checker local pass is source/harness proof
  only; it does not supply the missing hosted/live evidence.
- Fresh verification passed: production evidence checker/release-gate matrix
  (`2 files / 8 tests`), scoped ESLint for the checker and release-gate tests,
  `bunx tsc --noEmit --pretty false`, targeted upload evidence JSON parse, and
  `git diff --check`.
- Result: production readiness is harder to accidentally overclaim. Production
  remains blocked until the checker receives passing hosted/live evidence for
  cleanup/scan/runtime, live scanner/CDR, alert delivery, dashboard observation,
  hosted backpressure, and retention runbook exercise.

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
  It intentionally exited `1` with `passed=false`,
  `proofBoundary=hosted-alert-delivery-proof-skipped`, `delivered=false`,
  secret and webhook URL redaction true, and payload path-safety unproven because
  no hosted delivery occurred.
- Regenerated `evidence/upload-production-proof-evidence-check.json`. It now
  intentionally exits `1` with `productionProofReady=false`, `required=7`,
  `passed=0`, `failed=3`, `missing=4`, and `invalid=0`. Failed artifacts are
  hosted operations, hosted runtime, and alert delivery; missing artifacts are
  live scanner, hosted dashboard, hosted backpressure, and retention runbook.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-ALERT-DELIVERY-PROOF-HARNESS-LOCAL` while preserving
  `production.status=blocked`.
- Fresh verification passed: alert proof/checker/release-gate matrix
  (`3 files / 13 tests`), scoped ESLint for the alert proof script/checker/tests,
  `bunx tsc --noEmit --pretty false`, targeted upload evidence JSON parse, and
  `git diff --check`.
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
  intentionally exits `1` with `productionProofReady=false`, `required=7`,
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
  intentionally exited `1` and wrote skipped fail-closed artifacts:
  `upload-dashboard-production-proof.json`,
  `upload-backpressure-production-proof.json`, and
  `upload-retention-runbook-production-proof.json`.
- Regenerated `evidence/upload-production-proof-evidence-check.json`. It now
  intentionally exits `1` with `productionProofReady=false`, `required=7`,
  `passed=0`, `failed=7`, `missing=0`, and `invalid=0`.
- Updated `evidence/upload-release-gates.json` with
  `UPLOAD-GATE-PRODUCTION-OBSERVATION-PROOF-HARNESSES-LOCAL` and kept
  `production.status=blocked`.
- Fresh verification passed: alert/observation/checker/release-gate matrix
  (`4 files / 17 tests`).
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
- Fresh verification passed: alert/observation/checker/release-gate matrix
  (`4 files / 18 tests`), scoped ESLint, targeted upload evidence JSON parse
  including the template, `bunx tsc --noEmit --pretty false`, and
  `git diff --check`.
- Result: future hosted observation capture now has a durable sanitized input
  contract, but no new hosted/live production proof was claimed.

### Iteration 59 - Production Proof Runbook

- Added `UPLOAD_PRODUCTION_PROOF_RUNBOOK.md` as the consolidated
  seven-artifact production proof collection checklist.
- The runbook maps `hostedUploadOperations`, `hostedUploadRuntime`,
  `liveScanner`, `alertDelivery`, `dashboardObservation`,
  `hostedBackpressure`, and `retentionRunbook` to their expected passing
  artifacts, safe collection commands, and proof-boundary strings.
- Updated `UPLOAD_PRODUCTION_OBSERVATIONS_RUNBOOK.md` to point operators to the
  full seven-artifact checklist for the broader production proof flow.
- Extended `tests/vitest/upload-production-proof-evidence-checker.test.ts` so
  the runbook is contract-checked against the production evidence checker and
  denied secret/path evidence strings.
- Updated `evidence/upload-release-gates.json` and release-gate tests with
  `UPLOAD-GATE-PRODUCTION-PROOF-RUNBOOK-LOCAL`, while keeping
  `production.status=blocked`.
- Fresh verification passed: production proof checker/observation/release-gate
  matrix (`3 files / 14 tests`), alert/observation/checker/release-gate matrix
  (`4 files / 19 tests`), scoped ESLint, targeted upload JSON parse,
  `bunx tsc --noEmit --pretty false`, and `git diff --check`.
- Result: production proof collection is now documented end to end for the seven
  required artifacts, but no hosted/live proof was claimed.

### Iteration 60 - Requirement Coverage Audit

- Added `scripts/check-upload-requirement-coverage.ts` to parse
  `04_REQUIREMENTS_SPECIFICATION.md` and verify every `UPLOAD-REQ-*` maps to
  release-gate local-pass or blocker evidence.
- Added `tests/vitest/upload-requirement-coverage-audit.test.ts` for current
  25-requirement coverage, missing mapping failure, unknown reference failure,
  and sanitized compact artifact output.
- Generated `evidence/upload-requirement-coverage-audit.json`; it reports
  `traceabilityReady=true`, `productionReady=false`, `requirements=25`,
  `mapped=25`, `missing=0`, `blocked=7`, and `unknownReferences=0`.
- Updated `evidence/upload-release-gates.json` and release-gate tests with
  `UPLOAD-GATE-REQUIREMENT-COVERAGE-AUDIT-LOCAL`, while keeping
  `production.status=blocked`.
- Fresh verification passed: requirement coverage audit/release-gate matrix
  (`2 files / 9 tests`), scoped ESLint, targeted upload JSON parse,
  `bunx tsc --noEmit --pretty false`, and `git diff --check`.
- Result: requirement-by-requirement release-gate traceability is now executable
  evidence, but no hosted/live production proof was claimed.

### Iteration 61 - Production Proof Bundle Refresh

- Refreshed `evidence/upload-production-proof-evidence-check.json` after the
  requirement coverage audit and release-gate timestamp update.
- The checker still exits 1 as expected and reports
  `productionProofReady=false`, `required=7`, `passed=0`, `failed=7`,
  `missing=0`, and `invalid=0`.
- Failed production proof keys remain `hostedUploadOperations`,
  `hostedUploadRuntime`, `liveScanner`, `alertDelivery`,
  `dashboardObservation`, `hostedBackpressure`, and `retentionRunbook`.
- Updated `evidence/upload-release-gates.json` local evidence and release-gate
  tests to record the refreshed fail-closed proof bundle while keeping
  `production.status=blocked`.
- Fresh verification passed: production proof checker/requirement
  coverage/release-gate matrix (`3 files / 14 tests`), scoped ESLint, targeted
  upload JSON parse, `bunx tsc --noEmit --pretty false`, and
  `git diff --check`.
- Result: fail-closed production proof evidence is current after traceability
  updates, but no hosted/live production proof was claimed.

### Iteration 62 - Hosted Deployment Readback Evidence

- Added `evidence/upload-hosted-deployment-readback.json` from read-only Vercel
  `list_deployments`, `get_deployment`, and production runtime log inspection.
- The artifact records production deployment
  `dpl_8ymooyEM51amXCJ7xNstAHEkTeGq` aliasing `www.archestimator.com` and
  `archestimator.com` at commit `8c611d1333210838f201b4c91deb74fe656f5902`.
- Current source `main` is
  `2ff0ddf308cbe8d4470cf483d350a596cd01b9e8`, the upload cleanup/scan/runtime
  proof routes are present locally, and the route commit `a6548ebfa` is after
  the production deployment commit.
- The artifact reports `passed=false`, `productionProofReady=false`,
  `hostedProofRoutesObservedDeployed=false`, no matching production runtime log
  entries for upload proof route queries in the inspected 24-hour window, and
  no production deployment attempted from this session.
- Updated `evidence/upload-release-gates.json`, the requirement coverage
  artifact, and release-gate tests with this hosted blocker evidence while
  keeping `production.status=blocked`.
- Fresh verification passed: upload release-gate/requirement coverage matrix
  (`2 files / 9 tests`), scoped ESLint, targeted upload JSON parse,
  `bunx tsc --noEmit --pretty false`, and `git diff --check`.
- Result: the hosted route blocker is now grounded in deployment readback, but
  no production deployment, authenticated route proof, live scanner, alert,
  dashboard, backpressure, or retention-runbook observation was claimed.

### Iteration 63 - Production Proof Runbook Deployment Preflight

- Updated `UPLOAD_PRODUCTION_PROOF_RUNBOOK.md` with a deployment readback
  preflight before authenticated hosted proof collection.
- The runbook now points to `evidence/upload-hosted-deployment-readback.json`
  and explicitly says that deployment preflight is not one of the seven passing
  production proof artifacts.
- It keeps production blocked while `hostedProofRoutesObservedDeployed=false`
  or `productionDeploymentPredatesUploadProofRoutes=true`, and warns not to
  deploy from a proof-collection session unless production deployment is
  explicitly authorized.
- Updated `evidence/upload-release-gates.json`, the requirement coverage
  artifact, and production proof checker tests to preserve that distinction.
- Fresh verification passed: production proof checker/release-gate/requirement
  coverage matrix (`3 files / 14 tests`), scoped ESLint, targeted upload JSON
  parse, `bunx tsc --noEmit --pretty false`, and `git diff --check`.
- Result: production proof operators now have the deployment-readback
  prerequisite in the runbook, but no production deployment or hosted/live proof
  was claimed.

## Proof Boundary

Current proof boundary: `local-plus-linked-provider-operation-proof`.

Linked-provider readback/dry-run proof is captured only for migration presence,
upload catalog/RLS shape, enum labels, function grants, public upload table
policies, known broad direct storage policy absence, provider migration ledger
parity, aggregate component-image reference counts, and `component-images`
bucket catalog/policy privacy state. Direct storage operation proof is captured
separately in `upload-storage-denial-proof.json` for anon/auth insert, update,
download, and delete attempts on the three upload buckets. Cleanup execution
proof is captured separately in `upload-cleanup-provider-proof.json` for
planner-approved temporary object cleanup and service-role before/after
readback plus persisted cleanup retry/audit events against a real temporary
upload asset (`cleanup_queued=2`, `cleanup_failed=1`, `cleanup_succeeded=1`, no
raw storage path recorded). Supabase signed single-part upload proof is captured separately in
`upload-signed-provider-proof.json` for signed URL issuance, token-only upload,
object metadata readback, and upload asset finalization. Signed app-route
session/finalization proof is captured separately in
`upload-signed-route-provider-proof.json`. Browser/client signed-direct
transport proof is captured in `tests/vitest/upload-component-attachment-client.test.ts`
and release-gate evidence. Supabase signed TUS resumable provider/session proof
is captured separately in `upload-tus-provider-proof.json`. Provider-backed
clean attachment download proof is captured separately in
`upload-clean-download-provider-proof.json`. Auth-token row-level proof, full
browser/manual proof beyond focused client transport tests, hosted runtime
proof, observed hosted cleanup invocation, real dashboard/alert/backpressure
runbook proof, real scanner/CDR worker execution, observed hosted scan worker
invocation, or production proof must still be labeled separately and cannot be
inferred from local tests, temporary-object provider proof, scanner RPC
state/readback proof, signed single-part provider proof, signed app-route
provider proof, signed TUS provider proof, clean download provider proof,
cleanup retry/audit provider proof plus local Vercel Cron source config,
provider-backed scan-worker storage readback proof in
`upload-scan-worker-provider-proof.json`, or the local operations runbook drill
in `upload-operations-runbook-local-proof.json`.
The operator scan override settings page and runbook rehearsal prove only local
source/DOM/API-contract behavior, not a hosted production override operation.
The upload operations dashboard query proves only a local path-safe query
artifact, and the upload operations settings page proves only local
source/DOM rendering of that snapshot, not hosted dashboard emission or alert
delivery. The upload operations alert webhook sink proves only local
source/unit behavior for sanitized, opt-in, non-blocking webhook delivery and
Vercel env-name readiness coverage; it does not prove a hosted webhook endpoint,
provider delivery, alert routing ownership, paging policy, or production
incident response. The alert delivery proof harness and current
`upload-alert-delivery-production-proof.json` artifact prove only that a
secret-safe hosted alert-delivery evidence path exists and fails closed locally;
the current artifact is not observed alert delivery and does not prove a hosted
2xx webhook delivery, alert routing ownership, paging policy, or production
incident response. The direct-upload reserved-session backpressure hook proves
local route/source behavior, local migration-contract coverage, linked provider
migration application, and linked provider concurrent `create_upload_session`
capacity enforcement; it does not prove hosted concurrent traffic behavior,
provider edge throttling, production traffic shape, or observed alert/dashboard
delivery for a live backpressure event. The hosted upload operations dry-run
harness proves only local/source/test readiness for safe hosted cleanup/scan
invocation probes; it does not prove hosted cron execution, scanner/CDR
execution, alert delivery, dashboard observation, hosted backpressure, retention
runbook completion, or hosted runtime limits. The secret-gated upload runtime
route and `scripts/verify-hosted-upload-runtime.ts` prove only local/source/test
readiness for collecting hosted runtime observations; they do not prove hosted
body-size, memory, duration, concurrency, or storage-latency behavior until run
against a deployed runtime with scoped secrets and configured limit facts.
The upload production env-name preflight proves only sanitized Vercel transcript
readiness for the needed cron, alert, hosted runtime proof, and live ClamD
scanner variable names; it does not prove secret values, hosted route execution,
alert delivery, live scanner reachability, dashboard observation, or production
runtime behavior. The read-only hosted no-secret probes prove only that the
current public deployment returned 404 for the internal proof routes at probe
time; they do not prove fail-closed route behavior, authenticated dry-run
behavior, scheduler invocation, scanner/CDR execution, alert delivery, dashboard
observation, backpressure traffic, or runtime limits. The production evidence
bundle checker proves only that the hosted/live proof artifacts are checked
together and fail closed when incomplete; its current failing report is not
production proof and does not replace any hosted/live observation. The
production proof runbook proves only operator-readiness for collecting the seven
hosted/live artifacts; it does not replace deployed-route, live-scanner, alert,
dashboard, backpressure, or retention-runbook observations. The requirement
coverage audit proves only release-gate traceability from the 25 plan
requirements to local-pass/blocker references; it does not prove production
readiness or replace any hosted/live observation. The
production observation proof harness proves only that sanitized operator
observations can be serialized into dashboard, backpressure, and retention
runbook evidence artifacts and fail closed by default; the current skipped
artifacts are not hosted observations and do not prove dashboard metrics,
backpressure traffic, hosted cron, cleanup retry behavior, or alert observation.
The local policy scanner
and `/api/internal/upload-scan` source route prove only the in-process worker
seam, not hosted worker invocation or real scanner/CDR engine execution. The
provider-backed scan-worker proof proves the Supabase Storage byte-download/readback
path only. The ClamD source provider proves protocol handling against a fake daemon only, and
`scripts/prove-upload-clamd-live.ts` proves only that a sanitized live-service
proof path exists until it is run with `ARCH_UPLOAD_CLAMD_LIVE_PROOF=1` against
the configured ClamD service; neither source proof nor harness proof proves a
live scanner service, scanner signatures, provider network reachability, or real
file scanning in production by itself.

## Remaining Risks

- Provider-backed direct storage denial is operation-proofed for the three upload
  buckets, but this does not prove scanner status, full browser/manual UX, or
  production runtime limits.
- Upload-domain migration presence and provider catalog shape are read back from
  the linked provider, but auth-token proof-script scenarios remain skipped.
- Estimate-row reference image asset finality is locally covered, but provider
  applied proof for the upload-domain validation RPC is not captured.
- New brokered component images use a private resolver, linked-provider
  aggregate scan found no persisted legacy public component-image URLs, and
  linked-provider catalog readback confirms `component-images` is private with no
  remaining storage policy references; direct storage operation proof now covers
  component-image anon/auth download/delete denial, and a non-empty publication
  snapshot migration exercise now proves legacy public publication image rows are
  classified for private-resolver backfill. The public-share private image
  renderer remains a separate platform/product design concern if future
  publication snapshots need to render private component images instead of
  omitting or backfilling legacy public URLs.
- Attachment downloads now have a fail-closed audited broker locally,
  approved/current attachment gating, linked-provider scanner RPC state/readback
  for temporary `upload_assets` rows, and linked-provider clean download
  readback proof. Cleanup scheduling is source-configured through Vercel Cron,
  a local operations runbook drill covers cleanup failure/retry, scan
  clean/transient paths, and scan override review, and an internal scan worker
  route is source-configured for Vercel Cron. A path-safe operations dashboard
  query and settings surface exist locally, and a non-blocking sanitized webhook
  alert sink exists locally. Durable direct-upload reserved-session
  backpressure hooks exist locally, but hosted cleanup/scan invocation has not
  been observed. Provider-backed scan-worker storage download/readback is
  proved, but live scanner/CDR service execution, real hosted dashboard
  emission, observed alert delivery, observed hosted backpressure exercise,
  production retention runbook exercise, and hosted runtime proof remain open.
- The current worktree has unrelated dirty estimate-row/chart/publication changes;
  current upload-slice typecheck is green, while an attempted broader lint pass
  previously encountered pre-existing React lint errors in dirty row/sheet files
  outside the upload slice.

## Follow-up Bugs / Plans

- None yet.
