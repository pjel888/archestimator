# Remediation Plan — Realtime Collaboration, Presence & Activity Visibility

Phase-2 gap pack. Date: 2026-06-19. Target DB: `ebxxqidacheyapmmzavr`.
Stage: live owner-only beta; this plan gates exposure to **wider/external** users.

Adversarial verification verdict (see `03-EVIDENCE-AND-VERIFICATION.md`): every
finding in `01-AUDIT-FINDINGS.md` was **confirmed** against source + live DB. No
finding was inflated and none was refuted. Net hard-blocker count: **0**; net
verify-gate count: **1** (REALTIME-01, and it is a *verify-then-decide* gate, not
a known-broken control).

This surface is unusually well-hardened: the 2026-06-14 Teamspace Improvement Plan
already shipped (a) server-side topic authorization via `realtime.messages` RLS,
(b) the Ed25519 sender-bound cursor envelope that closed the headline cursor
spoof/XSS (finding 05 §5), and (c) coarse-by-contract presence. The work below is
residual hardening + one mandatory pre-launch verification.

---

## Priority 0 — Verify-gate (must close before wider exposure)

### R-01 — Confirm the server-side realtime rate limit / concurrency ceiling is applied (REALTIME-01)

- **Severity:** medium · **verify_gate:** true (wider tier; master V1) · **effort:** S
- **Why it blocks:** The only rate limiting on the realtime send path that lives in
  the repo is the **client-side** throttle (`throttleMs=80`,
  `CURSOR_BROADCAST_MIN_DISTANCE_PX=6`) in
  `src/hooks/use-estimate-cursor-broadcast.ts:107,17`. A malicious/buggy client can
  bypass it and emit unbounded `broadcast`/`presence` inserts. Server-side, the only
  gate is the RLS editor check (`can_send_realtime_topic`) plus the Supabase
  **project-level** realtime quota — which is a dashboard/management-API setting, not
  a migration, and is **not readable by the in-session MCP tooling**. In owner-only
  beta the only sender is trusted; widening the audience makes this ceiling
  load-bearing (shared realtime tier → one flooding editor degrades every project).
- **This is a verification gap, not a proven-absent control.** The ceiling may
  already be set on `ebxxqidacheyapmmzavr`. The blocker is that it is currently
  *unverified*, and an unverified DoS ceiling is not acceptable for a wider audience.
- **Steps (no repo change strictly required):**
  1. In the Supabase dashboard for `ebxxqidacheyapmmzavr` → **Project Settings →
     Realtime** (or via the management API), read and record:
     - `max_events_per_second` (per-connection message ceiling),
     - `max_concurrent_users` / connection cap,
     - `max_channels_per_client`, `max_joins_per_second` if exposed.
  2. If any is unset/at an over-permissive default, set a **conservative
     per-connection ceiling** sized to the cursor cadence: at `throttleMs=80` a
     single sender emits ≤ ~12.5 msg/s, so a ceiling in the **25–50 msg/s** band per
     connection leaves 2–4× headroom for burst yet caps a flood. Pick a
     `max_concurrent_users` consistent with the current tier.
  3. Record the applied values as pack evidence: a dashboard screenshot **or** a
     management-API read pasted into a `scripts/prove-realtime-rate-limit.md` note
     (or `.mjs` that calls the management API with the project ref). This closes the
     non-code-verifiable gap.
  4. Keep `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST=off` documented as the break-glass
     kill-switch (already implemented, `feature-flags.ts:30`).
- **Acceptance:** recorded evidence of the applied ceiling, OR an explicit owner
  decision in `decisions.md` accepting the current values for the wider tier.
- **Risk:** Low. Setting a per-connection ceiling cannot break the current
  owner-only flows (which are far under any sane limit). Over-tight limits would
  surface as `rate_limited`/`channel_error` telemetry (already wired,
  `realtime-telemetry.ts:16`).
