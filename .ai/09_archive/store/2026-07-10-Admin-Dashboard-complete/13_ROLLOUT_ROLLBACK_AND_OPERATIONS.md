# 13 — Rollout, Rollback, and Operations

## 13.1 Feature flag gating

- `admin_dashboard_enabled` (DATA-FLAGS-01) is the master switch. Off by
  default. `/admin` routes 404/redirect until on. Sub-features:
  `admin_support_realtime`, `admin_analytics_server_pulls`.
- Env-level fallback `ADMIN_DASHBOARD_ENABLED` for early dev.

## 13.2 Rollout rings

1. **Local/dev** — flag on locally; full flows exercised by tests.
2. **Deployed preview** — flag off; migrations applied to preview D1; smoke.
3. **Production (Philip only)** — flag on; Philip dogfoods; monitor overview
   tiles + inbox + audit.
4. **No broader rollout** — single operator; there is no "all users" rollout
   for an admin surface.

## 13.3 Rollback

| Failure | Rollback step |
|---|---|
| Admin route misbehaves | set `admin_dashboard_enabled=0` (UI or D1) → routes hidden |
| Support inbox bug | set `admin_support_realtime=0`; inbox read-only or hidden |
| Migration issue | apply reverse SQL (blueprints 7.2); data retained; safe to re-apply |
| DO issue | remove WS route from `worker.ts`; presence falls back to last-known/poll |
| `recharts` bundle blowup | gate charts behind `next/dynamic` already; if still heavy, drop to link-out |
| Provider credential leak | rotate via provider console + `wrangler secret put`; audit logs show exposure window |

All rollbacks are non-destructive (data retained). No `git reset --hard` / force-push.

## 13.4 Observability + alerts

- Admin errors → `emitLogRecord` (`event:'admin_*'`).
- Overview surfaces health + incidents. P2: sev1 incident → email to Philip via `EMAIL`.

## 13.5 Rollout performance gates

(See `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` §9.6.) Merge gate: denial
tests 100%, perf budgets met, bundle ≤ 250 KB. Prod gate: same + provider
read-backs for any tile claiming real data.

## 13.6 Runbook (summary — full in DOC-RUNBOOK-01)

- **Locked out:** set `ARCHESTIMATOR_DEV_AUTH_EMAIL` locally; or `wrangler d1
  execute ARCH_DB --command "UPDATE profiles SET role='ceo' WHERE email=..."`
  (authorized Cloudflare mandate).
- **Add a 2nd admin:** append email to `PLATFORM_ADMIN_EMAILS`; set their
  `profiles.role='admin'` via D1.
- **Provider token expired:** rotate in provider console, `wrangler secret put`,
  cache auto-refreshes.
- **Support message stuck:** query `support_messages WHERE send_status='send_failed'`;
  retry via action or mark resolved.
