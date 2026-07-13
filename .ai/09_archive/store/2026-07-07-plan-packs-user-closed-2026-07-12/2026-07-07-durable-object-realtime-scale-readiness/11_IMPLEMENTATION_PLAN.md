# 11 — Implementation Plan (authoritative execution guide)

This is the initial execution guide for the future implementation AI. If
`Create-Implementation-Prompt.md` later produces `IMPLEMENTATION_PLAN.md`, that file
supersedes this one for execution.

Phase order respects dependencies. Each phase carries a durable-goal contract
(ultragoal-style). Complexity: S/M/L/XL. Parallelization: `parallel-safe` /
`sequential-dep` / `sequential-shared` / `not-worth-delegating`.

---

## Phase 0 — DISCOVERY (optional, only if OPEN-01 unresolved at exec time)

**Goal DG-0:** Confirm numeric caps + hosted-soak scope before behavior-bearing phases.
- **Objective:** resolve OPEN-01 (cap values) and OPEN-02 (hosted soak) with the owner.
- **Scope:** owner decision only; no code.
- **Requirements covered:** informs FR-04, FR-05, PERF-01, TEST-02.
- **Required evidence:** owner sign-off recorded in `.ai/10_state/decisions.md`.
- **Completion audit:** decision recorded with values + rationale.
- **Stop condition:** owner decision OR proceed with default assumptions (ASSUMP-04 +
  decline hosted soak) explicitly recorded.
- **Blocker condition:** owner unavailable → proceed with defaults; mark TEST-02/PERF-01
  hosted slice as deferred.
- **Status:** DISCOVERY-REQUIRED (safe, read/decision only).

> If the owner is unavailable, the executor may proceed with the documented defaults and
> mark the open items in `17_…`. Phases 1–9 are implementation-ready regardless.

---

## Phase 1 — Real DO test runtime (DEC-DO-01)

**Goal DG-1:** The `CollaborationRoom` DO runs under `@cloudflare/vitest-pool-workers`/
Miniflare in tests, exercising the real hibernation lifecycle.

- **Requirements:** FR-01, FR-02.
- **Prerequisites:** none.
- **Dependencies:** none.
- **Work packages:**
  - **WP-1.1** Add `@cloudflare/vitest-pool-workers` devDep; add a vitest project
    (`test:do` script) with a minimal `wrangler.test.jsonc` binding `COLLAB_ROOMS`.
  - **WP-1.2** Port the existing `cloudflare-collaboration-room-auth.test.ts` scenarios to
    the real DO (upgrade, authorize happy/denied, broadcast-to-peer, presence snapshot).
  - **WP-1.3** Add branch tests: `message_too_large`, `binary_not_supported`,
    `invalid_event`, `invalid_json`, `unsupported_message`, `webSocketClose`,
    `webSocketError`, `426` upgrade (FR-02).
- **Exact affected paths:**
  - `package.json` (new devDep + `test:do` script)
  - `vitest.config.ts` (new project) — keep jsdom project intact
  - new `wrangler.test.jsonc` (DO binding + compat)
  - new `tests/vitest/do/collaboration-room.lifecycle.test.ts` (or similar)
- **Relevant symbols:** `CollaborationRoom.fetch/webSocketMessage/webSocketClose/webSocketError/authorizeSocket/broadcast/broadcastPresenceState`.
- **New files:** see above.
- **Existing files modified:** `package.json`, `vitest.config.ts`.
- **Interfaces/contracts:** none new.
- **Data implications:** none.
- **Security implications:** none (test-only).
- **Performance implications:** test-suite time; respect flake-budget sibling pack.
- **Server/client boundary:** none.
- **Streaming/Suspense:** none.
- **Cache/revalidation:** none.
- **Bundle/RSC/API payload:** none.
- **DB query/index:** none.
- **Render/client-state:** none.
- **Tailwind/design-system:** none.
- **Cloudflare resource boundary:** test binding only; no production binding change.
- **Validation commands:** `bun run test:do`; `bun run type-check`
  (`NODE_OPTIONS=--max-old-space-size=8192`); `git diff --check`.
