# 21 — Database Change Blueprints

Per the planning directive §8A, every database-impacting task needs a blueprint. **Key finding: the core continuity path requires NO D1 migration** — Phase 3/4 reuse existing tables with new `event_type` values. The only migration is an optional fallback (Blueprint B) if Phase-4 idempotency proves inefficient.

## Blueprint A — `requestBetaAccess` audit + rate-limit (NO MIGRATION)

**Requirement:** FR-CONT-08, SEC-CONT-01/03.
**Migration filename:** none. Reuses existing tables.
**Status:** `VERIFIED` (schema confirmed against `migrations/0001`, `0004`, `0006` during the Improve-Plan cycle; prior `DISCOVERY-REQUIRED` flags resolved — see revision history at bottom).

### A.1 Audit table decision — write to `account_security_events`, NOT `closed_beta_allowlist_audit_events`

**Decision:** the `beta_access_requested` audit row is written to **`account_security_events`** (migration `0004`), not `closed_beta_allowlist_audit_events`.

**Reason (verified):** `closed_beta_allowlist_audit_events` carries `UNIQUE (allowlist_entry_id, event_type, actor_user_id, metadata_json)` (`0001:24`) and `allowlist_entry_id TEXT REFERENCES closed_beta_allowed_emails(id)` (`0001:19`). A beta *request* is, by definition, from an email **not yet on the allowlist**, so `allowlist_entry_id` would be `NULL`. While SQLite treats NULLs as distinct in a UNIQUE index (so a NULL row would not collide), the table's referential intent is *events about an existing allowlist entry*, not *intake requests for a non-entry*. `account_security_events` is the repo's general-purpose audit/event table (no UNIQUE collision risk, designed for unauthenticated/anonymous events with `actor_user_id` nullable) — the correct home for a pre-allowlist intake event. This also keeps the audit row shape consistent with `welcome_email_sent` (Blueprint B).

### A.2 Rate-limit table — `security_rate_limit_events` (columns: `scope` + `key_hash`, fixed-window + TTL)

**Verified schema** (`migrations/0006_ai_audit_rate_limits.sql:123-157`):
```sql
CREATE TABLE security_rate_limit_events (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (length(trim(scope)) > 0),
  key_hash TEXT NOT NULL CHECK (length(trim(key_hash)) > 0),
  occurred_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);
-- Indexes: idx_security_rate_limit_events_lookup ON (scope, key_hash, occurred_at DESC);
--          idx_security_rate_limit_events_expiry ON (expires_at);
```
**Existing helper** (`src/lib/collaboration/invite-entry.ts:142`, reused): `recordSecurityRateLimitEventInD1(db, { scope, keyHash, windowSeconds, expiresAt, metadataJson })` + a paired count query `since = now - windowSeconds*1000`. **Model: fixed window with `expires_at` TTL + expiry sweep, NOT a clock-hour COUNT.** Two scopes for `requestBetaAccess`:
- `scope = 'beta_request_email'`, `keyHash = hashRateLimitKey('beta_request_email', [normalizedEmail])`
- `scope = 'beta_request_ip'`, `keyHash = hashRateLimitKey('beta_request_ip', [ipHash])`

**SQL sketch — rate-limit check (use the existing helper, do NOT hand-roll):**
```sql
-- count-by-window (the helper runs this):
SELECT COUNT(*) AS n FROM security_rate_limit_events
WHERE scope = ? AND key_hash = ? AND occurred_at > ?;
-- if n < limit, INSERT via recordSecurityRateLimitEventInD1 (sets occurred_at + expires_at)
```
Limits (config): email 3 per `windowSeconds=3600`; IP 10 per `windowSeconds=3600`.

### A.3 IP-hash format — `hmac-sha256:` + hex via `hashAccountSecurityValue()` (NOT the invite-entry base64url pattern)

**Verified critical constraint** (`migrations/0004_account_security_events.sql:7-17`): `account_security_events.ip_hash` has a hard CHECK requiring the value be `NULL`, OR a 71-char `sha256:[0-9a-f]*` hex, OR a 76-char `hmac-sha256:[0-9a-f]*` hex. The existing writer (`src/lib/auth/account-audit.ts:46-75`) uses `hashAccountSecurityValue(value)` → `hashAccountSecurityValueWithPepper(value, process.env.AUTH_AUDIT_HASH_PEPPER)` producing `hmac-sha256:` + **hex**.

**⚠ Do NOT reuse the `invite-entry.ts` `hashRateLimitKey` pattern for the IP-hash stored in `account_security_events`.** That helper (`invite-entry.ts:102`) produces base64url keyed by `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`/`ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` — a value containing `-`/`_` and base64url alphabet, which **fails the `account_security_events.ip_hash` CHECK** and would throw on insert (and since the welcome-email idempotency row in Blueprint B writes to the same table, could cascade).

**Correct pattern for `requestBetaAccess`:**
- **Rate-limit key** (`security_rate_limit_events.key_hash`, no CHECK constraint, any non-empty string): use `hashRateLimitKey(scope, [normalizedEmail])` / `hashRateLimitKey(scope, [ipHash])` — base64url is fine here, this table has no format CHECK.
- **Audit IP-hash** (`account_security_events.ip_hash`, hard CHECK): use `hashAccountSecurityValue(ip)` → `hmac-sha256:`+hex, pepper `AUTH_AUDIT_HASH_PEPPER`.
- Two distinct peppers, two distinct formats, two distinct tables — do not mix. `requestBetaAccess` must read `AUTH_AUDIT_HASH_PEPPER` (fail-closed in production if unset, per `account-audit.ts:38-42`).

