# 12 — Open Questions and Decisions

Each question now has an operative planning answer. Questions marked **Already decided** retain current behavior or the documented recommendation; dated questions use the default answer unless Philip explicitly overrides before the deadline.

**Decision states**:
- **Already decided**: the current behavior or documented recommendation is the final planning answer.
- **Provisional planning answer**: the default is binding for implementation planning now, but Philip may still override it before the listed deadline.
- **Final answer**: the answer after Philip explicitly decides or the override deadline passes.

## Q-01 · What node should be selected immediately after creation?

**Recommendation**: The newly created node should be selected.

**Rationale**:
- Current behavior already does this (entry file L857: `setSelectedNodeId(optimisticNodeId)`)
- Matches user mental model: "I created this; show me this"
- Enables immediate rename without an extra click

**Consequence**: If parent is collapsed, parent expands and child becomes visible. May scroll the tree.

---

## Q-02 · Should new rows automatically enter rename mode?

**Recommendation**: YES.

**Rationale**:
- Default name is "New Area" — rarely the user's intended final name
- Auto-rename saves a click
- Current behavior matches (entry file L859: `setEditingNodeId(optimisticNodeId)`)

**Consequence**: Input focus captured; user can immediately type or Escape.

---

## Q-03 · Should default name be auto-selected on rename entry?

**Recommendation**: YES (select-all).

**Rationale**:
- Allows user to start typing immediately to replace "New Area"
- Current behavior matches (entry file L979: `input.select()`)
- For existing-node rename, select-all lets user replace without deleting char-by-char

**Consequence**: Caret ends at end of text. If user wants to append, must press End or click.

---

## Q-04 · Should blur save rename?

**Recommendation**: YES (current behavior).

**Rationale**:
- Standard desktop tree editor pattern
- Reduces clicks vs requiring explicit save
- User who clicks elsewhere signals "I'm done"

**Consequence**: Accidental blur (e.g., tabbing away) saves intermediate state. Risk mitigated by Escape to cancel.

---

## Q-05 · Should Escape cancel rename?

**Recommendation**: YES (current behavior).

**Rationale**:
- Universal "cancel" affordance
- Allows rapid exit without committing a typo

**Consequence**: User loses typed name. Acceptable.

---

## Q-06 · What happens when Escape pressed on a newly created unsaved row?

**Recommendation**: Cancel rename AND cancel the create (rollback optimistic node).

**Rationale**:
- A new node with "New Area" name and no user commitment is wasteful
- Server create is in-flight; can't truly cancel but optimistic row should be removed
- Alternative: server create completes and stays; user must delete manually (worse UX)

**Current behavior**: Escape only cancels the rename editor (entry file L1425-1428 → `cancelRenameNode`). The create continues. **INCONSISTENT — should fix.**

**Consequence**: Server create still completes (wasted write) unless we add abort signal.

---

## Q-07 · Should duplicate sibling names be allowed?

**Recommendation**: YES, allow.

**Rationale**:
- Construction estimating often has parallel structures (e.g., "Bedroom" appears multiple times)
- Forcing unique names burdens the user
- Disambiguation via hierarchy path or ID

**Current behavior**: No check; duplicates allowed. Matches recommendation.

**Consequence**: User may accidentally create "Kitchen" twice. Bulk operations and search must handle gracefully.

---

## Q-08 · Should empty names be allowed?

**Recommendation**: NO.

**Rationale**:
- Empty name renders as blank row — bad UX
- Confusing for AT users ("treeitem, blank")
- Hard to select/identify later

**Current behavior**: Rejected (entry file L1027-1033). Matches recommendation.

**Consequence**: Whitespace-only also rejected via `.trim()`. User MUST provide a name.

---

## Q-09 · What becomes selected after deletion?

**Recommendation**: Fallback order: next sibling → previous sibling → parent → first root → null.

**Rationale**:
- User's mental position should stay near the deleted node
- Next sibling is most likely the "next thing I was going to look at"
- Parent is fallback when no siblings
- First root is last resort
- null only when tree is empty

**Current behavior**: Matches (estimate-tree-edit.ts:109-123).

**Consequence**: Selection is deterministic given same tree state.

---

## Q-10 · Should deleting a parent cascade to descendants?

**Recommendation**: YES, cascade.

**Rationale**:
- Orphaned children break tree semantics (every node must have a parent)
- Reassigning children to grandparent is surprising (user expected them deleted)
- Cascade matches trash/delete pattern in file systems

**Current behavior**: Cascade (estimate-tree-edit.ts:68-69, server RPC).

**Consequence**: Cannot delete a parent while preserving children. User must move children first if they want to preserve.

---

