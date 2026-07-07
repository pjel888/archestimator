# Requirements Specification

Every requirement has a stable ID, objective acceptance criteria, a validation method, affected code areas, and (for behavior-bearing flows) a shadow-path matrix. Priorities: `P0` block implementation readiness; `P1` strongly recommended; `P2` nice-to-have / owner-gated. Source codes: `brief` (PROMPT.md), `repo evidence` (file:line), `official docs` (Next.js local docs), `derived`, `assumption`, `owner-delegated decision`.

---

## FR — Functional requirements

### FR-01 (P0) — Single defined public-share data contract
**Statement.** The public activity response SHALL return exactly the fields in a single documented `PublicActivityViewModel` allow-list: `id, source, action, visibility, occurredAt, title, summary, badges, target{kind,label,secondaryLabel}`. No `meta`, no `raw`, no `author_email`, no recipient `email`, no internal UUIDs.
**Rationale.** PROMPT.md "Define the public-share data contract, minimum recipient-visible fields." Source: `brief` + `repo evidence` (route.ts:30-40).
**Priority.** P0.
**Dependencies.** None.
**Acceptance criteria.**
- AC-FR-01a: A route-level test asserts the JSON response keys equal exactly the allow-list (no `meta`, no `email`, no `author_email`, no `raw`).
- AC-FR-01b: TypeScript `PublicActivityViewModel` type omits `meta` (or documents it as always-undefined and removes the dead pick).
**Validation.** Route-level vitest (Phase 2). Type-check (`bun run type-check`).
**Affected code.** `src/app/api/share/[token]/activity/route.ts:30-40,60-77`; `src/lib/activity/activity-composer.ts` (confirm `meta` unused).
**Risks.** Removing `meta` from the type could break a consumer that reads it — verified no consumer reads `meta` (`SharedLinkActivityFeed.tsx` does not; no recipient-page consumer). **Status.** Ready.

### FR-02 (P0) — Public comments readable without session (preserve)
**Statement.** An anonymous caller passing token + password gate SHALL still receive the public (`is_internal = 0`) comment list. (Existing behavior, must not regress.)
**Rationale.** PROMPT.md "Do not degrade legitimate recipient review flows." Source: `repo evidence` (route.ts:27-29,149-188).
**Priority.** P0.
**Acceptance criteria.** AC-FR-02a: Route test — anonymous call returns `activities` including comment items; internal comments excluded.
**Validation.** Route-level vitest.
**Affected code.** `src/app/api/share/[token]/activity/route.ts:149-188`.
**Status.** Ready (preserve + regression test).

### FR-03 (P0) — Decisions and events recipient-scoped
**Statement.** Decisions (`shared_link_responses`) and events (`shared_link_events`) SHALL be returned only for the verified recipient's `recipient_id`; an anonymous or other-recipient caller SHALL NOT receive them.
**Rationale.** PROMPT.md + privacy. Source: `repo evidence` (route.ts:189-210, d1-store.ts:498-537).
**Priority.** P0.
**Acceptance criteria.** AC-FR-03a: Route test — anonymous call has no decision/event items; recipient-A call has no recipient-B items.
**Validation.** Route-level vitest.
**Affected code.** `src/app/api/share/[token]/activity/route.ts:189-210`.
**Status.** Ready.

### FR-04 (P0) — Internal comments excluded
**Statement.** `is_internal = 1` comments SHALL be excluded at SQL level AND in the composer visibility filter (defense in depth).
**Rationale.** Privacy. Source: `repo evidence` (d1-store.ts:487, route.ts:218).
**Priority.** P0.
**Acceptance criteria.** AC-FR-04a: Route test — an internal comment row exists but is absent from the public response.
**Validation.** Route-level vitest.
**Affected code.** `d1-store.ts:487`, `route.ts:216-219`.
**Status.** Ready (preserve + regression test).

### FR-05 (P1) — Stable encrypted cursor pagination
**Statement.** Pagination SHALL use a server-secret-keyed AES-256-GCM cursor; `limit` clamped 1-100; `hasMore` + `nextCursor` returned. No client-controlled offset into the dataset.
**Rationale.** PROMPT.md "pagination/rate limits." Source: `repo evidence` (route.ts:98-100,220-227; activity-helpers.ts:247-282).
**Priority.** P1.
**Acceptance criteria.** AC-FR-05a: Route test — `limit=5` returns 5 items + `hasMore:true` + valid `nextCursor`; next page returns the next 5; a tampered cursor returns 400.
**Validation.** Route-level vitest.
**Affected code.** `src/app/api/share/[token]/activity/route.ts:98-100,220-227`.
**Status.** Ready (preserve + regression test).

