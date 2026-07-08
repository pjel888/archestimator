# 13 — Rollout, Rollback, and Operations

## Rollout strategy

Feature-flagged (`ARCHESTIMATOR_COST_REVIEW_GOVERNANCE_ENABLED`, default off). Schema lands inert (additive). Phased enablement:

1. **Local dev:** migration apply; unit/DOM/integration tests green.
2. **Preview (`cf:preview`):** migration apply to preview D1; `cf:verify-preview-routes`; `cf:check-readiness`; perf evaluators; adversarial matrix.
3. **Remote D1 migration apply:** `wrangler d1 migrations apply archestimator-proof-db --remote` (after preview gate). Additive; existing data backfilled Mode A.
4. **Flag on (closed beta):** enable in Worker env; monitor.
5. **Production (archestimator.com):** after closed-beta soak.

## Rollout performance gates (per directive §13)

| Metric | Baseline | Target | Observability source | Release gate | Sample size | Owner | Pass/fail | Rollback trigger |
|---|---|---|---|---|---|---|---|---|
| Library browse p95 | capture at preview | ≤ baseline +10% | `cf:verify-hosted-performance` | blocks prod | 30 runs | impl | p95 within band | flag off |
| Estimate read p95 (stale) | capture | ≤ baseline +5% | perf evaluator 2 | blocks prod | 30 runs | impl | within band | fall back to non-computed `source-changed` |
| Overview "Needs review" latency | n/a | ≤200ms p95 @100k | EXPLAIN + manual | blocks prod | n/a | impl | index seek | denormalize via Cron |
| Review-action error rate | n/a | <1% | Cloudflare Workers Analytics | monitors beta | rolling | owner | <1% | flag off |
| Import failure rate | n/a | <2% (excludes user validation errors) | telemetry | monitors beta | rolling | owner | <2% | row-cap review |

Known gaps when hosted/provider proof unavailable: at planning time, baselines are not yet captured; implementation must capture at preview. Local perf evaluators are the substitute evidence until hosted proof exists.

## Rollback procedures

| Layer | Trigger | Steps |
|---|---|---|
| Feature flag | error rate / perf regression / data issue | set `ARCHESTIMATOR_COST_REVIEW_GOVERNANCE_ENABLED=off`; redeploy; UI/actions inert; data intact |
| Review actions | authz/concurrency bug | flag off (above) |
| Import | injection/quota bypass | flag off import action; keep schema |
| Migration | constraint wrong | ship `0038` relaxing/rebuilding; do NOT try to DROP COLUMN with CHECK (SQLite limitation) — fix-forward |
| Backfill (Mode A wrong) | owner wants no inherited trust | `UPDATE ... SET review_status='proposed' WHERE reviewed_by='system-backfill'` (follow-up migration) |
| Bad accept/supersede | data correction | supersede/reject via existing actions; audit trail records correction |
| Bad import batch | bulk archive by `origin='imported'` + `created_at` window via `executeBulkArchiveLibraryComponents` | audit records |

## Rollback triggers (quantified)

- Review-action 5xx rate >1% over 10 min → flag off.
- Library browse p95 > baseline +15% → flag off review UI; reindex.
- Estimate read p95 > baseline +10% → fall back to non-computed `source-changed` (config toggle).
- Any data-integrity finding (e.g., duplicate accepted-current) → flag off + `0038` repair.

## Observability (post-release)

- Structured logs: review/import actions with `correlationId`.
- Telemetry events: `review_action_completed{type,outcome}`, `import_completed{mode,rows}`, `library_review_conflict` (counter).
- Audit table: source of truth for forensics; governance-admin query UI.
- Cloudflare Workers Analytics: error rate, latency, conflict rate (free-tier sufficient for closed beta).
- Alerts: optional; owner-monitored during closed beta.

## Data retention

- Review-event audit: retain indefinitely (small volume) or per workspace data-retention policy (`0034_data_retention_events.sql` pattern).
- Drafts: existing `cost_library_component_drafts` retention unchanged.
- Imports: no separate log; events cover it.

## Deployment sequencing

1. Merge migration + code behind flag (no behavior change).
2. Apply remote migration (additive, inert).
3. Preview verify.
4. Flag on closed beta.
5. Monitor; promote.

## Support / incident response

- Runbook: "Review action returns 409" → refresh + retry (revision conflict by design).
- Runbook: "Import rejected too large" → split file or raise cap (owner decision).
- Runbook: "Estimate shows stale unexpectedly" → check library version bump + computed-on-read; verify perf fallback not active.

## Post-release verification

- Re-run perf evaluators on production after 1 week.
- Spot-check audit table integrity.
- Confirm `source-changed` reachable in real estimates.

## Provider-proof boundary

- Local D1 proof required before remote apply.
- Remote D1 readback required before flag-on in prod.
- Hosted route perf required before prod promotion.
- No Supabase/external-provider mutation.
