# LOOP LEDGER — Launch-Readiness: Data Fetching, Caching & RSC

**Pack:** `2026-06-19-Launch-Readiness-Audit/Data-Fetching-Caching-RSC`
**Lane:** Domain 8 · **Loop surface:** lightweight (low blast radius; no DB/RLS change in lane)
**Launch-blocker count (this domain): 0**

---

## DISCOVER
- Audited the server/client boundary, the single app `QueryClient`, repository fetch shapes
  (homebase 4-wave + projects list), mutation cache invalidation, and `initialData` seeding.
- Adversarially re-verified the prior `01-AUDIT-FINDINGS.md` (7 findings) by opening every cited
  file at the cited line.
- Reconciled against prior packs on disk: `09_archive/2026-06-19-Workshop-Dashboard-Query-Batching`,
  `03_plans/2026-06-16-Sidebar-Favorite-Projects-And-Estimates`,
  `03_plans/2026-06-19-Projects-Page-Performance`, `03_plans/2026-06-17-Performance-Refactor`,
  and the sibling `2026-06-19-Launch-Readiness-Audit/Auth-And-Session-Security` (AUTH-05).

## PLAN
- 0 launch-blockers. 1 LOW hardening item (R1 / DATA-FETCH-01) **already owned by AUTH-05** — this
  lane contributes the notifications-key (un-scoped) + Router-Cache (`staleTimes.dynamic: 60`)
  nuance, not a duplicate task. See `02-REMEDIATION-PLAN.md`.

## EXECUTE
- **No source edits made** (read-only on source by mandate; concurrent agents may be editing).
- Wrote `02-REMEDIATION-PLAN.md`, `03-EVIDENCE-AND-VERIFICATION.md`, this ledger.

## VERIFY
- 6/7 findings **confirmed** as-stated; **1 adjusted** (DATA-FETCH-01 medium→low, overlap
  none→covered-by AUTH-05). **0 refuted.**
- Severity de-inflation: DATA-FETCH-01 was medium; the cross-domain owner (AUTH-05) grades the
  identical fix low/not-a-blocker, and the only un-scoped residual (notifications count/feed) is
  low-sensitivity and self-corrects in 30–60s. → low.
- Env check: `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED` unset in `.env.local` + `.env.example` → app
  path live (DATA-FETCH-02 confirmed low). Prod env value still needs a Vercel-side check.
- HTTP cache: `proxy.ts:13,37` `private, no-store` on sensitive routes → no CDN/HTTP cross-user
  leak. The only residual is in-tab client cache (TanStack + Router Cache), closed by AUTH-05's
  full-reload-on-signout option.

## RECORD
- Durable state already captured in `.ai/10_state/current-state.md` (RSC/dashboard) + MEMORY.md
  (`workshop-dashboard-rsc`, `sidebar-favorites-reactivity`). This pack adds only the
  DATA-FETCH-01 ⊆ AUTH-05 cross-reference + the notifications-key/Router-Cache nuance.

## DECIDE
- **This lane is launch-ready as-is.** No item blocks closed beta.
- Hand R1 to the Auth lane (AUTH-05 owns it). When they implement, apply: prefer `queryClient.clear()`
  over favorites-only eviction **and** a full-reload signout (`window.location`) to also clear the
  60s Router-Cache RSC segment.
- Optional, non-launch: a lint/test guard that `WorkshopDashboard` stays a Server Component.

---

## Open handoffs
- **Auth & Session Security (AUTH-05):** owner of R1. Apply the notifications-key + Router-Cache nuance.
- **DB Schema / Indexing (domain 3):** confirm composite-index coverage for the homebase/projects
  wave access patterns (`workspace-repository.ts` L876, L971, L1404, L1492, L1512, L1553).
- **Observability (domain 9):** confirm `traced(...)` / Server-Timing labels on the homebase path
  surface in RUM (`workspace-repository.ts:1337,1553`).

## Ready-to-continue state for an implementer
- If R1 is taken in this lane (instead of Auth lane): edit only
  `src/components/realtime-auth-bridge.tsx` SIGNED_OUT branch (L55-58) → `queryClient.clear()`;
  proof gate = new Vitest asserting full clear + manual cross-account same-tab check. Single-file,
  reversible. Do NOT block on `bun run validate` (known-red on main).
