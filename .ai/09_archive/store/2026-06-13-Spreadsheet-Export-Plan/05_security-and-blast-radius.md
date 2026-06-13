# 05 — Security, Authorization, Data Integrity & Blast Radius

> **What this is:** the canonical security verdict + change-impact (blast radius) for the export feature. Full evidence in [`_research/05-security-auth-data-integrity.md`](_research/05-security-auth-data-integrity.md) (security) and [`_research/01-architecture-blast-radius.md`](_research/01-architecture-blast-radius.md) §5 (blast radius).
> **Method:** read-only static analysis. **DB channel unavailable** (Docker absent + hosted Supabase SQL denied) — live RLS *enablement* could not be queried; RLS reasoning is from migrations + the confirmed client factory. This is a defensive review of the team's own app.

---

## Part A — Security verdict

### The IDOR question, answered: **NOT an exploitable IDOR**

The handler at `route.ts:207-216` genuinely has **no `requireUser()` / `assertProjectAccess()` in its body** — the concern is true at face value. But tenant isolation is real and load-bearing, enforced one layer down:

1. **Client type (decisive):** the export uses the **RLS-scoped per-request client** `createSupabaseServerClient()` (`@supabase/ssr`, anon key + auth cookie; `src/lib/supabase/server.ts:6-37`), **not** the service-role client. `asEstimateTabsReadClient()` is a TypeScript cast only (`workspace-repository.ts:1573-1577`) — no privilege escalation.
2. **Auth gate:** all three repo functions resolve the project via `getCurrentWorkspaceProject` → `ensureDefaultWorkspace` → `requireCurrentUserContext()`, which `redirect("/login")` when unauthenticated (`session.ts:87-91`).
3. **RLS:** `projects` / `estimates` / `estimate_tabs` / `estimate_nodes` / `estimate_row_items` have RLS **enabled** with genuinely tenant-scoped `auth.uid()` membership policies (`can_access_project` / `can_access_estimate`), not `using(true)` — `migrations/20260526142913…:717-754`, `20260612094734…:39-49`. Queries pin `project_id`/`estimate_id`, so a guessed foreign ID resolves to null → 404.

The dev-auth service-role bypass is **triple-gated** (`NODE_ENV≠production` AND localhost AND ≥32-char secret) and cannot fire in production.

### Real security risks (ranked)

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| SEC-1 | **HIGH** | **Fragile/implicit authz — no defense-in-depth.** There is **no `middleware.ts` at all** (only `.next/` build artifacts), so `/api/projects/**` has zero edge gating. The sibling `images/route.ts` does auth explicitly in-handler; export skips that pattern. One regression in the shared client factory (e.g. swapping to service-role "to fix a 404") silently becomes a full cross-tenant IDOR. | `images/route.ts:181-194,230` vs export route |
| SEC-2 | **HIGH (ops gate)** | **Live RLS state unverified.** The route's tenancy depends 100% on RLS; migrations define correct policies but the deployed DB's `relrowsecurity` / `pg_policies` / `FORCE ROW LEVEL SECURITY` could not be queried. | DB channel unavailable |
| SEC-3 | **MEDIUM** | **CSV/formula injection on downstream re-export.** XLSX cells are safe (ExcelJS writes user strings as text; only system math uses `{formula}`), but data cells (`particulars`, `remarks`, section/tag labels, tab names) are **not defanged** against a leading `= + - @ \t \r`. A "Save As CSV" makes e.g. `=HYPERLINK(...)` in a supplier field executable. Worksheet *names* are sanitized; cell *contents* are not. | `build-…:35-37` (no defang); `worksheet-name.ts:39-47` (names only) |
| SEC-4 | **MEDIUM** | **Client-vs-internal leakage — `audience` is inert.** `audience:"client"` does nothing; supplier (`showSupplierInRemarks:true`), pricing source, pricing date, confidence, internal notes, and the **Source Breakdown sheet** (incl. `sourceRowId`, area paths, full cost composition) ship regardless. A viewer-role collaborator gets the full internal breakdown. | `build-…:32,76-80`; `create-…:38-41,438-444` |
| SEC-5 | **LOW–MEDIUM** | **Input validation** — `estimateId` and `?tab=` are not UUID-validated at the boundary; a malformed value can surface a Postgres `22P02` as a 500 (info-leak/DoS-adjacent). No SQL injection (all `.eq()/.in()` parameterized). | `route.ts:208`; `:1703,1748` |
| SEC-6 | **LOW–MEDIUM** | **Rounding drift** — subtotals are rounded **per line then summed**; if the on-screen total sums unrounded then rounds once, the export grand total can drift ~½ cent × line count from the UI. Verify parity. | `build-…:52-58,90-94,216-236` |
| SEC-7 | **LOW** | Missing `X-Content-Type-Options: nosniff` (the image route sets it). Filename **is** sanitized — no `Content-Disposition` injection / path traversal. | `filename.ts:1-14` |
| SEC-8 | **MEDIUM (integrity/UX)** | **Silent data drops** — non-area/group-node rows are skipped and the `validationIssues` (incl. `non_area_rows_skipped`, `empty_estimate`) are **never written into the workbook**, so a download-only user gets no in-file signal. | `flattenEstimateTree:265-279`; route discards `.validationIssues` |