## Q-11 · Should deletion support undo?

**Recommendation**: YES (Phase 6+ or post-launch).

**Rationale**:
- Accidental delete is destructive (cascade removes many nodes)
- Industry standard (Gmail, GitHub, Figma) offers 5-30s undo window
- Implementation: soft-delete with `deleted_at` timestamp + restore RPC

**Current behavior**: NO undo. Optimistic rollback only if server rejects.

**Consequence**: Need DB migration (add `deleted_at`), new RPC, undo toast UI.

---

## Q-12 · Should dragging into a collapsed parent auto-expand it?

**Recommendation**: YES, after 500ms hover.

**Rationale**:
- Standard file-system tree pattern (macOS Finder, Windows Explorer)
- Allows user to drop "inside" without first manually expanding
- 500ms timer prevents accidental expand during fast drag-over

**Current behavior**: NO hover-expand (Finding F-14). Only expands AFTER drop completes.

**Consequence**: Add timer in `handleDragOver` (Phase 6).

---

## Q-13 · Should selection follow a moved node?

**Recommendation**: YES.

**Rationale**:
- User just moved it; "what was I doing?" continuity
- Allows immediate next action on the moved node
- Standard pattern (Figma layers, Notion pages)

**Current behavior**: Implicit YES — selection state is by ID, and the ID moves with the node. No explicit re-selection needed.

**Consequence**: None.

---

## Q-14 · Should expansion state persist across refreshes?

**Recommendation**: YES, via localStorage per estimate/tab.

**Rationale**:
- Users spend significant time setting up their view
- Losing expansion on refresh is jarring
- localStorage is cheap and per-scope

**Current behavior**: NO persistence — Zustand store in-memory (Finding F-EXPAND-PERSIST).

**Consequence**: Add localStorage persistence in `useEstimateWorkspaceExpansion` (Phase 6). Watch for quota limits.

---

## Q-15 · Should active selection appear in the URL?

**Recommendation**: YES (current behavior).

**Rationale**:
- Shareable deep links
- Refresh preserves context
- Browser back/forward navigates selection history

**Current behavior**: YES via `window.history.replaceState` (entry file L676-685).

**Consequence**: URL changes per selection (replaceState, no scroll). Tab switch does NOT change URL (selection state inside the tab).

---

## Q-16 · Should pending row mutations block only the row or the entire sidebar?

**Recommendation**: Only the row.

**Rationale**:
- Users often want to do parallel work ("rename A, then while that saves, rename B")
- Sidebar-wide block feels sluggish
- Per-row block matches user mental model

**Current behavior**: Sidebar-wide block via `isTreeMutationSaving` (Finding F-15).

**Consequence**: Track `pendingNodeIds: Set<string>` in reducer; check per row in handlers (Phase 4).

**Caveat**: Some mutations affect the whole tree (e.g., bulk delete). Those should still block globally.

---

## Q-17 · How should concurrent server updates be resolved?

**Recommendation**: Last-write-wins with optimistic reconciliation.

**Rationale**:
- True OT/CRDT is over-engineered for tree structure
- Most edits don't conflict (different users edit different nodes)
- LWW is the Supabase default
- On conflict: latest server state wins; client optimistic state rolled back

**Current behavior**: LWW (no version/etag).

**Consequence**: Rare lost updates. Acceptable for v1; consider versioning for v2 if conflicts become common.

---

## Q-18 · How should large trees be rendered?

**Recommendation**: Virtualization at 150+ visible nodes (current), with lazy subtree loading at 1000+ total.

**Rationale**:
- Virtualization handles the common case (deep but narrow trees)
- For extremely wide trees (1 parent + 1000 children), lazy-load each subtree on expand
- Lazy-load requires server endpoint for subtree fetch (not currently implemented)

**Current behavior**: Virtualization only (150+ threshold). No lazy-load.

**Consequence**: 10000-node estimate will be slow to load (full tree fetch) but render OK with virtualization. Lazy-load is v2.

---

## Q-19 · Should `disableRouteSync` (public share) also disable CRUD affordances?

**Recommendation**: YES.

**Rationale**:
- Public viewer cannot edit
- Showing enabled CRUD buttons misleads
- Server RLS rejects but UX is poor

**Current behavior**: `disableRouteSync` only disables URL writes; CRUD still visible.

**Consequence**: Hide CRUD buttons / show read-only state when `disableRouteSync === true` or `canEditEstimate === false` (Phase 6).

---

## Q-20 · What is the maximum allowed tree depth?

**Recommendation**: 100.

**Rationale**:
- Construction estimates rarely exceed depth 10 (Project → Lot → Structure → Level → Assembly → Area → Sub-area)
- 100 gives 10× headroom for edge cases
- Recursive algorithms safe at 100 (well below JS stack limit ~10000)