### FR-06 (P0) — Revoked/expired returns uniform 404, never cached
**Statement.** A revoked or expired publication's activity endpoint SHALL return 404 with `sharedLinkUnavailableErrorBody()` and `Cache-Control: no-store`. No activity data, no existence confirmation.
**Rationale.** PROMPT.md "revoked/expired behavior." Source: `repo evidence` (route.ts:111, public-repository.ts:117-122).
**Priority.** P0.
**Acceptance criteria.** AC-FR-06a: Route test — revoked publication → 404 with the uniform body; expired → 404; response header `cache-control: no-store`.
**Validation.** Route-level vitest.
**Affected code.** `src/app/api/share/[token]/activity/route.ts:107-113`.
**Status.** Ready.

### FR-07 (P0) — Password gate (423) before any activity data
**Statement.** If `password_hash` is set and no valid access cookie, the endpoint SHALL return 423 `passwordRequired: true` before any data query beyond the publication-context lookup.
**Rationale.** Privacy. Source: `repo evidence` (route.ts:118-130).
**Priority.** P0.
**Acceptance criteria.** AC-FR-07a: Route test — password-protected publication, no cookie → 423; valid cookie → 200.
**Validation.** Route-level vitest.
**Affected code.** `src/app/api/share/[token]/activity/route.ts:118-130`.
**Status.** Ready.

---

## SEC — Security/privacy requirements

### SEC-01 (P0) — Remove `author_email` over-fetch from public comment read
**Statement.** `listPublicActivityComments` SHALL NOT select `author_email` for the public activity route. The owner action `loadSharedLinkActivity` may retain it.
**Rationale.** Data minimization. Source: `repo evidence` (d1-store.ts:484; route.ts:174-188 never reads it).
**Priority.** P0.
**Acceptance criteria.** AC-SEC-01a: Repository test — `listPublicActivityComments` returned row type omits `author_email`; the over-fetch is gone.
**Validation.** Focused vitest on the repository function + `EXPLAIN`/query-log provider readback (Phase 4 proof).
**Affected code.** `src/lib/publication/d1-store.ts:474-496`; the `SharedLinkActivityCommentD1Row` type (d1-store.ts:69) split if needed.
**Risks.** If any code path reads `author_email` from this function's output, it breaks — verified the public route does not. **Status.** Ready.

### SEC-02 (P0) — Remove recipient `email` over-fetch from display-name lookup
**Statement.** `listRecipientDisplayNames` SHALL NOT select `email` for the public activity route. `readSharedLinkRecipientDisplayName` uses only `display_name`.
**Rationale.** Data minimization. Source: `repo evidence` (d1-store.ts:545; activity-helpers.ts:42-44).
**Priority.** P0.
**Acceptance criteria.** AC-SEC-02a: Repository test — returned row type omits `email`.
**Validation.** Focused vitest + provider readback.
**Affected code.** `src/lib/publication/d1-store.ts:539-552`.
**Status.** Ready.

### SEC-03 (P0) — Allow-list (not deny-list) facts filter
**Statement.** `composeSharedLinkActivity` `facts` SHALL be built from an **allow-list** of metadata keys derived from the event-write allow-list (`events/route.ts:17`: `durationMs, format, reason, source, success, target`) plus decision/target coordinates already on the row. Any key not on the allow-list SHALL NOT appear in `facts`.
**Rationale.** PROMPT.md "redaction rules." Deny-list is pattern-fragile (C1). Source: `repo evidence` (activity-composer.ts:449-452) + `events/route.ts:17`.
**Priority.** P0.
**Acceptance criteria.** AC-SEC-03a: Composer test — a metadata object with an off-list key (e.g. `signerName`, `internalUserId`) produces no `facts` entry for that key.
**Validation.** Composer vitest (extend `activity-security.test.ts`).
**Affected code.** `src/lib/activity/activity-composer.ts:449-452`.
**Risks.** Tightening may drop a currently-shown benign fact — audit current event metadata keys to confirm the allow-list covers them. **Status.** Ready (with discovery step).

