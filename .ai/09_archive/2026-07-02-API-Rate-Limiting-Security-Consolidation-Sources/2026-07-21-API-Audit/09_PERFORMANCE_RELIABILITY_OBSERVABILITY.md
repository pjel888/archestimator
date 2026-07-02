# 09 — Performance, Reliability, and Observability

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`

## Current baseline (from FAST PATH `current-state.md:81-84`)

| Surface | p95 | Budget | Status |
|---|---|---|---|
| `workspace_homebase_summary` RPC | 65ms | 600ms | GREEN |
| `project_estimate_list_summaries` RPC | 39ms | 600ms | GREEN |
| `library_overview_summary` RPC | 31ms | 600ms | GREEN |
| `can_edit_project` RPC | 51ms | 600ms | GREEN |
| `estimate_row_mutation` RPC | 57ms | 500ms | GREEN |
| Durable Object WebSocket realtime p95 | 54ms | 1500ms (audit recommends) | GREEN (9 samples) |
| Cloudflare Email send-to-receipt | ~4s | 10s | GREEN |

> **Baseline caveat (SRC-003, OPEN-008)**: Strict hosted client p95 (synthetic run) returns shifting cached-route outliers (e.g., `features` 469.91ms/200ms, `pricing` 953.22ms/200ms). The audit treats these as **methodology follow-up debt**, NOT provider runtime blockers (per FAST PATH `current-state.md:30-32`).

## Performance budgets (target)

| Surface | p50 target | p95 target | p99 target | Evidence artifact |
|---|---|---|---|---|
| Health (`/api/health`) | <10ms | <30ms | <50ms | `routeCloudflareFastHealthRequest` short-circuit |
| Public static page | <100ms | <200ms | <400ms | `routeStaticPublicPageThroughCache` |
| Authenticated page (D1 read) | <300ms | <600ms | <1.2s | `cf:d1-runtime-performance-proof` |
| Authenticated mutation (D1 write) | <400ms | <500ms | <800ms | `cf:d1-runtime-performance-proof` |
| Durable Object RPC | <200ms | <500ms | <1s | `cf:d1-auth-realtime-readiness` |
| Durable Object WS message latency | <30ms | <150ms | <500ms | `cf:d1-auth-realtime-readiness` |
| Email send | <3s | <10s | <30s | `cf:check-email` |
| R2 signed-URL mint | <100ms | <500ms | <1s | audit-specific |
| Queue consumer batch | <5s | <25s | <30s (must be under `max_batch_timeout`) | `cf:jobs-proof` |
| Cron job runtime | <60s | <5min | <15min (bounded; no native overlap protection) | audit-specific |
| AI ask (feature-flagged) | <2s first-token | <30s total | <60s total | audit-specific |
| AI package builder (feature-flagged) | <30s | <60s | <120s | audit-specific |

## Performance evaluator contract (per REQ-TEST-005)

For each hot path, the audit specifies:

- **Baseline metric**: p50 / p95 / p99 wall + CPU (where applicable).
- **Target metric**: see budgets above.
- **Measurement command**: `bun run cf:d1-runtime-performance-proof` for D1 paths; `bun run cf:d1-rpc-proof` for transaction proof; `bun run cf:jobs-proof` for queue/cron; `bun run cf:check-email` for Email; observability dashboard for arbitrary paths.
- **Fixture / dataset size**: workspace cardinality (1, 10, 100, 1000 workspaces) × project cardinality (10, 100, 1000 projects per workspace) × estimate cardinality (10, 100 rows per estimate).
- **Number of runs / flake policy**: 30 samples per surface; reject the highest-variance outlier; confirm p95 ≤ budget in ≥ 95% of runs.
- **Regression threshold**: p95 regression > 20% relative to baseline triggers a P1 finding; > 50% triggers P0.
- **Related functional tests**: per surface (see `12_*.md` Test Execution Matrix).
- **Evidence artifact location**: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-*-performance-proof.{json,md}`.

## Caching and invalidation contract

Owner of cache freshness (recommended decision matrix):

| Data type | Cache owner | Cache key | Lifetime | Revalidation trigger | Read-your-own-writes |
|---|---|---|---|---|---|
| Public static page (e.g., `/`, `/about`) | `routeStaticPublicPageThroughCache` (Worker) | URL pathname | 60s / on-demand | `revalidateTag` / `revalidatePath` from Server Action OR cron | n/a (public) |
| Workspace-tenant dashboard | TanStack Query (client) | `[queryKey workspaceId]` | 30s staleTime + refetch-on-focus | mutation success invalidates | YES (optimistic + return canonical) |
| Project detail (estimate tree) | TanStack Query | `[queryKey workspaceId projectId estimateId]` | 30s staleTime | optimistic mutation + return canonical | YES |
| Component library overview | TanStack Query | `[queryKey workspaceId libraryId]` | 60s staleTime | mutation success | YES |
| Share snapshot | Server (no client cache; snapshot is hash-anchored) | token | n/a (read-only after creation) | n/a | n/a |
| Better Auth session | Better Auth (D1 + cookie signed) | session-id | sessionExpiresIn (config) | sign-out → row delete + cookie clear | YES (Better Auth refresh) |
| Workers Observability stats | Cloudflare provider dashboard | tenant | dashboard refresh | provider manages | n/a |
| Public share-token view | browser cache | token + lastModified | short | mutation on share-token view revokes by deleting row | n/a |

