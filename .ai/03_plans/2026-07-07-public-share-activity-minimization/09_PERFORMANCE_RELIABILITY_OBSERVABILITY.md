# Performance, Reliability, and Observability

## Performance budgets

| Surface | Baseline | Target | Measurement | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| `GET /activity` p95 (limit=100, fixture) | current 3-query + display-name lookup | ≤ 300ms p95 | `shared-link-activity-benchmark.test.ts` extended | +20% p95 | p95 > 600ms |
| `GET /activity` p95 (1000-comment fixture) | TBD (capture in Phase 0) | ≤ 500ms p95 | same benchmark | +20% | p95 > 800ms |
| D1 query count (activity GET) | 3 parallel + 1 batched = 4 | 4 (no increase) | benchmark/log | +1 query | n/a |
| Recipient comment POST p95 | existing | no regression | existing test | +20% | n/a |

## Performance evaluator contract (EV-ACT-01)

- **Baseline metric:** p95 latency of `GET /api/share/[token]/activity` at `limit=100`.
- **Target metric:** ≤ 300ms p95 at the standard fixture; ≤ 500ms p95 at the 1000-comment fixture.
- **Measurement command/harness:** `bun test tests/vitest/shared-link-activity-benchmark.test.ts` (extended with the fixture + p95 computation over N runs).
- **Dataset/fixture size:** seed publication with 1000 `shared_link_comments` (is_internal mixed) + 50 `shared_link_recipients` + 50 `shared_link_responses` + 200 `shared_link_events`.
- **Number of runs / flake policy:** 20 runs, drop top/bottom 2, report p50/p95; re-run once on flake.
- **Regression threshold:** +20% p95 vs baseline.
- **Related functional tests:** TEST-01 (route correctness), existing `project-publication-activity.test.tsx`.
- **Evidence artifact location:** benchmark output captured in the test report; provider readback in Phase 4.
- **Auth/session setup:** fixture includes a verified recipient session cookie for the decisions/events path; anonymous path measured separately.

**Note:** The minimization changes (Phase 1) are expected to *improve* or hold latency (narrower SELECT). The benchmark's purpose is to prove no regression, not to claim an optimization.

## Rendering behavior

- Activity route is a Route Handler (JSON); no RSC/hydration impact.
- Recipient page does not consume the activity route today; no rendering change.

## Network round trips

- Activity GET: 1 request → 1 response (server fans out to D1 internally).
- No client-side waterfall.

## Payload size

- `PublicActivityViewModel` is small (allow-listed). At `limit=100` with avg ~500 bytes/item → ~50KB response. Bounded by `limit ≤ 100`.

## Query count / complexity

- 4 D1 queries per activity GET (3 parallel + 1 batched lookup). All use indexed `(publication_id, created_at DESC)` or `IN (...)` lookups.
- No N+1 (display names batched).

## Index requirements

- Existing indexes suffice: `idx_shared_link_comments_public_feed` (partial `is_internal=0`), `(publication_id, created_at DESC)` on responses/events, `shared_link_recipients(id)` PK for the IN lookup.
- No new index required for Phases 1-5.
- Phase 7 (`session_generation`): optional low-cardinality index; see `07_…md`.

## Caching

- `no-store` everywhere on share. No cache to invalidate.
- Cursor pagination is stateless (encrypted offset).

## Scalability

- At 10x (10K comments): pagination keeps responses bounded; `limit ≤ 100`. Index handles the scan.
- At 100x (100K comments): same; `created_at DESC, id DESC` index is efficient.
- Retention (Phase 5) bounds the upper growth.

## Memory / CPU hotspots

- Composer `facts` allow-list filter: O(keys) per row, ≤ 8 facts. Negligible.
- Display-name map: ≤ 500 recipients per lookup. Negligible.

## Cold start

- Workers cold start applies to first request; not specific to this plan.

## Reliability / failure modes

| Failure | Detection | Behavior | Recovery |
|---|---|---|---|
| D1 read error (any of 3 queries) | try/catch | 500 uniform (REL-01); no partial body | retry by client; alert on 5xx spike |
| Rate limit D1 write error | caught | fail-open or fail-closed per existing policy (public-repository.ts) | existing |
| Retention cron error | caught in `runRetentionPassInD1` | logged + `data_retention_events` row with error | next run resumes |
| Cursor decrypt error | `parseSharedLinkActivityCursor` | 400 | client requests fresh page |
| Session cookie HMAC mismatch | `verifySharedLinkSessionCookieValue` | treat as anonymous (comments only) | recipient re-sessions |

## Graceful degradation

- Anonymous path (no session) still serves public comments if the session-verify path fails soft.
- A failed display-name lookup degrades to "Client" (existing fallback).

## Observability

- **Structured logs:** `logStructured` calls pass `ipHash` + `errorCode` (correct today). Phase 4 extends redactor coverage to error paths.
- **Metrics:** open_count (bot-gated), rate-limit events, `data_retention_events`.
- **Traces:** Workers Observability (free tier) covers subrequest timing.
- **Dashboards:** Cloudflare Workers Observability + `cf:d1-restore-rehearsal` for recovery. No new dashboard required for Phases 1-5.
- **Alerts:** 5xx spike on share routes; rate-limit exhaustion; retention cron failure (`data_retention_events` with error). Owner to configure thresholds (free-tier limits apply).
- **Audit events:** `project_publication_events`, `shared_link_events`, `publication_digest_log`, `data_retention_events`.

## Rollout / rollback

- Phases 1-2, 4-5 are code-only; deploy via normal OpenNext/Workers deploy. Rollback = revert deploy.
- Phase 5 retention: TTL values are owner-gated; deploy rules only after OPEN-RET-01 sign-off. Rollback = remove the rules (no data loss beyond what the cron already purged; recover from backup if needed).
- Phase 3/6/7: owner-gated; each has its own runbook (`13_…md`).

## Post-release verification

- Route-level privacy tests green in CI.
- Benchmark p95 within budget.
- Provider readback: public DTO contains no `author_email`/`email`/raw-id (curl a staging publication + grep).
- Retention dry-run log shows the new tables covered.
