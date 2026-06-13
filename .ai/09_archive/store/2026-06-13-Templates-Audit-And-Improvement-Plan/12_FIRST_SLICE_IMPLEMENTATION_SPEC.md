# 12 — First-Slice Implementation Spec (U1 + U1b + U4)

**What this is:** A turnkey spec for the recommended first slice — fix the live 500, stop the error leak, and close the security gap — with **no provider action** and **no dependency on the owner decisions**. Code shapes below are **directional guidance for the implementer, not final code** (per the planning convention); they fix the design so the implementer doesn't re-derive it.

**Why this slice first:** it converts the three most severe live problems (P0 DEF-1, P1 SEC-1, P2-but-leaky UX-6) into fixed, tested behaviour using fully-local changes. It is safe to ship before D-A/D-B are decided.

**Execution posture:** characterization-first for U1 (write the failing test that reproduces the throw before adding the fallback) and test-first for U4 (denial test before the gate change).

---

## U1 — Make the reusable-source outline survive a missing `estimate_tabs` schema

**Root cause (proven, [15](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md)):** `getEstimateTabs`, `getDefaultEstimateTab`, and `getEstimateTabTree` query `estimate_tabs` and rethrow on error; their sibling tree loaders catch the missing-schema error via `isEstimateTabsSchemaMissing` and fall back to legacy. The reusable path lacks that fallback, so it 500s wherever `estimate_tabs` is unapplied (the live DB).

**File:** `src/lib/repositories/workspace-repository.ts`

**Design:** give **`getEstimateTabs` and `getEstimateTabTree`** (the reusable-outline path) the **same fallback their siblings already use** (`getProjectEstimateTreeByEstimate:1824`, `getProjectEstimateTreeByNode:1917`). On a missing-schema error, synthesize a single default "Main" tab from the existing estimate tree **for reads**, instead of throwing. **Do NOT add the fallback to `getDefaultEstimateTab`** ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U1-1, P0) — see the refinements below. Edit the `workspace-repository.ts:1731` `getEstimateTabTree`, **not** the dead duplicate at `estimate-repository.ts:186` (0 callers — U1-DUP).

Directional sketch (guidance, not final):

```
getEstimateTabs(projectId, estimateId):
  try { ...existing estimate_tabs query... ; return mapped tabs }
  catch (e) {
    if (isEstimateTabsSchemaMissing(e)) return [ syntheticMainTab(estimateId) ]  // mirror legacy
    throw e
  }

getEstimateTabTree(projectId, estimateId, tabId, options):
  try { ...existing... }
  catch (e) {
    if (isEstimateTabsSchemaMissing(e)) {
      // reuse the legacy whole-estimate loader, presented as the single "Main" tab
      const legacy = await getProjectEstimateTreeByEstimateLegacy(projectId, estimateId, options)
      return { ...legacy, tab: syntheticMainTab(estimateId) }
    }
    throw e
  }

// getDefaultEstimateTab: do NOT add a fallback — leave it throwing / returning null.
// Its caller getProjectEstimateTreeByEstimate already routes a thrown/null result to the
// legacy loader; returning a synthetic {id:'legacy-main'} would skip that branch and leak
// the synthetic id into getEstimateTabTree(tabId=...) as a real param ([16] U1-1, P0).
```

`syntheticMainTab` should reuse the existing synthetic-tab convention — the `{ id: "legacy-main", name: "Main" }` shape already used for pre-tab estimates in `src/lib/ai/read-context.ts:1257`. Note the `*Legacy` tree loaders (`getProjectEstimateTreeByEstimateLegacy`, `getProjectEstimateTreeByNodeLegacy`) return a tree with **no `tab` field**, so the reusable path must construct the synthetic tab itself; model it on read-context's convention so all fallbacks agree on the same id/name.

**Critical refinements ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md)):**
- **Read-only-safe (U1-RO, P1):** `getEstimateTabs` has **11 callers — including 6 tab-CRUD mutation actions** (create/rename/reorder/duplicate/archive/delete) + the node-route page. The synthetic-"Main" fallback is for **reads only**; those mutation callers must surface a typed "tabs unavailable" error under schema-missing, never operate on a fake tab.
- **Mixed-state guard (U1-2/U1-3, P1):** gate the fallback strictly on `isEstimateTabsSchemaMissing`. Once `estimate_tabs` IS applied, "schema present but no default tab / zero tabs" is a **data error** that must be loud — not silently masked as an empty/legacy render. In `getEstimateTabTree`, route a `"legacy-main"` id to the legacy loader, not a literal id lookup.
- **Forward `options`:** the `getEstimateTabTree` fallback must pass `options` (maxNodeCount/maxRowItemCount) to `getProjectEstimateTreeByEstimateLegacy`, or export limit enforcement silently changes (U1-4).

