# 07 — Data, Database, API, and Network Plan

## 1. Data ownership and scope

This continuity path is **mostly frontend + copy + one server action + one email**. The only data writes are:
1. `requestBetaAccess` audit row + rate-limit check (Phase 3).
2. Welcome-email idempotency marker (Phase 4).

**No D1 schema change is required for the core path** (FR-CONT-01..07, 10, 11). Phase 3/4 reuse existing tables. See `21_DATABASE_CHANGE_BLUEPRINTS.md` for the full blueprint (most phases = "no migration").

## 2. Existing tables reused (no schema change) + access-path matrix

Access-path matrix (mandated by the planning directive §6): `Source | Chosen API/repository/binding | Runtime role | Authorization check | Latest schema/policy posture | Proof source | Fallback`.

| Source | Chosen API/repository/binding | Runtime role | Authorization check | Latest schema/policy posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| `closed_beta_allowed_emails` (`0001`) | `src/lib/auth/closed-beta-d1-store.ts` `getClosedBetaAccessFromD1` | anonymous→grant resolution | **none at intake** (public); grant enforced post-auth in `session.ts` | `normalized_email UNIQUE`, `status` ∈ invited/active/revoked | `0001` + `closed-beta-access.ts` | n/a (existing, untouched) |
| `security_rate_limit_events` (`0006`) | **`recordSecurityRateLimitEventInD1`** (`src/lib/collaboration/invite-entry.ts:142`) + paired count-by-window | rate-limit (public, anonymous) | none (public abuse throttle) | cols `scope`,`key_hash`,`occurred_at`,`expires_at`; indexes `(scope,key_hash,occurred_at)`, `(expires_at)`; fixed-window+TTL model | `0006:123-157` + `invite-entry.ts:102-165` | drop the throttle (uniform receipt still holds) |
| `account_security_events` (`0004`) | `recordAccountSecurityEventInD1` (`src/lib/auth/account-audit.ts`) — **the `beta_access_requested` AND `welcome_email_sent` audit/idempotency rows** | audit + idempotency (public→anonymous; authenticated for welcome) | welcome row keyed by `user_id` (auth context); beta-request row `user_id=NULL` | `ip_hash`/`user_agent_hash` hard CHECK `sha256:`/`hmac-sha256:`+hex; `metadata_json` JSON | `0004:2-29` + `account-audit.ts:46-75` | skip audit (intake still succeeds; lose trail) |
| `user_onboarding_profiles` (`0005`) | (Phase-4 fallback only) | idempotency fallback | auth context | `user_id` PK | `0005` | use `account_security_events` (preferred) |
| `legal_terms_acceptances` (`0002`) | existing terms store | gate | auth context + content hash | unchanged | `0002` | n/a (untouched) |
| Better Auth core (`user`/`session`/`account`/`verification`) | Better Auth migrator | identity | Better Auth session | camelCase, outside `migrations/` | Better Auth migrator | n/a (untouched) |

**Better Auth core tables** — managed by Better Auth's migrator, NOT in `migrations/`, **not touched**.

**No chosen path is blocked by current schema.** (The earlier `scope_key` sketch was a defect, now corrected — see `21` A.2.)

## 3. `requestBetaAccess` data contract (Phase 3)

**Inputs:** `email: string`, `name?: string`, `company?: string`, honeypot `company_url: string` (must be empty).
**Server-side resolution:**
- **Rate-limit key** (`security_rate_limit_events.key_hash`, no format CHECK): `hashRateLimitKey('beta_request_email'|'beta_request_ip', [normalizedEmail | ipHash])` — base64url, pepper `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` (reuse `invite-entry.ts:102`).
- **Audit IP-hash** (`account_security_events.ip_hash`, hard CHECK): `hashAccountSecurityValue(ip)` → `hmac-sha256:`+**hex**, pepper **`AUTH_AUDIT_HASH_PEPPER`** (`account-audit.ts:46-51`). **Two distinct peppers, two distinct formats — do not mix** (see `21` A.3).
**Validation:** email format + length cap (≤320), name≤120, company≤120, honeypot empty.
**Rate limit:** per email 3/window + per IP 10/window, `windowSeconds=3600`, fixed-window+TTL via `recordSecurityRateLimitEventInD1` + count-by-window (`security_rate_limit_events`).
**Audit write:** `INSERT INTO account_security_events (event_type='beta_access_requested', user_id=NULL, ip_hash=hashAccountSecurityValue(ip), user_agent_hash=..., metadata_json={name,company,source})`. **No PII beyond email+name+company.** Raw IP never stored (only the CHECK-compliant hash).
**Return:** `{ ok: true }` on success, `{ ok: false, reason: 'invalid' }` for clear validation failures. **Uniform receipt** (`ok:true`) for duplicate/rate-limited/already-on-allowlist/honeypot-trip to avoid enumeration (SEC-CONT-03). See `06` §5 for the success transport decision.
**Idempotency:** not required (duplicates acceptable + rate-limited + uniform receipt).

### Query/count expectations (Phase 3)
- `requestBetaAccess`: 2 rate-limit checks (email + IP) + 2 rate-limit inserts (on pass) + 1 audit insert = **≤5 D1 statements** (the two scopes can be checked in parallel). Indexed point lookups; no scan at any plausible volume.

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
- `beta_access_requested` audit rows: written to **`account_security_events`** (per `21` A.1 decision), retained per the existing `account_security_events` retention posture.
- `welcome_email_sent` event rows: retained per `account_security_events` posture (no raw IP/UA in terms-acceptance; security events do store ip_hash/ua_hash per existing schema — acceptable).
- **Privacy/DSAR:** both fit the existing privacy-request/erasure workflows (sibling pack owns those); no new PII category introduced beyond email (already covered).

## 10. Rollback / fix-forward
- **Phase 3 (`requestBetaAccess`):** if it misbehaves, revert to the mailto POST (git revert the ClosedBetaGate form change) — the audit table accepts the new event_type harmlessly. Fix-forward is trivial.
- **Phase 4 (welcome email):** if delivery misbehaves, set `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false` (graceful skip). No data rollback needed.
- **Phases 1, 2, 5:** pure frontend/route changes — git revert.

## 11. Database/provider-proof summary
- **D1 proof:** the rate-limit + audit queries are simple indexed lookups; local D1 proof via focused action tests (mocked D1) is sufficient. No `EXPLAIN` warranted at this cardinality (documented reason for deferral).
- **Provider proof (email):** out of scope for planning; deliverability proof is a rollout gate (OPS-CONT-01) once delivery is enabled.
