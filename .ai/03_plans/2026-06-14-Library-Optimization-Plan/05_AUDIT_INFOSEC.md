# 05 — Information Security Audit

**Scope:** the Library feature — component library items, estimate templates, template nodes, the repository, the server actions, and the route segments. **Supabase project:** `ebxxqidacheyapmmzavr` (read-only inspection during audit).

---

## A. Security posture summary

**The perimeter is sound — there is no cross-workspace BOLA/BFLA.** Three layers stack correctly:

1. **Route auth (`src/proxy.ts`):** `/workshop/*` is a `PROTECTED_PREFIX`; the proxy calls `supabase.auth.getUser()` (the secure method) and redirects unauthenticated users to `/login` (`proxy.ts:8,114,116`). Server actions/pages re-gate via `requireCurrentUserContext()` → also `getUser()` (`src/lib/auth/session.ts:40,87-90`). Fail-closed.
2. **Workspace scoping is caller-derived, never client-supplied.** Every action resolves the workspace via `ensureDefaultWorkspace()`, which reads the *caller's own* `profile.default_workspace_id` / membership (`workspace-repository.ts:725-750`). The client never passes a `workspace_id`. Mutations double-bind with `.eq("workspace_id", workspace.id)` + `.maybeSingle()` returning "not found in the current workspace" on miss (`actions.ts:1043-1068`; `template-editor-actions.ts:37-48`).
3. **RLS is enabled on all library tables** with `using`/`with check` + `revoke all … from public`. `estimate_templates` keys on `is_workspace_member(workspace_id)`; nodes/rows join up to the parent template's workspace (`…templates.sql:583-620`); `cost_library_items` likewise (`…core_schema.sql:234-235`). Security-definer write RPCs re-check membership of `target_workspace_id` (`validate_cost_library_component_refs`, `…versioning.sql:318-325`).

**The real gaps are intra-workspace, not cross-workspace.**

---

## B. Findings (severity-ranked)

### F19 🟠 — Workspace `viewer` role can still mutate templates and component child tables
`workspace_role` enum = `('owner','admin','member','viewer')` (`…core_schema.sql:7`). `is_workspace_member()` returns true for **any** membership row, viewer included (`…core_schema.sql:165-178`). Template RLS is still `for all … using/with check is_workspace_member(workspace_id)` (`…templates.sql:583-620`). The mutating template server actions (`renameEstimateTemplate`, `deleteEstimateTemplate`, `duplicateEstimateTemplate`, `createEstimateTemplate`, and all of `template-editor-actions.ts`) gate only on `requireCurrentUserContext()` + `ensureDefaultWorkspace()` — **no editor check.**

**Correction after deeper review:** direct `cost_library_items` RLS was later split to `SELECT using is_workspace_member` and `for all using/with check is_workspace_editor` in `20260526142913_project_sheet_collaboration_access.sql:756-762`, so the direct item table is not the whole problem. Component child tables still have confirmed member-write gaps: `cost_library_item_versions` allows member inserts (`20260523120957_component_library_item_versioning.sql:1177,1205`), and `cost_library_item_variant_cost_entries` plus `cost_library_item_variant_attachments` still have member-scoped `for all` policies/grants (`20260524131204_component_variant_assets_cost_entries.sql:760-772`). The later hardening migration only removed writes for price options/history (`20260603234326_harden_component_price_audit_grants.sql:23`).

**Telling inconsistency:** the *library-folder* actions DO enforce edit rights via `assertCanManageLibraryFolders → rpc("is_workspace_editor")` (`actions.ts:175-182,535,578,595,612,633`), and `is_workspace_editor` excludes `viewer` (role in `'owner','admin','member'`, `…collaboration_access.sql:170-185`). Templates were never brought to the same bar. Component actions also need an action-layer inventory so UI/server-action behavior matches the existing component RLS.

**Impact:** a read-only collaborator can rename/delete/overwrite shared templates and may be able to insert or mutate component version/cost-entry/attachment data through child-table paths unless blocked elsewhere by application code. **Severity 🟠 not 🔴** only because the product is pre-launch / effectively single-user per workspace today — no viewer principals exist yet. Exploitable the moment viewer invites are issued.

**Fix:** first inventory current component/template policies. Then gate template + component mutations on `is_workspace_editor` at the action layer, add missing template RLS splits (`SELECT using is_workspace_member`; writes using/with check `is_workspace_editor`), and harden component child-table policies/grants so viewers are denied while editors/admins remain allowed. Required proof covers component items, price options, versions, cost entries, attachments, history, templates, nodes, and rows.

### F20 🟠 — No security headers on `/workshop/*`
`next.config.ts:60-117` adds headers only to landing (Report-Only CSP), `/share/:path*` (enforced CSP + hardening), and `/api/share/:path*`. **No entry for `/workshop`**, and no `middleware.ts` (only `proxy.ts`, which sets `Cache-Control` but no security headers).

**Impact:** the authenticated app — including the template editor and library that render user/library-controlled strings (names, descriptions, supplier text) — has no clickjacking protection, no MIME-sniff protection, no CSP defense-in-depth, unconstrained referrer.

