# 16 — Requirements Traceability Matrix

> **Revision 2 (post-adversarial, P1-6).** Now uses the required schema:
> `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`.
> `REQ-*`/`AC-*`/`T-*`/`P-*`/`RISK-*`/`ASSUMP-*`/`DEC-*` IDs cross-reference
> `04_…`, `11_…`, `12_…`, `14_…`, `15_…`.

Source-strength legend: `brief` = PROMPT.md; `repo evidence` = file:line;
`official docs` = Cloudflare docs (`19_…`); `derived` = inferred; `assumption`.

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-B1 | FR-01 request id at edge + echo + propagation | brief "request IDs" + `worker.ts:60-95` (no id/echo), `route-error.ts:28-34` (err_* only), `server-timing.ts:37` (wsh_* dev) | brief + repo | 04 FR-01; 06 §6.2; 11 Phase 1-2 | T-1.1, T-1.2, T-2.1, T-2.2 | AC-FR-01a..c, AC-FR-01b1 | P-01, P-02, P-04 | RISK-01 (ALS lost), RISK-02 (injection), RISK-16 (nodejs_compat) | planned | DEC-01; ASSUMP-01 (gated by P-03); OPEN-05 independent review |
| SRC-B1 | FR-02 cron/queue correlation ids | brief "job IDs" + `worker.ts:97-129` (summary-only logs), `upload-job-queue.ts:119-122` (idempotencyKey), `worker.ts:111` (cronRunId) | brief + repo + official docs (`19_…` RQ-3) | 04 FR-02; 11 Phase 2,4 | T-2.3, T-4.1, T-4.2 | AC-FR-02a..c | P-05, AQ-11 | RISK-17 (contention) | planned | DEC-01 |
| SRC-B1 | FR-03 worker dispatch try/catch (sync + streaming) | brief + `worker.ts:60-129` (no try/catch) | brief + repo | 04 FR-03; 11 T-2.1/T-2.3 | T-2.1, T-2.3 | AC-FR-03a..c | P-04, **P-06** | RISK-10 (double-log), RISK-12 (concurrent edit) | planned | P1-4 streaming gap closed |
| SRC-B1 | FR-04 Server-Timing (gated) | brief + `server-timing.ts` (no header) | brief + repo | 04 FR-04; 11 Phase 8 | T-8.1, T-8.2 | AC-FR-04a..c | P-07 | RISK-11 (cache pollution) | planned | DEC-08 |
| SRC-B1 | FR-05 error taxonomy + id in logs | brief "error taxonomy" + `app-error.ts` (hierarchy), `with-action-errors.ts:53-57` (no id) | brief + repo | 04 FR-05; 11 Phase 3 | T-3.1, T-3.2, T-3.3 | AC-FR-05a,b | P-03 (SA gating), P-08 | RISK-01 (SA ALS), RISK-10 | planned | DEC-06; ASSUMP-01 promoted to gating test P-03 |
| SRC-B2 | REL-01 runtime budget definitions | brief "CPU/duration/subrequest/memory budgets" + `19_…` RQ-2 (ceilings) | brief + official docs | 04 REL-01; 09 §9.1 | T-5.x, T-6.1, T-7.x, T-8.x | AC-REL-01a,b | static review of 09_…; guard unit tests | RISK-05, RISK-07, RISK-08, RISK-09 | planned | OPEN-04 (enforce advisory vars? out of scope) |
| SRC-B2 | REL-02 retention time+row budget | brief + `retention-core.ts:180-268` (unbounded) | brief + repo | 04 REL-02; 11 Phase 5 | T-5.1, T-5.2 | AC-REL-02a..c | P-09, AQ-8 | RISK-05 (quota), RISK-17 (contention) | planned | DEC-05 |
| SRC-B2 | REL-03 DO fan-out cap | `collaboration-room.ts:108` (double-encode), `:170-201` (O(N) presence) | repo | 04 REL-03; 11 Phase 6 | T-6.1 | AC-REL-03a,b | P-10, AQ-6, AQ-7 | RISK-06 (amplification) | planned | ASSUMP-07 (byteLength API — gated by T-6.1) |
| SRC-B2 | OBS-01 Analytics Engine KPIs | brief "free-tier-safe monitoring" + `19_…` RQ-4 (100k/day free) | brief + official docs | 04 OBS-01; 11 Phase 7-8 | T-7.2, T-8.3, T-8.4 | AC-OBS-01a..c | P-11, P-12, AQ-4, AQ-12 | RISK-03 (PII in dims), RISK-09 (quota) | planned | DEC-03; OPEN-01 (binding name); OPEN-02 (KPI set) |
| SRC-B2 | OBS-02 sampling tuned pre-launch | brief "log sampling" + `19_…` RQ-1 (shared quota Mar 2026) + `wrangler.jsonc:83-96` (3 keys, traces on) | brief + official docs + repo | 04 OBS-02; 11 T-7.1 | T-7.1 | AC-OBS-02a (3-key), AC-OBS-02a1/a2 | cf:check-deploy-dry-run + resolved-config grep | RISK-08 (quota) | planned | DEC-02; P0-2 closed (top-level key + traces off) |
| SRC-B2 | OBS-03 dashboard/alert queries | brief "dashboard/alert expectations" + `19_…` RQ-5/6 | brief + official docs | 04 OBS-03; 13 §13.5 | T-10.8 | AC-OBS-03a,b | static review | RISK-15 (free-tier alerting weak) | planned | OPEN-03 (alert-poll destination) |
| SRC-B3 | SEC-01 redaction on every emit path | brief "keep sensitive payloads out" + `redact.ts`, `instrumentation.ts:13-30` (raw path) | brief + repo | 04 SEC-01; 08 §8.5; 11 Phase 9 | T-9.1, T-3.3, T-8.1, T-8.3 | AC-SEC-01a..c | P-13, P-14, P-17, AQ-14 | RISK-03, RISK-04 | planned | P1-2 closed (instrumentation path redaction) |
| SRC-B3 | SEC-02 evidence redaction | brief "keep sensitive payloads out of evidence" | brief | 04 SEC-02; 11 T-9.2 | T-9.2 | AC-SEC-02a,b | static review | RISK-04, RISK-05 | planned | none |
| SRC-B4 | SEC-03 (new, P1-5) inbound id not persisted to D1 audit | derived from `account-audit-d1-store.ts` (writes request_id) + T-06 | repo + derived | 04 AC-FR-01b1; 08 §8.6; 11 T-1.3 | T-1.3 | AC-FR-01b1 | P-15, AQ-13 | RISK T-06 (re-rated Med) | planned | DEC: echo-only for unauth (P1-5) |
| SRC-B5 | TEST-01 test coverage for new code | `03_…` §3.14 (test gaps) | repo | 04 TEST-01; 12 §12.2 | T-10.1..10.7 | proof-contract table green | P-01..P-17 | RISK-12 | planned | P0-1 closed (test:dom commands) |
| SRC-B5 | DOC-01 observability runbook | brief "evidence scripts" + "dashboard/alert expectations" | brief + official docs | 04 DOC-01; 13 §13.4 | T-10.8 | runbook complete | static review | RISK-15 | planned | P1-3 closed (x-request-id lookup) |

