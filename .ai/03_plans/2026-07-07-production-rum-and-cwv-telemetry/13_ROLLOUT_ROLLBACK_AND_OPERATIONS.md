# 13 — Rollout, Rollback, Operations — Production RUM And CWV Telemetry

## Rollout rings

1. **Off (default).** `NEXT_PUBLIC_RUM_SAMPLE_RATE=0`. No beacons. Safe to ship
   the code with sampling off.
2. **Landing/public on.** Set `NEXT_PUBLIC_RUM_SAMPLE_RATE=0.1` (10%) +
   `NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN=<token>`. Landing slice live.
3. **Workshop on (gated).** Set `NEXT_PUBLIC_RUM_WORKSHOP_ENABLED=true` **only
   after** `OPEN-CONSENT-01` resolves. Until then the flag stays false and
   workshop sends are route-gated off.

## Feature flags / env

- `NEXT_PUBLIC_RUM_SAMPLE_RATE` (0.0–1.0, default `0` until rollout).
- `NEXT_PUBLIC_RUM_WORKSHOP_ENABLED` (default `false`; gated by `OPEN-CONSENT-01`).
- `NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN` (existing; landing managed beacon).
- `RUM_MAX_WRITES_PER_MIN` (server-side admission cap; default e.g. 6000/min global-isolate).

## Deployment sequencing

1. Add `web-vitals` dep; build.
2. Add `RUM` binding to `wrangler.jsonc`; `cf:typegen`; `cf:deploy`.
3. Run migration `0039_rum_rollup.sql` against `ARCH_DB` (`cf:d1-migrate` or the
   repo's migration apply path — verify current command).
4. Deploy with sampling `0` first (code live, no data).
5. Flip landing sampling to `0.1` + Web Analytics token.
6. Provider proof (`OPEN-EVID-01`).
7. (Later) workshop enablement after consent decision.

## Rollout performance gates (release-blocking)

| Metric | Baseline | Target | Observability source | Gate blocks | Threshold | Rollback trigger |
|---|---|---|---|---|---|---|
| Per-route first-load JS | current | ≤ +3KB | `check-performance-budgets.mjs` | merge | any route >budget by >3KB | dynamic-import or revert |
| bfcache restore | current green | green | `test:e2e:perf` | merge | red | revert unload-style listener (should not exist) |
| Beacon delivery | n/a | payloads arrive | AE SQL API + CF Web Analytics dashboard | beta rollout | 0 writes while traffic>0 | check binding/route/CSP |
| AE daily writes | n/a | <100K/day | AE billing/usage | production | approaching 100K | lower sample rate |
| CWV p75 (LCP) | n/a (accruing) | ≤4000ms Poor-band gate | AE p75 query / rollup | release (after window) | route p75 Poor | performance fix; not a telemetry rollback |
| CWV p75 (INP) | n/a | ≤500ms | AE p75 query | release | Poor | fix |
| CWV p75 (CLS) | n/a | ≤0.25 | AE p75 query | release | Poor | fix |

Note: the CWV p75 gates are *content* gates (they reflect app performance), not
telemetry-system gates. A Poor CWV is a reason to fix the app, not to roll back
the telemetry. The telemetry-system gates are the first four rows.

## Rollback procedures

- **Telemetry off (any concern):** set `NEXT_PUBLIC_RUM_SAMPLE_RATE=0` (and
  workshop flag false). Beacons stop immediately; app unaffected.
- **Route misbehaving:** delete `src/app/api/internal/rum/route.ts` + redeploy.
- **Sink concern:** remove `RUM` binding from `wrangler.jsonc` + redeploy; route
  goes log-only then 204.
- **Rollup concern:** `DROP TABLE rum_rollup` (cron errors are non-fatal).
- **Full remove:** unmount `RumReporter`, remove dep, remove binding, drop table,
  remove route, revert CSP/privacy-notice. None affects user data.

## Data repair

- No user data to repair. Corrupted aggregates can be dropped and re-accrued
  (AE is append-only time-series; D1 rollup can be `DELETE`d and recomputed by
  the next cron run).

## Observability for the system

- Route logs aggregate counters (`rum_event` count, rate-limit hits, schema drops).
- Cron logs rollup row count + deletes.
- Daily budget alarm query (SINK-04).
- CF Web Analytics + AE dashboards.

## Support / incident response

- "My page is slow" → check the route's p75 in the dashboard, not a user trace
  (we have no per-user data by design).
- "Privacy concern/complaint" → runbook DSAR answer: no personal data held in
  RUM sinks; the notice discloses aggregate cookieless telemetry.
- "Dashboard empty" → check sample rate, binding, route, CSP, AE usage.

## Post-release verification

- After 7 days of landing data: confirm p75 queries return sane values; confirm
  Web Analytics Vitals Explorer shows LCP/INP/CLS; confirm budget alarm query runs.
- After workshop enablement: repeat for workshop route buckets.

## Backward compatibility

All additive. No existing route/contract/data changes.

## Cron schedule note

The repo has existing crons (`0 3 * * *`, `15 3 * * *`, and a third per
`wrangler.jsonc`). The rollup cron either reuses an existing slot (branch in
`scheduled()`) or adds a new entry. Verify the max-crons limit for the plan tier
before adding a new one; if at the limit, branch in `scheduled()`.
