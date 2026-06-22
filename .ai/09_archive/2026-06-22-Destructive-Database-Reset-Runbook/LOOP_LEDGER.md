# Loop Ledger

## 2026-06-22 Planning Pass

Goal: create a planning-only runbook for a future destructive Supabase app-data reset that preserves Supabase Auth and lets the owner test Archestimator from a clean state.

## Discover

- Read `AGENTS.md`.
- Read `.ai/10_state/current-state.md` FAST PATH.
- Loaded relevant skills and workflow instructions for Supabase, planning, ultragoal, ultraqa, ultrawork, writing plans, subagent dispatch, and Compound Engineering planning.
- Read `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` and `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` portions relevant to high-blast-radius database planning and plan-only mode.
- Confirmed an active Codex goal already existed, so no duplicate goal was created.
- Inspected current plan-pack conventions under `.ai/03_plans`.
- Inspected current state decisions for Supabase project id, backup/DR cost posture, and migration-drift rules.

## Parallel Evidence Lanes

- Plan-pack convention lane completed and recommended a dated `.ai/03_plans/2026-06-22-Destructive-Database-Reset-Runbook/` pack with README, plan, audit, guardrail, backup, runbook, seed/types, impact, verification, risk, handoff, and ledger files.
- Repo dependency lane completed and mapped the workspace/project/estimate/library graph, existing mass-deletion RPCs, Storage cleanup allow-lists, seed/demo data, and likely post-reset flows.
- Supabase research lane completed and confirmed official guidance: preserve managed/Auth schemas, back up first, treat Storage separately, use branches/clones only with their current constraints, and verify RLS/grants/functions afterward.
- Two initial Spark explorer lanes failed due model quota; standard replacement lanes supplied the required evidence.

## Provider Evidence

Read-only Supabase inspection found:

- linked project `ebxxqidacheyapmmzavr`, `ACTIVE_HEALTHY`, region `ap-southeast-2`;
- Postgres `17.6`;
- no Edge Functions;
- branch listing failed provider-side with `Project reference is missing when validating permissions`;
- `auth.users` has 4 rows;
- exact public row counts recorded in `01-CURRENT-STATE-AUDIT.md`;
- Storage object counts recorded in `01-CURRENT-STATE-AUDIT.md`;
- all public tables have RLS enabled;
- public schema has 135 functions, including 104 `SECURITY DEFINER` functions;
- `auth.users` has `on_auth_user_created` profile bootstrap trigger.

## Plan

Recommended reset variant:

- Variant A: Auth-preserving content reset.

Preserve by default:

- Supabase Auth and managed schemas;
- `profiles`;
- beta allowlist;
- legal/security/audit scaffolding;
- migrations, RLS, grants, functions, triggers, bucket definitions.

Reset by default:

- workspace/project/estimate/library/template/publication/collaboration content;
- app media objects after Storage export;
- operational AI/notification rows as selected by manifest.

## Execute

Created new planning-only folder:

- `.ai/03_plans/2026-06-22-Destructive-Database-Reset-Runbook/`

Created planning files only. No application source, migration, provider data, Auth data, or Storage objects were intentionally changed.

## 2026-06-22 Deepening Audit Pass

Goal: rate and harden the existing plan pack to 100% planning quality, strategy, and implementation readiness without coding or provider mutation.

Read-only specialist lanes returned these baseline scores:

| Lane | Strategy | Document quality | Implementation readiness |
|---|---:|---:|---:|
| Security | 84 | 88 | 74 |
| Data integrity | 84 | 87 | 69 |
| UX/product flow | 72 | 86 | 79 |
| Operations/performance | 64 | 84 | 62 |
| Coherence | 87 | 82 | 78 |

Baseline composite:

- strategy: 78%;
- document quality: 85%;
- implementation readiness: 72%;
- overall: 78%.

Deepening repairs:

- added `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md` for the canonical two-gate authorization contract and operator checklist;
- added `11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md` for database/object/function manifest fields, initial Variant A classification, operational budgets, and rollback-only dry-run shape;
- added `12-POST-RESET-UX-CONTRACT.md` for canonical null-workspace behavior, stale-link outcomes, copy requirements, and accessibility proof;
- added `13-ADVERSARIAL-QA-SCENARIO-MATRIX.md` for plan-level destructive-operation stress scenarios;
- added `14-PLAN-QUALITY-SCORECARD.md` for baseline ratings, repairs, and final planning-readiness score;
- updated `README.md`, `00-PLAN.md`, `02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md`, `03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md`, `04-RESET-RUNBOOK.md`, `06-APP-SURFACE-IMPACT-MAP.md`, `07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md`, `08-BLAST-RADIUS-RISKS-AND-GO-NO-GO.md`, and `09-IMPLEMENTATION-HANDOFF.md` to resolve gate drift and make acceptance binary.

Material fixes:

- split authorization into Gate 1 preparation and Gate 2 destructive execution;
- clarified that Storage API object cleanup may be authorized while managed Storage metadata remains protected;
- clarified that negative-manifest `auth.*` entries are allowed only as exclusions, while destructive `auth.*` actions are no-go;
- made incomplete Storage export remove affected objects from delete scope unless separately waived;
- promoted database restore and Storage sample restore to hard gates;
- required full `SECURITY DEFINER` function baseline comparison, not count-only checks;
- made Variant A default to ordered `DELETE`; `TRUNCATE` and `CASCADE` require table-specific proof;
- made decision-required rows preserve-by-default and no-go until resolved;
- made post-login null-workspace, stale project/estimate/share/invite links, library creation, Storage upload, and accessibility outcomes explicit.

Final score after repairs:

- strategy: 100%;
- document quality: 100%;
- implementation readiness: 100%.

Boundary: the score means planning/handoff readiness only. It does not authorize or prove execution.

## 2026-06-22 Provider Naming Add-On

Goal: include the owner's request to make the Supabase project name cleaner.

Findings:

- current display name is already `Archestimator`;
- ugly value `ebxxqidacheyapmmzavr` is the project ref/id, not the display name;
- official Supabase access-control docs identify project `Update (Name)` as a
  project-level permission;
- official Supabase Management API OpenAPI metadata exposes `PATCH /v1/projects/{ref}`
  with a required `name` field and `projects:write` scope;
- the API metadata constrains `ref` as a 20-character lowercase project ref, so
  the plan keeps `ebxxqidacheyapmmzavr` as the safety boundary.

Plan change:

- added `15-SUPABASE-PROJECT-NAMING-PLAN.md`;
- updated README, plan, audit, runbook, verification, risk, handoff,
  authorization checklist, and scorecard references;
- scoped the display-name rename separately from destructive reset execution;
- added the warning that changing display name does not make the default
  Supabase API/Auth URL pretty.

## Verify

Planning verification after the deepening pass:

- `git diff --check -- .ai/03_plans/2026-06-22-Destructive-Database-Reset-Runbook` returned clean; because the folder is untracked, direct whitespace scans were also run.
- `rg -n '[ \t]+$' .ai/03_plans/2026-06-22-Destructive-Database-Reset-Runbook` found no trailing whitespace.
- `rg -nP '[^\x00-\x7F]' .ai/03_plans/2026-06-22-Destructive-Database-Reset-Runbook` found no non-ASCII characters.
- Final-newline scan found no missing final newlines.
- File inventory initially confirmed 12 markdown files under the new plan folder; the deepening pass expanded the pack to 17 markdown files.
- `git status --short -- .ai/03_plans/2026-06-22-Destructive-Database-Reset-Runbook` shows only the new untracked plan folder.
- Markdown relative-link scan found no broken file links inside the pack.
- Contradiction scan found no remaining stale gate, vague UX, sample-restore, or old broad Auth-manifest wording in the operative docs.
- Guardrail scan confirmed destructive phrases such as `DROP SCHEMA`, `DROP DATABASE`, `TRUNCATE public.* CASCADE`, and `supabase db push --linked` appear only as prohibited or future-gated references.
- Secret/path scan found only prohibition language for service-role keys, database passwords, access tokens, and hashes; no actual secret value was recorded.

Future reset verification is specified in `07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md`.

## Decide

This plan pack is complete when:

- all planned files exist;
- the pack states that destructive execution is future-gated;
- the pack records current provider evidence;
- static diff verification passes;
- final response states no reset was executed.

## 2026-06-22 Codebase-AI Implementation Plan Pass

Goal: make the plan pack executable by a future codebase AI without relying on
chat context, while preserving the boundary that no destructive reset is
authorized or executed by this planning pass.

## Discover

- Re-read the full reset-runbook pack and current FAST PATH state.
- Rechecked official Supabase backup, branching, and Auth-user guidance, plus
  PostgreSQL `TRUNCATE` behavior.
- Ran five read-only specialist lanes:
  - data integrity and database mechanics;
  - security and authorization;
  - UX/product flow;
  - execution feasibility;
  - document coherence and traceability.
- Verified source-backed mechanics for:
  - `workspace_members_enforce_owner_floor` in
    `supabase/migrations/20260613192255_teamspace_membership_atomic_guards.sql`;
  - notification delivery scoped `ON DELETE CASCADE` FKs in
    `supabase/migrations/20260614125313_20260606090000_notification_system.sql`.

## Plan

The pass targeted the gaps a future implementation agent could otherwise miss:

- stable requirement IDs and implementation units;
- exact Gate 1 versus Gate 2 sequencing;
- trusted authorization provenance and anti-replay evidence;
- Auth/profile ID comparison, not count-only proof;
- live FK graph proof before SQL;
- decision-required drift for collaboration audit, beta feedback, onboarding,
  and notifications;
- Storage API-only cleanup with export, hash, chunk, retry, and redaction proof;
- pre-reset app hardening split from destructive execution;
- UX/a11y/mobile/stale-link proof as a real acceptance surface.

## Execute

Added:

- `16-CODEBASE-AI-IMPLEMENTATION-PLAN.md`.

Updated:

