# Source and Codebase Audit

This is the evidence backbone for the plan. Every claim is cited with a repo-relative `file:line`. Audit was performed by three parallel `Explore` subagents (L2: routes+components, L3: data layer+retention, L4: security/auth/credential taxonomy) plus lead read-only verification of key symbols.

---

## §A. Public share activity route and sibling routes

### `src/app/api/share/[token]/activity/route.ts` — the canonical endpoint

- **Type:** Next.js Route Handler. `export const dynamic = "force-dynamic"` (line 28). GET only.
- **Imports** (lines 1-25): `composeSharedLinkActivity` + types from `@/lib/activity`; security helpers from `@/lib/publication/security`; activity helpers from `@/lib/publication/activity-helpers`; `checkProjectPublicationActivityRateLimit` + `createPublicationServiceClient` from `@/lib/publication/public-repository`; `filterMap` from `@/lib/util/array`.
- **`PublicActivityViewModel`** (lines 30-40): `Pick<ActivityViewModel, "id" | "source" | "action" | "visibility" | "occurredAt" | "title" | "summary" | "badges" | "target" | "meta">`. **Strict allow-list.**
- **`readRecipientIdFromSession`** (lines 42-54): parses `shared-link-session-v1` cookie payload (base64url JSON) → `recipientId`. Crypto verification happens later (line 138-147).
- **`createPublicActivityId`** (lines 56-58): `act_<sha256(source:rawId)[:16]>`. Re-hashes raw DB IDs before emission.
- **`toPublicActivityViewModel`** (lines 60-77): maps composed activity → public DTO. Re-strips `target` to `{ kind, label, secondaryLabel }` (drops `target.id`). **Picks `meta: activity.meta` (line 75) — but composer never sets `meta` → always `undefined`. Vestigial (C3).**

#### GET handler (lines 79-232) — gating order

1. **Same-origin:** `assertSameOrigin(request)` (line 80). NOTE: `assertSameOrigin` (security.ts:361-371) returns `ok:true` when there is **no** `Origin` header — only blocks a mismatched cross-origin `Origin`.
2. **Rate limit:** `checkProjectPublicationActivityRateLimit({ token, request })` (line 86) → 429 + `Retry-After`. 60/min per token+request (public-repository.ts:453-466).
3. **Publication liveness:** `getPublicationActivityContextByTokenHash(pubHash)` (line 109) → 404 unless `status==="published"`, not revoked, not expired (line 111). **Uniform 404 via `sharedLinkUnavailableErrorBody()` — no existence leak.**
4. **Password gate:** if `pub.password_hash` is set, requires `hasPublicationAccessCookie` (lines 118-130) → 423 `passwordRequired: true`.
5. **Optional recipient session:** cookie parsed (line 42-54) + crypto-verified by `verifySharedLinkSessionCookieValue` (lines 138-147). **Optional** — an anonymous caller still gets the public comment list.

#### Data combination (lines 149-219)

Three parallel queries via the service client:
- `listPublicActivityComments` — **always fetched**, no recipient required (d1-store.ts:474-496).
- `listRecipientActivityResponses` — **only if `verifiedRecipientId`** (recipient-scoped).
- `listRecipientActivityEvents` — **only if `verifiedRecipientId`** (recipient-scoped).

Recipient display names batch-resolved via `listRecipientDisplayNames` (lines 164-170), substituted via `readSharedLinkRecipientDisplayName` (uses only `display_name`, falls back to "Client"). Target labels from `pub.activity_target_labels_json` (line 172), resolved via `resolveSharedLinkStoredTargetMetadata`.

Raw rows → `SharedLinkActivityInput` (lines 174-210) → `composeSharedLinkActivity(activity, { audience: "client", visibility: "public" })` (line 217) → `filterMap` drops `visibility === "internal"` (lines 216-219) → `toPublicActivityViewModel`.

#### Pagination (lines 98-100, 220-227)