**SQL sketch — audit insert (`account_security_events`, via `recordAccountSecurityEventInD1` helper):**
```sql
INSERT INTO account_security_events
  (id, event_type, user_id, workspace_id, ip_hash, user_agent_hash, metadata_json, created_at)
VALUES (?, 'beta_access_requested', NULL, NULL, ?, ?, json(?), ?);
-- ip_hash: hashAccountSecurityValue(ip)  -> 'hmac-sha256:' + hex  (or NULL if no IP)
-- user_agent_hash: hashAccountSecurityValue(ua) -> 'hmac-sha256:' + hex (or NULL)
-- metadata_json: {"email":"redacted","name":"...","company":"...","source":"closed_beta_gate"}
-- (length-cap name<=120, company<=120; email validated; no raw IP/UA)
```

### A.4 Backfill / concurrency / cardinality
- **Backfill:** none.
- **Data-volume:** tens to low hundreds of beta requests; at 1000x still indexed point lookups (`scope`+`key_hash` composite index).
- **Concurrency:** rate-limit check+insert not transactional; worst case one extra allowed request (acceptable best-effort abuse protection). Audit insert has no UNIQUE risk (general table). Idempotency not required (duplicate requests acceptable + rate-limited + uniform receipt).
- **Query count per call:** 3 (rate-limit email check, rate-limit IP check can be parallel but treat as +1, rate-limit inserts on pass, audit insert). Target ≤ 5.
- **Rollback/fix-forward:** git revert the action; audit/rate-limit rows are append-only/harmless. Expiry sweep reclaims rate-limit rows.
- **Local proof:** `tests/vitest/beta-request-intake.test.ts` (mocked D1) — must assert the `ip_hash` written matches the CHECK regex `^hmac-sha256:[0-9a-f]+$` (denial test for the format defect).
- **Provider-proof boundary:** local mocked-D1 test sufficient; `EXPLAIN` deferred (cardinality too low to warrant).

### A.5 Resolved prior DISCOVERY-REQUIRED flags (revision history)
- ✅ `closed_beta_allowlist_audit_events.allowlist_entry_id` nullability → it is nullable, but the table is referentially meant for existing-allowlist-entry events; `account_security_events` chosen (A.1).
- ✅ `security_rate_limit_events` column names → confirmed `scope`+`key_hash`+`occurred_at`+`expires_at`+`metadata_json` (0006). The earlier `scope_key` sketch was **wrong and is withdrawn**.
- ✅ Rate-limit window model → fixed-window + TTL via `recordSecurityRateLimitEventInD1`, not clock-hour COUNT.

## Blueprint B — Welcome-email idempotency (NO MIGRATION preferred; optional fallback)

**Requirement:** FR-CONT-09, REL-CONT-01.
**Preferred path (NO MIGRATION):** reuse `account_security_events` (migration `0004`).
```sql
-- idempotency check (indexed by user_id)
SELECT 1 FROM account_security_events
WHERE user_id = ? AND event_type = 'welcome_email_sent' LIMIT 1;
-- after successful send
INSERT INTO account_security_events
  (id, event_type, user_id, workspace_id, ip_hash, user_agent_hash, metadata_json, created_at)
VALUES (?, 'welcome_email_sent', ?, ?, ?, ?, json(?), ?);
-- ip_hash/user_agent_hash: per A.3, use hashAccountSecurityValue() -> 'hmac-sha256:'+hex (AUTH_AUDIT_HASH_PEPPER), or NULL
-- metadata_json: {"trigger":"completeOnboarding"} (no credentials)
```
**Query count:** +1 SELECT on first-entry path; +1 INSERT on send. Indexed by `user_id` (add a composite index only if profiling demands — not warranted at closed-beta scale).
**Concurrency:** check-then-insert is non-atomic; a duplicate send in a rare concurrent first-entry race is tolerated (idempotent-ish welcome email; worst case 2). If strict once-only is later required, add a partial UNIQUE index — that's a migration and not warranted now.

**Fallback migration (ONLY if a hot-path concern arises — NOT recommended):**
- Filename: `0040_user_onboarding_welcome_email_sent_at.sql` (sequences after `0039_project_status.sql`).
- Change: `ALTER TABLE user_onboarding_profiles ADD COLUMN welcome_email_sent_at INTEGER;`
- Reversibility: column is nullable; drop column to revert.
- Why not preferred: adds a migration for an already-indexed point lookup.

**Backfill:** none (column nullable; absent = not sent).
**Rollback:** drop column (fallback) or git revert (preferred).
**Local proof:** `tests/vitest/welcome-email.test.ts` (mocked D1 + mocked `sendCloudflareEmail`); must assert the `ip_hash` matches the CHECK regex.

## Summary
- **Core path: 0 migrations.** Phase 3 (audit+rate-limit) + Phase 4 (welcome email) reuse `security_rate_limit_events` + `account_security_events`.
- **Schema-correct contracts** (verified this cycle): `scope`+`key_hash` rate-limit columns; `hmac-sha256:`+hex `ip_hash` via `AUTH_AUDIT_HASH_PEPPER` for `account_security_events`; base64url `hashRateLimitKey` only for the rate-limit key.
- **Audit goes to `account_security_events`** (general table, no UNIQUE collision), not `closed_beta_allowlist_audit_events` (referentially for existing entries).
- **One optional fallback migration** (Blueprint B) only if measured inefficiency — not recommended.
- **No generated-types change.** No `cf:typegen` run. No new bindings.

This satisfies the "never plan a database change without a rollback/fix-forward strategy and a validation query/provider-readback proof" directive: the preferred path has **no** database change (trivially safe), both blueprints are verified against the live schema, and the fallback is nullable + reversible with a unit-test proof.