**Fix:** add a `/workshop/:path*` header block in `next.config.ts` with `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, and a CSP (start **Report-Only**, reuse the share/landing shape, then enforce). Ship the three non-CSP headers immediately — they are zero-risk.

### F24 🟡 — No rate-limit / quota on template & component creation
`createEstimateTemplate`, `createEstimateTemplateFromEstimateNode/Tab`, `duplicateEstimateTemplate` (deep-copies whole subtrees), `createCostLibraryComponent`, `addEstimateTemplateRowItems` have no throttle. The only ceiling anywhere is the bulk-archive cap (`normalizeBulkActionIds(..., { max: 500 })`, `actions.ts:469,493`). **Impact:** an authenticated member can mass-insert, inflating storage and the unbounded audit/history tables (cross-ref `02 F16`) — resource exhaustion, not disclosure. **Fix:** per-user/per-workspace creation rate limit or a per-workspace row-count quota in the RPC/action. Low priority pre-launch.

### F9/F25 🟡 — `select("*")` ships internal columns to the client (over-fetch)
`getEstimateTemplateById` (`component-library-repository.ts:1073-1078`), `loadCurrentWorkspaceEstimateTemplates` (`:739-744`), `cost_library_items` (`:546`) use `select("*")`. Templates project to a clean DTO so they're mostly fine, but `cost_library_items` rows flow into `normalizeComponentLibraryItem` carrying raw `metadata` JSONB (internal flags `savedFrom`, `duplicatedFrom`, `sourceEstimateId`), `created_by`, `workspace_id` onto the client. **Impact: low** — leaked fields are same-workspace data the user is entitled to; no cross-tenant exposure. Information-minimization debt. **Fix:** explicit column lists matching the DTO; never spread raw `metadata`. (Implemented jointly with `02 F9`.)

### F25 🟡 — Raw Supabase/Postgres `error.message` interpolated into thrown action errors
Pervasive `throw new Error(\`Could not …: ${error.message}\`)` across `actions.ts` (`:397,416,660,1047,1067,1139,1302,1468`) and `template-editor-actions.ts` (`:45,109,130,168,299,407`). The render error boundary (`WorkshopRouteErrorState.tsx:14-22`) logs only `error.name`/`digest` — but **server-action** rejections return to the client mutation caller where the raw message surfaces (toast/inline), so DB text (constraint/column/relation names) can reach the browser. **Impact: low** — schema fingerprinting aid. **Fix:** return a generic user-facing message; log detailed `error.message` server-side only.

---

## C. What RLS / existing design already protects (do NOT over-engineer)

- **Cross-workspace BOLA is closed.** No action accepts a client `workspace_id`; all derive it from the caller's profile/membership, bind `.eq("workspace_id", …)`, and RLS enforces again. `getEstimateTemplateById` → `null` → `notFound()` for foreign/stale ids (`repository.ts:1068-1084`; `templates/[templateId]/page.tsx:16-17`).
- **Auth method correct** — `getUser()`, never `getSession()`, in both proxy and `getCurrentUserContext` (`proxy.ts:114`, `session.ts:40`).
- **RLS is real, not app-only** — every table `ENABLE ROW LEVEL SECURITY` + `using`/`with check` + `revoke all from public`.
- **Security-definer write RPCs re-verify membership** of the target workspace (`validate_cost_library_component_refs:318-325`); the `coalesce(auth.uid(), acting_user_id)` fallback is fed server-resolved `currentUser.userId`, not client input — not a bypass vector.
- **Template structure is server-authoritative** — "Save as template" reads the subtree from the DB; clients send only ids (`actions.ts:689,711-746`). No unvalidated client tree stored.
- **Input validation is thorough** — numerics `Number.isFinite` + range-checked, names trimmed/required, contingency clamped ±100, node-kind hierarchy pre-checked AND enforced by a DB trigger (`validate_estimate_template_tree`). JSONB written as structured objects (parameterized). Overview search escapes PostgREST `or=` metacharacters + LIKE wildcards (`actions.ts:1445-1447`). (Zod not used, but hand-rolled validation covers the fields.)
- **No unprotected mutation route handlers** — the only `app/api/component-library/*` handlers are image/attachment upload+delete; both `requireCurrentUserContext()` first (`images/route.ts:147`, `attachments/route.ts:131`), validate **magic bytes** (not declared MIME), re-encode via sharp, cap size, scope storage paths to `${workspace.id}/${userId}/` with `..`//`//` rejection (`images/route.ts:130-132`, `attachments/route.ts:79-86`). All library CRUD are Next Server Actions (framework CSRF-protected).

> **Cross-check for P2 RPCs:** the new `get_library_overview` / `get_component_library_graph` RPCs (`02 §D`) must be `security definer set search_path = public` and filter `workspace_id` from the **resolved caller**, never a client-supplied id — preserving the caller-derived scoping above. Add an `is_workspace_member` re-check inside the RPC body for defense-in-depth.

**Net:** fix F19 (viewer-write authZ) and F20 (workshop headers — quick win); schedule F24/F9/F25 as hardening. **Do not invest in cross-tenant isolation work — that perimeter is already correct.**
