# Evidence & Verification — Realtime Collaboration, Presence & Activity

Phase-2 gap pack. Date: 2026-06-19. Target DB: `ebxxqidacheyapmmzavr`.
Adversarial verifier pass over `01-AUDIT-FINDINGS.md`. Mode: READ-ONLY on source +
DB; writes confined to this pack.

## Method

For each finding I opened the cited files and tried to **refute** it, then used
Supabase MCP read tools to prove/disprove the live RLS/authorization claims. Result:
**all 8 findings confirmed**; none inflated, none refuted. One framing adjustment on
REALTIME-01: it is a *verification gap*, not a proven-absent control. The master
index classifies it as **V1 verify-gate**, not a hard blocker.

## Live DB evidence captured this pass (`ebxxqidacheyapmmzavr`)

1. **`realtime.messages` RLS enabled** — `pg_class.relrowsecurity = true`
   (`relforcerowsecurity = false`, which is normal). Proven via
   `select relrowsecurity from pg_class where oid='realtime.messages'::regclass`.
2. **Both collaboration policies present and byte-match the migration:**
   - SELECT `"collaborators can read private collaboration realtime messages"`:
     `qual = (extension = ANY('{broadcast,presence}') AND can_access_realtime_topic((SELECT realtime.topic())))`.
   - INSERT `"collaborators can send private collaboration realtime messages"`:
     `with_check = ((extension='presence' AND can_access_realtime_topic(...)) OR (extension='broadcast' AND can_send_realtime_topic(...)))`.
   - **Key proof for REALTIME-02:** the presence branch is gated on
     `can_access_realtime_topic` (project membership) and contains **no**
     `auth.uid()`-to-payload-`userId` binding. Confirmed at the DB, not just in the
     migration file.
3. **Authz helpers exist:** `can_access_realtime_topic`, `can_send_realtime_topic`,
   `can_access_project`, `can_edit_project`, `can_access_estimate`,
   `can_edit_estimate` all present in `public`.
4. **`get_advisors(security)` = 74 lints, ALL `WARN`, ZERO `ERROR`.** 73 ×
   `authenticated_security_definer_function_executable` + 1 ×
   `anon_security_definer_function_executable` — the known SECURITY DEFINER-executable
   class already owned by the RLS pack. The two realtime-named entries are just the
   `can_*_realtime_topic` functions falling in that WARN class; **no realtime-specific
   ERROR** and no missing-RLS advisory on `realtime.messages`.

---

## Per-finding verdicts

### REALTIME-01 — Server-side realtime rate limit not in repo / not tool-verifiable
- **Verdict:** CONFIRMED (framing adjusted). **Severity medium; verify_gate TRUE
  (wider tier; master V1).**
- **Proof:** `use-estimate-cursor-broadcast.ts:107` (`throttleMs=80`), `:17`
  (`CURSOR_BROADCAST_MIN_DISTANCE_PX=6`) are the only send-rate limits in code, and
  they are **client-side**. `rg rate.?limit` over the collaboration lib + the two
  hooks returns no server-side enforcement. RLS only gates *who* may send
  (`can_send_realtime_topic` = editor), not *how fast*. decisions.md T1.3 says the
  limit is applied via dashboard/management API, "not exposed by the in-session MCP
  toolset."
- **Honest proof gate — what local/DB reads CAN prove:** that no rate limit exists in
  repo code or in any migration; that RLS does not throttle. **What they CANNOT
  prove:** whether the Supabase **project-level** realtime ceiling
  (`max_events_per_second`, `max_concurrent_users`) is actually set — that is a
  hosted project setting outside Postgres and outside the MCP surface. So this finding
  is *unfalsifiable from here by construction*; the gap is precisely that it is
  unverified. The blocker is "verify-then-decide," not "known broken."
- **existing_plan_overlap:** partial: decisions.md 2026-06-14 T1.3 (documented +
  applied-via-dashboard, NOT verified). **Reconfirmed.**

