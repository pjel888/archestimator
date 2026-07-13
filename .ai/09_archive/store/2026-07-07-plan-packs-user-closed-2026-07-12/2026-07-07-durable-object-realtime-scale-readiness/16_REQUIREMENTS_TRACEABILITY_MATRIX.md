# 16 — Requirements Traceability Matrix

Source-strength taxonomy: `brief` (PROMPT.md) · `repo evidence` (current source/test/config) ·
`official docs` (Cloudflare/Next.js docs) · `derived` (inferred from architecture) ·
`assumption` (unverified, labelled) · `owner-delegated` (planning decision under owner grant).

Source IDs:
- `SRC-01` = `PROMPT.md` (the feature brief)
- `SRC-02` = `src/lib/cloudflare/collaboration-room.ts` (+ router/client)
- `SRC-03` = `src/hooks/use-project-presence.ts` (+ cursor/row hooks)
- `SRC-04` = `src/lib/collaboration/realtime-room-token.ts`, `realtime-identity*.ts`
- `SRC-05` = `tests/vitest/*collab*`, `*realtime*`
- `SRC-06` = `wrangler.jsonc`, `worker.ts`, `package.json`
- `SRC-07` = `.ai/10_state/decisions.md` (Teamspace 2026-06-14 block: D-1/D-4/D-6/T1.3)
- `SRC-08` = Cloudflare official docs (durable-objects/api/websockets, platform/limits)
- `SRC-09` = `.ai/00_system/VALIDATION_MATRIX.md` + known-red ledger convention