- **Tests required:** the new lifecycle/branch tests.
- **Acceptance criteria:** AC-FR-01a/b/c, AC-FR-02a.
- **Exit criteria:** `test:do` green; jsdom suite still green.
- **Rollback:** remove the devDep + project; the jsdom suite is unaffected.
- **Risks:** R1 (pool-workers/wrangler version compat) — pin a compatible version.
- **Documentation:** none.
- **Parallelization:** WP-1.1 sequential-dep (WP-1.2/1.3 depend on it); WP-1.2/1.3 parallel-safe.

### Tasks
- **T-1.1.1** (FR-01; S; not-worth-delegating): add devDep + script + config.
  - Target: `package.json`, `vitest.config.ts`, `wrangler.test.jsonc`.
- **T-1.2.1** (FR-01; M; parallel-safe after T-1.1.1): port auth/broadcast/presence scenarios.
  - Target: new `tests/vitest/do/collaboration-room.lifecycle.test.ts`.
- **T-1.3.1** (FR-02; M; parallel-safe after T-1.1.1): add branch tests.
  - Target: same file or sibling.

---

## Phase 2 — Presence hardening (DEC-DO-02) — sequential-shared with Phase 1

**Goal DG-2:** Presence is keyed by stable per-user id and survives hibernation.

- **Requirements:** FR-03, SEC-01 (partial), SEC-03.
- **Prerequisites:** Phase 1 (need the real DO to prove rehydrate).
- **Dependencies:** Phase 1.
- **Work packages:**
  - **WP-2.1** In `readPresenceState`, key by `attachment.authorized.sub` (verified envelope
    subject) instead of `connection:${index}`. Collapse same-user multi-socket. **P1-3
    invariant:** only include a socket in the snapshot when `Object.hasOwn(attachment,
    "presence")` is true (preserve the untrack-while-authorized distinction — see
    AC-FR-03c). Keying by `sub` unconditionally would leak a ghost entry for an
    untracked-but-authorized socket.
  - **WP-2.2** Ensure `broadcastPresenceState` rebuilds from `getWebSockets()`+attachments
    on every call (already does; assert by test).
  - **WP-2.3** Add a hibernate→wake test: presence equals the still-connected authorized set.
    Add an untrack-while-authorized test (AC-FR-03c).
- **Exact affected paths:** `src/lib/cloudflare/collaboration-room.ts:186-202` (and
  `readPresenceState` callers).
- **Relevant symbols:** `readPresenceState`, `broadcastPresenceState`, `SocketAttachment`.
- **Existing files modified:** `collaboration-room.ts`.
- **Security implications:** R-SEC-03 — add cross-room isolation denial test.
- **Acceptance criteria:** AC-FR-03a/b, AC-SEC-01b/c (partial).
- **Exit criteria:** new tests green; existing presence tests still green.
- **Rollback:** revert keying (the client consumer is key-agnostic).
- **Parallelization:** sequential-shared (touches the same DO file as Phase 3/4/5).

### Tasks
- **T-2.1.1** (FR-03; M; sequential-shared): stable per-user keying.
- **T-2.3.1** (FR-03; M; parallel-safe with T-2.1.1 test-wise): hibernate→wake test.

---

## Phase 3 — Connection cap + cap-then-authz (DEC-DO-04, SEC-02)

**Goal DG-3:** A per-DO connection cap rejects above-limit upgrades before authz.

- **Requirements:** FR-04, SEC-02.
- **Prerequisites:** Phase 1.
- **Dependencies:** Phase 1; OPEN-01 for the numeric value (use a documented default if
  unresolved).
