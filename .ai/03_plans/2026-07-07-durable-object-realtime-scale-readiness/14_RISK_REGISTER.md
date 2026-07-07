# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R1 | `@cloudflare/vitest-pool-workers` version incompatible with `wrangler ^4.105.0`/Bun | adding the devDep | M | M | M | tests | `test:do` fails to boot | pin a compatible version; check pool-workers changelog | version pin | fall back to extended fake-ctx tests (weaker) | impl | low | open |
| R2 | Presence regression from key change | FR-03 | L | H | M/H | presence UX | presence tests | SEC-01 tests | revert keying | revert Phase 2 | impl | low | open |
| R3 | Cap too low for legit closed-beta load | FR-04 | L | M | M | collaboration | `cap_exceeded` events | OPEN-01; telemetry | raise cap | raise `ARCH_REALTIME_ROOM_CAP` | owner/impl | low | open |
| R4 | Rate-cap drops legit bursts | FR-05 | M | M | M | cursors/rows | `rate_limited` events | OPEN-01; client backoff | raise budget | raise `ARCH_REALTIME_SEND_BUDGET` | impl | low | open |
| R5 | Refresh storm (thundering herd at expiry) | FR-06 | M | M | M | Server Action | authz probe load | jitter per client | jitter | disable transport | impl | low | open |
| R6 | Alarm prevents hibernation (GB-s bleed) | FR-07 | M | M | M | free-tier cost | GB-s metrics | clear-when-empty + test | test asserts hibernation | clear alarm manually | impl | low | open |
| R7 | Telemetry PII leak | REL-02 | L | H | M/H | privacy | log review | redaction rule + test | redaction | revert Phase 7 | impl | low | open |
| R8 | Miniflare timing ≠ prod | PERF-01/TEST-01 | H | M | M | perf claims | n/a | label `inferred` | hosted probe (OPEN-02) | document gap | impl | medium | open |
| R9 | Refresh path authz oracle abuse | FR-06 | L | H | M/H | security | denial test | reuse existing probe | denial test | revert Phase 5 | impl | low | open |
| R10 | NEXT_PUBLIC_* is build-time (no runtime toggle) | OPS-01 | M | L | L | rollback | n/a | use `vars` for runtime knobs | `vars` | redeploy | impl | low | open |
| R11 | Browser automation is opt-in / flaky | TEST-02 | M | M | M | hosted proof | Playwright flake | gate on OPEN-02; redact evidence | rely on TEST-01+REL-01 | decline hosted soak | owner/impl | medium | open |
| R12 | Owner unavailable for OPEN-01/02/03 | all | M | M | M | scope | n/a | proceed with documented defaults | defaults | defer affected slices | owner | medium | open |
| R13 | DO code-deploy disconnects all sockets at an awkward moment | platform behavior | M | L | L | UX | n/a | FR-06 reconnect | reconnect | user retries | impl | low | open |
| R14 | Concurrent-agent edit conflict on `collaboration-room.ts` | shared worktree | M | M | M | impl | git status / ledger | file-scope ownership; small diffs | re-read before edit | coordinate | impl | low | open |
| R15 | **Issuance rate-limit absent on `issueRealtimeIdentity` Server Action** (SEC-OPEN-01) | a caller loops the authz-probe-then-issue path to burn D1/CPU or enumerate membership timing | M | M | M | security/authz | Workers Logs on issuance spike | add a D1-backed per-user limiter (FR-06 refresh must share it), or accept short-TTL (300s) + authz-probe cost as the closed-beta bound | limiter or owner acceptance | owner decision (SEC-OPEN-01) | medium | open |

No critical (severity H/H) unmitigated risk remains. R2/R7/R9 are H-impact but low-probability
with strong mitigations and denial tests. R15 (SEC-OPEN-01) is owner-gated, not a blocker for
the DO-hardening slices.