**Blast radius:** `getEstimateTabTree` is also called by export and the node-route; adding a *fallback* only changes behaviour in the already-broken missing-schema case, so no working path regresses ([06](06_BLAST_RADIUS_ANALYSIS.md)). When D-A applies the schema, the fallback goes dormant.

**Test scenarios:**
- *Characterization (RED first):* mock `estimate_tabs` reads to throw the missing-relation error → assert today's behaviour throws.
- `getReusableEstimateOutline` returns a single "Main" tab with the estimate's groups/areas when `estimate_tabs` is absent (mock missing-schema).
- Returns real tabs when `estimate_tabs` is present.
- **Integration test (closes the CI blind spot):** run the *unmocked* outline path against a migration-applied ephemeral Postgres → real tabs; and against a DB without the migration → fallback, no throw.
- **Export single-tab path:** U1 changes export from **500→success** on the unapplied DB (the export route also calls `getEstimateTabs` with no try/catch, `proposal.xlsx/route.ts:213`) — assert **200 + correct single-tab workbook** against the schema-missing DB, forwarding the limit options; this is NOT a passive "unchanged" check ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U1-4/U1-5).
- Mutation callers under schema-missing surface a typed "tabs unavailable" error, not a synthetic-tab write (U1-RO).

**Verification:** in the live app, expand any project→estimate in the panel → tabs/groups render (no error banner). `bun run test:dom` green.

---

## U1b — User-safe outline error surface

**Why:** [15](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md) found the UI renders the **literal** string `{code: ..., details: Null, hint: ..., message: ...}` — the formatter both leaks a structured-error shape and fails to populate it. Even after U1, any future outline failure must fail gracefully.

**Files:** `src/components/workshop/component-library/index.tsx` — the **actual leak site** ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U1b-1): raw `error.message` is stored at `:1776` (also `:808`, `:982`, `:1747`) and rendered at `:1110`. **Do NOT** target `TemplatesBrowseManager.tsx:534,544` — U3 deletes that block (U1b-2).

**Design:** add a `toUserSourceError(scope)` helper returning a fixed friendly string ("Couldn't load this project's outline. Try Refresh."); at the catch sites (`:808/:982/:1747/:1776`) surface it via the **existing `toast.error(...)`** (`useToast()` from `src/components/ui/toast.tsx` — already used by `EstimateTabStrip`/`EstimateSheetTree`; **do not build a toaster**), **not** an inline banner — the `:1075/:1094/:1110/:1128` banners shift the tree. Never store/interpolate `error.code/details/hint/message`; log the raw error **server-side only**; keep one `role="status"` live region for a11y. (Owner directive: toasts so nothing shifts the layout — [17](17_FRONTEND_BUILD_SPEC.md) A4.)

**Test scenarios:** simulated outline/source/search failure → a **toast** with the friendly copy, **no `{code…}` substring, no inline banner, no layout shift**; raw error absent from the DOM; success path unaffected.

**Verification:** force an outline failure (e.g. before U1 lands, or via a mocked error) → friendly banner, no raw object.

---

## U4 — Require `can_edit_estimate` on the insert RPC + app-layer assertion

**Why (proven, [15](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md)):** the live `insert_estimate_template_into_estimate_with_history` is SECURITY DEFINER and gates on **workspace membership only** (`resolve_estimate_workspace`); `assert_can_edit_estimate_for_history` is **not live** (`pg_proc` count 0). A member-viewer on a restricted estimate can insert.

**This ships independently of the full `estimate_tabs` apply** — it's a standalone hardening migration.

**Files:**
- New migration `supabase/migrations/<ts>_harden_template_insert_can_edit.sql` — define `assert_can_edit_estimate_for_history` (body already at `20260612094734_estimate_tabs_foundation.sql:180-206`: `resolve_estimate_workspace` → `estimate_sheet_can_bypass_auth` short-circuit → `can_edit_estimate` else raise; **this function has no tab dependency** — verified), then `create or replace` the live RPC **swapping ONLY the gate line** (`resolve_estimate_workspace` → `assert_can_edit_estimate_for_history`). **⚠ Do NOT copy the foundation migration's RPC body** — it reads/writes `estimate_tab_id` (`:1010,:1026`), columns absent on the live DB → the migration would fail to apply ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U4-4). Keep the live (no-tab) events insert and the live inner untouched. **Owner-gated apply**; self-contained, does not require the tabs schema.
- `src/lib/estimates/actions.ts` — add `assertCanEditEstimate(supabase, estimateId)` (helper exists at `:345` with that exact `(supabase, estimateId)` signature) at the **very top** of `insertEstimateTemplateIntoEstimate:2157` and `wrapEstimateAreaAndInsertTemplate:2389`. In `wrap*`, it must run **before** the pre-insert `create_estimate_node_with_history:2416` / `reorder_estimate_nodes_with_history:2436` mutations, or a denied viewer leaves an orphan group ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U4-2). Ships immediately, no provider action.

