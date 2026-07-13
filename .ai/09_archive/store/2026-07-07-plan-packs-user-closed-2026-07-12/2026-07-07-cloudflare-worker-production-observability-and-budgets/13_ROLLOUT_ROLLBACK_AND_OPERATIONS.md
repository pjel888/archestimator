# 13 — Rollout, Rollback, and Operations

## 13.1 Rollout rings

| Ring | Audience | Gate | Rollback trigger (detection mode) |
|---|---|---|---|
| Ring 0 | local dev | type-check + unit + integration green | n/a |
| Ring 1 | `wrangler dev` / preview | manual curl: header on 200/308/500; `wrangler tail` shows lifecycle events | n/a |
| Ring 2 | production deploy (`archestimator-proof`) | deploy dry-run valid; AE binding live | error rate > 0.5% by route; any `exceededCpu` on non-cron; D1 rows-written/day > 70% ceiling — **MANUAL detection** (see §13.5) |
| Ring 3 | closed-beta confidence | 24h clean on production | same — **MANUAL detection** |

> **Honesty note (P1-8):** on the **Free** tier, Cloudflare's native Worker
> error-rate / `exceededCpu` alerting is weak/Enterprise-only (RISK-15, §13.5).
> The triggers above are **manual rollback criteria**: an operator must notice
> them in the dashboard or via a self-poll GraphQL cron (OPEN-03, a separate
> follow-up task) within the 24h Ring-3 window. **No gate is automated on Free.**
> Do not treat these as auto-rollback. The realistic free-tier safety net is
> (a) `bun run cf:release-gates` / `cf:check-readiness` pre-deploy, (b) manual
> dashboard watch post-deploy, (c) the self-poll alert worker once OPEN-03 lands.

The change is **non-user-facing** (additive header + logging + budgets), so the
blast radius of rollout is low. The main risk is the AE binding + sampling
config; both revert trivially.

## 13.2 Feature flags / config toggles

| Flag | Default | Effect | Where |
|---|---|---|---|
| `ARCH_OBSERVABILITY_SERVER_TIMING` | off (0) | gates `Server-Timing` header | env var |
| `PERF_TRACE` | off | existing dev perf trace (unchanged) | env var |
| `ARCHHESTIMATOR_DEV_LOG_PATH` | unset | dev ndjson path (unchanged) | env var |
| `ARCHHESTIMATOR_DEV_LOG_DISABLED` | unset | disable dev log (unchanged) | env var |
| `wrangler.observability.logs.head_sampling_rate` | 1.0 (pre-launch) | log sampling | `wrangler.jsonc` |
| `wrangler.observability.traces.enabled` | false | traces off (quota) | `wrangler.jsonc` |

