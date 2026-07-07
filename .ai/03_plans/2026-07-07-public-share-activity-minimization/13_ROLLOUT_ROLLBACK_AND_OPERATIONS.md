# Rollout, Rollback, and Operations

## Rollout shape

Phases 1, 2, 4, 5(mechanism), 8 are code-only → standard OpenNext/Cloudflare Workers deploy. Phases 3, 6, 7 and Phase-5 TTLs are owner-gated and have their own rollout.

## Staged rollout

| Phase | Ring 1 (local/staging) | Ring 2 (production) | Gate to next ring |
|---|---|---|---|
| 1 (minimization) | CI green; staging route probe | production deploy | route-level tests green; provider readback clean |
| 2 (tests) | CI green | (tests are CI) | n/a |
| 4 (no-store + readback) | staging D1 EXPLAIN + curl | production curl | grep clean |
| 5 (retention mechanism) | dry-run on staging D1 | production cron | dry-run log clean; owner TTL sign-off |
| 3 (secrets) | staging with all 4 secrets | production after provisioning | config test green; owner approval |
| 6 (Turnstile/WAF) | staging Turnstile + WAF | production | browser proof; dashboard proof |
| 7 (session revocation) | staging migration + test | production | D1 readback; re-session test |

## Release gates

| Gate | Blocks |
|---|---|
| `bun run type-check` green | merge |
| Focused vitests (Phase 2 + composer + repo + retention + logging) green | merge |
| Benchmark p95 within budget | merge (PERF-01) |
| `git diff --check` clean | merge |
| Provider readback: public DTO has no `email`/`author_email`/raw-UUID | production rollout (Phase 4) |
| Owner TTL sign-off (OPEN-RET-01) | Phase 5 production |
| Owner secret provisioning (OPEN-SEC-02) | Phase 3 production |
| Turnstile browser + dashboard proof (OPEN-SEC-03) | Phase 6 production |
| Migration readback + re-session test (OPEN-SEC-04) | Phase 7 production |

## Rollout performance gates (PERF-01)

- **Baseline:** Phase 0 capture (p50/p95 at the 1000-comment fixture).
- **Target:** p95 ≤ 300ms (std), ≤ 500ms (1000-fixture).
- **Observability source:** benchmark test; Workers Observability (free tier) for production p95.
- **Regression threshold:** +20% p95.
- **Rollback trigger:** p95 > 600ms (std) / > 800ms (1000-fixture).
- **Metric owner:** executor.
- **Known gaps:** production p95 requires Workers Observability (free) or a hosted probe; local benchmark is the primary gate.

## Rollback procedures

| Phase | Rollback |
|---|---|
| 1 (code) | Revert deploy (git revert + redeploy). No data effect. |
| 2 (tests) | n/a (tests only) |
| 4 (code/test) | Revert. |
| 5 (retention) | Remove the rules from `retention-core.ts` + redeploy. Already-purged rows recoverable only from daily D1 backup. |
| 3 (secrets) | Restore fallbacks (documented as temporary). |
| 6 (Turnstile/WAF) | Disable Turnstile flag; remove WAF rule. |
| 7 (session revocation) | `ALTER TABLE shared_link_recipients DROP COLUMN session_generation;` (D1 ≥ 3.35) + revert code. |

## Data repair

- Retention purges are hard DELETE; repair = daily D1 backup + `cf:d1-restore-rehearsal`.
- No soft-delete → no tombstone repair needed.

## Feature flags

- Phase 6 Turnstile: behind a flag (e.g. `NEXT_PUBLIC_SHARE_TURNSTILE_ENABLED` + server flag).
- Phase 7 session revocation: feature-detect on the column existence (or a flag).
- Phases 1-5: no flag needed (backward-compatible).

## Observability

- **Structured logs:** share routes via `logAppError`/`emitLogRecord` (Phase 4 redactor coverage).
- **Metrics:** open_count, rate-limit events, `data_retention_events` (extended Phase 5).
- **Traces:** Workers Observability (free).
- **Dashboards:** existing; no new dashboard for Phases 1-5.
- **Alerts:** 5xx spike on share routes; rate-limit exhaustion; retention cron error in `data_retention_events`. Owner-configured (free-tier limits).

## Post-release verification

- Route-level privacy tests green in CI.
- Benchmark p95 within budget for 7 days.
- Provider readback: `/activity` JSON clean.
- Retention dry-run log shows the new tables covered (Phase 5).
- (Phase 6/7) Turnstile/session-revocation proofs.

## Runbooks (DOC-02)

### Phase 3 — Secret split runbook
1. Generate four secrets: `PUBLICATION_TOKEN_HASH_SECRET`, `PUBLICATION_TOKEN_ENCRYPTION_SECRET`, `PUBLICATION_ACCESS_COOKIE_SECRET`, `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER`.
2. Provision in Cloudflare Workers secrets (`wrangler secret put …`).
3. Deploy the code that requires all four (no fallback).
4. Verify: a share link still resolves; a recipient can comment; analytics IP hashes differ from the old pepper (expected — old hashes age out via retention).
5. Rollback: restore fallbacks temporarily.

### Phase 6 — Turnstile/WAF runbook
1. Create a Turnstile site (free) → site key + secret.
2. Provision secret via `wrangler secret put`.
3. Deploy Turnstile client widget + server verify.
4. Add WAF custom rule (free tier limit — confirm) blocking abusive IPs on `/share/*`.
5. Verify: browser renders challenge; open link resolves after solve; password link bypasses Turnstile.
6. Rollback: disable flag; remove WAF rule.

### Phase 7 — Session revocation runbook
1. Apply migration `0038_shared_link_session_generation.sql` (`bun run cf:d1-migrate` or the project's apply path).
2. Deploy code that reads + binds `session_generation`.
3. Verify: existing sessions still work (generation 0); removing a recipient invalidates their cookie.
4. Rollback: drop column.

## Compliance / privacy

- Phase 5 retention supports the privacy posture for first users; coordinate with `retention-schedule.md` (OPEN-DEC-004 counsel sign-off).
- DSAR path (`privacy_requests`) unchanged.