### SEC-04 (P0) — Route share-route logging through the redactor
**Statement.** Share routes SHALL log errors via `logAppError`/`emitLogRecord` (which run `redactForLog`) instead of raw `console.error(error, …)`.
**Rationale.** Logging safety (P2-2). Source: `repo evidence` (route.ts:72, comment/route.ts:120, decision/route.ts:76, password/route.ts:104, page.tsx:165,232,246,258; redact.ts:67-85).
**Priority.** P0.
**Acceptance criteria.** AC-SEC-04a: A grep/test asserts no `console.error(` with a raw error object remains in `src/app/api/share/[token]/**`; a test that an error whose message contains `/share/<token>` or a `token_hash` value is redacted in the emitted log record.
**Validation.** Focused vitest + grep assertion.
**Affected code.** `src/app/api/share/[token]/activity/route.ts`, `comment/route.ts`, `decision/route.ts`, `password/route.ts`, `events/route.ts`, `src/app/share/[token]/page.tsx`.
**Status.** Ready.

### SEC-05 (P0) — Raw DB IDs re-hashed before emission (preserve)
**Statement.** All public-facing IDs SHALL be re-hashed via `createPublicActivityId` (`act_<sha256[:16]>`); no internal UUID exposed.
**Rationale.** Privacy. Source: `repo evidence` (route.ts:56-58).
**Priority.** P0.
**Acceptance criteria.** AC-SEC-05a: Route test — every `id` matches `/^act_[0-9a-f]{16}$/`; no bare UUID in the response.
**Validation.** Route-level vitest.
**Affected code.** `src/app/api/share/[token]/activity/route.ts:56-58`.
**Status.** Ready (preserve + regression test).

### SEC-06 (P0) — Cross-publication recipient scoping (preserve)
**Statement.** Comment/decision writes SHALL scope `recipient_id` lookup to the publication owning the token (SEC-06). A recipient from publication A cannot act under publication B.
**Rationale.** Privacy. Source: `repo evidence` (public-repository.ts:948-957,1028-1040; d1-store.ts:596-617,658-682).
**Priority.** P0.
**Acceptance criteria.** AC-SEC-06a: Repository/route test — cross-publication recipient id is rejected.
**Validation.** Focused vitest (existing `project-publication-public-repository.test.ts` covers this; confirm + extend).
**Affected code.** `src/lib/publication/public-repository.ts:928-1077`.
**Status.** Ready (preserve).

### SEC-07 (P1, owner-gated OPEN-SEC-02) — Split the shared secret
**Statement.** Production SHALL use four dedicated secrets: `PUBLICATION_TOKEN_HASH_SECRET`, `PUBLICATION_TOKEN_ENCRYPTION_SECRET`, `PUBLICATION_ACCESS_COOKIE_SECRET`, `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER`. No silent fallback chaining.
**Rationale.** P1-3. Source: `repo evidence` (security.ts:107-120; public-repository.ts:172-174,796).
**Priority.** P1.
**Acceptance criteria.** AC-SEC-07a: In production, missing any of the four throws (no silent fallback); a test verifies the fallback chain is removed or guarded behind an explicit `allowSecretFallback` flag.
**Validation.** Config/unit test + owner confirmation of secret provisioning.
**Affected code.** `src/lib/publication/security.ts:107-120`; `src/lib/publication/public-repository.ts:172-174,796,823`.
**Status.** Owner-gated (OPEN-SEC-02). `CONDITIONALLY READY`.

### SEC-08 (P1, owner-gated OPEN-SEC-03) — Cloudflare Turnstile/WAF on share routes
**Statement.** Open (non-password) share links SHALL be fronted by Cloudflare Turnstile (free tier) and/or WAF custom rules to add friction to automated scraping; password-protected links rely on the password gate.
**Rationale.** P1-1, P1-2. Source: `repo evidence` (no Turnstile/WAF found; public-repository.ts:401-414 no lockout).
**Priority.** P1.
**Acceptance criteria.** AC-SEC-08a: A Turnstile token is validated server-side before the snapshot/activity GET for open links; WAF rule blocks abusive IPs. Documented in a runbook.
**Validation.** Browser/route proof + Cloudflare dashboard proof (provider-backed).
**Affected code.** `src/app/api/share/[token]/route.ts`, `activity/route.ts`; Turnstile server verify helper (new); `wrangler.jsonc` (WAF is dashboard-side, not config).
**Status.** Owner-gated (OPEN-SEC-03). `CONDITIONALLY READY`.

