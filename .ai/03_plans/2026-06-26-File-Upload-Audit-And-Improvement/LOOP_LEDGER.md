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

## Stop Condition

Stop only when the full objective is proven complete, a strict external blocker
prevents meaningful progress after non-blocked work is exhausted, or the user
explicitly stops/cancels. Do not mark the active Codex goal complete until a
requirement-by-requirement completion audit proves all required implementation,
validation, review, QA, and archival gates.

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
readback. Supabase signed single-part upload proof is captured separately in
`upload-signed-provider-proof.json` for signed URL issuance, token-only upload,
object metadata readback, and upload asset finalization. Signed app-route
session/finalization proof is captured separately in
`upload-signed-route-provider-proof.json`. Browser/client signed-direct
transport proof is captured in `tests/vitest/upload-component-attachment-client.test.ts`
and release-gate evidence. Auth-token row-level proof, full browser/manual proof
beyond focused client transport tests, hosted runtime proof, durable scheduled cleanup proof,
persisted cleanup audit/retry job proof, real scanner/CDR worker proof,
provider-backed file scanning/clean download proof, real resumable/TUS/multipart
provider flows, or production proof
must still be labeled separately and cannot be inferred from local tests,
temporary-object provider proof, scanner RPC state/readback proof, signed
single-part provider proof, or signed app-route provider proof.

## Remaining Risks

- Provider-backed direct storage denial is operation-proofed for the three upload
  buckets, but this does not prove scanner status, browser UX, resumable/TUS/
  multipart upload flows, or production runtime limits.
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
- Attachment downloads now have a fail-closed audited broker locally, and
  linked-provider scanner RPC state/readback is now proved for temporary
  `upload_assets` rows, but the scanner/CDR provider, queue worker,
  provider-backed file scanning, provider-backed clean download proof, durable
  cleanup jobs, persisted cleanup audit/retry execution,
  metrics/dashboard emission, hosted runtime proof, and real resumable/TUS/
  multipart provider portability remain open.
- The current worktree has unrelated dirty estimate-row/chart/publication changes;
  current upload-slice typecheck is green, while an attempted broader lint pass
  previously encountered pre-existing React lint errors in dirty row/sheet files
  outside the upload slice.

## Follow-up Bugs / Plans

- None yet.
