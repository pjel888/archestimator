# 20 — Open Questions and Decision Ledger

> Each question has a **recommended default** so implementation is never blocked. Philip can override any default.

## Q1: Should the third top-level tab be "Templates" or "Component"?
**Recommended default**: Keep **"Templates"**. The tab serves templates + reusable project sources. "Component" is ambiguous and conflicts with the Library tab's purpose.
**Alternatives**: Rename to "Reusable" or "Library+".
**Consequences of renaming**: stored `activeTab` pref breaks for legacy values.

## Q2: Should the Project tab be labeled "Project" or "Project Components"?
**Recommended default**: **"Project Components"** — disambiguates from reusable project sources.
**Complexity**: S (string change only).

## Q3: Should reusable project sources remain inside Templates?
**Recommended default**: **Yes** — they are conceptually "things you can pull into an estimate." Moving them to a 4th tab would crowd the tab strip. The source filter ("All / Custom / From projects") already lets users hide them.

## Q4: Should component edit be fully persisted?
**Recommended default**: **Yes** — wire to `AddComponentModal` edit mode via `updateCostLibraryComponent`. This is Phase 1 Task 1.2.

## Q5: Should component duplicate be fully persisted?
**Recommended default**: **Yes** — open `AddComponentModal` pre-filled. Phase 1 Task 1.3.

## Q6: Should component delete mean archive, hard delete, or local hide?
**Recommended default**: **Archive** — the `executeBulkArchiveLibraryComponents` RPC already exists. Archived items are hidden from browse but recoverable. This is the least-destructive honest option.
**Alternatives**: Hard delete (irreversible, breaks estimate rows referencing the item). Local hide (current behavior — dishonest).

## Q7: Should local-only actions exist in this sidebar at all?
**Recommended default**: **No** — every visible action should persist. Local-only actions are a UX debt that erodes trust. Phase 1 eliminates all of them.

## Q8: Should favorites and recents be browser-local or account-persisted?
**Recommended default**: **Browser-local for now**. Multi-device sync is not a pre-first-users priority. If feedback warrants, add a `user_preferences` table later.
**Owner needed**: Philip (product priority decision).

## Q9: Should custom tree ordering be browser-local or workspace-persisted?
**Recommended default**: **Browser-local for now**. Same rationale as Q8. The DB has `sort_order` for folders (persisted), but component-level drag-reorder is local.

## Q10: Should folders support delete, nesting, reparenting, and component movement here?
**Recommended default**: **Add Delete** (Phase 2 Task 2.2). Defer nesting/reparenting/move until user feedback warrants it. These are available on the full Library page.

## Q11: Should folder creation always force the default Library view?
**Recommended default**: **Yes** — creating a folder in Suppliers/Brand view would be confusing (where does it go?). Force default view, then let the user switch back.

## Q12: Should blur save folder names?
**Recommended default**: **Yes** — current behavior is correct. Enter and blur both commit. Escape cancels.

## Q13: Should empty folder names cancel or show validation?
**Recommended default**: **Cancel** — current behavior (`readFolderName` throws, which prevents the server call; the input retains focus). Showing inline validation would be better UX, but cancelling is simpler.

## Q14: Should template groups persist independently?
**Recommended default**: **No** — remove the "New Template Group" affordance (Phase 1 Task 1.5). Categories are derived from template data. If the user wants a group, they create a template with that category.

## Q15: Should project sources represent snapshots or live links?
**Recommended default**: **Snapshots** — the current RPC behavior is correct (copy-on-insert). The fix is to label it honestly (Phase 1 Task 1.4). Live links would require realtime sync infrastructure that is out of scope.

## Q16: Should hover prefetch remain enabled?
**Recommended default**: **Yes, with dedup** — add a `Set<string>` of prefetched project ids (Phase 3 Task 3.4). Hover prefetch significantly improves perceived performance for the common expand path.

## Q17: Should project-source data refresh on every Templates activation?
**Recommended default**: **No** — the current behavior loads once and relies on React Query staleTime (5 min). This is adequate. Forcing a refresh on every tab switch would increase server load with minimal freshness benefit.

## Q18: Should search state persist independently per tab?
**Recommended default**: **No** — search is ephemeral. The current behavior (query persists across tab switches within the sidebar instance) is acceptable; it does NOT persist across remounts.

## Q19: Should preview remain open through search and view changes?
**Recommended default**: **Yes** — current behavior. Preview is independent of search/view-mode. This lets the user keep a component pinned while browsing.

## Q20: Should insertion quantity reset when preview changes?
**Recommended default**: **No** — current behavior. The quantity is a single `insertQuantity` state field, not per-item. This is simpler than per-item quantities and adequate for the use case.

## Q21: Should double-click insert or only preview?
**Recommended default**: **Insert** — current behavior. Double-click is the fastest insertion path for power users. Single click opens preview.

## Q22: Should internal reorder use a dedicated drag handle?
**Recommended default**: **Yes, eventually** — the shared `Tree` already renders a `DotsSixVertical` drag handle that appears on hover. The sidebar enables both outward-copy drag and internal-reorder drag on the same row. A dedicated handle would disambiguate, but the current behavior is functional. Defer to Phase 3.

## Q23: What is the canonical insertion target term: Area, Group, or Node?
**Recommended default**: **Area** — the P6 single-node model uses "Area" as the universal term. All new nodes are areas. Legacy "group" references should be migrated. The UI should consistently say "Area" in all copy.

## Q24: Should users access the right sidebar below 1024px?
**Recommended default**: **Not now** — desktop-first estimating tool. If tablet support is needed, add a drawer (Phase 4 Task 4.1, XL complexity).

## Q25: Should panel collapse state persist?
**Recommended default**: **Yes** — Phase 2 Task 2.4. Low complexity, improves UX.

## Q26: Should bulk project-source insert be transactional?
**Recommended default**: **No** — sequential insertion with per-item error isolation is safer than a single transaction. If one source fails, the others still insert. The deterministic `correlation_id` prevents duplicates.

## Q27: Should all insertion pathways provide undo?
**Recommended default**: **Eventually** — undo for component delete is already implemented (local-only). Undo for template/project-source insertion would require soft-delete or version snapshots. Defer until user feedback warrants.

## Q28: Which operations must remain available to read-only users?
**Recommended default**: Browse (all tabs), search, preview, drag (to insert — server checks edit access). NO create/edit/delete/rename/folder-management. The server-side `is_workspace_editor` / `can_edit_estimate` guards enforce this regardless of what the client renders.

## Q29: Should the `/` shortcut open search or command palette?
**Recommended default**: **Search** — current behavior. The command palette exists but is not bound to a keyboard shortcut in the sidebar. If both are desired, use `Cmd+K` for palette and `/` for search.

## Q30: Should the legacy `NewComponentForm` be deleted or kept as a fallback?
**Recommended default**: **Delete** — the `AddComponentModal` is the canonical create surface, shared with the Components page. The legacy form's local-only behavior is a bug source (F-03/F-05). Phase 1 Task 1.2 removes it.