No new runtime feature flag for request-id (always on — it's free and safe).

## 13.3 Rollback procedures

| Change | Rollback step | Data impact |
|---|---|---|
| `worker.ts` wrap | `git revert` the phase commit | none |
| `wrangler.jsonc` sampling | edit back to 0.1 + traces on | none |
| AE binding | remove from `wrangler.jsonc` + `bun run cf:typegen`; `metrics.ts` swallows absence | lose KPI stream (graceful) |
| retention budget | set `maxDurationMs`/`maxRowsDeletedPerTick` very high | resumes unbounded (the old behavior) |
| DO cap | raise `MAX_BROADCAST_TARGETS` or revert | none |

All rollbacks are config/code revert; **no migration to reverse** (no schema
change). Fix-forward is equally viable for any logic bug.

## 13.4 Observability runbook (DOC-01)

### Find a request by id
1. Get the `x-request-id` from the client error toast (the app-level correlation
   id generated at the Worker edge — this is the **primary** lookup key per
   DEC-01). Do **not** use `cf-ray` for app-log lookup: `cf-ray` is a Cloudflare
   invocation-log field only and is **not** present in the app's structured
   `route_*`/`action_*`/`worker.*` log lines, so a `cf-ray` query returns nothing
   for app logs and misleads (P1-3).
2. Cloudflare dashboard → Workers & Pages → `archestimator-proof` → Observability
   → Query Builder.
3. Query the **app structured logs** by the request id:
   ```sql
   SELECT timestamp, event, request_id, error.code, error.status_code, message
   FROM workersLogs
   WHERE request_id = '<the-x-request-id>'
      OR event LIKE '%<the-x-request-id>%'
   ORDER BY timestamp DESC LIMIT 100
   ```
4. To correlate with the raw Cloudflare invocation row (outcome, CPU, duration)
   for the same request, **separately** query invocation logs by `cf-ray` (the
   response also carries `cf-ray` as a response header set by Cloudflare). This
   is the only valid use of `cf-ray` — it does not join to app logs.
5. If not found in app logs: sampling dropped it. For pre-launch (1.0 sampling)
   this is rare; raise the rate if needed (and confirm the top-level
   `observability.head_sampling_rate` is actually 1.0 — see T-7.1).

### Read an error log line
- JSON fields: `timestamp`, `level`, `event`, `message`, `action?`, `request_id`,
  `error.{name,class,kind,code,message,status_code,stack?,cause?}`, `context?`,
  `tainted_fields?`.
- `tainted_fields` lists paths that were redacted (sensitive data was present
  and stripped — investigate the *source*, not the log).
- `error.kind`/`code` map to the `AppError` hierarchy (`08_…`).

### Budget thresholds and triggers (from `09_…`)
- D1 rows-written/day > 70k (of 100k): investigate; lower retention batch; check
  for runaway writes.
- Workers Logs events/day > 140k (of 200k shared): lower sampling.
- AE points/day > 70k: sample KPIs.
- Any `exceededCpu` on a non-cron route: that route needs optimization
  (proposal export, AI).
- Cron `durationMs` > 600s: retention/queue batch too large.

### Escalation
- Owner: Philip.
- Provider boundary: only `wrangler.jsonc`-bound resources.
- Paid add-on: **requires explicit owner approval** (none enabled by this plan).

## 13.5 Dashboard/alert query definitions (OBS-03)

### Query Builder (SQL-like) — copy-paste
- **Error rate by route:**
  ```sql
  SELECT scriptName, status, count(*) AS errs
  FROM workersLogs
  WHERE outcome IN ('exception','exceededCpu','exceededMemory')
    AND timestamp > NOW() - INTERVAL '1' DAY
  GROUP BY scriptName, status
  ORDER BY errs DESC
  ```
- **Find by cf-ray:**
  ```sql
  SELECT * FROM workersLogs WHERE "cf-ray" = '<id>'
  ```
- **App error events (our structured logs):**
  ```sql
  SELECT timestamp, event, request_id, error.code, error.status_code
  FROM workersLogs
  WHERE event LIKE 'route_%' OR event LIKE 'action_%' OR event LIKE 'worker.%'
  ORDER BY timestamp DESC LIMIT 100
  ```

### GraphQL Analytics (account-level, free)
- **p95 duration + outcome counts** via `workersInvocationsAdaptive`:
  filter `scriptName`, `datetime`; dimensions `outcome`, `status`; group by hour.
- **D1 rows-written/day** via D1 analytics dataset.
- **Queue DLQ depth** via Queues dashboard (consumer log `dlq` count).

### Free-tier alerting (honest)
- Cloudflare native Worker error-rate alerting is **limited/Enterprise** for the
  rich cases. Realistic free path: **self-poll the GraphQL API from a free
  external cron** (GitHub Actions scheduled workflow, UptimeRobot, or a second
  Worker) and alert (email/webhook) when `exceededCpu`/`exception` counts cross
  a threshold. This is a **separate task**, not blocking this plan.

## 13.6 Rollout performance gates (recap from `09_…`)

| Gate | Metric | Source | Pass | Fail action | Detection |
|---|---|---|---|---|---|
| Merge | type/lint/test green | local (`type-check`+`test:dom`) | green | fix | **automated** (CI/local) |
| Closed-beta | error rate < 0.5%/route | Workers Logs | below | hold | **manual** (dashboard) |
| Prod | 0 `exceededCpu` non-cron/24h | Workers Logs | 0 | fix-forward | **manual** (dashboard/self-poll) |
| Prod | D1 rows-written < 70% ceiling | D1 analytics | below | reduce writes | **manual** (dashboard) |
| Prod | AE points < 70% ceiling | AE analytics | below | sample | **manual** (dashboard) |
| Prod | sampling actually 1.0 (T-7.1) | resolved wrangler config | one effective rate | fix config | **manual** (deploy-dry-run grep) |

## 13.7 Post-release verification (hosted, manual)

- Confirm `x-request-id` on a production request (curl).
- Confirm an induced error logs with the id (staging only).
- Confirm `cron.start`/`complete` and `queue.batch.*` appear in Workers Logs.
- Confirm AE points appear in the Analytics Engine dataset.
- Confirm retention `budget_reached` does NOT fire under normal load (only under backlog).

These are **hosted proof**, not claimed from local checks.
