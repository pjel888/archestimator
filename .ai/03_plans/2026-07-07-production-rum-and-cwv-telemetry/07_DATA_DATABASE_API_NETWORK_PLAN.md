# 07 — Data, Database, API, Network Plan — Production RUM And CWV Telemetry

## Data ownership

- **Beacon payload** (transient, client→server): allowlisted JSON (PRIV-02).
  Owned by `rum-client`. Never persisted raw.
- **Analytics Engine data points** (primary store, ~90-day): owned by the `RUM`
  binding. Aggregate-only; no PII.
- **D1 `rum_rollup` rows** (secondary, long-window): owned by the cron. Aggregate
  p75/poor-share counts; no PII.

## Database change blueprint — D1 rollup (Phase 6)

- **Migration filename:** `migrations/0039_rum_rollup.sql` (next after `0038_component_draft_resource_limits.sql`).
- **Tables/columns/indexes:**
  ```sql
  -- migrations/0039_rum_rollup.sql
  CREATE TABLE IF NOT EXISTS rum_rollup (
    day          TEXT NOT NULL,        -- ISO date (UTC) the rollup was computed for
    metric       TEXT NOT NULL,        -- LCP | INP | CLS | TTFB | FCP
    route_bucket TEXT NOT NULL,        -- normalized route bucket (e.g. /workshop/projects/:id/estimates)
    window       TEXT NOT NULL,        -- 7d | 28d
    p75          REAL NOT NULL,        -- 75th percentile value (ms for LCP/INP/TTFB/FCP; unitless for CLS)
    sample_count INTEGER NOT NULL,     -- number of samples in the window
    poor_share   REAL NOT NULL,        -- share in Poor band, 0.0–1.0
    computed_at  TEXT NOT NULL         -- ISO timestamp
  );
  CREATE INDEX IF NOT EXISTS idx_rum_rollup_metric_route_window
    ON rum_rollup(metric, route_bucket, window, day DESC);
  ```
- **App-authorization:** the `rum_rollup` table is **service/cron-only**. It is
  not part of any user-facing repository or app-authz path. The cron handler
  writes it with elevated service access (the scheduled handler runs with full
  Worker env). No app-authz function needs to cover it because no user route
  reads it in v1 (the optional internal admin view is DASH-03, deferred).
  If DASH-03 is later implemented, its read path MUST go through a service
  read + an explicit "internal-operator-only" gate, not a user authz function.
- **Repository/query helpers:** none for v1 user paths. The cron uses a direct
  D1 `prepare().bind().run()` upsert (model on existing cron patterns; verify
  the current pattern in `worker.ts` `scheduled()` and sibling cron handlers
  before implementing).
- **Backfill:** none. Rollups start accruing from the first day AE has data.
- **Data-volume assumptions:** rows = (metrics × routeBuckets × windows × days).
  At ~5 metrics × ~20 route buckets × 2 windows × 365 days ≈ 73K rows/year —
  trivially within D1 free-tier (5GB storage, 500MB/DB). Writes: ~73K/year ÷
  365 ≈ 200 rows/day, far under the 100K writes/day ceiling.
- **Concurrency/locks:** single cron instance (Cloudflare guarantees at-most-once
  per invocation for `scheduled()`); idempotent upsert by PK.
- **Expected query count:** 1 read (AE SQL API, off-D1) + ~200 writes/day (D1).
- **Cardinality:** bounded by route-bucket allowlist (~20). At 10x/100x/1000x
  traffic, row count grows only with days, not with users. ✓.
- **Pagination/scan risk:** the release-gate query is
  `SELECT p75 FROM rum_rollup WHERE metric=? AND route_bucket=? AND window='7d' ORDER BY day DESC LIMIT 1` — index-covered, O(1). No scan risk.
- **Generated type impact:** adding the `RUM` Analytics Engine binding requires
  `bun run cf:typegen` to refresh `cloudflare-env.d.ts` Worker Env types. Adding
  the `rum_rollup` table does not require generated D1 types (this repo's
  repository pattern uses hand-written row models; verify before implementing —
  see `src/lib/types/database.ts`).
- **Rollback/fix-forward:** `DROP TABLE IF EXISTS rum_rollup;` is the clean
  rollback. Removing the `RUM` binding from `wrangler.jsonc` + redeploy is the
  fix-forward for the AE path. Neither affects user data.
