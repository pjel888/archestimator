# 15 — Decisions, Assumptions, and Alternatives

## Architectural / technical decisions

### D-CRONSOT — Cron source of truth = `wrangler.jsonc`
- **Problem:** 5 surfaces mention crons; one (`AGENTS.md`) is stale.
- **Options:** (A) `wrangler.jsonc` SoT + code constants mirror + guard test; (B) make `scheduled-upload-jobs.ts` the SoT; (C) a new `cron-schedule.md` SoT.
- **Chosen:** A. `wrangler.jsonc:59-65` is SoT (it's what Cloudflare actually fires); `scheduled-upload-jobs.ts` mirrors 2-of-3 (the upload jobs); `worker.ts` references the 3rd (retention); T-002 guard test pins the union.
- **Rejected B:** `scheduled-upload-jobs.ts` cannot express the retention cron (it's not an upload job). **Rejected C:** adds a 6th surface to keep in sync; the guard test achieves consistency without a new doc.
- **Consequences:** adding a 4th cron requires updating wrangler + code + test together.

### D-IDEMP — Keep minute-granularity, per-batch dedup
- **Problem:** idempotency key is minute-scoped and dedup is per-batch only.
- **Options:** (A) keep current + document + test boundary; (B) add D1-backed durable idempotency store checked on every execution.
- **Chosen:** A now; B only if cross-batch duplicate work is observed. Downstream jobs are idempotent (cleanup re-run-safe; scan D1-guarded), so duplicate execution is cheap and safe.
- **Rejected B now:** adds a write on every cron hot path (cost + D1 row-read/write on free tier) without proven need; minute-key already collapses intra-minute dups.
- **Conditions to revisit B:** observed duplicate executions causing scanner load or audit noise.

### D-INDEX — Add standalone `created_at` indexes (DATA-001)
- **Problem:** retention purges `WHERE created_at < ?` won't use composite indexes (leading-column mismatch).
- **Options:** (A) add 4 standalone indexes; (B) rely on composite indexes + LIMIT; (C) denormalize a retention-ready flag.
- **Chosen:** A. Additive, reversible, free-tier-cheap (read-side improvement), once-daily off-peak.
- **Rejected B:** full scan at scale risks row-read quota. **Rejected C:** over-engineering for a bounded daily pass.
- **Conditions to change:** if write regression on the indexed tables appears → drop.

### D-RETPROC — Retention stays in-process in `worker.ts scheduled()`
- **Problem:** retention isn't a queue job or an HTTP route.
- **Options:** (A) keep in-process; (B) route through the queue; (C) add an HTTP `/api/internal/retention` route.
- **Chosen:** A. Once-daily, bounded, no retry/DLQ need, no new attack surface.
- **Rejected B:** over-engineered (queue/DLQ machinery for a daily DELETE). **Rejected C:** new Bearer-protected route = new attack surface for no benefit.
- **Consequence:** retention has no built-in retry (next day's run is the retry); no per-run idempotency key (but `cronRunId` correlates).

### D-RETDRY — Optional retention dry-run env gate (T-010)
- **Problem:** retention runs live at the call site; no runtime dry-run toggle.
- **Options:** (A) add `RETENTION_DRY_RUN` env check; (B) leave as-is (dry-run only via code/test).
- **Recommendation:** A (Small complexity, safer operator control). **Status: owner-delegated planning decision** — the lead recommends A; confirm with Philip.
- **Effect of A:** operator can force dry-run without redeploy. **Effect of B:** dry-run requires code change + redeploy.

### D-PROOF — Local proof is necessary-not-sufficient
- **Problem:** `cf:queues-cron-proof` is green locally but `providerBacked=false`.
- **Chosen:** treat local proof as necessary; hosted proof (T-008) as the gate for `productionJobsMessagingReady=true`. Never claim production readiness from local simulation.
- **Rejected:** treating local green as production-ready.

## Open / external decisions

### OPEN-DEC-004 — Retention TTL counsel sign-off (EXTERNAL, owner + counsel)
- **Why external:** legal/compliance judgment (PH DPA, GDPR, sector rules). Cannot be resolved from code.
- **Options:** the 7 counsel checklist items in `retention-schedule.md`.
- **Recommendation:** Philip + counsel to sign off; until then retention ships dry-run-only or behind `RETENTION_DRY_RUN=1`.
- **Impact:** blocks "retention production-proven" (RISK-012). Does NOT block queue/cron/upload-job ops readiness.

### OPEN-DEC-007 — Retention registry completeness (owner-delegated)
- **Problem:** 7 of 14 documented classes are not in `DEFAULT_RETENTION_RULES`.
- **Options per class:** (a) implement rule; (b) document as platform-managed (e.g., `logs_worker_observability` is Cloudflare-managed, no D1 purge needed); (c) defer.
- **Recommendation:** `logs_worker_observability`, `logs_email_delivery`, `sessions_expired`, `uploads_orphaned` → document as platform-managed or covered by other jobs (uploads_orphaned ≈ upload-cleanup). `ai_*` (3 classes) → defer until AI features ship. Record rationale in runbook.
- **Impact:** low (no current AI/log D1 tables to purge).

### OPEN-DEC-008 — Hosted proof authorization (EXTERNAL, owner)
- **Why external:** executing `cf:jobs-proof` against hosted Worker is owner-gated.
- **Recommendation:** Philip authorizes a one-time proof run post-deploy.
- **Impact:** blocks `productionJobsMessagingReady=true` (RISK-010).

## Assumptions (labeled)

- ASSUMP-001: Cloudflare Queues consumer config in `wrangler.jsonc` (`max_retries`, DLQ) is applied as-declared. (repo evidence; not separately provider-proven.)
- ASSUMP-002: `wrangler queues ...` CLI supports read-only DLQ peek. (needs `19` research confirmation — if unavailable, use dashboard.)
- ASSUMP-003: The 5 retention-target tables are the only D1 purge targets today. (repo evidence — registry has 7 rules across 5 distinct tables + the `account_audit_legacy_sha256` alias.)
- ASSUMP-004: Free-tier Workers Observability sampling (0.1/0.05) is acceptable for supportive signals; deterministic D1 audit rows are primary. (design choice.)
- ASSUMP-005: Cron triggers fire reliably enough that daily audit-row absence is a meaningful failure signal. (Cloudflare Cron is best-effort; documented in `09`.)

## Rejected alternatives (summary, not re-litigated above)

- Postgres/Supabase for queue state — out of scope (Cloudflare-first; no going back).
- A second queue for retention — over-engineered.
- Marking D1 rows as "cleaned" to dedupe — unnecessary (R2-delete idempotency suffices).
- Moving cron SoT to a new doc — adds sync burden (see D-CRONSOT).
