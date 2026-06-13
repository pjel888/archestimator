# Audit 04 — Infosec / AuthZ / Data Exposure

Scope: `/workshop/projects/[projectId]/estimates` (`page.tsx` → `listProjectEstimates`) and its mutation actions in `src/lib/estimates/actions.ts`.

**Headline:** RLS is the real authorization perimeter and it is sound. App-code authZ is inconsistent (defense-in-depth gaps, not live BOLA/BFLA — RLS catches them). The one genuinely client-facing issue is over-fetch of the full estimates row to a client component.

---

## Severity-ranked findings

### 🟠 HIGH — Excessive data exposure: full `estimates` row crosses to client component (F9)
**OWASP API3** · `workspace-repository.ts:1419-1427`, `estimate-schema-compat.ts:27-36`, `ProjectEstimatesTable.tsx:33`, `page.tsx:21-27`

`listProjectEstimates` does `estimates.select("*")`; `normalizeEstimateRecord` returns the whole `Tables<"estimates">`; `ProjectEstimateTableRow = Tables<"estimates"> & {…}`; the page spreads `...estimate` into client props. Every column ships into the client RSC payload, incl. `created_by` (an `auth.users` UUID), `metadata` (jsonb), legacy-tolerated `assumptions`, `workspace_id`, `currency_code`, `project_budget`, `notes`. The UI consumes only `id, project_id, name, sheet_code, updated_at`, `notes` (inline edit), `project_budget` (inline edit), and the computed aggregates.
**Reachability:** exposure is to the already-authorized viewer only (RLS still scopes rows — no cross-tenant leak). Risk is internal-id/metadata leakage to the browser bundle, not cross-user.
**Fix:** explicit column projection (mirror `ESTIMATE_TREE_*_COLUMNS`, `workspace-repository.ts:1523`). Single highest-value security fix; also a perf win (F8/F9).

### 🟡 MEDIUM — Inconsistent app-layer authZ on mutations; relies wholly on RLS (obs 4408) (F15)
**OWASP API5 (BFLA)** · `actions.ts:1418-1458` (create), `1460-1623` (duplicate), `1742-1808` (updateEstimateDetails/regenerate)

List-page mutation actions check only `getCurrentWorkspaceProject(projectId)` (returns project if user can *read* it) + `requireCurrentUserContext()`. They do **not** call `assertCanEditEstimate` / `can_edit_estimate`. `assertCanEditEstimate` exists (`actions.ts:345-349`) but is wired only into four template/library actions (`2171,2233,2413,2617`).
- `createEstimateSheetDraft`/`createEstimate`: bare `estimates.insert` — but the INSERT RLS policy `with check (can_edit_project(project_id))` (`…142913:733-734`) rejects a read-only viewer. **Fails closed at the DB.**
- `updateEstimateDetails`/`regenerate`: route through `update_estimate_details_with_history`, which calls `assert_can_edit_estimate_for_history` (`…094734:558,628`). DB-enforced.
- `duplicateEstimateSheet`: destination inserts RLS-checked; source read scoped by `.eq("project_id")` + `can_access_estimate`.

**Net:** no live BOLA/BFLA — RLS `with check` enforces every path. The gap is the obs-4408 inconsistency: viewers get a raw Postgres RLS error instead of a clean "edit access denied," and a future RLS regression would have no app-layer backstop. The project's own guidance (`insert_estimate_subtree_rpc.sql:16`) mandates explicit `can_access_estimate` gates over implicit RLS reliance — these actions don't follow it.

### 🟡 MEDIUM — No `error.tsx` on the estimates list route (F13)
**OWASP API3 / error handling** · `…/estimates/` (no `error.tsx`), `workspace-repository.ts:1425,1450,1451`

`listProjectEstimates` throws raw Supabase/PG errors. The `[nodeId]` child and `charts/` have `error.tsx`; the list route and project `layout.tsx` do not, so an error climbs to Next's default. In dev the raw PG error (schema/column/relation) is visible; in prod Next masks uncaught server errors with a digest, so **prod leakage is limited**. The handled boundary `WorkshopRouteErrorState` is clean (only `console.error`s `error.name`/`digest` in non-prod, `WorkshopRouteErrorState.tsx:14-22`). Gap is the missing boundary + raw-throw pattern.

