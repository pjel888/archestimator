# 08 — Edge Case and Test Matrix

## 8.1 Existing Test Inventory

Tests touching the sidebar feature (from grep):

| Test file | Scope | Success | Failure | Cancel | Concurrency |
|---|---|---|---|---|---|
| `tests/vitest/estimate-tree-modal.test.tsx` | Tree modals | YES | partial | NO | NO |
| `tests/vitest/estimate-tree-bulk-selection.test.tsx` | Bulk select | YES | NO | NO | NO |
| `tests/vitest/estimate-workspace-client-cache.test.tsx` | Cache layer | YES | partial | NO | NO |
| `tests/vitest/estimate-tree-refetch-on-mount.test.tsx` | Mount refetch | YES | NO | NO | NO |
| `tests/vitest/estimate-sheet-tree-dnd.test.tsx` | DnD integration | YES | partial | NO | NO |
| `tests/vitest/estimate-tree-node-icon.test.tsx` | Row icons | YES | — | — | — |
| `tests/vitest/estimate-tree-filter.test.tsx` | Filter + search | YES | — | — | — |
| `tests/vitest/estimate-sheet-tree-dom.test.tsx` | DOM render | YES | — | — | — |
| `tests/vitest/estimate-side-panel-rails.test.ts` | Rail visibility | YES | — | — | — |
| `tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx` | Library consumers | YES | — | — | — |
| `tests/vitest/estimate-tree-drag-over-perf.test.ts` | Drag perf | YES | — | — | — |
| `tests/vitest/estimate-tree-context-menu.test.tsx` | Context menu | YES | — | — | — |
| `tests/vitest/estimate-tree-edit.test.ts` | Tree edit ops | YES | partial | NO | NO |
| `tests/vitest/estimate-tree-reorder.test.ts` | Reorder pure ops | YES | YES | YES | NO |
| `tests/vitest/estimate-node-reorder-action.test.ts` | Reorder action | YES | partial | — | — |
| `tests/vitest/estimate-sheet-tree-query-error.test.tsx` | Query error | — | YES | — | — |
| `tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx` | Bulk row delete | — | YES | — | partial |
| `tests/vitest/estimate-tree-data.test.ts` | Tree data ops | YES | — | — | — |
| `tests/vitest/estimate-sheet-library-insert.test.tsx` | Template insert | YES | — | — | — |
| `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | Cost inputs | — | — | — | — |

## 8.2 CI Commands

| Script | Command | Covers sidebar? |
|---|---|---|
| `bun run validate` | type-check + lint + design-system + unit + dom | YES |
| `bun run type-check` | `tsc --noEmit` | YES |
| `bun run lint` | ESLint 9 | YES |
| `bun run lint:design-system` | Custom design-system enforcement | YES (F-09 catchable) |
| `bun run test` | Bun unit (`tests/unit/`) | NO (sidebar in vitest/) |
| `bun run test:dom` | Vitest jsdom (`tests/vitest/`) | YES (20+ tests) |
| `bun run test:e2e` | Playwright Chromium | YES (`estimate-tree-dnd` under `ARCHESTIMATOR_E2E_MUTATING_DND=1`) |
| `bun run build` | Next.js production build | YES |

## 8.3 Edge-Case Test Matrix

| ID | Feature | Preconditions | Action | Expected UI | Expected state | Expected network | Persistence | Focus | Selection | Failure path | Coverage | Level | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EC-001 | Create | Empty tree | Click "Add Branch" | Optimistic row + rename editor | editingNodeId=opt, selected=opt | createEstimateNode | INSERT | Input focused | opt selected | RPC fail → rollback | partial | integration | P1 |
| EC-002 | Create | Selected X | Click "Add Branch" | Row as child of X | X expanded, opt under X | RPC | INSERT | Input focused | opt | Rollback | partial | integration | P1 |
| EC-003 | Create | Renaming Y | Click "Add" | SHOULD BLOCK or CLOSE rename | cleanup | — | — | — | — | — | NONE | unit | P2 |
| EC-004 | Create | Pending mutation | Click "Add" | BLOCKED | unchanged | — | — | — | — | — | NONE | integration | P2 |
| EC-005 | Create | 2 rapid clicks | Click twice | Second blocked | unchanged after first | 1 RPC | — | — | — | — | NONE | integration | P2 |
| EC-006 | Create | Slow network | Add + change selection | After settle, selection stays at user-chosen (F-01) | user-chosen | 1 RPC | INSERT | — | user-chosen | n/a | NONE | integration | P1 |
| EC-007 | Create | Optimistic parent | Add child of opt | Chains | opt-child | 2 RPCs | 2 INSERTs | Input | opt-child | Parent fails → child fails | NONE | integration | P2 |
| EC-008 | Create | IME composition | Type "あ" + Enter | NO premature save | n/a | — | — | — | — | Premature save | NONE | integration | P2 |
| EC-009 | Create | Server echo mid-rename | Server responds during typing | Transparent remap | editingNodeId=serverId | — | — | Input retains | serverId | n/a | NONE | integration | P2 |
| EC-010 | Rename | Empty input | Clear + Enter | Error "Name is required." | editingNodeId stays | NO RPC | NO write | Input re-focused | unchanged | n/a | NONE | integration | P1 |
| EC-011 | Rename | Whitespace only | "   " + Enter | Error | Same | NO RPC | NO write | — | — | n/a | NONE | integration | P1 |
| EC-012 | Rename | Same name | Type existing + Enter | Cancel | editingNodeId=null | NO RPC | NO write | — | unchanged | n/a | NONE | integration | P3 |
| EC-013 | Rename | Network failure | Enter | Optimistic revert + toast | localNodes back | RPC fails | NO write | — | unchanged | n/a | partial | integration | P2 |
| EC-014 | Rename | Concurrent remote edit | User B renames same | Last-write-wins | Last state | 2 RPCs | 1 write | — | — | Conflict | NONE | integration | P2 |
| EC-015 | Rename | Escape during save | Enter + Esc | Save completes; Esc ignored | reorderStatus=saved | RPC | write | — | — | n/a | NONE | integration | P3 |
| EC-016 | Rename | Delete during rename | Rename X, then delete X | Editor closes; delete proceeds | editingNodeId=null | deleteEstimateNode | DELETE | — | fallback | n/a | NONE | integration | P2 |
| EC-017 | Delete | Leaf | Context-delete → confirm | Row removed | localNodes updated | deleteEstimateNode | DELETE | fallback | fallback | Rollback | partial | integration | P1 |
| EC-018 | Delete | Parent w/ selected descendant | Delete parent | All descendants removed | deletedNodeIds includes selection | RPC | cascade DELETE | fallback | fallback | n/a | NONE | integration | P1 |
| EC-019 | Delete | Selected node | Delete | Selection to fallback | selected=fallback | RPC | DELETE | fallback | fallback | n/a | NONE | integration | P2 |
| EC-020 | Delete | Final root | Delete | Empty state | nodes=0, selected=null | RPC | DELETE | tree container | null | n/a | NONE | integration | P2 |
| EC-021 | Delete | During drag | Drag X + context-delete X mid-drag | UNCLEAR | TBD | TBD | TBD | TBD | TBD | — | NONE | integration | P2 |
| EC-022 | Delete | Server cascade mismatch (F-06) | Delete X | Selection may jump unnecessarily | localNodes = confirmed.tree | RPC returns confirmed.tree | server cascade | fallback per client | per client | n/a | NONE | integration | P1 |
| EC-023 | Bulk delete | 3 roots | Click "Delete selected" | 3 removed | bulk cleared | 1 RPC | bulk DELETE | — | fallback | Rollback | partial | integration | P1 |
| EC-024 | Bulk delete | Nested selection | Select parent+child | Dedup → only parent | dedupeSelectedRoots | 1 RPC | DELETE parent | — | — | n/a | YES | integration | P2 |
| EC-025 | Bulk delete | Server partial fail | RPC succeeds 2 of 3 | All-or-nothing (assumed atomic) | TBD | 1 RPC | all-or-nothing | — | — | Partial fail | NONE | integration | P2 |
| EC-026 | Reorder | Same parent | Drag X before Y | X moves | localNodes updated | reorderEstimateTreeNodes | UPDATE all siblings | — | unchanged | Rollback | YES | integration | P1 |
| EC-027 | Reorder | Cross-parent | Drag X into Z | X moves to Z | updated | RPC | UPDATE X.parent_id + siblings | — | unchanged | Rollback | YES | integration | P1 |
| EC-028 | Reorder | Drop into collapsed folder | Drag X into collapsed Z | Z auto-expands AFTER drop | Z expanded, X as child | RPC | UPDATE | — | unchanged | n/a | YES | integration | P2 |
| EC-029 | Reorder | Drop on self | Drag X onto X | Blocked | unchanged | NO RPC | NO write | — | — | n/a | YES | unit | P3 |
| EC-030 | Reorder | Drop on descendant | Drag X onto grandchild | Blocked | unchanged | NO RPC | NO write | — | — | n/a | YES | unit | P3 |
| EC-031 | Reorder | During rename | Drag while editing | BLOCKED | unchanged | NO RPC | NO write | — | — | n/a | NONE | integration | P2 |
| EC-032 | Reorder | During saving | Drag during mutation | BLOCKED | unchanged | NO RPC | NO write | — | — | n/a | NONE | integration | P2 |
| EC-033 | Reorder | 2 rapid drops | Drag-drop, drag-drop | First completes, second blocked | pending | 1st + 2nd RPC | 2 writes | — | — | n/a | NONE | integration | P2 |
| EC-034 | Reorder | Hover collapsed folder | Drag X over collapsed Z 1s | NO EXPAND (F-14) | unchanged | NO RPC | NO write | — | — | n/a | NONE | integration | P2 |
| EC-035 | Reorder | Beyond viewport | Drag X below visible | NO AUTO-SCROLL (F-13) | unchanged | NO RPC | NO write | — | — | n/a | NONE | integration | P2 |
| EC-036 | External | Drop template into row | Drop template | Window event; no placeholder | unchanged | middle sheet RPC | INSERT template | — | — | n/a | partial | integration | P2 |
| EC-037 | External | Drop project source | Same | Same | Same | Same | INSERT reused | — | — | n/a | NONE | integration | P2 |
| EC-038 | Keyboard | F2 on focused | F2 | NO RENAME (F-12) | unchanged | — | — | — | — | n/a | NONE | unit | P2 |
| EC-039 | Keyboard | Shift+F10 | Shift+F10 | NO CONTEXT MENU (F-12) | unchanged | — | — | — | — | n/a | NONE | unit | P2 |
| EC-040 | Keyboard | Ctrl+X / Ctrl+V | Press | NO KEYBOARD DND (F-11) | unchanged | — | — | — | — | n/a | NONE | e2e | P1 |
| EC-041 | Keyboard | Type-ahead | Press "a" | NO JUMP (F-12) | unchanged | — | — | — | — | n/a | NONE | unit | P2 |
| EC-042 | Select | Click row | Click X | X selected, URL replaceState | selected=X | NO RPC | NO write | X tabindex=0 | X | n/a | indirect | integration | P2 |
| EC-043 | Select | After drag | Drop + click 500ms | CLICK BLOCKED | unchanged | NO RPC | NO write | — | — | n/a | NONE | integration | P3 |
| EC-044 | Select | Tab switch | Switch tabs | Stale selection may resurrect (F-17) | stale store value | NO RPC | NO write | — | stale | n/a | NONE | integration | P2 |
| EC-045 | Expand | Click caret | Click | Toggle | updated | NO RPC | NO write | — | — | n/a | YES | integration | P3 |
| EC-046 | Expand | Refresh | F5 | EXPANSION LOST | default | NO RPC | NO write | — | — | n/a | NONE | integration | P2 |
| EC-047 | Resize | Drag handle | Drag | Width updates, persists | cookie/localStorage | NO RPC | NO write | — | — | n/a | NONE | e2e | P3 |
| EC-048 | Resize | Mobile | n/a | SIDEBAR HIDDEN (F-20) | — | — | — | — | — | n/a | NONE | e2e | P2 |
| EC-049 | Search | Type "kit" | Type | Folders auto-expand; matches shown | updated | NO RPC | NO write | — | — | n/a | YES | integration | P3 |
| EC-050 | Filter | Toggle "Hide empty" | Check | Empty pruned | updated | NO RPC | NO write | — | — | n/a | YES | integration | P3 |
| EC-051 | Bulk | Click checkbox | Toggle | Cascade descendants | updated | NO RPC | NO write | — | — | n/a | YES | integration | P3 |
| EC-052 | Permission | Read-only user | Click "Add" | ALLOWS attempt | optimistic added | RPC fails | NO write | — | Rollback | RPC fail | NONE | e2e | P2 |
| EC-053 | Concurrency | 2 users create same parent | Both Add | Both succeed (different IDs) | diverges briefly | 2 RPCs | 2 INSERTs | — | — | Conflict unlikely | NONE | integration | P2 |
| EC-054 | Concurrency | 2 users rename same | Both rename | Last-write-wins | Last visible on refetch | 2 RPCs | 1 final | — | — | Lost update | NONE | integration | P2 |
| EC-055 | Concurrency | 2 users delete overlapping bulk | Both bulk-delete | Server dedup; partial fail possible | depends on order | 2 RPCs | various | — | — | Partial fail | NONE | integration | P2 |
| EC-056 | Cancel | Escape during create's pending RPC | Add + Esc | Optimistic row remains; server continues | localNodes has opt | RPC late | late INSERT | — | late remap | n/a | NONE | integration | P2 |
| EC-057 | Cancel | Unmount during mutation | Navigate away | Component unmounts; state lost | lost | RPC late | write happens | — | — | n/a | NONE | integration | P2 |
| EC-058 | Network | Offline | Add while offline | RPC fails | Rollback | Fetch fails | NO write | — | — | n/a | NONE | integration | P2 |
| EC-059 | Slow network | 10s latency | Rename | Optimistic applied; toast persistent | reorderStatus=saving | RPC pending | write eventually | — | — | n/a | NONE | integration | P2 |
| EC-060 | Large tree | 1000 nodes | Initial render | Virtualize | flatNodes ≥ 150 | 1 fetch | n/a | — | — | n/a | NONE | e2e | P2 |

## 8.4 Coverage Gaps

**Top 10 missing tests** (priority order):

1. EC-006 — Create + change selection race (F-01)
2. EC-022 — Server cascade mismatch (F-06)
3. EC-040 — Keyboard DnD (F-11)
4. EC-052 — Permission gating (F-19)
5. EC-054 — Concurrent rename conflict
6. EC-007 — Optimistic parent chaining
7. EC-057 — Unmount during mutation
8. EC-016 — Delete during rename
9. EC-046 — Expansion persistence across refresh
10. EC-014 — Concurrent remote rename

## 8.5 Recommended Test Level

- **Unit** (vitest, no RTL): pure-op tests. CHEAPEST.
- **Integration** (vitest + RTL): component tests with mocked actions. MEDIUM.
- **E2E** (Playwright): real browser, real Supabase. EXPENSIVE.

Recommendation: Move as many ECs as possible to **integration** level. Reserve E2E for cross-component flows.
