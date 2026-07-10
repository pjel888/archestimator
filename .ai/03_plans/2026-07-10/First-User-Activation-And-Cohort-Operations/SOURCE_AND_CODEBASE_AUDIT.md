# Source And Codebase Audit

## Baseline and method

Observed baseline: `081a0757a9d7f34e75342a18e353f3014403de1e` in a shared,
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
| Empty detection | `projects-page-client.tsx:1955-1964` only search/status | All + zero projects falls through | add `hasTrueZeroState` before filtered-empty branches |
| Empty rendering | `projects-page-client.tsx:3272-3342,3430` | blank collection | render `FirstProjectZeroState` with three actions |
| Blank creation | `NewProjectForm.tsx:263-338` | good creation/default estimate, no activation result | preserve flow; record path and committed milestones |
| Project write | `src/lib/projects/actions.ts:781-837` authenticates, inserts D1, revalidates | no activation event; create-role denial not explicit here | shared server helper enforces owner/admin/member and records post-commit event |
| Estimate draft | `src/lib/estimates/actions.ts:2338-2367` checks edit access and returns canonical row | no onboarding orchestration | compose in activation action; do not fork estimate creation |
| Template insertion | `src/lib/estimates/actions.ts:3145-3177` enforces current project/edit access | UI assumes an existing estimate/parent | activation orchestrator creates target, then uses this canonical insert path |
| Sample data | `workshop-sample-projects.ts` and `sampleEstimateTree` are display/demo fixtures | not a user-owned persisted first-value result | versioned safe payload persisted into a clearly labeled user-owned project |
| Project details | `ProjectDetailsModal.tsx:342-539` edits ordinary fields | no project type/floor area source | typed metadata fields and validation; avoid schema-wide parallel model |
| Account onboarding | `migrations/0005_account_settings.sql:1-37` | account completion is not product activation | separate activation progress/event tables |
| Support | `migrations/0042_support_conversations.sql:4-41` and repository | real status exists | join only status/last-message time; never message bodies |
| Admin auth | `src/lib/admin/require-admin.ts:8-24` | reusable gate exists | `listBetaActivationCohort` is server-only and requires admin context |
| Admin data | `src/lib/admin/users-repository.ts:60-157` has bounded pagination/signup query | no activation stages | add separate activation cohort repository; presentation remains external |
| Admin UI | `src/app/admin/page.tsx:12-25,40-43,62,80-87`; users page `:4-16` | placeholder | out of scope; consumed by `Beta-Operating-Contract` |

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

### D1 model in `migrations/0051_beta_activation_events.sql`

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

The migration is additive and backward compatible. Down migration is not used
on D1; rollback disables writers/readers and fixes forward. Account privacy
export/erase handlers must include both tables before rollout.

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
domain commit and validate the complete membership/project/estimate chain.

### Checklist derivation

| Item | Completion source | Recovery link/state |
|---|---|---|
| Complete project details | project fields plus typed `project_type` and `floor_area_sqm` metadata | project details modal |
| Create/choose area | committed estimate node or `first_area_created` | estimate tree |
| Add component/template | committed row/template activity | library panel |
| Set quantity | authoritative row quantity > 0 | first incomplete row |
| Verify source/date/confidence | row provenance fields present | Estimate Intelligence target when available |
| Review estimate health | `health_reviewed` producer contract | unavailable/degraded state until owner pack lands |
| Preview/export | successful export response plus `export_completed` | export preview |
| Publish | `publication_created` producer contract | unavailable/degraded state until Publisher lands |

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
- Estimate Intelligence owns calls for `health_reviewed` and may supply
  provenance completion facts through the typed contract.
- Publisher owns `publication_created`, `recipient_opened`,
  `recipient_engaged`, and `recipient_decided` calls after its active plan
  freezes. Activity rows are not reused as activation analytics.
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