Directional SQL (guidance — the real body is the one already written at `20260612094734:180-206`):

```
create or replace function public.assert_can_edit_estimate_for_history(project, estimate, acting_user)
  returns uuid security definer set search_path = public as $$
    ws := resolve_estimate_workspace(project, estimate, acting_user);
    if estimate_sheet_can_bypass_auth() then return ws; end if;
    if not can_edit_estimate(estimate) then raise exception 'Estimate edit access denied.'; end if;
    return ws;
$$;
-- then: create or replace insert_estimate_template_into_estimate_with_history
--       swap the gate line to: resolved_workspace_id := assert_can_edit_estimate_for_history(...)
```

**Blast radius (HIGH — all three RPC call sites verified on the fresh graph):** the RPC is shared by manual insert (`estimates/actions.ts:2168,2454`) and **AI package-builder** (`ai/package-builder/apply.ts:1061`). The RPC signature is unchanged (the gate is internal). Two test obligations the original spec got wrong:
- **The reorder-action tests will FAIL, not "stay green"** ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U4-1, P0-test): `tests/vitest/estimate-node-reorder-action.test.ts:830-913` mock `rpc` generically and assert `toHaveBeenCalledTimes(1)`. Adding the app-layer `assertCanEditEstimate` (which calls `rpc("can_edit_estimate")`) makes it 2 calls and the generic mock returns the wrong shape → the test throws. They **must be UPDATED** (mock `can_edit_estimate→{data:true}`, expect 2 ordered rpc calls).
- **Package-builder `fill_current_estimate` IS affected** (U4-3): it runs as the authenticated user (`apply.ts:1313`, no bypass), so filling a **restricted pre-existing** estimate is now correctly **denied** (today's bare gate allows it). This is a real behavior change — prove it via the RLS harness; the existing mock-success test (`ai-package-builder-apply.test.ts:1459-1493`) will NOT catch it.

**Test scenarios:**
- RLS harness: member-*viewer* on a restricted estimate (`inherit_project_access=false`, not a sheet editor) → insert **denied** ("Estimate edit access denied.").
- Editor/owner on the same estimate → insert **allowed**.
- App-layer: `insertEstimateTemplateIntoEstimate` / `wrapEstimateAreaAndInsertTemplate` reject a viewer before the RPC (no DB write attempted).
- AI package-builder: fill an **owned** estimate → allowed; fill a **restricted pre-existing** estimate → now **denied** (behavior change, [16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U4-3) — prove via the RLS harness.
- The reorder-action tests (`estimate-node-reorder-action.test.ts:830-913`) are **updated** to mock `can_edit_estimate→{data:true}` and expect 2 ordered rpc calls (U4-1).

**Verification:** `node scripts/prove-estimate-tabs-postgres.mjs` (extended with the viewer-denied insert case) + the package-builder test green. Provider apply of the migration is queued behind owner authorization; the **app-layer `assertCanEditEstimate` lands immediately** and already closes the gap for the app path even before the RPC migration applies.

---

## First-slice exit criteria

- Live: expand any project→estimate outline → renders, **0 × HTTP 500**, no raw-error banner.
- A viewer cannot insert (app-layer immediately; RPC after the hardening migration applies).
- New integration test exercises the unmocked outline path; RLS harness proves viewer-denied; `bun run validate` green with no new failures vs the documented baseline.

## Truth & integrity

- **VERIFIED:** the fallback asymmetry, the literal-`...` error, and the live unhardened gate are all proven ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md), [15](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md)); the hardened gate body and the `assertCanEditEstimate` helper both already exist in the repo (cited).
- **CORRECTED (3rd pass, [16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md)):** dropped the harmful `getDefaultEstimateTab` fallback (U1-1); added read-only-safe + mixed-state guards (U1-RO/U1-2/U1-3) and the dup-file note (U1-DUP); retargeted U1b to the real leak site and removed the U3-colliding target (U1b-1/U1b-2); flagged that the reorder tests must be **updated not green** (U4-1), that package-builder fill is affected (U4-3), that the U4 migration swaps only the gate line on the live no-tab body (U4-4), and that the wrap-gate must precede the pre-insert mutations (U4-2).
- **DIRECTIONAL:** code sketches are design guidance, not final code; the RPC hardening migration's apply is owner-gated (provider action), while the app-layer assertion ships locally.
