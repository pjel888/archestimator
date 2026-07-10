# Implementation Plan

This is the sole canonical execution artifact.

## DAG, ready slice, and critical path

```text
UNIT-001 D1 schema + repository + privacy lifecycle [READY]
  -> UNIT-002 true zero state + access states [READY]
  -> UNIT-003 sample/template/blank orchestration [READY]
  -> UNIT-004 checklist + Getting Started reopen path [READY]
  -> UNIT-005 milestone producers + external contract [PLANNED]
  -> UNIT-006 cohort query + abandonment/support derivation [PLANNED]
  -> UNIT-007 integrated verification + rollout packet [BLOCKED]
```

Critical path is the full sequence. `SLICE-001` includes `UNIT-001..004` and all
transitive dependencies. `UNIT-005` waits for frozen Estimate/Publisher contract
inputs; `UNIT-007` also waits for consumer acceptance. `UNIT-001` is next.

## Ownership and leases

| Lane | Owned paths | Must not edit concurrently |
|---|---|---|
| data/executor | `migrations/0051_beta_activation_events.sql`, `src/lib/onboarding/**`, privacy lifecycle adapters, repository tests | other migrations or Publisher/Estimate owner files |
| activation UI/executor | `FirstProjectZeroState.tsx`, `FirstEstimateChecklist.tsx`, Getting Started route, scoped projects page/client seams | unrelated project grid/card behavior |
| orchestration/executor | activation actions, scoped `NewProjectForm`/project metadata seams | Publisher/Estimate integration files before freeze |
| cohort/executor | `src/lib/admin/activation-cohort-repository.ts` and tests | `src/app/admin/**` presentation |
| verifier | test/evidence paths only after maker handoff | maker source while verifying |

One lead integrates shared files. Immediately before edit: re-read file, run
focused caller/import search, confirm no lease, and record hash in ledger.

## UNIT-001 - schema, repository, and privacy lifecycle

Status: `READY`. Requirements: `DATA-001`, `SEC-001`.

Exact paths:

- new `migrations/0051_beta_activation_events.sql`;
- new `src/lib/onboarding/activation-types.ts`;
- new `src/lib/onboarding/activation-repository.ts`;
- `src/lib/compliance/privacy-request-repository.ts` export/erase adapters;
- new `tests/vitest/beta-activation-migration.test.ts`;
- new `tests/vitest/beta-activation-repository.test.ts`;
- focused privacy export/erase tests.

Steps:

1. Verify `0051` is free. If occupied, stop before source edits and ask the
   program lead to atomically reissue every affected Activation/Estimate/
   Calculation slot; resume only after every affected pack reference validates.
2. Write additive tables, checks, composite tenant FKs on both progress and
   event rows, the tenant-scoped unique dedupe constraint, and indexes from
   `SOURCE_AND_CODEBASE_AUDIT.md`.
3. Implement `recordActivationMilestone`, `getActivationProgress`,
   `setActivationPath`, `setChecklistVisibility`, and typed row mappers.
4. Derive identity from `CurrentUserContext`; never accept user/workspace from
   the client. Validate milestone/source/metadata allowlists at runtime.
5. Derive the canonical dedupe key from authorized post-commit domain facts and
   use insert-or-ignore on `(workspace_id, dedupe_key)`, then monotonic progress
   update. A same-tenant duplicate is success; an identical client nonce in a
   different tenant cannot collide. A later-stage event cannot be overwritten by
   an earlier stage.
6. Add export/erase coverage and structured redacted failure logs.

Failure cases: unavailable D1, duplicate/out-of-order event, missing resource,
cross-workspace or direct-SQL mismatched membership/project/estimate resource chain,
cross-tenant dedupe collision attempt, deleted project, invalid JSON, concurrent milestones,
privacy erase with events. Expected signal: migration/repository/privacy tests
pass and query plan shows named indexes. Rollback: disable activation reads/
writes, preserve tables, fix forward.

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
- existing `src/lib/estimates/actions.ts:2338-2367,3145-3177` reused unchanged
  unless the owner lease explicitly permits a narrow helper extraction;
- new `tests/vitest/activation-path-actions.test.ts`;
- strengthen `project-creation-ui`, `projects-page-create-optimistic`, and
  `new-project-form-validation` tests.

Steps:

1. Add `startActivationProject({path, templateId?, idempotencyKey, fields})` as
   one authenticated action and validate the complete untrusted input.
2. Enforce workspace creation role `owner|admin|member`; reject viewer and
   cross-workspace template before any write.