- `limit` clamped 1-100 (default 100).
- `cursor` param: encrypted opaque cursor via `parseSharedLinkActivityCursor` (AES-256-GCM, server-secret-keyed, activity-helpers.ts:247-282). Legacy base64 cursor tolerated (lines 242-245).
- `hasMore` + `nextCursor` returned.

#### Response (lines 223-231)

`{ activities: PublicActivityViewModel[], hasMore: boolean, nextCursor?: string, recipientSession: boolean }`. `Cache-Control: no-store` on every response.

#### Privacy observations on this file

- **O1 (over-fetch, P2):** `listPublicActivityComments` SELECTs `author_email` (d1-store.ts:484), route never reads it from the comment row (route.ts:174-188 uses `recipient_id` only). Fetched from D1, discarded. Not serialized (allow-list `Pick<>` excludes it).
- **O2 (info disclosure, low):** `recipientSession: boolean` (line 228) tells an anonymous caller whether a valid session cookie was accepted.
- **O3 (by design):** public comments returned to any caller passing token + password gate, even with no recipient session (route.ts:27-29 comment).
- **C3 (vestigial):** `meta` always `undefined`.

No TODO/FIXME/XXX in this file.

### `src/app/api/share/[token]/route.ts` — root snapshot GET

- Returns the full publication `snapshot_json` to anyone passing token + password gate.
- Returns `publicationId: publication.snapshot.project.id` (line 78) — the **internal project id** surfaced to the public client. Used by the share page; verify this is intended (it is an internal DB id exposed publicly — flagged for confirmation, not a confirmed leak).
- Records an `open` event via `after()` for every successful anonymous snapshot read (lines 61-74). Open counter increments are bot-gated (public-repository.ts:752-760); raw `project_publication_events` row written unconditionally with ip_hash + ua_hash + metadata.

### `src/app/api/share/[token]/comment/route.ts` — GET + POST

- **GET (lines 161-210):** `loadSharedLinkPublicComments` — **requires verified recipient session** (lines 185-195) + read rate limit. DTO via `mapSharedLinkPublicComment` (public-repository.ts:868-882): `content`, `authorName`, `authorType`, public-hashed `estimateId`/`rowId`, target labels, `snapshotVersionAtComment`. **No `author_email` in this DTO (good).**
- **POST (lines 212-398):** recipient-session-gated, CSRF (`assertSameOriginPublicPost`), snapshot-version concurrency check, per-recipient write rate limit, `sanitizeSharedLinkRecipientText(body, 1000)`, circuit breaker (lines 24-74, in-memory). SEC-15 (lines 390-396): raw DB/RPC errors never echoed to client.
- **P12 circuit breaker** is process-local (in-memory); acceptable for best-effort.

### `src/app/api/share/[token]/decision/route.ts` — GET + POST

- Symmetric to comment. GET returns the **single recipient's** latest decision (`loadSharedLinkRecipientDecision`, scoped by recipientId). POST validates `decision ∈ {accepted, declined, revision_requested}`, requires `signerName` for `accepted` (line 272), sanitizes `note` (2000) and `signerName` (120). SEC-15 same pattern. POST response (line 304) echoes `signerName` (caller's own input — not a leak).

### `src/app/api/share/[token]/events/route.ts` — POST only (no GET)

- **`allowedEvents`** allow-list (lines 10-15): `open, password_success, password_failure, download_attempt_blocked`.
- **`allowedMetadataKeys`** allow-list (line 17): `durationMs, format, reason, source, success, target`. Max 6 keys, 160 chars/string, 512 bytes total (lines 18-21, `normalizePublicEventMetadata` lines 30-63). **Strong allow-listing on the write side** — this constrains what later appears in the activity feed's event `facts`.
- Same-origin POST gate, per-token event rate limit (60/min).
- This is the **write** side; the activity route is the read side.

### `src/app/api/share/[token]/session/route.ts` — GET/POST/DELETE

- Establishes recipient session cookie (signed, HttpOnly, SameSite=Lax, Secure in prod, Max-Age 86400). GET redirects to clean URL; POST returns JSON. Sets non-HttpOnly `*_ok` companion cookie (lines 111-117) for client-side feature detection.

