# 04 — Requirements Specification

Each requirement has a stable ID, statement, rationale, source, priority, dependencies,
acceptance criteria, validation method, affected code areas, risks, and status. Priorities:
`P0` (blocks first-user readiness), `P1` (should have for closed beta), `P2` (nice-to-have /
deferred). Sources use the strength labels from the Multi-Agent Execution Directive.

Legend for status: `pending` (this plan only — implementation is future work).

---

## FR — Functional

### FR-01 — Real Durable Object runtime in tests
- **Statement:** The `CollaborationRoom` DO is exercised through its real lifecycle
  (accept, message, hibernate, wake, close, error) by `@cloudflare/vitest-pool-workers`/
  Miniflare, not only against fake `ctx`/sockets.
- **Rationale:** F1 — current tests never run the real hibernation API, so eviction,
  rehydrate, and close/error are unproven.
- **Source:** `repo evidence` (test inventory lane).
- **Priority:** P0.
- **Dependencies:** none.
- **Acceptance criteria:**
  - AC-FR-01a: A vitest project/config runs the DO tests under the workers pool; the suite
    is green.
  - AC-FR-01b: At least one test triggers hibernation (no events) and a subsequent wake, and
    asserts presence rehydrates from attachments (DEC-DO-02), not from stale memory.
  - AC-FR-01c: The existing identity/authz unit tests continue to pass unchanged.
- **Validation method:** `bun run test:dom` (or a new `test:do` script) green on the realtime
  subset; `bun run type-check`.
- **Affected code areas:** `package.json`, `vitest.config.ts`, new test file(s) under
  `tests/vitest/`, possibly a `wrangler.test.jsonc`.
- **Risks:** pool-workers version compat with `wrangler ^4.105.0`; jsdom project must stay
  separate (R1 in `14_…`).
- **Status:** pending.

### FR-02 — DO branch coverage
- **Statement:** Assert every DO branch: `message_too_large` (>4096 B), `binary_not_supported`,
  `invalid_event` (>80 chars), `invalid_json`, `unsupported_message`, `webSocketClose`,
  `webSocketError`, and the `426 websocket_upgrade_required` response.
- **Rationale:** F2 — these are untested today.
- **Source:** `repo evidence`.
- **Priority:** P0.
- **Dependencies:** FR-01.
- **Acceptance criteria:** AC-FR-02a: each branch has a passing test asserting the exact
  error code/close behavior.
- **Validation method:** targeted vitest under the workers pool.
- **Affected code areas:** new/extended DO tests.
- **Risks:** none material.
- **Status:** pending.

### FR-03 — Stable, hibernation-safe presence keying
- **Statement:** Presence is keyed by a stable per-user id derived from the verified envelope
  `sub`, not `connection:${index}`; the presence snapshot is rebuilt from
  `getWebSockets()`+attachments on every change and on wake.
- **Rationale:** F3 — index-based keying shifts on churn and is wiped on hibernation.
- **Source:** `repo evidence` + `durable-objects` skill (persist-first / rehydrate rule).
- **Priority:** P0.
- **Dependencies:** FR-01.
- **Acceptance criteria:**
  - AC-FR-03a: two simultaneous sockets of the same user collapse to one presence entry.
  - AC-FR-03b: after hibernate→wake, presence equals the set of still-connected authorized
    sockets (no ghost entries, no dropped entries).
  - **AC-FR-03c (P1-3 fix):** the `hasOwn(attachment, "presence")` invariant is preserved —
    a socket that sent `presence-untrack` (attachment rewritten to `{roomName, authorized}`,
    no `presence` key) is **absent** from the next snapshot while remaining authorized;
    re-track re-adds it. The stable-`sub` keying must distinguish "authorized but not
    tracking" from "tracking with a payload."
