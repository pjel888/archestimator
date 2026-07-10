# Source And Codebase Audit

## Scoped Baseline Fingerprint

Apply `PLAN-PACK-SCOPED-BASELINE-v1` from `Plan-Pack-Schema.md` to these ordered
literal repo-relative pathspecs:

1. `migrations`
2. `src/app/workshop/projects`
3. `src/components/workshop/projects-page-client.tsx`
4. `src/components/workshop/project-grid-layout.ts`
5. `src/components/workshop/NewProjectForm.tsx`
6. `src/components/workshop/NewProjectFormSections.tsx`
7. `src/components/workshop/ProjectDetailsModal.tsx`
8. `src/components/workshop/workshop-sample-projects.ts`
9. `src/lib/projects`
10. `src/lib/estimates`
11. `src/lib/admin`
12. `src/app/admin`
13. `src/lib/repositories/support-conversations-repository.ts`
14. `src/lib/auth`
15. `src/lib/collaboration/invitation-d1-store.ts`
16. `src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts`
17. `tests/vitest`
18. `wrangler.jsonc`

Future-only paths such as `src/app/api/activation` and `src/lib/onboarding` are
named exactly in the implementation plan but are not source-baseline pathspecs
until they exist. Their creation is captured by the implementation diff and the
next manifest freeze.

The fingerprint binds the current zero-state, project/estimate producer, Admin
consumer boundary, support/auth inputs, tests, and migration tail, including
matching untracked files. It is planning provenance only.

## Baseline and method

Observed baseline: `e373bc865b978e237deb1d92011c96b0a3639fb4` in a shared,
dirty worktree. Source and line anchors must be re-read before editing. The
installed Next.js 16 guidance was consulted at:

- `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`;
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`;
- `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md`.

Consequences: every Server Action is an untrusted POST entry point and needs
authz/input checks; pages remain Server Components while interactive islands
stay narrow; mutation revalidation must provide read-your-own-writes without
assuming client action parallelism.

Manifest source `SRC-001` denotes the combined Beta-audit, installed Next.js,
and current repository baseline summarized below. It is planning evidence only
and is stale on any listed source, schema, auth, or dependency change.

Freshness re-audit at this revision confirmed the zero-state anchors below remain
exact. Concurrent Projects changes include project-card drag/deferred/drop
cleanup and extraction of status-tab grid classes into
`project-grid-layout.ts`. The extracted helper changes only status-tab/card-grid
presentation; it does not add or invalidate the audited true-zero branch,
activation ledger, producer, or cohort repository. Concurrent Admin gate and
landing auth-hint changes likewise add none of those activation surfaces. The
current `requireAdminContext`/API helper surface still supplies a reusable
platform-admin boundary; exact line anchors are re-read rather than leased. A
prior focused empty/group characterization passed 40/40; this final source read
is provenance inspection, not fresh runtime proof.

## Audit source

The Beta audit defines the gap at
`.ai/02_audits/archestimator_beta_readiness_audit_2026-07-10.md:280-329`,
the three choices at `:286-299`, the checklist at `:301-315`, the milestone
sequence at `:317-321`, and acceptance at `:323-329`. Its backlog assigns
`BETA-P0-04` and `BETA-P1-07` at `:753` and `:771`.

## Current versus target inventory

| Surface | Current implementation | Gap | Target owner/path |
|---|---|---|---|
| Projects route | `src/app/workshop/projects/page.tsx:15-39` loads owned projects and renders one client | no activation/progress/template seed | server loads activation seed only when owned project count is zero |
| Empty detection | `projects-page-client.tsx:1947-1956` only search/status | All + zero projects falls through | add `hasTrueZeroState` before filtered-empty branches |
| Empty rendering | `projects-page-client.tsx:3264-3335` branches only for search/status empties | All + zero reaches an empty collection map | render `FirstProjectZeroState` with three actions |
| Status-tab/card grid layout | `project-grid-layout.ts:40-53` supplies responsive presentation classes consumed by the Projects client | presentation-only; no activation state or action | preserve the helper boundary while extracting zero-state UI |
| Blank creation | `NewProjectForm.tsx:263-338` | good creation/default estimate, no activation result | preserve flow; record path and committed milestones |
| Project write | `src/lib/projects/actions.ts:781-837` authenticates, inserts D1, revalidates | no activation intent; create-role denial not explicit here | shared server helper enforces owner/admin/member and commits a canonical activation outbox intent in the same D1 transaction |
| Estimate draft | `src/lib/estimates/actions.ts:2338-2367` checks edit access and returns canonical row | no onboarding orchestration | compose in activation action; do not fork estimate creation |
| Template insertion | `src/lib/estimates/actions.ts:3145-3177` enforces current project/edit access | UI assumes an existing estimate/parent | activation orchestrator creates target, then uses this canonical insert path |
| Sample data | `workshop-sample-projects.ts` and `sampleEstimateTree` are display/demo fixtures | not a user-owned persisted first-value result | versioned safe payload persisted into a clearly labeled user-owned project |
| Project details | `ProjectDetailsModal.tsx:342-539` edits ordinary fields | no project type/floor area source | typed metadata fields and validation; avoid schema-wide parallel model |
| Account onboarding | `migrations/0005_account_settings.sql:1-37` | account completion is not product activation | separate activation progress/event tables |
| Support | `migrations/0042_support_conversations.sql:4-41` and repository | real status exists | join only status/last-message time; never message bodies |
| Admin auth | `src/lib/admin/require-admin.ts` | reusable page/API gates exist; concurrent same-origin/no-store helpers do not authorize cohort reads | `listBetaActivationCohort` is server-only and requires admin context |
| Admin data | `src/lib/admin/users-repository.ts:60-157` has bounded pagination/signup query | no activation stages | add separate activation cohort repository; presentation remains external |
| Admin UI | `src/app/admin/page.tsx:21-43,58-120`; users page `:4-16` | Signups, incidents, and health probes are repository-backed; Active Teams remains unavailable and activation stages are absent | presentation remains out of scope and is consumed by `Beta-Operating-Contract` |

## Target domain contract

### Activation path

`guided_sample | workspace_template | blank`. The choice is recorded only after
the action starts successfully. A retry reuses an idempotency key and never
creates a second project for the same submitted attempt.

- Guided sample: persisted, user-owned, `metadata.activation_sample_version=1`,
  visually labeled `Guided sample`, with at least one area, priced row, positive
  total, source/basis metadata, and links to health/export/publish. It is fully
  editable and deletable; it is never mixed into production cohort counts as an
  unlabeled customer estimate.
- Workspace template: user selects an authorized workspace template; the server
  creates project/default estimate then calls the existing canonical template
  insertion action. Deleted/cross-workspace templates fail closed before project
  creation when possible; partial setup returns an explicit resume/cleanup state.
- Blank: existing `NewProjectForm` behavior stays available without extra steps.
- Import: not rendered as available. No coming-soon control implies support.

### D1 model in `migrations/0054_beta_activation_events.sql`

`beta_activation_progress`:

- composite primary key `(user_id, workspace_id)`;
- `selected_path`, `project_id`, `estimate_id`, `last_milestone`,
  `first_value_completed_at`, `checklist_dismissed_at`,
  `checklist_reopened_at`, `support_state`, `last_event_at`, `version`,
  `created_at`, `updated_at`;
- composite tenant foreign key `(workspace_id, user_id)` to
  `workspace_members(workspace_id, user_id)`, plus
  `(project_id, workspace_id) -> projects(id, workspace_id)` and
  `(estimate_id, project_id) -> estimates(id, project_id)` when those nullable
  resources are present; checks require an estimate to carry its project and
  prevent cross-tenant combinations;
- safe delete behavior plus checks for enums/timestamps/version;
- index on `(last_milestone, last_event_at)` for bounded cohort filtering.

`beta_activation_events`:

- `id`, `user_id`, `workspace_id`, nullable `project_id`/`estimate_id`,
  `milestone`, `source`, `occurred_at`, `dedupe_key`, allowlisted
  `metadata_json`, `created_at`;
- the same composite tenant foreign keys as progress:
  `(workspace_id, user_id) -> workspace_members(workspace_id, user_id)`,
  `(project_id, workspace_id) -> projects(id, workspace_id)`, and
  `(estimate_id, project_id) -> estimates(id, project_id)` when nullable
  resources are present; an estimate requires its project, and supporting
  parent uniqueness is verified from the active schema before migration;
- tenant-scoped uniqueness on `(workspace_id, dedupe_key)` for at-least-once
  producer safety. The server derives the canonical key from the authorized
  domain mutation/resource/milestone; an untrusted client key is never used as
  a global identity or allowed to suppress another workspace's event;
- indexes `(user_id, workspace_id, occurred_at)` and
  `(milestone, occurred_at)`;
- no email, invite/share/session token, IP, user-agent, referrer, free-text
  support content, raw error, client-provided identity, or arbitrary metadata.

`beta_activation_outbox`:

- the server-derived domain mutation ID, workspace/user/resource chain,
  milestone, source, canonical dedupe key, allowlisted payload, `pending |
  processing | delivered | dead` state, attempts, `next_attempt_at`, lease token/
  expiry, stable redacted error code, and timestamps;
- unique `(workspace_id, dedupe_key)` plus indexes on
  `(state, next_attempt_at)` and `(lease_expires_at)`;
- the authoritative domain mutation and outbox row commit in one D1 batch or
  owner-domain transaction. The reconciler atomically writes event/progress and
  marks delivered; no successful domain mutation relies on an in-memory retry.

`beta_activation_retention_holds`:

- composite subject key `(user_id, workspace_id)`, allowlisted reason code,
  `starts_at`, `expires_at`, server-derived `created_by`, and timestamps;
- server-only writes behind platform-admin authorization, no free-text reason,
  and indexes for active-hold checks;
- activation-table membership deletes use `ON DELETE RESTRICT` so privacy or
  membership deletion must run the checked activation lifecycle first. An active
  hold returns an explicit restricted result and records
  `skipped_legal_hold`; it can never silently erase or partially delete rows.

The migration is additive and backward compatible. Down migration is not used
on D1; rollback disables writers/readers and fixes forward. The ledger is
essential authenticated product state, not optional provider analytics, so an
analytics-cookie withdrawal stops provider telemetry but does not delete or
disable checklist progress. `beta_activation_events` expire after 180 days;
delivered outbox rows expire after 30 days; unresolved/dead rows remain for at
most 180 days and require repair status; progress remains while membership is
active. Privacy/account/membership erasure deletes outbox, events, and progress
atomically when no active hold exists. Export includes shaped progress/events
and excludes internal lease/error/hold-reason details. `retention-core.ts` and
privacy export/erase adapters must implement these exact rules before rollout.

### Milestone vocabulary

```text
invite_accepted -> workspace_ready -> project_created -> first_area_created
-> first_row_priced -> first_valid_total -> health_reviewed
-> export_completed -> publication_created -> recipient_opened
-> recipient_engaged -> recipient_decided
```

Milestones are monotonic for funnel stage but late/out-of-order events remain in
the ledger. Progress advances to the maximum known stage, never regresses. A
duplicate tenant-scoped server-derived dedupe key is success-without-second-write.
The same client nonce in two workspaces produces independent keys. Producers
derive user, workspace, project, and estimate identity server-side after the
domain mutation and validate the complete membership/project/estimate chain.
The domain mutation and outbox intent share one transaction; bounded workers
reconcile the intent after commit. Retry delays are 1 minute, 5 minutes,
15 minutes, 1 hour, then 6 hours through attempt 10. Expired leases are
reclaimable; attempt 10 becomes visible `dead` state and requires an idempotent
repair command rather than silent drop.

### Checklist derivation

| Item | Completion source | Recovery link/state |
|---|---|---|
| Complete project details | project fields plus typed `project_type` and `floor_area_sqm` metadata | project details modal |
| Create/choose area | committed estimate node or `first_area_created` | estimate tree |
| Add component/template | committed row/template activity | library panel |
| Set quantity | authoritative row quantity > 0 | first incomplete row |
| Verify source/date/confidence | row provenance fields present | Estimate Intelligence target when available |
| Review estimate health | `health_reviewed` producer contract | unavailable/degraded until the owner-pack receipt validates |
| Preview/export | successful export response plus `export_completed` | export preview |
| Publish | `publication_created` producer contract | unavailable/degraded until the Publisher receipt validates |

The UI never fabricates completion from clicks. It reads authoritative domain
facts/events. Completion collapses the checklist; the Getting Started route in
the settings/support group reopens it without clearing history.

## Actor/resource/action matrix

| Actor | Start path | Read/update own progress | Read cohort | Expected denial |
|---|---|---|---|---|
| unauthenticated | no | no | no | login/401 before D1 access |
| workspace viewer | no project creation | read own progress; no fabricated milestones | no | clear owner/admin contact state |
| workspace member/admin/owner | yes in own workspace | yes, server-derived identity | no | cross-workspace/template/project denied |
| platform admin | normal own activation rights | own progress | yes, bounded server-only query | no message body/raw metadata |
| public recipient | no | no | no | share token never accepted by activation actions |

Direct POST, forged user/workspace/project IDs, replay, duplicate submission,
cross-workspace template, deleted project, stale optimistic ID, viewer role, and
oversize/unknown metadata all require explicit denial/idempotency tests.

## Abandonment and support states

The cohort repository derives, rather than stores, the stoppage state:

- `not_started`: workspace ready, no project after 24 hours;
- `setup_stalled`: project created, no valid total after 24 hours;
- `value_stalled`: valid total, no export/publication after 72 hours;
- `handoff_stalled`: publication, no recipient engagement after 72 hours;
- `active`: progress inside threshold;
- `completed`: recipient decision or configured terminal milestone.

Support state joins only the latest conversation status/time:
`none | open | pending | resolved`. The user sees retry, resume, delete partial
sample/template setup, blank fallback, and support links. The query never sends
automatic reminders or messages; Beta Operations decides and records outreach.

## Integration ownership

- This pack implements `recordActivationMilestone` and consumer/query behavior.
- This pack publishes `ACTIVATION-PRODUCER-CONTRACT-v1` plus deterministic
  fixtures. The Estimate and Publisher integrations require
  `ACT-RECEIPT-ESTIMATE-HEALTH-v1` and `ACT-RECEIPT-PUBLISHER-v1`; each receipt
  binds the owner-pack manifest hash,
  contract version, producer path/test IDs, transactional-outbox guarantee,
  retry/dead-letter semantics, and fixture result.
- `Beta-Operating-Contract` emits reciprocal
  `ACT-RECEIPT-COHORT-CONSUMER-v1`, binding the cohort DTO/query version,
  retention basis, Admin consumer paths/tests, unavailable behavior, and its
  manifest hash.
- `Beta-Readiness-Program` `UNIT-003` records and validates these receipts. A
  missing receipt keeps the corresponding integration/release row unavailable;
  it does not block implementation or verification of this pack's contract.
- Activity rows are not reused as activation analytics.
- Release Integrity owns the cross-browser/golden-path proof that traverses all
  milestones. Missing external producers surface as `not_available`, not a
  falsely completed checklist item.

## Freshness triggers

Re-audit on changes to project/estimate/template creation actions, project
metadata, invitation acceptance, export/publication events, auth roles, admin
gates, support schema, D1 migrations, Next.js config, or any consumer pack
manifest/hash. Migration number collision is a pre-edit replan trigger. The
collision is escalated to the program lead, which reissues every affected later
slot and requires all owner-pack references to validate before source work.