### `src/app/api/share/[token]/password/route.ts`, `unsubscribe/route.ts`

- Password: exponential backoff lockout, HMAC-hashed IP/UA. Unsubscribe: GET renders interstitial (SEC-14, no mutation on GET), POST mutates with CSRF. Both well-gated; not directly part of the activity surface but covered in the threat model (`08_…md`).

---

## §B. Components consuming the share activity surface

### `src/components/share/SharedLinkActivityFeed.tsx` (Client Component)

- **The only client consumer of the public `/api/share/[token]/activity` URL** (line 145). Fetches via `fetch(url.pathname + url.search, { cache: "no-store" })`.
- Branches on `isOwner` (line 135): owner path calls the server action `loadSharedLinkActivity`; non-owner path hits the route.
- Renders `title`, `occurredAt`, `summary`, `body`, `badges`, `facts` (inside `<details>`), `visibility==="internal"` badge only if `isOwner` (line 263).
- **Finding: NOT mounted on the public share page.** `src/app/share/[token]/page.tsx` renders `ShareReviewWorkspace` → `SharePageComments` + `SharePageDecision` + `SharePageTabs`; never renders `SharedLinkActivityFeed`. The feed is only mounted via `src/components/workshop/publisher/PublisherActivityFeed.tsx` (line 24), which passes `isOwner` + server-action `loadActivity` (uses the action, not the public route). **The public activity route currently has no UI consumer on the recipient-facing page.**

### `src/components/share/SharePageComments.tsx` (Client Component) — consumes `/comment`

- `Comment` interface (lines 15-29) still declares optional `author_email?` (line 18) + fallback `c.authorName || c.author_email || "You"` (line 567). `loadSharedLinkPublicComments`/`mapSharedLinkPublicComment` never populate `author_email` → dead. Harmless but inconsistent. **Phase 1 cleanup candidate.**

### `SharePageDecision.tsx`, `ShareReviewWorkspace.tsx`

- Standard client components consuming `/decision` and `/comment`; no direct activity-feed consumption.

### Owner-only mirror: `src/lib/publication/actions.ts:1814` `loadSharedLinkActivity`

- Server Action ("use server"). Enforces `requireCurrentUserContext()` (line 1819) + `assertProjectPublicationManager(pub.project_id)` (line 1833). RBAC-gated.
- **Selects `author_email` for comments** (line 1842) — only uses `author_name`/`recipientDisplayName` in mapped output (line 1900). Same over-fetch pattern as the public side. **Parity check only; this is the owner's full view.**
- Composes with `audience: "owner"` (lines 1955-1958) — internal comments + raw payload preserved. Correctly separated from the public route.

---

## §C. Data layer and retention coverage

### Core schema: `migrations/0014_publication_shared_links.sql`

D1 (SQLite-flavored: TEXT ids, INTEGER booleans, `json_valid` CHECKs, partial indexes).

