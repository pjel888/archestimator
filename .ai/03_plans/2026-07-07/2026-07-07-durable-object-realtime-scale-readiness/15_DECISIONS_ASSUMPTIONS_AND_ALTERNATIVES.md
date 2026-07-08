# 15 — Decisions, Assumptions, and Alternatives

## Architectural decisions (load-bearing)

### DEC-DO-01 — Adopt `@cloudflare/vitest-pool-workers` for real DO tests
- **Problem:** The DO is never exercised under its real lifecycle (F1).
- **Constraints:** must coexist with the jsdom project; must respect the flake-budget pack.
- **Options:** (a) add pool-workers; (b) keep mocking; (c) use standalone `wrangler dev` +
  external WS client.
- **Advantages (a):** real lifecycle, hibernation, close/error; integrates with vitest.
- **Disadvantages (a):** new devDep + config; potential version compat (R1).
- **Rejected:** (b) insufficient (F1 unresolved); (c) heavier, not integrated, hard to assert.
- **Security/perf/ops implications:** test-only; R1 mitigated by version pin.
- **Recommendation:** (a). Conditions to revisit: if pool-workers goes unmaintained.

### DEC-DO-02 — Stable per-user presence key + rehydrate from attachments
- **Problem:** `connection:${index}` keying shifts on churn and is wiped on hibernation (F3).
- **Options:** (a) key by verified envelope `sub`; (b) persist presence in SQLite; (c) keep
  index but reset on wake.
- **Advantages (a):** stable; collapse same-user; survives hibernation via attachments; no
  storage write cost.
- **Rejected:** (b) unnecessary for ephemeral signal, adds write cost/retention; (c) still
  fragile under churn.
- **Recommendation:** (a). Conditions to revisit: if presence history/audit is needed (FR-08).

### DEC-DO-03 — Proactive token refresh + re-authz-on-reconnect
- **Problem:** 300s tokens with no refresh wedge sessions >5 min (F4).
- **Options:** (a) refresh-before-expiry + re-authz-on-reconnect; (b) extend TTL to 24h;
  (c) re-issue on every message.
- **Rejected:** (b) weakens short-lived-credential property; (c) too chatty.
- **Advantages (a):** preserves TTL security; transparent to user.
- **Risks:** R5 (storm) → jitter; R9 (authz oracle) → reuse probe.
- **Recommendation:** (a).

### DEC-DO-04 — Per-DO connection cap + per-sender rate cap (DO-internal)
- **Problem:** unbounded growth + no per-message limit (F5/F9).
- **Options:** (a) caps inside the DO; (b) separate rate-limiter DO; (c) Cloudflare WAF rule.
- **Rejected:** (b) the room DO is the sharded authority — simpler inside; (c) front-door
  rate-limit is a different layer and cannot see per-room/per-sender semantics easily.
- **Advantages (a):** correct sharding unit; simple; no new infra.
- **Recommendation:** (a). Numeric values per OPEN-01.

### DEC-DO-05 — Alarm-based prune + auto-response ping
- **Problem:** half-open sockets leave stale presence (F3/F10).
- **Options:** (a) DO alarm + `setWebSocketAutoResponse`; (b) `setInterval`; (c) client-only
  heartbeat.
- **Rejected:** (b) prevents hibernation (skill rule); (c) cannot prune server-side presence.
- **Advantages (a):** cheap ping (no wake); prune server-side; clear-when-empty preserves
  hibernation.
- **Risks:** R6 → clear-when-empty + test.
- **Recommendation:** (a).

### DEC-DO-06 — Storage-free presence (explicit)
- **Problem:** `new_sqlite_classes` is unused (F6).
- **Decision:** keep presence ephemeral; reserve SQLite for a future audit/seat feature.
- **Conditions to revisit:** if persistent presence/seat-count is required.

### DEC-DO-07 — Workers Observability logs as the prod telemetry sink
- **Problem:** events silently drop in prod (F8).
- **Options:** (a) structured `console.*` to Workers Logs; (b) Clarity/Sentry; (c) custom
  analytics endpoint.
- **Advantages (a):** already enabled (head_sampling_rate 0.1); no new paid sink; free-tier.
- **Rejected:** (b)/(c) add cost/complexity; defer.
- **Recommendation:** (a) now, (b)/(c) later (OPEN-03).

### DEC-DO-08 — Rate-limit inside the DO (not a separate limiter)
- **Problem:** Teamspace T1.3 deferred a server-side realtime rate limit assuming Supabase
  tiers; on a DO now (F9).
- **Decision:** enforce FR-05 inside the room DO. The DO is the single sharded authority per
  room; a separate limiter is redundant.
- **Owner confirmation:** OPEN-01 (lineage of D-1/T1.3).

## Assumptions (validated unless noted)

- **ASSUMP-01** (validated): DO is the only realtime transport (no Supabase Realtime active).
- **ASSUMP-02** (validated): free-tier DO sufficient for closed-beta.
- **ASSUMP-03** (validated): `project:{id}` presence, `estimate:{id}` cursors/rows.
- **ASSUMP-04** (assumption, OPEN-01): ~256 cap is safe and within 128MB.
- **ASSUMP-05** (validated): NEXT_PUBLIC_* flags are rollback knobs; runtime knobs need `vars`.

## Open decisions

- **OPEN-01** (owner): numeric cap + send-budget values; may enable project-wide cursors
  (D-1). **Effect if unresolved:** proceed with documented defaults (ASSUMP-04 ~256 cap; a
  documented send budget). The mechanism is implementation-ready; the value is owner-gated.
- **OPEN-02** (owner): hosted soak scope. **Effect if declined:** TEST-02/PERF-01 hosted
  slice deferred; rely on Miniflare + REL-01.
- **OPEN-03** (owner): telemetry sink choice (Workers Logs now vs. Clarity/Sentry later).
  **Effect if unresolved:** default to Workers Logs (DEC-DO-07).
- **SEC-OPEN-01** (owner): `issueRealtimeIdentity` Server Action has **no per-caller
  issuance rate limit** today. FR-05's send-budget covers in-DO fan-out, not issuance.
  Options: (a) add a D1-backed per-user issuance limiter (same pattern as
  `security_rate_limit_events`); (b) accept short TTL (300s) + authz-probe cost as the
  closed-beta abuse bound. **Effect if unresolved:** closed beta runs under option (b); not a
  blocker for the DO-hardening slices. Recommendation: (a) before wider beta.

## Alternatives rejected (summary — full text above)

- Cross-room fan-out via Queues/parent DO (premature for closed beta).
- Persist presence in D1/SQLite (ephemeral signal).
- Server-driven draining (platform doesn't support).
- Long-lived tokens (weakens security).
- Separate rate-limiter DO (redundant).
- `setInterval` prune (prevents hibernation).
- Clarity/Sentry now (cost/complexity; defer).
