# Spreadsheet/XLSX Export — Security, Authorization & Data-Integrity Audit

**Scope:** `proposal.xlsx` export route and its full data + transform + serialization chain.
**Lens:** AUTH / AUTHZ / IDOR / DATA EXPOSURE / INPUT VALIDATION / DATA INTEGRITY.
**Method:** Static, read-only. No code modified. DB channel unavailable (per project constraints: Docker absent, hosted Supabase SQL denied by classifier) — **live RLS enablement state could not be queried**; RLS reasoning is from migrations + client-factory code.
**Date:** 2026-06-13.

---

## Executive summary — overall risk verdict

**The export route is NOT a classic IDOR. Tenant isolation IS enforced — but in the data layer, not the route body.** The concern that the handler has "no visible auth check" is accurate as written, yet access control is real and load-bearing:

1. Every data fetch goes through the **RLS-scoped per-request Supabase client** (`createSupabaseServerClient()`, anon key + user auth cookie via `@supabase/ssr`). It is **NOT** the service-role/admin client. RLS therefore applies to every query.
2. The repository functions all call `getCurrentWorkspaceProject()` → `ensureDefaultWorkspace()` → `requireCurrentUserContext()`, which **`redirect("/login")` when unauthenticated**. So the route is not anonymously reachable in practice.
3. The relevant tables (`projects`, `estimates`, `estimate_tabs`, `estimate_nodes`, `estimate_row_items`) have **RLS enabled with genuinely tenant-scoped policies** keyed on `auth.uid()` membership — not `using (true)`.

**Verdict: LOW residual risk for cross-tenant data theft, contingent on RLS being live in prod (unverifiable here).** The principal real risks are **[HIGH] a fragile/implicit authz posture** (no defense-in-depth in the route; one regression in the shared client factory silently turns this into a full IDOR), **[MEDIUM] CSV/formula-injection on downstream CSV re-export**, and **[MEDIUM] client-vs-internal data leakage** (supplier, pricing source, confidence, internal notes, source row/node IDs are exported to a "client" audience with no working audience gate).

Severity table:

| Area | Severity |
|---|---|
| Implicit/fragile authorization (no route-level guard, no middleware) | **HIGH** |
| Cross-tenant IDOR (actual data theft) | **LOW** (RLS + auth redirect enforce it; assumes RLS live) |
| Excel formula injection (this workbook, ExcelJS) | **LOW** |
| CSV/formula injection (downstream "Save As CSV") | **MEDIUM** |
| Client-vs-internal data leakage | **MEDIUM** |
| Input validation (IDs / `?tab=`) | **LOW–MEDIUM** |
| `Content-Disposition` filename injection | **LOW** (sanitized) |
| Data-integrity drift (rounding / cached results) | **LOW–MEDIUM** |

---

## 1. Authorization analysis — the IDOR question, answered

### The route body
`src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:207-216` (`GET`) reads `projectId`, `estimateId` (path params) and `?tab=` (query), then calls `getEstimateTabs` / `getEstimateTabTree` / `getProjectEstimateTreeByEstimate`. **There is no `requireUser()`, no `assertProjectAccess()`, no workspace check in the handler.** Concern confirmed at face value.

### Where the check actually lives (the chain)
All three repository entry points resolve the project through `getCurrentWorkspaceProject(projectId)`:
- `getEstimateTabs` — `workspace-repository.ts:1691-1692`
- `getEstimateTabTree` — `workspace-repository.ts:1731,1737`
- `getProjectEstimateTreeByEstimate` → `getDefaultEstimateTab` + `getEstimateTabTree`, or `getProjectEstimateTreeByEstimateLegacy` (`:1644`) — `workspace-repository.ts:1806-1827`

`getCurrentWorkspaceProject` (`:1062-1088`) calls `ensureDefaultWorkspace()` (`:641-700`) → `requireCurrentUserContext()` (`src/lib/auth/session.ts:87-91`), which **`redirect("/login")` if there is no authenticated user** (`session.ts:89`). **So an unauthenticated request cannot stream data** — it is redirected. (Note: redirect-as-auth-gate in a binary file route is itself a smell; it returns a 307 to `/login` rather than a clean 401, but it does block.)

