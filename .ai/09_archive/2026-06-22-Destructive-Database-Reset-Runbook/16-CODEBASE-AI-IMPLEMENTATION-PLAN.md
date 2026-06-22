# 16 Codebase AI Implementation Plan

Status: implementation guide only. This document does not authorize a reset,
does not prove a reset, and must not be used as a substitute for fresh Gate 1
and Gate 2 owner instructions.

## Purpose

This is the front-door implementation guide for a future codebase AI that will
prepare, execute, verify, and close out the destructive Archestimator app-data
reset described by this folder. It synthesizes the runbook pack into stable
requirements, phases, implementation units, evidence gates, pros/cons, SWOT,
and source-document traceability.

The default target is **Variant A: Auth-preserving content reset** for Supabase
project ref `ebxxqidacheyapmmzavr`. The reset removes workspace/project/
estimate/library/publication/collaboration content and approved app media
objects while preserving Supabase Auth, `profiles`, beta access, legal/security
evidence, RLS, functions, grants, migrations, triggers, and bucket definitions.

## Required First Reads

Future executors must read these in order before doing anything beyond local
inspection:

1. `AGENTS.md`.
2. `.ai/10_state/current-state.md` FAST PATH block only.
3. `README.md`.
4. `00-PLAN.md`.
5. `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md`.
6. `02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md`.
7. `03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md`.
8. `04-RESET-RUNBOOK.md`.
9. `11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md`.
10. `12-POST-RESET-UX-CONTRACT.md`.
11. This document.

Pull the remaining source documents as each phase requires them. Do not linear
read unrelated `.ai` history.

## Authoritative Source Map

| Source | Use during implementation |
|---|---|
| `README.md` | Folder entry point, artifact map, non-negotiable gate summary. |
| `00-PLAN.md` | Reset goal, Variant A default, non-goals, success and stop criteria. |
| `01-CURRENT-STATE-AUDIT.md` | 2026-06-22 baseline facts, local code anchors, official-source references. Regenerate live facts before execution. |
| `02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md` | Preserve/reset/decision scope, manifest rules, managed-schema boundary, concurrency guardrails. |
| `03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md` | Backup/export/restore requirements and raw-artifact handling rules. |
| `04-RESET-RUNBOOK.md` | Phase sequence for preparation, dry run, execution, Storage cleanup, provider verification, app smoke, and evidence. |
| `05-SCHEMA-MIGRATION-SEED-AND-TYPES-PLAN.md` | Data-only/object-only posture; no schema push, pending migrations, seed, or typegen unless a separate plan is required. |
| `06-APP-SURFACE-IMPACT-MAP.md` | Routes, repositories, workflows, and tests affected by empty app data. |
| `07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md` | Provider, SQL, Storage, Auth, app-flow, and documentation proof boundaries. |
| `08-BLAST-RADIUS-RISKS-AND-GO-NO-GO.md` | Risk register, go/no-go criteria, decision register, adversarial checks. |
| `09-IMPLEMENTATION-HANDOFF.md` | Future executor boundaries, recommended lanes, evidence folder shape. |
| `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md` | Canonical Gate 1 and Gate 2 contract. |
| `11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md` | Database, Storage, function, policy manifest schema and rollback-only dry-run shape. |
| `12-POST-RESET-UX-CONTRACT.md` | Null-workspace, stale-link, empty-state, copy, accessibility, and UX no-go contract. |
| `13-ADVERSARIAL-QA-SCENARIO-MATRIX.md` | Hostile scenario matrix to close before destructive execution. |
| `14-PLAN-QUALITY-SCORECARD.md` | Plan-quality history and known readiness boundary. |
| `15-SUPABASE-PROJECT-NAMING-PLAN.md` | Optional display-name normalization, separate from reset execution. |
| `LOOP_LEDGER.md` | Planning and audit evidence history. |

## Official External Constraints

These external facts are load-bearing and were rechecked against official docs
on 2026-06-22:

- Supabase database backups do not include Storage API objects; Storage export
  and restore proof are separate hard gates.
- Supabase preview branches are separate environments and new branches are
  data-less by default; branch rehearsal is not proof of production-like data
  reset unless a representative dataset is populated.
- Supabase Auth data lives behind the Auth schema boundary; public profile
  tables should reference Auth users but the reset must not mutate `auth.*`.
- PostgreSQL `TRUNCATE` can take `ACCESS EXCLUSIVE` locks, can cascade to
  referencing tables, and does not fire `ON DELETE` triggers. Variant A defaults
  to ordered `DELETE` unless a table-specific review proves otherwise.

## Non-Negotiable Requirements

### Safety And Authorization

- R-SAFE-001. The target project ref must be exactly `ebxxqidacheyapmmzavr` at
  Gate 1, Gate 2, dry run, destructive execution, and closeout.
- R-SAFE-002. The Supabase display name is never a safety identifier; optional
  display-name normalization is isolated from reset work.
- R-SAFE-003. Gate 1 authorizes preparation only: read-only inspection,
  backup/export, restore rehearsal, manifest generation, and rollback-only SQL
  rehearsal.
- R-SAFE-004. Gate 2 authorizes one destructive app-data reset only after Gate 1
  evidence exists, is reviewed, and every decision-required item is resolved.
- R-SAFE-005. Owner authorization evidence must include trusted channel, actor
  identity, timestamp, exact instruction text, project ref, reset variant, and
  rejection of forwarded, stale, partial, or ambiguous wording.
- R-SAFE-006. If the owner says only "reset the database", stop. That wording is
  too broad.
- R-SAFE-007. Destructive execution is centralized in one owner/operator lane.
  Parallel agents may gather or review evidence, but they must not run
  destructive SQL or Storage cleanup.

### Auth, Identity, And Preserved State

- R-ID-001. No destructive action may target `auth.*`, Auth users, Auth
  sessions, `storage.buckets`, `realtime.*`, `supabase_migrations.*`, extension
  schemas, or provider-managed metadata.
