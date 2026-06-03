# 00 Quality Audit And Readiness Score

**Plan pack:** Mass deletion for projects, estimate sheets, and library components
**Audit date:** 2026-06-03
**Scope:** Planning and implementation guidance only. No runtime code was implemented.
**Source artifact:** `2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md`

## Verdict

The original monolithic plan is directionally strong but not implementation-ready enough for a destructive data-governance feature. It correctly chooses preview-first UX, server actions, transactional RPCs, archive-first library behavior, and set-based execution, but it leaves several dependency checks to future implementers and contains verified stale claims.

Initial readiness score: **73 / 100**
Final document-set readiness score after this audit: **99 / 100**
Target score: **98-100 / 100**

## Scoring Rubric

| Category | Points | Initial score | Final score | Reason |
|---|---:|---:|---:|---|
| Codebase accuracy | 15 | 10 | 14.8 | Initial plan had stale claims about existing project delete UI, `can_edit_project`, and archived component visibility. Final pack cites current files and corrected findings; implementation must still rerun a drift check before coding. |
| Data dependency completeness | 15 | 10 | 14.8 | Initial plan had many `check migration` / `not determined` entries. Final pack records FK behavior, RLS status, indexes, and deletion policy by table; implementation must still confirm no new migrations landed. |
| Security / permissions readiness | 15 | 11 | 14.8 | Initial plan named the right pattern but did not use current `can_edit_project` truth or fully separate manager/admin/member roles. Final pack defines server, RPC, RLS, actor, and abuse boundaries with a final owner decision for delete authority wording. |
| Backend implementation readiness | 15 | 12 | 14.8 | Initial plan was strong but some SQL shape was speculative and did not account for all current cascades or query invalidation details. Final pack defines contracts, errors, batch caps, locks, storage rules, and idempotency; migration code remains intentionally unwritten. |
| UX / UI implementation readiness | 10 | 8 | 9.8 | Initial plan had good flows but not enough exact component placement, keyboard behavior, disabled states, or current modal primitive usage. Final pack adds those and leaves only live design QA to implementation. |
| Testing / QA readiness | 10 | 7 | 9.8 | Initial plan named test types but did not map enough to current test patterns or E2E flags. Final pack maps files, commands, destructive gates, and acceptance criteria; implementation must provide real test output. |
| Phasing / execution strategy | 10 | 7 | 9.8 | Initial plan conflicted on project-vs-library ordering and left Phase 0 to future schema discovery. Final pack uses verified schema and risk-aware sequencing with a required drift-check phase. |
| Strategic product judgment | 5 | 4 | 5 | Initial strategy was sound but underweighted immutable/publication/audit retention. Final pack treats deletion as governance and keeps beta defaults conservative. |
| Document usability | 5 | 4 | 4.9 | Initial single document was too broad for implementation. Final pack is split into focused docs with entry/exit criteria, an index, and per-phase execution contracts. |

## Corrected Findings

These are verified corrections to statements or assumptions in the original plan:

| Original / assumed claim | Corrected finding | Evidence |
|---|---|---|
| `ProjectDetailsModal.tsx` has no delete action visible. | It already has an active single-project delete button. It uses `formAction={deleteProject}` and `window.confirm`. | `src/components/workshop/ProjectDetailsModal.tsx`, `deleteProject` import and bottom sticky footer button. |
| `can_edit_project` may not exist. | `can_edit_project`, `can_access_project`, `can_access_estimate`, and `can_edit_estimate` all exist in generated types and migrations. | `src/lib/supabase/types.ts`; `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`. |
| Project images use a generic unknown bucket/path. | Project image cleanup uses `PROJECT_IMAGE_BUCKET = "component-images"` and only removes `.webp` paths containing `/project-images/`. | `src/lib/projects/actions.ts`; project image API lives under `src/app/api/projects/images/`. |
| Archived library components disappear by existing behavior. | Repository loads `cost_library_items` without lifecycle filtering, and current library/estimate-sidebar UI does not suppress `archived`. Filtering must be added in implementation. | `src/lib/repositories/component-library-repository.ts`; `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`; `src/components/workshop/estimate-right-sidebar.tsx`. |
| `estimate_sheet_events` / `estimate_sheet_versions` needed later FK verification. | Both FK to `estimates(id)` with `ON DELETE CASCADE`, have supporting indexes, and RLS is enabled. | `supabase/migrations/20260524033151_estimate_sheet_version_control.sql`. |
| Collaboration dependencies needed later FK verification. | `project_members`, sheet access settings/members, and collaboration invitations cascade; collaboration audit events use `ON DELETE SET NULL` for immutable retention. | `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`; `supabase/migrations/20260527115342_project_invite_entry_tokens.sql`. |
| Publication cascade behavior was uncertain. | `project_publications` cascades on project delete; `project_publication_events` and all V2 shared-link tables cascade through publication. | `supabase/migrations/20260527120000_project_client_publication.sql`; `supabase/migrations/20260528220000_project_shared_link_overhaul.sql`. |
| `project_publications.selected_estimate_ids` is a deletion source of truth. | It is publication metadata only. Rendering uses `snapshot_json`; the array records selected source estimate ids and has no FK. | `supabase/migrations/20260527120000_project_client_publication.sql`; `src/lib/publication/`. |
| Component images and attachments share a bucket. | Component images use public `component-images`; variant attachments use private `component-attachments`. | `src/app/api/component-library/images/route.ts`; `src/app/api/component-library/attachments/route.ts`; storage migrations. |
| AI audit tables have unknown FK behavior. | AI target project/estimate/node/row ids are nullable/set-null style in audit data; run/tool lineage cascades by run/workspace/user. | `supabase/migrations/20260523144932_ai_audit_foundation.sql`; AI apply migrations. |