3. Blank composes the existing create/default-estimate path and records path,
   `project_created`, and `workspace_ready` after commits.
4. Template creates the target/default estimate, verifies source template access,
   inserts through the canonical action, records milestones, and routes to the
   authoritative returned estimate/node.
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
- `src/components/workshop/WorkshopSettingsModalContentView.tsx:65-93`;
- scoped project/estimate route composition seam selected after current-owner
  read, without embedding the checklist inside `EstimateSheetContent`;
- new `tests/vitest/first-estimate-checklist.test.tsx`;
- new `tests/vitest/getting-started-route.test.ts`.

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

Status: `PLANNED`. Dependency: `UNIT-004`. Requirement: `REQ-002`.

Exact paths owned here:

- `src/lib/onboarding/activation-types.ts` and `activation-repository.ts`;
- new `src/lib/onboarding/activation-producer-contract.ts`;
- narrow local producer seams in invitation acceptance, project/estimate
  actions, and `use-estimate-proposal-preview.ts` only after file leases;
- new `tests/vitest/activation-event-producer-contract.test.ts`.

External owner integration packets, not activation write leases:

- `Estimate-Intelligence-And-Price-Governance`: call
  `recordActivationMilestone` for `health_reviewed` after authoritative review;
- `Publisher-And-Shared-Pages`: call for `publication_created`,
  `recipient_opened`, `recipient_engaged`, `recipient_decided` after its active
  agent freezes and its own authz/event commits succeed;
- `Activity-History-Mapping`: consume no activation rows and do not repurpose
  activity history as funnel data.

Steps:

1. Publish the versioned TypeScript contract, stage ordering, source allowlist,
   resource requirements, dedupe format, shaped result, and safe error behavior.
2. Wire local producers only after successful commits. Export completes only
   after a successful response/blob save path; a dialog open/click is insufficient.
3. Make activation event failure observable and retryable without rolling back
   the successful domain write or duplicating it.
4. Supply consumer fixtures and circle-back packet to external owners. Missing
   producers stay visible as unavailable. This unit cannot advance to verified
   until the Estimate and Publisher owners accept the versioned fixtures; their
   absence does not block `SLICE-001` local schema/UI work.

Expected signal: contract tests prove every vocabulary value, identity rule,
replay, late event, safe logging, and consumer fixture.

## UNIT-006 - cohort query and abandonment/support derivation

Status: `PLANNED`. Dependency: `UNIT-005`. Requirements: `SEC-001`, `PERF-001`,
`OPS-001`.

Exact paths:

- new `src/lib/admin/activation-cohort-repository.ts`;
- reuse `src/lib/admin/require-admin.ts:8-24` at the server caller boundary;
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
4. Require platform admin before repository invocation. Add direct non-admin,
   unauthenticated, forged cursor/filter, oversize limit, and empty D1 tests.
5. Publish the DTO/query contract to `Beta-Operating-Contract`; do not edit
   `src/app/admin/**` presentation.

Expected signal: deterministic boundary states, privacy snapshot, query plan,
pagination, denial, and support join tests pass.

## UNIT-007 - integration, independent verification, rollout packet

Status: `BLOCKED`. Dependency: `UNIT-006`. Requirement: `OPS-001`.

Owner: verifier distinct from makers. Exact paths: tests/evidence and activation
pack status only, unless a failing test returns a bounded repair to the owning
unit.

Steps:

1. Run targeted migration/repository/UI/action/access/contract/cohort tests.
2. Run typecheck, lint/error-handling checks, migration validation, and scoped
   diff checks.
3. Run one routed browser case only for the browser-only claim: zero state ->
   guided sample -> persisted non-zero estimate -> refresh -> checklist reopen,
   plus 320px focus/reflow. Release Integrity owns the full golden path/matrix.
4. Re-run with a viewer and non-admin cohort attempt; inspect structured logs for
   redaction and use a temp dev log path for logger tests.
5. Produce rollout/rollback/freshness receipts and update manifest/ledger.

Pass: all local units verified, consumer contract packets accepted by their
owners, and the Beta Operating consumer has accepted the cohort query. Release
remains `NOT_EVALUATED` until the program combines external producer, hosted,
policy, and golden-path proof.

## Restart packet

At interruption record exact unit, source hashes, migration lease, last green/
red commands, D1 fixture state, open risk, owner handoffs, and first next command.
On resume run `supermemory:ensure`, re-read AGENTS FAST PATH, ledger, current
migration sequence, and changed shared files. Replan from the earliest stale
dependency; never continue a partial setup against assumed state.