- R-ID-002. Auth preservation proof must compare `auth.users` IDs and counts,
  not only `count(*)`.
- R-ID-003. Variant A profile preservation proof must compare profile IDs,
  profile count, role/admin-critical columns, and `default_workspace_id`
  transition state.
- R-ID-004. Immediately after database reset and before app bootstrap,
  `profiles.default_workspace_id` must be null or point only to rows that still
  exist after the reset.
- R-ID-005. After app bootstrap, `profiles.default_workspace_id` may point to a
  newly created workspace; this is a separate post-app-smoke state from the
  post-DB invariant.
- R-ID-006. Legal, beta access, security, and destructive-operation audit rows
  default to preserve unless a separate owner decision and export plan says
  otherwise.

### Manifest And SQL

- R-MANIFEST-001. Every public table must appear exactly once in the live
  database manifest with action, count, FK, trigger, lock, delete, rollback, and
  review fields.
- R-MANIFEST-002. Auth and managed schemas appear only in the negative manifest
  as excluded targets.
- R-MANIFEST-003. Decision-required rows and objects default to preserve until
  resolved. Unresolved decision-required items block Gate 2.
- R-MANIFEST-004. Manifest generation must use live metadata, not this folder's
  2026-06-22 row counts.
- R-MANIFEST-005. FK graph proof must be generated before SQL is authored and
  reviewed before dry run.
- R-SQL-001. Variant A defaults to ordered `DELETE`.
- R-SQL-002. `TRUNCATE` is allowed only with table-specific justification,
  explicit manifest coverage, lock analysis, trigger analysis, and reviewer
  signoff.
- R-SQL-003. `CASCADE` is allowed only when every reached table is listed in the
  manifest with expected deltas and reviewer signoff.
- R-SQL-004. `workspace_members` should normally be `reset-by-parent-delete`
  through `workspaces` for Variant A. Top-level explicit child delete can hit
  the workspace owner-floor trigger; parent cascade is the expected safe path
  because that trigger skips nested cascade contexts.
- R-SQL-005. `notification_deliveries` is decision-required because scoped rows
  can cascade when workspace/project/estimate parents are deleted. The owner
  must choose export-and-allow-reset, parent preservation, or a separate
  nulling/schema plan if live rows exist.
- R-SQL-006. The reviewed SQL must be rollback-only until Gate 2 passes.
- R-SQL-007. The destructive DB reset must be one reviewed transaction with a
  single correlation id, conservative statement/lock budgets, and no schema
  migrations.

### Backup, Storage, And Recovery

- R-RECOVERY-001. Logical database backup and separate Storage export are hard
  gates before destructive execution.
- R-RECOVERY-002. Raw dumps, Storage archives, tokens, passwords, Auth payloads,
  full share/invite URLs, and local secret paths stay outside the repo.
- R-RECOVERY-003. Only sanitized metadata, hashes, counts, custodian, access
  scope, retention date, deletion date, and operator id may be committed.
- R-RECOVERY-004. The database backup must be restored into a local or
  throwaway target before Gate 2.
- R-RECOVERY-005. One Storage sample from each non-empty selected bucket must be
  restored or re-uploaded into a safe target when practical.
- R-STORAGE-001. Storage object cleanup uses Storage API/tooling only; do not
  delete buckets and do not mutate `storage.objects` directly.
- R-STORAGE-002. Storage cleanup happens only after DB commit.
- R-STORAGE-003. Objects lacking export proof are removed from delete scope
  unless Gate 2 explicitly accepts a waiver.
- R-STORAGE-004. Unknown paths, bucket mismatches, user-controlled path input,
  and path traversal-like values fail closed.
- R-STORAGE-005. Cleanup must be chunked, bounded, resumable, and report
  deleted, failed, rejected, missing, and retried paths.

### App, UX, And Evidence

- R-UX-001. If empty-state or stale-link behavior requires app code changes,
  stop reset execution and create a separate pre-reset app-hardening plan.
- R-UX-002. App code changes may happen only before the reset window in a
  separate implementation branch/plan; they must not be mixed into destructive
  execution.
- R-UX-003. The UX evidence matrix must cover every surface in
  `12-POST-RESET-UX-CONTRACT.md`, including empty states, stale links, copy,
  a11y, mobile/touch expectations, and proof method.
- R-UX-004. Auth login, share/invite routes, and Storage upload/read/delete
  require real-surface manual or automated proof unless an equivalent
  application-level proof is recorded.
- R-UX-005. Old project, estimate, share, invite, and Storage identifiers must
  fail closed with no old data, token metadata, generic 500, or alarming user
  copy.
- R-SEC-001. App-smoke notes, screenshots, traces, and transcripts must redact
  emails, full tokens, full invite/share URLs, local backup paths, Auth payloads,
  and provider secrets.
- R-SEC-002. Prefer temporary scoped credentials for operator work. If
  credentials are newly minted, shared, logged, or suspected exposed, record the
  rotation/revocation plan and proof.
- R-EVIDENCE-001. Every phase writes sanitized evidence under the reset
  correlation id.
- R-EVIDENCE-002. The final claim must say whether proof is provider, SQL,
  Storage, real-surface app, local test, or manual. Do not claim provider proof
  from local-only tests.

## Phased Delivery Plan

### Phase 0. Scope Lock And Agent Coordination

**Goal:** Prevent accidental execution, wrong-provider work, and parallel-agent
conflicts before any preparation begins.

**Inputs:** `README.md`, `00-PLAN.md`, `09-IMPLEMENTATION-HANDOFF.md`,
`10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md`.

**Required actions:**

- Confirm current checkout and dirty worktree before editing or running scripts.
- Declare this run's lane: planning, Gate 1 preparation, Gate 2 execution, app
  hardening, or optional naming.
- Use one reset correlation id:

