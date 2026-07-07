# Database Change Blueprints

**Authority boundary:** All work inside bound D1 `ARCH_DB` (`archestimator-proof-db`, id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`). Standing owner authorization covers D1 schema/migration changes. No raw token values below.

## Blueprint 1 — `0037_collaboration_invitation_revoke_reason.sql`

### Purpose
Add a nullable `revoked_reason TEXT` column to `collaboration_invitations` so the new revoke Server Action (SEC-07) can record why a manager revoked an invitation, for abuse forensics.

### Migration filename + ordering
- **Filename:** `migrations/0037_collaboration_invitation_revoke_reason.sql`
- **Ordering dependency:** applies after `0036_cost_library_component_drafts.sql` (the current latest). No dependency on any other pending migration.
- **Latest-migration confirmation:** `migrations/0036_cost_library_component_drafts.sql` is the highest-numbered file in `./migrations/` (verified by L3 discovery). `0037` is the next available number.

### Tables/columns/indexes/constraints affected
- **Table:** `collaboration_invitations`
- **Column added:** `revoked_reason TEXT` (nullable, default NULL)
- **No indexes** added (the column is write-once-per-revoke, read by audit/forensics; no query filters on it at scale).
- **No constraints** added (free-text reason; UI clamps length).
- **No triggers.**
- **Repository/query helpers:** `revokeInvitationInD1` (new, in `src/lib/collaboration/invitation-d1-store.ts`) writes the column; the repository row type picks it up as optional.
- **App-authz:** unchanged (`assertProjectAccessManager` gates the revoke action).
- **Worker Env bindings:** unchanged → `cf:typegen` **not** required.
- **Storage lifecycle:** retained indefinitely with the invitation (forensic value).

### SQL sketch
```sql
-- 0037_collaboration_invitation_revoke_reason.sql
-- Additive: nullable revoked_reason for explicit invitation revocation (SEC-07).
-- Rollback: ALTER TABLE collaboration_invitations DROP COLUMN revoked_reason;
--   (requires SQLite 3.35.0+; confirm via `SELECT sqlite_version();` on ARCH_DB.
--    If unsupported, fix-forward: leave the column — it is harmless when unused.)

ALTER TABLE collaboration_invitations
  ADD COLUMN revoked_reason TEXT;
```

### Backfill strategy
None. Column is nullable; existing rows have NULL. The revoke action is the only writer; pre-existing invitations are unaffected.

### Data-volume assumptions
- 1 row per revoked invitation. At current beta volume (<1000 invitations), negligible. At 1000x (1M invitations), still negligible (TEXT column, NULL for non-revoked).

### Concurrency and lock strategy
- `ALTER TABLE ADD COLUMN` (nullable) is metadata-only in SQLite — no table rebuild, no exclusive lock beyond the brief schema lock. Safe to apply on a live database.

### Expected query count per route/action
- **Revoke action:** 3-4 queries (manager-auth read, load invitation, batched UPDATE invitations + UPDATE tokens + INSERT audit). The new column adds zero extra queries (it's part of the existing UPDATE).

### Expected cardinality
| Volume | Invitations | Revoked rows | Query cost |
|---|---|---|---|
| Current | <1,000 | <100 | trivial |
| 10x | 10,000 | 1,000 | trivial |
| 100x | 100,000 | 10,000 | trivial |
| 1000x | 1,000,000 | 100,000 | trivial (no index needed; no scan) |

### Index selectivity assumptions
No new index. The revoke UPDATE keys on `id` (PK). The tokens UPDATE keys on `invitation_id` + the existing partial-unique index covers the `WHERE used_at IS NULL AND revoked_at IS NULL` filter efficiently.

### Pagination/limits/ordering/search/filter
Not applicable (revoke is a point mutation by invitation id).

### D1 query/authz cost
Negligible. No additional per-request write on any hot path. Revoke is manager-only.

### Denormalized summary / repository helper / DO / Queue handoff
Not justified. The column is a simple audit field.

### Generated type impact
- Repository row type (`CollaborationInvitationRow` in `workspace-repository.ts`) picks up `revoked_reason?: string | null`. No `cf:typegen` (no Worker Env change). The TS type update is a one-line optional-field addition at implementation time.

### Rollback or fix-forward
- **Rollback (preferred if D1 SQLite ≥ 3.35):** `ALTER TABLE collaboration_invitations DROP COLUMN revoked_reason;`
- **Fix-forward (if D1 SQLite < 3.35 or to avoid any risk):** leave the column. It's nullable and unused by any existing query. The revoke action's write to it is harmless if rolled back (the action revert stops writing).
- **DISCOVERY-REQUIRED (P3-T1):** confirm `SELECT sqlite_version();` on `ARCH_DB` to choose rollback vs fix-forward. Stop condition: version string recorded in the task closeout.

### Local proof command
- Apply: `bun run cf:d1:migrate:local` (or project equivalent — confirm exact script in `package.json` `cf:*`).
- Readback: `bun run cf:d1:read "PRAGMA table_info(collaboration_invitations);"` against `ARCH_DB` — confirm `revoked_reason` row present.
- Migration test: `tests/vitest/migration-0037-revoke-reason.test.ts` (new) or extend `infosec-db-pending-review-contract.test.ts`.

### Linked-provider proof boundary
- Local D1: migrate + readback.
- Preview D1: migrate + run hosted proof harness (extended for revoke).
- Production D1: migrate via `bun run cf:d1:migrate` (or `wrangler d1 migrations apply archestimator-proof-db`) + readback.

### EXPLAIN / query-plan expectation
The revoke UPDATEs use PK/index lookups — constant-time per row. No EXPLAIN concern. Deferred only if a regression surfaces (none expected).

---

## Blueprint 2 (conditional, OPEN-SEC-01-gated) — `0038` remove `auth_trigger` enum

**Only if the owner picks "remove" for SEC-11.** If the owner picks "wire login-time grant," no migration is needed.

### Purpose
Remove `auth_trigger` from the `accepted_via` CHECK constraint (dead enum value).

### Migration filename + ordering
- `migrations/0038_collaboration_invitations_drop_auth_trigger_accepted_via.sql` (after `0037`).

### Affected
- **Table:** `collaboration_invitations`
- **Constraint:** `accepted_via CHECK IN ('invite_route','pending_invite','auth_trigger','manager_direct_grant')` → remove `'auth_trigger'`.

### SQL sketch (SQLite CHECK changes require table rebuild)
```sql
-- 0038: remove dead auth_trigger enum value from accepted_via CHECK.
-- SQLite CHECK changes require table rebuild. Forward-only; rollback = re-add the value.
-- Step 1: create new table without auth_trigger in the CHECK.
-- Step 2: copy data.
-- Step 3: drop old, rename new.
-- (Detailed rebuild SQL at implementation time; verify no row has accepted_via='auth_trigger' first:
--  SELECT COUNT(*) FROM collaboration_invitations WHERE accepted_via='auth_trigger';  -- must be 0)
```

### Backfill
None (copy existing rows; the pre-check confirms no row uses the dead value).

### Rollback
Forward-only (re-adding the enum value requires another rebuild). Documented as irreversible-but-safe.

### Risk
Medium (table rebuild) — only if the owner confirms removal. **Recommend deferring unless the owner explicitly wants cleanliness**; the dead value is harmless.

### DISCOVERY-REQUIRED
Confirm `SELECT COUNT(*) FROM collaboration_invitations WHERE accepted_via='auth_trigger'` is 0 on `ARCH_DB` before rebuild.

---

## No other database changes

The remainder of the hardening (SEC-01/02/04/05/09/10) is code-only — no schema, no migration, no index, no Worker Env binding change. The invite flow's existing schema (`migrations/0007`, `0013`, `0030`, `0032`) is sufficient.
