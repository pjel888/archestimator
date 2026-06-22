# Realtime Collaboration / Presence / Activity — Audit Findings

Phase-2 gap pack. Date: 2026-06-19. Target DB: `ebxxqidacheyapmmzavr`.
Stage: live owner-only beta; this audit gates exposure to **wider/external** users.

## Scope & coverage

Read in full:
- `src/hooks/use-project-presence.ts`, `src/hooks/use-estimate-cursor-broadcast.ts`
- `src/components/workshop/ProjectCursorLayer.tsx`, `src/components/workshop/ProjectTeamspaceHeader.tsx`,
  `src/components/realtime-auth-bridge.tsx` (note: lives at `src/components/`, NOT `src/components/workshop/`)
- `src/lib/collaboration/{presence-surface,realtime-identity,realtime-identity-server,realtime-identity-actions,realtime-telemetry,feature-flags,colors,summary-actions}.ts`
- `src/lib/activity/{activity-visibility,activity-composer}.ts`
- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql` (the realtime authz migration)
- `src/components/workshop/EstimateSheetContent.tsx` (cursor-layer mount + render, lines ~800-890, 2804/2863)
- Mount points: `src/app/providers.tsx:40` (RealtimeAuthBridge), `src/components/workshop/ProjectChromeAsync.tsx:72` (ProjectCursorLayer)

Live DB verification (read-only): confirmed `realtime.messages` has RLS **enabled**
and the two collaboration policies are present and byte-match the migration, and
the four authz helpers (`can_access_realtime_topic`, `can_send_realtime_topic`,
`can_access_project`, `can_edit_project`) exist. `get_advisors(security)` returns
only the known SECURITY DEFINER-executable WARN class (already owned by the RLS pack),
**no realtime-specific ERROR**.

**Bottom line:** this surface is unusually well-hardened — the prior Teamspace
Improvement Plan (2026-06-14) already closed the headline spoof/XSS (finding 05 §5)
and built server-side topic authorization. There are **no critical** issues. The
one genuine wider-launch gate is the realtime rate limit (REALTIME-01), which lives
in a Supabase project setting the in-session tooling cannot read, so it must be
confirmed manually. The rest are medium/low residuals.

## Reconciliation table

| Finding | Existing plan overlap |
|---|---|
| REALTIME-01 realtime rate limit not code-verifiable | partial: decisions.md 2026-06-14 T1.3 (documented, applied via dashboard, NOT verified) |
| REALTIME-02 presence `userId` not envelope-bound (presence spoof) | partial: finding 05 §5 / decisions.md "identity trust model" closed the CURSOR path only; presence left coarse |
| REALTIME-03 project page-cursor fan-out / tier headroom | covered-by: decisions.md D-1 (build-but-hold, flag OFF) + feature-flags.ts |
| REALTIME-04 presence/cursor visibility to project viewers | covered-by: presence-surface.ts coarse-by-contract + decisions.md R-2/R-14/D-4 |
| REALTIME-05 reconnect-storm bound on presence resubscribe | none |
| REALTIME-06 activity-feed client visibility filter | covered-by: 2026-06-01 OWASP audit (collaboration/share surfaces) + activity-visibility.ts |
| REALTIME-07 signing-key derivation fallback (ephemeral key) | partial: decisions.md identity trust model (derivation order documented) |
| REALTIME-08 DEPLOY-07 staleTimes vs collaboration | covered-by: NextJS-Vercel pack finding `n` (staleTimes confirmed info, no action) |

---

## REALTIME-01 — Server-side realtime rate limit is not enforced in the repo and cannot be verified by tooling

- **Severity:** medium · **launch_blocker:** true (for the wider tier)
- **Files:** `src/hooks/use-estimate-cursor-broadcast.ts:107` (throttleMs=80, client-side only); `src/lib/collaboration/feature-flags.ts` (kill-switches, build-time only); `.ai/10_state/decisions.md` 2026-06-14 T1.3
- **Evidence:** The only rate limiting on the realtime send path is the **client-side** throttle (`throttleMs` default 80ms, `CURSOR_BROADCAST_MIN_DISTANCE_PX=6`) in `use-estimate-cursor-broadcast.ts`. `rg` for `rate.?limit` across `src/lib/collaboration`, `use-estimate-cursor-broadcast.ts`, `use-project-presence.ts` finds **no server-side enforcement** (the only matches are the invite-action limiter `n` in `actions.ts`, unrelated). Decision T1.3 says the realtime rate limit was "documented value + rationale in the rollout ledger; apply via the Supabase dashboard / management API (not exposed by the in-session MCP toolset)" — i.e. it was never applied via migration and there is no code or test asserting it. A malicious or buggy client can bypass the client throttle entirely and emit unbounded `broadcast`/`presence` inserts; only `can_send_realtime_topic` (an editor check) and the Supabase project-level realtime quota stand between that client and channel exhaustion.
- **Impact:** Under wider exposure, a single editor (or a compromised editor token) on a shared `estimate:{id}` / `project:{id}` channel can flood broadcast messages, exhausting the project's realtime message quota and degrading collaboration for every member of every project on the instance (shared Supabase realtime tier). This is the classic owner-only-beta vs. wider-launch delta: in owner-only beta the only sender is trusted; widening the audience makes the missing server-side ceiling load-bearing.
- **Recommendation:** Before wider launch, (1) confirm the Supabase realtime `max_events_per_second` / per-connection rate limit and `max_concurrent_users` are actually set on `ebxxqidacheyapmmzavr` (dashboard → Realtime settings or management API), and record the values as pack evidence; (2) if unset, set a conservative per-connection ceiling; (3) keep `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST` kill-switch documented as the break-glass. No repo change strictly required if the project setting is confirmed; add a `scripts/prove-realtime-rate-limit` note or hosted screenshot to close the verification gap.
- **Effort:** S · **Confidence:** medium (cannot read the live setting from here, so cannot prove it is unset — but it is unprovable, which is itself the gap)
- **existing_plan_overlap:** partial: decisions.md 2026-06-14 T1.3

## REALTIME-02 — Presence `userId` is self-asserted and NOT bound to the sender identity (presence spoof)

- **Severity:** low · **launch_blocker:** false
- **Files:** `src/hooks/use-project-presence.ts:123-146` (`buildPayload` / `syncPresence`), `:28-39` (payload type), migration `:872-885` (presence INSERT policy)
- **Evidence:** The sender-bound Ed25519 envelope (which closed finding 05 §5) is applied **only to cursor broadcast** (`use-estimate-cursor-broadcast.ts:170-223` verifies it before accepting a cursor). Presence is different: `buildPayload()` sets `userId: currentUserId` from the client, and `syncPresence()` (`:132-146`) trusts `presence.userId` straight off the wire with no envelope check — it only validates `purpose` and that `userId` is truthy. The realtime RLS INSERT policy (`migration:876-885`) gates presence on `can_access_realtime_topic` (any project member) but does **not** bind the payload's `userId` to `auth.uid()`. So project member B can `track({ userId: <member A's id>, activeSurface: "estimates", ... })` and appear in every member's roster as A being "Active now · in an estimate."
- **Impact:** A project member can forge another member's online status and coarse surface in the presence roster (`ProjectTeamspaceHeader` online dots + "active now · in …" text, and the `aria-live` join/leave announcements). No XSS (display identity is resolved from the server roster by userId and rendered as escaped React text; the wire never supplies a name for presence). No data exfiltration. Pure low-trust nuisance/social-engineering within an already-authorized project membership.
- **Recommendation:** Accept for the wider tier (impact is cosmetic and confined to authorized co-members), OR, if presence integrity matters, reuse the existing envelope: attach the signed envelope to the presence payload and have `syncPresence` drop entries whose `userId !== envelope.sub` (same pattern already proven for cursors). Document the acceptance in decisions.md so it is not re-flagged.
- **Effort:** M (if bound) / S (if accepted) · **Confidence:** high
- **existing_plan_overlap:** partial: finding 05 §5 closed cursor path only; presence left coarse

## REALTIME-03 — Project page-cursor fan-out is capacity-gated OFF; keep it OFF until tier headroom is confirmed

- **Severity:** info · **launch_blocker:** false
- **Files:** `src/lib/collaboration/feature-flags.ts:39-41` (default OFF), `src/components/workshop/ProjectCursorLayer.tsx:39-58` (overview-only, coarse-pointer suppressed, throttleMs=100), `.ai/10_state/decisions.md` D-1
- **Evidence:** `isProjectPageCursorsEnabled()` defaults to `false`; `ProjectCursorLayer` additionally restricts to `surface === "overview"`, suppresses coarse pointers, and only renders when remote cursors exist. Per-keystroke/pointer-move fan-out on `project:{id}` is the documented D-1 capacity risk ("build-but-hold"). Sheet cursors (`estimate:{id}`) ship ON but are scoped to one estimate's editors.
- **Impact:** None at current posture (off). If flipped ON at wider scale without tier headroom, project-channel pointer broadcast multiplies fan-out across all project members.
- **Recommendation:** Confirm `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS` remains unset/OFF in the production Vercel env for wider launch; only flip after REALTIME-01's tier confirmation. No change needed otherwise — this is correctly defended-in-depth.
- **Effort:** S · **Confidence:** high
- **existing_plan_overlap:** covered-by: decisions.md D-1

## REALTIME-04 — Presence/cursor visibility to project viewers is coarse-by-contract (acceptable)

- **Severity:** info · **launch_blocker:** false
- **Files:** `src/lib/collaboration/presence-surface.ts:1-63`, `src/hooks/use-project-presence.ts:17-33`, migration `:865-869` (SELECT policy = `can_access_realtime_topic` = any project member)
- **Evidence:** The `project:{id}` channel is readable by every project member including viewers without restricted-sheet access (SELECT policy uses `can_access_project`, not `can_edit`). `presence-surface.ts` self-documents this and deliberately maps the route to an allowlisted coarse enum (`overview|estimates|data|…`) — it never echoes raw path, estimate id, tab id, or focused cell. Fine-grained state lives only on `estimate:{id}`, whose SELECT policy is `can_access_estimate` (sheet-RLS-bounded). So a viewer learns "X is in an estimate," never *which* estimate or cell.
- **Impact:** A project viewer learns coarse co-presence (who is online, on which category of surface). This is intended product behavior and leaks nothing a project member could not already infer. Restricted-sheet activity does NOT leak because cursors/cell state stay on the sheet-RLS-bounded `estimate:` channel.
- **Recommendation:** No action. This is the correct posture; the module-level doc-comment in `presence-surface.ts:7-14` is the design rationale, not an open gap. Record as reviewed-and-accepted.
- **Effort:** S · **Confidence:** high
- **existing_plan_overlap:** covered-by: presence-surface.ts + decisions.md R-2/R-14/D-4

## REALTIME-05 — Presence resubscribe is bounded (no reconnect storm)

- **Severity:** info · **launch_blocker:** false
- **Files:** `src/hooks/use-project-presence.ts:81,187-195` (MAX_PRESENCE_RESUBSCRIBE_RETRIES=3, backoff `min(1000*retries,5000)`); `use-estimate-cursor-broadcast.ts:235-242` (cursor channel sets error/closed status, no auto-resubscribe loop)
- **Evidence:** Presence resubscribe is capped at 3 retries with linear backoff to 5s, reset on success. The cursor hook does not auto-resubscribe on CHANNEL_ERROR/CLOSED (it surfaces status and relies on the next mount). `RealtimeAuthBridge` re-applies auth on TOKEN_REFRESHED/SIGNED_IN without forcing a channel reconnect. No unbounded reconnect loop found.
- **Impact:** None — reconnect behavior is bounded.
- **Recommendation:** No action. Note as verified.
- **Effort:** S · **Confidence:** high
- **existing_plan_overlap:** none

## REALTIME-06 — Activity-feed client visibility filter strips internal/raw correctly

- **Severity:** info · **launch_blocker:** false
- **Files:** `src/lib/activity/activity-visibility.ts:27-58`, `src/lib/activity/activity-composer.ts:167,189,219-222,305`
- **Evidence:** `toClientSafeActivity` deletes `raw`, downgrades `internal`→`owner` visibility, drops `internal` events entirely for client audience (`filterActivityForVisibility:56`), and runs every user-facing string through `stripUnsafeText`. Shared-link metadata facts are filtered against an id/ip/user-agent/event-type denylist regex (`activity-composer.ts:219-221`). Composers default `audience:"owner"` and only emit client-safe view-models when `audience==="client"`. This is the *composition/serialization* boundary, not the *authorization* boundary (which is RLS on the underlying audit tables, owned by the OWASP/RLS packs).
- **Impact:** None observed — the client projection is XSS-safe and strips internal/raw payloads. Caveat: this layer trusts its caller to pass `audience:"client"` for any client-bound surface; an action that forgets to set audience would leak `raw`. Not observed in scope, but worth a contract test.
- **Recommendation:** No launch action. Optional hardening: a contract test asserting no client-bound activity action omits `audience:"client"`. Defer to the activity/feed owner.
- **Effort:** S · **Confidence:** medium (authorization of the underlying rows is out of this pack's scope; the projection itself is sound)
- **existing_plan_overlap:** covered-by: 2026-06-01 OWASP audit

## REALTIME-07 — Identity signing key silently falls back to an ephemeral keypair when no secret is configured

- **Severity:** low · **launch_blocker:** false
- **Files:** `src/lib/collaboration/realtime-identity-server.ts:107-131` (deriveBundle), `:53-57` (derivation secrets)
- **Evidence:** `deriveBundle` tries `REALTIME_IDENTITY_SIGNING_KEY`, then derives a stable Ed25519 seed from `SUPABASE_SERVICE_ROLE_KEY` / `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` / `COLLABORATION_INVITE_PEPPER`, and **otherwise generates an ephemeral keypair** (`:123`). In production at least one derivation secret (service-role key) is always present, so the key is stable. But if a future deploy/runtime were misconfigured without any of those envs, each server instance would mint a different ephemeral public key; clients fetch the pubkey via their own authenticated call and verify locally, so envelopes would still round-trip per-instance — but a multi-instance fleet with mismatched ephemeral keys would silently drop cross-instance cursors (verification fails). The fallback is silent (no telemetry/throw).
- **Impact:** Production-safe today (service-role key guarantees stable derivation). Risk is a latent foot-gun: a misconfig degrades cursor identity verification silently rather than failing loudly. No security downgrade (an attacker cannot force the ephemeral path).
- **Recommendation:** Optional: emit a one-time `console.warn`/telemetry when the ephemeral fallback is taken in `NODE_ENV==="production"`, so a missing-secret misconfig is observable. Not a launch blocker given the service-role key is always present on Vercel.
- **Effort:** S · **Confidence:** high
- **existing_plan_overlap:** partial: decisions.md identity trust model

## REALTIME-08 — `staleTimes` router-cache reuse does not affect collaboration correctness (DEPLOY-07 handoff)

- **Severity:** info · **launch_blocker:** false
- **Files:** `src/lib/collaboration/summary-actions.ts` (collaboration summary is a TanStack Query, not RSC router-cache), `ProjectTeamspaceHeader.tsx:189` (`useProjectCollaborationQuery`)
- **Evidence:** The NextJS/Vercel pack flagged `experimental.staleTimes {dynamic:60,static:180}` (finding `n`, confirmed INFO, no action) and handed off a "staleTimes-vs-collaboration" concern. The collaboration roster/summary is served by a **TanStack Query** seeded from SSR `initialData` and invalidated on every mutation (`invalidateProjectCollaboration`), and presence/cursors are **live websocket** state — neither rides Next's router cache. So a stale router segment cannot show stale membership/presence: membership re-fetches via TanStack on mutation, presence is real-time.
- **Impact:** None — the staleTimes window cannot stale-serve collaboration state.
- **Recommendation:** Close the DEPLOY-07 handoff as not-applicable to collaboration. No action.
- **Effort:** S · **Confidence:** high
- **existing_plan_overlap:** covered-by: NextJS-Vercel pack finding `n`

---

## Summary

- **Critical:** 0
- **High:** 0
- **Medium:** 1 (REALTIME-01, launch_blocker for wider tier — verify the realtime rate limit is actually applied)
- **Low:** 2 (REALTIME-02 presence spoof, REALTIME-07 key fallback)
- **Info:** 5

The headline risks this pass was told to hunt (channel-join authorization by
obscurity; spoofable/XSS cursor payloads — finding 05 §5; restricted-sheet
visibility leak) are all **already mitigated** by the shipped Teamspace plan and
verified live against `ebxxqidacheyapmmzavr`. The single wider-launch gate is the
**non-code-verifiable realtime rate limit** (REALTIME-01): defense-in-depth that is
trivial in owner-only beta but load-bearing once the audience widens.
