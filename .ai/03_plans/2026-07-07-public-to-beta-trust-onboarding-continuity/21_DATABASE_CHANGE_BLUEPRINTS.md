# 21 — Database Change Blueprints

Per the planning directive §8A, every database-impacting task needs a blueprint. **Key finding: the core continuity path requires NO D1 migration** — Phase 3/4 reuse existing tables with new `event_type` values. The only migration is an optional fallback (Blueprint B) if Phase-4 idempotency proves inefficient.

## Blueprint A — `requestBetaAccess` audit + rate-limit (NO MIGRATION)

**Requirement:** FR-CONT-08, SEC-CONT-01/03.
**Migration filename:** none. Reuses existing tables.
**Tables/columns/indexes affected:**
- `closed_beta_allowlist_audit_events` (migration `0001`) — INSERT new `event_type='beta_access_requested'` rows. Existing schema (`allowlist_entry_id` nullable for non-allowlist events? — verify the column nullability during implementation; if `allowlist_entry_id` is NOT NULL, use `account_security_events` instead, which is designed for general events). **DISCOVERY-REQUIRED:** confirm `closed_beta_allowlist_audit_events.allowlist_entry_id` nullability + whether a non-allowlist-entry row is permitted. If not, route the audit to `account_security_events` (event_type `beta_access_requested`) — same no-migration outcome.
- `security_rate_limit_events` (existing) — INSERT + SELECT for rate-limit by `email` and `IP-hash` scope.

**SQL sketch (audit insert — `closed_beta_allowlist_audit_events` variant):**
```sql
INSERT INTO closed_beta_allowlist_audit_events
  (id, allowlist_entry_id, event_type, actor_user_id, metadata_json, created_at)
VALUES (?, NULL, 'beta_access_requested', NULL, json(?), ?);
-- metadata_json: {"email":"redacted","name":"...","company":"...","source":"closed_beta_gate"}
```
**SQL sketch (rate-limit check — `security_rate_limit_events` pattern):**
```sql
-- existing pattern: count events for scope+key in window
SELECT COUNT(*) FROM security_rate_limit_events
WHERE scope = 'beta_request_email' AND scope_key = ? AND created_at > ?;
-- then INSERT on attempt
```
(Exact column names must be confirmed against the live `security_rate_limit_events` schema during implementation — DISCOVERY-REQUIRED for column names; the pattern is established by `invite-entry.ts` rate-limiters.)

**Backfill:** none.
**Data-volume assumptions:** tens to low hundreds of beta requests. At 1000x (hundreds of thousands), still keyed by email/IP-hash (indexed) — no scan.
**Concurrency/locks:** rate-limit check+insert not transactional; worst case one extra row (acceptable for best-effort abuse protection).
**Query count per call:** 3 (rate-limit check, rate-limit insert, audit insert).
**Cardinality:** current/10x/100x/1000x — all fine (indexed point lookups).
**Index selectivity:** email/IP-hash — high selectivity.
**Generated-type impact:** none (no binding/type change).
**Rollback/fix-forward:** git revert the action; audit rows are append-only (harmless).
**Local proof:** `tests/vitest/beta-request-intake.test.ts` (mocked D1).
**Provider-proof boundary:** local mocked-D1 test is sufficient (no live provider state change); `EXPLAIN` deferred (documented: cardinality too low to warrant).

**DISCOVERY-REQUIRED scope (safe, read-only):**
- Confirm `closed_beta_allowlist_audit_events.allowlist_entry_id` nullability (decides audit-table choice).
- Confirm `security_rate_limit_events` exact column names + the existing rate-limit helper to reuse.
- Stop condition: a single `rg`/schema read answers each; no code change in discovery.

## Blueprint B — Welcome-email idempotency (NO MIGRATION preferred; optional fallback)

**Requirement:** FR-CONT-09, REL-CONT-01.
**Preferred path (NO MIGRATION):** reuse `account_security_events` (migration `0004`).
```sql
-- idempotency check
SELECT 1 FROM account_security_events
WHERE user_id = ? AND event_type = 'welcome_email_sent' LIMIT 1;
-- after successful send
INSERT INTO account_security_events
  (id, user_id, event_type, ip_hash, user_agent_hash, metadata_json, created_at)
VALUES (?, ?, 'welcome_email_sent', ?, ?, json(?), ?);
```
**Query count:** +1 SELECT on first-entry path; +1 INSERT on send. Indexed by `user_id`.

**Fallback migration (ONLY if a hot-path concern arises — NOT recommended):**
- Filename: `0040_user_onboarding_welcome_email_sent_at.sql` (sequences after `0039_project_status.sql`).
- Change: `ALTER TABLE user_onboarding_profiles ADD COLUMN welcome_email_sent_at INTEGER;`
- Reversibility: column is nullable; drop column to revert.
- Why not preferred: adds a migration for a query that's already an indexed point lookup. Only justify if profiling shows the `account_security_events` lookup is hot — unlikely at closed-beta scale.

**Backfill:** none (column nullable; absent = not sent).
**Rollback:** drop column (fallback) or git revert (preferred).
**Local proof:** `tests/vitest/welcome-email.test.ts` (mocked D1 + mocked `sendCloudflareEmail`).

## Summary
- **Core path: 0 migrations.** Phase 3/4 reuse existing tables.
- **Two safe DISCOVERY-REQUIRED steps** (read-only schema confirmations) before Phase 3 implementation — no code change, falsifiable targets.
- **One optional fallback migration** (Blueprint B) only if measured inefficiency — not recommended.
- **No generated-types change.** No `cf:typegen` run. No new bindings.

This satisfies the "never plan a database change without a rollback/fix-forward strategy and a validation query/provider-readback proof" directive: the preferred path has **no** database change (trivially safe), and the fallback is nullable + reversible with a unit-test proof.
