# Executive Summary

**Plan status:** `CONDITIONALLY READY`
**Implementation-ready slices:** Phase 1 (DTO + over-fetch + facts allow-list + redactor routing) · Phase 2 (route-level privacy tests) · Phase 4 (revoked/expired uniformity + no-store verification) · Phase 5 (retention-rule additions, pending OPEN-RET-01 TTL sign-off)
**Owner-gated slices:** Phase 3 (secret splitting, OPEN-SEC-02) · Phase 6 (Turnstile/WAF, OPEN-SEC-03) · Phase 7 (server-side session revocation, OPEN-SEC-04) · Phase 5 retention TTLs (OPEN-RET-01)
**Verification mode:** `emulated` (caps overall at 97 and status at `CONDITIONALLY READY`; see `17_FINAL_READINESS_REVIEW.md`)
**Plan profile:** `exhaustive`

---

## What this plan is

A planning-only pack that narrows the **public share activity surface** to the minimum recipient-visible data and proves no unnecessary data is exposed — without degrading the legitimate recipient review flow (view snapshot, comment, decide once).

The canonical endpoint is `GET /api/share/[token]/activity` (`src/app/api/share/[token]/activity/route.ts`). It aggregates comments, decisions (responses), recipient-scoped events, recipient display names, and stored target metadata into one token-gated public feed.

---

## Headline findings (evidence in `03_SOURCE_AND_CODEBASE_AUDIT.md`)

**Already strong (do not regress):**
- Public DTO is a strict `Pick<>` allow-list (`PublicActivityViewModel`, route.ts:30-40).
- Raw DB IDs are re-hashed before emission (`createPublicActivityId`, route.ts:56-58; `act_<sha256[:16]>`).
- Internal comments filtered **twice**: SQL `is_internal = 0` (d1-store.ts:487) + composer visibility filter (route.ts:218).
- `raw` payload always `undefined` for client audience (activity-composer.ts:467).
- Decisions and events are **recipient-scoped** at SQL level (`WHERE publication_id = ? AND recipient_id = ?`), verified by contract test.
- Cursor is AES-256-GCM encrypted + server-secret-keyed — no client-controlled offset.
- Rate-limited per token+request (60/min) with 429 + `Retry-After`.
- Password gate (423) before any activity data; tokens looked up exclusively by HMAC hash.
- `Cache-Control: no-store` on every share response; revoked→404 uniform (no existence leak).

**Gaps this plan closes:**
1. **Over-fetch of PII (P2/O1/O5).** `listPublicActivityComments` SELECTs `author_email` (d1-store.ts:484) and `listRecipientDisplayNames` SELECTs recipient `email` (d1-store.ts:545); both are fetched from D1 and discarded. Not serialized to client (allow-listed `Pick<>`), but unnecessarily read.
2. **Deny-list facts filter (C1).** `composeSharedLinkActivity` filters `facts` by a regex **deny-list** (activity-composer.ts:449-452). Any future metadata key not matching the deny regex leaks as a fact. Mitigated today by allow-listed event-write keys, but pattern-fragile.
3. **`meta` dead path (C3).** `PublicActivityViewModel` picks `meta` (route.ts:39,75) but `composeSharedLinkActivity` never sets `meta` — always `undefined`. Vestigial field.
4. **No route-handler-level test for `/activity` GET.** Composer security is well tested (`tests/vitest/activity-security.test.ts`); the route wiring is only covered by brittle string-matching (`security-findings-publication-contracts.test.ts:94-109`). No test proves pagination, password gate, recipient-scoping, internal filter, or over-fetch absence at the HTTP layer.
5. **Retention does not cover share content.** `DEFAULT_RETENTION_RULES` (retention-core.ts:79-143) purges `shared_link_events` (90d) and `collaboration_audit_events` (365d) but NOT `shared_link_comments`, `shared_link_responses`, `shared_link_recipients`, `project_publications`, `project_publication_events`, or `publication_digest_log`. Recipient PII and comment/decision content persist indefinitely until manual deletion or rotation.
6. **Raw `console.error` bypasses redactor (P2-2).** Share routes call `console.error("[share] …", error)` with raw error objects (e.g. route.ts:72, comment/route.ts:120, decision/route.ts:76, password/route.ts:104) instead of `logAppError`/`emitLogRecord` which run `redactForLog` (`src/lib/observability/redact.ts`). If an error interpolates a URL or `token_hash`, it lands in logs unredacted.
7. **No failed-attempt lockout on token guessing (P1-1).** `checkProjectPublicationSnapshotRateLimit` allows 60/min per (tokenHash, ipHash) but never locks — contrast with the password path which locks out (public-repository.ts:486-498). The 2^256 token space makes blind guessing infeasible, but this is the only brake.
8. **No Cloudflare Turnstile/WAF on share routes (P1-2).** `grep -rin "turnstile|waf|challenge" src/app/api/share src/app/share src/lib/publication` returns zero hits.
9. **Single shared secret backs four credential classes (P1-3).** `PUBLICATION_TOKEN_HASH_SECRET` HMACs the publication token, the recipient token, the access-cookie digest fallback, and the telemetry pepper (security.ts:107-120; public-repository.ts:172-174,796).
10. **No server-side session revocation (P2-6).** Once minted, a recipient session cookie is valid 24h or until password changes/token rotates; no per-session kill switch short of rotating the whole publication.
11. **Recipient's own email echoed (P2-1).** Unsubscribe confirmation text (unsubscribe/route.ts:124) and the session banner (`share/[token]/page.tsx:57`) render the recipient email — intended UX but PII in HTML.