- **Implementation note (P1-3):** the current code keys presence inclusion on
  `Object.hasOwn(attachment, "presence")` (`collaboration-room.ts:196`). The FR-03 rewrite
  must keep that distinction: key by `attachment.authorized.sub` **only when** the attachment
  has a `presence` field, otherwise skip. Keying by `sub` unconditionally would leak an
  empty/ghost entry for an untracked-but-authorized socket.
- **Validation method:** workers-pool test simulating churn + hibernate/wake.
- **Affected code areas:** `src/lib/cloudflare/collaboration-room.ts` (`readPresenceState`,
  `broadcastPresenceState`).
- **Risks:** R2 (presence regression) — preserve the "authorized peers only" property.
- **Status:** pending.

### FR-04 — Per-DO connection cap with reject close code
- **Statement:** A configurable per-DO connection cap (default per OPEN-01, e.g. 256) rejects
  new connections above the cap with a documented close code (e.g. `1013 try again later`),
  before authorization, and emits a telemetry event.
- **Rationale:** F5/F9 — unbounded growth risks free-tier CPU/memory and GB-s; caps must be
  explicit.
- **Source:** `brief` (socket caps) + `repo evidence`.
- **Priority:** P0.
- **Dependencies:** FR-01; OPEN-01 (numeric value).
- **Acceptance criteria:**
  - AC-FR-04a: cap+1th connection is rejected with the chosen code; existing connections
    unaffected.
  - AC-FR-04b: a `cap_exceeded` telemetry event fires.
  - AC-FR-04c: cap is read from `env`/`vars` (runtime), not `NEXT_PUBLIC_*`.
  - **AC-FR-04d (P1-5 fix):** rejection is **pre-handshake** — when
    `getWebSockets().length >= cap`, `fetch` returns a non-101 response (e.g.
    `Response.json({error:"room_full"}, {status:503})`) **without** completing the WebSocket
    upgrade (no socket created, no HMAC cost). Close-code `1013` is only used if a future
    client contract requires an accepted-then-closed path.
- **Validation method:** workers-pool test opening N+1 sockets.
- **Affected code areas:** `src/lib/cloudflare/collaboration-room.ts` (`fetch`/`accept`);
  `wrangler.jsonc` `vars`.
- **Risks:** R3 (cap too low for legitimate load) — mitigated by OPEN-01 + telemetry.
- **Status:** pending (numeric value BLOCKED on OPEN-01; mechanism is implementation-ready).

### FR-05 — Per-sender broadcast rate cap + backoff
- **Statement:** Each authorized sender has a per-window broadcast budget (e.g. N msgs/sec,
  value per OPEN-01); over-budget messages are dropped with a `rate_limited` telemetry event
  and the client backs off.
- **Rationale:** F9 — no per-message rate limit on the DO today.
- **Source:** `brief` (fanout budgets) + Teamspace T1.3 (deferred server-side limit).
- **Priority:** P1.
- **Dependencies:** FR-01; OPEN-01.
- **Acceptance criteria:**
  - AC-FR-05a: a sender exceeding the budget receives `rate_limited` for excess messages and
    the DO stops fanning them out; budget resets each window.
  - AC-FR-05b: applies to `broadcast` **and** `presence-track` (R-SEC-04).
  - **AC-FR-05c (P1-4 fix):** the rate window is keyed by **`attachment.authorized.sub`**
    (the verified identity), **never** `parsed.payload.userId` (untrusted wire field), for
    both `broadcast` and `presence-track`. A sender rotating its claimed `userId` cannot
    reset the budget.
- **Validation method:** workers-pool test spamming broadcasts and presence-tracks, including
  a claimed-userId-rotation case (AQ-rot).
- **Affected code areas:** `src/lib/cloudflare/collaboration-room.ts` (`webSocketMessage`
  broadcast + presence-track paths).
- **Risks:** R4 (legit burst dropped) — mitigated by a sensible window + client backoff.
- **Status:** pending.

