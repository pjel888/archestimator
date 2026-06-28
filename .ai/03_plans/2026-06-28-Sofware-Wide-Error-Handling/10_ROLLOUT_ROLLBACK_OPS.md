# 10 — Rollout, Rollback, and Operations

Feature flag strategy, rollout rings, runbook, monitoring thresholds, support implications.

## A. Feature flag strategy

The plan ships behind two env-var flags so any phase can be reverted without a code rollback:

| Flag | Default | Purpose | Phase introduced |
|---|---|---|---|
| `ERROR_HANDLING_ENABLED` | `true` (dev) / `false` (prod initially) | Master switch. When `false`, all wrappers become pass-through (throw as before). | P1 |
| `SENTRY_ENABLED` | `false` | When `false`, `sentry.*.config.ts` `init()` is a no-op. | P5 |
| `DEV_LOG_FILE` | `./logs/dev.ndjson` | Override dev log path. | P1 |

Implementation:
```ts
// src/lib/observability/with-action-errors.ts
export function withActionErrors<T, Args extends unknown[]>(fn: (...) => Promise<T>) {
  return async (...args: Args): Promise<ActionResult<T>> => {
    if (process.env.ERROR_HANDLING_ENABLED === 'false') {
      // Pass-through: legacy behavior
      const data = await fn(...args);
      return { ok: true, data };
    }
    try {
      const data = await fn(...args);
      return { ok: true, data };
    } catch (err) { /* ... */ }
  };
}
```

## B. Rollout rings

Pre-launch MVP. No external users. Rings collapse to:

| Ring | Audience | Trigger | Duration before next ring |
|---|---|---|---|
| Ring 0 | Local dev (`bun run dev`) | P1 ship | n/a |
| Ring 1 | CI / Playwright | P2 ship | n/a |
| Ring 2 | Vercel preview deploys | P3 ship | each preview |
| Ring 3 | Vercel production (`main`) | P5 ship + owner sign-off | continuous |

No percentage rollout needed (single-tenant MVP). After first paying user, introduce ring 4 (10% of users via Vercel Preview Banner or similar) before full rollout.

## C. Rollback procedures

### C.1 Per-phase rollback

| Phase | Rollback action | Impact |
|---|---|---|
| P1 | `git revert` P1 commits; delete `src/lib/observability/` | No behavior change was made; revert is clean |
| P2 | `git revert` P2 commits OR set `ERROR_HANDLING_ENABLED=false` in env | Wrappers become pass-through; legacy throw behavior restored |
| P3 | Delete `global-error.tsx`, `error.tsx`, `not-found.tsx`, `/api/internal/client-error`; revert toast.appError addition | Next.js default error page returns for root errors; per-route error.tsx files still work as before |
| P4 | Delete `scripts/tail-dev-logs.mjs`; revert logger wiring (becomes no-op) | Dev logs stop being written; no runtime impact |
| P5 | Set `SENTRY_ENABLED=false`; Sentry init becomes no-op | Sentry dashboard stops receiving events; logger still writes dev NDJSON |

### C.2 Full rollback

Set both flags false:
```
ERROR_HANDLING_ENABLED=false
SENTRY_ENABLED=false
```

App reverts to current behavior. Then revert code at leisure.

### C.3 Data rollback

The plan does not touch:
- Database schema
- Migrations
- RLS policies
- Generated types
- Vercel config

Therefore no data rollback is needed. `./logs/dev.ndjson` can be deleted at any time; it's purely a dev artifact.

## D. Monitoring thresholds

### D.1 Sentry alert thresholds (P5)

| Condition | Threshold | Action |
|---|---|---|
| New error type | any new issue | Email + Slack `#archestimator-alerts` |
| Error rate spike | >10× baseline in 5 min | Slack alert |
| p95 latency | >2s on any route | Slack alert |
| Volume | >1,000 errors/hour | Page on-call (pre-launch: Philip) |

