# P0/P1 Implementation Backlog

**Status:** Future implementation backlog. No source work happened in this planning pass.
**Tracking rule:** Each item starts `NOT_STARTED`, can move to `DRAFT`, then `REVIEW_READY`, then `APPROVED` or `NEEDS_REVISION`.

## Phase 0 - Gate And Setup

| ID | Work item | Priority | Likely files | Stories | Tests/validation | Dependency gate | Status |
|---|---|---:|---|---|---|---|---|
| BL-000 | Re-verify repo/package/design/graph state | P0 | `.ai`, `package.json`, `DESIGN.md` | N/A | git status, graph impact, docs check | None | NOT_STARTED |
| BL-001 | Get owner approval for Storybook packages | P0 | `.ai/10_state/decisions.md` | N/A | Recorded decision | Philip approval | OWNER_GATE |
| BL-002 | Install Storybook/config scripts | P0 | `package.json`, `bun.lock`, `.storybook/*` | N/A | `bun run storybook`, `bun run build-storybook` | Storybook approval | NOT_STARTED |
| BL-003 | Add static fixture/decorator shell | P0 | `src/stories/fixtures/*`, `src/stories/decorators/*` | Governance/Fixtures | Storybook starts with env unset | Storybook approval | NOT_STARTED |

## P0 Foundations

| ID | Work item | Priority | Likely files | Stories | Tests/validation | Dependency gate | Status |
|---|---|---:|---|---|---|---|---|
| BL-FND-001 | Color and semantic token gallery | P0 | `src/components/ui/foundations/*` or stories only | `Foundations/ColorTokenGallery` | Visual review, design lint | None | NOT_STARTED |
| BL-FND-002 | Typography and density gallery | P0 | stories only unless helper needed | `Foundations/TypographyTokenGallery`, `DensityTokenGallery` | Visual review against `DESIGN.md` | None | NOT_STARTED |
| BL-FND-003 | Radius, spacing, focus, status galleries | P0 | stories only | `Foundations/RadiusTokenGallery`, `FocusRingGallery` | Visual review | None | NOT_STARTED |
| BL-ICO-001 | App icon wrapper and gallery | P0 | `src/components/ui/icons/*` | `Icons/IconGallery`, `SemanticIconMap` | A11y label review | None | NOT_STARTED |

## P0 Primitives

| ID | Work item | Priority | Likely files | Stories | Tests/validation | Dependency gate | Status |
|---|---|---:|---|---|---|---|---|
| BL-ACT-001 | Button stories before source changes | P0 | `src/components/ui/button.tsx`, `*.stories.tsx` | Default, Variants, Sizes, WithIcon, Loading, Disabled, LongContent | Existing tests if source changes; graph critical warning | None | NOT_STARTED |
| BL-ACT-002 | IconButton/ToolbarIconButton stories | P0 | `toolbar-icon-button.tsx`, `header-icon-toolbar.tsx` | IconOnly, Selected, Danger, Tooltip, Disabled | `header-icon-toolbar-ui` if source changes | None | NOT_STARTED |
| BL-FRM-001 | Field/Input/Search stories | P0 | `control-input.tsx`, `search-input.tsx` | Empty, Filled, Invalid, Disabled, Clearable, Loading | Critical SearchInput impact if source changes | None | NOT_STARTED |
| BL-FRM-002 | Select stories | P0 | `control-select.tsx` | Closed, Open, Invalid, Disabled, LongContent | DOM test if wrapper changes | None | NOT_STARTED |
| BL-STA-001 | Badge/Chip/Status stories | P0 | `badge.tsx`, `chip.tsx` | Tone variants, Removable, LongContent | Contrast review | None | NOT_STARTED |
| BL-MEN-001 | ActionMenu stories | P0 | `action-menu.tsx` | Grouped, Disabled, Destructive, KeyboardFocus | Menu keyboard play candidate | Existing deps | NOT_STARTED |
| BL-MEN-002 | ContextMenu stories | P0 | `context-menu.tsx` | TreeRow, TableRow, Disabled, Destructive | Existing context-menu tests if changed | Existing Radix | NOT_STARTED |
| BL-OVR-001 | Modal/Dialog stories | P0 | `modal.tsx` | Basic, Form, Destructive, Busy, Error | `ui-modal-tooltip.test.tsx` if changed | None | NOT_STARTED |
| BL-OVR-002 | Tooltip stories | P0 | `toolbar-tooltip.tsx` | IconTrigger, TextTrigger, Focus, LongContent | `ui-modal-tooltip.test.tsx` if changed | None | NOT_STARTED |
| BL-FBK-001 | Toast stories | P0 | `toast.tsx` | Info, Success, Warning, Error, Persistent | `toast.test.tsx` if changed | None | NOT_STARTED |
| BL-FBK-002 | Empty/Skeleton/Loading stories | P0 | `empty-state.tsx`, `skeleton.tsx`, `route-loading-overlay.tsx` | Empty, Filtered, Permission, SkeletonTable, RouteLoading | DOM tests if source changes | None | NOT_STARTED |