- **Work packages:**
  - **WP-3.1 (P1-5 fix)** In `fetch`, **before** completing the WebSocket upgrade and before
    `acceptWebSocket`, check `getWebSockets().length >= cap`; if over, return a **non-101
    response** (e.g. `Response.json({error:"room_full"}, {status:503})`) **without**
    upgrading — no socket created, no HMAC cost (SEC-02). Only use accept-then-`1013` if a
    future client contract requires a close code. Read cap from
    `env.ARCH_REALTIME_ROOM_CAP ?? default`.
  - **WP-3.2** Emit a `cap_exceeded` telemetry event.
  - **WP-3.3** Add `vars.ARCH_REALTIME_ROOM_CAP` to `wrangler.jsonc`.
- **Exact affected paths:** `src/lib/cloudflare/collaboration-room.ts:81-100` (`fetch`);
  `wrangler.jsonc`.
- **Acceptance criteria:** AC-FR-04a/b, AC-SEC-02a.
- **Exit criteria:** cap test green; existing auth tests green.
- **Rollback:** set `ARCH_REALTIME_ROOM_CAP` very high (effectively disabled).
- **Parallelization:** sequential-shared (same DO file).

### Tasks
- **T-3.1.1** (FR-04, SEC-02; M; sequential-shared): cap-then-authz + close code.
- **T-3.3.1** (FR-04; S; parallel-safe): `vars` entry.

---

## Phase 4 — Per-sender rate cap (DEC-DO-04, FR-05)

**Goal DG-4:** Per-sender fan-out budget with `rate_limited` + backoff.

- **Requirements:** FR-05, R-SEC-04.
- **Prerequisites:** Phase 1.
- **Work packages:**
  - **WP-4.1** Track per-sender window in DO memory (reset on wake is acceptable). **P1-4
    fix:** key the window by **`attachment.authorized.sub`** (verified), never
    `parsed.payload.userId`, for both `broadcast` and `presence-track`.
  - **WP-4.2** Apply to `broadcast` **and** `presence-track` (R-SEC-04).
  - **WP-4.3** Emit `rate_limited`; client backs off.
- **Exact affected paths:** `collaboration-room.ts` (`webSocketMessage`).
- **Acceptance criteria:** AC-FR-05a/b.
- **Rollback:** set `ARCH_REALTIME_SEND_BUDGET` very high.
- **Parallelization:** sequential-shared.

### Tasks
- **T-4.1.1** (FR-05; M; sequential-shared): rate cap + telemetry + env knob.

---

## Phase 5 — Reconnect + token refresh (DEC-DO-03, FR-06)

**Goal DG-5:** Sessions survive >5 min and deploy-disconnect.

- **Requirements:** FR-06, REL-01 (partial), SEC-01 (refresh path).
- **Prerequisites:** none (client-side).
- **Work packages:**
  - **WP-5.1** Add a refresh-before-expiry timer in `use-project-presence` (jittered,
    triggered when `exp - now < ENVELOPE_REFRESH_LEAD_SECONDS`, e.g. 60s, **not**
    `CLOCK_SKEW_MS`); on refresh, re-issue identity and re-authorize the **existing** socket
    if it supports it, or reconnect. Define `ENVELOPE_REFRESH_LEAD_SECONDS`.
  - **WP-5.2 (P1-1)** Presence **already** reconnects + re-authorizes via `scheduleResubscribe`/
    `provisionIdentity`; verify and extend it. **Cursor and row-update hooks currently have
    NO reconnect loop** — add `scheduleResubscribe` parity (3 retries, linear backoff) plus
    re-issue-identity-and-authorize on each reopen.
  - **WP-5.3** Ensure `buildSurfacePayload` uses a fresh envelope when the cached one is
    within `ENVELOPE_REFRESH_LEAD_SECONDS` of expiry (AC-FR-06c).
  - **WP-5.4 (P1-1)** Cursor/row hooks: **add** reconnect (they lack it today), then apply
    the same refresh-before-expiry treatment as presence.
  - **WP-5.5** DOM tests with fake timers covering >300s and a forced close, for **all three**
    hooks (presence + cursor + row).
