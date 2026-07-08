# 16 — Requirements Traceability Matrix

| Requirement ID | Source | User outcome | Impl phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-01 | brief + official docs + repo | no upload OOM | P2,P3 | T-02,T-05..09,T-22 | storage-provider, r2-provider, 5 routes | AC-FR-01a/b/c/d | TEST-FR-01 + deny-buffer | hosted runtime body-probe | Resolved |
| FR-02 | repo + derived | one honest max-upload | P0,P3 | T-00,T-10,T-11 | admission, policy, routes | AC-FR-02a/b/c | TEST-FR-02 | env-cap test | Resolved (OPEN-01 ack pending) |
| FR-03 | brief + official docs | large-file path | P6 (DEC-03) | T-04,T-16..18 | r2-provider, session-strategy, direct-upload, migration | AC-FR-03a/b/c/d/e | TEST-FR-03 | multipart lifecycle proof | Owner-delegated |
| FR-04 | repo + derived | object audit hooks | P2,P3 | T-02,T-05..09 | r2-provider, routes | AC-FR-04a/b/c | TEST-FR-04 | provider proof metadata | Resolved |
| FR-05 | repo + derived | no silent orphans | P4 | T-12 | cleanup-job | AC-FR-05a/b/c | TEST-FR-05 | reconcile dry-run | Resolved |
| FR-06 | repo + derived | retention deletes R2 | P4 | T-13 | worker, scheduled-upload-jobs | AC-FR-06a/b/c | TEST-FR-06 | data_retention_events | Resolved |
| FR-07 | repo + official docs | honest scanner posture | P5 | T-14,T-15 | docs, scan-job (optional) | AC-FR-07a/b/c | TEST-FR-07 (existing) | runbook | Resolved (OPEN-02 enable) |
| FR-08 | brief + repo + official docs | image processing works | P7 (DEC-07) | T-19/T-20 | server-image-processing, sharp-stub, next.config | AC-FR-08a/b/c/d or e | TEST-FR-08 | provider-proof Images | Owner-delegated |
| ARCH-01 | repo | server-only uploads | P3 | T-05..09 (verify) | routes | AC-ARCH-01a | TEST-ARCH-01 (static) | grep | Resolved |
| ARCH-02 | repo + simplicity | single port | P1 | T-01 | storage-provider | AC-ARCH-02a | TEST-ARCH-02 (portability) | type-check | Resolved |
| DATA-01 | repo | no schema change for core | P2-P5 | none | none | AC-DATA-01a | git status | n/a | Resolved |
| DATA-02 | derived (conditional) | multipart part rows | P6 (DEC-03) | T-17 | migration 0041 (next free; re-confirm at impl) | AC-DATA-02a | cf:inventory | migration dry-run | Conditional (DEC-03) |
| API-01 | derived | honest errors | P3 | T-05..09 | routes | AC-API-01a | TEST-API-01 | route tests | Resolved |
| SEC-01 | repo | authz at boundary | P3 (verify) | T-05..09 (verify) | routes, d1-access | AC-SEC-01a | TEST-SEC-01 | denial matrix | Resolved (verify) |
| SEC-02 | repo | scan gate consistent | P3/P5 | T-08,T-14 | attachments, scanning | AC-SEC-02a | TEST-SEC-02 (existing) | scan-freeze test | Resolved |
| SEC-03 | repo | path safety | P2/P3 | T-02,T-05..09 | r2-provider, routes | AC-SEC-03a | TEST-SEC-03 (existing) | unsafe-identifier test | Resolved |
| PERF-01 | official docs + derived | mem budget ≤ env | P3,P8 | T-22,T-21 | routes, runtime proof | AC-PERF-01a | TEST-PERF-01 | hosted body-probe | Resolved |
| PERF-02 | repo + official docs | R2 P95 ≤ 250ms | P8 | T-21 | hosted perf | AC-PERF-02a | TEST-PERF-02 | hosted perf | Resolved (hosted gap) |
| REL-01 | repo + derived | idempotent uploads | P3/P4/P6 | T-09,T-12,T-16 | routes, cleanup, multipart | AC-REL-01a | TEST-REL-01 | dedup test | Resolved |
| OPS-01 | derived | runbook | P5/P8 | T-14,T-23 | docs | AC-OPS-01a | doc review | runbook exists | Resolved |
| TEST-01 | directive | matrix complete | P8 | T-21..23 | tests | AC-TEST-01a | `12` matrix | matrix green | Resolved |
| DOC-01 | directive | stack+research docs | P5/P8 | T-14 | docs | AC-DOC-01a | doc review | `18`/`19` complete | Resolved |

**Untraced requirements:** none. Every requirement maps to ≥1 task, acceptance criterion, and test.
**Tasks without a requirement:** none. Every task maps back (T-00→decisions; T-01..23→FR/ARCH/…).

## Performance-sensitive requirements — extended mapping

| Req | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-01 | up to 64 MiB buffered | ≤ 4 MiB (env) | vitest + hosted body-probe | any whole-body arrayBuffer in stream path | revert streaming |
| PERF-02 | unknown | ≤ 250 ms P95 | hosted perf / Workers Observability | > 250 ms P95 | investigate/revert |
| FR-01 | OOM risk | no eviction | memory harness + Observability | eviction log | lower concurrency |