### FR-06 — Reconnect with re-authorize + proactive token refresh
- **Statement:** On reconnect (client retry or deploy-disconnect), the client re-issues
  identity (envelope + room token) and re-authorizes the new socket before tracking. The
  client proactively refreshes both credentials before their 300s expiry while subscribed.
- **Rationale:** F4 — no refresh today; sessions >5 min hit `auth_failed` with no recovery.
- **Source:** `repo evidence`.
- **Priority:** P0.
- **Dependencies:** none.
- **Per-hook current state (P1-1 fix — these start from DIFFERENT baselines):**
  - `use-project-presence.ts`: **already has** `scheduleResubscribe()` (3 retries, linear
    backoff `min(1000*retries,5000)`) and re-runs `provisionIdentity()`→`authorize()` on
    reopen (lines 270-278, 248). So re-authorize-on-reconnect **partially exists** for
    presence. **Missing:** proactive refresh-before-expiry, and fresh-envelope-on-re-track.
  - `use-estimate-cursor-broadcast.ts`: **has NO reconnect/retry loop at all** — on `CLOSED`
    it only sets status; cursors die until a dependency changes. Must **add** a reconnect
    loop.
  - `use-estimate-row-update-broadcast.ts`: **has NO reconnect/retry loop** (subscribe
    callback handles `SUBSCRIBED` only). Must **add** a reconnect loop.
- **Acceptance criteria:**
  - AC-FR-06a: a session held >5 min does not emit `auth_failed`; presence/cursors continue.
  - AC-FR-06b: after a server-initiated close (e.g. deploy), **all three** hooks reconnect
    and re-authorize within the backoff budget (presence today; cursor/row must be added).
  - **AC-FR-06c (P1-2 fix):** a surface-change re-track uses a fresh envelope when the cached
    one is within **`ENVELOPE_REFRESH_LEAD_SECONDS`** (a new constant, e.g. 60s) of expiry —
    **not** `CLOCK_SKEW_MS` (which is the future-`iat` grace window, a different concept).
    Define `ENVELOPE_REFRESH_LEAD_SECONDS` and key the re-track refresh on
    `exp - now < lead`, independent of `CLOCK_SKEW_MS`.
- **Validation method:** DOM test with fake timers covering >300s; reconnect test with a
  forced close.
- **Affected code areas:** `src/hooks/use-project-presence.ts`,
  `use-estimate-cursor-broadcast.ts`, `use-estimate-row-update-broadcast.ts`,
  `src/lib/cloudflare/collaboration-room-client.ts`, possibly a refresh path in
  `realtime-identity-actions.ts`.
- **Risks:** R5 (refresh storm) — refresh should be jittered and per-client, not global.
- **Status:** pending.

### FR-07 — Stale-presence cleanup (heartbeat + prune-on-alarm)
- **Statement:** The DO uses `ctx.setWebSocketAutoResponse` for cheap ping/pong and a single
  DO alarm (at-least-once, ≤15-min wall budget) to prune sockets that have not ponged within
  a deadline, broadcasting a corrected presence snapshot.
- **Rationale:** F3/F10 — half-open sockets and hibernation can leave stale presence.
- **Source:** `durable-objects` best practices + `repo evidence`.
- **Priority:** P1.
- **Dependencies:** FR-03.
- **Acceptance criteria:**
  - AC-FR-07a: a socket that stops ponging is pruned within the deadline; its presence is
    removed from the next snapshot.
  - AC-FR-07b: the alarm reschedules itself only while the room has live sockets (no idle
    alarm loop → no GB-s bleed).
- **Validation method:** workers-pool test with a silent socket + alarm advance.
- **Affected code areas:** `src/lib/cloudflare/collaboration-room.ts` (alarm + auto-response).
- **Risks:** R6 (alarm prevents hibernation) — alarm must be cleared when room empties.
- **Status:** pending.

### FR-08 — Storage lifecycle decision (storage-free presence)
- **Statement:** The DO remains storage-free for presence (ephemeral by design); SQLite is
  explicitly reserved for a future audit/seat-count feature; the decision is documented in
  code comments and `decisions.md`.