> **Audit observation (PERF-001)**: `routeStaticPublicPageThroughCache` invalidation. Pages that become state-dependent (e.g., the `/` landing when authed differs from anonymous) MUST NOT be served through this cache as if static. Verify which paths are eligible; cross-tenant leakage is the risk.

> **Audit observation (PERF-002)**: The README's "30s staleTime" Tanstack Query cache may need tuning for high-frequency surfaces. The audit verifies that optimistic + canonical-return model is followed so read-your-own-writes is preserved.

## Reliability — failure mode matrix

For each surface, the audit specifies:

| Surface | Failure mode | Retry | Fallback | Recovery |
|---|---|---|---|---|
| D1 prepared statement timeout | `503` + bounded retry (3 attempts, exp backoff) | yes | n/a | retry-then-alert |
| D1 transaction rollback | goto error envelope | no | n/a | user retries with new idempotency key |
| R2 signed-URL expiry after mint | user re-mint | yes (auto) | n/a | re-mint on next request |
| R2 PUT/GET internal error | `503` + retry-then-error | yes | n/a | re-upload |
| DO WebSocket disconnect | auto-reconnect with exp backoff | yes | n/a | reconnecting banner UI |
| DO RPC timeout | `503` + retry | yes | n/a | retry |
| Queue at-least-once duplicate | dedup key in D1 | n/a | n/a | idempotent consumer absorbs |
| Queue DLQ | after max_retries | n/a | DLQ is destination | **alert** required (REQ-REL-002) |
| Cron job runtime > 60s | Worker scheduled handlers don't overlap natively | n/a | overlap guard in app + skip if previous still running | verify in `scheduled-upload-jobs.ts` |
| Email send transient failure | retry on 429 / 5xx | yes (bounded) | n/a | bounce alert |
| Email bounce (DMARC failure) | bounced back | n/a | n/a | mark recipient dead; alert |
| AI provider timeout | bounded retry | yes | n/a | user sees "AI unavailable, try again later" |
| AI provider unavailable | `503` AI_UNAVAILABLE | no | n/a | user sees deferred state |
| Better Auth OAuth provider (Google) fail | `503` | yes (bounded) | n/a | login redirect with banner |
| Better Auth magic-link fail | `503` | yes | n/a | user re-requests |
| Google Maps API fail | `503` | no | show address without map | autocomplete graceful-degrades |
| Client network offline | show offline banner | UX-level retry | n/a | retry on reconnect |

## Observability contract (Workers Observability)

Per `wrangler.jsonc:observability`:

- `enabled: true`
- Logs: `head_sampling_rate: 0.1`, `invocation_logs: true`, `persist: true`
- Traces: `enabled: true`, `head_sampling_rate: 0.05`, `persist: true`

> **Audit observation (OBS-001, OPEN-002)**: Sampling 0.1 for logs means 10% of requests' logs are captured. The audit MUST verify that 10% is sufficient to catch rare P0 errors with high enough probability. If audit sample shows P0 errors missed, raise `head_sampling_rate` and add Workers Analytics Engine / Sentry / external log sink (`OPEN-002`).

> **Audit observation (OBS-002)**: `console.log` appears in `worker.ts` scheduled handler. Audit recommends structured-logger pattern OR intentional `console.log` with `requestId` correlation. Verify cron failures are surfaced (no silent skips).

> **Audit observation (OBS-003)**: `invocation_logs: true` means every invocation metadata is persisted. Cost impact — confirm with billing posture (per Cloudflare pricing; Workers Observability has free tier + paid tier).

## Sampling / retention / redaction

Workers Observability retains logs for 3 days (free) or 30 days (paid). Sampled `head_sampling_rate: 0.1` reduces data volume but not retention.

Redaction:

- PII in logs (email, name, phone) MUST be redacted at log call site. The audit recommends a `redact()` helper.
- D1 query strings SHOULD avoid embedding user values via interpolation — use bound parameters, which keeps PII out of logs.
- Error envelope messages are safe to log; raw `Error.stack` may contain file paths — redact before logging.

## Alerting

| Signal | Threshold | Alert channel |
|---|---|---|
| P0 error rate (5xx) | > 1% over 5 minutes | alert (Open: Philip/ops to define channel — email/Slack) |
| Workers Observability logs `error` | > N per minute | alert |
| DLQ message count (`archestimator-upload-jobs-dlq`) | >0 | alert |
| D1 query p95 regression | > 20% over baseline | alert |
| Email bounce rate | > 5% per recipient list | investigate |
| AI feature flag toggle event | audit log row written | always (audit) |

## Reliability acceptance criteria for the audit pack

- AC-031 (failure-mode test per surface) — REQ-REL-001
- AC-032 (DLQ alert test) — REQ-REL-002
- AC-033 (Workers Observability sample-rate sufficiency) — REQ-REL-003
- AC-034 (Cron structured-logger pattern) — REQ-REL-004
- AC-027 (per-surface p50/p95 budget) — REQ-PERF-001
- AC-028 (DO hibernation `alarm()`) — REQ-PERF-002
- AC-029 (Queue consumer batch <30s) — REQ-PERF-003
- AC-030 (Cron overlap protection) — REQ-PERF-004

## OPEN decisions

- `OPEN-002`: Workers Observability sample rate 0.1 sufficient for P0 visibility?
- `OPEN-008`: Strict hosted client p95 methodology — shifting cache outliers from local proof machine — fix methodology or accept?
- `OPEN-009`: Workers Observability retention — 3 days free vs 30 days paid?
- `OPEN-010`: External log/trace sink outside Cloudflare (Sentry, Datadog, Grafana)?