### The client type — the decisive evidence
`createSupabaseServerClient()` (`src/lib/supabase/server.ts:6-37`) builds a `createServerClient` from `@supabase/ssr` using `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`:15,23`) and the request's auth cookies (`:21-35`). **This is RLS-scoped.** It is emphatically *not* `createSupabaseServiceRoleClient()` (`src/lib/supabase/service-role.ts`), which uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS. The export chain never touches the service-role client. `asEstimateTabsReadClient()` (`workspace-repository.ts:1573-1577`) is **only a TypeScript cast** ("Temporary compatibility boundary… keep casts narrow") — it returns the same RLS-scoped client, no privilege change.

### Why guessing IDs does not leak data
`getCurrentWorkspaceProject` does **not** filter by workspace in its query — it does `.eq("id", projectId).maybeSingle()` (`:1069-1073`). It returns whatever project the **RLS-scoped client is allowed to see**. So tenancy isolation is delegated entirely to RLS (see §3). Additionally the estimate queries pin `.eq("project_id", project.id)` (`:1700,1745`) and tabs pin `.eq("estimate_id", estimate.id)` (`:1709,1755`), preventing project/estimate/tab ID mismatch (a guessed `estimateId` from another project resolves to `null` → 404 at route `:112,136,163`). The `?tab=` path is constrained to the resolved estimate's tabs, so a foreign `tab` UUID returns `tab: null` → 404.

**Conclusion:** With the RLS-scoped client + `requireCurrentUserContext` redirect + RLS policies, **this is not an exploitable IDOR for an attacker iterating IDs** — they only ever see rows their own `auth.uid()` membership grants. The danger is structural, not currently exploitable (see remediations).

### The dev-auth / service-role bypass — confirmed safe in prod
`createSupabaseServerClient` *can* return a service-role admin client (`server.ts:10-12`) via `isDevAdminDatabaseBypassRequest`. That path is **triple-gated** (`src/lib/auth/dev-auth-gate.ts`): `NODE_ENV !== "production"` (`:13`) **AND** localhost-only hostname (`:30-33,50`) **AND** a ≥32-char secret credential match (`:39-43`). It cannot fire in production. Not a production exposure.

---

## 2. Middleware / route protection — **[HIGH]**

**There is no source `middleware.ts` anywhere in the repo** (only build artifacts under `.next/…/middleware.js`; verified by `find`). Therefore:
- `/api/projects/**` is **NOT** gated at the edge. No `matcher`, no centralized auth check.
- The export route's only protection is the in-data-layer `requireCurrentUserContext` redirect + RLS. **There is zero defense-in-depth.**

This is the crux of the HIGH finding: a single regression — e.g. someone swaps the export's repository helpers to the service-role client "to fix a 404," or adds a code path that reads `estimate_nodes` without going through `getCurrentWorkspaceProject` — turns this directly into a full cross-tenant IDOR with no second line of defense. The route also lacks the explicit, self-documenting auth that the sibling route has (§ below).

### Sibling-route comparison (the established pattern)
`src/app/api/projects/images/route.ts` is the only other route under `src/app/api/projects`. It does the auth **explicitly in the handler**:
- `getCurrentUserContext()` / `requireCurrentUserContext()` (`images/route.ts:181-182,215,302`)
- `ensureDefaultWorkspace()` and an explicit `project.workspace_id !== parsedPath.workspaceId` tenancy check (`:192-194`) and `.eq("workspace_id", workspace.id)` (`:230`).

**The export route skips this explicit, in-handler pattern entirely** and relies on implicit data-layer enforcement. That divergence is the strongest signal that the route's authz is under-specified relative to the team's own convention.

---

## 3. RLS policy review — **(tenant-scoped; live state unverifiable)**

RLS is **enabled** on all relevant tables:
- `projects`, `estimates`, `estimate_nodes`, `estimate_row_items` — `supabase/migrations/20260518090000_archestimator_core_schema.sql:198-202`
- `estimate_tabs` — `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:39`

Policies are **genuinely tenant-scoped on `auth.uid()` membership**, not `using (true)`:
- `projects` SELECT → `using (public.can_access_project(id))` (`20260526142913_project_sheet_collaboration_access.sql:717-718`)
- `estimates` SELECT → `using (public.can_access_estimate(id))` (`:731-732`)
- `estimate_nodes` SELECT → `using (public.can_access_estimate(estimate_id))` (`:743-744`)
- `estimate_row_items` SELECT → `using (public.can_access_estimate(estimate_id))` (`:751-752`)
- `estimate_tabs` SELECT → `using (public.can_access_estimate(estimate_id))` (`20260612094734…:41-42`); table also `revoke all … from public, anon` and `grant … to authenticated` (`:48-49`).

The predicate functions are membership-based:
- `can_access_project` (`…:218-245`): platform admin OR workspace member OR project member OR estimate-sheet member, all `where … user_id = auth.uid()`.
- `can_access_estimate` (`…:365-386`): platform admin OR sheet member (`user_id = auth.uid()`) OR (estimate inherits project access AND `current_project_access_rank(project_id) > 0`).

These are `security definer … stable` SQL functions keyed on `auth.uid()` — correct tenant scoping. **Caveat:** I could not run `SELECT relrowsecurity` / `pg_policies` against the live DB, so I cannot prove the deployed DB matches these migrations (e.g. a later manual change, an un-applied migration, or `FORCE ROW LEVEL SECURITY` not set so a table owner bypasses RLS). Given the route depends 100% on RLS for tenancy, **confirming live RLS state should be a release gate.**

---

## 4. Input validation — **[LOW–MEDIUM]**

- `projectId`, `estimateId`: passed straight from path params (`route.ts:208`). Not pre-validated in the route. `getCurrentWorkspaceProject` does call `isUuid(projectId)` (`workspace-repository.ts:1065`) and returns `project: null` for non-UUIDs → 404. **But `estimateId` and `?tab=` are NOT UUID-validated** before being used in `.eq()` filters. A malformed `estimateId` simply yields `maybeSingle()` → null → 404; a malformed UUID can also surface a Postgres `22P02 invalid input syntax for type uuid` error that is `throw`n (`:1703,1748`) and becomes an unhandled 500 rather than a clean 4xx. **Minor info-leak / DoS-adjacent**, not injection.
- **SQL injection: not present.** All filters use supabase-js `.eq()/.in()` (parameterized). No string interpolation into SQL anywhere in the chain.
- `?tab=` is scoped to the resolved estimate (`.eq("estimate_id", estimate.id)`, `:1755`), so it cannot pull a tab from another estimate.

**Recommend:** validate `estimateId` and `tab` with `isUuid()` at the route boundary and return 400, matching the project-image route's discipline.

---

## 5. Formula / CSV injection — **[LOW] in XLSX, [MEDIUM] for downstream CSV**

User-controlled strings flow into cells: tab names, `particulars` (material/description), `remarks` (supplier, pricing source, pricing date, confidence, notes), section/tag labels, area-path labels, `sourceNodeName`.

- **ExcelJS string cells are written as text, not formulas.** In `create-proposal-workbook.ts`, user values are pushed as plain array elements (e.g. `proposalRow.particulars`, `remarks`, `scopeLabel(...)` at `:228-239`; breakdown rows `:438-454,477-493`; tab names `:369,478`). ExcelJS only treats a cell as a formula when the value is an object `{ formula: … }` — used **only** for the system-generated math (`:235-236,252,290-292,301-307,375,385-388,399-407`), never for user data. So opening the `.xlsx` will **not** evaluate a `=cmd|…`/`@SUM(…)` payload typed into a tab name or remark — it renders as a literal string. **Low risk in the XLSX itself.**
- **Downstream CSV risk is real [MEDIUM].** Construction users routinely "Save As CSV" or paste into other sheets. A `particulars`/`remarks`/`tab name` beginning with `= + - @ \t \r` (e.g. a supplier field `=HYPERLINK("http://evil","click")` or `@SUM(...)`) is **not neutralized** — there is no leading-apostrophe/quote guard or control-char strip on these data cells. `normalizeWhitespace` (`build-proposal-export-model.ts:35-37`) collapses whitespace but does **not** defang a leading formula trigger. Worksheet *names* are sanitized (`worksheet-name.ts:39-47`), but cell *contents* are not. **Recommend:** prefix a `'` (or `​`) to any string cell whose first non-space char is in `= + - @` (and tab/CR), or set those cells' type to forced-text.

---

## 6. Data exposure / leakage (client vs internal) — **[MEDIUM]**

`defaultProposalExportSettings.audience = "client"` yet the same export ships internal-only data, and there is **no working audience gate**:

- **`showSupplierInRemarks: true` by default** (`build-proposal-export-model.ts:32`) → supplier names land in client-facing `remarks` (`:76`). Pricing source, pricing date, and confidence are **always** appended to remarks regardless of audience (`:77-79`) — `audience` is never consulted in `buildRemarks` or anywhere in the model build. Internal `notes` are also appended verbatim (`:80`).
- **`Source Breakdown` sheet exposes internal identifiers and provenance:** `sourceRowId` and `sourceNodeName`/`areaPathLabel` columns (`create-proposal-workbook.ts:38-41,438-444`; tabbed `:462-496`), and `includeSourceBreakdownSheet: true` by default (`build-proposal-export-model.ts:30`). `sourceNodeId` is carried in the model (`build-proposal-export-model.ts:166-170`) though not currently rendered to a cell — still present in the object graph.
- **Cost composition is fully disclosed:** material/labor/contingency/misc subtotals per line (`create-proposal-workbook.ts:45-51`). For a "client" proposal this may over-share internal cost structure.
- The `audience` setting exists in the type but **does nothing** — there is no branch anywhere that strips internal fields for `audience: "client"`. **Effectively no internal-vs-client control.** Combined with §1 (anyone who can read the estimate via the app can export), the exposure is bounded to authorized estimate readers, but a viewer-role collaborator gets the full internal breakdown. **Recommend:** implement a real audience gate (client export omits supplier/pricing-source/confidence/internal notes and the Source Breakdown sheet, or hides source IDs).

---

## 7. Transport / headers — **[LOW]**

`createXlsxResponse` (`route.ts:44-54`):
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` — correct.
- `Cache-Control: private, no-store` — correct for tenant-private data; prevents shared-cache retention. Good.
- `Content-Disposition: attachment; filename="${filename}"` — **filename is sanitized** by `buildProposalWorkbookFilename` (`filename.ts:1-14`): NFKD-normalized, non-alphanumerics collapsed to `-`, trimmed. No CRLF, quotes, `;`, or path separators survive → **no header injection / path traversal / `Content-Disposition` smuggling.** Low risk.
- Missing `X-Content-Type-Options: nosniff` (the image route sets it, `images/route.ts:204`) — cosmetic for an attachment, minor inconsistency.

---

## 8. Data integrity — **[LOW–MEDIUM]**

- **Rounding:** `roundMoney` = 2-dp half-up (`build-proposal-export-model.ts:52-54`), `roundQuantity` = 6-dp (`:56-58`). Subtotals are rounded **per line then summed** (`:90-94`, `buildTotals` `:216-236`, `buildSummaryRows` `:204-209`). If the on-screen estimate sums **unrounded** values then rounds once, the exported grand total can drift by up to ~½ cent × line count from what the user sees. **Verify the on-screen total uses the same round-then-sum order;** otherwise totals mismatch the UI. [MEDIUM] if the app rounds differently.
- **Cached formula results:** every `{ formula, result }` carries a precomputed `result` (e.g. `:235-236,252,290-292,301-307,375,385-407`). A tool that does not recalc shows `result` (consistent with the model). A tool that **does** recalc derives line totals from the rounded unit costs in cells D/E/F/G — which can differ slightly from the cached `result` due to the per-line rounding above. Minor display inconsistency, not corruption.
- **Labor is hard-coded to 0** (`build-proposal-export-model.ts:89`) with an info-level validation note (`:360-367`). Intentional compat shim, but means the LABOR column and any labor-derived total are structurally 0 — clients may misread.
- **Silent data drops (user thinks it exported, it didn't):**
  - Only `kind === "area"` rows are flattened; rows attached to non-area/group nodes are **skipped** (`flattenEstimateTree:265-279`), with a `non_area_rows_skipped` warning collected (`collectNonAreaRows:238-255`). [MEDIUM] usability/integrity — **but the validation issues are never written into the workbook** (no sheet renders `model.validationIssues`), so the user gets no in-file signal that rows were dropped.
  - `includeZeroRows: false` default drops qty=0 & cost=0 rows (`consolidateProposalRows:296`); `includeExcludedRows: true` keeps excluded rows. Defaults are reasonable but, again, silent.
  - **Export size limits return 413** (`route.ts:56-67,115,139,169-176`) at 1200 nodes / 3000 row-items — a large estimate exports **nothing** (clean error, not partial/corrupt). Good failure mode, but worth surfacing to users proactively.

---

## Prioritized remediations

1. **[HIGH] Add explicit, fail-closed authorization to the route handler.** Call `requireCurrentUserContext()` (returning a clean **401**, not a 307 redirect, for an API/file route) and assert estimate access before streaming — mirror `images/route.ts`. Do not rely solely on a `redirect("/login")` buried three calls deep. This is defense-in-depth against the no-middleware posture.
2. **[HIGH] Add a `middleware.ts` (or a shared route guard) gating `/api/projects/**`** so the platform has a second, centralized auth line. Today there is none.
3. **[HIGH→ops] Gate releases on verifying live RLS** (`relrowsecurity = true` and the expected `pg_policies` on `projects/estimates/estimate_tabs/estimate_nodes/estimate_row_items`, plus `FORCE ROW LEVEL SECURITY` if table owners ever connect). The route's tenancy depends entirely on this and it is unverified here.
4. **[MEDIUM] Neutralize CSV/formula injection in data cells:** prefix `'` (or force text type) for any string cell starting with `= + - @ \t \r` — applies to `particulars`, `remarks`, section/tag labels, area paths, `sourceNodeName`, and tab names rendered as cell content.
5. **[MEDIUM] Implement a real `audience` gate.** For `audience: "client"`: drop supplier (`showSupplierInRemarks`), pricing source, pricing date, confidence, internal notes; omit/redact the Source Breakdown sheet and source IDs. Today `audience` is inert.
6. **[MEDIUM] Surface dropped-data warnings inside the workbook** (render `model.validationIssues`, esp. `non_area_rows_skipped` and `empty_estimate`) so users know rows were skipped.
7. **[LOW–MEDIUM] Validate `estimateId` and `?tab=` as UUIDs at the route boundary** → return 400 instead of leaking a Postgres `22P02` as a 500.
8. **[LOW] Verify round-then-sum parity** between export totals and the on-screen estimate to avoid sub-cent drift.
9. **[LOW] Add `X-Content-Type-Options: nosniff`** to the XLSX response for consistency.

---

## Coverage & confidence

- **~90% coverage of the static chain.** Proven by reading source: route handler, all 3 repository entry points + legacy fallbacks, both Supabase client factories, the session/auth gate, the dev-auth triple-gate, the model builder, the workbook serializer, the filename/worksheet sanitizers, the sibling route, and the RLS migrations incl. the predicate functions.
- **Could NOT verify (≈10%):**
  - **Live RLS state** — DB channel unavailable (Docker absent + hosted Supabase SQL denied by classifier, per project memory). Reasoned from migrations + the confirmed RLS-scoped client; cannot prove the deployed DB enforces these policies or that all migrations are applied. **This is the single biggest open assumption** and the basis for the LOW (not "none") IDOR rating.
  - **Runtime behavior of `requireCurrentUserContext()`'s redirect inside a binary file route** (does Next stream a 307 vs. error?) — inferred from `redirect()` semantics, not executed.
  - Whether the on-screen estimate's total uses the same rounding order (no UI total code read in this pass).