---

## Major architectural findings

- The activity route is **one aggregated public endpoint**, not separate sub-routes per type. Comments are fetched for any caller passing the token + password gate; decisions and events are fetched **only if** a verified recipient session exists (route.ts:149-210). This is a sound shape; the plan tightens the contract rather than splitting the route.
- The activity route **currently has no UI consumer on the recipient-facing page**. `src/app/share/[token]/page.tsx` renders `ShareReviewWorkspace` → `SharePageComments` + `SharePageDecision` + `SharePageTabs`; it never renders `SharedLinkActivityFeed`. The only consumer is the owner `PublisherActivityFeed` (`src/components/workshop/publisher/PublisherActivityFeed.tsx:24`), which uses the server action `loadSharedLinkActivity` (not the public route). The public GET is reachable only by direct API call. **Implication:** the default surface can be shrunk (or the route feature-flagged off for recipients) before it gains UI consumers, lowering the cost of tightening.
- Cross-workspace isolation is enforced entirely in the app layer (no D1 RLS). `recipient_id` is bound to the publication via the signed session cookie and re-checked at every write (SEC-06). The token hash is the only credential on the read side.
- The owner-side mirror `loadSharedLinkActivity` (actions.ts:1814) composes with `audience: "owner"` and is correctly RBAC-gated (`assertProjectPublicationManager`). It is the separation boundary; this plan does not weaken it.

## Major UX/UI findings

- The recipient review journey (view → comment → decide) does not depend on the activity feed today; comments and decisions have their own UI (`SharePageComments`, `SharePageDecision`). Tightening the activity route therefore does not regress the shipped recipient UX.
- The only visible recipient PII on the share page is the recipient's own email in the session banner and the unsubscribe confirmation. The banner is intended; the unsubscribe text echo is flagged (P2-1) but low-risk.

## Major security findings

- **No P0.** Tokens are hashed-before-lookup and never stored raw; internal UUIDs are opaque-mapped before public read; other recipients' emails/display names are not returned to any public endpoint; revoked/expired returns a uniform 404 with `no-store`.
- P1 findings (lockout, Turnstile/WAF, secret splitting) are owner-gated hardening, not blocking the minimization work.
- The minimization work itself (over-fetch removal, allow-list facts, redactor routing, retention) is **internally resolvable and security-positive** — it can proceed under `IMPLEMENTATION-READY`.

## Major performance findings

- The activity route issues three parallel D1 queries (comments always; responses + events only with a verified session) plus one batched display-name lookup. With the default `limit=100` and the `(publication_id, created_at DESC)` indexes, this is bounded. The plan's performance evaluator (`09_…md` EV-ACT-01) sets a p95 budget and a regression gate; no denormalization is justified at current volume.

## Blast-radius summary (full: `10_BLAST_RADIUS_AND_DEPENDENCIES.md`)

- **Required change:** `activity/route.ts`, `d1-store.ts` (SELECT lists), `activity-composer.ts` (facts allow-list), `retention-core.ts` (rules), share-route logging call sites, new route-level tests.
- **Probable change:** `activity-helpers.ts` (drop `meta` passthrough), `SharePageComments.tsx` (drop dead `author_email` field on the TS interface).
- **Possible change:** CSP/headers in `next.config.ts` (only if Turnstile is adopted — owner-gated).
- **Verification only:** `loadSharedLinkActivity` (owner action — parity check, no edit), `share/[token]/page.tsx` (recipient banner — verify only).
- **Explicitly unaffected:** D1 schema shape (no new migration required for Phases 1–4, 6–7; Phase 5 retention adds rules in code, not schema), Better Auth, estimate snapshot, collaboration-realtime DO.

## Critical decisions (full: `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`)

- **DEC-01:** Keep one aggregated activity route; tighten the contract (reject splitting into sub-routes).
- **DEC-02:** Replace the deny-list facts filter with an allow-list keyed off the event-write allow-list (`events/route.ts:17`).
- **DEC-03:** Stop selecting `author_email`/recipient `email` in the public read paths; keep them only on the owner action.
- **DEC-04:** Add route-handler-level privacy tests (not just composer tests).
- **DEC-05:** Extend retention to share content tables with owner-signed TTLs (OPEN-RET-01).
- **DEC-06 (owner-gated):** Split the shared secret into four dedicated env vars.
- **DEC-07 (owner-gated):** Front open share links with Cloudflare Turnstile and/or WAF challenge.

