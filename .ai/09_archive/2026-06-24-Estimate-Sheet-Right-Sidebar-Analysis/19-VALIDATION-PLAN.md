# 19 — Validation Plan

## Static validation (always run)

| Check | Command | When |
| --- | --- | --- |
| Type checking | `bun run type-check` | After every code change |
| Linting | `bun run lint` | After every code change |
| Design lint | `bun run lint:design-system && bun run lint:design` | After UI changes |
| Unit/dom tests | `bun run test` | After every change |
| DOM tests | `bun run test:dom` | After component changes |
| Full validate | `bun run validate` | Before merge |
| Production build | `bun run build` | Before release |

## Targeted tests for each implementation task

### Phase 1 tasks (persistence honesty)

| Task | Test file | Scenarios |
| --- | --- | --- |
| 1.1 (Delete → archive) | `tests/vitest/component-library-ui.test.tsx` | Delete single → refresh → not visible; Delete bulk → partial failure isolation; Undo → restore |
| 1.2 (Edit via modal) | new test | Edit → verify all fields preserved → refresh → DB value |
| 1.3 (Duplicate via server) | new test | Duplicate → refresh → new DB row with "(copy)" name |
| 1.4 (Snapshot label) | `component-library-ui.test.tsx` | Verify "Snapshot copy" chip; verify no "Live source" text |
| 1.5 (Remove group button) | `component-library-ui.test.tsx` | Verify button absent; categories still emerge from templates |
| 1.6 (Search race) | new test | Query A (delayed) → Query B → verify B's results, not A's |

### Phase 2 tasks (terminology/UX)

| Task | Test |
| --- | --- |
| 2.1 (Rename tab) | Verify tab text = "Project Components"; stored prefs still load |
| 2.2 (Folder delete) | Delete folder → refresh → folder gone; delete folder with components → confirm dialog |
| 2.4 (Collapse persist) | Collapse → refresh → still collapsed |

## Manual acceptance tests

### Persistence honesty (critical)
1. Open estimate → sidebar loads
2. Edit a component via context menu → save → refresh → verify edit persisted
3. Delete a component → refresh → verify component archived (not visible)
4. Delete → undo → refresh → verify component restored
5. Duplicate a component → refresh → verify new copy exists
6. Create template group → refresh → verify behavior matches decision in doc 20

### Project sources (critical)
7. Expand a project → expand an estimate → verify skeleton → content transition
8. Search for a known estimate name → verify results
9. Rapidly type search queries → verify latest results win (no stale overwrite)
10. Insert a project source → modify the source estimate → verify no propagation to inserted copy

### Accessibility
11. Tab through the sidebar → verify roving tabindex on tree
12. Open context menu via keyboard (Shift+F10) → verify menu opens
13. Rename folder via context menu → verify input receives focus
14. Resize panel via keyboard arrows → verify width changes
15. Test with screen reader (VoiceOver) → verify tree roles announced

### Performance
16. Load sidebar with 100 components → verify <200ms render
17. Load Templates tab with 50 templates → verify <200ms render
18. Rapidly hover over project sources → verify no duplicate requests

## Environmental limitations

| Limitation | Impact | Mitigation |
| --- | --- | --- |
| No authenticated runtime session | Cannot verify live insert/drag/drop flows | Static code review + existing test suite |
| No large production dataset | Cannot profile 10K components | Algorithmic analysis + proportional extrapolation |
| No mobile device | Cannot verify below-1024px behavior | CSS media-query analysis |
| RLS policies not verified against live migrations | Cannot confirm ENABLE RLS on all tables | Background agent checking migration files; static review of client usage patterns |

## Regression checklist

After any sidebar code change, verify:
- [ ] Tab contract: `["Library", "Project", "Templates"]` (or updated labels)
- [ ] Folder create: inline input, Enter/blur/Escape work
- [ ] Folder rename: context menu → input → focus → Enter/blur/Escape
- [ ] Bulk add: cascade select → dock → add → toasts
- [ ] Bulk delete: confirm dialog → undo
- [ ] Slash shortcut: opens search, does not fire behind modal
- [ ] Source URL sanitization: `javascript:` blocked
- [ ] Thumbnail route validation: path traversal blocked
- [ ] Lazy load: skeletons → content, cache reuse on remount, retry on error
- [ ] `onLibraryDataChanged` call sites: ≥8 (only for truly persisted mutations after Phase 1)
