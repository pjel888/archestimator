# 06 - QA And Validation Plan

## Verification Strategy

Use targeted tests first. Use browser proof only for claims that jsdom/source inspection cannot prove: real route navigation/back-forward behavior, viewport geometry, portal clipping, sticky/scroll containment, drag/drop pointer behavior, and full focus trapping across portals.

No tests were run for this planning pack because no application code changed.

## Existing Useful Coverage

| Area | Existing tests |
| --- | --- |
| Overview | `tests/vitest/library-overview.test.tsx` |
| Library route tabs | `tests/vitest/library-tabs-layout.test.tsx`, `tests/vitest/library-tab-a11y.test.tsx` |
| Components route/cache | `tests/vitest/library-components-cache.test.tsx` |
| Templates route/cache | `tests/vitest/library-templates-cache.test.tsx` |
| Broad Library DOM coverage | `tests/vitest/workshop-library-consolidation-ui.test.tsx` |
| Folder tree | `tests/vitest/library-folder-tree-selection.test.tsx`, `tests/vitest/library-folder-reorder.test.ts` |
| Template browse | `tests/vitest/template-gallery.test.tsx` |
| Template editor | `tests/vitest/template-editor.test.tsx` |
| New template modal | `tests/vitest/new-template-modal.test.tsx` |
| Bulk destructive modal | `tests/vitest/bulk-destructive-preview-modal.test.tsx` |
| Shared overlays | `tests/vitest/ui-modal-tooltip.test.tsx`, `tests/vitest/ui-dropdown-popup-core.test.tsx`, `tests/vitest/ui-dropdown-select.test.tsx`, `tests/vitest/ui-tabs.test.tsx` |
| Browser smoke | `e2e/workshop-library-routes.spec.ts`, `e2e/workshop-template-insert-smoke.spec.ts` |

## New Focused Tests To Add

### Library overview selection

Add `tests/vitest/library-overview-navigation.test.tsx`.

Should verify:

- Component search result click routes to Components with selected component param.
- Component search result Enter key does the same.
- Recent component card uses the same route-state behavior.
- Template results still open the template editor.
- The active tab and tab panel semantics remain correct.

### Add Component modal accessibility

Add `tests/vitest/library-add-component-modal-a11y.test.tsx`.

Should verify:

- Initial focus.
- Required-field errors and `aria-invalid`.
- Nested listbox Escape closes listbox before modal.
- Dirty close opens design-system confirmation.
- Confirm/cancel return focus correctly.

### Component folder actions

Add `tests/vitest/library-folder-actions.test.tsx`.

Should verify:

- Create success, validation failure, and server failure.
- Rename success, validation failure, and server failure.
- Delete confirmation cancel/confirm.
- Delete failure message remains visible.
- Focus returns to the invoking folder action.
- Empty selected folder state remains stable.

### Applied filters

Add or extend component manager tests.

Should verify:

- Visible chips for supplier, brand, lifecycle, confidence, and freshness.
- Individual chip removal updates state and URL params.
- Clear-all resets all filters.
- Filtered count and no-results state update.

### Insert template picker

Add `tests/vitest/library-template-insert-picker.test.tsx`.

Should verify:

- No projects empty state.
- Project with no estimates empty state.
- Estimate with no target group/area error state.
- Submit disabled until a valid target exists.
- Target disclosure text is visible before submit.
- Submit failure stays inline and does not close.
- Success exposes "Open estimate" if implemented.

### Bulk archive copy

Extend `tests/vitest/bulk-destructive-preview-modal.test.tsx`.

Should verify:

- Archive copy does not claim irreversibility if archive is restorable.
- Irreversible copy remains available for true delete flows if the modal stays generic.

## Static Guards

Add or run these checks during implementation:

- `rg -n "window\\.(prompt|confirm)" src/components/workshop/component-library-manager src/components/workshop/library`
- `rg -n "cannot be undone|reversible|archive" src/components/workshop/BulkDestructivePreviewModal.tsx src/components/workshop/component-library-manager`
- `git diff --check`

