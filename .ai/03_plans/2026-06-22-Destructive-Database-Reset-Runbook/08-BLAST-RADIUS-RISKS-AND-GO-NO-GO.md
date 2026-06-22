# 08 Blast Radius Risks And Go No-Go

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Auth users deleted or cascaded | users lose access and profiles cascade | never target `auth.*`; verify `auth.users` count before/after |
| Profiles deleted by mistake | roles/default workspace/access state lost | preserve `profiles` in Variant A; include negative manifest |
| Beta allowlist cleared | existing users blocked by closed-beta gate | preserve `closed_beta_allowed_emails` unless separately reseeded |
| Legal/security evidence erased | compliance and support history lost | preserve legal/security/audit by default |
| Storage objects not backed up | media cannot be restored | export Storage separately; DB backups do not include Storage |
| Buckets/policies deleted | uploads or public/private access break | delete objects only; preserve buckets and policies |
| `TRUNCATE CASCADE` reaches unexpected tables | broad data loss | use explicit table manifest; dry-run deltas |
| `TRUNCATE` skips delete triggers | validation/audit assumptions fail | use `DELETE` when trigger behavior matters |
| `SECURITY DEFINER` functions left unsafe | post-reset privilege exposure | compare function owner, `search_path`, grants, and definition hash after reset |
| Pending migrations applied accidentally | reset becomes schema change | do not run broad `supabase db push --linked` |
| Seed reintroduces demo data | app is not truly clean | do not reseed linked provider by default |
| Existing app writes during reset | counts drift, partial state | maintenance/offline posture |
| Storage cleanup partly fails | orphan objects remain | post-commit cleanup report and retry manifest |
| Branch rehearsal gives false confidence | branches are data-less by default | treat branches as schema/seed proof unless populated |
| Restore overwrites new post-reset data | secondary data loss | keep reset window closed until verification is done |
| Decision-required rows guessed | audit/access/product state erased unexpectedly | unresolved decisions block Gate 2 |
| Empty app state is unusable | Auth works but users cannot proceed | verify `12-POST-RESET-UX-CONTRACT.md` outcomes |
| Display name confused with project ref | wrong URL/ref used in scripts or env vars | display name may change, but `ebxxqidacheyapmmzavr` remains the boundary |

## Go Criteria

Future execution can proceed only when all are true:

- project id/ref is confirmed as `ebxxqidacheyapmmzavr`;
- owner has issued Gate 2 destructive instruction per `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md`;
- reset variant is chosen;
- no Auth deletion is included;
- backup/export evidence exists outside repo and restore rehearsal passed;
- Storage export covers every object selected for deletion;
- table/object manifest has been reviewed;
- every decision-required row/object is resolved;
- dry run with rollback matches expected deltas;
- app maintenance/offline posture is active or no concurrent writes are expected;
- pending-review migrations are not part of the task;
- restore path is understood;
- post-reset verification owner is assigned.

## No-Go Criteria

Stop if any are true:

- project list shows a different target or multiple ambiguous targets;
- branch list or provider status creates ambiguity about where SQL will run;
- backup, Storage export, or restore rehearsal failed;
- any destructive/reset action row includes `auth.*`;
- any negative-manifest exclusion row is converted into a destructive action;
- SQL includes `DROP SCHEMA`, `DROP DATABASE`, or whole-project deletion;
- SQL includes unmanaged `TRUNCATE public.* CASCADE`;
- SQL uses `CASCADE` without listing every reached table in the manifest;
- dry-run row deltas differ from expected manifest;
- preserve-table counts or protected columns would change without explicit approval;
- any object selected for deletion lacks export proof and no separate waiver removes or accepts that object scope;
- post-login null-workspace behavior is unresolved;
- old public/share/invite links expose data or generic server errors;
- pending migrations or schema drift are mixed into reset;
- app code changes are required but unplanned;
- the owner asks to clear legal/security/access identity tables without a separate decision.

## Decision Register

| Decision | Default | Rationale |
|---|---|---|
| Reset variant | Variant A | Matches "not Auth" while still allowing scratch app testing. |
| PITR | Keep disabled | Current closed-beta cost posture. |
| Reseed linked provider | No | Owner wants clean testing from scratch. |
| Clear Storage objects | Yes only for explicitly selected, exported, allow-listed objects | App media is part of content reset, but DB backups do not cover it. |
| Preserve profiles | Yes | Existing app expects profile role/access state and can null default workspace safely. |
| Preserve beta allowlist | Yes | Required by closed-beta access gate. |
| Preserve legal/security audit | Yes | Not project/estimate/component content. |
| Preserve onboarding profiles | Yes | Avoid confusing preserved Auth users unless the owner explicitly wants re-onboarding. |
| Preserve collaboration audit | Yes | Audit history is not active collaboration content; FK nulling must be approved. |
| Normalize Supabase display name | Optional: `archestimator` | Dashboard/API label cleanup only; project ref remains `ebxxqidacheyapmmzavr`. |
| Use branch | Optional future rehearsal only | Branches are data-less by default and may have cost/plan constraints. |
| Use existing mass deletion RPCs for whole reset | No | They cover scoped project/sheet/archive flows, not full app-data reset. |

## Adversarial Checks

Before final go:

- search the reset script for `auth.`, `storage.buckets`, `supabase_migrations`, `drop schema`, `drop database`, and `cascade`;
- independently count all public tables before and after dry run;
- verify `profiles.default_workspace_id` behavior after deleting workspaces in a dry run;
- verify Storage object delete allow-list rejects path traversal and bucket mismatch;
- verify old public share tokens cannot expose reset data after publications are reset;
- verify app can create a new workspace from a profile with null default workspace;
- verify the function baseline did not drift beyond approved changes;
- verify every stale project, estimate, share, and invite link fails closed;
- verify no source code or migration file changed unless a separate implementation plan exists.
