# Implementation Plan

This is the sole canonical execution artifact.

## DAG, ready slice, and critical path

```text
UNIT-001 D1 schema + repository + privacy lifecycle [READY]
  -> UNIT-002 true zero state + access states [READY]
  -> UNIT-003 sample/template/blank orchestration [READY]
  -> UNIT-004 checklist + Getting Started reopen path [READY]
  -> UNIT-005 milestone producers + program receipt contract [READY]
  -> UNIT-006 cohort query + abandonment/support derivation [READY]
  -> UNIT-007 integrated verification + rollout packet [READY]
```

Critical path is the full sequence. `SLICE-001` includes `UNIT-001..007` and all
transitive dependencies. External owner implementation is represented by
versioned program receipts and `not_available` states, not an internal approval
blocker. Every unit is executable; exactly `UNIT-001` is next.

## Ownership and leases

| Lane | Owned paths | Must not edit concurrently |
|---|---|---|
| data/executor | `migrations/0067_beta_activation_events.sql`, `src/lib/onboarding/**`, activation retention/outbox seams, privacy lifecycle adapters, repository tests | other migrations or Publisher/Estimate owner files |
| activation UI/executor | `FirstProjectZeroState.tsx`, `FirstEstimateChecklist.tsx`, Getting Started route, scoped projects page/client seams | unrelated project grid/card behavior |
| orchestration/executor | activation actions, scoped `NewProjectForm`/project metadata seams | Publisher/Estimate integration files before freeze |
| cohort/executor | `src/lib/admin/activation-cohort-repository.ts` and tests | `src/app/admin/**` presentation |
| verifier | test/evidence paths only after maker handoff | maker source while verifying |

One lead integrates shared files. Immediately before edit: re-read file, run
focused caller/import search, confirm no lease, and record hash in ledger.

## UNIT-001 - schema, repository, and privacy lifecycle

Status: `READY`. Requirements: `DATA-001`, `SEC-001`.

Exact paths:

- new `migrations/0067_beta_activation_events.sql`;
- new `src/lib/onboarding/activation-types.ts`;
- new `src/lib/onboarding/activation-repository.ts`;
- new `src/lib/onboarding/activation-outbox.ts`;
- new `src/lib/onboarding/activation-retention.ts`;
- `src/lib/compliance/retention-core.ts` activation rule registration;
- `src/lib/compliance/privacy-request-repository.ts` export/erase adapters;
- `worker.ts` bounded activation reconciliation/retention scheduled seam. The
  existing `scheduled()` handler (L184) fans every cron into
  `runCloudflareScheduledUploadJobs`; the `"30 3 * * *"` branch (L218) already
  runs `runRetentionPassInD1` + `reconcileActivityOutbox` in parallel via
  `ctx.waitUntil`. Add the activation reconciler/purge as another parallel
  `ctx.waitUntil` inside that same `"30 3 * * *"` branch (or its own cron branch)
  so it is serialized with the existing retention/outbox owners, not with the
  upload-jobs fan-out;
- new `tests/vitest/beta-activation-migration.test.ts`;
- new `tests/vitest/beta-activation-repository.test.ts`;
- new `tests/vitest/beta-activation-outbox.test.ts`;
- new `tests/vitest/beta-activation-retention.test.ts`;
- new `tests/vitest/beta-activation-privacy.test.ts`.

Steps:

1. Validate the durable Program artifact at
   `.ai/03_plans/2026-07-10/Beta-Readiness-Program/MIGRATION_LEASE_GENERATION.json`
   immediately before any
   migration edit: schema/generation, current sorted migration-tail digest, this
   owner package ID and manifest digest, the `0067_beta_activation_events.sql`
   unclaimed allocation (Program generation 11, slot `0067`), allocation digest, and
   canonical receipt digest must all recheck. If it is missing, stale, consumed,
   collided, or mismatched, stop before source edits and have the Program preserve
   consumed facts and atomically reissue every affected unconsumed allocation;
   resume only after all references validate. Historical ledger entries recorded
   earlier slots (`0051`/`0052`/`0053`/`0054`); those are superseded receipts — the
   current authoritative allocation is `0067`.
2. Write additive progress, event, outbox, and retention-hold tables; checks;
   composite tenant FKs; tenant-scoped unique dedupe constraints; explicit
   membership-delete restriction; and every index from the source audit.