Sentry dashboard: filter by `environment=production`, `release=<latest>`.

### D.2 Health endpoint

`src/app/api/health/route.ts` already returns `{ok:true}`. Plan extends it in P5 (out of scope for this plan but documented as follow-up) to:
- Check Sentry connectivity
- Check log file writability
- Return degraded status if any check fails

### D.3 Vercel Log Drain (deferred)

After first paying user:
- Forward `stdout` to Axiom (free 500GB/mo)
- Set alert: error rate >1% of requests for 5 min → Slack

## E. Runbook (for incidents)

### E.1 "Sentry shows a spike in DatabaseError"

1. Open Sentry dashboard → filter by `error.kind=database`.
2. Note the top `error.code` (e.g. `DATABASE_RLS_DENIED`).
3. Open Postgres logs in Supabase dashboard → match the timestamp window.
4. For each event, use `context.user_id_hashed` to look up the user (hash their UUID offline and compare).
5. Check the failing query (visible in Sentry extra or Supabase logs).
6. If RLS issue: fix the policy in a new migration. If query bug: fix the action/repository code.

### E.2 "Users report toast 'Something went wrong' but no Sentry event"

Likely a client-only error (unhandledrejection or boundary catch).
1. Check `/api/internal/client-error` logs (filter by `level=WARN` in `./logs/dev.ndjson`).
2. If prod: query Sentry for `level=info` events (unhandledrejection may not trigger `onRequestError`).
3. Ask user for the URL + timestamp; correlate via hashed user ID.

### E.3 "Dev log file is huge (>50MB)"

Logger auto-rotates at 50MB to `dev.ndjson.1`. If that's also full, manually delete:
```bash
rm ./logs/dev.ndjson.1
```
And restart `bun run dev`. The current `dev.ndjson` will be truncated on restart.

### E.4 "AI agent cannot diagnose from logs"

Verify the AI agent has:
1. Read access to `./logs/dev.ndjson`.
2. Run `bun run logs:tail --explain <id>` for full context.
3. Cross-referenced the file:line in `error.stack[0]`.
4. Read `src/lib/observability/app-error.ts` to understand the error class.

If still stuck, paste the full log record into the agent's context with the prompt:
> "Read this NDJSON log record. Identify the error class, the route/server-action where it originated, the user-action that triggered it, and propose the smallest fix."

## F. Support implications

- **Toast copy is user-safe.** No DB internals reach the user. Support team can paste toast copy directly into a bug report; it will not leak.
- **`trace_id` is shareable.** Users can include `trace_id` in support tickets; it correlates to a Sentry event and a dev log line.
- **No PII in logs.** AI agents reading dev logs will not see user emails/IDs; they see 16-char hashes.

## G. Operational checklist (pre-launch)

- [ ] `SENTRY_DSN` set in Vercel env (production)
- [ ] `SENTRY_AUTH_TOKEN` set in GitHub Actions secret (for sourcemap upload)
- [ ] `ERROR_HANDLING_ENABLED=true` in Vercel env (production)
- [ ] `SENTRY_ENABLED=true` in Vercel env (production)
- [ ] First test error submitted to Sentry; dashboard confirms receipt
- [ ] Source map upload step green in CI
- [ ] Bundle size delta verified <60KB
- [ ] Playwright `global-error.spec.ts` green on preview deploy
- [ ] Manual AI-diagnosability proof logged in `13_FINAL_AUDIT_SCORECARD.md`

## H. Ponytail counterweight

The operational design uses what's free:
- Sentry free tier (5k errors/mo)
- Vercel built-ins (preview deploys, log drain to Axiom)
- Local filesystem for dev logs (no extra infra)

Deferred:
- Upstash Redis rate limiter (use in-memory until scale)
- Axiom/Better Stack (after first paying user)
- Datadog / full OTel (after $20k MRR)
- PagerDuty / on-call rotation (founder-only at MVP)