```text
reset-<YYYYMMDD>-<short-owner-or-agent-id>
```

- Create the sanitized evidence folder under this runbook folder only after
  Gate 1:

```text
<this-folder>/evidence/reset-<YYYYMMDD>-<short-owner-or-agent-id>/
```

- Assign disjoint lanes if subagents are used:
  - provider verifier: read-only provider baseline;
  - backup/export operator: off-repo backup and Storage export;
  - manifest reviewer: database/object/FK review;
  - security reviewer: Auth, grants, function baseline, secrets hygiene;
  - app verifier: post-reset real-surface proof;
  - execution owner: the only lane that may run destructive steps after Gate 2.

**Deliverables:**

- `00-owner-authorization.md` with trusted channel, actor, timestamp, exact text,
  scope, project ref, and redaction notes.
- `00-run-context.md` with lane, correlation id, operator, worktree status, and
  known unrelated dirty files.

**Stop if:**

- the lane is ambiguous;
- owner wording is broad;
- the project ref is absent;
- multiple agents could run destructive work;
- credentials or raw artifacts would be written into the repo.

### Phase 1. Gate 1 Preparation Authorization

**Goal:** Obtain authority for inspection, backup/export, restore rehearsal,
manifest generation, and rollback-only dry run only.

**Inputs:** `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md`.

**Required actions:**

- Confirm the owner explicitly authorizes Gate 1 preparation.
- Confirm project ref `ebxxqidacheyapmmzavr`.
- Confirm raw backup/export destination outside the repo.
- Confirm sanitized evidence folder path.
- Confirm no destructive execution, Storage deletion, schema change, branch
  creation, paid add-on, or provider rename is authorized unless separately
  named.

**Deliverables:**

- Gate 1 entry in `00-owner-authorization.md`.
- `01-gate-1-checklist.md` with every Gate 1 input and output field.

**Stop if:** Gate 1 is missing, stale, forwarded without provenance, or mixed
with destructive execution.

### Phase 2. Fresh Provider Inventory

**Goal:** Replace the 2026-06-22 baseline with current facts.

**Inputs:** `01-CURRENT-STATE-AUDIT.md`, `04-RESET-RUNBOOK.md`,
`07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md`, `15-SUPABASE-PROJECT-NAMING-PLAN.md`.

**Required actions:**

- Confirm provider project list and local `supabase/.temp/project-ref` both
  identify `ebxxqidacheyapmmzavr`.
- Record display name only as metadata.
- Capture branch/status note; provider ambiguity is no-go.
- Capture Postgres version, migration history, Edge Functions list, all public
  table counts, `auth.users` IDs/count, `profiles` IDs/critical columns, target
  Storage buckets/objects/bytes, public table RLS status, public functions,
  function owner/search_path/grants/hash, Auth triggers, and Storage policies.
- Capture FK graph for public tables, including `on delete` behavior.

**Deliverables:**

- `02-provider-baseline.json`.
- `02-public-table-counts.csv`.
- `02-auth-users-baseline.csv` with IDs redacted or hashed if needed.
- `02-profiles-baseline.csv` with IDs and critical columns redacted or hashed if
  needed.
- `02-fk-graph.csv`.
- `02-function-policy-baseline.json`.
- `02-storage-baseline.csv`.

**Stop if:** project ref is wrong, branch target is ambiguous, provider health is
not acceptable, or managed-schema access requires unsafe mutation.

### Phase 3. Backup And Storage Export

**Goal:** Make rollback real before any destructive operation is possible.

**Inputs:** `03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md`,
`07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md`.

**Default approach:**

- Use Supabase CLI logical dump for the linked project when current CLI help
  confirms the needed flags and target.
- Use `pg_dump` with a direct database URL only as a fallback when CLI dump is
  unavailable or insufficient.
- Export Storage objects separately from `component-images`, `project-images`,
  and `component-attachments`.

**Required actions:**

- Verify backup command help/current flags before execution.
- Keep dump/export artifacts outside the repo.
- Hash dump/export artifacts with SHA-256.
- Record custodian, access scope, retention date, deletion date, and off-repo
  location description without exposing secret paths.
- Export every object selected for possible deletion.

**Deliverables:**

- `03-backup-export-metadata.md`.
- `03-storage-export-manifest.csv`.
- `03-artifact-hashes.txt` containing sanitized names and hashes only.

**Stop if:** the backup/export target is ambiguous, raw files would enter the
repo, Storage export is incomplete and the scope is not reduced, or Auth restore
would be required to recover app identity.

### Phase 4. Restore Rehearsal

**Goal:** Prove the backup/export is usable before Gate 2.

**Inputs:** `03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md`.

**Required actions:**

- Restore the logical database dump into a local or throwaway target.
- Compare critical public table counts and preserved identity counts against the
  baseline.
- Restore or re-upload one Storage sample from each non-empty selected bucket
  into a safe target when practical.
- Prove no raw dump/export artifact is inside the repo.

**Deliverables:**

- `04-restore-rehearsal.md`.
- `04-restored-count-comparison.csv`.
- `04-storage-sample-restore.md`.
- `04-repo-artifact-absence-scan.txt`.

**Stop if:** restore fails, counts diverge without explanation, samples cannot be
restored, or raw artifacts are found in the repo.

### Phase 5. Live Manifest Generation

**Goal:** Produce reviewed, machine-readable manifests that drive SQL and
Storage cleanup.

**Inputs:** `02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md`,
`11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md`.

**Required actions:**

- Generate database manifest from live tables and FK graph.
- Generate negative manifest rows for `auth.*`, `storage.buckets`,
  `realtime.*`, `supabase_migrations.*`, and extension-owned schemas.
- Generate Storage manifest from Storage listing plus DB-derived source rows
  where possible.
- Mark every decision-required table/object explicitly.
- Use `reset-by-parent-delete` for `workspace_members` under Variant A unless a
  fresh trigger review proves explicit child delete is safe.