### SEC-09 (P1, owner-gated OPEN-SEC-04) — Server-side session revocation
**Statement.** A per-publication `session_generation` counter SHALL invalidate stolen recipient session cookies without rotating the whole publication; bumping it on recipient removal.
**Rationale.** P2-6. Source: `repo evidence` (security.ts:419-538; no server-side revocation list).
**Priority.** P1.
**Acceptance criteria.** AC-SEC-09a: After bumping `session_generation`, a previously-valid session cookie is rejected with 401/419; recipient flow still works after re-session.
**Validation.** Route-level vitest + migration proof.
**Affected code.** New migration (`shared_link_recipients.session_generation` or `project_publications.session_generation`); `security.ts` session verify; `actions.ts` recipient removal.
**Status.** Owner-gated (OPEN-SEC-04). `CONDITIONALLY READY`.

### SEC-10 (P0) — Rate limit on activity route (preserve)
**Statement.** The activity endpoint SHALL enforce `checkProjectPublicationActivityRateLimit` (60/min per token+request) → 429 + `Retry-After`.
**Rationale.** PROMPT.md "rate limits." Source: `repo evidence` (route.ts:86; public-repository.ts:453-466).
**Priority.** P0.
**Acceptance criteria.** AC-SEC-10a: Route test — 61st request in the window → 429 with `Retry-After`.
**Validation.** Route-level vitest.
**Affected code.** `src/app/api/share/[token]/activity/route.ts:86`.
**Status.** Ready (preserve + regression test).

### SEC-11 (P2) — Drop internal `publication_id`/`recipient_id` Resend tags
**Statement.** Email provider tags SHALL not carry raw internal UUIDs; hash or omit them.
**Rationale.** P2-3. Source: `repo evidence` (actions.ts:1300-1305).
**Priority.** P2.
**Acceptance criteria.** AC-SEC-11a: Resend tags contain no raw UUID; documented mapping.
**Validation.** Unit test on the email-send helper.
**Affected code.** `src/lib/publication/actions.ts:1300-1305`.
**Status.** Ready (low priority).

---

## DATA — Data/retention requirements

### DATA-01 (P0, owner-gated OPEN-RET-01) — Retention covers share content
**Statement.** `DEFAULT_RETENTION_RULES` SHALL include rules for `shared_link_comments`, `shared_link_responses`, `shared_link_recipients`, `project_publications`, `project_publication_events`, `publication_digest_log`, each with an owner-signed TTL and action (`purged` or `anonymized`).
**Rationale.** PROMPT.md "retention, privacy… plans overlap but do not replace data minimization." Source: `repo evidence` (retention-core.ts:79-143 gap).
**Priority.** P0 (mechanism internal; TTL values owner-gated).
**Acceptance criteria.** AC-DATA-01a: Retention-rule test asserts each table has a rule; a dry-run of `runRetentionPassInD1` against a fixture with rows past the TTL deletes/anonymizes them and writes a `data_retention_events` row.
**Validation.** Focused vitest on `retention-core.ts` with a fake D1.
**Affected code.** `src/lib/compliance/retention-core.ts:79-143`.
**Risks.** TTL values affect real data — owner must sign off (OPEN-RET-01). Default recommendation: `shared_link_comments`/`responses` 730d, `shared_link_recipients` 365d post-publication-revoke, `project_publications`/`publication_events`/`digest_log` 1095d. **Status.** `IMPLEMENTATION-READY` for the mechanism; TTL values `CONDITIONALLY READY` (OPEN-RET-01).

### DATA-02 (P0) — No soft-delete gap
**Statement.** Because no share table has a `deleted_at` column, the activity read SHALL NOT need a soft-delete filter. Document this invariant; if a future migration adds soft-delete, the read queries MUST be updated to exclude it.
**Rationale.** Privacy (avoid leaking soft-deleted content). Source: `repo evidence` (no `deleted_at` on any share table; d1-store.ts:487 has no such filter).
**Priority.** P0.
**Acceptance criteria.** AC-DATA-02a: A test/grep assertion documents the no-soft-delete invariant; a comment in `listPublicActivityComments` names the assumption.
**Validation.** Static assertion + comment.
**Affected code.** `src/lib/publication/d1-store.ts:474-496`.
**Status.** Ready.