**Current behavior**: No limit (Finding F-MAXDEPTH).

**Consequence**: Add client + server validation. Reject creates / reparents exceeding depth 100.

---

## Q-21 · Should the sidebar support multi-node drag?

**Recommendation**: NO (for v1).

**Rationale**:
- Current single-node DnD is already complex
- Multi-node DnD multiplies edge cases (partial cycles, mixed parents, partial failures)
- Bulk delete already handles multi-node operations
- Users can move one at a time, or use bulk-move (future feature)

**Current behavior**: Single-node only (`validateEstimateTreeDrop` blocks `multi-drag-unsupported`).

**Consequence**: Document as known limitation. Add bulk-move in v2 if requested.

---

## Q-22 · Should the rename input show character count?

**Recommendation**: Only if max-length is enforced.

**Rationale**:
- Showing count without limit is noise
- If we add a max length (recommended: 200 chars), show count

**Current behavior**: No max length, no count.

**Consequence**: Add max length + count together.

---

## Q-23 · Should the sidebar support templates and project-source drops?

**Recommendation**: YES (current behavior).

**Rationale**:
- Templates are a key workflow
- Project-source reuse is a key feature
- Drop-into-row is the natural UX

**Current behavior**: YES (entry file L792-835).

**Consequence**: Need optimistic placeholder for external drops (Finding F-EXT-OPTIMISTIC, Phase 6).

---

## Q-24 · Should the sidebar show presence indicators (other users viewing)?

**Recommendation**: Out of scope for sidebar; middle sheet has presence.

**Rationale**:
- Sidebar is structural; presence is meaningful at the row level (middle sheet)
- Adding presence to sidebar adds clutter

**Current behavior**: NO presence in sidebar.

**Consequence**: None.

---

## Q-25 · What happens if a user opens the same estimate in two tabs?

**Recommendation**: Each tab has independent Zustand state (per-tab scope).

**Rationale**:
- Tabs are isolated browser contexts
- Independent state allows parallel exploration
- Server resolves conflicts via LWW

**Current behavior**: Each browser tab has its own Zustand store (in-memory). Tabs are isolated.

**Consequence**: Selection/expansion in tab A doesn't affect tab B. Mutations in tab A don't trigger realtime updates in tab B (no Supabase Realtime subscription on the tree cache).

---

## Summary

| # | Question | Recommendation | Status |
|---|---|---|---|
| Q-01 | Selection after create | New node | Current ✓ |
| Q-02 | Auto-enter rename | YES | Current ✓ |
| Q-03 | Default name auto-select | YES | Current ✓ |
| Q-04 | Blur saves rename | YES | Current ✓ |
| Q-05 | Escape cancels rename | YES | Current ✓ |
| Q-06 | Escape on new unsaved row | Cancel rename AND rollback | **FIX** |
| Q-07 | Duplicate names | Allow | Current ✓ |
| Q-08 | Empty names | Reject | Current ✓ |
| Q-09 | Selection after delete | Next→prev→parent→root→null | Current ✓ |
| Q-10 | Delete parent cascade | YES | Current ✓ |
| Q-11 | Delete undo | Add (post-launch) | **NEW** |
| Q-12 | Drag-hover expand | YES, 500ms timer | **FIX** (F-14) |
| Q-13 | Selection follows move | YES | Current ✓ |
| Q-14 | Expansion persists | YES (localStorage) | **FIX** |
| Q-15 | Selection in URL | YES | Current ✓ |
| Q-16 | Per-row block | YES | **FIX** (F-15) |
| Q-17 | Concurrent updates | LWW | Current ✓ |
| Q-18 | Large tree rendering | Virtualize + lazy-load (v2) | Current partial |
| Q-19 | disableRouteSync hides CRUD | YES | **FIX** |
| Q-20 | Max depth | 100 | **FIX** (F-MAXDEPTH) |
| Q-21 | Multi-node drag | NO (v1) | Current ✓ |
| Q-22 | Char count | Only if max-length | **NEW** |
| Q-23 | External drops | YES | Current ✓ |
| Q-24 | Presence in sidebar | NO | Current ✓ |
| Q-25 | Same estimate in 2 tabs | Independent state | Current ✓ |

**Decision rule applied (2026-06-25)**: Q-06, Q-11, Q-14, Q-19, Q-20, and Q-22 have provisional planning answers from the defaults in the table below unless Philip explicitly overrides by the listed deadline. These questions no longer block implementation planning.

---

## Decision Deadlines and Defaults