- Treat `notification_definitions` and `notification_deliveries` as
  decision-required. If `notification_deliveries` has live scoped rows, the
  owner must choose whether to export/allow parent cascade, retain parents, or
  defer to a separate nulling/schema plan.
- Treat `collaboration_audit_events`, `beta_feedback_submissions`, and
  `user_onboarding_profiles` as decision-required with default preserve until
  resolved.

**Deliverables:**

- `05-database-reset-manifest.csv`.
- `05-negative-managed-schema-manifest.csv`.
- `05-storage-reset-manifest.csv`.
- `05-decision-required-resolution.md`.
- `05-fk-review.md`.

**Stop if:** any public table is missing, any managed schema is destructive,
any decision-required row is unresolved, FK side effects contradict the chosen
action, or Storage paths cannot be allow-listed.

### Phase 6. Delete Strategy Review

**Goal:** Convert manifest intent into a safe ordered delete strategy.

**Inputs:** `08-BLAST-RADIUS-RISKS-AND-GO-NO-GO.md`,
`11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md`, relevant migrations.

**Required actions:**

- Review parent-delete versus explicit child-delete behavior for every reset
  group.
- Prove trigger implications, especially:
  - `workspace_members_enforce_owner_floor` in
    `supabase/migrations/20260613192255_teamspace_membership_atomic_guards.sql`;
  - notification delivery cascades in
    `supabase/migrations/20260614125313_20260606090000_notification_system.sql`.
- Confirm no preserve table is silently changed except approved FK nulling.
- Decide whether any `TRUNCATE` is proposed. Default answer should be no for
  Variant A unless table-specific proof says otherwise.

**Deliverables:**

- `06-delete-order-review.md`.
- `06-trigger-impact-review.md`.
- `06-preserve-table-hash-plan.csv`.

**Stop if:** explicit child delete would hit membership-floor triggers, preserve
tables would cascade unexpectedly, `CASCADE` reaches unlisted tables, or
trigger/audit behavior is not understood.

### Phase 7. Reset SQL Authoring

**Goal:** Author rollback-only SQL from the reviewed manifest.

**Inputs:** `11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md`, outputs from Phases 5
and 6.

**Required actions:**

- Use one correlation id in SQL comments.
- Set conservative lock and statement budgets.
- Include pre-count, post-count, Auth ID/count, profile ID/count/critical-column,
  preserve-table hash, and manifest delta checks.
- Use explicit table names.
- Exclude `auth`, `storage`, `realtime`, `supabase_migrations`, extensions, DDL,
  migrations, grants, RLS changes, bucket changes, and typegen.
- End the first version with `ROLLBACK`.

**Deliverables:**

- `07-reset-dry-run.sql`.
- `07-reset-script-review.md`.

**Stop if:** SQL contains broad drops, unmanaged `TRUNCATE public.* CASCADE`,
unlisted cascade, managed schema mutation, schema drift repair, seed, typegen, or
destructive commit before Gate 2.

### Phase 8. Rollback-Only Dry Run

**Goal:** Prove SQL deltas without committing destructive changes.

**Inputs:** `07-reset-dry-run.sql`, `07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md`.

**Required actions:**

- Run dry run in a transaction with rollback.
- Capture pre/post counts inside the transaction.
- Confirm rollback occurred.
- Compare deltas to manifest.
- Verify Auth IDs/count unchanged.
- Verify profile IDs/count/critical columns unchanged except allowed
  `default_workspace_id` changes.
- Verify preserve-table hashes match.
- Record timing, locks, and budget fit.

**Deliverables:**

- `08-dry-run-transcript-redacted.sql`.
- `08-dry-run-delta-comparison.csv`.
- `08-rollback-proof.md`.

**Stop if:** any delta mismatches, rollback is not proven, lock waits exceed
budget, identity/preserve invariants fail, or row/object volume exceeds reviewed
assumptions.

### Phase 9. Gate 2 Destructive Execution Package

**Goal:** Prepare owner-facing evidence and obtain fresh destructive authority.

**Inputs:** Phase 1-8 deliverables and
`10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md`.

**Required actions:**

- Summarize Gate 1 evidence.
- Name reset variant, expected deltas, Storage deletion scope, backup/export
  proof, restore proof, dry-run proof, verification owner, rollback owner,
  maintenance window, accepted residual risk, and credential lifecycle.
- Require exact owner instruction authorizing Gate 2.
- Reconfirm project ref and maintenance/offline posture immediately before
  execution.

**Deliverables:**

- `09-gate-2-package.md`.
- `09-owner-gate-2-instruction.md`.
- `09-maintenance-window.md`.

**Stop if:** Gate 2 is missing, stale, partial, untrusted, or does not include
the required scope and evidence references.

### Phase 10. Destructive Database Execution

**Goal:** Execute the reviewed database reset once.

**Inputs:** Gate 2 package and reviewed SQL.

**Required actions:**

- Keep one execution owner.
- Reconfirm `ebxxqidacheyapmmzavr`.
- Reconfirm critical pre-counts immediately before commit.
- Replace rollback with commit only in the reviewed execution copy.
- Run the SQL once.
- Capture immediate post-counts and identity/preserve invariants.
- Do not run migrations, seed, schema repair, typegen, or app code changes.

**Deliverables:**

- `10-db-execution-transcript-redacted.sql`.
- `10-post-db-counts.csv`.
- `10-post-db-identity-preserve-proof.md`.

**Stop if:** pre-counts changed materially from dry run without review, SQL drift
appears, maintenance posture is not active, or any identity/preserve check fails.

### Phase 11. Post-Commit Storage Cleanup

**Goal:** Delete only approved exported app objects after DB commit.

**Inputs:** Storage manifest and Phase 10 success.

**Required actions:**