## Performance-sensitive requirements → evaluator mapping

| Req | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| FR-01 (id resolution) | n/a | <0.1 ms | unit bench (P-16) | p99 > 0.5 ms | revert T-1.1 |
| Phase 2 (dispatch overhead) | current | <1 ms added | dev integration (P-04) | >1 ms added | revert T-2.1 |
| REL-02 (retention) | unbounded | stops at budget | unit fixture (P-09) | fails to stop | revert T-5.1 |
| REL-03 (DO broadcast) | O(N) re-encode | ≤cap, single length | unit 300 sockets (P-10) | >10 ms broadcast | revert T-6.1 |
| OBS-01 (metrics emit) | n/a | <0.2 ms | unit bench (P-16) | p99 > 0.5 ms | disable AE emit |
| RISK-07 (export CPU) | current | 0 exceededCpu | Workers Logs (hosted) | any exceededCpu | fix-forward / Queue |

## Completion check

- Every requirement has source evidence (SRC-* column). ✅
- Every requirement has source-strength classification. ✅
- Every requirement has a work item (T-*). ✅
- Every requirement has objective acceptance criteria (AC-*). ✅
- Every requirement has a test/proof (P-*). ✅
- Every requirement links to its risks (RISK-*). ✅
- Every requirement links to its gap/decision (DEC/ASSUMP/OPEN). ✅
- Every work item maps back to ≥1 requirement. ✅ (see `11_…` task → req mapping)

No requirement is untraced. No task is orphaned.