- **Exact affected paths:** `src/hooks/use-project-presence.ts`,
  `src/hooks/use-estimate-cursor-broadcast.ts`,
  `src/hooks/use-estimate-row-update-broadcast.ts`,
  `src/lib/cloudflare/collaboration-room-client.ts`, possibly
  `src/lib/collaboration/realtime-identity-actions.ts` (if a refresh entrypoint is added).
- **Acceptance criteria:** AC-FR-06a/b/c.
- **Risks:** R5 (refresh storm) — jitter; R-SEC-02 (refresh authz) — reuse existing probe.
- **Rollback:** kill-switch `NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT=off`.
- **Parallelization:** WP-5.1–5.4 sequential-shared across hooks; WP-5.5 parallel-safe.

### Tasks
- **T-5.1.1** (FR-06; L; sequential-shared): presence refresh + reconnect.
- **T-5.4.1** (FR-06; M; sequential-shared): cursor/row hooks parity.
- **T-5.5.1** (FR-06; M; parallel-safe): DOM tests.

---

## Phase 6 — Stale-presence prune (FR-07)

**Goal DG-6:** Half-open sockets pruned via auto-response + alarm.

- **Requirements:** FR-07.
- **Prerequisites:** Phase 2.
- **Work packages:**
  - **WP-6.1** `ctx.setWebSocketAutoResponse` for a fixed ping; store `lastPong` on attachment.
  - **WP-6.2** DO alarm prunes sockets past the deadline; reschedule only while sockets exist.
  - **WP-6.3** Clear alarm when room empties (R-PERF-02).
- **Exact affected paths:** `collaboration-room.ts`.
- **Acceptance criteria:** AC-FR-07a/b.
- **Risks:** R6 (alarm prevents hibernation) — clear-when-empty + test.
- **Parallelization:** sequential-shared.

### Tasks
- **T-6.1.1** (FR-07; M; sequential-shared): auto-response + prune + alarm lifecycle.

---

## Phase 7 — Telemetry sink (REL-02)

**Goal DG-7:** Realtime events visible in production logs.

- **Requirements:** REL-02; OPEN-03 (sink choice; default to Workers Logs).
- **Work packages:**
  - **WP-7.1** Default sink: structured `console.warn` with redaction (no raw path/token/sig).
  - **WP-7.2** Unit test asserting redaction.
- **Exact affected paths:** `src/lib/collaboration/realtime-telemetry.ts`.
- **Acceptance criteria:** AC-REL-02a/b.
- **Risks:** R7 (PII) — redaction test.
- **Parallelization:** parallel-safe (distinct file).

### Tasks
- **T-7.1.1** (REL-02; S; parallel-safe): default sink + redaction + test.

---

## Phase 8 — Synthetic load harness + latency evaluator (TEST-01, PERF-01)

**Goal DG-8:** Prove fanout/presence/broadcast at the cap with a p95 budget.

- **Requirements:** TEST-01, PERF-01.
- **Prerequisites:** Phases 1–4.
- **Work packages:**
  - **WP-8.1** N-client fanout timer harness under Miniflare (one broadcasts, all N receive).
  - **WP-8.2** Presence-churn + broadcast-rate-soak variants.
  - **WP-8.3** p50/p95 report + regression threshold in the harness.
- **Exact affected paths:** new `scripts/benchmark-realtime-fanout.ts` or a vitest under
  `tests/vitest/do/`.
- **Acceptance criteria:** AC-TEST-01a/b; PERF-01 evaluator contract in `19_…`.
- **Risks:** R8 (Miniflare ≠ prod) — label as `inferred`.
- **Parallelization:** parallel-safe after Phase 4.

### Tasks
- **T-8.1.1** (TEST-01, PERF-01; L; parallel-safe): harness + report.

---

## Phase 9 — Hosted smoke (TEST-02) — conditional on OPEN-02

**Goal DG-9:** Hosted presence/reconnect/token-expiry proof.