3. Implement `recordActivationMilestone`, `getActivationProgress`,
   `enqueueActivationMilestone`, `reconcileActivationOutbox`,
   `repairDeadActivationIntent`, `setActivationPath`,
   `setChecklistVisibility`, `purgeExpiredActivationData`, retention/hold
   functions, and typed row mappers. `activation-retention.ts` owns the purge
   query and hold check; `retention-core.ts` registers its schedule; `worker.ts`
   invokes it through the bounded scheduled seam.
4. Derive the authenticated user from `CurrentUserContext`, then query the
   complete `workspace_members -> project -> estimate` chain; never treat the
   platform or corporate role in that context as a workspace role, never infer
   access from `workspaces.corporate_account_id`, and never accept identity from
   the client. Validate milestone/source/metadata allowlists at runtime.
5. Require the domain mutation and canonical outbox intent to share one D1 batch
   or owner-domain transaction. Claim bounded expiring leases, then atomically
   insert-or-ignore event, advance monotonic progress, and mark delivered. Retry
   at 1m/5m/15m/1h/6h through attempt 10; expose `dead` and an idempotent repair
   command after the cap. Scheduled and request-opportunistic reconcilers use the
   same lease contract.
6. Register and execute event 180-day, delivered-outbox 30-day, and
   unresolved/dead 180-day purge rules; retain progress while membership is
   active; implement platform-admin
   retention holds and `skipped_legal_hold`; make privacy/account/membership
   erasure an all-or-nothing outbox/event/progress batch; export only shaped
   progress/events. Analytics consent withdrawal does not erase essential
   activation state and never emits provider telemetry from this repository.
7. Add structured redacted failure logs and bounded retention/outbox metrics.

Failure cases: unavailable D1, duplicate/out-of-order event, missing resource,
cross-workspace or direct-SQL mismatched membership/project/estimate resource chain,
corporate-only role/link authorization attempts, cross-tenant dedupe collision
attempt, deleted project, invalid JSON, crash after
domain/outbox commit, crash after lease claim, expired lease, concurrent workers,
attempt-10 dead row, idempotent repair, each retention boundary, consent
withdrawal, privacy erase with events/outbox, and active/expired legal hold.
Expected signal: migration/repository/outbox/retention/privacy tests pass and
query plans show named indexes. Rollback: disable activation reads/writes and
scheduled claims, preserve tables, fix forward.

## UNIT-002 - true zero state and access states

Status: `READY`. Dependency: `UNIT-001`. Requirement: `UX-001`.

Exact paths:

- `src/app/workshop/projects/page.tsx`;
- `src/components/workshop/projects-page-client.tsx`;
- new `src/components/workshop/FirstProjectZeroState.tsx`;
- existing `src/components/ui/` button/dialog primitives;
- new `tests/vitest/first-project-zero-state.test.tsx`;
- strengthen existing projects-page empty-state tests.

Steps:

1. Server-load activation progress, current workspace creation role, and template
   summaries only when `ownedProjects.length===0`; pass serializable DTOs.
2. Define `hasTrueZeroState` as zero authoritative owned projects, All tab,
   empty search, no optimistic creation, and settled server data. Keep search and
   status empty branches earlier/later according to current behavior tests.
3. Render an unframed, responsive zero state with three explicit choices and
   visible Demo label on guided sample. Reuse icon buttons/primitives and stable
   dimensions; no nested cards or marketing hero.
4. Viewer/non-creator state replaces mutation controls with contact-owner/help.
5. Specify focus entry/return, busy/disabled/aria-live, double-submit, Escape,
   200% zoom, 320px width, reduced motion, and error recovery.

Expected signal: existing search/status tests remain green and DOM tests prove
true-zero/denial/pending/error paths. Browser proof is deferred to `UNIT-007`
only for routed focus/responsive behavior that DOM tests cannot prove.

## UNIT-003 - sample, template, and blank orchestration

Status: `READY`. Dependency: `UNIT-002`. Requirements: `REQ-001`, `SEC-001`.

Exact paths:

- new `src/lib/onboarding/activation-actions.ts`;
- new `src/lib/onboarding/guided-sample.ts`;
- `src/lib/projects/actions.ts:781-837` shared create-role seam;
- `src/components/workshop/NewProjectForm.tsx:263-365` blank result seam;
- `src/components/workshop/ProjectDetailsModal.tsx` typed type/floor-area fields;
- new `src/lib/projects/project-activation-metadata.ts`;
- existing `src/lib/estimates/actions.ts:2338-2367` (`createEstimateSheetDraft`,
  the public draft-creation action) and `:3145-3177`
  (`insertEstimateTemplateIntoEstimate`, template insertion) reused unchanged;
  this unit does not extract or relocate those helpers;