- **`project_publications`** (lines 1-28): `id`, `workspace_id`, `project_id`, `token_hash` (UNIQUE), `encrypted_token` (AES-256-GCM), `password_hash` (nullable, scrypt), `status` CHECK `published|expired|revoked`, `snapshot_version`, `selected_estimate_ids` JSON, `snapshot_json` JSON, `activity_target_labels_json` JSON, `location_visibility` CHECK `exact|locality|hidden`, `published_by`, `published_at`, `expires_at` (nullable), `revoked_at` (nullable), `open_count`, `latest_opened_at`, `created_at`, `updated_at`. Partial UNIQUE `idx_project_publications_one_published_per_project … WHERE status = 'published'` (lines 30-32).
- **`project_publication_events`** (lines 40-53): `id`, `publication_id`, `event_type` CHECK `open|password_success|password_failure|download_attempt_blocked|password_attempt`, `metadata_json`, `ip_hash` (HMAC, nullable), `user_agent_hash` (HMAC, nullable), `created_at`. Index `(publication_id, created_at DESC)`.
- **`shared_link_recipients`** (lines 58-81): `id`, `publication_id`, `email` (lowercased, **plaintext**), `display_name` (nullable), `invited_by` (nullable user_id), `invited_at`, `recipient_token_hash` (UNIQUE HMAC), `delivery_status` CHECK `pending|sent|bounced|opened|responded`, `last_opened_at`, `email_unsubscribed_at` (nullable), Resend fields, `created_at`, `updated_at`.
- **`shared_link_comments`** (lines 99-114): `id`, `publication_id`, `recipient_id` (nullable — owner/internal null), `author_email` NOT NULL, `author_name` (nullable), `estimate_id`, `row_id`, `body` (≤1000), `is_internal` INTEGER default 0, `target_kind` CHECK `proposal|estimate|row`, `target_label`, `target_secondary_label`, `snapshot_version_at_comment` (nullable), `created_at`. **No soft-delete column.** Partial index `idx_shared_link_comments_public_feed … WHERE is_internal = 0`.
- **`shared_link_responses`** (lines 126-147): `id`, `publication_id`, `recipient_id`, `decision` CHECK `accepted|declined|revision_requested`, `note` (nullable ≤2000), `snapshot_version_at_decision` NOT NULL, `estimate_id`, `row_id`, `target_kind`, `target_label`, `target_secondary_label`, `signer_name` (nullable ≤120), `signature_intent_hash` (nullable 64 hex), `created_at`. UNIQUE partial `(recipient_id, publication_id) WHERE recipient_id IS NOT NULL` (one decision per recipient).
- **`shared_link_events`** (lines 164-178): `id`, `publication_id`, `recipient_id` (nullable), `event_type` CHECK `open|comment_add|accept_decision|decline_decision|password_attempt`, `metadata_json`, `ip_hash`, `user_agent_hash`, `created_at`.
- **`publication_digest_log`** (lines 186-195): `id`, `publication_id`, `activity_kind` CHECK `comment|decision`, `delivery_status` CHECK `sent|mocked|failed|skipped|rate_limited`, `owner_email_hash`, `resend_message_id`, `error_code`, `created_at`.

### Supporting: `migrations/0006_ai_audit_rate_limits.sql:123` — `security_rate_limit_events`

`id`, `scope`, `key_hash`, `metadata_json`, `occurred_at`, `expires_at`. Indexed `(scope, key_hash, occurred_at DESC)` + `expires_at`. Shared by AI, collaboration, AND publication rate limits.

### Repository function index (file:line)

`src/lib/publication/d1-store.ts` (factory `createPublicationD1Store` at :211; methods on the returned object):
- `getPublicationActivityContextByTokenHash` :253-264 — `SELECT id, status, revoked_at, expires_at, password_hash, activity_target_labels_json, snapshot_version FROM project_publications WHERE token_hash = ?`. **Minimal column set.**
- `listPublicActivityComments` :474-496 — `SELECT id, created_at, body, is_internal, author_email, author_name, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_version_at_comment FROM shared_link_comments WHERE publication_id = ? AND is_internal = 0 ORDER BY created_at DESC, id DESC LIMIT ?`. **`author_email` selected but unused (O1).** **No `deleted_at` filter (no such column exists — verified).**
- `listRecipientActivityResponses` :498-517 — recipient-scoped (`AND recipient_id = ?`). Returns `note` raw.
- `listRecipientActivityEvents` :519-537 — recipient-scoped. Returns `metadata_json` raw (flows into composer `facts`, subject to filtering).
- `listRecipientDisplayNames` :539-552 — `SELECT id, email, display_name FROM shared_link_recipients WHERE publication_id = ? AND id IN (...) LIMIT 500`. **`email` selected but unused (O5); `readSharedLinkRecipientDisplayName` uses only `display_name`.**