- Use Storage API/tooling only.
- Delete approved exported objects in bounded chunks.
- Default chunk size is 100 paths unless current tooling proves another limit.
- Use one active delete batch per bucket by default.
- Retry failed batches at most 3 times with bounded backoff.
- Treat missing objects as success only after allow-listing.
- Record failed, rejected, missing, retried, and deleted paths.

**Deliverables:**

- `11-storage-cleanup-report.json`.
- `11-storage-post-counts.csv`.
- `11-storage-retry-or-resume-plan.md` when failures remain.

**Stop if:** Storage export proof is missing, path allow-listing fails, tooling
would mutate `storage.objects` directly, bucket definitions/policies would be
changed, or failures cannot be resumed safely.

### Phase 12. Provider And App Verification

**Goal:** Prove the reset did not break provider invariants or app workflows.

**Inputs:** `06-APP-SURFACE-IMPACT-MAP.md`,
`07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md`,
`12-POST-RESET-UX-CONTRACT.md`.

**Required provider checks:**

- exact public table counts;
- Auth IDs/count;
- profile IDs/count/critical columns;
- preserved table counts and hashes;
- RLS enabled status;
- function owner/search_path/grants/hash comparison;
- trigger inventory;
- Storage bucket flags, policies, object counts;
- linked readiness evidence when applicable.

**Required app checks:**

- existing Auth user logs in and passes closed-beta;
- `/workshop` handles null default workspace through bootstrap or setup recovery;
- empty projects state renders, then a new project can be created;
- project image upload/read/delete works;
- new estimate sheet, tabs/nodes/rows work;
- empty library state renders, then folder/component/price option can be created;
- library component can be inserted into an estimate;
- new publication/share link works and can be revoked or rotated;
- old project, estimate, public-share, invite, and Storage identifiers fail
  closed;
- settings profile and workspace surfaces render;
- copy is factual and non-alarming;
- keyboard/focus/a11y checks pass;
- mobile/touch proof is recorded for the core empty-state/create flows.

**Deliverables:**

- `12-provider-post-reset-proof.md`.
- `12-app-smoke-matrix.md`.
- `12-stale-link-proof.md`.
- `12-copy-a11y-responsive-proof.md`.

**Stop if:** old data is exposed, generic 500s appear, app code changes are
needed, Auth/profile/beta/legal/security invariants fail, or browser/manual
proof is skipped for Auth/share/invite/upload without an equivalent proof.

### Phase 13. Closeout And Durable Record

**Goal:** Make the final claim narrow, evidenced, and recoverable.

**Inputs:** all phase evidence.

**Required actions:**

- Run secret/path scan over committed evidence.
- Confirm raw dumps and Storage exports are outside repo.
- Confirm credential rotation/revocation proof if required.
- Record known gaps.
- Close maintenance window only after provider and app proof pass or after
  rollback/stop decision.
- Update `.ai/10_state/current-state.md` only if provider/app reality changed
  and the owner wants the durable state recorded.

**Deliverables:**

- `13-final-reset-report.md`.
- `13-secret-and-artifact-hygiene-scan.txt`.
- `13-credential-lifecycle.md`.
- `13-known-gaps.md` if any.

**Stop if:** final evidence cannot distinguish local proof from provider proof,
secrets/raw artifacts are present, or known gaps affect the reset claim.

## Implementation Units

### U0. Authority, Lane, And Evidence Setup

- **Goal:** Establish the safe operating lane and evidence container.
- **Requirements:** R-SAFE-001 through R-SAFE-007, R-EVIDENCE-001.
- **Dependencies:** none.
- **Files/artifacts:** `00-owner-authorization.md`, `00-run-context.md`,
  `01-gate-1-checklist.md`.
- **Approach:** Treat the user instruction as insufficient unless it names Gate
  1 or Gate 2 fields. Record exact scope and keep destructive execution disabled
  until Gate 2.
- **Verification:** Trusted authorization provenance exists; project ref is
  named; no destructive work is authorized by accident.

### U1. Fresh Provider And Schema Baseline

- **Goal:** Replace stale 2026-06-22 counts with live execution-time facts.
- **Requirements:** R-SAFE-001, R-ID-002, R-ID-003, R-MANIFEST-004.
- **Dependencies:** U0.
- **Files/artifacts:** `02-provider-baseline.json`,
  `02-public-table-counts.csv`, `02-fk-graph.csv`,
  `02-auth-users-baseline.csv`, `02-profiles-baseline.csv`,
  `02-function-policy-baseline.json`, `02-storage-baseline.csv`.
- **Approach:** Capture provider metadata, table counts, Auth/profile identity
  evidence, FK graph, functions, RLS, policies, triggers, migrations, and
  Storage objects.
- **Verification:** Baseline covers every public table, target bucket, Auth
  users, profiles, and critical function/security surfaces.

### U2. Backup And Export Proof

- **Goal:** Create recoverable off-repo backup/export artifacts.
- **Requirements:** R-RECOVERY-001 through R-RECOVERY-003.
- **Dependencies:** U1.
- **Files/artifacts:** `03-backup-export-metadata.md`,
  `03-storage-export-manifest.csv`, `03-artifact-hashes.txt`.
- **Approach:** Prefer Supabase CLI logical dump after checking current help;
  use `pg_dump` only as fallback. Export Storage separately.
- **Verification:** Hashes, custodian, retention, and off-repo proof exist; no raw
  artifact is in the repo.

### U3. Restore Rehearsal

- **Goal:** Prove rollback before destructive authority.
- **Requirements:** R-RECOVERY-004, R-RECOVERY-005.
- **Dependencies:** U2.
- **Files/artifacts:** `04-restore-rehearsal.md`,
  `04-restored-count-comparison.csv`, `04-storage-sample-restore.md`,
  `04-repo-artifact-absence-scan.txt`.
- **Approach:** Restore DB into local/throwaway target and Storage samples into
  a safe equivalent target when practical.
