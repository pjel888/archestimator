# Component API Reference Matrix

**Status:** Planning-only API contracts for P0/P1 components.
**Rule:** TypeScript signatures are target contracts, not current implementation claims.

## Shared API Rules

- Use named exports.
- Prefer `React.forwardRef` for DOM primitives when refs are useful.
- Use native element props where possible.
- Use explicit `variant`, `tone`, `size`, `disabled`, `loading`, `invalid`, `selected`, and `open` props instead of broad style overrides.
- Use `data-state`, `data-disabled`, `data-invalid`, and `data-loading` for style hooks.
- Keep `className` as an escape hatch, not the main variant API.
- Do not accept provider data or server-action callbacks in primitive APIs.

## P0/P1 API Matrix

| ID | Component | Priority | Planned signature | Required variants/states | Story/test requirement |
|---|---|---:|---|---|---|
| API-ACT-001 | `Button` | P0 | `Button(props: ButtonProps & ButtonHTMLAttributes<HTMLButtonElement>)` | `variant: primary/secondary/ghost/danger`, `size: compact/icon`, `loading`, `disabled` | Story plus focused test if implementation changes current Button. |
| API-ACT-002 | `IconButton` | P0 | `IconButton({ label, icon, tooltip, selected, tone, ...buttonProps })` | default, selected, danger, disabled, loading | Story must fail review if `label` missing. |
| API-ACT-003 | `ButtonLink` | P1 | `ButtonLink({ href, external, disabledReason, children })` | internal, external, muted, danger-like | Story verifies anchor semantics. |
| API-ACT-004 | `ButtonGroup` | P1 | `ButtonGroup({ orientation, children })` | horizontal, compact, wrapping | Story for overflow/long labels. |
| API-TXT-001 | `Text` | P0 | `Text({ as, tone, roleSize, truncate, children })` | body, muted, label, numeric, error, success | Token story and truncation story. |
| API-TXT-002 | `Heading` | P0 | `Heading({ level, size, children })` | app-title, app-subtitle, section-title | Story proves app/workshop max 12px. |
| API-STA-001 | `Badge` | P0 | `Badge({ tone, icon, children })` | neutral, success, warning, danger, info | Contrast and long text story. |
| API-STA-002 | `Chip` | P0 | `Chip({ selected, removable, onRemove, children })` | selected, removable, disabled | Keyboard remove story. |
| API-FRM-001 | `Field` | P0 | `Field({ id, label, helperText, errorText, required, children })` | normal, required, invalid, disabled | Label/helper/error association story. |
| API-FRM-002 | `ControlInput` | P0 | `ControlInput({ invalid, leftIcon, rightSlot, ...inputProps })` | text, numeric, currency, disabled, readonly | Existing primitive story plus invalid test if changed. |
| API-FRM-003 | `SearchInput` | P0 | `SearchInput({ value, onChange, onClear, placeholder, loading })` | empty, filled, clearable, loading, disabled | Critical-impact story; test if source changed. |
| API-FRM-004 | `ControlSelect` | P0 | `ControlSelect({ value, onChange, options, placeholder, invalid })` | closed, open/native, disabled, invalid | Keyboard/open story depending implementation. |
| API-FRM-005 | `CreatableCombobox` | P1 | `CreatableCombobox({ value, options, onCreate, onSelect, loading })` | search, create, no-results, invalid | Play-function candidate. |
| API-FRM-006 | `CheckboxField` | P1 | `CheckboxField({ checked, indeterminate, onCheckedChange, label })` | checked, unchecked, mixed, disabled | Keyboard/a11y story. |
| API-FRM-007 | `RadioGroup` | P1 | `RadioGroup({ value, onValueChange, options, label })` | selected, disabled option, error | Arrow-key story. |
| API-FRM-008 | `Switch` | P1 | `Switch({ checked, onCheckedChange, label })` | on, off, disabled | Space/Enter story. |
| API-MEN-001 | `ActionMenu` | P0 | `ActionMenu({ trigger, items, align })` | grouped, destructive, disabled, checkbox item | Menu keyboard story. |
| API-MEN-002 | `ContextMenu` | P0 | `ContextMenu({ items, children })` | row, tree, table, destructive | Existing Radix wrapper story. |
| API-MEN-003 | `CommandPalette` | P1 | `CommandPalette({ open, onOpenChange, groups, query })` | empty, loading, grouped, shortcut | Play-function candidate. |
| API-OVR-001 | `Modal` | P0 | `Modal({ open, onOpenChange, title, description, children, footer })` | basic, form, destructive, busy, error | Existing modal tests if source changed. |
| API-OVR-002 | `ConfirmDialog` | P1 | `ConfirmDialog({ open, title, tone, confirmLabel, onConfirm })` | destructive, warning, loading | Focus/confirm story. |
| API-OVR-003 | `Tooltip` | P0 | `Tooltip({ content, children, side, delay })` | icon, text, disabled target | Focus and hover story. |
| API-OVR-004 | `Popover` | P1 | `Popover({ open, onOpenChange, trigger, children })` | info, help, filter | Focus return story. |
| API-NAV-001 | `Tabs` | P0 | `Tabs({ value, onValueChange, tabs })` | compact, icon, overflow, disabled | Arrow-key story. |
| API-NAV-002 | `AppShell` | P1 | `AppShell({ sidebar, header, children, loading })` | workshop, project, collapsed, loading | Landmark/focus order story. |
| API-NAV-003 | `Breadcrumbs` | P1 | `Breadcrumbs({ items, maxItems })` | compact, truncated, current | Navigation story. |
| API-SRF-001 | `Card` | P0 | `Card({ selected, interactive, tone, children })` | flat, bordered, selected, disabled | No nested-card story. |
| API-SRF-002 | `Panel` | P0 | `Panel({ title, actions, children })` | toolbar, settings, inspector | Header alignment story. |
| API-DAT-001 | `DataTable` | P1 | `DataTable<T>({ columns, rows, state, onSort })` | empty, loading, sorted, selected, overflow | TanStack/static story; no live data. |
| API-DAT-002 | `EditableCell` | P1 | `EditableCell({ value, kind, onCommit, status })` | editing, saving, invalid, rollback | Keyboard commit/cancel test candidate. |
| API-TR-001 | `TreeShell` | P0 | `TreeShell({ nodes, expandedIds, selectedId, onToggle, onSelect })` | expanded, collapsed, selected, empty | Tree keyboard story. |
| API-TR-002 | `TreeRow` | P0 | `TreeRow({ depth, icon, label, meta, selected, draggable })` | folder, item, drag target, invalid | Visual/a11y story. |
| API-TR-003 | `EstimateTreeStory` | P1 | `EstimateTreeStory({ fixture, mode })` | group, area, row, dirty, readonly | Story-only fixture wrapper. |
| API-TR-004 | `ShareReviewTree` | P1 | `ShareReviewTree({ fixture, selectedId })` | readonly, selected, commented | No provider/token imports. |
| API-FBK-001 | `Toast` | P0 | `toast({ tone, title, description, duration })` | info, success, warning, error, persistent | Existing toast test if source changed. |
| API-FBK-002 | `Skeleton` | P0 | `Skeleton({ variant, lines })` | text, card, table, tree | Loading stories. |
| API-FBK-003 | `EmptyState` | P0 | `EmptyState({ icon, title, description, action })` | no data, filtered, permission | Accessible action story. |
| API-FBK-004 | `InlineAlert` | P1 | `InlineAlert({ tone, title, children, action })` | info, warning, error, success | Alert/status role story. |
| API-LAY-001 | `Stack` | P1 | `Stack({ gap, align, children })` | compact, nested, responsive | Layout story. |
| API-LAY-002 | `Toolbar` | P1 | `Toolbar({ leading, trailing, overflow })` | icon-only, mixed controls, overflow | Long-label alignment story. |
| API-LAY-003 | `SplitPane` | P1 | `SplitPane({ left, right, defaultSize })` | resizable, collapsed, fixed | Keyboard/focus order note. |
| API-DOM-001 | `ProjectCard` | P1 | `ProjectCard({ project, actions, selected })` | owned, shared, favorite, archived | Static project fixture story. |
| API-DOM-002 | `ProjectEstimateRow` | P1 | `ProjectEstimateRow({ estimate, status, actions })` | draft, shared, long name, inline edit | Table story. |
| API-DOM-003 | `ComponentLibraryCard` | P1 | `ComponentLibraryCard({ item, price, image, actions })` | component, template, no image, archived | Library fixture story. |
| API-DOM-004 | `LibraryFolderTree` | P1 | `LibraryFolderTree({ folders, selectedId, mode })` | category, supplier, brand, empty | Tree story; no live repository. |
| API-DOM-005 | `ShareDecisionPanel` | P1 | `ShareDecisionPanel({ status, onDecision })` | pending, approved, changes requested | Static share fixture story. |
| API-DOM-006 | `NotificationCenter` | P1 | `NotificationCenter({ notifications, state })` | unread, read, empty, error | Dialog/list focus story. |
| API-DOM-007 | `ReleaseAnnouncementModal` | P1 | `ReleaseAnnouncementModal({ release, open, onAcknowledge })` | new, acknowledged, long notes | Modal focus story. |
| API-MOT-001 | `ReducedMotionProvider` | P1 | `ReducedMotionProvider({ forced, children })` | normal, reduced | Motion stories must include both. |

## API Review Rules

- P0 APIs must be stable enough for Storybook review before adding P1 domain stories.
- P1 APIs may remain story-only wrappers if production migration is deferred.
- P2/P3 APIs should not block the MVP unless a P0/P1 story depends on them.
- Any API that changes current production imports needs graph impact, targeted tests, and a separate source-edit commit.
