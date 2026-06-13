# 01 — Current State & Reframing

**Plan:** Add New Tabs (estimate editor "+" affordance)
**Date:** 2026-06-13 · **Type:** feat · **Branch target:** `main`
**Status:** Planning only — no code, no schema, no data changed.

---

## The headline (read this first)

**The "Add New Tab" feature already exists in the code.** The "+" button, the
client handler, the server action, the RPC, auto-naming, optimistic tab-switch,
and inline-rename-on-create are all built and unit-tested. They are **hidden
behind a deliberate release gate (decision D-15)** — the gate's precondition
(tab-aware XLSX export) has since shipped, so the gate can now be lifted.

So this plan is **not "build a + button."** It is:

1. Lift the D-15 gate and make the "+" visible to users who can edit.
2. Replace the *current* persistent toolbar button row (Duplicate / Rename /
   Archive / Delete) with the owner's chosen model: **"+" stays the only
   always-visible control; double-click renames; right-click opens a context
   menu for the rest.**
3. Permission-gate the affordance so view-only members never see it.
4. Bring the affordance and the new-tab experience to a browser-grade,
   impeccable design bar.
5. Verify the (already-tolerant) downstream consumers and document blast radius.

No database migration, RPC, or RLS change is required.

---

## What exists today (with evidence)

### The "+" button and create flow — already built