`src/lib/publication/public-repository.ts` (service/orchestration):
- `resolveProjectPublicationAccessByToken` :636, `verifyProjectPublicationPasswordByToken` :665, `recordProjectPublicationAnalyticsEvent` :678, `recordProjectPublicationEvent` :720, `verifySharedLinkRecipientToken` :783, `loadSharedLinkPublicComments` :854, `loadSharedLinkRecipientDecision` :888, `insertSharedLinkComment` :928 (SEC-06 cross-publication scoping :948-957), `submitSharedLinkDecision` :1011 (SEC-06 :1028-1040). Rate limiters :401-624.
- `mapSharedLinkPublicComment` :868-882 — public comment DTO; **no `author_email`** (good).
- Telemetry hashing :172-183 — `hashRequestValue` HMAC keyed by `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER` (falls back to publication token hash secret).

`src/lib/activity/activity-composer.ts`:
- `composeSharedLinkActivity` :411-471. `visibility = internal` if `item.is_internal` else `opts.visibility ?? "owner"` (:414). `sharedActor` for client = `{ kind: "client", displayName, isSafeForClient: true }` — no `recipient_id` (:374-379). **`facts` deny-list regex** :449-452: `/[Ii]d$|event_?type|metadata_json|ip_?hash|user_?agent_?hash|raw_?ip|raw_?user_?agent|target_?kind|target_?label|target_?secondary_?label/i`, sliced to 8, formatted. **`raw` = `undefined` when `audience === "client"`** (:467). `body` via `stripUnsafeText` (:419; activity-formatters.ts:30-41 scrubs UUIDs + emails).

`src/lib/activity/activity-visibility.ts`:
- `toClientSafeActivity` :28-54 — estimate-activity client path (rehashes id via FNV :13-26, drops raw, downgrades internal→owner, strips actor.id). **Not called by the activity route** (composer handles client safety directly). Layered/redundant defense.

### Retention coverage map (`src/lib/compliance/retention-core.ts:79-143` `DEFAULT_RETENTION_RULES`)

| Table | Currently retained? | TTL | Action | Gap? |
|---|---|---|---|---|
| `shared_link_events` | ✅ | 90 days | `purged` (hard DELETE) | None |
| `collaboration_audit_events` | ✅ | 365 days | `purged` | None |
| `estimate_sheet_events` | ✅ | 365 days | `purged` | None |
| `account_security_events` | ✅ | 365 days | `purged` | None |
| `privacy_requests` (completed) | ✅ | 2555 days | — | None |
| **`shared_link_comments`** | ❌ | indefinite | — | **Gap (P2)** |
| **`shared_link_responses`** | ❌ | indefinite | — | **Gap (P2)** |
| **`shared_link_recipients`** | ❌ | indefinite | — | **Gap (P2 — PII)** |
| **`project_publications`** | ❌ | indefinite | — | **Gap** |
| **`project_publication_events`** | ❌ | indefinite | — | **Gap** |
| **`publication_digest_log`** | ❌ | indefinite | — | **Gap** |

Retention cron: `worker.ts:107-115` runs `runRetentionPassInD1(env.ARCH_DB, …)` on `30 3 * * *`. Each run writes a `data_retention_events` row (`retention-core.ts:145-178`). The schedule doc `.ai/10_state/compliance/retention-schedule.md` is draft pending `OPEN-DEC-004` counsel sign-off (`0034` header). **TTLs in `retention-core.ts` are operative until then.**

### Token storage & validation (`src/lib/publication/security.ts`)

