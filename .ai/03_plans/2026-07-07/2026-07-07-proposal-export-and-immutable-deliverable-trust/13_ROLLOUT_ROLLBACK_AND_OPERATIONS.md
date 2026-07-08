# 13 — Rollout, Rollback, and Operations

## Rollout sequencing

1. **Phase 0** (schema + modules): land additively; no user-facing change; inert until consumed.
2. **Phase 1+2** (surfaces wired): feature-flagged if practical (e.g.,
   `PROPOSAL_DELIVERABLE_TRUST_ENABLED`) so the package-write path can be disabled without revert.
   Default: ON for Phase 1/2 (low risk — additive writes).
3. **Phase 3** (async/streaming): flag `PROPOSAL_EXPORT_ASYNC_ENABLED` default **OFF**; enable per
   ring after T3.0 evaluator results.
4. **Hosted smoke (TEST-2)**: must pass before enabling async in production.
5. **Docs (DOC-1)**: update after implementation confirmed.

## Performance/rel rollout gates (PERF relevant)

| Metric | Baseline | Target | Observability source | Gate | Rollback trigger |
|---|---|---|---|---|---|
| Inline XLSX p95 (max fixture) | measured at T3.0 | < 30s | `scripts/benchmark-proposal-workbook` + hosted perf | blocks async enablement if inline already failing | > 15% regression |
| Export error rate (5xx) | existing | < existing + 0.5% | Workers Observability | blocks rollout | spike |
| 413 rate | existing | not > existing | Workers Observability | monitor | spike → investigate |
| Job failure rate (async) | n/a | < 5% | queue metrics | blocks async rollout beyond ring 1 | > threshold |
| Checksum-mismatch count | 0 | 0 | audit query | **integrity incident** if > 0 | immediate flag-off + investigation |
| `/share` read p95 | existing | < existing + 20ms | hosted perf | monitor | regression |

## Rollback

- **Feature flags:** disable `PROPOSAL_DELIVERABLE_TRUST_ENABLED` (stops package writes; export
  returns to pre-feature behavior) and `PROPOSAL_EXPORT_ASYNC_ENABLED` (stops async path; inline +
  413 resume).
- **Schema:** additive table is inert if unconsumed; **no drop needed** for rollback. To fully
  remove post-feature: a follow migration (forward-only convention relaxed for a brand-new table
  only after owner approval).
- **Code:** revert route/repository changes; package table remains (harmless).
- **R2:** orphan objects cleaned by reconcile (T4.4) or lifecycle rule.
- **Data:** no destructive migration; no data loss. Pre-feature publications untouched.

## Rollback steps (runbook)

1. Set `PROPOSAL_EXPORT_ASYNC_ENABLED=false` (stops async).
2. If integrity incident (checksum mismatch): set `PROPOSAL_DELIVERABLE_TRUST_ENABLED=false`.
3. Investigate via audit rows (`proposal_deliverable_packages` + download audit).
4. Fix forward; re-enable after validation.

## Observability (ops)

- Workers Observability: export count, p95, error rate, 413 rate, job failure rate.
- D1 queries: package table audit; checksum-mismatch query (scheduled).
- Alerts: checksum-mismatch > 0 (P0 integrity); job failure rate > threshold; 413/error spike.

## Post-release verification

- Hosted smoke (TEST-2) green.
- Spot-check: issue an XLSX, verify package row + hash; republish, verify v1 retained; recipient
  accept, verify content hash recorded.
- Monitor first week of metrics.

## Feature flags

- `PROPOSAL_DELIVERABLE_TRUST_ENABLED` (default ON after Phase 1/2).
- `PROPOSAL_EXPORT_ASYNC_ENABLED` (default OFF until T3.0 + hosted smoke).
- Reuse existing flag mechanism (confirm at impl — `AGENTS.md`/config pattern).

## Backward compatibility

- Additive JSON fields; existing clients unaffected.
- Pre-feature publications readable (no package row).
- No breaking API change.

## Support notes

- "Did the client get version V?" → package table + download audit.
- "What was in V?" → immutable package row + bytes + checksum verify.
- "Recipient says file was different" → compare their `content_sha256_at_decision` to the package
  row's `content_sha256`.
