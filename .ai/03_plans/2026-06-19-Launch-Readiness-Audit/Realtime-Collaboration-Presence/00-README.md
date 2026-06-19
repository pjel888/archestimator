# Launch-Readiness — Realtime Collaboration, Presence & Activity Visibility

**Phase-2 gap pack** of the 2026-06-19 Launch-Readiness Audit. The 13-domain
launch audit's COVERAGE CRITIC found the Supabase Realtime collaboration surface
(channel-join authorization, presence/cursor payload trust, visibility leaks,
realtime scale, activity-feed visibility) was **not** owned by any of the 13
domain packs. This pack closes that coverage gap. Deletable when its findings are
triaged into `current-state.md` / `decisions.md` or resolved.

## Exact owner job

Decide, before exposing the app to **wider/external** users (beyond the current
owner-only closed beta), whether the realtime collaboration surface is safe to
expose. Specifically rule on the launch-blocking items in `01-AUDIT-FINDINGS.md`:
the **server-side realtime rate limit** (REALTIME-01) and confirm the
presence-spoof residual (REALTIME-02) is accepted for the wider tier.

## Routes / screens in scope

- `/workshop/projects/[id]/**` — `ProjectTeamspaceHeader` (presence roster, Share
  modal), `ProjectCursorLayer` (page cursors, flag-off by default).
- `/workshop/projects/[id]/estimates/**` — `EstimateSheetCursorLayer` (sheet
  cursors, on by default).
- App-wide: `RealtimeAuthBridge` (mounted in `src/app/providers.tsx`) keeps the
  websocket JWT fresh.
- Channels: `project:{uuid}` (Presence + page-cursor Broadcast) and
  `estimate:{uuid}` (sheet-cursor Broadcast). Both `config.private = true`.
- Activity feed composition: `src/lib/activity/**` (audience/visibility filtering).

## Non-goals

- Re-auditing invite/publication/share-link surfaces (owned by the OWASP pack and
  the RLS/Auth launch packs).
- Re-deriving the cursor-anchoring / CLS / a11y UX (Teamspace plan + Frontend
  packs own these).
- Follow-mode (`NEXT_PUBLIC_TEAMSPACE_FOLLOW_MODE`, off; deferred by D-6).
- Postgres-Changes / table-wide realtime (intentionally deferred, 2026-05-22).

## Files expected to change (if findings are actioned)

- `supabase` dashboard / management API — realtime rate-limit + max-concurrent
  config (REALTIME-01); not a repo file (the limit is a project setting).
- `src/hooks/use-project-presence.ts` — optional presence-identity binding
  (REALTIME-02), if the owner wants presence spoof closed for the wider tier.
- `src/lib/collaboration/feature-flags.ts` — confirm `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS`
  stays OFF until tier headroom is confirmed (REALTIME-03).
- A `scripts/prove-realtime-*.mjs` or a hosted verification note recording the
  applied rate limit (REALTIME-01 evidence).

## Validation gate

`bun run validate` is known-red on `main`; gate on `bun run build` + targeted
tests (`rg`-scoped Vitest for `realtime-identity`, `use-estimate-cursor-broadcast`,
`use-project-presence`, `activity-visibility`) plus a live `pg_policies` check that
the `realtime.messages` SELECT/INSERT policies are present and reference
`can_access_realtime_topic` / `can_send_realtime_topic`. For REALTIME-01, evidence
is the applied Supabase realtime setting (dashboard screenshot or management-API
read), since it cannot be set via migration.

## Deletion criteria

Delete this pack once: (a) REALTIME-01 rate-limit is confirmed applied to
`ebxxqidacheyapmmzavr` with recorded evidence (or explicitly owner-accepted-off
for the wider tier), (b) REALTIME-02 is either bound or owner-accepted, and (c)
the remaining medium/low findings are folded into `current-state.md`.

## Loop surface

Lightweight in-session loop (read-only audit; no high-blast-radius change made
here). If REALTIME-02 is actioned in code, that is ordinary feature work; if the
rate-limit/RLS posture is changed, that is HIGH-BLAST-RADIUS (DB/security) and
requires a dated loop ledger + Codex review gate.

## Durable-state path

`.ai/10_state/current-state.md` (Teamspace section) and `.ai/10_state/decisions.md`
(2026-06-14 Teamspace Improvement Plan block: D-1, D-4, T1.3, identity trust
model). Implementation ledger: `.ai/05_logs/2026-06-14-teamspace-implementation-ledger.md`.