- **Rationale:** F6 — `new_sqlite_classes` is provisioned but unused; make it intentional.
- **Source:** `repo evidence`.
- **Priority:** P1.
- **Dependencies:** none.
- **Acceptance criteria:** AC-FR-08a: code comment + `decisions.md` entry state the decision
  and the conditions that would reverse it.
- **Validation method:** doc review.
- **Affected code areas:** `src/lib/cloudflare/collaboration-room.ts` (comment),
  `.ai/10_state/decisions.md` (future impl).
- **Risks:** none.
- **Status:** pending.

---

## REL — Reliability

### REL-01 — Degradation behavior documented and tested
- **Statement:** Behavior under (a) transport disabled, (b) DO cold-start (first message
  after eviction), (c) partial network loss, (d) token secret missing, (e) deploy-disconnect,
  is documented in a runbook and at least cold-start + deploy-disconnect are tested.
- **Rationale:** F7/F10 — unmodeled today.
- **Source:** `brief` (failure recovery + degradation).
- **Priority:** P0.
- **Dependencies:** FR-01, FR-06.
- **Acceptance criteria:**
  - AC-REL-01a: cold-start test: DO evicted → first message wakes it → presence rehydrates →
    broadcast succeeds.
  - AC-REL-01b: deploy-disconnect test: client receives close → reconnects → re-authorizes.
  - AC-REL-01c: runbook covers all five cases with detection/recovery/rollback.
- **Validation method:** workers-pool tests + doc review.
- **Affected code areas:** tests; `13_…` runbook (this plan).
- **Risks:** none material.
- **Status:** pending.

### REL-02 — Production telemetry sink wired
- **Statement:** The six realtime event types are emitted to a production sink (Workers
  Observability logs via structured `console.*`, already enabled at head_sampling_rate 0.1),
  with a documented redaction rule (no raw path/topic secrets).
- **Rationale:** F8 — events silently drop in prod today.
- **Source:** `repo evidence`.
- **Priority:** P1.
- **Dependencies:** OPEN-03 (sink choice).
- **Acceptance criteria:** AC-REL-02a: a `channel_error` in prod appears in Workers Logs;
  AC-REL-02b: no secret/raw-path appears in the log line.
- **Validation method:** hosted `wrangler tail` probe (if OPEN-02) or local structured-log
  assertion.
- **Affected code areas:** `src/lib/collaboration/realtime-telemetry.ts` (default sink).
- **Risks:** R7 (PII in logs) — redaction rule must be explicit.
- **Status:** pending (sink choice BLOCKED on OPEN-03).

---

## PERF — Performance

### PERF-01 — End-to-end delivery latency budget + evaluator
- **Statement:** Define and measure p50/p95 end-to-end broadcast delivery (sender send → last
  authorized peer receives) at the chosen cap (OPEN-01), with a documented budget and
  regression threshold.
- **Rationale:** F5 — no latency proof today.
- **Source:** `brief` (latency).
- **Priority:** P1.
- **Dependencies:** FR-01, FR-04; OPEN-01.
- **Acceptance criteria:** see the Performance Evaluator Contract in `19_…`.
- **Validation method:** synthetic fanout timer harness under Miniflare (and hosted probe if
  OPEN-02).
- **Affected code areas:** new harness under `scripts/` or `tests/vitest/`.
- **Risks:** R8 (Miniflare timing ≠ prod) — labelled as inference, not provider proof.
- **Status:** pending.

---

## SEC — Security (preservation, not new surface)

### SEC-01 — Authz and coarse-surface contracts preserved
- **Statement:** No change weakens: (a) authorize-before-broadcast/presence, (b) topic+exp
  re-check on every message, (c) presence withheld from unauthorized peers, (d) coarse
  `activeSurface` only on `project:{id}`, (e) Ed25519 envelope verified by receivers.