## Suggested Command Pattern

Run the narrowest relevant commands first:

```bash
bun test tests/vitest/library-overview.test.tsx
bun test tests/vitest/library-overview-navigation.test.tsx
bun test tests/vitest/library-folder-actions.test.tsx
bun test tests/vitest/library-add-component-modal-a11y.test.tsx
bun test tests/vitest/library-template-insert-picker.test.tsx
git diff --check
```

Then widen only if the touched surface justifies it:

```bash
bun test tests/vitest/workshop-library-consolidation-ui.test.tsx
bun test tests/vitest/template-gallery.test.tsx tests/vitest/template-editor.test.tsx
bun run validate
```

## Browser-Proof Criteria

Use Playwright/manual browser proof only for:

- Real route navigation/back-forward behavior across Library tabs.
- Mobile/responsive Library layout.
- Sticky header or scroll containment claims.
- Portal clipping or z-index claims.
- Drag/drop pointer behavior.
- Actual focus trapping across portals.
- Supabase-backed insertion smoke where provider state matters.

Skip browser automation for:

- Copy-only changes.
- Pure source redirects.
- Cache key changes.
- Server-action payload construction.
- Static ARIA attributes already provable in Vitest.
- Component-level modal content that Testing Library can verify.

## UltraQA Scenario Matrix

| Scenario | Risk | Evidence needed |
| --- | --- | --- |
| Overview search result to component | User loses exact item | DOM route-state test, later browser route proof if router behavior changes |
| Dirty Add Component close with nested popup open | Wrong overlay closes or data lost | DOM keyboard test, browser proof only if portal/focus trap changes |
| Folder delete failure | User thinks folder was deleted | DOM mutation failure test |
| Filtered catalogue with stale URL params | Empty or incorrect state | DOM URL-param and no-results tests |
| Template insert with no valid target | Rows inserted somewhere unexpected | Insert picker test for disabled/error state |
| Bulk archive copy conflict | User mistrusts action | Copy unit test |
| Mobile component browse | Controls overlap or scroll traps fail | Browser/manual proof after layout changes |
| Keyboard-only library management | Accessibility regression | DOM keyboard tests first, browser proof for portal focus if needed |
| Cross-workspace component param | IDOR/data leak | Permission-safe not-found/denied test with no object detail leakage |
| Cross-workspace estimate insert target | Wrong estimate mutation | Server-action test that rejects stale/foreign target |
| Workspace switch with inspector open | Prior-workspace cache bleed | Query/cache test or DOM test that clears/refetches protected data |
| Public/shared proposal route requests source metadata | Private data leak | Redaction assertions for source URL, notes, confidence, price history |
| Viewer opens Quick Add or submits mutation | Unauthorized mutation | UI hidden/disabled assertion plus server denial test |
| Formula-like text or invalid source URL | Unsafe imported/exported data or bad stored source | Field validation/sanitization tests |
| Folder renamed/deleted concurrently | Silent overwrite or wrong route state | Conflict/retry test |
| Template dependency archived/discontinued | Unsafe reuse | Preview warning/block/override test |
| Slow old search returns after newer query | Stale results replace current intent | Out-of-order response handling test |
| 500-row dense view | UI stalls or keyboard path breaks | Perf smoke/fallback evidence plus accessibility review |

## Completion Gate For Future Implementation

A future implementation should not be marked complete until:

- Targeted tests for changed behavior pass.
- Static grep confirms primary Library files no longer use native prompts/confirms.
- `git diff --check` passes.
- Browser-only claims have browser evidence or are explicitly listed as not tested.
- Remaining risks are written in the implementation handoff or final report.
- Actor/authz, cross-workspace IDOR, public/private redaction, workspace-switch
  cache, and stale insert target cases pass for any touched protected flow.
- Performance/concurrency evidence exists for dense mode, server search/filter,
  or any changed large-list behavior.
- `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` has been updated with pass,
  skip-with-risk, or no-go status for implemented scenarios.