- **Requirements:** TEST-02.
- **Prerequisites:** OPEN-02 approved; Phase 5.
- **Work packages:**
  - **WP-9.1** Extend `verify-cloudflare-hosted-collaboration-ui-proof.ts` (or a sibling
    `verify-cloudflare-hosted-realtime-proof.ts`) with: presence sync, reconnect-after-close,
    survive-token-expiry (>300s).
  - **WP-9.2** Redact evidence; record in `19_…`.
- **Exact affected paths:** `scripts/`.
- **Acceptance criteria:** AC-TEST-02a/b.
- **Risks:** R11 (browser automation opt-in) — gated on OPEN-02.
- **Parallelization:** parallel-safe.
- **Status:** BLOCKED-EXTERNAL on OPEN-02.

---

## Phase 10 — Runbook + decisions (REL-01, OPS-01, DOC-01, FR-08)

**Goal DG-10:** Degradation runbook + decision documentation.

- **Work packages:**
  - **WP-10.1** Runbook for cold-start, deploy-disconnect, cap-exceeded, telemetry
    thresholds, rollback (this plan's `13_…` is the skeleton; future impl materializes it
    into `.ai/` ops docs).
  - **WP-10.2** Code comments + `decisions.md` entry (DOC-01, FR-08).
  - **WP-10.3** Cold-start + deploy-disconnect tests (REL-01a/b).
- **Acceptance criteria:** AC-REL-01a/b/c, AC-OPS-01a/b, AC-DOC-01a, AC-FR-08a.
- **Parallelization:** parallel-safe.

---

## Implementation task → path/symbol summary

| Task | Target file | Target symbol | New/modify | Complexity | Parallelization | Status |
|---|---|---|---|---|---|---|
| T-1.1.1 | `package.json`, `vitest.config.ts`, `wrangler.test.jsonc` | (config) | modify/new | S | sequential-dep | ready |
| T-1.2.1 | `tests/vitest/do/collaboration-room.lifecycle.test.ts` | `CollaborationRoom` | new | M | parallel-safe | ready |
| T-1.3.1 | same | DO branches | new | M | parallel-safe | ready |
| T-2.1.1 | `src/lib/cloudflare/collaboration-room.ts` | `readPresenceState` | modify | M | sequential-shared | ready |
| T-2.3.1 | test file | hibernate→wake | new | M | parallel-safe | ready |
| T-3.1.1 | `collaboration-room.ts` | `fetch` | modify | M | sequential-shared | ready (value: OPEN-01) |
| T-3.3.1 | `wrangler.jsonc` | `vars` | modify | S | parallel-safe | ready |
| T-4.1.1 | `collaboration-room.ts` | `webSocketMessage` | modify | M | sequential-shared | ready (value: OPEN-01) |
| T-5.1.1 | `src/hooks/use-project-presence.ts` | `useProjectPresence` | modify | L | sequential-shared | ready |
| T-5.4.1 | cursor/row hooks | both | modify | M | sequential-shared | ready |
| T-5.5.1 | `tests/vitest/*realtime*` | (tests) | new | M | parallel-safe | ready |
| T-6.1.1 | `collaboration-room.ts` | alarm + auto-response | modify | M | sequential-shared | ready |
| T-7.1.1 | `realtime-telemetry.ts` | sink | modify | S | parallel-safe | ready (OPEN-03) |
| T-8.1.1 | `scripts/benchmark-realtime-fanout.ts` | (new) | new | L | parallel-safe | ready |
| T-9.1.1 | `scripts/verify-cloudflare-hosted-*-proof.ts` | (new/extend) | modify/new | L | parallel-safe | BLOCKED-EXTERNAL (OPEN-02) |
| T-10.1.1 | `.ai/` ops docs + `13_…` | (docs/tests) | new | M | parallel-safe | ready |

No task has approximate paths or unresolved placement. The only blockers are owner-decisions
(OPEN-01/02/03), explicitly isolated.