- **Verification:** Counts and sample object proof match expected metadata.

### U4. Database And Storage Manifest Generation

- **Goal:** Produce the manifest that controls all destructive scope.
- **Requirements:** R-MANIFEST-001 through R-MANIFEST-005, R-STORAGE-003.
- **Dependencies:** U1, U2.
- **Files/artifacts:** `05-database-reset-manifest.csv`,
  `05-negative-managed-schema-manifest.csv`, `05-storage-reset-manifest.csv`,
  `05-decision-required-resolution.md`, `05-fk-review.md`.
- **Approach:** Generate from live metadata and classify each table/object once.
  Decision-required defaults to preserve until resolved.
- **Verification:** No missing table/object, no destructive managed-schema row,
  no unresolved decision-required item before Gate 2.

### U5. Delete Strategy And FK Review

- **Goal:** Prove parent/child delete order and trigger behavior.
- **Requirements:** R-SQL-001 through R-SQL-005.
- **Dependencies:** U4.
- **Files/artifacts:** `06-delete-order-review.md`,
  `06-trigger-impact-review.md`, `06-preserve-table-hash-plan.csv`.
- **Approach:** Review FK graph and migrations. Use parent cascade where that is
  the safe mechanic, especially `workspace_members`; resolve notification
  delivery behavior before SQL.
- **Verification:** Reviewer can trace every expected row delta to an explicit
  delete or parent FK action.

### U6. Rollback-Only SQL Authoring

- **Goal:** Produce reviewed dry-run SQL.
- **Requirements:** R-SQL-006, R-SQL-007.
- **Dependencies:** U5.
- **Files/artifacts:** `07-reset-dry-run.sql`, `07-reset-script-review.md`.
- **Approach:** Include budgets, pre/post checks, identity/preserve invariants,
  and `ROLLBACK`. Do not include schema/app changes.
- **Verification:** Script scan finds no forbidden schema, broad cascade, drop,
  migration, seed, or direct Storage mutation.

### U7. Dry Run And Delta Review

- **Goal:** Prove reset deltas in a rollback-only transaction.
- **Requirements:** R-SQL-006, R-ID-002 through R-ID-005.
- **Dependencies:** U6.
- **Files/artifacts:** `08-dry-run-transcript-redacted.sql`,
  `08-dry-run-delta-comparison.csv`, `08-rollback-proof.md`.
- **Approach:** Run transaction, compute deltas, rollback, and compare every
  count/hash/invariant.
- **Verification:** Dry-run deltas match manifest and rollback is proven.

### U8. Gate 2 Package

- **Goal:** Secure fresh destructive execution authorization.
- **Requirements:** R-SAFE-003 through R-SAFE-006.
- **Dependencies:** U7, U3.
- **Files/artifacts:** `09-gate-2-package.md`,
  `09-owner-gate-2-instruction.md`, `09-maintenance-window.md`.
- **Approach:** Summarize proof and required decisions for the owner without
  exposing secrets or raw artifacts.
- **Verification:** Gate 2 instruction names project ref, variant, Storage
  scope, decisions, backup/export/restore/dry-run proof, verification owner, and
  maintenance window.

### U9. Database Reset Execution

- **Goal:** Execute exactly one reviewed DB reset.
- **Requirements:** R-SAFE-007, R-SQL-007, R-ID-001 through R-ID-006.
- **Dependencies:** U8.
- **Files/artifacts:** `10-db-execution-transcript-redacted.sql`,
  `10-post-db-counts.csv`, `10-post-db-identity-preserve-proof.md`.
- **Approach:** One operator lane, one transaction, immediate post-counts.
- **Verification:** Auth/profile/preserve invariants pass; reset tables match
  expected post-counts.

### U10. Storage Cleanup Execution

- **Goal:** Remove approved exported app objects after DB commit.
- **Requirements:** R-STORAGE-001 through R-STORAGE-005.
- **Dependencies:** U9.
- **Files/artifacts:** `11-storage-cleanup-report.json`,
  `11-storage-post-counts.csv`, `11-storage-retry-or-resume-plan.md` when
  failures remain.
- **Approach:** Use API/tooling with allow-listed paths, chunking, retry, and
  resume metadata.
- **Verification:** Buckets/policies remain, approved objects are removed or
  failures are documented for safe resume.

### U11. Provider Invariant Verification

- **Goal:** Prove provider security and schema posture survived.
- **Requirements:** R-ID-001 through R-ID-006, R-EVIDENCE-002.
- **Dependencies:** U9, U10.
- **Files/artifacts:** `12-provider-post-reset-proof.md`.
- **Approach:** Compare RLS, policies, functions, triggers, grants, Storage
  policies, Auth/profile IDs, counts, and preserve-table hashes.
- **Verification:** No unapproved drift exists.

### U12. App And UX Verification

- **Goal:** Prove existing users can use the empty app safely.
- **Requirements:** R-UX-001 through R-UX-005, R-SEC-001.
- **Dependencies:** U11.
- **Files/artifacts:** `12-app-smoke-matrix.md`,
  `12-stale-link-proof.md`, `12-copy-a11y-responsive-proof.md`.
- **Approach:** Run manual or automated real-surface proof for Auth, stale
  links, Storage, and core create flows; supplement with targeted DOM/component
  tests if app code was hardened earlier.
- **Verification:** Every surface in `12-POST-RESET-UX-CONTRACT.md` has
  actor, route, starting condition, action, visible result, a11y/mobile proof,
  and redaction status.

### U13. Closeout, Hygiene, And Durable State

- **Goal:** Close the reset with a narrow, evidenced claim.
- **Requirements:** R-SEC-001, R-SEC-002, R-EVIDENCE-001, R-EVIDENCE-002.
- **Dependencies:** U12.
- **Files/artifacts:** `13-final-reset-report.md`,
  `13-secret-and-artifact-hygiene-scan.txt`,
  `13-credential-lifecycle.md`, `13-known-gaps.md`.
