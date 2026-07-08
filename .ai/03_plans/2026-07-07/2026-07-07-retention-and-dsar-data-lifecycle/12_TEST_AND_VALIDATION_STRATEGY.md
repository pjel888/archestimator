# 12 — Test and Validation Strategy

## §1. Test layers chosen (lightest proof that proves the claim)

- **Pure domain logic** (rule registry, propagation map, confirmation phrase, status graph): unit tests (Vitest).
- **D1 repository behavior** (apply/dry-run, audit writes, idempotency, anonymize, soft-delete, transitions): repository tests against a local D1 (Miniflare or `@cloudflare/vitest-pool-workers` — match the existing `tests/vitest/compliance-retention-repository.test.ts` pattern).
- **Admin route authz** (platform-admin gate): role-matrix + denial tests.
- **Cron env-gate**: worker `scheduled()` test with mock env.
- **R2 DSAR tombstone/purge**: receipt test + purge-retry test (local R2 via Miniflare).
- **Security/denial**: intake rate-limit denial; erasure phrase denial; cross-workspace export leak.
- **Performance**: `cf:d1-retention-proof` (PERF-01), builder/erasure wall-time tests.
- **Hosted proof**: 30-day cron query; DSAR drill; observability readback (`13_`).

Browser/Playwright proof is **not** a default gate for the admin surface (proportional verification policy). DOM tests + keyboard/focus tests for the confirmation modal suffice; browser proof reserved for the focus-trap if static review is insufficient.

## §2. Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| REQ-RET-003 (14 classes) | `tests/vitest/compliance-retention-repository.test.ts` | unit+repo | extend | seeded D1 per class | `bunx vitest run <file> --maxWorkers=1` | 14 rules; each platformManaged writes acceptance row | none known | impl |
| REQ-RET-004 (non-purge actions) | `tests/vitest/compliance-retention-actions.test.ts` | repo | new | fixture audit rows | `bunx vitest run <file>` | UPDATE not DELETE for anonymized/soft_deleted | none | impl |
| REQ-DSAR-001 (transitions) | `tests/vitest/compliance-privacy-request-transition.test.ts` | unit+repo | new | fixture privacy_requests | `bunx vitest run <file>` | legal transitions ok; illegal → typed error; audit written | none | impl |
| REQ-DSAR-001 (admin authz) | `tests/vitest/admin-privacy-requests-authz.test.ts` | role-matrix | new | fixture users (admin/non-admin) | `bunx vitest run <file>` | non-admin → 403/404 on every admin route | none | impl |
| REQ-DSAR-002 (export builder) | `tests/vitest/dsar-export-builder.test.ts` | unit+integration | new | two-fixture users + audit rows | `bunx vitest run <file>` | package for A excludes B; counts correct | none | impl |
| REQ-DSAR-002 (export rate limit) | `tests/vitest/dsar-export-ratelimit.test.ts` | denial | new | rate-limit fixture | `bunx vitest run <file>` | 429 on excess | none | impl |
| REQ-DSAR-003 (erasure) | `tests/vitest/dsar-erasure-orchestrator.test.ts` | integration | new | fixture user + map | `bunx vitest run <file>` | propagation complete; idempotent; partial-fail not completed | none | impl |
| REQ-DSAR-003 (erasure phrase) | (in orchestrator test) | denial | new | — | `bunx vitest run <file>` | missing phrase → throws | none | impl |
| REQ-R2-001 (tombstone+purge) | `tests/vitest/dsar-r2-purge.test.ts` | integration (local R2) | new | fixture upload_assets + R2 | `bunx vitest run <file>` | tombstone at T0; purge at T0+30d; receipt written | none | impl |
| REQ-CRON-001 (env-gate) | `tests/vitest/worker-scheduled-retention.test.ts` | unit (mock env) | new | mock env | `bunx vitest run <file>` | dry-run no DELETE; apply DELETE | none | impl |
| REQ-CRON-003 (30-day) | n/a (hosted query) | hosted proof | new | n/a | `wrangler d1 execute ARCH_DB --command "..."` | ≥30 distinct ran_at days; error-skip ≤ threshold | n/a | ops |
| REQ-LOG-003 (log redaction) | `tests/vitest/retention-log-redaction.test.ts` | static/grep | new | fixture PII strings | `bunx vitest run <file>` | no fixture PII in log output | none | impl |
| PERF-01 (cron perf) | `scripts/generate-cloudflare-d1-retention-proof.ts` | evaluator | new | seeded D1 5k/class | `bun run cf:d1-retention-proof` | JSON artifact; p95 < 30s | none | impl |
| Existing intake (REQ-DSAR-004) | existing `tests/vitest/` privacy-request test | regression | existing | existing | `bunx vitest run <existing>` | green | none | impl |

Commands used (verify scripts exist before running):
- `bun run type-check`
- `bun run lint` (targeted)
- `bunx vitest run <file> --maxWorkers=1`
- `bun run cf:d1-restore-rehearsal`
- `bun run cf:d1-retention-proof` (new)
- `git diff --check`

## §3. Adversarial QA scenario matrix (ULTRAQA-style; full matrix in `19_`)

Summary of required scenarios (each has ID, setup, command, expected signal, status, evidence, cleanup in `19_`):
1. Anonymous user calls admin transition route → 403/404.
2. Workspace admin (non-platform) calls admin route → 403/404.
3. Erasure without typed phrase → 400.
4. Erasure with wrong phrase → 400.
5. Re-run erasure same request id → idempotent (no double-affect).
6. Erasure partial failure (one target errors) → status not completed; correlation audit.
7. Export for user A includes user B data → test fails (must exclude).
8. Export rate-limit exceeded → 429.
9. Intake rate-limit exceeded → 429.
10. Cron with `RETENTION_DRY_RUN=1` → no DELETE; acceptance/dry-run audit.
11. Cron D1 error mid-pass → per-class skipped+error; next run recovers.
12. R2 purge fails → status purge_retry; next sweep retries.
13. XSS payload in request description → rendered as text (no HTML).
14. Replay export request → cached package within TTL.
15. `legal_hold=1` row (once DB-04 lands) → skipped_legal_hold audit.
16. Concurrent transition (two admins) → optimistic guard; one gets conflict.

## §4. Test completeness rule
A requirement is not ready if its validation is only "manual QA" without exact steps, actor, setup, expected observations, and pass/fail criteria. Every REQ above has an automated test or a hosted-proof query with defined pass/fail.

## §5. Known-red/slow command policy
Before running a broad command (e.g., `bun run validate`, `bun run build`), confirm it is not known-red/slow. The retention/DSAR work is well-covered by focused Vitest files + `cf:d1-retention-proof`. Reserve `bun run validate`/`build` for release gates (`13_`).
