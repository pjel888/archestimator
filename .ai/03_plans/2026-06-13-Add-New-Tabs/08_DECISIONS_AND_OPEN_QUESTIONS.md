# 08 — Key Decisions, Open Questions & Deferred Work

---

## Key Technical Decisions

### KTD1 — Lift release gate D-15 (expose tab creation)
**Decision:** Make the "+" / lifecycle visible now. **Why:** D-15 deferred
user-visible tab creation only until tab-aware XLSX export shipped; the
completion audit (`.ai/05_logs/2026-06-12-estimate-tabs-implementation-completion-audit.md`)
records that export parity (`?tab=`, all-tabs worksheets, preview scope chips)
landed. The precondition is met. **This is a deliberate product decision, not a
silent flag flip** — it must be recorded in `.ai/10_state/decisions.md` (U7).

### KTD2 — "+" + double-click rename + right-click menu (no toolbar row)
**Decision (owner):** The "+" is the only persistent control. Double-click
renames; right-click opens a context menu for Rename/Duplicate/Delete([Archive]).
The current persistent toolbar buttons are removed. **Why:** matches the browser
mental model the owner specified; keeps the dense editor chrome quiet. **Cost:**
a real UI refactor (net-new context menu + handler retargeting), not just gating.

### KTD3 — Lifecycle actions target the right-clicked tab
**Decision:** Refactor `beginRename` / `duplicateActiveTab` /
`archiveOrDeleteActiveTab` to take a target `tabId`; right-click does not
force-activate. **Why:** browser semantics — you act on the tab you right-click,
including background tabs. Today they all act on the active tab, which would be
wrong for a context menu.

### KTD4 — Permission-gate on a server-resolved `canEditEstimate`
**Decision:** Thread an edit-capability boolean from the server to the strip and
empty state; hide affordances for non-editors. **Why:** the editor route admits
read-access members (RLS `can_access_estimate`), and no client edit signal
exists today — a naive gate-flip would show viewers a "+" that errors
server-side. Gating is UX only; the server (RLS + `assert_can_edit_estimate_for_history`)
stays the source of truth. **Bonus:** closes the latent gap where viewers see
other edit affordances that fail server-side.

### KTD5 — No database / RPC / RLS change; hosted apply is a prerequisite
**Decision:** Touch no migration, RPC, RLS, or generated type by hand. **Why:**
`create_estimate_tab_with_history`, the table, and policies already shipped in
`20260612094734_estimate_tabs_foundation.sql`. **Constraint:** applying that
migration to the hosted DB is owner-gated (agents can't apply — Docker absent /
hosted SQL denied). The feature **fails closed** if unapplied (strip hidden), so
this is a deploy-checklist item, not a code risk.

### KTD6 — Efficient create: cache-set over refetch; optional optimistic append
**Decision:** On create, set the `tabs` query cache from the action's returned
array instead of a blind `refetch()`; optionally add an `optimistic-` temp-tab
append with rollback. **Why:** the action already returns canonical tabs; the
current double-update adds a redundant round-trip and a flash. Mirrors the repo's
`TemplatesBrowseManager` optimistic pattern.

### KTD7 — No name-uniqueness; rely on `getNextTabName`
**Decision:** Do not add tab-name uniqueness. **Why:** duplicate names are
intentional (no DB constraint); `getNextTabName` already skips used `Tab N` names
case-insensitively; the only server validation is trimmed-non-empty.

---

## Open Questions (resolve during implementation)

### OQ1 — Do view-only members reach `/workshop/...` in production?
If viewers are always routed to the read-only `/share/[token]` surface and never
to the workshop editor, then KTD4's permission thread is a robustness improvement
rather than a strict v1 requirement. **Resolve:** audit the route's access
behavior / share routing. **Default if unresolved:** implement KTD4 anyway
(default-false prop is cheap and correct).

### OQ2 — Include Archive in the context menu, or Delete only?
The owner said "delete should be in the right-click menu." Archive (soft-delete,
already supported) is optional. **Default:** include both Rename, Duplicate,
Delete; treat Archive as a fast-follow toggle unless the owner wants it in v1.

### OQ3 — A global "new tab" keyboard shortcut?
A focusable "+" is sufficient for v1. A global shortcut risks browser conflicts
(`Cmd/Ctrl+T` is the browser's). **Default:** no global shortcut in v1; revisit
with a non-conflicting chord (e.g. `Ctrl/Cmd+Alt+T`) later.

### OQ4 — Delete confirmation?
The editor deletes nodes without a confirm dialog; tab delete is a hard delete.
**Default:** no modal in v1 (menu + danger styling + last-tab guard). Add a
lightweight confirm only if the owner wants the guard rail.

---

## Deferred / Out of Scope

- **Cross-tab node move (D-7 / R1.7).** Dragging estimate-tree nodes between tabs
  stays **unsupported** and rejected with a toast
  ([EstimateTabStrip.tsx:168](src/components/workshop/estimate-sheet/EstimateTabStrip.tsx#L168)).
  Creating tabs makes this reachable for the first time in beta — **verify the
  rejection still fires**, but do not build the move RPC. A true move needs a new
  RPC + DB simulation + provider proof + product semantics (separate effort).
- **Persisting active tab across reloads.** The Zustand store is in-memory;
  active tab resets to default on reload. Existing behavior; out of scope.
- **Pruning stale per-tab store entries** (`selectedNodeIdByTabId` etc.) on
  delete/archive. Harmless leak; minor follow-up.
- **All-tabs export performance at high tab counts.** Bounded and guarded today;
  monitor, don't pre-optimize.
- **Hosted Supabase migration apply + typegen.** Owner-gated; tracked as deploy
  prerequisite, not code.