- **Approach:** Scan evidence, record credential lifecycle, report gaps, and
  update durable project state only when provider/app reality changed.
- **Verification:** Final report distinguishes provider, SQL, Storage,
  real-surface app, local, and manual evidence.

## Pros And Cons

### Reset Variants

| Variant | Pros | Cons | Decision |
|---|---|---|---|
| Variant A: Auth-preserving content reset | Best match for clean app-content testing while keeping existing users, profiles, beta access, and legal/security evidence. Existing workspace bootstrap can recreate fresh workspace state. | Most complex FK/delete graph; must prove null-workspace bootstrap; deleting workspace membership while preserving profiles needs precise parent-cascade handling. | Default and recommended. |
| Variant B: content-only reset | Lower operational risk because workspaces, memberships, and default workspace stay intact. Fewer FK and trigger surprises. | Less "from scratch"; retained workspace/account/library context can bias testing. | Use only if owner wants existing workspace membership preserved. |
| Variant C: Auth-only app identity reset | Cleanest app-owned identity reset short of deleting Supabase Auth. | High risk; profile, beta, legal, and security scaffolding must be reseeded or recovered. | Separate plan required. |

### Delete Methods

| Method | Pros | Cons | Decision |
|---|---|---|---|
| Ordered `DELETE` | Triggers fire, row deltas are visible, selective retention is easier, rollback rehearsal maps to execution. | Slower than `TRUNCATE`; requires delete-order proof. | Default for Variant A. |
| Table-specific `TRUNCATE` | Fast for large fully reset tables. | Strong locks, skips `ON DELETE` triggers, cascade risk, less selective. | No default use; requires table-specific proof. |
| Parent delete with FK cascade | Can respect teardown triggers and simplify child cleanup when FK behavior is known. | Can erase decision-required scoped rows if not reviewed. | Use only when FK graph and manifest list every expected child delta. |
| Explicit child delete | Highly visible and reviewable for leaf tables. | Can trip top-level guard triggers, as with `workspace_members`. | Use for leaf/reset tables only after trigger review. |

### Storage Tooling

| Approach | Pros | Cons | Decision |
|---|---|---|---|
| Extend existing mass-deletion cleanup helpers | Reuses local allow-list/chunking patterns. | Current helper does not export objects, hash them, list whole buckets, retry with full reset manifests, or handle reset evidence. | Use as a pattern, not as the whole solution. |
| Build a reset-specific Storage export/cleanup operator script | Can encode export, hash, allow-list, retry, resume, and evidence schema. | More implementation work and must be reviewed carefully. | Preferred if Storage cleanup is in scope. |
| Manual dashboard cleanup | Lower code footprint. | Weak reproducibility, weaker evidence, higher human error risk. | Avoid unless tooling cannot operate safely and owner accepts manual proof. |

### App Verification

| Approach | Pros | Cons | Decision |
|---|---|---|---|
| Targeted manual real-surface smoke | Proves Auth, stale links, Storage, and real UI quickly. | Requires disciplined evidence/redaction. | Required for Auth/share/invite/upload if no equivalent automated proof exists. |
| Targeted DOM/component tests | Fast, repeatable, good for empty states and copy/a11y contracts. | Cannot prove provider state or real Auth/Storage behavior alone. | Use for pre-reset hardening and regression lock. |
| Full Playwright/browser matrix | Strongest UI proof. | Slow and unnecessary for every claim. | Use when interaction/routing/Auth/Storage proof cannot be established more narrowly. |

## SWOT Analysis For Variant A

| Type | Analysis |
|---|---|
| Strengths | Preserves Auth and identity scaffolding; aligns with closed-beta access; keeps legal/security/audit evidence; uses explicit two-gate authority; separates DB backup from Storage export; gives the owner a clean app-content state. |
| Weaknesses | Delete graph is complex; some preserved/decision-required tables have FK interactions with reset parents; Storage cleanup needs reset-specific tooling; UX proof must distinguish a real empty state from crashes. |
| Opportunities | Add durable reset manifests, FK graph automation, identity ID comparisons, preserve-table hashes, credential lifecycle proof, and reusable UX evidence templates for future provider operations. |
| Threats | Wrong project ref, ambiguous branch target, spoofed/stale owner instruction, incomplete Storage export, unlisted cascade, trigger-blocked child deletes, leaked proof artifacts, or old share/invite tokens exposing data. |

## Decision Register For Future Executor

| Decision ID | Decision | Default | Required before Gate 2 |
|---|---|---|---|
| DEC-001 | Reset variant | Variant A | Owner confirms A, B, or C. |
| DEC-002 | Storage cleanup scope | Delete exported app objects in selected buckets | Owner names buckets/object set; incomplete exports removed from scope or waived. |
| DEC-003 | Collaboration audit | Decision-required, default preserve | Owner accepts preserve/FK nulling/export/reset action. |
| DEC-004 | Notifications | Decision-required | Owner resolves `notification_definitions` and `notification_deliveries`, especially live scoped deliveries. |
| DEC-005 | Beta feedback | Decision-required, default preserve | Owner decides preserve or export-and-reset. |
| DEC-006 | User onboarding profiles | Decision-required, default preserve | Owner decides preserve or re-onboarding reset. |
| DEC-007 | Workspace members | Reset by parent workspace delete for Variant A | FK/trigger review confirms parent-cascade strategy. |
| DEC-008 | Reseeding | No reseed | Owner explicitly requests any seed and accepts expected counts. |
| DEC-009 | App code hardening | Separate pre-reset plan only | Any required code change is completed and verified before reset window. |
| DEC-010 | Display-name rename | Optional and separate | Owner separately authorizes provider metadata rename. |
| DEC-011 | Credential lifecycle | Prefer temporary/scoped credentials | Rotation/revocation plan exists if credentials are new, shared, logged, or exposed. |