## Primary traceability matrix

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-05 | FR-01 real DO runtime in tests | tests use fake ctx today; `@cloudflare/vitest-pool-workers` not a dep | repo evidence | 04 FR-01; 11 Phase 1 | T-1.1.1, T-1.2.1 | AC-FR-01a/b/c | `test:do` lifecycle | R1 | pending | none |
| SRC-02/05 | FR-02 DO branch coverage | branches `message_too_large`/`binary_not_supported`/`invalid_event`/`invalid_json`/`unsupported_message`/`webSocketClose`/`webSocketError`/426 untested | repo evidence | 04 FR-02; 11 Phase 1 | T-1.3.1 | AC-FR-02a | `test:do` branches | none | pending | none |
| SRC-02/08 | FR-03 stable hibernation-safe presence keying | `connection:${index}` keyed today (`collaboration-room.ts:197`); hibernation wipes memory (official docs) | repo evidence + official docs | 04 FR-03; 11 Phase 2 | T-2.1.1, T-2.3.1 | AC-FR-03a/b/c | `test:do` rehydrate + untrack-while-auth | R2 | pending | none |
| SRC-01/07 | FR-04 per-DO connection cap | brief: "socket caps"; D-1 lineage; cap absent in code + absent in `wrangler.jsonc vars` today | brief + repo evidence | 04 FR-04; 11 Phase 3 | T-3.1.1, T-3.3.1 | AC-FR-04a/b/c/d | `test:do` cap flood | R3 | pending (value) | OPEN-01 (numeric value owner-gated; mechanism ready; `vars` knob is future work) |
| SRC-01/07 | FR-05 per-sender rate cap | brief: "fanout budgets"; T1.3 deferred; absent in code today | brief + repo evidence | 04 FR-05; 11 Phase 4 | T-4.1.1 | AC-FR-05a/b/c | `test:do` rate + AQ-07b | R4 | pending (value) | OPEN-01 (value; mechanism ready) |
| SRC-03/04 | FR-06 reconnect + token refresh | no refresh; surface-change reuses stale envelope (`use-project-presence.ts:315`); cursor/row hooks have NO reconnect loop | repo evidence | 04 FR-06; 11 Phase 5 | T-5.1.1, T-5.4.1, T-5.5.1 | AC-FR-06a/b/c | `test:dom` timers (3 hooks) | R5, R9 | pending | none |
| SRC-02/08 | FR-07 stale-presence prune | half-open sockets unmodeled; `setTimeout` prevents hibernation (official docs) | repo evidence + official docs | 04 FR-07; 11 Phase 6 | T-6.1.1 | AC-FR-07a/b | `test:do` prune + alarm | R6 | pending | none |
| SRC-02/06 | FR-08 storage-free presence decision | `new_sqlite_classes:["CollaborationRoom"]` provisioned but code never reads/writes storage (`wrangler.jsonc:53-58`) | repo evidence | 04 FR-08; 11 Phase 10 | T-10.1.1 (doc) | AC-FR-08a | doc review | none | pending | none |
| SRC-01 | REL-01 degradation behavior | brief: "failure recovery" + "degradation behavior" | brief | 04 REL-01; 13 runbook | T-10.1.1 (+T-5.5.1) | AC-REL-01a/b/c | `test:do`/`test:dom` | none | pending | none |
| SRC-03/05 | REL-02 prod telemetry sink | `reportRealtimeEvent` no-ops in prod unless sink registered (`realtime-telemetry.ts:43`); none wired | repo evidence | 04 REL-02; 11 Phase 7 | T-7.1.1 | AC-REL-02a/b | unit redaction | R7 | pending | OPEN-03 (sink choice; default Workers Logs DEC-DO-07) |
| SRC-01 | PERF-01 latency budget + evaluator | brief: "latency"; no realtime latency harness today | brief | 04 PERF-01; 11 Phase 8 | T-8.1.1 | evaluator contract (`19_…`) | `perf:realtime-fanout` | R8 | pending (value) | OPEN-01 (budget finalization); label `inferred` |
| SRC-02/09 | SEC-01 authz + coarse-surface preserved | load-bearing properties in `collaboration-room.ts` + `presence-surface.ts` | repo evidence | 04 SEC-01; 08 | all (denial tests) | AC-SEC-01a/b/c | existing + new denial | R9 | pending | none |
| SRC-02 | SEC-02 cap rejects before authz | no cap today; DoS-amplifier risk | derived | 04 SEC-02; 11 Phase 3 | T-3.1.1 | AC-SEC-02a | `test:do` flood | none | pending | none |
| SRC-09 | OPS-01 rollback knobs + runbook | VALIDATION_MATRIX proportional gating; brief "degradation behavior" | repo evidence + brief | 04 OPS-01; 13 | T-10.1.1 | AC-OPS-01a/b | doc/knob review | R10 | pending | none |
| SRC-01 | TEST-01 synthetic load harness | brief: "synthetic load proof" | brief | 04 TEST-01; 11 Phase 8 | T-8.1.1 | AC-TEST-01a/b | harness | R8 | pending | none |
| SRC-01 | TEST-02 hosted smoke | brief: "hosted smoke proof" | brief | 04 TEST-02; 11 Phase 9 | T-9.1.1 | AC-TEST-02a/b | `cf:verify-hosted-realtime` | R11 | pending | OPEN-02 (hosted soak scope) |
| SRC-09 | DOC-01 code + decisions docs | repo policy (`AGENTS.md`) | repo evidence | 04 DOC-01; 11 Phase 10 | T-10.1.1 | AC-DOC-01a | doc review | none | pending | none |

Every requirement is traced to a source with strength; every work item traces back to ≥1
requirement. No requirement untraced.

## Performance-sensitive requirements → evaluator mapping

| Req | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-01 | harness p50/p95 at cap (Miniflare, `inferred`) | p95 <500ms (default; OPEN-01) | `perf:realtime-fanout` | >2× baseline | revert/raise cap |
| FR-04 | n/a (cap absent in code today) | cap not hit at closed-beta load | `cap_exceeded` in Workers Logs | sustained >0 | raise `ARCH_REALTIME_ROOM_CAP` (future `vars` entry) |
| FR-05 | n/a (rate cap absent in code today) | rate not hit by legit bursts | `rate_limited` in Workers Logs | sustained per-sender | raise `ARCH_REALTIME_SEND_BUDGET` (future `vars` entry) |

## Note on "knob present" rollout-checks

The prior version marked FR-04/FR-05 rollout checks "cap/budget knob present." That was
forward-looking: `wrangler.jsonc` currently contains **no** `ARCH_REALTIME_ROOM_CAP` or
`ARCH_REALTIME_SEND_BUDGET` entry (only `ARCH_UPLOAD_*`). Those `vars` are T-3.3.1/T-4.1.1
future work. Rollout-check is therefore "pending," not "present," until those tasks land.
