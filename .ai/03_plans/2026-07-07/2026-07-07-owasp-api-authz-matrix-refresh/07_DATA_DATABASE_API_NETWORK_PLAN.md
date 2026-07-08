# 07 — Data, Database, API, Network Plan

## D1 (ARCH_DB) — the active data store

### Tables touched by authz (numbered migrations under `./migrations/`)
| Table | Migration | Authz role |
|---|---|---|
| `closed_beta_allowed_emails`, `closed_beta_allowlist_audit_events` | `0001` | closed-beta gate |
| `profiles` (role `ceo/admin/member`, default_workspace_id) | `0003` | platform role + workspace derivation |
| `account_security_events` | `0004` + `0035` (HMAC checks) | auth audit (ip_hash/user_agent_hash keyed) |
| `workspace_account_settings` | `0005` | per-workspace settings |
| `workspaces`, `projects`, `estimates`, `project_members`, `estimate_sheet_members`, `collaboration_invitations`, `collaboration_invitation_tokens`, `collaboration_audit_events` | `0007` | core authz membership |
| `workspace_members` (user_id, workspace_id, role) | `0013` | workspace role scoping |
| `project_publications`, `shared_link_*` | `0014` | publication/share surface |
| `security_rate_limit_events` | `0006` | durable rate limiter (shared by 5 domains) |
| `project_groups`, `project_group_memberships` | `0020` | personal project groupings (ws+user scoped) |
| Better Auth `user`/`session`/`account`/`verification` | generated DDL (`better-auth-proof-router.ts` SCHEMA_STATEMENTS, applied idempotently) | session/authN |

### Database change blueprint (for any future change — none required by this planning pack)
This pack does **not** require a migration. All findings are code/config/test changes.
If SEC-03 (durable estimate rate limit) is implemented, it **reuses** the existing
`security_rate_limit_events` table — **no new migration**, just a new `scope` value
(e.g. `estimate_action`). Backward-compatible by construction (append-only scope union).

### App-authorization behavior (the gate)
- Membership predicates in `d1-access.ts` use EXISTS subqueries joining
  `workspace_members` / `project_members` / `estimate_sheet_members`.
- `inherit_project_access` flag (default 1) on estimate sheet access settings lets a
  sheet opt out of project-wide inheritance.
- Platform admin short-circuit at JS layer (`isPlatformAdmin`).
- Fail-closed on any D1 error (`runAllowedProbe`).
- `d1-action-client.ts` `ESTIMATE_EDIT_ACTIONS` set (~24 actions) each call
  `canEditEstimateInD1` before dispatch; writes re-scope by `estimate_id`/`project_id`.

### Query-cost notes
- `filterAccessibleSidebarProjectIds` (workspace-repository.ts:2413) is a single batched
  SQL with 3 EXISTS branches — replaces a per-project N+1 probe loop. Important for
  sidebar favorite scaling.
- Publication rate-limit counters are insert-then-count (publication) vs atomic
  insert-select (privacy intake). Both bounded by `(scope, key_hash, occurred_at)` index.
- No full-table scans found on auth hot paths; membership probes are index-backed.

### Data integrity / recovery
- D1 daily backups + `cf:d1-restore-rehearsal` script (per AGENTS.md cost posture).
- No migration in this pack ⇒ no rollback sequence needed.
- Token rotation (`rotateProjectPublicationLink`) re-hashes password and invalidates
  sessions via `credentialVersion` — verified by
  `project-publication-cookie-credential-version.test.ts`.

## API / network

### Contracts
- Authenticated routes return JSON; mutations return typed DTOs.
- Errors: opaque 404s on auth-failed reads (no leak); generic 403 messages on edit deny;
  423 for publication password required; 429 with `Retry-After` for rate limits.
- Publication surface never echoes raw RPC/DB errors (SEC-15).
- Internal/job routes use `Bearer` secret auth.

### Idempotency
- Bulk delete: `expectedPreviewHash` + `correlationId`.
- Estimate row mutations: `expectedRowRevision` (optimistic concurrency) + `mutationId` (client dedup).
- Publication password: success clears failures; durable lockout is count-based.
- Invite accept: idempotent (already-used terminal state).
- Most single-row creates (project/component/invite) are replayable — REQ-IDEMP-01.

### Rate-limit scopes (consolidated)
| Surface | Scope key | Limit | Backend |
|---|---|---|---|
| Publication password | token+IP | 5/hr | D1 (count pre-check) |
| Publication snapshot | token+IP | 60/min | D1 |
| Publication event | token+IP | 60/min | D1 |
| Publication activity | token+IP | 60/min | D1 |
| Shared-link session | token+IP | 10/min, 50/hr | D1 |
| Shared-link comment | pub+recipient | 5/min, 20/hr | D1 |
| Shared-link decision | pub+recipient | 5/min | D1 |
| Shared-link unsubscribe | token+IP+recipient | 5/min, 20/hr | D1 |
| Proposal export | user+IP | 12/min, 120/hr | D1 |
| Privacy intake email | email | 3/hr | D1 (atomic reserve+rollback) |
| Privacy intake IP | IP | 5/hr | D1 (atomic reserve+rollback) |
| AI ask | ws+user+IP | 10/min, 60/hr | D1 |
| Invite create/resend/resolve/accept/continue | token/user/IP | varied | D1 |
| Estimate action | user | 40/10s, 120/60s | **in-memory (SEC-03)** |
| Upload admission | actor+IP | 12/min, 3 active, 6/ws | **in-memory** |

### Network / transport
- HSTS preload on all routes; `Referrer-Policy: no-referrer` on share/invite/workshop.
- OAuth state cookie validated at worker edge before Next handles callback.
- Magic-link tokens verified by hash lookup (Better Auth `verification.value`), single-use.
- `worker.ts` canonical host redirect (www→apex).

## Provider-parity / legacy boundary
- Supabase project `ebxxqidacheyapmmzavr` is historical only — **no live route references
  it**. The `supabase/migrations/` are migration archaeology (RLS policies there are not
  runtime gates).
- `webhooks/resend/` directory exists but has **no route file** — Resend webhook is not
  wired (legacy exit). Not a finding (out of scope), just confirmed absent.