- new `tests/vitest/activation-path-actions.test.ts`;
- strengthen `project-creation-ui`, `projects-page-create-optimistic`, and
  `new-project-form-validation` tests.

Steps:

1. Add `startActivationProject({path, templateId?, idempotencyKey, fields})` as
   one authenticated action and validate the complete untrusted input.
2. Enforce workspace creation role `owner|admin|member`; reject viewer and
   cross-workspace template before any write. A corporate membership, corporate
   role, or corporate-to-workspace link without canonical `workspace_members`
   authority is denied before resource lookup or mutation.
3. Blank composes the existing create/default-estimate path and writes path,
   `project_created`, and `workspace_ready` outbox intents in the same D1
   transaction as their authoritative mutations.
4. Template creates the target/default estimate, verifies source template access,
   inserts through the canonical action, commits milestone outbox intents with
   the owning mutations, and routes to the authoritative returned estimate/node.
5. Guided sample uses versioned safe data to persist area, priced row, positive
   total, provenance, and sample metadata. Every rendered/exported sample title
   remains visibly labeled.
6. Persist partial setup state when a downstream step fails; return resume,
   retry, delete partial project, and blank fallback. Cleanup is authorized and
   idempotent; errors contain no row/customer data.
7. Add typed `project_type` and bounded positive `floor_area_sqm` inside existing
   project metadata; preserve unknown metadata keys and existing edits.

Expected signal: three happy paths persist/reload; direct-POST denials, replay,
partial setup, missing/deleted template, and cleanup tests pass.

## UNIT-004 - checklist and Getting Started reopen path

Status: `READY`. Dependency: `UNIT-003`. Requirement: `UX-002`.

Exact paths:

- new `src/components/workshop/FirstEstimateChecklist.tsx`;
- new `src/app/workshop/getting-started/page.tsx`;
- `src/components/workshop/WorkshopSettingsModalContentView.tsx:74-102` (the
  `supportSettings` array; line 65 falls in the Account/sign-out group, so use
  the `supportSettings` range that begins at L74);
- `src/app/workshop/projects/[projectId]/layout.tsx:ProjectLayout` composes the
  checklist above project and estimate route children without embedding it in
  `EstimateSheetContent`;
- new `tests/vitest/first-estimate-checklist.test.tsx`;
- new `tests/vitest/getting-started-route.test.ts`;
- new `e2e/first-user-activation.spec.ts`, owned by the `UNIT-004` test lane for
  the routed persistence, focus-return, and 320px reflow contract.

Steps:

1. Implement a pure `deriveFirstEstimateChecklist` selector over progress plus
   authoritative project/estimate summary facts.
2. Render a narrow client island in the project/estimate shell, not the giant
   estimate editor. Items deep-link to the correct project detail, node/row,
   library, health, export, or Publisher surface.
3. Persist dismiss/reopen only; never persist user-claimed completion.
4. Add Getting Started to the settings Support group and route to a Server
   Component that resolves the current activation project/checklist.
5. Collapse after completion with a polite announcement; keep reopen available.
6. Render explicit `not_available`/`degraded` integration states and support CTA;
   never trap editing or redirect without user action.

Expected signal: derived-state tests cover every item, refresh/relogin, late
events, dismiss/reopen, completed, deleted project, and unavailable integrations.

## UNIT-005 - milestone producers and external contract

Status: `READY`. Dependency: `UNIT-004`. Requirement: `REQ-002`.

Exact paths owned here:

- `src/lib/onboarding/activation-types.ts` and `activation-repository.ts`;
- new `src/lib/onboarding/activation-producer-contract.ts`;
- `src/lib/collaboration/invitation-d1-store.ts:acceptInvitationInD1` records
  `invite_accepted` in the same D1 statement batch as invitation acceptance;
- `src/lib/projects/actions.ts:createProjectRecord` records the project and
  workspace-ready intents in the same D1 transaction selected by `UNIT-003`;
- `src/lib/estimates/actions.ts:createEstimateSheetDraft` (L2339, the public
  draft-creation action that checks edit access and returns the canonical row),
  plus `createEstimateNode` (L2890),
  `insertEstimateRowItemFromLibrary` (L3289), `updateEstimateRowItem` (L3387),
  and `updateEstimateSheetAdjustment` (L3354) own estimate/area/row/positive-total
  intents. The private `createEstimateWithDefaultTab` helper (L1936) is reused
  unchanged inside that chain; this unit does not extract or relocate it;