- **Publication raw token:** 32 random bytes, base64url (43 chars). `isPublicationTokenShape` (:73). **Never stored raw.** `token_hash` = `hmac-sha256-v1:<base64url>` (HMAC-SHA256 keyed by `PUBLICATION_TOKEN_HASH_SECRET`/`ARHESTIMATOR_PUBLICATION_TOKEN_HASH_SECRET`, :78-81). `encrypted_token` = `aes-256-gcm-v1:<iv>:<tag>:<ciphertext>` (:83-89) — decryptable by owner to reconstruct `/share/<token>` URLs.
- **Publication password:** scrypt (`scrypt-sha256-v1:<salt>:<hash>`, :142-166). NFC-normalized, min 4 chars. `verifyPublicationPassword` constant-time.
- **Recipient token:** per-recipient raw token (`createPublicationToken`, actions.ts:1452), stored only as `recipient_token_hash` (same HMAC). Raw in `?recipient=` email param.
- **Session cookies:** HMAC-signed, not DB-stored. Access cookie `ae_publication_access_<suffix>` (Max-Age 24h). Recipient session `shared_link_session_<suffix>`, prefix `shared-link-session-v1`, Max-Age 86400s, HttpOnly, SameSite=Lax, Secure prod. Carries `recipientId`. `*_ok` companion non-secret client-visible.
- **`credentialVersion`:** derived = sha256(password_hash)[:22] or `"open"` (:194-197). Binds cookies; changes iff password changes.
- **Expiry/revocation:** `isActivePublication` (:117-122) checks `status='published'` + `revoked_at IS NULL` + `expires_at > now`. Inlined as `activePublicationWhere()` (d1-store.ts:206-209).
- **Rotation:** `replace_project_publication` (admin-d1-client.ts:468-528) sets old row `status='revoked', revoked_at=now` + inserts new version in `db.batch` (atomic). `rotate_project_publication_credentials` (:530-594) bumps `snapshot_version`, rewrites token/password, **revokes all recipient tokens** (rewrites `recipient_token_hash` to `'revoked:'||publication_id||…`, :583-589) — recipients must be re-invited.
- **Multi-use:** publication + recipient tokens are multi-use until revoked/expired. Recipient **decision** is single-use via UNIQUE partial index (d1-store.ts:684-689). Comments unlimited (rate-limited).

### Secret sharing (P1-3)

`src/lib/publication/security.ts:107-120`: `PUBLICATION_TOKEN_HASH_SECRET` (with `ARCHESTIMATOR_PUBLICATION_TOKEN_HASH_SECRET` fallback) is used by:
- `token_hash` HMAC (publication + recipient token) — security.ts:108-110, public-repository.ts:796.
- `credentialVersion` derivation (transitively, via password_hash).
- **Access-cookie digest fallback** — security.ts:114-120 (`PUBLICATION_ACCESS_COOKIE_SECRET` falls back to it).
- **Telemetry pepper fallback** — public-repository.ts:172-174 (`ARCHESTIMATOR_TELEMETRY_HASH_PEPPER` preferred, falls back to token hash secret).

`PUBLICATION_TOKEN_ENCRYPTION_SECRET` (security.ts:101-103) is separate (for `encrypted_token`). Production throws if missing.

### Recipient modeling (`src/lib/publication/actions.ts:1350-1550` `addSharedLinkRecipients`)

- Recipients are **anonymous email rows**, NOT workspace members, NOT user-linked. No `user_id`/`workspace_id` column on `shared_link_recipients`. Identity = `(publication_id, lower(email))` + per-row `recipient_token_hash`.
- Fields: `email` (lowercased plaintext), `display_name` (free-text optional), `invited_by` (manager user_id), delivery + Resend webhook fields, `email_unsubscribed_at`.
- Self-invite blocked (actions.ts:1127-1135). Hard cap 50 recipients/action (`recipient-limits.ts`). Dedupe via UNIQUE `(publication_id, lower(email))`.
- Email-matching for logged-in recipient proposals view: `recipient-proposals-repository.ts:86-163` joins on `lower(recipient.email) = lower(current user email)`. **This is why recipient email must stay plaintext at rest.**

### Cross-workspace isolation & app-authz (no D1 RLS)

- App-authz helpers: `src/lib/authz/d1-access.ts` — `canAccessProjectInD1` :99, `canEditProjectInD1` :142, `isWorkspaceMemberInD1` :313, etc. Platform admins bypass (`isPlatformAdmin` :24).
- Publisher permissions: `src/lib/publisher/permissions.ts` — `canReadPublisherRosterProject` (role ≠ viewer), `canManagePublisherRosterProject` (owner|admin).
- Publication manager gate: `assertProjectPublicationManager` (actions.ts:392-439, called throughout) — authenticated + owner/admin on publication's project.
- Public surface isolation: token hash is the only credential; `recipient_id` from signed session cookie, re-checked at every write (SEC-06). Admin D1 client (`admin-d1-client.ts:46-63`) restricts tables to `knownTables` allowlist; `assertSafeIdentifier` (:85) prevents injection.