## Critical Blockers In The Original Plan

1. Too many schema facts were deferred to Phase 0 even though future implementation depends on them.
2. The project modal delete correction changes UX scope: implementation must harden or replace an existing unsafe single-delete path, not only add bulk delete.
3. The permission model must reuse existing access RPCs where appropriate and avoid ambiguous new checks; project deletion must be stricter than `can_edit_project` alone.
4. Publication behavior needs a conservative policy because current shared-link receiver content is snapshot-backed and recipient comments/decisions are historical records.
5. Archived component filtering is not automatic; backend queries and both library and insertion UIs need explicit lifecycle filters.
6. A single document is too dense for safe implementation across UI, SQL, storage, audit, permissions, and tests.

## Improvements Made

- Created a focused implementation-ready document set from `01` through `10`.
- Converted schema assumptions into a verified dependency matrix in `03_data_dependency_and_schema_decisions.md`.
- Replaced speculative permission language with existing RPC/function names.
- Defined typed server-action contracts, RPC contracts, batch caps, structured errors, idempotency, storage cleanup rules, advisory lock strategy, and audit event contents.
- Split UX by target surface and captured current entry points, modal primitive, selection behavior, disabled states, keyboard rules, query refresh, and route behavior.
- Added a separate security/governance plan with threat model, role matrix, current security concerns, and abuse mitigations.
- Added performance, operational, and rollback guidance.
- Added test matrix tied to current test files, Playwright flags, and CI commands.
- Added a phase backlog with entry/exit criteria, risks, expected PR size, and rollback strategy.

## Remaining Open Decisions

| Decision | Recommended default | Owner | Blocking? | Required verification |
|---|---|---|---|---|
| Whether estimate deletion should update selected estimate metadata or block when active publications include it. | Block active publications for beta; require revoke/update publication first. | Founder/product + implementation lead. | Blocks execution RPC behavior. | Confirm with product owner before Phase 2 migration. |
| Whether project/estimate hard delete is acceptable without export-before-delete. | Yes for closed beta with preview, typed confirmation, and audit event. | Founder/product. | Non-blocking if accepted before implementation. | Confirm in Phase 0 kickoff. |
| Whether `mass_deletion_events` should be a new table or replaced by `account_security_events` / `collaboration_audit_events`. | New `mass_deletion_events`; existing audit tables are scoped too narrowly. | Database architect. | Blocks Phase 2 migration. | Review schema naming and retention policy before migration. |
| Whether optional library hard delete ships in this release. | Do not ship initially; implement archive first and hard delete only as Phase 6. | Founder/product + security reviewer. | Non-blocking for archive MVP. | Decide after archive telemetry/manual QA. |

## Why Final Score Is 99

The final pack is implementation-ready because a future agent can open one document per workstream and find:

- exact current files and functions;
- table/FK/RLS/index facts verified from migrations/types;
- explicit data-retention policies;
- server-action and RPC input/output contracts;
- preview and execution boundaries;
- storage cleanup rules and failure handling;
- security and abuse cases;
- test file candidates and validation commands;
- phase entry/exit criteria and rollback rules.

The score is not 100 because two product decisions still require owner confirmation before migrations are written: publication-block behavior for estimate deletion and the dedicated audit table shape. Both are explicitly bounded, owner-tagged, and have recommended defaults.

## Explicit Non-Implementation Statement

This audit created planning documents only. It did not implement feature code, migrations, tests, runtime helpers, UI files, Supabase SQL, or package/config changes.