- **Local proof:** migration SQL review; `cf:typegen`; the cron handler unit test
  with a mocked D1.
- **Linked-provider proof:** AE receiving data + D1 rollup rows present = provider
  proof required at implementation time (`OPEN-EVID-01`).

## API / network plan

### `POST /api/internal/rum`

- **Route file:** `src/app/api/internal/rum/route.ts`.
- **Visibility:** public (no auth) — CWV must work on landing without a session.
- **Same-origin + Fetch-metadata gate:** model on
  `src/app/api/internal/client-error/route.ts`. Reject if `Origin`/`Sec-Fetch-Site`
  not same-origin (return 403 or 204 silent — prefer 204 to avoid leaking the
  gate to attackers, matching client-error's posture).
- **Rate limit:** in-memory, per `cf-connecting-ip` (header), e.g. 30/min. The
  IP is the key only; never logged/persisted. Over-limit → 204 + no write.
- **Body cap:** 8192 bytes. Oversized → 204 + no write (silent).
- **Schema validation:** JSON must match the allowlist (PRIV-02). Unknown keys →
  drop the beacon (204). Malformed JSON → drop.
- **Response:** always 204 No Content (silent success/failure) to avoid leaking
  state and to keep the beacon cheap. Never echo input.
- **Idempotency:** best-effort; beacons are not deduped (the per-page-load `id`
  nonce could be used for future dedupe but is not required for v1).
- **Timeouts/retries:** none server-side. Client uses `keepalive`, no retry (a
  lost beacon is acceptable).
- **CSP:** covered by `connect-src 'self'`; add `/api/internal/rum` explicitly
  to both Report-Only `connect-src` lists in `next.config.ts` for clarity
  (Phase 5; coordinate with the nonce-CSP pack).
- **No cookies, no session read, no auth import** (SEC-04).

### Workers Analytics Engine write

- `env.RUM.writeDataPoint({ indexes: [routeBucket], blobs: [routeBucket, name, rating, navigationType], doubles: [value, sampleRate, clientTs] })`.
- Free-tier: 100K writes/day, 10K reads/day, ≤250 data points per call (1 here).
- One `writeDataPoint` call per admitted beacon.

### Cron → D1 rollup

- Daily (extend the existing `triggers.crons` or branch in `scheduled()`).
- Query AE SQL API for p75 per (metric×route) for 7d/28d; upsert into
  `rum_rollup`; delete rows older than N days (retention).

## Network behavior

- Beacon: 1 small POST per metric per sampled page load, plus a final flush.
  `keepalive` ensures delivery across navigation. No retries. No long polling.
- Managed beacon (landing): the existing Cloudflare Web Analytics beacon; no
  change to its network behavior.

## Access-path matrix

| Source | Chosen path | Runtime role | Authorization check | Schema/policy posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| Beacon (browser) | `POST /api/internal/rum` | public | same-origin + Fetch-metadata + rate-limit (no user auth) | allowlist schema; ≤8KB | route unit test + E2E (TEST-03) | silent drop |
| Route → AE | `env.RUM.writeDataPoint` | Worker | binding-level (Worker only) | aggregate-only; no PII | AE provider proof (OPEN-EVID-01) | log + 204 |
| Cron → AE SQL → D1 | `scheduled()` + D1 | service/cron | elevated (cron context) | rollup table; service-only | cron unit test + D1 readback | retry next day |
| Operator → dashboards | AE SQL API + CF Web Analytics + D1 query | operator (Cloudflare dashboard / SQL API auth) | operator account | read-only aggregate | runbook queries | n/a |

## Retention / deletion

- AE: ~90-day (operator confirms exact — `ASSUMP-04`).
- D1 `rum_rollup`: N-day configurable (default 365); the retention cron deletes
  older rows. Supports a DSAR/erasure request trivially because there is no
  personal data to erase (aggregate only) — but the runbook documents the
  "no personal data held" answer for privacy requests.

## Rollback / recovery

- Drop `rum_rollup`, remove `RUM` binding, remove the route file, remove the
  provider mount, remove `web-vitals` dep. None of these affects user data or
  app behavior beyond losing telemetry signal.