---

## §D. Test coverage map

| Test file | Covers | Gap? |
|---|---|---|
| `tests/vitest/activity-security.test.ts` | `composeSharedLinkActivity`/`filterActivityForVisibility`: raw stripped for client (9-13), IDs rehashed (15-41), internal removed (43-48), `target.id` undefined for client (57-70), `ip_hash`/`user_agent_hash` omitted (72-82). **Strong composer coverage.** | None for composer |
| `tests/vitest/security-findings-publication-contracts.test.ts:94-109` | String-based contract: activity route contains `password_hash`, `hasPublicationAccessCookie`, recipient-scoped `listRecipientActivityResponses`/`listRecipientActivityEvents` calls, D1 queries scope `WHERE publication_id = ? AND recipient_id = ?`. Asserts route does NOT contain `snapshotVersion: "1"`. | Brittle string-matching; not behavior |
| `tests/vitest/share/share-page-get-routes-contract.test.ts` | `/comment` + `/decision` GET contracts (session gate, password gate, rate limit). | **Does NOT cover `/activity` GET.** |
| `tests/vitest/share-no-store-invariants.test.ts:8` | Asserts `activity/route.ts` is in the no-store route list. | None |
| `tests/vitest/project-publication-activity.test.tsx` | Owner activity surface. | None for owner |
| `tests/vitest/shared-link-activity-benchmark.test.ts` | Activity route benchmark. | None (extend for Phase 3 perf) |
| **(missing)** | **Route-handler-level test for `GET /api/share/[token]/activity`:** pagination, password gate (423), recipient-scoping (decisions/events absent without session), internal filter at HTTP layer, over-fetch absence (`author_email`/`email` not in row), revoked/expired → 404. | **Gap (P2) — Phase 2 adds this.** |
| **(missing)** | **Facts allow-list test:** a metadata key not in the allow-list does not appear in `facts`. | **Gap — Phase 2 adds this.** |
| **(missing)** | **Retention-rule test:** new rules cover comments/responses/recipients/publications/publication_events/digest_log. | **Gap — Phase 5 adds this.** |
| **(missing)** | **Redactor routing test:** share routes log via `logAppError`/`emitLogRecord` (or equivalent) so `redactForLog` applies; a URL/`token_hash` in an error is redacted. | **Gap — Phase 1/2 adds this.** |

---

## §E. Document impact

| Document | Relevant? | Notes |
|---|---|---|
| `AGENTS.md` | Yes | Stack baseline, verification policy, Cloudflare standing auth + free-tier posture. Not modified by this plan. |
| `.ai/10_state/current-state.md` | FAST PATH only | Project stage: preparing for first users. |
| `.ai/10_state/decisions.md` | Referenced | `rg` for publication/share decisions; no whole-read. |
| `.ai/10_state/compliance/retention-schedule.md` | Referenced | Draft pending OPEN-DEC-004; TTLs in retention-core.ts operative. |
| `DESIGN.md` | Alpha, not law | Not modified. |
| `wrangler.jsonc` | Read-only | D1 binding `ARCH_DB` (id `9bdb29bb-…`), crons include `30 3 * * *` retention. |
| Sibling plan: `2026-07-06-Transition-And-Loading-UX-And-UI/` | Adjacent | Touches share overlay UX; this plan is the privacy/minimization complement. No overlap in files edited. |

No source document contradicts the FEATURE BRIEF. The only tension is the implicit "retention plans overlap but do not replace data minimization work" (PROMPT.md) — confirmed: retention (Phase 5) is necessary but not sufficient; the DTO/over-fetch/facts-filter work (Phases 1-2) is the core minimization.