## Remaining external decisions

| ID | Decision | Blocks |
|---|---|---|
| OPEN-RET-01 | Retention TTLs for comments/responses/recipients/publications/publication_events | Phase 5 implementation |
| OPEN-SEC-02 | Split the shared secret into four dedicated production env vars | Phase 3 |
| OPEN-SEC-03 | Adopt Cloudflare Turnstile and/or WAF custom rules on share routes | Phase 6 |
| OPEN-SEC-04 | Add server-side session revocation (per-publication `session_generation`) | Phase 7 |
| OPEN-UX-02 | Whether to feature-flag the activity route off for recipients until a UI consumer ships | Phase 1 scope option |

## Remaining implementation blockers

None internal. Phases 1, 2, 4 are unblocked and `IMPLEMENTATION-READY`. Phase 5 is `IMPLEMENTATION-READY` modulo OPEN-RET-01 TTL values (the rule-addition mechanism is internal). Phases 3, 6, 7 are owner-gated.

## Stack-contract summary

Next.js 16 Route Handler, `export const dynamic = "force-dynamic"`, `Cache-Control: no-store`, AES-256-GCM cursor, HMAC-SHA256 token hashing, scrypt password hashing, D1 (SQLite-flavored) app-layer authz, Better Auth for workshop only, Cloudflare free-tier posture (no paid add-ons without owner approval). Full contract: `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md`.

## Performance evaluator summary

`EV-ACT-01` (activity route p95): baseline = current 3-query + display-name lookup; target p95 ≤ 300ms at limit=100, ≤ 500ms at limit=100 with 1000 comments + 50 recipients; fixture = seed publication with 1000 comments + 50 recipients + 50 responses + 200 events; harness = `shared-link-activity-benchmark.test.ts` extended; regression threshold = +20% p95; rollback trigger = p95 > 600ms.

## Test execution matrix summary

12 requirement-to-test rows in `12_TEST_AND_VALIDATION_STRATEGY.md`. Highest-priority new tests: route-level `/activity` GET (pagination, password gate, recipient-scoping, internal filter, over-fetch absence, revoked/expired 404), facts allow-list test, retention-rule test, redactor routing test.

## Shadow-path coverage summary

Shadow-path matrices in `04_REQUIREMENTS_SPECIFICATION.md` cover: activity GET read, comment POST, decision POST, event POST, session start, retention purge. Each names happy / nil / empty / invalid / auth-denied / upstream-error / concurrency / retry-idempotency / user-visible-result / test.

## Database/provider-proof summary

No schema migration required for Phases 1–4, 6–7. Phase 5 retention adds rules in `retention-core.ts` (code, not SQL). Provider proof required before production rollout: D1 readback confirming the over-fetch SELECTs are gone (e.g. `EXPLAIN`/query-log evidence or a repository unit test asserting the returned row shape), and a hosted route probe confirming the public DTO contains no `author_email`/`email`/raw-id fields. Local proof: focused vitest on the repository function returning the narrower row type.

## Initial → final readiness scores

| Category | Initial | Final |
|---|---|---|
| Product strategy | 90 | 95 |
| Scope clarity | 88 | 96 |
| Requirements completeness | 82 | 95 |
| UX and UI readiness | 85 | 93 |
| Accessibility readiness | 84 | 92 |
| Architecture readiness | 88 | 95 |
| Data and database readiness | 80 | 94 |
| API and network readiness | 86 | 95 |
| Security and privacy readiness | 82 | 94 |
| Performance and scalability readiness | 86 | 93 |
| Reliability and operational readiness | 84 | 93 |
| Blast-radius coverage | 88 | 95 |
| Testing and validation readiness | 78 | 94 |
| Rollout and rollback readiness | 85 | 93 |
| Requirements traceability | 80 | 96 |
| Overall implementation readiness | 84 | 94 (capped at 97 by `emulated` verification; status `CONDITIONALLY READY` for owner-gated slices) |

## Review cycles

Two full critique-and-revision cycles after the initial draft (Cycle 1: cross-document consistency + traceability; Cycle 2: adversarial + security/privacy + performance). Residual findings are owner-gated (OPEN-* above) and recorded as such.

## Independent verifier result

`emulated` — no native independent verifier was available in this session. The lead ran a separated adversarial pass (`19_…md` AQ-01..18) and a separated final-verification pass (`17_…md`). Per the suite caps, overall readiness is capped at 97 and package status at `CONDITIONALLY READY` for the high-blast-radius owner-gated slices until an owner or independent reviewer signs off.

## Confirmation

No application code, tests, migrations, configs, or provider state were intentionally modified by this planning pass. All writes are confined to `.ai/03_plans/2026-07-07-public-share-activity-minimization/`.