### 🟡 MEDIUM — `/workshop` has no CSP / frame / nosniff headers (F14)
**OWASP A05** · `next.config.ts:60-117`, `proxy.ts:36-37,144-146`

`next.config.ts headers()` returns CSP only for landing (Report-Only) and `/share` (enforced). No CSP — not even Report-Only — for `/workshop/*`, and no `X-Frame-Options`/`X-Content-Type-Options` there (those are in `shareHardeningHeaders`, share-only). The authenticated app renders user-controlled `name`/`notes`/`metadata` with no clickjacking protection and no XSS defense-in-depth header. Proxy sets `Cache-Control: private, no-cache, no-store` on protected redirects correctly.
**Fix:** extend hardening to `/workshop/:path*` — at minimum `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a Report-Only CSP first (measure violations before enforcing).

### 🟡 LOW — No rate limit on create/duplicate; sheet-code read-then-write race (F16)
**OWASP API4** · `actions.ts:1440-1458,911-929`

No throttle on create/duplicate (each = several sequential writes). `generateNextEstimateSheetCode` (`911-929`) reads existing codes in JS and increments — read-then-write race. **Mitigated** by `insertEstimateWithSheetCodeFallback` (`actions.ts:763`) retry-on-collision and `assertEstimateSheetCodeIsAvailable` for manual edits. Gaps: no abuse throttle; race handled by retry rather than a DB unique-constraint+sequence. Authenticated edit-users only; impact is resource consumption.

---

## Verified clean (not vulnerabilities)

- **getUser vs getSession:** both proxy (`proxy.ts:112-114`) and `getCurrentUserContext` (`session.ts:38-40`) use `auth.getUser()` (revalidated, non-spoofable). No `getSession()` in the auth/render path. ✅ per Supabase SSR guidance.
- **Bad/invalid projectId:** `getCurrentWorkspaceProject` checks `isUuid`, returns `{project:null}`; page calls `notFound()` (`page.tsx:15`). No leak/enumeration beyond 404.
- **IDOR on projectId read:** project fetched under RLS (`projects` SELECT = `can_access_project(id)`, `…142913:717-718`); inaccessible id → null → 404. No BOLA on read; `.maybeSingle()` sufficient because policy filters the row.
- **CSRF on server actions:** Next actions are POST-only with framework action-id + Origin/Host same-origin check; no state-changing GET. Matches "CSRF fixed on main" posture.
- **Token-in-URL:** none in `/workshop` URLs.

---

## Summary table

| # | Finding | Sev | OWASP | Live vuln vs DiD gap |
|---|---|---|---|---|
| F9 | Full estimates row (`created_by`, `metadata`, `assumptions`, `workspace_id`) → client | HIGH | API3 | Live over-fetch to authorized user (no cross-tenant leak) |
| F15 | Create/duplicate/rename skip `can_edit_estimate`, RLS-only | MED | API5 | DiD gap — RLS `with check` enforces; no live BFLA |
| F13 | No `error.tsx` on list route + raw `throw` | MED | API3 | DiD gap — prod masks via digest; dev leaks PG detail |
| F14 | No CSP/frame/nosniff on `/workshop` | MED | A05 | DiD gap — no live exploit; missing XSS/clickjack hardening |
| F16 | No rate limit on create/duplicate; code race | LOW | API4 | Mitigated by insert-retry; abuse-only |
| — | getUser, BOLA, CSRF, token-in-URL | OK | — | Verified clean / RLS-enforced |

**Highest-value security fix:** explicit safe-column projection in `listProjectEstimates` (F9) — the only finding that exposes data to the client beyond RLS scope, and it doubles as a perf win. **Second:** route `can_edit_estimate` through create/duplicate/rename actions to close obs-4408 and give clean denials.
