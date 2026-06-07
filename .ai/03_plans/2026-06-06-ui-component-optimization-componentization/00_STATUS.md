# UI Component Library — Status

**Branch:** `feat/ui-componentization`
**Status:** COMPLETE — ~60 source components, 85 stories, all gates pass. Migration deferred by design.
**Updated:** 2026-06-07

## Library Stats
- **60+ source components** across Actions, Forms, Overlays, Navigation, Data, Feedback, Layout, Domain, Utility
- **85 Storybook stories**, 443+ exports, 78 component-level, 52 linked
- **Barrel exports:** `src/components/ui/index.tsx` exports all components cleanly

## All Components

| Category | Components |
|---|---|
| **Actions** | Button, IconButton, ButtonGroup, ButtonLink, DropdownMenu, ToolbarIconButton |
| **Forms** | ControlInput, ControlTextarea, ControlSelect, SearchInput, CreatableCombobox, Checkbox, RadioGroup, Switch, NumberInput, CurrencyInput, DatePicker, FileUpload |
| **Overlays** | Dialog (focus trapping), AppModal, BlurModal, Modal, ResizableModal, FloatingModal, Sheet, Drawer, SidePanel, Popover, HoverCard, Tooltip, ConfirmDialog, CommandDialog (keyboard nav) |
| **Navigation** | Tabs (+TabPanel), Breadcrumbs, PageHeader, Pagination, ContextMenu |
| **Data** | DataTable (sorting, selection, pagination, column visibility), Tree (keyboard nav, controlled mode, drag handles, aria-level), Timeline, ProgressBar |
| **Feedback** | Toast, Alert, Banner, Spinner, Skeleton, EmptyState |
| **Layout** | Card, Panel, Separator, Accordion, ScrollArea (scrollTo, shadows), BulkActionToolbar |
| **Domain** | FinancialTotalCard, EstimateCell, StatusBadge, ConfidenceIndicator, Avatar |
| **Utility** | Chip (onRemove), Badge, HeaderIconToolbar, RouteLoadingOverlay |

## P0 Fixes
- Dialog: focus trapping + body scroll lock + inert on background
- CommandDialog: keyboard arrow navigation
- Chip: onRemove callback
- DropdownMenu: Enter key bug fixed (closest() instead of matches())
- Tree: keyboard navigation, controlled mode, aria-level, no double-rendering

## Verification
- type-check ✅ | lint:design-system ✅ | build ✅ | storybook:check-components ✅

## Plans
- 67 plan files archived to `.ai/09_archive/2026-06-06-ui-component-optimization-componentization/`

## App Migration
- ❌ Not started — deferred by design per plan's "do not migrate app yet" boundary
