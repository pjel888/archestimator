# 05 — Performance

Creating tabs is cheap. The performance angle is mostly about **not regressing**
the editor's render/interaction budget with the new context menu and overflow
behavior, and about the second-order effect of users now generating many tabs.

---

## 1. Create cost

- One RPC round-trip (`create_estimate_tab_with_history`) + one returned tabs
  array. No N+1; `getEstimateTabs` is a single ordered select.
- **Remove the redundant double-update**: today create both consumes the
  returned array and triggers `tabsQuery.refetch()` (a second round-trip). Use
  `setQueryData` from the returned array → **one** network call, no refetch
  flash. See [04 §2](04_STORE_STATE_AND_QUERY.md).
- New tab's tree query returns empty instantly — no perceptible load.

## 2. Strip render cost

- The strip maps `orderedTabs` once; `sortTabs` is `O(n log n)` on a small `n`,
  memoized via `useMemo` ([EstimateTabStrip.tsx:86](src/components/workshop/estimate-sheet/EstimateTabStrip.tsx#L86)).
- Adding a context menu per tab: Radix `ContextMenu` mounts its menu content
  **lazily** (on open), so idle cost is a trigger wrapper per tab, not N mounted
  menus. Keep one menu definition rendered conditionally on the open tab rather
  than N always-mounted `ContextMenuContent` instances — prefer a single
  controlled menu or Radix's per-trigger lazy content. Avoid N hydrated popovers.
- Overflow fade is pure CSS (gradient mask) — zero JS cost. `scrollIntoView` runs
  only on activate/create — negligible.

## 3. Many-tabs scaling

Lifting the gate lets users create arbitrarily many tabs. Realistic counts are
small (single to low double digits), so:

- **No virtualization** of the tab strip — unwarranted complexity for the
  expected count; horizontal scroll + fade is sufficient.
- Each tab's nodes load **only when that tab is activated** (per-tab tree query),
  so 20 tabs do not load 20 trees. ✅ already the design.
- **Watch:** proposal XLSX "all tabs" export iterates every non-archived tab and
  fetches each tab's tree ([export route](src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts)).
  More tabs → more worksheets and more per-tab tree reads at export time, plus
  the existing 413/size guard. This is bounded and already implemented, but note
  it: encouraging many tabs increases worst-case export work. Empty tabs cost
  ~one near-empty worksheet each. No change needed; flag for monitoring.

## 4. Collaboration / presence

- Cursor broadcasts and presence already carry `tabId` / `activeTabId`; creating
  a tab adds it to the next publication snapshot enumeration. No per-tab realtime
  channel is created — enumeration only. Negligible.

## 5. Performance acceptance

- [ ] Create issues exactly one network round-trip (no refetch flash).
- [ ] Context menus are lazily mounted (no N hydrated popovers at idle).
- [ ] Overflow fade is CSS-only; `scrollIntoView` only on activate/create.
- [ ] No new render work in the estimate tree on tab create (empty tree path).
- [ ] (Monitor) all-tabs export time scales with tab count — acceptable, bounded.
