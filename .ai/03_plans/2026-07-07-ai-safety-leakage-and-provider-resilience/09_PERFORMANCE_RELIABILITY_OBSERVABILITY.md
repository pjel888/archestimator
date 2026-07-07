# 09 — Performance, Reliability, and Observability

## Performance posture

AI is disabled by default; when enabled, the hot paths are the two routes. Performance is **not** the primary launch risk (safety/leakage is), but budgets must be defined so a regression is detectable.

### Budgets (evaluator contract — PERF)

| Metric | Baseline (current, inferred) | Target | Measurement | Regression threshold |
|---|---|---|---|---|
| Ask p95 end-to-end (auth→response) | ~DeepSeek latency + bounded reads (~1–4s) | p95 < 8s (incl. 20s timeout ceiling) | local mocked-fetch harness (provider = stub) + optional hosted probe | p95 > 10s OR timeout-rate > 5% |
| Package-builder draft p95 (provider path) | ~1–4s + deterministic fallback | p95 < 8s | local harness | p95 > 10s |
| Package-builder draft p95 (deterministic fallback) | fast (<500ms) | p95 < 1s | local harness | p95 > 1.5s |
| AI read-context D1 query count per Ask | bounded (≤ ~9 source queries by intent) | no increase | instrumented unit test | count increase |
| Worker CPU/time for AI route | within Workers limits | no budget breach | Workers Observability (hosted) | any CPU/time limit error |

- Evaluator: `bun run test` over a new `ai-performance.smoke` suite using mocked DeepSeek (no real call). Fixture: synthetic workspace with 12 projects / 48 rows / 48 library items (the caps).
- Sample policy: 20 runs, report p50/p95; flake policy: rerun once on outlier.
- Browser proof: **not required** for performance (static + harness suffices per AGENTS.md). Provider/hosted p95 is a hosted claim — state as a gap when unavailable.

### Bundle / RSC / payload

- AI is behind a flag and dynamically imported (`route.ts` dynamic-imports handler) → handler code is **not** in the base bundle when off. Confirm via build artifact that `src/lib/ai/**` is in a dynamic chunk.
- Client AI code (`EstimateCopilotFloatingButton.tsx`) is gated by `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` and lazy-mounted in `WorkshopPageShell.tsx` — confirm it does not bloat the workshop base bundle.

## Reliability

### Failure modes & behavior

| Failure | Current | Target |
|---|---|---|
| No API key | 503 | 503 (unchanged) + alert |
| Provider 5xx | 502 (Ask) / deterministic fallback (package-builder) | retry+jitter then 502/fallback; breaker after N consecutive fails |
| Provider timeout (>20s) | abort → 502/fallback | env-configurable timeout (REL-002) + same |
| Provider slow but responding | bounded by timeout | unchanged |
| D1 read fail in context build | error → 500-class | fail closed; audit `failed`; user-facing error |
| Apply partial failure | idempotency ledger + estimate_sheet_events rollback | unchanged; add drill (OPS-002) |
| Audit write fail | today: best-effort (except Apply authz) | **confirm fail-closed policy** for Apply authz; document best-effort for non-critical |

### Circuit breaker (target design, REL-001)

- In-memory (Worker isolate) counters keyed by provider+route. Open after `N` consecutive failures in window `W`; half-open probe; fail-closed while open (Ask → 502, package-builder → deterministic fallback).
- Caveat: Worker isolates are ephemeral; the breaker is per-isolate best-effort, not global. Document this; a global breaker would need D1/Durable Object state (out of launch scope, free-tier conscious).

## Observability

- **Audit trail (D1):** `ai_action_runs.status/error_class`, `provider_send_categories`, `usage_json`. This is the primary AI observability surface. Add a simple query/runbook to compute error-rate by `error_class` per day.
- **Workers Observability:** logs (0.1) + traces (0.05). Failed outbound fetches surface in tail. Add a log line (structured, redacted) at provider call boundaries: `{ai_route, provider, outcome, duration_ms, error_class}` — no prompt content.
- **Metrics:** none custom today. Could add Workers Analytics counters for `ai_ask_success/fail/timeout`, `ai_package_apply_success/fail`. Optional; not launch-blocking.
- **Alerts:** (hosted) error-rate spike on `/api/ai/*`, timeout-rate spike. Defined as runbook entries; not provable locally.

## Rollback triggers (performance/reliability)

- Ask timeout-rate > threshold for sustained window → flip `ARCHESTIMATOR_AI_ENABLED=false`.
- Apply failure-rate spike → flip `AI_PACKAGE_BUILDER_APPLY_*_ENABLED=false` (granular).
- Provider cost surprise → rate-limit tightening or disable.
