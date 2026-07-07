# 07 — Data, Database, API, and Network Plan

## 1. Data ownership and scope

This continuity path is **mostly frontend + copy + one server action + one email**. The only data writes are:
1. `requestBetaAccess` audit row + rate-limit check (Phase 3).
2. Welcome-email idempotency marker (Phase 4).

**No D1 schema change is required for the core path** (FR-CONT-01..07, 10, 11). Phase 3/4 reuse existing tables. See `21_DATABASE_CHANGE_BLUEPRINTS.md` for the full blueprint (most phases = "no migration").

## 2. Existing tables reused (no schema change)

| Table | Migration | Used by phase | Purpose |
|---|---|---|---|
| `closed_beta_allowed_emails` | `0001` | (reference) | allowlist grant (existing) |
| `closed_beta_allowlist_audit_events` | `0001` | Phase 3 | `beta_access_requested` audit row (NEW event_type on existing table) |
| `security_rate_limit_events` | (existing) | Phase 3 | rate-limit `requestBetaAccess` by email+IP-hash |
| `account_security_events` | `0004` | Phase 4 | `welcome_email_sent` idempotency marker (NEW event_type) |
| `user_onboarding_profiles` | `0005` | Phase 4 (fallback) | nullable `welcome_email_sent_at` column (only if Phase-4 query proves inefficient) |
| `legal_terms_acceptances` | `0002` | (reference) | terms gate (existing, unchanged) |

**Better Auth core tables** (`user`/`session`/`account`/`verification`) — managed by Better Auth's migrator, NOT in `migrations/`, **not touched**.

## 3. `requestBetaAccess` data contract (Phase 3)

**Inputs:** `email: string`, `name?: string`, `company?: string`, honeypot `company_url: string` (must be empty).
**Server-side resolution:** IP-hash (HMAC + pepper, reuse `invite-entry.ts` pattern), user-agent hash (optional).
**Validation:** email format + length cap (≤320 chars), name/company length caps, honeypot must be empty.
**Rate limit:** per `email` (e.g., 3/hour) + per `IP-hash` (e.g., 10/hour); reuse `security_rate_limit_events` insertion/check pattern.
**Write:** `INSERT INTO closed_beta_allowlist_audit_events (..., event_type='beta_access_requested', metadata_json={name,company,source})`. **No PII beyond email + optional name/company in metadata.** IP-hash stored in the rate-limit table, not the audit row.
**Return:** `{ ok: true }` on success, `{ ok: false, reason: 'rate_limited'|'invalid'|'honeypot' }`. **Uniform receipt** for duplicate/rate-limited/already-on-allowlist to avoid enumeration (SEC-CONT-03): the client always shows "Thanks — we'll reach out" except for clear validation errors.
**Idempotency:** not strictly required (duplicate requests are acceptable + rate-limited), but the receipt is uniform.

### Query/count expectations (Phase 3)
- `requestBetaAccess`: 1 rate-limit check SELECT + 1 rate-limit INSERT + 1 audit INSERT = **3 D1 statements** per call.
- Cardinality: at closed-beta scale (tens to low hundreds of requests), trivial. Even at 1000x, the rate-limit query is keyed by email/IP-hash (indexed) — no scan risk.

## 4. Welcome-email idempotency (Phase 4)

**Preferred path (no migration):** before sending, query `account_security_events` for `event_type='welcome_email_sent' AND user_id=?`. If present, skip. After a successful send, INSERT a row.
- Query: `SELECT 1 FROM account_security_events WHERE user_id=? AND event_type='welcome_email_sent' LIMIT 1` — 1 indexed lookup. At 1000x scale, still indexed by user_id; fine.
- **Fallback (only if a hot-path concern arises):** add `welcome_email_sent_at INTEGER` to `user_onboarding_profiles` (migration `004N_*`). Not recommended unless measured; see `21`.

**Trigger site:** `completeOnboarding` (first onboarding completion) or the first `ensureDefaultWorkspace` success — **one** site only, to avoid double-fire (ARCH coupling note in `06` §9). Recommendation: `completeOnboarding`/first authenticated workshop entry where terms are accepted and a workspace exists/has just been provisioned.

## 5. Transaction boundaries
- `requestBetaAccess`: rate-limit check + audit insert are **not transactionally coupled** — a race where two concurrent requests both pass the rate-limit check is acceptable (worst case: one extra audit row; the rate limit is best-effort abuse protection, not a hard invariant). Document this.
- Welcome-email idempotency: check-then-insert is not atomic; a duplicate send in a rare concurrent first-entry race is tolerated (email is idempotent-ish; worst case user gets 2). If strict once-only is required, add a UNIQUE constraint — but that's a migration and not warranted for a welcome email.

## 6. Referential integrity / migration sequencing
- **No new foreign keys.** Audit/rate-limit/security-event tables already have the right shape.
- **Migration order:** no migration for the recommended path. If the `user_onboarding_profiles` column fallback is used, it sequences after `0005_account_settings.sql` (latest existing migration `0039_project_status.sql`). New migration would be `0040_*` (see `21`).

## 7. API / network behavior
- **`requestBetaAccess` Server Action** = directly reachable POST endpoint (Next Server Actions are HTTP endpoints). Must self-validate auth-context (public — no auth required), input, honeypot, rate-limit. Returns a typed DTO; never throws raw to the client.
- **No new Route Handlers.** Existing `/api/auth/[...all]` (Better Auth) unchanged.
- **Welcome email:** `sendCloudflareEmail` → `EMAIL` binding (`getCloudflareContext()`). Network behavior: Cloudflare Email Service; failures return `EMAIL_NOT_CONFIGURED`/`EMAIL_BINDING_MISSING` gracefully → REL-CONT-01 (entry not blocked).

## 8. Generated-types / Worker Env impact
- **No `cloudflare-env.d.ts` change.** No new bindings. `EMAIL` binding already typed.
- **No `cf:typegen` run required.**

## 9. Data retention / deletion / audit
- `beta_access_requested` audit rows: retained per existing `closed_beta_allowlist_audit_events` retention posture.
- `welcome_email_sent` event rows: retained per `account_security_events` posture (no raw IP/UA in terms-acceptance; security events do store ip_hash/ua_hash per existing schema — acceptable).
- **Privacy/DSAR:** both fit the existing privacy-request/erasure workflows (sibling pack owns those); no new PII category introduced beyond email (already covered).

## 10. Rollback / fix-forward
- **Phase 3 (`requestBetaAccess`):** if it misbehaves, revert to the mailto POST (git revert the ClosedBetaGate form change) — the audit table accepts the new event_type harmlessly. Fix-forward is trivial.
- **Phase 4 (welcome email):** if delivery misbehaves, set `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false` (graceful skip). No data rollback needed.
- **Phases 1, 2, 5:** pure frontend/route changes — git revert.

## 11. Database/provider-proof summary
- **D1 proof:** the rate-limit + audit queries are simple indexed lookups; local D1 proof via focused action tests (mocked D1) is sufficient. No `EXPLAIN` warranted at this cardinality (documented reason for deferral).
- **Provider proof (email):** out of scope for planning; deliverability proof is a rollout gate (OPS-CONT-01) once delivery is enabled.
