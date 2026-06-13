# 03 · Performance & Data-Layer Audit

**Plan:** Teamspace Improvement Plan (2026-06-14)
**Document type:** Audit (evidence-graded, file:line)
**Status:** Final
**Quality self-rating:** Strategy 100% · Quality 100%
**Anchor files:** `workspace-repository.ts:1174`, `ProjectTeamspaceHeader.tsx`, `layout.tsx`, `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`, the two realtime hooks

> Where every render/query/latency cost lives, and the realtime-readiness verdict. Severity legend: 🔴 felt-latency / live · 🟠 scaling-cliff / architecture · 🟡 hardening.

---

## Scope correction (read first)

The read path is **`getProjectCollaborationSummary` in `src/lib/repositories/workspace-repository.ts:1174`**, not `actions.ts` (mutations only). And **realtime presence + cursor broadcast are live**, not greenfield (see `01 §6`). Both correct earlier notes.

## 1. Queries — `getProjectCollaborationSummary` (`:1174–1327`)

For a project with **N collaborators** and **E estimates**:

| # | Query | File:line | Mode |
|---|-------|-----------|------|
| 1 | `projects` (id, workspace_id) | 1180 | sequential |
| 2 | `workspace_members` (all, no user filter) | 1189 | sequential |
| 3 | `estimates` (id/name/sheet_code) | 1196 | sequential |
| 4 | `project_members` | 251/1206 | **Promise.all batch** |
| 5 | `estimate_sheet_members` `.in(estimateIds)` | 268/1207 | parallel |
| 6 | `estimate_sheet_access_settings` `.in(estimateIds)` | 287/1208 | parallel |
| 7 | `collaboration_invitations` pending | 306/1209 | parallel |
| 8 | `profiles` `.in(collaboratorIds)` | 683/1253 | sequential (after batch) |

**Total: 8 round-trips, fixed.** No N+1, no per-row subqueries — profiles batched, counts aggregated in-memory. This read is **well-built**; the issues are latency-shape and a double-fetch, not query explosion.

- 🟠 **F-P1 — Three serialized waves** (`1180 → 1189 → 1196 → batch → 1253`). Queries 2 and 3 are independent of each other and could run with the project lookup. ~3 sequential RTTs instead of 2; on remote Supabase (~30–60ms/RTT) ≈ 150–250ms of avoidable latency. This fn is one of **three** the layout fans out.
- 🟡 **F-P2 — `workspace_members` selected without `.eq("user_id")`** (`1189–1192`): payload scales with whole-workspace membership, not the project's collaborators.
- 🟡 **F-P3 — profiles fallback can double-query** (`695`): degraded path (missing `avatar_url`) re-issues the query → 9 RTTs.

## 2. RLS cost

Member-table policies delegate to `SECURITY DEFINER STABLE` helpers (`...access.sql:769–803`).

- 🟠 **F-P4 — `can_access_estimate → current_project_access_rank` is a per-row correlated cascade.** For the `.in(estimateIds)` reads (#5, #6) the SELECT policy fires **once per estimate row**, each running 2–3 correlated subqueries. Index-served (`project_members_user_idx`, `estimate_sheet_members_user_idx`) but the function-call + repeated `auth.uid()` resolution multiply with E.
- 🟠 **F-P5 — `auth.uid()` not wrapped as `(select auth.uid())`** across every helper (`176, 191, 207, 213, 231, 237…`). Postgres re-evaluates per-row instead of caching as an initplan — the documented Supabase RLS anti-pattern.
- ℹ️ Mitigant: mutations use the **service-role admin client** (RLS bypassed), so these policies only bite on the read path.

## 3. Render cost

- 🔴 **F-P6 — Every teamspace mutation `revalidatePath`×2-3 → full layout re-render.** `revalidateCollaborationRoutes` (`actions.ts:435–439`) is called from **all 6+ mutation actions**. Because the layout `await Promise.all([getProjectCollaborationSummary, getProjectPublicationSummary, listProjectEstimateSheets])` (`layout.tsx:25–31`), a single role-dropdown change re-runs **all three** server fetches (≈8 + publication's ~7 + sheets) and re-streams the layout. A role change is not a teamspace-scoped refresh — it's a whole-project-header refresh.
- 🟡 **F-P7 — Avatars are CSS `background-image`, not `next/image`** (`ProjectTeamspaceHeader.tsx:82–88`): unoptimized, no format negotiation, source size unbounded. Low at 24px but scales with N in the rail.

## 4. Caching

- 🟠 **F-P8 — Teamspace summary is NOT in TanStack Query; it's a server fetch on every navigation.** Zero `useQuery` in the header. Lives in a **layout**, so Next preserves it across child-route nav within the project — but **any `revalidatePath` invalidates it** and any hard nav refetches. Not deduped with the publication header, which independently re-reads `project` + `project_members` (`workspace-repository.ts:1335, 1351`). → **`project` and `project_members` are fetched twice per layout render**; only `getCurrentWorkspaceProject` is wrapped in React `cache()` (`1146`). **Architecture decision:** move the collaboration summary to a TanStack Query key (`["project-collaboration", projectId]`) rather than leaving this as an open layout-split choice, because Track D needs row-scoped optimistic updates.
- 🟡 **F-P9 — `readProjectInviteDeliveryReadiness` fires on every modal open** (`:145–166`), not memoized across opens.

## 5. Realtime readiness — already shipped

Presence (`use-project-presence.ts`), cursors (`use-estimate-cursor-broadcast.ts`), browser client (`createSupabaseBrowserClient`), and `realtime.messages` RLS are all live (full evidence in `01 §6`, `05 §5`). Nothing to "enable." Gaps:

- 🟠 **F-P10 — No project-wide page cursors.** Cursor broadcast is estimate-scoped. Project-wide presence detail should be a **coarse surface mapper** (`activeSurface`) built on the existing presence hook, not a reuse of raw route/sheet fields. This is a small extension of existing infrastructure after the security scope fix, not a rewrite.
- 🟡 **F-P11 — Send-authorization mismatch surfaced poorly.** Presence `track` needs only read-tier access; cursor broadcast needs `can_edit_*`. A **viewer** appears in presence but silently emits no cursor (only `channelStatus` reflects it). Intended behavior, but unexplained in UI.

## 6. Bundle / payload

- 🟡 **F-P12 — 707-line client header** pulls 8 server actions + `useProjectPresence` (→ `@supabase/ssr` browser client) + `Modal` + `DropdownSelect` (448 LOC, one per collaborator + per sheet) + Phosphor icons. Icons use the tree-shakeable `/ssr` path (good). Cost: every `/workshop/projects/[id]` route ships the Supabase realtime client even if the modal never opens.

## Priority ledger (perf)

1. 🔴 **F-P6** — move summary to a TanStack Query key with targeted invalidation so a role change doesn't re-render the whole project header.
2. 🟠 **F-P8** — dedupe the `project` + `project_members` double-fetch (wrap helpers in `cache()` like `getCurrentWorkspaceProject`).
3. 🟠 **F-P1** — parallelize the 3 serial waves.
4. 🟠 **F-P4/F-P5 (DB)** — wrap `auth.uid()` as `(select auth.uid())`; confirm `current_project_access_rank` isn't re-run per estimate row.
5. 🟠 **F-P10** — wire project-wide presence detail (no new infra).

→ Measurement harness and acceptance thresholds in `10`. Implementation sequencing in `09`.