- `src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts:downloadProposalExport`
  calls new
  `src/app/api/activation/proposal-export-completed/route.ts` only after a
  successful XLSX response has been converted to a Blob and handed to the
  download trigger; the route re-authorizes the project/estimate and writes the
  idempotent export intent because export has no domain-write transaction;
- new `tests/vitest/activation-event-producer-contract.test.ts`.

Frozen integration contract and receipt schemas, not activation write leases:

- `ACTIVATION-PRODUCER-CONTRACT-v1`: Activation publishes the stage vocabulary,
  identity/resource rules, dedupe format, outbox guarantee, shaped result, safe
  errors, and deterministic provider fixtures consumed by every producer;

- `ACT-RECEIPT-ESTIMATE-HEALTH-v1`: Estimate Intelligence binds its manifest,
  `health_reviewed` producer path/tests, and same-transaction outbox guarantee;
- `ACT-RECEIPT-PUBLISHER-v1`: Publisher binds its manifest,
  `publication_created`, `recipient_opened`, `recipient_engaged`, and
  `recipient_decided` paths/tests plus the same guarantee;
- `ACT-RECEIPT-COHORT-CONSUMER-v1`: Beta Operating binds its manifest, cohort
  DTO/query version, Admin consumer paths/tests, retention basis, and explicit
  unavailable behavior;
- `Activity-History-Mapping`: consume no activation rows and do not repurpose
  activity history as funnel data.

Steps:

1. Publish `ACTIVATION-PRODUCER-CONTRACT-v1` as the versioned TypeScript
   contract, with stage ordering, source allowlist,
   resource requirements, dedupe format, shaped result, and safe error behavior.
2. Wire each local authoritative mutation and outbox intent in one transaction.
   The read-only export exception uses the exact post-Blob acknowledgement route
   above with server re-authorization and tenant-scoped idempotency; a dialog
   open, click, failed response, or failed Blob conversion is insufficient.
3. Use Unit 001 reconciliation for observable retry/dead repair without rolling
   back or duplicating the successful domain write.
4. Publish immutable provider/consumer fixtures and all named receipt schemas to
   `Beta-Readiness-Program` `UNIT-003`. Missing external receipts keep only their
   integration/release rows `not_available`; no internal acknowledgement is
   required to implement or verify this unit.

Expected signal: contract tests prove every vocabulary value, identity rule,
replay, late event, safe logging, and consumer fixture.

## UNIT-006 - cohort query and abandonment/support derivation

Status: `READY`. Dependency: `UNIT-005`. Requirements: `SEC-001`, `PERF-001`,
`OPS-001`.

Exact paths:

- new `src/lib/admin/activation-cohort-repository.ts`;
- reuse `src/lib/admin/require-admin.ts:requireAdminContext` (L12) at the server
  caller boundary (page/admin Server Component context). For any Server Action or
  API-route cohort caller, reuse `assertAdminApiAccess` (L19) /
  `gateAdminApiMutation` (L78) with origin checks. The plain name `requireAdmin`
  does not exist; only `requireAdminContext` is exported for page contexts;
- read-only joins to `support_conversations` from migration `0042`;
- new `tests/vitest/admin-activation-cohort-repository.test.ts`;
- new `tests/vitest/admin-activation-cohort-access.test.ts`.

Steps:

1. Define a DTO with opaque `userId`, stage/timestamps, selected path, safe
   project reference/name, stalled state, and support status/time. Exclude email,
   tokens, IP/UA, event metadata, support subject/body, and arbitrary profile data.
2. Implement cursor pagination with limit 1..100 and stable
   `(last_event_at DESC,user_id DESC)` ordering. Filter only allowlisted stage,
   stalled state, support state, and created-at ranges.
3. Derive thresholds with an injected clock and one bounded SQL query/CTE; avoid
   per-user reads. Explain/query-plan the 10k fixture.
4. Require platform admin before repository invocation. Corporate account
   `owner`/`team_leader`/`member`/`viewer` roles never satisfy that gate. Add
   direct corporate-only, non-admin, unauthenticated, forged cursor/filter,
   oversize limit, and empty D1 tests.
5. Publish the frozen DTO/query fixture and
   `ACT-RECEIPT-COHORT-CONSUMER-v1` schema to Beta Operating and program
   `UNIT-003`; do not edit `src/app/admin/**` presentation.

Expected signal: deterministic boundary states, privacy snapshot, query plan,
pagination, denial, and support join tests pass.

