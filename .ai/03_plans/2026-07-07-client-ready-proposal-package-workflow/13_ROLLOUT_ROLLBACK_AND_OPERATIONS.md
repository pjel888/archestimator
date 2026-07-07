# 13 — Rollout, Rollback, and Operations

## Deployment sequencing

1. Migration `0037` applied locally → verified → applied remote (standing Cloudflare mandate) → `PRAGMA table_info` proof.
2. Feature flags dark (off) on deploy.
3. Code lands behind flags.
4. Phase 1 (readiness lib) + Phase 3 (`responded`) toggled on for Philip's workspace (closed beta) — both server-side, low-risk.
5. Phase 2 (gate) toggled on for closed beta.
6. Phase 4 (message) + Phase 5 (notifications, if DATA-04 ok) toggled on.
7. Phase 6 (UI) toggled on last.
8. Full rollout to all workspaces (no external users yet, so this is trivial).

## Feature flags (OPS-01)

| Slice | Flag (example name) | Off behavior (OPS-02 rollback) |
|---|---|---|
| Readiness gate | `PROPOSAL_READINESS_GATE_ENABLED` | gate skipped → today's "≥1 sheet" only |
| Owner message | `PROPOSAL_OWNER_MESSAGE_ENABLED` | message fields ignored → default copy |
| `responded` flip | `PROPOSAL_RESPONDED_STATUS_ENABLED` | status stays `opened` (harmless) |
| Notification dispatch | `PUBLICATION_ACTIVITY_NOTIFICATIONS_ENABLED` | no dispatch; Activity tab + digest remain |
| Preflight UI | `PROPOSAL_PREFLIGHT_UI_ENABLED` | drawer renders without preflight (today's UI) |

Flags reuse the existing rollout mechanism (verify the exact mechanism name in source at implementation time — `rg` for the existing flag pattern). Each independently toggleable.

## Rollback triggers / procedures

| Trigger | Procedure |
|---|---|
| Readiness leaks internal detail (SEC-02) | Flip `PROPOSAL_READINESS_GATE_ENABLED` + `PROPOSAL_PREFLIGHT_UI_ENABLED` off → readiness becomes no-op; hotfix DTO |
| Publish broken (happy path fails) | Flip gate flag off → today's publish behavior |
| Email regression (invite broken) | Flip `PROPOSAL_OWNER_MESSAGE_ENABLED` off → default copy |
| Notification misroute | Flip notifications flag off → Activity tab + digest remain |
| `responded` writes corrupt | Flip `responded` flag off → status stays `opened`; existing data harmless |
| Migration issue | Nullable columns → fix-forward or ignore; no revert needed |

No destructive rollback required; all rollback is flag-based. Migration `0037` is nullable → safe to leave in place.

## Observability (summary; detail in 09)

- Structured logs: `readiness_blocked`, `readiness_unavailable`, notification dispatch failures (no PII).
- Existing: email circuit breaker, activity feed, audit events.
- No new dashboards for v1 (closed beta). Runbook: structured-log grep for `readiness_blocked` count + `readiness_unavailable` (zero expected).

## Release gates

| Gate | Blocks merge? | Blocks closed-beta? | Blocks full rollout? |
|---|---|---|---|
| `bun run type-check` green | yes | — | — |
| `bun run lint` + `lint:design-system` green | yes | — | — |
| All new + regression tests green | yes | — | — |
| PERF-01 bench p95 ≤ 50 ms | yes | — | — |
| `bun run validate` + `bun run build` green (shared/auth/data → broad justified) | yes | — | — |
| Migration `0037` applied remote + `PRAGMA` proof | — | yes | — |
| Manual smoke: publish/send/decide/resend/revoke on closed beta | — | yes | yes |
| No `readiness_unavailable` in logs over 24h closed-beta | — | — | yes |
| SEC-02 redaction test green | yes | — | — |
| SEC-06 cross-pub test green | yes | — | — |

## Post-release verification

- Watch structured logs for `readiness_unavailable` (should be zero).
- Confirm `responded` flips appear in activity feed on decisions.
- Confirm recipients receive owner-composed message (manual smoke).
- Confirm Preflight renders for owners.

## Rollout performance gates (PERF relevant)

| Metric | Baseline | Target | Source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| Drawer TTI (open → readiness visible) | today's drawer TTI (local) | ≤ baseline + 30 ms p95 | local bench / React Profiler | > baseline + 50 ms p95 | flip Preflight UI flag off |
| `computeProposalReadiness` p95 | n/a (new) | ≤ 50 ms at export-cap fixture | PERF-01 bench | > 50 ms p95 | move prefetch off critical path or flip gate flag off |
| Decision submit latency | today's decision submit | ≤ baseline + 5 ms (one indexed UPDATE) | action test | > baseline + 20 ms | flip `responded` flag off |
| Publish latency | today's publish | ≤ baseline + 50 ms (readiness pre-write) | action test / logs | > baseline + 100 ms | flip gate flag off |

Hosted/production metrics unavailable (closed beta, no external users); local + structured-log evidence is proportional and sufficient per AGENTS.md.

## Operational notes

- Owner message is sender-authored PII → redact from logs at info level (debug-only behind flag).
- Bounce gap (REL-01) is an operational known-limitation; support must not promise "delivered to inbox" — only "sent" / "opened" / "responded".
