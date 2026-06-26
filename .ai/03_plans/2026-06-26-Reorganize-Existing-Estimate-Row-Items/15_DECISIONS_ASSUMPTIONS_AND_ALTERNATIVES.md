# Decisions, Assumptions, And Alternatives

## Decisions

D1. Row reorganization uses a dedicated row-item operation, not component movement.

D2. Same-branch reorder is part of MVP and requires an explicit target index.

D3. Left tree row drops are inside-only and append to the target node.

D4. Middle sheet row drops can target before or after another row for precise same-branch and cross-branch insertion.

D5. The first implementation moves one row at a time and disables row drag while multiple rows are selected.

D6. Movement is blocked in search, facet, group, dirty, saving, edit-active, and optimistic-ID states.

D7. The server persists final order through a new action and transaction-safe RPC.

D8. The tree forwards row drops through an event and does not own row mutation.

D9. Keyboard and touch users get a Move row dialog. A menu is rejected for MVP because branch browsing plus explicit position selection is too complex for a compact menu.

D10. The fine-pointer drag rail may use the existing 32px select column, but coarse-pointer movement must use a separate 44 by 44 CSS px Move row action.

D11. The public mutation naming is singular for the moved row: `moveEstimateRowItemWithHistory` / `move_estimate_row_item_with_history`. The affected sibling update list remains plural.

D12. The pure move helper accepts and returns `EstimateTreeNode[]` forest state, not a single root node.

D13. Affected source and target sibling lists normalize to dense integer sort order `0..n-1` after every move.

D14. The RPC derives actor identity from `auth.uid()`, uses a hardened security-definer envelope, and requires mutation ID idempotency.

## Assumptions

A1. The P6 single-node model is current: any valid estimate tree node may own row items and child nodes.

A2. Cross-tab row movement is not desired for MVP.

A3. Existing row history patterns should remain activity-only and not resurrect named version UI.

A4. The existing row grid can fit a handle above the checkbox without changing column widths.

A5. Native DnD plus an accessible move dialog is sufficient without a new dependency.

A6. The implementation can keep the compact rail for fine-pointer users without widening the column; if tests prove overlap or event leakage, widening the select column is an implementation correction, not a product decision.

## Alternatives Rejected

| Alternative | Reason Rejected |
| --- | --- |
| Cosmetic drag icon first | Existing code already warns against false row reorder grips |
| Reuse component `moveRows` | It moves component contents, not row items |
| Delete and reinsert rows | Loses identity, revisions, history semantics, and source links |
| Direct browser repository upsert | Bypasses live-workshop authorization and history safeguards |
| Make `EstimateSheetTree` mutate row state | Breaks content ownership and increases divergence risk |
| Support filtered/grouped order in MVP | Visible order may not match persisted sibling order |
| Add third-party DnD library immediately | Existing app patterns support MIME/event flows, and dialog fallback covers accessibility |
| Cross-tab row movement in MVP | Higher model and UX risk without a stated user need |
| Move-row menu instead of dialog | Branch browsing, explicit row position, empty states, and failure recovery need more structure than a menu should carry |
| Sparse/gapped row sort-order arithmetic | Dense order makes helper tests, affected updates, and RPC validation deterministic |
| Caller-supplied actor ID | Audit attribution must not trust browser-controlled identity |

## Future Product Choice

A later version can add selected-row bulk movement. That should be planned separately because it changes keyboard wording, history payload shape, ordering rules, and rollback scope.