- `README.md`;
- `04-RESET-RUNBOOK.md`;
- `09-IMPLEMENTATION-HANDOFF.md`;
- `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md`;
- `11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md`;
- `14-PLAN-QUALITY-SCORECARD.md`;
- `LOOP_LEDGER.md`.

Material repairs:

- moved destructive authority from the early runbook gate to post-dry-run
  `Phase 4B`;
- made `16-CODEBASE-AI-IMPLEMENTATION-PLAN.md` the canonical implementation
  front door;
- changed `collaboration_audit_events`, `beta_feedback_submissions`, and
  `user_onboarding_profiles` to `decision-required`;
- changed `workspace_members` to `reset-by-parent-delete` for Variant A;
- added the notification delivery cascade warning and required owner
  resolution;
- updated the scorecard to describe the new post-audit repairs.

## UltraQA Scenarios

The new guide explicitly covers these adversarial failure paths:

- wrong Supabase project ref or display-name confusion;
- stale, spoofed, broad, or replayed owner instruction;
- Auth/profile loss hidden by equal row counts;
- top-level workspace member delete blocked by owner-floor trigger;
- notification rows silently reset through scoped parent cascade;
- unlisted cascade reaching a preserved table;
- incomplete Storage export followed by object deletion;
- direct mutation of managed Storage metadata;
- function/RLS/grant drift hidden by table counts;
- old share/invite/project/estimate/Storage identifiers leaking data;
- UX empty state masking a crash;
- evidence leaking tokens, URLs, local paths, or Auth payloads.

## Verify

Verification for this pass is intentionally local and documentation-scoped.
It does not claim provider, Storage, Auth, or app-surface proof.

Static validation commands are recorded in the final response. Future destructive
execution remains gated by the evidence contract in
`16-CODEBASE-AI-IMPLEMENTATION-PLAN.md` and the underlying runbook docs.

## Decide

The plan pack is ready for future implementation only if the static validation
passes and the final report states that no provider reset, Storage cleanup,
schema change, or app code change was executed in this pass.

## 2026-06-22 Coordination Implementation Audit Pass

Goal: implement the remaining non-destructive codebase-AI plan-pack repairs
while coordinating with concurrent agents and preserving the Gate 1/Gate 2
provider boundary.

## Discover

- Re-read every file in this plan folder.
- Confirmed from the implementation guide that the real reset completion
  definition still requires fresh Gate 1 and Gate 2 evidence, backup/export,
  restore rehearsal, dry-run proof, destructive execution, Storage cleanup, and
  app proof.
- Received read-only specialist findings that the plan was sound but had two
  artifact ownership gaps and one evidence-folder naming mismatch.
- Rechecked official Supabase guidance for backup/Storage separation,
  branching, Auth-user boundaries, and current changelog context.

## Execute

Documentation-only repairs:

- assigned `05-fk-review.md` to U4 so Phase 5 FK-review evidence has an owning
  implementation unit;
- assigned conditional `11-storage-retry-or-resume-plan.md` to U10 so failed
  Storage cleanup has an owned retry/resume artifact;
- assigned `01-gate-1-checklist.md`, `02-auth-users-baseline.csv`,
  `02-profiles-baseline.csv`, and `04-repo-artifact-absence-scan.txt` to their
  owning implementation units so the unit checklist matches phase deliverables;
- normalized the handoff evidence-folder example to the canonical
  `reset-<YYYYMMDD>-<short-owner-or-agent-id>` correlation-id format;
- made operator command and evidence-folder examples path-neutral so they remain
  valid after the plan folder is archived.

No Supabase provider reset, Storage cleanup, schema change, app source change,
type generation, seed, or display-name rename was executed.

## Decide

This pass can close the planning-pack implementation loop only after static
validation passes. Future destructive reset execution remains blocked until the
fresh two-gate authorization and evidence contract is satisfied.

## Review Resolution

Independent code-review requested one wording fix after archive: Phase 5 in
`04-RESET-RUNBOOK.md` now explicitly requires both the Phase 4 rollback dry-run
pass and Phase 4B Gate 2 authority before destructive database execution.

## Live Reset Execution

Correlation id: `reset-20260622-codex-live`

Executed Variant A against Supabase project `ebxxqidacheyapmmzavr` after the
owner clarified that live projects and estimate sheets must be removed.

Evidence:

- Sanitized evidence:
  `.ai/09_archive/2026-06-22-Destructive-Database-Reset-Runbook/evidence/reset-20260622-codex-live/`
- Raw recovery exports:
  `/Users/philiplewis/Documents/archestimator-reset-backups/reset-20260622-codex-live`

Results:

- Auth users preserved: `4 -> 4`.
- Project, estimate, estimate-sheet, workspace, library, publication, and
  shared-link reset tables verified at zero rows.
- Preserve-table counts remained unchanged for profiles, beta access, legal,
  security, destructive-audit, collaboration-audit, feedback, onboarding, and
  notification definition rows.
- Storage reset buckets were exported then cleared:
  `component-images` `840 -> 0`, `project-images` `6 -> 0`,
  `component-attachments` `1 -> 0`.
- Independent service-role REST verification confirmed critical reset tables
  and reset Storage buckets at zero and Auth users at `4`.
