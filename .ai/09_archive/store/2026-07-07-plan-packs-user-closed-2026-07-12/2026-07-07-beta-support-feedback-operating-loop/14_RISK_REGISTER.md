# 14 — Risk Register

| ID | Description | Trigger | Prob | Impact | Severity | Affected | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-01 | Operator email silently no-ops (env unset) | email env not configured | Med | Med | High | notify | readiness check; log `code != ok` | readiness gate before beta | queue badge + cron still surface feedback; `FEEDBACK_LOOP_ENABLED` flag | operator checks inbox manually | owner | low once readiness green | open |
| RISK-02 | SLA false-positive over weekend/holiday | wall-clock math without business-day rule | Med | Low | Med | sweep | fixture tests over weekends | business-day math; UTC-anchored; documented holiday rule (none at beta) | "grace" handling; manual ack | widen SLA | impl | low | open |
| RISK-03 | Operator bus-factor (single triager) | operator away | Med | High | High | whole loop | breach alerts (not just new-feedback alerts) | alert on breach; coupled founder-ops plan | backup admin role assignment | add a second platform admin | owner | med (inherent) | open |
| RISK-04 | Retention purges an active row | bug in purge SQL | Low | High | High | retention | retention test asserting archived-only | `WHERE status='archived'` guard | restore from daily D1 backup | backup/PITR | impl | low | open |
| RISK-05 | HTML injection via `message` into email | unescaped interpolation | Low | Med | Med | notify | unit test with `<script>` | plain-text body or escape | escape fix | n/a | impl | low | open |
| RISK-06 | Sweep timeout at scale | large non-archived set | Low | Med | Med | sweep | perf evaluator | indexed query; bounded rows; `ctx.waitUntil` | keyset pagination (future) | cron retry next day | impl | low | open |
| RISK-07 | Double-notify on rapid duplicate submit | no dedupe key | Med | Low | Low | notify | client button disable | `inlinePending`; post-redirect-get | accept ≤2 at beta | add idempotency key (future) | impl | low | open |
| RISK-08 | Webhook SSRF via misconfigured env | bad `FEEDBACK_ALERT_WEBHOOK_URL` | Low | High | High | alert | unit test non-`https` reject | env-only URL; `https:` guard | reject non-https | operator reconfigures | impl | low | open |
| RISK-09 | Migration `0039` fails to apply on prod D1 | schema drift | Low | Med | Med | data | apply readback | additive only; tested locally | re-run migration (idempotent ADD COLUMN fails softly if exists) | rollback DROP COLUMN | impl | low | open |
| RISK-10 | Scope creep into CRM | over-building | Med | Med | Med | whole plan | brief constraint | this plan explicitly rejects CRM alternatives | defer threads/macros/CSAT to post-beta | n/a | owner | low | open |
| RISK-11 | `/contact` divergence confuses users | two funnels | Low | Low | Low | UX | n/a | documented (OPEN-FUNNEL-01) | post-beta unification | n/a | owner | low | open |
| RISK-12 | Cloudflare free-tier budget exceeded by sweep | high row volume | Low | Med | Med | ops | Workers Observability | daily (not hourly) sweep; indexed query | switch to keyset; reduce frequency | owner approval for paid tier | owner | low at beta | open |

All risks have an owner and a mitigation. No unmitigated High-severity risk remains except the inherent bus-factor (RISK-03), which is mitigated by breach alerting + the coupled founder-ops plan and can only be fully resolved by adding a second platform admin (owner decision).