### REALTIME-02 — Presence `userId` self-asserted, not envelope-bound (presence spoof)
- **Verdict:** CONFIRMED. **Severity low; launch_blocker FALSE.**
- **Proof:** `use-project-presence.ts:123-130` `buildPayload()` sets `userId` from the
  client; `:132-146` `syncPresence()` trusts `presence.userId` off the wire (validates
  only `purpose` + truthiness, then maps `activeSurface` through `isActiveSurface`).
  Contrast cursors: `use-estimate-cursor-broadcast.ts:170-199` verifies the Ed25519
  envelope (`verifyRealtimeIdentity`, `claimedUserId: remoteUserId`,
  `expectedTopic`) before accepting. Live DB confirms the presence INSERT policy does
  **not** bind `userId` to `auth.uid()` (see Live DB evidence #2).
- **Refutation attempt (failed to refute):** Could the display path still be safe?
  Yes for XSS — `ProjectTeamspaceHeader` resolves name/avatar/color from the
  server-trusted roster by `userId`, and the presence wire carries no name. So the
  spoof is **status forgery only**, no injection, no exfiltration, confined to
  authorized co-members. That is exactly the low/non-blocker scoping the finding
  claims. Verdict holds at low.
- **Honest proof gate:** Code + RLS reads fully prove the binding is absent. A live
  exploit (member B tracking member A's id) is not run here (would require two auth
  sessions); the absence of any server-side `auth.uid()` check makes the spoof
  mechanically certain — no live exploit needed.
- **existing_plan_overlap:** partial: finding 05 §5 / "identity trust model" closed
  the **cursor** path only; presence left coarse. **Reconfirmed.**

### REALTIME-03 — Project page-cursor fan-out capacity-gated OFF
- **Verdict:** CONFIRMED. **info; launch_blocker FALSE.**
- **Proof:** `feature-flags.ts:39-41` `isProjectPageCursorsEnabled()` defaults
  `false`. `ProjectCursorLayer` (per audit) restricts to `surface==="overview"`,
  suppresses coarse pointers, `throttleMs=100`. Correct defense-in-depth.
- **Honest proof gate:** Code proves the default. Whether the **production Vercel
  env** overrides it ON is not readable from here — must be confirmed in the Vercel
  dashboard (folded into R-03). Build-time `NEXT_PUBLIC_*` inlining means a wrong env
  would only surface in a built bundle.
- **existing_plan_overlap:** covered-by: decisions.md D-1. **Reconfirmed.**

### REALTIME-04 — Presence/cursor visibility to viewers is coarse by contract
- **Verdict:** CONFIRMED. **info; launch_blocker FALSE.**
- **Proof:** Live SELECT policy = `can_access_realtime_topic` =
  `can_access_project` (any member incl. viewer). `presence-surface.ts:18-63` maps
  routes to an 8-value allowlist enum, never echoes raw path/estimate/tab/cell.
  Sheet-granular state rides `estimate:{id}`, whose SELECT = `can_access_estimate`
  (sheet-RLS-bounded, migration `:731-732`). So a viewer learns "X is in an
  estimate," never which estimate/cell.
- **Honest proof gate:** Fully provable from code + the verified SELECT policy. This
  is intended behavior, not a gap.
- **existing_plan_overlap:** covered-by: presence-surface.ts + decisions.md
  R-2/R-14/D-4. **Reconfirmed.**

### REALTIME-05 — Presence resubscribe is bounded (no reconnect storm)
- **Verdict:** CONFIRMED. **info; launch_blocker FALSE.**
- **Proof:** `use-project-presence.ts:81` `MAX_PRESENCE_RESUBSCRIBE_RETRIES=3`;
  `:187-195` `scheduleResubscribe` guards `retries >= MAX`, `delay = min(1000*retries,
  5000)`, reset to 0 on `SUBSCRIBED` (`:166`). Cursor hook (`:235-242`) sets
  error/closed status with **no** auto-resubscribe loop. No unbounded reconnect.
- **Honest proof gate:** Fully provable from code.
- **existing_plan_overlap:** none. **Reconfirmed.**

### REALTIME-06 — Activity-feed client visibility filter strips internal/raw
- **Verdict:** CONFIRMED. **info; launch_blocker FALSE.**
- **Proof:** `activity-visibility.ts:27-58`: `toClientSafeActivity` deletes `raw`
  (`:28-29`), forces `audience:"client"`, downgrades `internal→owner` visibility
  (`:34`), and `filterActivityForVisibility` drops `internal` events for the client
  audience (`:56`); every user string runs through `stripUnsafeText`. This is the
  *composition/serialization* boundary; row-level **authorization** is RLS on the
  audit tables (OWASP/RLS packs, out of scope).
- **Honest proof gate:** The projection's strip/escape is provable from code. What is
  NOT proven here: that every client-bound caller actually passes `audience:"client"`
  (a forgetful caller would leak `raw`) — hence the optional contract test (R-05).
  Underlying-row RLS is out of this pack's scope.
- **existing_plan_overlap:** covered-by: 2026-06-01 OWASP audit. **Reconfirmed.**

### REALTIME-07 — Signing key silently falls back to ephemeral keypair
- **Verdict:** CONFIRMED. **Severity low; launch_blocker FALSE.**
- **Proof:** `realtime-identity-server.ts:107-131` `deriveBundle`: explicit env
  (`:110-113`) → SHA-256-derived seed from
  `SUPABASE_SERVICE_ROLE_KEY`/`ARCHESTIMATOR_INVITE_TOKEN_PEPPER`/`COLLABORATION_INVITE_PEPPER`
  (`:53-57,:114-118`) → **else ephemeral `generateKeyPairSync` (`:123`)**, with no
  telemetry/throw. `realtime-telemetry.ts` has no event emitted on that branch.
- **Refutation attempt (failed to refute the foot-gun, confirmed prod-safe):** On
  Vercel the service-role key is always present, so prod always takes the stable
  derivation path — the ephemeral branch is dead in prod *today*. An attacker cannot
  force the ephemeral path (it depends on server env, not the wire). So: not a
  security downgrade, only a latent silent-degradation foot-gun on a hypothetical
  future misconfig. Low / non-blocker is correct.
- **Honest proof gate:** Code fully proves the branch + the silence. Whether prod env
  has a derivation secret is asserted (service-role key always present on Vercel) but
  not read from here — consistent with prod-safe.
- **existing_plan_overlap:** partial: decisions.md identity trust model. **Reconfirmed.**

### REALTIME-08 — staleTimes does not affect collaboration correctness
- **Verdict:** CONFIRMED. **info; launch_blocker FALSE.**
- **Proof:** Collaboration roster/summary is a TanStack Query (`summary-actions.ts`,
  `ProjectTeamspaceHeader.tsx:189` `useProjectCollaborationQuery`) seeded from SSR
  `initialData` and invalidated per mutation (`invalidateProjectCollaboration`);
  presence/cursors are live websocket state. Neither rides Next's router cache, so
  `experimental.staleTimes {dynamic:60,static:180}` cannot stale-serve collaboration.
- **Honest proof gate:** Provable from code; the DEPLOY-07 handoff is closeable as
  not-applicable.
- **existing_plan_overlap:** covered-by: NextJS-Vercel pack finding `n`. **Reconfirmed.**

---

## Net result

| # | Verdict | Final severity | Master classification |
|---|---|---|---|
| REALTIME-01 | confirmed (framing adjusted) | medium | **V1 verify-gate** |
| REALTIME-02 | confirmed | low | false |
| REALTIME-03 | confirmed | info | false |
| REALTIME-04 | confirmed | info | false |
| REALTIME-05 | confirmed | info | false |
| REALTIME-06 | confirmed | info | false |
| REALTIME-07 | confirmed | low | false |
| REALTIME-08 | confirmed | info | false |

- **Critical:** 0 · **High:** 0 · **Medium:** 1 (REALTIME-01) · **Low:** 2 · **Info:** 5
- **Hard-blocker count:** **0**. **Verify-gate count:** **1** (REALTIME-01).
- **Refuted findings:** none.

The headline risks this surface was told to hunt — channel-join authorization by
obscurity, spoofable/XSS cursor payloads, restricted-sheet visibility leak — are all
**already mitigated** and verified live. The single wider-launch gate is the
**non-code-verifiable realtime rate limit** (REALTIME-01 / master V1).