### DATA-03 (P0) — Recipient email stays plaintext at rest (documented)
**Statement.** Recipient `email` SHALL remain plaintext (lowercased) to support the email-matched proposals view. Privacy is provided by retention (DATA-01) + minimization (SEC-02), not at-rest hashing.
**Rationale.** `repo evidence` (recipient-proposals-repository.ts:86-163 email join).
**Priority.** P0 (document; do not change).
**Acceptance criteria.** AC-DATA-03a: Decision recorded in `15_…md`; no plan task hashes recipient email.
**Validation.** Decision-record check.
**Status.** Ready.

---

## API — API/network requirements

### API-01 (P0) — `Cache-Control: no-store` on every share response (preserve)
**Statement.** Every `/api/share/[token]/*` and `/share/[token]` response SHALL carry `Cache-Control: no-store`.
**Rationale.** Privacy (revoked content not edge-cached). Source: `repo evidence` (share-no-store-invariants.test.ts:8).
**Priority.** P0.
**Acceptance criteria.** AC-API-01a: The no-store invariant test covers the activity route (already does); extend to assert it after Phase edits.
**Validation.** Existing vitest.
**Affected code.** `src/app/api/share/[token]/activity/route.ts` (header on all branches).
**Status.** Ready (preserve).

### API-02 (P1) — Uniform error contract
**Statement.** 404 (revoked/expired/not-found), 423 (password), 429 (rate limit), 400 (bad cursor) SHALL use the existing uniform error shapes; no raw DB error echoed (SEC-15 pattern).
**Rationale.** Logging safety + no information disclosure. Source: `repo evidence` (comment/route.ts:390-396 SEC-15).
**Priority.** P1.
**Acceptance criteria.** AC-API-02a: Route test — each error code returns its documented shape; a forced DB error is not echoed.
**Validation.** Route-level vitest.
**Affected code.** `src/app/api/share/[token]/activity/route.ts`.
**Status.** Ready.

---

## TEST — Testing requirements

### TEST-01 (P0) — Route-level activity GET test
**Statement.** A vitest route-handler test SHALL exercise `GET /api/share/[token]/activity`: happy path, pagination (limit + cursor), password gate (423), rate limit (429), revoked/expired (404), anonymous (comments only, no decisions/events), recipient-A vs recipient-B isolation, internal-comment exclusion, over-fetch absence (`author_email`/`email` not in returned rows), tampered cursor (400).
**Rationale.** PROMPT.md "Treat source-only inspection as insufficient proof for privacy; specify tests and hosted checks." Source: `brief`.
**Priority.** P0.
**Acceptance criteria.** AC-TEST-01a: Test file exists and passes; covers all listed scenarios.
**Validation.** `bun run test:dom` or focused vitest on the new file.
**Affected code.** New test file `tests/vitest/share/share-activity-route.test.ts` (proposed).
**Status.** Ready.

### TEST-02 (P0) — Facts allow-list test
**Statement.** A composer test SHALL assert an off-list metadata key does not appear in `facts`.
**Rationale.** SEC-03. Source: `brief`.
**Priority.** P0.
**Acceptance criteria.** AC-TEST-02a: Test passes.
**Validation.** Extend `tests/vitest/activity-security.test.ts`.
**Status.** Ready.

### TEST-03 (P0) — Retention-rule test
**Statement.** A vitest on `retention-core.ts` SHALL assert the six new rules exist and a dry-run deletes/anonymizes past-TTL rows.
**Rationale.** DATA-01.
**Priority.** P0.
**Acceptance criteria.** AC-TEST-03a: Test passes.
**Validation.** New/existing retention test.
**Status.** Ready (mechanism); TTL values owner-gated.

### TEST-04 (P1) — Redactor routing test
**Statement.** A test SHALL assert share routes log via the redactor path and a token-bearing error is redacted.
**Rationale.** SEC-04.
**Priority.** P1.
**Acceptance criteria.** AC-TEST-04a: Test passes.
**Validation.** Focused vitest on a share route error path with a log sink.
**Status.** Ready.

---

## PERF — Performance requirements