### Security remediations
1. **[HIGH]** Add explicit fail-closed authz in the handler — return a clean **401** (not a 307 redirect) for a file route, mirroring `images/route.ts`.
2. **[HIGH]** Add a `middleware.ts` (or shared guard) gating `/api/projects/**` for centralized defense-in-depth.
3. **[HIGH/ops]** Gate releases on verifying live RLS (`relrowsecurity=true`, expected `pg_policies`, `FORCE ROW LEVEL SECURITY`).
4. **[MEDIUM]** Defang CSV/formula injection: prefix `'` (or force text type) for any string cell starting with `= + - @ \t \r` — `particulars`, `remarks`, labels, area paths, `sourceNodeName`, tab names.
5. **[MEDIUM]** Implement a real `audience` gate: client export drops supplier/pricing/confidence/internal notes and omits the Source Breakdown sheet (or redacts source IDs).
6. **[MEDIUM]** Render `validationIssues` into the workbook so dropped rows are visible.
7. **[LOW–MEDIUM]** UUID-validate `estimateId`/`tab` at the boundary → 400 not 500.
8. **[LOW]** Verify round-then-sum parity with the on-screen total; add `nosniff`.

---

## Part B — Blast radius (change-impact)

> The code-review-graph `get_impact_radius` reported 552 nodes but is **polluted by `.agents/skills/impeccable` script name collisions** and untrustworthy. The real radius below is from grep + `callers_of`.

### Production consumers of `src/lib/proposal-export/*`
| Dependent | Imports | Breaks if export model/columns/settings change | Risk |
|---|---|---|---|
| `…/export/proposal.xlsx/route.ts` | builder, defaults, buffer, worksheet-names, types | Sole server caller — any model/settings change lands here first | **HIGH** |
| `EstimateSheetContent.tsx` | `buildProposalExportModel`, metadata/model types | Preview breaks if model field names change | **MEDIUM** |
| `ProposalExportPreviewDialog.tsx` | `ProposalExportModel`, `ProposalExportPreviewScope` | Column/field renames break the preview table | **MEDIUM** |
| `EstimateWorkspaceClient.tsx`, `estimate-sheet/activity-history.tsx` | `ProposalExportMetadata` **type only** | Type-only metadata shape change | **LOW** |

### Consumers of the route / filename helper
The only UI hitting the route is `EstimateSheetContent.tsx:783` (download href) — **HIGH**. `filename.ts`, the verify script, and the benchmark script are LOW.

### Consumers of the three repository functions (broader than export)
`getEstimateTabs` / `getEstimateTabTree` / `getProjectEstimateTreeByEstimate` are **shared infrastructure**, also used by the workshop estimates page, `src/lib/estimates/actions.ts`, `src/lib/reusable-sources/actions.ts`, and `src/lib/repositories/estimate-repository.ts`.

**Implication:** changing the **export model / columns / settings** is contained to the route + preview (low risk; new fields are additive). Changing the **signature/return shape of the three repo functions** is cross-cutting (workshop render, estimate actions, reusable sources) — **HIGH** — and must be avoided or done with care. The fragile internal spots to touch carefully: the single-tab Summary's fixed A27–B32 cells and the Bid Form formulas' hardcoded column letters (both in `create-proposal-workbook.ts`).

**Coverage: ~90% of the static chain.** Biggest open item: live RLS state (SEC-2).
