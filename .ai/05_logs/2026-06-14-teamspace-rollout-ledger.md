# Teamspace — Rollout & Observability Ledger

**Plan:** `.ai/03_plans/2026-06-14-Teamspace-Improvement-Plan/`
**Task:** T0.6 (rollout/observability contract) — required before risky security/realtime changes.
**Status:** Authored 2026-06-14 on branch `2026-06-14-Teamspace-Improvement-Plan`.

> Names the flags, telemetry, provider config proof, DB rollback/forward-fix,
> CSP observation window, and the stop/rollback threshold for every risky change.
> Gaps G18 / F32.

---

## 1. Flags & kill-switches

Defined in `src/lib/collaboration/feature-flags.ts` (build-time `NEXT_PUBLIC_*`):

| Flag | Env var | Default | Gates | Kill-switch use |
|------|---------|---------|-------|-----------------|
| Cursor broadcast | `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST` | **on** | sheet + project cursor sends | set `off` to silence all cursor sends without code change |
| Project page cursors | `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS` | **off** | T5.3 new page cursors (capacity, D-1) | leave `off` until Supabase tier confirmed |
| Follow mode | `NEXT_PUBLIC_TEAMSPACE_FOLLOW_MODE` | **off** | T5.4 (deferred, D-6) | leave `off` until §4.5 edge contract accepted |

Because these inline at build time, "without a deploy" means a redeploy with a changed env value (Vercel env edit + redeploy). For an instant cut without redeploy, the server-side realtime rate limit (below) is the harder backstop.

## 2. Telemetry / log destinations

Realtime hooks surface status via DOM data-attributes already consumed by tests and available to any future logger:
- Sheet cursor channel: `data-estimate-cursor-channel` ∈ `idle|subscribing|subscribed|error|closed` and `data-estimate-cursor-send` ∈ `idle|ok|error|timed out` on `[data-estimate-pointer-surface]` (`EstimateSheetContent.tsx`).
- Presence/realtime auth failures: routed through `reportRealtimeEvent()` in `src/lib/collaboration/realtime-telemetry.ts` (added in T0.3/T0.4) → `console.warn` in dev, no-op hook point for a real sink (Clarity/Sentry) in prod. Events: `channel_error`, `closed`, `auth_refresh_failed`, `rate_limited`, `identity_rejected`.
- Identity rejections (spoof attempts / unknown user) increment a counter via the same telemetry sink so a flood is visible.

## 3. Provider config proof (server-side rate limit, T1.3)

- Supabase project (per memory: hosted `ebxxqidacheyapmmzavr`): set `realtime.max_events_per_second`.
- Default value chosen: **start conservative for the current tier**; D-10 says budget `N×R` for expected room sizes. With sheet cursors @ ~12Hz and small estimating teams (≤4 movers), ~60–100 events/s/connection headroom is ample. Documented value to apply: **`realtime.max_events_per_second = 100`** (revisit from the capacity smoke `10 §3.5`; raise only after confirming Pro tier for project-wide cursors).
- Proof path: `supabase` MCP `get_advisors`/project settings read, or dashboard screenshot saved alongside the implementation ledger. If owner-auth MCP is unavailable at apply time, this is the one item that may remain "documented, pending owner apply" — recorded as such in the closeout, not silently dropped.

## 4. DB rollback / forward-fix

- Migration `supabase/migrations/20260614120000_teamspace_membership_atomic_guards.sql` is **additive** (two `BEFORE` triggers + functions). 
- **Rollback (test branch or prod):**
  ```sql
  drop trigger if exists enforce_workspace_owner_floor on public.workspace_members;
  drop trigger if exists enforce_project_manager_floor on public.project_members;
  drop function if exists public.enforce_workspace_owner_floor();
  drop function if exists public.enforce_project_manager_floor();
  ```
- **Forward-fix:** if a legitimate flow is wrongly blocked, `create or replace function` the offending trigger fn with the corrected predicate (no data migration needed; triggers are stateless).
- The RLS `auth.uid()`→`(select auth.uid())` wrap (T2.4) is a `create or replace function` of existing helpers; rollback = re-apply the original bodies from `20260526142913`. It changes the query plan only, never logic.
- **0-data-loss:** all DB changes are triggers/function bodies — no table/column drops, no data rewrite.

## 5. Middleware / header rollout

- Headers added in `next.config.ts` for `/workshop/:path*` + `/invite/:path*`: 4 hardening headers ENFORCED immediately; CSP **Report-Only** only.
- Rollback: remove the `appAndInviteHardening` entries (single-file revert).
- Risk: a too-strict header could break Realtime websockets — mitigated because `connect-src` already allows `wss://*.supabase.co` and CSP is Report-Only (no enforcement) for now.

## 6. CSP Report-Only observation window (D-9)

- Observe `/workshop` + `/invite` CSP **Report-Only ≥ 1 week** of real traffic; collect violation reports; only then flip to enforced `Content-Security-Policy`. Coordinate with the Shared-Link plan's CSP-nonce work (memory). `X-Frame-Options`/`Referrer-Policy`/nosniff/HSTS do **not** wait on this window.

## 7. Stop / rollback thresholds

| Change | Stop signal | Action |
|--------|-------------|--------|
| Project page cursors (T5.3) | Realtime events/s approaches the project cap, or `rate_limited` telemetry spikes | flip `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS=off` + redeploy; lower `max_events_per_second` for an instant clamp |
| Cursor broadcast (any) | Channel error rate > a few % sustained, or cost spike | `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST=off` |
| Membership triggers | A legitimate owner/manager change is wrongly blocked | forward-fix the trigger predicate (see §4) |
| CSP enforcement | Report-Only logs show legitimate resources blocked | keep Report-Only; fix policy before enforcing |
| Security headers | Realtime ws fails to connect on `/workshop` | confirm `connect-src wss://*.supabase.co`; revert header entry if needed |

## 8. Honesty standard

"Zero known bugs after behavioral, browser/manual, DB, rollout, and review evidence" — NOT "100% bug-free" (plan `12 §3.8`). Any item that could not be live-applied in-session (e.g. server-side rate limit if MCP owner-auth unavailable) is recorded as **documented/pending**, never claimed as done.