Every question above carries a **decision deadline** and a **default-if-no-answer**. The default-if-no-answer is the operative answer for implementation planning unless Philip records a different answer by the deadline; after the deadline, the provisional planning answer becomes the final answer. Deadlines are anchored to the implementation phase each question blocks (per `10-IMPLEMENTATION-PLAN.md`); the six Philip-owned questions (Q-06, Q-11, Q-14, Q-19, Q-20, Q-22) carry defaults copied verbatim from `13-PLAN-AUDIT-AND-SCORECARD.md` §10, and the remaining questions are already decided — their documented recommendation stands as the answer.

| Question | Blocks phase | Deadline (YYYY-MM-DD) | Default if no answer | Rationale for default |
|---|---|---|---|---|
| Q-01 | P0 / P3 (create flow) | Already decided | Current behavior confirmed | Selection-after-create already matches the recommendation (entry file L857). |
| Q-02 | P0 (create flow) | Already decided | Current behavior confirmed | Auto-rename on create is already implemented (entry file L859). |
| Q-03 | P0 (rename flow) | Already decided | Current behavior confirmed | Select-all on rename entry is already implemented (entry file L979). |
| Q-04 | — (rename) | Already decided | Current behavior confirmed | Blur-saves is the current behavior and matches the recommendation. |
| Q-05 | — (rename) | Already decided | Current behavior confirmed | Escape-cancels is the current behavior and matches the recommendation. |
| Q-06 | P3 (race) | 2026-07-08 | Cancel rename AND rollback optimistic node | Verbatim from `13` §10; avoids orphaned "New Area" rows and closes the Escape/create inconsistency. |
| Q-07 | — (validation) | Already decided | Current behavior confirmed | Duplicate names are already allowed and match the recommendation. |
| Q-08 | — (validation) | Already decided | Current behavior confirmed | Empty names are already rejected (entry file L1027-1033). |
| Q-09 | P6.3 (delete focus) | Already decided | Current behavior confirmed | Fallback selection order already matches the recommendation (estimate-tree-edit.ts:109-123). |
| Q-10 | P1.2 (cascade RPC) | Already decided | Current behavior confirmed | Cascade delete is already implemented (client + server RPC). |
| Q-11 | Post-launch | 2026-08-15 | Defer to post-launch (no v1 undo) | Verbatim from `13` §10; undo is a post-launch feature; v1 ships without it. |
| Q-12 | P6.2 (hover-expand) | Already decided | YES, 500ms hover-expand | Documented recommendation stands (F-14 fix scoped to Phase 6.2); not Philip-blocking. |
| Q-13 | — (move) | Already decided | Current behavior confirmed | Selection follows the moved node implicitly (ID-based selection). |
| Q-14 | P6.6 (expansion persist) | 2026-07-28 | YES, persist per estimate/tab | Verbatim from `13` §10; localStorage persistence closes F-EXPAND-PERSIST in Phase 6.6. |
| Q-15 | — (routing) | Already decided | Current behavior confirmed | Selection-in-URL is already implemented via replaceState (entry file L676-685). |
| Q-16 | P4.1 (per-row block) | Already decided | YES, per-row pending state | Documented recommendation stands (F-15 fix scoped to Phase 4.1); not Philip-blocking. |
| Q-17 | — (concurrency) | Already decided | Current behavior confirmed | Last-write-wins is already the behavior and matches the recommendation. |
| Q-18 | P2 / v2 (large trees) | Already decided | Virtualize at 150+; lazy-load deferred to v2 | Documented recommendation stands; virtualization is current, lazy-load is explicitly v2. |
| Q-19 | P6.10 (read-only mode) | 2026-07-28 | YES, hide CRUD when `disableRouteSync === true` or `canEditEstimate === false` | Verbatim from `13` §10; closes the public-share/viewer UX gap in Phase 6.10. |
| Q-20 | P1.5 (max depth) | 2026-06-30 | 100 | Verbatim from `13` §10; client + server validation added in Phase 1.5. |
| Q-21 | — (v1 scope) | Already decided | Current behavior confirmed | Single-node DnD only; multi-node explicitly deferred as a v1 limitation. |
| Q-22 | P0.7 (rename input) | 2026-06-26 | Only if max-length (200) is enforced; defer UI to post-launch | Verbatim from `13` §10; character count only ships together with a max length. |
| Q-23 | P6.4 (external drops) | Already decided | Current behavior confirmed | Templates and project-source drops are already supported (entry file L792-835). |
| Q-24 | — (out of scope) | Already decided | Current behavior confirmed | Presence intentionally excluded from sidebar; lives in the middle sheet. |
| Q-25 | — (per-tab state) | Already decided | Current behavior confirmed | Each tab already has independent in-memory Zustand state. |