### PERF-01 (P0) — Activity route p95 budget
**Statement.** The activity route p95 SHALL stay ≤ 300ms at `limit=100` with ≤ 1000 comments + 50 recipients + 50 responses + 200 events; ≤ 500ms at the 1000-comment fixture. Regression threshold +20%; rollback trigger p95 > 600ms.
**Rationale.** PROMPT.md implies preserving review flow speed. Source: `repo evidence` (3 parallel queries + 1 batched lookup; existing benchmark `shared-link-activity-benchmark.test.ts`).
**Priority.** P0.
**Acceptance criteria.** AC-PERF-01a: Benchmark extended with the fixture; p95 within budget over N runs.
**Validation.** `bun test tests/vitest/shared-link-activity-benchmark.test.ts`.
**Affected code.** `tests/vitest/shared-link-activity-benchmark.test.ts`.
**Status.** Ready (extend existing).

---

## REL — Reliability requirements

### REL-01 (P0) — Failure isolation
**Statement.** A D1 error in one of the three parallel queries SHALL NOT cause a partial/partially-redacted response; it SHALL return 500 with the uniform error shape.
**Rationale.** Privacy (no partial leak).
**Priority.** P0.
**Acceptance criteria.** AC-REL-01a: Route test — inject a D1 failure; response is 500 uniform, no partial body.
**Validation.** Route-level vitest.
**Status.** Ready.

---

## DOC — Documentation requirements

### DOC-01 (P1) — Data contract documented
**Statement.** The public-share data contract (fields, redaction rules, pagination, rate limits, revoked/expired behavior) SHALL be documented in a durable doc (e.g. `.ai/06_specs/share-activity-data-contract.md` or this plan's `06_…md`).
**Rationale.** PROMPT.md "Define the public-share data contract."
**Priority.** P1.
**Acceptance criteria.** AC-DOC-01a: Doc exists and matches the implementation.
**Validation.** Doc review.
**Status.** Ready (this plan's `06_…md` is the initial home).

### DOC-02 (P2) — Runbook for owner-gated hardening
**Statement.** Phases 3/6/7 (secret split, Turnstile/WAF, session revocation) SHALL each have a runbook entry: env var/provisioning steps, rollback, verification.
**Rationale.** Operations.
**Priority.** P2.
**Acceptance criteria.** AC-DOC-02a: Runbook entries exist in `13_…md`.
**Status.** Ready.

---

## Shadow-path matrices

### Activity GET read

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| `GET /activity` | 200 + activities[] | 404 (bad token) | 200 + `activities:[]`, `hasMore:false` | 400 (bad cursor) | 423 (password) / 404 (revoked) | 500 uniform | 429 (rate limit) | GET idempotent; cursor stable | JSON or uniform error | TEST-01 |

### Comment POST write

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| `POST /comment` | 201 + comment | 400 (missing body) | 400 (empty body) | 400 (oversized >1000) | 401 (no session) / 423 (password) / 409 (snapshot stale) | 500 uniform (SEC-15) / 503 (circuit breaker) | 409 (snapshot version) | Non-idempotent; rate-limited 5/min+20/hr | 201 or uniform error | existing `project-publication-comments.test.tsx` + extend |

### Decision POST write

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| `POST /decision` | 201 + decision | 400 (missing decision) | n/a | 400 (bad enum) | 401 / 423 | 500 uniform | 409 (already submitted, UNIQUE partial index) | Single-use; idempotent retry returns existing | 201 or 200 (existing) | existing + extend |

### Event POST write

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| `POST /events` | 200 | 400 (bad event type) | n/a | 400 (oversized metadata) | 401 (no session for some types) / 423 | 500 uniform | 429 (rate limit) | Idempotent (append-only, allow-listed) | 200 or uniform error | existing |

### Session start

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| `POST /session` | 200 + cookie set | 400 (missing recipient token) | n/a | 400 (bad recipient token) | 404 (publication) | 500 uniform | Cookie set is atomic per request | Idempotent (re-session ok) | 200 + cookie | existing `share-page-get-routes-contract.test.ts` |

### Retention purge

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Cron `30 3 * * *` | rows purged + `data_retention_events` row | n/a (cron) | 0 rows affected → still writes event | n/a | n/a (system cron) | caught + logged + event row with error | next run resumes | Idempotent (DELETE is) | silent (cron) | TEST-03 |

---

## Open decisions referenced

- OPEN-RET-01 (DATA-01 TTL values), OPEN-SEC-02 (SEC-07), OPEN-SEC-03 (SEC-08), OPEN-SEC-04 (SEC-09), OPEN-UX-02 (feature-flag activity route for recipients). See `15_…md`.