- **Rationale:** These are the load-bearing security properties; hardening must not regress them.
- **Source:** `repo evidence` + `decisions.md`.
- **Priority:** P0.
- **Dependencies:** all FR-*.
- **Acceptance criteria:** AC-SEC-01a: existing auth/identity authz tests remain green;
  AC-SEC-01b: new tests assert an unauthorized socket still cannot broadcast or read presence;
  AC-SEC-01c: cap/rate-limit/refresh do not leak raw path/estimate/tab/cell.
- **Validation method:** the existing `cloudflare-collaboration-room-auth.test.ts`,
  `realtime-identity.test.ts`, `realtime-identity-actions-authz.test.ts` + new denial tests.
- **Affected code areas:** tests (denial matrix).
- **Risks:** R9 (refresh path adds a new server-action surface) — must pass the same authz probe.
- **Status:** pending.

### SEC-02 — Connection cap rejects before authorization
- **Statement:** The cap is enforced before `verifyRealtimeRoomToken` so an attacker cannot
  exhaust CPU by forcing token verification at scale.
- **Rationale:** cap-then-authz ordering prevents a DoS amplifier.
- **Source:** `derived` (security best practice).
- **Priority:** P0.
- **Dependencies:** FR-04.
- **Acceptance criteria:** AC-SEC-02a: a flood of upgrade requests beyond the cap is
  rejected at the upgrade step without per-message HMAC cost.
- **Validation method:** workers-pool test.
- **Affected code areas:** `src/lib/cloudflare/collaboration-room.ts` (`fetch`).
- **Risks:** none.
- **Status:** pending.

---

## OPS — Operations

### OPS-01 — Rollback knobs + runbook
- **Statement:** Every new behavior is rollback-able via existing kill-switches or a new
  runtime `vars` knob; the runbook (`13_…`) names the knob, the trigger, and the steps.
- **Rationale:** `AGENTS.md` rollback policy; PROMPT.md "degradation behavior".
- **Source:** `repo evidence` + `brief`.
- **Priority:** P0.
- **Dependencies:** all.
- **Acceptance criteria:** AC-OPS-01a: cap/rate-limit/refresh can be disabled without a
  redeploy where feasible, or via redeploy otherwise; AC-OPS-01b: runbook present.
- **Validation method:** doc review + (if feasible) a knob-toggle test.
- **Affected code areas:** `wrangler.jsonc` `vars`; `13_…`.
- **Risks:** R10 (NEXT_PUBLIC_* is build-time) — runtime knobs must be `vars`/secrets.
- **Status:** pending.

---

## TEST — Testing

### TEST-01 — Synthetic load harness (fanout/presence/broadcast)
- **Statement:** A Miniflare harness opens N clients (N = chosen cap), one broadcasts, and
  asserts all N receive within the PERF-01 budget; a presence-churn variant and a broadcast-
  rate-soak variant exist.
- **Rationale:** F5 — no load proof today.
- **Source:** `brief` (synthetic load proof).
- **Priority:** P0.
- **Dependencies:** FR-01, FR-04, PERF-01.
- **Acceptance criteria:** AC-TEST-01a: harness runs green at the chosen cap; AC-TEST-01b:
  harness proves the cap rejection (FR-04) under load.
- **Validation method:** the harness itself.
- **Affected code areas:** new harness.
- **Risks:** R8.
- **Status:** pending.

### TEST-02 — Hosted smoke (presence + reconnect + token-expiry)
- **Statement:** Extend `scripts/verify-cloudflare-hosted-collaboration-ui-proof.ts` (or a
  sibling) to cover: presence sync between two clients, reconnect-after-close, and
  survive-token-expiry (>300s session). **Only required if OPEN-02 approves hosted soak.**
- **Rationale:** F5/F7 — only cursors are smoke-tested today.
- **Source:** `brief` (hosted smoke proof) + verification policy (browser proof only when
  needed).