| Capability | Location | Notes |
|---|---|---|
| "+" button (Phosphor `Plus`, `aria-label="Create tab"`) | [EstimateTabStrip.tsx:411](src/components/workshop/estimate-sheet/EstimateTabStrip.tsx#L411) | Renders only when `lifecycleActionsReady && canCreateTabs` |
| `createTab()` handler | [EstimateTabStrip.tsx:219](src/components/workshop/estimate-sheet/EstimateTabStrip.tsx#L219) | Calls action, switches to new tab, arms inline rename |
| Auto-name `getNextTabName()` | [EstimateTabStrip.tsx:60](src/components/workshop/estimate-sheet/EstimateTabStrip.tsx#L60) | Returns `Tab N`, skips case-insensitive collisions |
| Server action `createEstimateTab()` | [actions.ts:1843](src/lib/estimates/actions.ts#L1843) | Wraps RPC, returns `{ estimateTabId, tabs }` |
| RPC `create_estimate_tab_with_history` | `supabase/migrations/20260612094734_estimate_tabs_foundation.sql` | `sort_order = max+10`, `is_default=false`, writes `tab_created` event, authorizes via `assert_can_edit_estimate_for_history` |
| Double-click → rename | [EstimateTabStrip.tsx:398](src/components/workshop/estimate-sheet/EstimateTabStrip.tsx#L398) | Already wired (`beginRename`) |
| New-tab empty state ("This tab is empty" / Add Group / Browse templates) | [EstimateSheetContent.tsx:1833](src/components/workshop/EstimateSheetContent.tsx#L1833) | Already built |

### Why it's invisible

The strip is mounted **without** the lifecycle props, so they default to
`false`:

```tsx
// src/components/workshop/EstimateSheetContent.tsx:1719
<EstimateTabStrip
  tabs={estimateTabs}
  activeTabId={activeTabId ?? estimateTabs[0]?.id ?? "legacy-main"}
  projectId={projectId}
  estimateId={estimateId}
  onTabChange={onActiveTabChange ?? (() => {})}
  onTabsChange={onEstimateTabsChange}
  // enableLifecycleActions, canCreateTabs, ... NOT passed → all false
/>
```

The prop defaults at [EstimateTabStrip.tsx:78](src/components/workshop/estimate-sheet/EstimateTabStrip.tsx#L78)
(`enableLifecycleActions = false`, `canCreateTabs = false`, …). The doc comment
on the props (lines 28–32) explicitly names this as **release gate D-15**:
"lifecycle controls stay hidden in the editor until the tab-aware export phase
ships in the same release train."

### The gate's precondition is now met

D-15 existed to prevent shipping tab *creation* before tab-aware *export*
(otherwise a user could split work across tabs that the proposal export would
silently drop — a perceived data-loss bug). The estimate-tabs completion audit
(`.ai/05_logs/2026-06-12-estimate-tabs-implementation-completion-audit.md`)
records that tab-aware export (`?tab=` + all-tabs worksheets + preview scope
chips) shipped. **The blocker is cleared; lifting D-15 is now a legitimate,
deliberate decision** (see [08 — Decisions](08_DECISIONS_AND_OPEN_QUESTIONS.md)).

---

## The current toolbar vs. the chosen model

**Today, when `enableLifecycleActions` is true,** the strip renders a row of
ghost icon buttons after the tabs: Create (+), Duplicate, an always-on Rename
pencil ([:437](src/components/workshop/estimate-sheet/EstimateTabStrip.tsx#L437),
no separate flag), Archive (text), and Delete (trash). All of them act on the
**active** tab.

**The owner's chosen model (this plan):**

- **"+"** — the only always-visible control.
- **Double-click a tab** → inline rename (already wired).
- **Right-click a tab** → context menu containing Delete (and Duplicate /
  Archive / Rename), acting on the **right-clicked** tab — browser semantics.
- The persistent Duplicate / Rename-pencil / Archive / Delete **buttons are
  removed** from the strip.

This is a real UI refactor, not just a flag flip — see
[02 — UX/UI Design](02_UX_UI_DESIGN.md) and
[07 — Implementation Plan](07_IMPLEMENTATION_PLAN.md).

---

## Access model (why permission-gating is needed)

- The editor route resolves context via `resolveEstimateTabRouteContext`
  ([workspace-repository.ts:1829](src/lib/repositories/workspace-repository.ts#L1829)),
  which only requires **read** access (RLS `can_access_estimate`). It
  `notFound()`s only when the project/estimate is inaccessible.
- **Writes** are enforced separately, server-side, by `assertCanEditEstimate`
  → RPC `can_edit_estimate` ([actions.ts:345](src/lib/estimates/actions.ts#L345)).
- **No client-side edit-permission signal is threaded into the editor today.**
  `EstimateSheetContentProps` ([EstimateSheetContent.tsx:118](src/components/workshop/EstimateSheetContent.tsx#L118))
  has no `canEdit`/role prop.

**Consequence:** a view-only member who reaches `/workshop/.../estimates/...`
would, if we naively flip the gate, see a "+" that errors ("Estimate edit
access denied") on click. To hit the impeccable bar, the plan threads a
server-resolved `canEditEstimate` capability down to the strip and gates the
affordance on it. This also retroactively closes the latent gap for any other
edit affordance in the editor.

> **Audit correction (verified against source):** `resolveEstimateTabRouteContext`
> resolves **no per-user role** — its return type and helpers
> (`getCurrentWorkspaceProject`) never join the member tables. So
> `canEditEstimate` cannot "reuse" an existing route role; it must be resolved by
> calling the `can_edit_estimate` RPC (the same function RLS uses) **inside the
> page's existing `Promise.all`**, so it runs in parallel. This is one extra
> parallel DB read, not free — see [07 U1](07_IMPLEMENTATION_PLAN.md).

> **Open question (OQ1):** In production, do view-only members actually land on
> `/workshop/...` at all, or are they always routed to the read-only
> `/share/[token]` surface? This affects whether the permission thread is
> strictly required for v1 or is a robustness improvement. Resolve during
> implementation — see [08](08_DECISIONS_AND_OPEN_QUESTIONS.md).

---

## Hosted-database reality (deployment dependency)

The `estimate_tabs` table and its RPCs live in migration
`20260612094734_estimate_tabs_foundation.sql`, but **linked/hosted Supabase
apply is still unproven** (current-state marks it `provider-proof-open`), and
agents in this environment **cannot apply migrations** (Docker absent; hosted
SQL via MCP denied by the permission classifier — see memory
`archestimator-db-channel-boundaries.md`).

**Net effect on this plan:** no DB work is in scope, but **applying the
migration to the hosted database is a hard prerequisite** for the "+" to
function in production. There is a natural safety net: the page only populates
`estimateTabs` when a real tab resolves, and the strip only renders when
`estimateTabs.length > 0` ([EstimateSheetContent.tsx:1719](src/components/workshop/EstimateSheetContent.tsx#L1719)).
If the schema is unapplied, `resolveEstimateTabRouteContext` falls back to the
legacy (tab-less) path and the strip — and therefore the "+" — never renders.
The feature fails *closed*, not *broken*. See
[03 — Database/Backend](03_DATABASE_BACKEND_RLS.md) and
[06 — Blast Radius](06_BLAST_RADIUS.md).

---

## What is genuinely missing (the actual work)

1. A **server-resolved edit-capability** prop threaded page → workspace client
   → content → strip.
2. A **right-click context menu** on tabs (none exists yet), with handlers
   refactored to target the right-clicked tab.
3. **Lifting the gate** at the mount site, gated on edit capability, exposing
   only "+", double-click rename, and the context menu (no toolbar row).
4. **Browser-grade polish**: overflow/scroll behavior, "+" tooltip, motion,
   keyboard reachability, scroll-new-tab-into-view, and empty-state edit-gating.
5. **Verification + documentation** of downstream consumers and blast radius,
   and a recorded D-15-lift decision.