## UNIT-007 - integration, independent verification, rollout packet

Status: `READY`. Dependency: `UNIT-006`. Requirement: `OPS-001`.

Owner: verifier distinct from makers. Product source is read-only. The verifier
may write only this pack's `plan-pack.json`, this pack's `LOOP_LEDGER.md`, and:

- `.ai/99_scratch/activation/unit-007-final-verification.md`;
- `.ai/99_scratch/activation/ACT-RECEIPT-ESTIMATE-HEALTH-v1.json`;
- `.ai/99_scratch/activation/ACT-RECEIPT-PUBLISHER-v1.json`;
- `.ai/99_scratch/activation/ACT-RECEIPT-COHORT-CONSUMER-v1.json`;
- `.ai/99_scratch/activation/BETA-P1-10-MAINTAINABILITY-RECEIPT-v1.json`.

Steps:

1. Run `ARCHESTIMATOR_DEV_LOG_PATH="$(mktemp -d)/activation.ndjson" bunx vitest
   run tests/vitest/beta-activation-migration.test.ts
   tests/vitest/beta-activation-repository.test.ts
   tests/vitest/beta-activation-outbox.test.ts
   tests/vitest/beta-activation-retention.test.ts
   tests/vitest/beta-activation-privacy.test.ts
   tests/vitest/first-project-zero-state.test.tsx
   tests/vitest/activation-path-actions.test.ts
   tests/vitest/project-creation-ui.test.ts
   tests/vitest/projects-page-create-optimistic.test.tsx
   tests/vitest/new-project-form-validation.test.tsx
   tests/vitest/first-estimate-checklist.test.tsx
   tests/vitest/getting-started-route.test.ts
   tests/vitest/activation-event-producer-contract.test.ts
   tests/vitest/admin-activation-cohort-repository.test.ts
   tests/vitest/admin-activation-cohort-access.test.ts`.
2. Run `bun run type-check`, `bun run lint`, `bun run validate:error-handling`,
   `bunx wrangler d1 migrations apply ARCH_DB --local --persist-to
   .ai/99_scratch/activation/unit-007-d1`, `bun run validate:plan-pack --
   .ai/03_plans/2026-07-10/First-User-Activation-And-Cohort-Operations`, and
   `git diff --check`.
3. Run `bunx playwright test
   e2e/first-user-activation.spec.ts --project=chromium` only for the
   browser-specific claim: zero state ->
   guided sample -> persisted non-zero estimate -> refresh -> checklist reopen,
   plus 320px focus/reflow. Release Integrity owns the full golden path/matrix.
4. Treat `tests/vitest/first-project-zero-state.test.tsx` as viewer proof and
   `tests/vitest/admin-activation-cohort-access.test.ts` as non-admin proof.
   `tests/vitest/beta-activation-outbox.test.ts`,
   `tests/vitest/beta-activation-privacy.test.ts`, and
   `tests/vitest/admin-activation-cohort-access.test.ts` assert log/receipt
   redaction against the explicit temporary log path from step 1.
5. Treat `tests/vitest/activation-event-producer-contract.test.ts` as the three
   reciprocal schema/fixture proof, write the five exact outputs above, and
   update only the two pack status files. Report missing
   external receipt instances to program `UNIT-003` without changing this pack's
   implementation status.
6. Emit the Program `BETA-P1-10` REQUIRED receipt with the projects-page caller
   map, pre-change zero-state/checklist characterization, extraction/retention
   decision for the bounded islands, changed files, regression owner, exact
   `TEST-002`/`TEST-004` plus the named
   `first-project-zero-state.test.tsx`, `project-creation-ui.test.ts`, and
   `projects-page-create-optimistic.test.tsx` commands, and independent verifier
   result.

Pass: all local units and receipt schemas/fixtures are verified with no internal
approval dependency. Release remains `NOT_EVALUATED` until program `UNIT-003`
records current external producer and Beta Operating consumer receipt instances
and combines hosted, policy, and golden-path proof.

Any missing test file, command result, receipt field, or output keeps `UNIT-007`
non-PASS and returns only a bounded source repair to its owning unit.

## Restart packet

At interruption record exact unit, source hashes, migration lease, last green/
red commands, D1/outbox/retention fixture state, open risk, program receipt state,
and first next command.
On resume run `supermemory:ensure`, re-read AGENTS FAST PATH, ledger, current
migration sequence, and changed shared files. Replan from the earliest stale
dependency; never continue a partial setup against assumed state.