- **Priority:** P1 (P0 if OPEN-02 approves hosted soak).
- **Dependencies:** OPEN-02; FR-06.
- **Acceptance criteria:** AC-TEST-02a: the three scenarios pass against the production
  Worker; AC-TEST-02b: evidence is redacted (no secrets/paths).
- **Validation method:** the script (`cf:verify-hosted-collaboration-ui` or a new
  `cf:verify-hosted-realtime`).
- **Affected code areas:** `scripts/verify-cloudflare-hosted-collaboration-ui-proof.ts` or
  new sibling.
- **Risks:** R11 (browser automation is opt-in) — gated on OPEN-02; if declined, document the
  gap and rely on TEST-01 + REL-01.
- **Status:** pending (BLOCKED on OPEN-02).

---

## DOC — Documentation

### DOC-01 — Code + decisions documentation
- **Statement:** Decision rationale for presence keying, storage-free DO, caps, refresh,
  telemetry sink, and degradation is recorded in code comments and `.ai/10_state/decisions.md`
  (future impl updates the latter).
- **Rationale:** `AGENTS.md` "If project reality changes, update current-state.md and the
  relevant canonical doc."
- **Source:** `repo policy`.
- **Priority:** P1.
- **Dependencies:** all.
- **Acceptance criteria:** AC-DOC-01a: comments + decision entry present.
- **Validation method:** doc review.
- **Affected code areas:** source comments; `.ai/10_state/decisions.md` (future impl).
- **Risks:** none.
- **Status:** pending.

---

## Shadow-Path Matrices (per behavior-bearing flow)

### Flow A — Socket upgrade + authorize
| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Upgrade+authorize | 101 + `{authorized}` | missing token → `auth_failed` | empty token → `auth_failed` | malformed JSON → `invalid_json` | wrong-topic/expired token → `auth_failed` | secret missing → `auth_failed` | two sockets same user → collapse (FR-03) | re-authorize on reconnect (FR-06) | presence/cursors work / blocked | FR-01, FR-02, SEC-01 |

### Flow B — Broadcast
| Flow | Happy path | Nil/missing | Empty | Invalid | Auth denied | Upstream error | Concurrency | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| broadcast | peers receive | missing event → `invalid_event` | empty payload → delivered null | >4096B → `message_too_large` | unauthorized → `auth_required` | peer send fails → close 1011 | many senders → rate cap (FR-05) | dedup not guaranteed (idempotent app events) | remote update / dropped | FR-02, FR-05, SEC-01 |

### Flow C — Presence track/untrack
| Flow | Happy | Nil/missing | Empty | Invalid | Auth denied | Upstream error | Concurrency | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| presence-track | snapshot updated | missing payload → attachment has no presence | n/a | non-object → ignored | unauthorized → no snapshot to peer | broadcast fails → close | churn → stable key (FR-03) | re-track refreshes timestamp | avatar/online state | FR-03, FR-07, SEC-01 |
| presence-untrack (while authorized) | user disappears from snapshot, socket stays authorized | n/a | n/a | n/a | n/a | n/a | re-track re-adds | idempotent untrack | no avatar | FR-03 AC-FR-03c (P1-3) |

### Flow D — Reconnect / token refresh
| Flow | Happy | Nil/missing | Empty | Invalid | Auth denied | Upstream error | Concurrency | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| reconnect | re-subscribe+authorize | no identity → no subscribe | n/a | stale envelope → peer-reject | authz fails → null identity | close (deploy) → backoff | many clients reconnect → jitter (R5) | refresh is idempotent per client | session continues / pauses | FR-06, REL-01 |

### Flow E — Cap / rate-limit
| Flow | Happy | Nil/missing | Empty | Invalid | Auth denied | Upstream error | Concurrency | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| cap | within cap | n/a | n/a | n/a | cap rejects before authz (SEC-02) | n/a | flood → reject 1013 | client retries with backoff | "room full" / degraded | FR-04, FR-05, SEC-02 |