- **Cross-domain deps:** none in repo; touches the Supabase project config owned by
  the same DB/security surface as the RLS pack. If the limit is *changed*, that is a
  HIGH-BLAST-RADIUS infra change and should be recorded in a dated ledger
  (this pack's `LOOP_LEDGER.md` suffices).

---

## Priority 1 — Owner decision required (low-severity residual, not blocking)

### R-02 — Presence `userId` is self-asserted: bind it, or owner-accept the spoof (REALTIME-02)

- **Severity:** low · **launch_blocker:** false · **effort:** M (bind) / S (accept)
- **Confirmed root cause:** The sender-bound Ed25519 envelope is applied **only to
  cursor broadcast** (`use-estimate-cursor-broadcast.ts:170-223` verifies it).
  Presence is not: `buildPayload()` (`use-project-presence.ts:123-130`) sets
  `userId: currentUserId` from the client, and `syncPresence()` (`:132-146`) trusts
  `presence.userId` off the wire (only checks `purpose` + truthiness). The realtime
  RLS **presence INSERT** policy (migration `:877-880`, verified live) gates on
  `can_access_realtime_topic` (any project member) and does **not** bind the
  payload's `userId` to `auth.uid()`. So project member B can
  `track({ userId: <member A's id>, activeSurface: "estimates", … })` and appear in
  every roster as A being "Active now · in an estimate."
- **Impact (correctly scoped low):** A project member can forge another member's
  online status + coarse surface in the presence roster (`ProjectTeamspaceHeader`
  dots + "active now · in …" text + `aria-live` join/leave announcements).
  **No XSS** (display name/avatar/color resolved from the server roster by `userId`,
  rendered as escaped React text; the wire never carries a presence name).
  **No data exfiltration.** Pure low-trust nuisance/social-engineering *within an
  already-authorized project membership.*
- **Option A — Owner-accept (recommended for wider beta):** Impact is cosmetic and
  confined to authorized co-members; the spoofer is already a trusted-enough
  member. Record acceptance in `decisions.md` (Teamspace block) so it is not
  re-flagged. Effort S.
- **Option B — Bind presence identity (if presence integrity matters later):** Reuse
  the proven cursor envelope on the presence payload.
  - Add `envelope?: RealtimeIdentityEnvelope | null` to `ProjectPresencePayload`
    (`use-project-presence.ts:28-33`).
  - Provision the envelope the same way the cursor hook does (call
    `issueRealtimeIdentity({ topic })`, import the verify key) on subscribe.
  - In `buildPayload()` attach `envelopeRef.current`.
  - In `syncPresence()` (`:132-146`), drop any presence entry whose
    `userId !== envelope.sub` or whose `verifyRealtimeIdentity(...)` fails (same
    check as `acceptCursor`). Cache verified `(userId → sig/exp)` like the cursor
    hook.
  - **No migration / no RLS change.** This is a pure client-verification layer on
    top of the existing authz; the RLS presence policy stays as-is (it already
    requires project membership to write at all).
  - Effort M. Add a Vitest covering "forged userId presence is dropped."
- **Cross-domain deps:** none. Option B is ordinary feature work (not
  HIGH-BLAST-RADIUS — no DB/RLS change).

---

## Priority 2 — Optional hardening (info/latent, no launch action)

### R-03 — Keep project page-cursors OFF until tier headroom confirmed (REALTIME-03)

- **info · not blocking.** `isProjectPageCursorsEnabled()` defaults `false`
  (`feature-flags.ts:39-41`); `ProjectCursorLayer` further restricts to
  `surface==="overview"`, suppresses coarse pointers, `throttleMs=100`.
- **Action:** Confirm `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS` is unset/OFF in the
  production Vercel env. Flip ON only **after** R-01's tier confirmation. No code
  change. (Covered-by decision D-1.)

### R-04 — Emit telemetry when the signing-key ephemeral fallback is taken (REALTIME-07)

- **low · latent foot-gun, not blocking.** `deriveBundle`
  (`realtime-identity-server.ts:107-131`) falls back to a **silent ephemeral
  keypair** (`:123`, `generateKeyPairSync`) when no derivation secret is present.
  Production is safe today (the service-role key is always present on Vercel → stable
  derivation). Risk is a *future* misconfig degrading cross-instance cursor
  verification silently.
- **Action (optional):** In the ephemeral branch, when
  `process.env.NODE_ENV === "production"`, emit a one-time `console.warn` /
  `reportRealtimeEvent({ type: "auth_refresh_failed", detail: "ephemeral signing key" })`
  so a missing-secret misconfig is observable. ~5 lines, no behavior change.
- **Cross-domain deps:** none.

### R-05 — Contract test: no client-bound activity action omits `audience:"client"` (REALTIME-06)

- **info · not blocking.** `toClientSafeActivity` deletes `raw`, downgrades
  `internal→owner`, drops `internal` events for client audience
  (`activity-visibility.ts:27-58`), runs strings through `stripUnsafeText`. The
  *projection* is sound. The only caveat is it trusts its caller to pass
  `audience:"client"`; a forgetful action would leak `raw`.
- **Action (optional, defer to activity owner):** add a Vitest asserting every
  client-bound activity composer sets `audience:"client"`. Authorization of the
  underlying rows is RLS-owned (OWASP/RLS packs), out of this pack's scope.

### R-06 — Close DEPLOY-07 handoff as not-applicable (REALTIME-08)

- **info · no action.** Collaboration roster/summary is a TanStack Query seeded from
  SSR `initialData` and invalidated per mutation; presence/cursors are live
  websocket state. Neither rides Next's router cache, so `experimental.staleTimes`
  cannot stale-serve collaboration state. Record DEPLOY-07 closed for this surface.

---

## Verified-and-accepted (no action — record as reviewed)

- **REALTIME-04** — presence/cursor visibility to project viewers is **coarse by
  contract** (`presence-surface.ts` allowlist enum; sheet-granular state stays on the
  sheet-RLS-bounded `estimate:` channel). Intended product behavior; leaks nothing a
  member could not infer. SELECT policy verified live = `can_access_realtime_topic`.
- **REALTIME-05** — presence resubscribe is **bounded** (MAX 3 retries, linear
  backoff to 5s, reset on success; cursor hook does not auto-resubscribe). No
  reconnect storm.

---

## Sequencing

1. **R-01** (P0) — before any wider-audience flip. Verification + record evidence.
2. **R-02** (P1) — owner ruling (accept vs bind) before/at wider launch; document.
3. **R-03** (P2) — confirm env flag stays OFF (do at R-01 time).
4. **R-04 / R-05 / R-06** (P2) — opportunistic hardening; no launch gate.

## Validation gate (per 00-README)

`bun run validate` is known-red on `main`; gate on `bun run build` + targeted
Vitest (`realtime-identity`, `use-estimate-cursor-broadcast`, `use-project-presence`,
`activity-visibility`) + the live `pg_policies` check (done this pass) that the
`realtime.messages` SELECT/INSERT policies reference
`can_access_realtime_topic`/`can_send_realtime_topic`. For R-01 the evidence is the
applied Supabase realtime setting (dashboard screenshot or management-API read),
since it cannot be set via migration.