## Traceability Matrix

| Requirement group | Source docs | Implementation units | Evidence |
|---|---|---|---|
| Project/Auth boundary | `00-PLAN.md`, `02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md`, `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md` | U0, U1, U8, U9, U11 | provider baseline, Gate 2 package, post-DB identity proof |
| Backup/export/restore | `03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md`, `07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md` | U2, U3, U8 | backup metadata, hashes, restore rehearsal |
| Manifest/FK/delete strategy | `02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md`, `11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md`, relevant migrations | U4, U5, U6, U7 | DB manifest, FK review, dry-run transcript |
| Storage cleanup | `02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md`, `03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md`, `04-RESET-RUNBOOK.md` | U2, U4, U10 | Storage export manifest, cleanup report, post-counts |
| Schema/seed/type exclusions | `05-SCHEMA-MIGRATION-SEED-AND-TYPES-PLAN.md` | U6, U9, U13 | script scan, diff/status checks |
| Provider security invariants | `01-CURRENT-STATE-AUDIT.md`, `07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md`, `08-BLAST-RADIUS-RISKS-AND-GO-NO-GO.md` | U1, U11 | function/RLS/policy baseline comparison |
| UX/app smoke | `06-APP-SURFACE-IMPACT-MAP.md`, `12-POST-RESET-UX-CONTRACT.md`, `13-ADVERSARIAL-QA-SCENARIO-MATRIX.md` | U12 | app smoke matrix, stale-link proof, copy/a11y proof |
| Evidence hygiene | `03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md`, `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md` | U0, U2, U8, U13 | redaction, secret scan, credential lifecycle |
| Optional naming | `15-SUPABASE-PROJECT-NAMING-PLAN.md` | U0 or separate naming lane | before/after display-name proof, ref unchanged |

## Gate Checklist

| Gate | Owner | Must prove | Blocks |
|---|---|---|---|
| G0 Scope gate | lead executor | lane, project ref, non-destructive posture, dirty worktree awareness | any provider mutation |
| G1 Preparation authorization | owner/operator | trusted Gate 1 instruction, evidence path, off-repo raw artifact path | backup/export/dry-run prep |
| G2 Provider baseline | provider verifier | current project/ref, counts, FK graph, RLS/functions/policies, Storage baseline | manifest generation |
| G3 Recovery proof | backup operator | logical backup hash, Storage export hash, DB restore, Storage sample restore | Gate 2 |
| G4 Manifest review | manifest reviewer | all tables/objects classified, decisions resolved, FK side effects understood | SQL authoring |
| G5 Dry-run proof | execution owner + reviewer | rollback-only transcript, deltas match, identity/preserve invariants pass | Gate 2 |
| G6 Destructive authorization | owner/operator | fresh Gate 2 instruction with exact scope and proof references | DB reset |
| G7 DB execution | execution owner | one reviewed transaction, post-counts, Auth/profile/preserve proof | Storage cleanup |
| G8 Storage cleanup | storage operator | API-only cleanup, exported allow-listed objects, chunk/retry report | final app claim |
| G9 Provider/app verification | verifier | provider invariants and app smoke pass | closeout |
| G10 Hygiene closeout | lead executor | redaction, no raw artifacts, credential lifecycle, known gaps | final completion claim |

## Adversarial QA Matrix For The Future Executor

| Scenario | Required proof |
|---|---|
| Wrong project ref | Provider metadata and local temp ref both show `ebxxqidacheyapmmzavr` immediately before dry run and execution. |
| Stale or spoofed owner instruction | Trusted channel, actor, timestamp, exact text, and anti-replay check recorded. |
| Auth/profile loss hidden by count equality | Auth/profile ID comparisons and critical-column hashes recorded. |
| Workspace member child delete trigger failure | Delete strategy review proves parent-cascade or separately approved alternative. |
| Notification rows silently cascade | Decision-required resolution and FK graph show accepted behavior. |
| Unlisted cascade reaches preserve table | FK review lists every reached table and delta. |
| Incomplete Storage export | Affected objects removed from delete scope or explicit waiver recorded. |
| Direct managed Storage mutation | Cleanup report proves API/tooling path, no bucket or metadata table deletion. |
| Function/RLS drift hidden by counts | Pre/post function owner/search_path/grant/hash and RLS policy comparison. |
| Old share/invite token leaks | Real-surface stale-link proof with redacted tokens and no old data. |
| UX empty state is actually a crash | Per-surface matrix records heading, action, visible result, and no generic 500. |
| Evidence leaks secrets | Final secret/path/token scan passes and raw artifacts are absent from repo. |
| Browser proof skipped incorrectly | Auth/share/invite/upload have manual or automated real-surface proof. |

## Completion Definition

The future reset is complete only when all of these are true:

- Gate 1 and Gate 2 evidence exists with trusted owner provenance.
- Project ref was `ebxxqidacheyapmmzavr` at every required checkpoint.
- Logical backup and separate Storage export exist outside the repo and restore
  proof passed.
- Every public table/object has a reviewed manifest action.
- Every decision-required item is resolved.
- Rollback-only dry run passed with matching deltas.
- DB execution ran once from reviewed SQL after Gate 2.
- Storage cleanup removed only approved exported objects after DB commit.
- Auth IDs/count and Variant A profile IDs/count/critical columns are preserved.
- Reset content tables and Storage objects match expected post-counts.
- RLS, policies, functions, grants, triggers, and buckets have no unapproved
  drift.
- Existing users can log in and complete the empty-state/new-data app smoke.
- Old project, estimate, share, invite, and Storage identifiers fail closed.
- Evidence is sanitized, raw artifacts are outside the repo, credential lifecycle
  is recorded, and known gaps are explicit.

If any item is missing, the final report must say the reset is incomplete or
blocked. Do not mark the goal complete by intent, partial evidence, or local
tests alone.