## P1 Compositions And Domain Stories

| ID | Work item | Priority | Likely files | Stories | Tests/validation | Dependency gate | Status |
|---|---|---:|---|---|---|---|---|
| BL-FRM-101 | CreatableCombobox stories | P1 | `creatable-combobox.tsx` | Search, Create, NoResults, Loading, Invalid | Keyboard play candidate | None | NOT_STARTED |
| BL-FRM-102 | Checkbox/Radio/Switch wrappers | P1 | new `src/components/ui/forms/*` if needed | Checked, Mixed, Disabled, Error | DOM tests for custom wrappers | Radix only if approved | NOT_STARTED |
| BL-NAV-101 | Tabs and switchers stories | P1 | shared tabs/wrapper if added | Compact, Icon, Overflow, Disabled | Keyboard story | Radix only if approved | NOT_STARTED |
| BL-NAV-102 | AppShell/Sidebar stories | P1 | story wrappers, possible `src/components/ui/navigation/*` | Expanded, Collapsed, Loading, Active | Focus order review | None | NOT_STARTED |
| BL-DAT-101 | DataTable shell stories | P1 | `src/components/ui/data-display/*` | Empty, Loading, Sortable, Selected, Overflow | TanStack static story, no network | None | NOT_STARTED |
| BL-DAT-102 | EditableCell stories | P1 | `src/components/ui/data-display/*` or stories only | Editing, Saving, Invalid, Rollback | Keyboard test candidate | None | NOT_STARTED |
| BL-TRE-101 | TreeShell and TreeRow stories | P1 | `workshop-tree.tsx`, story-only adapters | Expanded, Collapsed, Selected, InvalidDrop | WorkshopTree high-impact warning | None | NOT_STARTED |
| BL-TRE-102 | EstimateTree domain stories | P1 | story fixtures/adapters | Group, Area, RowItem, Dirty, ReadOnly | Existing estimate tree tests if source changes | None | NOT_STARTED |
| BL-TRE-103 | ShareReviewTree stories | P1 | `src/components/share/*` story wrappers | Readonly, Decision, Commented, Empty | Share tests if source changes | None | NOT_STARTED |
| BL-DOM-101 | Project card/table stories | P1 | `ProjectCard`, `ProjectEstimatesTable` story wrappers | Owned, Shared, Favorite, InlineEdit | Project DOM tests if source changes | None | NOT_STARTED |
| BL-DOM-102 | Component library stories | P1 | `ComponentLibraryManager`, `ComponentCard`, `LibraryFolderTree` | Category, Supplier, Brand, NoResults | Component-library tests if source changes | None | NOT_STARTED |
| BL-DOM-103 | Notification/release modal stories | P1 | `src/features/notifications/components/*` | Unread, Read, Empty, Announcement | Notification DOM tests if source changes | None | NOT_STARTED |
| BL-DOM-104 | Proposal/share review block stories | P1 | `src/components/share/*`, story fixtures | Pending, Approved, NeedsChanges, Expired | No live token imports | None | NOT_STARTED |

## Stop-Before-Migration Gate

| ID | Work item | Priority | Likely files | Stories | Tests/validation | Dependency gate | Status |
|---|---|---:|---|---|---|---|---|
| BL-GOV-001 | Component acceptance checklist update | P0 | `27_COMPONENT_ACCEPTANCE_CHECKLIST.md` | Governance/Checklist | docs diff check | None | NOT_STARTED |
| BL-GOV-002 | Philip review packet | P0 | `37_PHILIP_STORYBOOK_REVIEW_PACKET.md` | Governance/ReviewPacket | Storybook review notes | Philip review | NOT_STARTED |
| BL-GOV-003 | Migration remains blocked | P0 | `24`, `25`, final report | N/A | git diff no route migration | Philip approval required | BLOCKING_RULE |
