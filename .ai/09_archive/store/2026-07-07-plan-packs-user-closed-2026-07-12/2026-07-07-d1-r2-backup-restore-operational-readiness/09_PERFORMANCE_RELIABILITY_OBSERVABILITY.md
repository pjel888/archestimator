# 09 — Performance, Reliability, and Observability

## Applicability

These are **operator-run CLI drills**, not user-facing hot paths. Performance
matters in two dimensions only: (1) **drill duration / RTO** (how long a
recovery takes) and (2) **free-tier quota consumption** (the drill must not
degrade the app by burning shared quota, especially D1 rows-read/day). There is
no Core Web Vitals, no client bundle, no render-count dimension.

## RTO/RPO targets (REQ-PERF-01)

Cloudflare publishes **no contractual RTO/RPO** for D1 or R2. The targets below
are **derived** from the free-tier feature set, not guaranteed.

| Surface | RPO target | Derivation / bound | RTO target | Proof |
|---|---|---|---|---|
| D1 (data) | **≤ 7 days** (free Time Travel) | Workers Free Time Travel retention = 7 days ([D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)); restore rate limit **10 restores / 10 min / database** — wait ≥10 min between consecutive restores | drill-measured; **target < 30 min** at current volume for export+reimport | OPEN-01 provider-backed drill measures actual; local rehearsal proves mechanism only |
| D1 (data, if OPEN-02) | **≤ 1 day** | daily `wrangler d1 export` to R2 extends recovery beyond the 7-day Time Travel window | same | OPEN-02 owner decision |
| R2 (infra failure) | **≈ 0** | 11-nines durability via replication + erasure coding (design target, not SLA) ([durability](https://developers.cloudflare.com/r2/reference/durability/)) | n/a (no restore needed for infra failure) | durability is a Cloudflare-side property |
| R2 (user error: delete/overwrite) | **undefined** | **No native versioning**; once overwritten/deleted, unrecoverable without an app-owned copy | single-object get→put, drill-measured (seconds–minutes) | REQ-R2-03 sampled-object drill; OPEN-03 for bulk strategy |

**Important**: none of these is a contractual SLA. The "RTO < 30 min" is a
planning target the drill must measure, not a claim.

## Performance evaluator contract (for the future implementation)

Because the drill duration *is* the RTO evidence, the future D1 provider-backed
rehearsal must be a **declared evaluator**:

| Field | Value |
|---|---|
| Baseline metric | local SQLite rehearsal duration (mechanism lower bound) |
| Target metric | export + reimport wall-clock at current prod-equivalent volume < 30 min |
| Measurement command | `time bun run cf:d1-restore-rehearsal` (local) + `time wrangler d1 export … && wrangler d1 execute …` (provider, OPEN-01) |
| Fixture size | sanitized prod-equivalent subset (Phase 1 expands the 5-table fixture) |
| Runs / flake policy | 3 consecutive runs, report median + max; wrangler network variance is real |
| Regression threshold | > 2× the baseline median flags investigation; > 30 min flags RTO breach |
| Related functional tests | the rehearsal's row/checksum/FK gates |
| Evidence artifact | `evidence/YYYY-MM-DDTHHMMSSZ-d1-restore-duration.json` (duration_ms, rows, bytes, target id redacted) |

For R2, the evaluator is trivially the single-object get→put duration (seconds
to minutes); no regression threshold needed beyond "completed + sha256 match".

## Free-tier quota budget (drill must stay within)

| Quota | Free limit | Drill consumption (estimate) | Headroom |
|---|---|---|---|
| D1 rows read / day | 5M | full export of pre-launch DB ≪ 5M (small dataset) | ample at launch; **OPEN-02 risk as data grows** |
| D1 rows written / day | 100k | reimport into isolated DB ≈ row count of DB | ample at launch; monitor |
| D1 storage / DB | 500 MB | n/a (drill uses existing data) | n/a |
| R2 Class A ops / month (writes/lists) | 1M | inventory list (paginated) + 1 put per drill | ample |
| R2 Class B ops / month (reads) | 10M | 1 get per drill + list reads | ample |
| R2 storage | 10 GB-month | re-put 1 object into preview (cleaned up) | negligible |
| R2 egress | $0 always | none (drill downloads 1 object locally) | n/a |
| Cron triggers / Worker | 3 (all used) | n/a unless OPEN-02 adds a backup cron | OPEN-02 must free a slot or use a new Worker |

Full cost model in `20_COST_MODEL_AND_PRICING_INPUTS.md`.

## Reliability / failure modes (drill-side)

| Failure mode | Behavior | Recovery |
|---|---|---|
| `wrangler d1 export` network timeout | partial/empty dump | re-run export (idempotent read); reuse `wrangler-undici-timeout.mjs` |
| `wrangler d1 execute --file` partial import | target DB partially populated | **drop the isolated target and re-import into a fresh one** (never resume) |
| `time-travel restore` interrupted | unknown DB state | **runbook-only**; capture a bookmark before restore so it can be reversed; export-first |
| R2 `object get` 404 | sampled key missing (dangling) | report as dangling; sample another |
| R2 `object put` checksum mismatch | upload corrupted | retry put; verify sha256 before declaring success |
| Inventory pagination hang | REST/S3 cursor stuck | cap iterations + timeout; report partial |
| Quota exceeded mid-drill | throttle/errors | abort + report; do not retry destructively |
| Wrong target id passed (security) | assertion aborts | operator re-runs with correct isolated id |

## Observability

- **Tool stdout + JSON/MD artifacts** are the primary evidence (mirrors the
  existing rehearsal shape). Each report carries `generatedAt`, `mode`,
  `sources`, gates, `blockers`, and a self-describing `note`.
- **`wrangler.jsonc` already enables Workers Observability** (logs + traces,
  head-sampled at 0.1/0.05). This is useful if a Worker-based inventory variant
  is later added; the CLI-first default does not need it.
- **No new metrics/alerts** are introduced by this plan. If a future phase adds
  an automated backup cron (OPEN-02), that phase must add: a backup-success
  metric, a failure alert, and a runbook entry. Out of scope here.
- **Evidence retention**: drill artifacts live under
  `.ai/03_plans/<pack>/evidence/` (or a sibling ops evidence folder) and are
  committed (redacted) for auditability.

## Degraded modes

- **If the provider-backed drill is not approved (OPEN-01 open)**: fall back to
  the local SQLite rehearsal as the always-available mechanism proof; hosted
  readiness stays `CONDITIONALLY READY`. This is the current state.
- **If R2 inventory is too expensive at scale**: switch from a full list to a
  prefix-sampled inventory (sample N `projects/{id}/…` prefixes) and report
  coverage as a sample, not a census. Recorded as a future option.

## Rollback triggers (for the drill itself)

- Any drill that cannot verify its gates (row/checksum/FK/sha256) → **abort +
  report + do not return the target to service**.
- Any drill that hits the production id assertion → **hard abort**.
- Any drill that exceeds 2× expected duration → **investigate before
  continuing** (possible quota throttle or partial failure).
