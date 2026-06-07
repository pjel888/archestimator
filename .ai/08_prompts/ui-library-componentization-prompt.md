I used your uploaded planning prompt as the structure bar, but rewrote this as a **direct implementation repair prompt** for the current `feat/ui-component-optimization` branch.  It specifically addresses the issue you noticed: the branch has Storybook, but components like Button and Modal are hidden in broad matrix stories instead of being individually inspectable.

````md
You are ChatGPT/Codex/Claude Code/OpenCode/CommandCode/OMX acting as a senior startup technical founder, principal engineer, product strategist, technical architect, Storybook architect, UI component library architect, design-system lead, accessibility engineer, QA strategist, security/performance reviewer, repo-aware implementation agent, documentation maintainer, and careful git/worktree operator.

You are repairing and completing the ArchEstimator Storybook-first UI Component Library implementation.

Repository:
- GitHub repo: pjel888/archestimator
- Local repo path: /Users/philiplewis/archestimator
- Existing implementation branch to inspect first: feat/ui-component-optimization
- Main branch: main
- Remote: origin
- Existing plan folder:
  /Users/philiplewis/archestimator/.ai/03_plans/2026-06-06-ui-component-optimization-componentization

FEATURE / CHANGE REQUEST:
The current `feat/ui-component-optimization` branch has Storybook infrastructure, but it is not enough. Storybook currently shows broad preview/matrix boards and a plan coverage dashboard, but the UI component library is not actually inspectable as individual reusable components. Philip does not clearly see Buttons, Modals, Inputs, Cards, Menus, Tables, etc. as standalone Storybook entries.

Implement the missing standalone UI component library stories and components. Convert the current Storybook from a preliminary preview board into a real component library with individually inspectable components, variants, states, controls, accessibility notes, and static fixtures.

The branch must not treat the 809-row inventory or 703-row story manifest dashboard as proof that stories are implemented. The dashboard may remain as governance/backlog evidence, but actual component implementation means actual Storybook stories and exports exist for the components.

PRIMARY GOAL:
Make the Storybook sidebar clearly show real UI component categories and individual components such as:

- Actions/Button
- Actions/IconButton
- Actions/ButtonGroup
- Forms/Input
- Forms/SearchInput
- Forms/Select
- Forms/Textarea
- Forms/Checkbox
- Forms/RadioGroup
- Forms/Switch
- Menus/ActionMenu
- Menus/ContextMenu
- Overlays/Modal
- Overlays/ConfirmDialog
- Overlays/Tooltip
- Overlays/Popover
- Feedback/Toast
- Feedback/EmptyState
- Feedback/Skeleton
- Cards/Card
- Cards/Panel
- Data Display/Table
- Data Display/EditableCell
- Trees/TreeShell
- Navigation/Tabs
- Navigation/Sidebar
- Layout/Stack
- Layout/Toolbar
- Domain/ProjectCard
- Domain/EstimateRow
- Domain/ComponentLibraryCard
- Domain/ShareReviewPanel
- Domain/NotificationCenter

The finished Storybook must feel like a proper UI component library, not a documentation dashboard.

OWNER APPROVAL GRANTED BY THIS PROMPT:
Philip approves this Storybook/UI-library completion pass, including:

- Editing the existing `feat/ui-component-optimization` branch or creating a continuation branch from it.
- Adding standalone Storybook story files.
- Adding story-only examples, fixtures, decorators, docs pages, and component review helpers.
- Adding new reusable UI components only when necessary to make a real library component inspectable.
- Refactoring story organization and Storybook titles for clearer sidebar navigation.
- Adding focused tests/scripts to verify actual standalone stories exist.
- Updating `.ai` docs, logs, scorecards, and implementation closeout.
- Fixing Storybook-only implementation issues discovered during validation.

OWNER APPROVAL NOT GRANTED BY THIS PROMPT:
- No production route migration.
- No app-wide replacement of existing route UI.
- No Supabase migration.
- No generated Supabase type changes.
- No provider setting changes.
- No Vercel deployment.
- No public Storybook hosting.
- No Flowbite Pro paid-source copying or storage.
- No Flowbite runtime/plugin by default.
- No Motion/Framer/Aceternity runtime dependency by default.
- No broad dark mode implementation.
- No replacement of React Complex Tree.
- No production auth/provider/data behavior change.
- No main-branch merge.

HARD BOUNDARY:
This is still Storybook/UI-library work. Production app migration remains blocked until Philip separately approves a route-by-route migration plan after reviewing the completed Storybook.

CRITICAL QUALITY RULE:
A component is not “implemented in Storybook” merely because it appears as a row in the 809-row inventory or 703-row story manifest. A component counts only when it has an actual Storybook story/export that Philip can click in the sidebar and inspect.

================================================================================
0. INITIAL REPO SAFETY CHECK
================================================================================

Run and record:

```bash
cd /Users/philiplewis/archestimator
pwd
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git worktree list
git remote -v
git fetch --prune origin
git log --oneline -5
````

Assume another codebase AI agent may be working in the repo.

Do not:

* force push;
* use `git reset --hard`;
* use `git clean -fd`;
* overwrite unrelated dirty files;
* stage unrelated files;
* delete branches;
* delete worktrees;
* touch secrets;
* change Supabase/Vercel/Resend/GitHub provider settings;
* merge to main automatically.

If unrelated dirty files exist, leave them alone and mention them in the final report.

================================================================================

1. BRANCHING STRATEGY
   ================================================================================

Inspect the existing branch first:

```bash
git fetch --prune origin
git checkout feat/ui-component-optimization
git pull --ff-only origin feat/ui-component-optimization
```

Then create a continuation branch unless the working process explicitly requires amending the existing branch:

```bash
git checkout -b fix/storybook-standalone-ui-components
```

If that branch already exists, create a timestamped branch:

```bash
git checkout -b fix/storybook-standalone-ui-components-$(date +%Y%m%d-%H%M)
```

Do not direct-edit `main`.
Do not merge to `main`.
Push the final branch.
Create a PR only if the repo workflow/tools support it; do not merge it.

================================================================================
2. REQUIRED READING ORDER
=========================

Before editing source/story/package/docs files, read:

1. `AGENTS.md`
2. `CLAUDE.md` if present
3. `.ai/README.md`
4. `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` if present
5. `.ai/00_system/ai-folder-canonical-map.md` if present
6. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
7. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` if present
8. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` if present
9. `.ai/00_system/VALIDATION_MATRIX.md` if present
10. `.ai/10_state/current-state.md`
11. `.ai/10_state/decisions.md`
12. `.ai/10_state/known-issues.md` if present
13. `.ai/01_roadmap/README.md`
14. `DESIGN.md`
15. `package.json`
16. `README.md`
17. `components.json` if present
18. `scripts/enforce-app-design-system.mjs`
19. `scripts/check-storybook-boundary.mjs`
20. `src/app/globals.css`
21. Existing Storybook files:

    * `.storybook/main.ts`
    * `.storybook/preview.tsx`
    * `src/stories/**`
22. Existing UI primitives:

    * `src/components/ui/**`
23. Existing domain UI:

    * `src/components/workshop/**`
    * `src/components/share/**`
    * `src/features/notifications/**`
24. Relevant tests:

    * `tests/vitest/storybook-provider-boundary.test.ts`
    * `tests/vitest/storybook-plan-matrix.test.ts`
    * UI primitive tests
    * component-library tests
    * modal/tooltip/toast/header toolbar tests
25. The full plan folder:

    * `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/00_INDEX.md`
    * `README.md`
    * `CURRENT_CANONICAL_PLAN.md`
    * `15_COMPONENT_INVENTORY_MATRIX.md`
    * `17_STORYBOOK_STORY_COVERAGE_MATRIX.md`
    * `33_STORYBOOK_CONFIG_SKELETONS.md`
    * `34_FIXTURE_AND_DECORATOR_CONTRACTS.md`
    * `35_COMPONENT_API_REFERENCE_MATRIX.md`
    * `36_P0_P1_IMPLEMENTATION_BACKLOG.md`
    * `37_PHILIP_STORYBOOK_REVIEW_PACKET.md`
    * `38_VALIDATION_COMMAND_MATRIX.md`
    * all other relevant plan docs in that folder.

For Next.js/Storybook framework work, read relevant local Next.js docs under `node_modules/next/dist/docs/` before modifying framework or app-router-related config.

================================================================================
3. CURRENT BRANCH AUDIT REQUIREMENTS
====================================

Before implementing, audit the current `feat/ui-component-optimization` branch and write findings to an `.ai/05_logs` run log.

Inspect and record:

* Current Storybook scripts.
* Current Storybook packages.
* Current `.storybook` config.
* Current story file list.
* Current story titles/paths.
* Current actual story exports.
* Current use of grouped/matrix stories.
* Whether buttons are only inside a grouped `ButtonMatrix`.
* Whether modals are only inside grouped menu/overlay stories.
* Whether the coverage dashboard displays plan rows instead of real story implementation.
* Which P0/P1 components have real standalone stories.
* Which P0/P1 components are missing standalone stories.
* Which production source files were modified on `feat/ui-component-optimization`.
* Whether those production source changes were necessary, story-only, test repair, or accidental app behavior changes.
* Whether `storybook:check-boundary` exists and passes.
* Whether `build-storybook` passes.
* Whether design-system lint passes.
* Whether any stories import live providers/server actions/repos.

Use:

```bash
git diff --stat main...HEAD
git diff --name-status main...HEAD
find src/stories -type f | sort
```

Use grep/rg to list stories and exports:

```bash
rg "title:" src/stories .storybook
rg "export const" src/stories
rg "ButtonMatrix|ModalDemo|StoryCoverageDashboard|inventoryRows|storyCoverageRows" src/stories
```

Do not assume the plan dashboard equals implementation.

================================================================================
4. CODEBASE INTELLIGENCE REQUIREMENTS
=====================================

Use GitNexus and/or code-review-graph tools first if available, per `AGENTS.md`.

Before broad manual scanning, inspect:

* architecture overview;
* shared UI primitive blast radius;
* `Button`;
* `SearchInput`;
* `Modal`;
* `ContextMenu`;
* `Toast`;
* `WorkshopTree`;
* storybook files;
* existing story files;
* modified production source files in the branch.

Before editing any production-used function, class, method, exported component, or shared primitive:

* run GitNexus impact for the exact symbol if available;
* run code-review-graph impact/context if available;
* record HIGH/CRITICAL risks;
* keep high-impact work isolated;
* add focused tests if behavior changes.

If graph tools are unavailable:

* document unavailability;
* fall back to `rg`, `rg --files`, `git grep`, `find`, direct file reading, and `git diff`;
* do not hallucinate files/APIs/routes/components/tests.

================================================================================
5. AUTOPILOT RULE
=================

Work in a loop until every required standalone Storybook component story is either:

1. implemented and validated;
2. explicitly marked `DEFERRED` because it is P2/P3/LANDING_ONLY/out-of-scope; or
3. blocked by a real issue recorded in `.ai/15_Bugs`.

Do not stop after the first failure. Diagnose, fix, re-run validation, and continue. If a blocker persists after reasonable attempts, create a bug/blocker plan, mark the affected component blocked, continue with non-dependent components, and report honestly.

Do not ask follow-up questions unless a safety/owner gate is truly blocking. Make implementation decisions inside the approved scope using repo evidence and the plan docs.

================================================================================
6. STORYBOOK LIBRARY SIDEBAR REQUIREMENTS
=========================================

The final Storybook sidebar must clearly expose individual component-level stories, not only grouped boards.

Required top-level Storybook groups:

* Foundations
* Icons
* Typography
* Actions
* Forms
* Status
* Menus
* Overlays
* Navigation
* Cards
* Data Display
* Trees
* Feedback
* Layout
* Media
* Charts
* Domain / Workshop
* Domain / Share
* Domain / Notifications
* Motion
* Blocks
* Governance

Required rule:
Each P0/P1 component below must have its own Storybook title/path or an explicit `DEFERRED` story/doc entry explaining why it is not implemented.

Preferred title examples:

```txt
Actions/Button
Actions/IconButton
Actions/ButtonGroup
Forms/Input
Forms/SearchInput
Forms/Select
Overlays/Modal
Menus/ActionMenu
Feedback/Toast
Cards/Card
Data Display/Table
Domain/Workshop/ProjectCard
```

Do not hide Button, Modal, Input, Card, Table, or Menu inside a generic “Primitive Stories” board only.

Grouped preview boards are allowed as secondary overview stories, but not as the only implementation.

================================================================================
7. COMPLETE UI COMPONENT LIST TO IMPLEMENT OR EXPLICITLY DISPOSITION
====================================================================

Implement standalone stories for P0/P1. For P2/P3/LANDING_ONLY, create backlog/docs/deferred entries unless safe and quick.

A. FOUNDATIONS AND TOKENS

P0:

* ColorTokenGallery
* SemanticColorTokenGallery
* SurfaceTokenGallery
* TypographyTokenGallery
* FontStackDemo
* FontWeightDemo
* RadiusTokenGallery
* SpacingTokenGallery
* SizingTokenGallery
* ShadowElevationGallery
* BorderHairlineGallery
* ZIndexLayerGallery
* FocusRingGallery
* MotionTokenGallery
* ReducedMotionDemo
* DensityTokenGallery
* ResponsiveBreakpointDemo
* StatusTokenGallery
* SkeletonTokenGallery
* ScrollAreaTokenDemo
* DataVisualizationTokenGallery
* TailwindUtilityExamples
* DesignSystemDoDont
* AppWorkshopVsLandingBoundaryDemo

B. ICON SYSTEM AND ASSETS

P0:

* AppIcon
* IconGallery
* SemanticIconMap
* IconButtonIcon
* InlineIcon
* StatusIcon
* EmptyStateIcon
* MenuItemIcon
* TreeRowIcon
* TableActionIcon
* FileIcon
* ImageIcon
* MediaIcon
* AlertIcon
* SpinnerIcon
* ExternalLinkIcon
* ChevronIcon
* DisclosureIcon
* SortIcon
* FilterIcon
* GroupIcon
* AddIcon
* EditIcon
* DeleteIcon
* ArchiveIcon
* ShareIcon
* ExportIcon
* ImportIcon
* UploadIcon
* DownloadIcon
* CommentIcon
* NotificationIcon
* ActivityIcon
* ProjectIcon
* EstimateIcon
* ComponentLibraryIcon
* TemplateIcon
* UserIcon
* WorkspaceIcon
* SettingsIcon
* IconSizeDemo
* DecorativeIconDemo
* AccessibleIconOnlyDemo
* AssetPlaceholder
* LogoMark
* LogoFull
* ImagePlaceholder
* DocumentPlaceholder

C. TYPOGRAPHY AND TEXT PRIMITIVES

P0:

* Text
* Heading
* AppTitle
* AppSubtitle
* BodyText
* MutedText
* LabelText
* HelperText
* ErrorText
* SuccessText
* NumericText
* CurrencyText
* PercentText
* UnitText
* Kbd
* CodeInline
* TruncatedText
* ClampText
* CopyableText
* LinkText
* ExternalLink
* EmptyStateCopy
* SectionHeader
* PanelTitle
* TableHeaderText
* BadgeText
* TooltipText
* DescriptionText
* MetadataText
* TimestampText

P2:

* CodeBlock

D. ACTIONS AND BUTTONS

P0:

* Button
* IconButton
* ToolbarIconButton
* ButtonLink
* ButtonGroup
* ToggleButton
* ToggleGroup
* SegmentedControl
* DestructiveButton
* GhostButton
* PrimaryButton
* SecondaryButton
* QuietButton
* LoadingButton
* AsyncActionButton
* CopyButton
* FavoriteButton
* ExpandCollapseButton
* AddButton
* SaveButton
* CancelButton
* DeleteButton
* ArchiveButton
* ImportButton
* ExportButton
* UploadButton
* DownloadButton
* ShareButton
* FilterButton
* SortButton
* GroupButton
* MoreActionsButton
* OpenButton
* CloseButton
* RetryButton
* ConfirmButton
* ResetButton
* ClearButton
* ApplyButton
* ButtonWithShortcut

P2:

* SplitButton
* StatefulButton
* OverlayButton
* ScrimButton

LANDING_ONLY / DEFERRED:

* LandingHoverButton
* LandingMovingBorderButton
* LandingMagneticButton

E. BADGES, PILLS, TAGS, INDICATORS

P0:

* Badge
* Pill
* StatusBadge
* StatusPill
* DenseStatusBadge
* CountBadge
* NotificationBadge
* BetaBadge
* RoleBadge
* PermissionBadge
* PriceBadge
* CostBadge
* CategoryTag
* SupplierTag
* BrandTag
* FilterChip
* RemovableChip
* SelectionPill
* KeyboardShortcutPill
* DotIndicator
* OnlinePresenceIndicator
* OfflineIndicator
* ErrorIndicator
* WarningIndicator
* SuccessIndicator
* InfoIndicator
* LoadingIndicator
* ProgressIndicator
* DirtyStateIndicator
* UnsavedIndicator

F. FORM FIELD PRIMITIVES

P0:

* Field
* ControlField
* Label
* RequiredIndicator
* HelperText
* ErrorMessage
* FieldDescription
* Fieldset
* Legend
* Input
* ControlInput
* Textarea
* ControlTextarea
* NumberInput
* CurrencyInput
* QuantityInput
* PercentageInput
* UnitInput
* MeasurementInput
* SearchInput
* SearchField
* PasswordInput
* EmailInput
* PhoneInput
* URLInput
* Select
* NativeSelect
* ControlSelect
* SearchableSelect
* Combobox
* CreatableCombobox
* MultiSelect
* Checkbox
* CheckboxGroup
* RadioGroup
* Switch
* Toggle
* InputGroup
* InputAddon
* InputPrefix
* InputSuffix
* FormSection
* ModalFormSection
* TwoColumnControlRow
* InlineEditableField
* EditableTextCell
* EditableMoneyCell
* EditableNumberCell
* EditableQuantityCell
* EditableUnitCell
* EditablePercentCell
* ValidationSummary
* FormActions
* FieldGrid
* FormErrorBanner

P1/P2:

* FileInput
* FileDropzone
* ImageUpload
* ColorInput
* DateInput
* TimeInput
* DatePicker
* Calendar
* DateRangePicker
* TimePicker
* Slider
* RangeSlider
* NumberStepper
* FloatingLabel
* InputOTP

G. MENUS, DROPDOWNS, RIGHT-CLICK, COMMAND SURFACES

P0:

* DropdownMenu
* ContextMenu
* RightClickMenu
* ActionMenu
* ContextActionMenuContent
* MenuItem
* MenuCheckboxItem
* MenuRadioItem
* MenuLabel
* MenuSeparator
* MenuShortcut
* MenuSub
* MenuSubTrigger
* MenuSubContent
* MoreActionsMenu
* RowActionMenu
* SortMenu
* FilterMenu
* ViewOptionsMenu
* ExportMenu
* ImportMenu
* ShareMenu
* KebabMenu
* RightClickTreeMenu
* RightClickTableRowMenu
* RightClickCardMenu

P1:

* Menubar
* CommandPalette
* CommandMenu
* QuickActionMenu
* SearchCommandMenu
* BulkActionMenu
* UserAccountMenu
* NotificationMenu
* CommandEmptyState
* CommandLoadingState
* CommandGroup
* CommandItem

H. OVERLAYS, DIALOGS, POPOVERS, FEEDBACK OVERLAYS

P0:

* Modal
* Dialog
* AlertDialog
* ConfirmDialog
* DeleteConfirmDialog
* UnsavedChangesDialog
* ReleaseAnnouncementDialog
* Tooltip
* ToolbarTooltip
* Toast
* ToastViewport
* Banner
* StickyBanner
* Callout
* Alert
* InlineAlert
* ValidationAlert
* LoadingOverlay
* RouteLoadingOverlay
* Scrim
* PortalLayer
* FocusTrapDemo

P1:

* CommandDialog
* Drawer
* Sheet
* SidePanel
* InspectorPanel
* Popover
* HelpPopover
* InfoPopover
* DatePickerPopover
* FilterPopover
* HoverCard
* AnimatedTooltip
* LinkPreview
* Snackbar
* NotificationCenterPopover

I. NAVIGATION AND APP SHELL

P0:

* Tabs
* TabList
* TabPanel
* Header
* HeaderActionCluster
* HeaderIconToolbar
* BackButton
* RouteTitleBar
* ViewSwitcher
* SkipLink
* SectionNav

P1:

* AppShell
* WorkshopShell
* PageShell
* WorkspaceShell
* Sidebar
* AppSidebar
* CollapsibleSidebar
* ResizableSidebar
* SidebarSection
* SidebarItem
* SidebarGroup
* SidebarFooter
* Topbar
* Breadcrumb
* BreadcrumbItem
* NavigationMenu
* Navbar
* Pagination
* PaginationControls
* Stepper
* WizardSteps
* EntitySwitcher
* WorkspaceSwitcher
* ProjectSwitcher
* EstimateSwitcher
* MobileNav

LANDING_ONLY / DEFERRED:

* AnimatedTabs
* MegaMenu
* BottomNavigation
* FloatingDock
* FloatingNavbar

J. CARDS, PANELS, SURFACES

P0:

* Surface
* SurfaceMuted
* Card
* CardHeader
* CardTitle
* CardDescription
* CardContent
* CardFooter
* ProductCard
* ProjectCard
* EstimateCard
* ComponentCard
* CatalogueCard
* StatCard
* MetricCard
* SummaryCard
* EmptyCard
* ErrorCard
* LoadingCard
* SelectableCard
* InteractiveCard
* ExpandableCard
* Panel
* WorkspacePanel
* DetailPanel
* InspectorPanelSurface
* SettingsPanel
* Section
* SectionHeader
* SectionFooter
* ToolbarPanel
* CardGrid
* CardList

P2:

* HoverCardSurface
* SpotlightCard
* FocusCard
* BentoCard
* BentoGrid
* PricingCard

LANDING_ONLY:

* CardStack
* LandingCardSpotlight
* LandingGlareCard
* LandingWobbleCard
* LandingCardHoverEffect

K. TABLES AND DATA GRIDS

P0:

* Table
* DataTable
* DenseDataTableShell
* TableHeader
* TableBody
* TableRow
* TableCell
* TableFooter
* TableToolbar
* TableColumnHeader
* SortableColumnHeader
* EmptyTableState
* LoadingTableState
* ErrorTableState
* TablePagination
* TableFilters
* TableSearch
* TableSelectionCheckbox
* BulkActionToolbar
* InlineTableActionMenu
* EditableTextCell
* EditableMoneyCell
* EditableQuantityCell
* EditableUnitCell
* EditableFormulaCell
* NumericCell
* CurrencyCell
* StatusCell
* AvatarCell
* ActionCell
* RowExpander
* RowDetailsPanel
* ColumnVisibilityMenu
* TableColumnSizingVars
* EmptyFillerRows
* DenseRow
* TableOverflowContainer

P2 / DEFERRED:

* ResizableColumn
* StickyColumn
* VirtualizedTable
* DataGrid

L. TREES AND HIERARCHY

P0:

* Tree
* TreeSurfaceShell
* TreeRowLayout
* TreeNode
* TreeBranch
* TreeLeaf
* TreeExpander
* TreeCheckbox
* TreeDragHandle
* TreeIndentGuide
* TreeToolbar
* TreeSearch
* TreeFilter
* TreeEmptyState
* TreeLoadingState
* TreeErrorState
* TreeContextMenu
* TreeBulkActionBar
* TreeNodeIcon
* TreeNodeLabel
* TreeNodeMeta
* TreeDropIndicator
* WorkshopTree story shell
* ShareTreeSurface
* ShareTreeNodeRow
* ShareReviewTree
* LibraryFolderTree story shell
* ComponentLibraryTree story shell
* ActivityScopeTree story shell
* TemplateTree story shell
* FolderTree
* ControlledTreeAdapter
* ReadOnlyTreeAdapter
* TreeExpansionHook docs/story
* TreeSelectionHook docs/story
* TreeFilteringUtility docs/story
* TreeFlatteningUtility docs/story
* TreeAriaUtility docs/story

P1:

* EstimateSheetTree story shell
* EstimateTreeRow
* EstimateTreeSurface

DEFERRED:

* VirtualizedTreeRows

M. LISTS AND ITEM ROWS

P0:

* List
* ListGroup
* ListItem
* ItemRow
* ItemHeader
* ItemContent
* ItemActions
* DescriptionList
* KeyValueList
* CommandList
* ActivityList
* NotificationList
* CommentList
* FileList
* ImageList
* SearchResultsList
* EmptyListState
* LoadingListState
* ErrorListState
* SelectableListItem
* RowActionListItem
* Timeline
* TimelineItem
* AuditActivityItem
* RecentActivityTimeline

P2:

* DraggableListItem

N. FEEDBACK, LOADING, EMPTY, ERROR, PROGRESS

P0:

* Spinner
* Loader
* Skeleton
* SkeletonText
* SkeletonCard
* SkeletonTable
* SkeletonTree
* SkeletonList
* Progress
* ProgressBar
* CircularProgress
* ProgressRing
* StepProgress
* Toast
* Alert
* Banner
* EmptyState
* ErrorState
* SuccessState
* LoadingState
* NoResultsState
* PermissionDeniedState
* OfflineState
* MaintenanceState
* InlineValidationState
* SaveStatusIndicator
* AutoSaveIndicator
* RetryState
* PartialFailureState
* FormErrorState
* ImportProgressState
* ExportProgressState

P2:

* MultiStepLoader

O. LAYOUT PRIMITIVES

P0:

* Container
* Stack
* Inline
* Cluster
* Grid
* ResponsiveGrid
* SplitPane
* ResizablePanel
* ResizablePanelGroup
* ScrollArea
* AspectRatio
* Separator
* Divider
* Spacer
* StickyHeader
* StickyFooter
* Toolbar
* ActionBar
* SelectionActionBar
* CommandBar
* FilterBar
* SearchToolbar
* HeaderToolbar
* PanelLayout
* MasterDetailLayout
* ThreeColumnWorkshopLayout
* SidebarContentLayout
* FormGrid
* Center
* Bleed
* Frame
* ViewportFrame
* FullHeightShell
* OverflowFade

P2:

* BentoGrid
* MasonryGrid

P. MEDIA AND ASSETS

P1:

* Avatar
* AvatarGroup
* UserAvatar
* WorkspaceAvatar
* Logo
* LogoMark
* LogoFull
* Image
* Thumbnail
* Gallery
* ImageCard
* FilePreview
* AttachmentPreview
* PDFPreviewPlaceholder
* VideoPlaceholder
* ImageUploadPreview
* EmptyImagePlaceholder
* DocumentPreview
* FileTypeBadge
* AttachmentList
* AttachmentCard
* DropzonePreview

LANDING_ONLY / P2:

* DeviceMockup
* BeforeAfterCompare

Q. CHARTS AND VISUALIZATION

P1:

* ChartContainer
* ChartTooltip
* ChartLegend
* MiniBarChart
* MiniLineChart
* DonutChart
* ProgressRing
* Sparkline
* StatGrid
* MetricTrend
* CostBreakdownChart
* CostSummaryChart
* DistributionBar
* DataVizEmptyState
* DataVizLoadingState
* DataVizErrorState

P2 / LANDING_ONLY:

* Gauge
* Heatmap
* WorldMap
* Globe

R. ARCHESTIMATOR DOMAIN COMPONENTS

P1:

* ProjectCard
* ProjectListItem
* ProjectEstimatesTable
* ProjectEstimateRow
* ProjectStatusBadge
* ProjectFavoriteButton
* EstimateCard
* EstimateSummaryPanel
* EstimateSheetHeader
* EstimateSheetBranch
* EstimateRowItemsTable
* EstimateRowItem
* EstimateRowEditor
* EstimateTotalSummary
* EstimateCostBreakdownPanel
* EstimateVersionBadge
* EstimateActivityItem
* EstimateActivityTimeline
* EstimateRowDetailsPanel
* CostBreakdownPanel
* ComponentCatalogueCard
* CatalogueCardGrid
* ComponentCatalogueBranch
* LibraryTreePanel
* LibraryFolderRow
* ComponentLibraryCard
* ComponentVersionBadge
* AddComponentModalSections
* AddComponentIdentitySection
* AddComponentPricingSection
* AddComponentClassificationSection
* TemplateCard
* TemplateListItem
* TemplateTreePanel
* ShareEstimateTreePanelStory
* ShareEstimateTreeViewStory
* ShareTreeSurface
* ShareReviewHeader
* ShareDecisionPanel
* ShareDecisionBadge
* ProposalPreviewCard
* ProposalSectionCard
* ProposalSummaryPanel
* CommentThread
* CommentComposer
* DecisionBadge
* ApprovalStatusBadge
* NotificationBell
* NotificationCenter
* NotificationListItem
* ReleaseAnnouncementModal
* UserPresencePill
* WorkspaceMemberAvatar
* InviteStatusBadge
* ImportEstimateDialog
* ExportProposalDialog
* ImageAttachmentCard
* FileAttachmentList
* AuditActivityItem
* RecentActivityTimeline

S. MOTION AND MICROINTERACTIONS

App/workshop-safe P1:

* FadeIn
* ScaleIn
* CollapseExpand
* SlidePanel
* FocusRingMotion
* Pressable
* StatefulButtonMotion
* TooltipMotion
* MenuMotion
* ModalMotion
* SkeletonShimmer
* RowInsertHint
* RowRemoveHint
* ReducedMotionProvider
* MotionTokenDemo

LANDING_ONLY / DEFERRED:

* MagneticButton
* MovingBorder
* HoverBorderGradient
* BackgroundGradient
* Sparkles
* Spotlight
* AuroraBackground
* BackgroundBeams
* WavyBackground
* Vortex
* TextGenerateEffect
* TypewriterEffect
* FlipWords
* CardSpotlight
* ThreeDCardEffect
* ParallaxScroll
* HeroParallax
* FloatingDock
* FloatingNavbar
* TracingBeam
* Lens
* Compare
* Globe
* WorldMap
* InfiniteMovingCards
* AnimatedTestimonials
* AnimatedTooltip
* BackgroundLines
* GridBackground
* ShootingStars

T. PAGE SECTIONS AND BLOCKS

P1 / Storybook-only:

* WorkshopShellBlock
* EstimateEditorBlock
* ComponentLibraryBlock
* ProposalReviewBlock
* EmptyStateSection
* ProposalCoverSection
* ProposalLineItemSection
* ProposalSummarySection
* ProposalAcceptanceSection

LANDING_ONLY / DEFERRED:

* HeroSection
* FeatureSection
* CTASection
* TestimonialSection
* LogoCloud
* PricingSection
* FAQSection
* StatsSection
* ContactSection
* BlogCard
* BlogGrid
* Footer
* AuthLoginSection
* AuthSignupSection
* BentoFeatureSection

U. UTILITY PATTERNS AND HOOKS

P1 docs/story examples:

* cnPolicy
* cvaVariantPolicy
* useControllableState
* useDisclosure
* useCopyToClipboard
* useMediaQuery
* useReducedMotion
* useFocusReturn
* useKeyboardShortcut
* useOutsideClick
* useRovingFocus
* useTreeExpansion
* useTreeSelection
* useCommandMenu
* useDebouncedValue
* useMeasureElement
* formatCurrency
* formatNumber
* formatPercent
* formatDate
* formatRelativeTime
* makeProjectFixture
* makeEstimateFixture
* makeComponentLibraryFixture
* makeShareReviewFixture
* makeNotificationFixture
* withArchEstimatorTheme
* withMockRouter
* withMockQueryClient
* withMockAuth
* withReducedMotion

V. DOCUMENTATION AND GOVERNANCE

P0:

* ComponentDocTemplate
* StorybookDocsPageTemplate
* DesignTokenDocsPage
* IconGalleryDocsPage
* ComponentStatusBadge
* ComponentChecklistTable
* DeprecationNotice
* SourceAttributionNote
* AgentUsageRuleNote
* MigrationReadinessNote
* ComponentReviewStatus
* StoryCoverageDashboard
* StorybookReviewChecklist
* DoDontExample
* ApprovedRejectedExamples

================================================================================
8. COMPONENT STORY REQUIREMENTS
===============================

For every standalone component story, create a proper Storybook `Meta` and `StoryObj` where practical.

Required per component:

* clear `title`;
* `component` field when a real component exists;
* docs description;
* `args` and `argTypes` where meaningful;
* multiple story exports, not only one matrix render;
* static fixtures only;
* accessibility notes;
* keyboard/focus notes for interactive components;
* no live provider calls;
* migration status note.

Minimum story exports for core components:

For Button:

* Default
* Variants
* Sizes
* WithIcon
* IconOnly
* Disabled
* Loading
* Destructive
* LongContent
* KeyboardFocus

For Modal/Dialog:

* Default
* WithDescription
* FormDialog
* DestructiveConfirm
* Busy
* ErrorState
* LongContent
* FocusNotes

For Input/Search/Select/Textarea:

* Default
* WithHelper
* Invalid
* Disabled
* Readonly
* WithPrefixSuffix where applicable
* LongValue
* CompactDensity
* KeyboardFocus

For ActionMenu/ContextMenu:

* Default
* Grouped
* DisabledItem
* DestructiveItem
* WithShortcut
* NestedOrSubmenu if supported
* RightClickExample
* KeyboardFocus

For Toast:

* Info
* Success
* Warning
* Error
* Persistent
* TriggeredProviderExample
* StaticStateMatrix

For Card/Panel:

* Default
* WithHeader
* WithActions
* Selected
* Interactive
* Loading
* Empty
* Error
* LongContent

For Table/DataTable:

* Default
* Empty
* Loading
* Sortable
* Selectable
* Overflow
* EditableCell
* ErrorState

For Tree:

* Default
* Expanded
* Collapsed
* Selected
* Empty
* Loading
* ContextMenu
* InvalidDropTarget
* KeyboardNotes

================================================================================
9. STORY FILE ORGANIZATION REQUIREMENTS
=======================================

Create or reorganize story files so component-level entries are clear.

Preferred new files:

```txt
src/stories/foundations/colors.stories.tsx
src/stories/foundations/typography.stories.tsx
src/stories/foundations/density-and-tokens.stories.tsx

src/stories/icons/app-icon.stories.tsx
src/stories/icons/icon-gallery.stories.tsx

src/stories/typography/text.stories.tsx
src/stories/typography/heading.stories.tsx
src/stories/typography/numeric-text.stories.tsx

src/stories/actions/button.stories.tsx
src/stories/actions/icon-button.stories.tsx
src/stories/actions/button-group.stories.tsx
src/stories/actions/action-buttons.stories.tsx

src/stories/status/badge.stories.tsx
src/stories/status/chip.stories.tsx
src/stories/status/status-indicators.stories.tsx

src/stories/forms/field.stories.tsx
src/stories/forms/input.stories.tsx
src/stories/forms/search-input.stories.tsx
src/stories/forms/textarea.stories.tsx
src/stories/forms/select.stories.tsx
src/stories/forms/combobox.stories.tsx
src/stories/forms/checkbox-radio-switch.stories.tsx
src/stories/forms/editable-cell.stories.tsx

src/stories/menus/action-menu.stories.tsx
src/stories/menus/context-menu.stories.tsx
src/stories/menus/dropdown-menu.stories.tsx
src/stories/menus/command-palette.stories.tsx

src/stories/overlays/modal.stories.tsx
src/stories/overlays/confirm-dialog.stories.tsx
src/stories/overlays/tooltip.stories.tsx
src/stories/overlays/popover.stories.tsx
src/stories/overlays/drawer-sheet.stories.tsx

src/stories/feedback/toast.stories.tsx
src/stories/feedback/empty-state.stories.tsx
src/stories/feedback/skeleton.stories.tsx
src/stories/feedback/alert-banner.stories.tsx
src/stories/feedback/loading-error-success.stories.tsx

src/stories/cards/card.stories.tsx
src/stories/cards/panel.stories.tsx
src/stories/cards/domain-cards.stories.tsx

src/stories/data-display/table.stories.tsx
src/stories/data-display/data-table.stories.tsx
src/stories/data-display/list.stories.tsx
src/stories/data-display/chart-container.stories.tsx

src/stories/navigation/tabs.stories.tsx
src/stories/navigation/sidebar.stories.tsx
src/stories/navigation/breadcrumbs-pagination.stories.tsx
src/stories/navigation/app-shell.stories.tsx

src/stories/layout/stack-grid.stories.tsx
src/stories/layout/toolbar.stories.tsx
src/stories/layout/panels.stories.tsx

src/stories/trees/tree-shell.stories.tsx
src/stories/trees/share-review-tree.stories.tsx
src/stories/trees/estimate-tree.stories.tsx
src/stories/trees/library-folder-tree.stories.tsx

src/stories/domain/project.stories.tsx
src/stories/domain/estimate.stories.tsx
src/stories/domain/component-library.stories.tsx
src/stories/domain/share-review.stories.tsx
src/stories/domain/notifications.stories.tsx
src/stories/domain/proposal-review.stories.tsx

src/stories/motion/workshop-safe-motion.stories.tsx
src/stories/motion/landing-only-effects.stories.tsx

src/stories/governance/story-coverage-dashboard.stories.tsx
src/stories/governance/component-checklist.stories.tsx
src/stories/governance/migration-boundary.stories.tsx
```

You may keep existing broad matrix stories as overview pages, but they must not be the only place core components appear.

================================================================================
10. DO NOT FAKE COVERAGE
========================

Update the coverage dashboard or add a new verification story/script so it distinguishes:

* planned inventory rows;
* planned story rows;
* actual story files;
* actual story exports;
* actual component-level stories;
* overview/matrix stories;
* deferred items;
* blocked items.

Add or update a test/script such as:

```txt
scripts/check-storybook-component-coverage.mjs
tests/vitest/storybook-component-coverage.test.ts
```

The check should fail if core standalone stories are missing, at minimum:

* Actions/Button
* Actions/IconButton
* Forms/Input
* Forms/SearchInput
* Forms/Select
* Forms/Textarea
* Menus/ActionMenu
* Menus/ContextMenu
* Overlays/Modal
* Overlays/ConfirmDialog
* Overlays/Tooltip
* Feedback/Toast
* Feedback/EmptyState
* Feedback/Skeleton
* Cards/Card
* Cards/Panel
* Data Display/Table
* Navigation/Tabs
* Trees/TreeShell
* Domain/Workshop/ProjectCard
* Domain/Share/ShareReviewPanel
* Domain/Notifications/NotificationCenter

The test may inspect story files and exported story names statically.

Do not pass this check by pointing it at the plan manifest only.

================================================================================
11. DESIGN SYSTEM RULES
=======================

All non-landing app/workshop UI must follow `DESIGN.md`.

Hard visual constraints:

* SF Pro stack for app/workshop.
* Regular/medium weights only.
* 12px maximum visible app/workshop text unless explicitly approved.
* Normal controls/body/table/input/button text around 10px.
* Labels/meta/helper text around 8–9px.
* Zero letter spacing.
* xs/3px radius only.
* Neutral product colors.
* Phosphor regular outline icon style.
* Reuse `src/components/ui` and `src/components/workshop` primitives before creating route-local controls.
* Design-system lint failures are blocking.
* Landing/marketing-only Aceternity-style effects must stay separate and labelled `LANDING_ONLY`.

Do not make ArchEstimator look like generic oversized Flowbite SaaS UI.
Do not make workshop/product surfaces decorative, gradient-heavy, or motion-heavy.
Do not introduce broad arbitrary Tailwind text/radius/shadow rules outside the token policy.

================================================================================
12. PACKAGE AND DEPENDENCY RULES
================================

The branch already has Storybook installed. Do not add more packages unless truly necessary.

Allowed:

* Storybook files/stories/tests.
* Storybook coverage verification scripts.
* Small story-only helpers.
* New local UI primitives when needed and dependency-free.
* Existing dependencies already in the repo.

Default forbidden unless separately justified and recorded:

* Flowbite runtime/plugin.
* Flowbite Pro source or screenshots.
* Motion/Framer.
* New Radix packages.
* New chart package.
* External component library runtime.

If a new dependency is unavoidable:

1. create a decision entry in `.ai/10_state/decisions.md`;
2. explain why existing primitives/native controls are insufficient;
3. document alternatives;
4. update package plan docs;
5. run full validation;
6. include rollback notes.

================================================================================
13. STATIC FIXTURE AND PROVIDER SAFETY RULES
============================================

Stories, fixtures, and decorators must use static fake data only.

Do not import:

* `src/lib/supabase/*`
* `src/lib/**/actions.ts`
* `src/lib/**/repository*.ts`
* `src/app/api/**`
* `src/proxy.ts`
* `src/lib/email/**`
* provider SDK clients
* Vercel analytics/speed-insights packages
* live auth/session refresh helpers
* server-only modules
* environment variables

Do not call:

* `fetch`
* server actions
* Supabase clients
* auth refresh
* provider APIs
* Vercel/Resend/Supabase external services

If a production component cannot be safely rendered in Storybook because it imports provider/server code, create a story-only presentational wrapper using static fixtures.

================================================================================
14. PRODUCTION SOURCE CHANGE AUDIT
==================================

The current branch already touches some production source files. Audit every production source change in `main...HEAD`.

For each changed production file, classify:

* REQUIRED_FOR_STORYBOOK_BUILD
* TEST_REPAIR_ONLY
* ACCIDENTAL_APP_BEHAVIOR_CHANGE
* UNRELATED
* NEEDS_REVERT
* ACCEPT_WITH_EVIDENCE

Production source files that need explicit review include at least:

* `src/components/workshop/ProjectEstimateMetadataStrip.tsx`
* `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
* `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`

If a production source change is not necessary for Storybook or test repair, revert it safely or isolate it into a bug plan.

Do not introduce new production app behavior changes while adding component stories.

================================================================================
15. TESTING AND VALIDATION REQUIREMENTS
=======================================

Use current repo scripts:

```bash
bun run storybook:check-boundary
bun run build-storybook
bun run lint:design-system
bun run type-check
bun run test
bun run test:dom
bun run validate
bun run build
git diff --check
```

Add a new check for actual standalone story coverage:

```bash
bun run storybook:check-components
```

or equivalent, if you create a script. Add it to `package.json` only if useful.

Targeted tests to run/add:

* Storybook provider boundary test.
* Storybook plan matrix test.
* New Storybook component coverage test.
* Existing modal/tooltip test if Modal/Tooltip changes.
* Existing toast test if Toast changes.
* Existing header toolbar test if toolbar/icon button changes.
* Existing component library tests if domain stories require source changes.
* Existing table/project tests if table/project components change.

Do not run `bun run test:e2e` unless production routes/auth/protected flows change, which this task must avoid.

Final validation must include:

```bash
bun run storybook:check-boundary
bun run build-storybook
bun run lint:design-system
bun run type-check
bun run validate
bun run build
git diff --check
```

If `bun run storybook` is interactive, start it long enough to prove the sidebar/stories render, then stop it cleanly. Use `build-storybook` as the non-interactive proof.

If validation fails:

* identify whether failure is from your changes or baseline;
* fix your change if caused by you;
* if baseline or external blocker, create `.ai/15_Bugs/YYYY-MM-DD-{slug}.md`;
* do not hide failures.

================================================================================
16. STORYBOOK VISUAL SMOKE REQUIREMENTS
=======================================

After implementing standalone stories, run local Storybook and smoke at least these story iframes/pages:

* Actions/Button
* Actions/IconButton
* Forms/Input
* Forms/SearchInput
* Forms/Select
* Overlays/Modal
* Menus/ActionMenu
* Menus/ContextMenu
* Feedback/Toast
* Cards/Card
* Data Display/Table
* Navigation/Tabs
* Trees/TreeShell
* Domain/Workshop/ProjectCard
* Domain/Share/ShareReviewPanel
* Domain/Notifications/NotificationCenter
* Governance/StoryCoverageDashboard

For each smoke story, verify:

* page loads;
* Storybook root is not blank;
* no console/page errors;
* visible component title text exists;
* component examples are visible;
* no live provider/network call occurs;
* screenshot is nonblank if screenshot tooling is used.

Record results in `.ai/05_logs`.

================================================================================
17. .ai MEMORY AND PLAN UPDATES
===============================

Update relevant `.ai` docs after implementation.

At minimum update or create:

* `.ai/05_logs/YYYY-MM-DD-storybook-standalone-component-completion.md`
* `.ai/10_state/current-state.md`
* `.ai/10_state/decisions.md` if any package/source/disposition decisions changed
* `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/CURRENT_CANONICAL_PLAN.md`
* `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/37_PHILIP_STORYBOOK_REVIEW_PACKET.md`
* `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/38_VALIDATION_COMMAND_MATRIX.md`

Create or update closeout docs if they exist or are useful:

* `39_IMPLEMENTATION_CLOSEOUT.md`
* `40_STORYBOOK_REVIEW_STATUS.md`
* `41_VALIDATION_EVIDENCE.md`
* `42_STANDALONE_COMPONENT_COVERAGE_AUDIT.md`

Record:

* actual standalone story files created;
* actual components covered;
* plan rows still backlog;
* stories still deferred;
* production source changes audited;
* validation commands and results;
* no app migration.

Do not mark Philip approval unless Philip actually reviews and approves.
Do not activate root `AGENTS.md` UI enforcement rules unless Philip separately approves.

================================================================================
18. BUG / BLOCKER PROTOCOL
==========================

If you discover a bug, failing test, blocker, stale assumption, package issue, Storybook issue, Tailwind CSS issue, security concern, provider import leak, test gap, design-system conflict, or serious ambiguity, create:

```txt
/Users/philiplewis/archestimator/.ai/15_Bugs/YYYY-MM-DD-{bug-slug}.md
```

Bug plan must include:

* Title
* Classification
* Date discovered
* Discovery context
* Evidence
* Reproduction steps or command if applicable
* Expected behavior if applicable
* Actual behavior if applicable
* Suspected root cause
* Affected files/modules
* Impact
* Severity
* Relationship to current UI library plan
* Proposed fix plan
* Verification plan
* Status
* Whether it blocks implementation
* Link/reference to the plan folder

If a blocker affects only one component, defer that component and continue non-dependent work.
If a blocker prevents Storybook static build, final status must be `BLOCKED` or `NEEDS_HUMAN_DECISION`.

================================================================================
19. DO-NOT-TOUCH LIST
=====================

Do not modify:

* Supabase migrations.
* Generated Supabase types.
* Provider settings.
* Vercel settings.
* Resend settings.
* GitHub repo protection/settings.
* Secrets.
* Auth route behavior.
* Server actions.
* Production API routes.
* Production app routing/middleware.
* Existing production route UI for migration purposes.

Allowed modifications:

* Storybook story files.
* Storybook component coverage scripts/tests.
* `src/stories/**`.
* story-only fixtures/decorators.
* new reusable UI components when needed.
* existing UI primitives only when necessary, backward-compatible, tested, and graph-reviewed.
* docs and `.ai` memory updates.
* package scripts only if adding validation script.
* focused tests for changed components.

================================================================================
20. FINAL ACCEPTANCE CRITERIA
=============================

The repair implementation is complete only when:

1. Storybook still builds.
2. `bun run build-storybook` succeeds.
3. Tailwind v4/global CSS still loads in Storybook.
4. The Storybook sidebar shows actual standalone component entries for core P0/P1 components.
5. Button has its own component story.
6. IconButton has its own component story.
7. Modal/Dialog has its own component story.
8. Input/SearchInput/Select/Textarea have their own component stories.
9. ActionMenu and ContextMenu have their own component stories.
10. Toast, EmptyState, Skeleton have their own component stories.
11. Card/Panel have their own component stories.
12. Table/DataTable has its own component story.
13. TreeShell has its own component story.
14. Domain Project/Estimate/ComponentLibrary/Share/Notification stories exist.
15. A coverage check distinguishes actual story implementation from plan rows.
16. Stories use static fixtures only.
17. Provider boundary check passes.
18. No production route migration exists in the diff.
19. Production source changes from the prior branch are audited and justified/reverted.
20. `bun run lint:design-system` passes.
21. `bun run type-check` passes.
22. `bun run validate` passes.
23. `bun run build` passes.
24. `git diff --check` passes.
25. `.ai` docs/logs are updated.
26. Final report clearly lists completed, deferred, blocked, and not-in-scope items.
27. Branch is committed and pushed.

Do not claim complete if `build-storybook` fails.
Do not claim complete if Button/Modal remain visible only inside broad matrix stories.
Do not claim 703 stories are implemented unless actual story files/exports exist.

================================================================================
21. FINAL VERIFICATION BEFORE COMMIT
====================================

Run:

```bash
git status --short --branch
git diff --stat
git diff --check
git diff --name-status
bun run storybook:check-boundary
bun run build-storybook
bun run lint:design-system
bun run type-check
bun run validate
bun run build
```

Also run the new standalone component coverage check if you create one:

```bash
bun run storybook:check-components
```

If validation output is long, summarize key pass/fail lines in `.ai/05_logs` and the final report.

Do not record secrets or raw provider values.

================================================================================
22. COMMIT AND PUSH REQUIREMENTS
================================

Stage only intended files.

Before staging, inspect:

```bash
git status --short
git diff --stat
git diff --check
```

Do not stage unrelated dirty files.

Use separate commits for major green slices if practical. Suggested commit messages:

```bash
git commit -m "feat(storybook): add standalone action and form component stories"
git commit -m "feat(storybook): add overlay menu feedback card table stories"
git commit -m "feat(storybook): add domain component stories and coverage checks"
git commit -m "docs(ai): record standalone storybook component completion"
```

If using one commit:

```bash
git commit -m "feat(storybook): complete standalone ui component library stories"
```

Push:

```bash
git push -u origin HEAD
```

Never force push.
Do not merge to `main`.
If `gh` is available and repo workflow allows it, create or update a PR without merging. Otherwise report the pushed branch.

================================================================================
23. FINAL REPORT REQUIREMENTS
=============================

Return a final report with:

* Final status:

  * `READY_FOR_PHILIP_STORYBOOK_REVIEW`
  * `READY_WITH_DEFERRED_ITEMS`
  * `NEEDS_HUMAN_DECISION`
  * `BLOCKED`
* Branch name.
* Base branch.
* Plan folder used.
* Summary of what was wrong before.
* Summary of what was fixed.
* Storybook component categories now visible.
* Exact standalone story files created.
* Exact core components with standalone stories.
* Components still deferred.
* Components blocked.
* Existing broad matrix stories kept/changed.
* Dashboard/coverage check changes.
* Production source change audit result.
* Fixtures/decorators created or reused.
* Tests added/updated.
* Validation commands run and results.
* Design-system lint result.
* Type-check result.
* App build result.
* Storybook static build result.
* Provider/static fixture safety audit result.
* `.ai` docs updated.
* Bug/blocker files created.
* Package/dependency changes.
* Files changed summary.
* Commit hashes.
* Push status.
* PR URL if created.
* Explicit statement: production app migration was not performed.
* Explicit statement: Storybook is not publicly hosted unless separately approved.
* Remaining owner decisions.
* Next recommended step: Philip reviews local Storybook using the review packet.

================================================================================
24. QUALITY BAR
===============

Do not optimize for speed over correctness.
Do not pretend plan rows are implemented stories.
Do not hide validation failures.
Do not import live provider data.
Do not migrate app routes.
Do not copy external UI defaults blindly.
Do not create giant unreviewable diffs if smaller commits are possible.
Do not leave generated output untracked unless intentionally ignored.
Do not mark Philip approval unless Philip actually reviewed.

The goal is a polished, inspectable Storybook UI Component Library where Philip can clearly click Buttons, Modals, Inputs, Menus, Cards, Tables, Trees, and Domain Components as separate library entries.

```
```
CONTEXT FOR HISTORICAL REFERENCE

You’re right. The branch has **Storybook infrastructure** and a few broad “demo matrix” stories, but it does **not** yet implement the full UI component library. Buttons and modals technically exist inside grouped stories, but they are buried under composite story names, not exposed as proper standalone component stories like `Actions/Button`, `Overlays/Modal`, `Forms/Input`, `Cards/Card`, etc. My audit score: **49/100 for the full UI component library plan**, and **78/100 for Storybook infrastructure only**.

## Verdict

**Not enough. Do not treat `feat/ui-component-optimization` as the completed UI library.**

The branch successfully adds Storybook scripts and dependencies, including `storybook`, `@storybook/nextjs-vite`, docs/a11y addons, and `vite`. It also adds `storybook`, `build-storybook`, and `storybook:check-boundary` scripts.

But the implementation is mostly a **Storybook shell + grouped demo canvases + documentation dashboard**, not a complete component library. The plan you asked for demanded a full component-library implementation loop, with all P0/P1 items either implemented, clearly deferred, or blocked.  The branch does not meet that bar.

---

## 1. What exists

The branch has a real Storybook setup:

* `.storybook/main.ts` uses `@storybook/nextjs-vite`, loads stories only from `src/stories/**/*.stories`, includes docs and a11y addons, and points static assets to `public`.
* `.storybook/preview.tsx` imports `src/app/globals.css`, uses Storybook decorators, sets `nextjs.appDirectory: true`, expands controls, enables a11y TODO mode, and sorts story groups.
* The branch adds static fixtures, decorators, story groups, a coverage dashboard, and provider-boundary checks. The implementation log claims `build-storybook`, `build`, `type-check`, lint, design-system lint, focused tests, and full `bun run validate` passed.

So the **infrastructure exists**.

**Storybook infrastructure score: 78/100.**

---

## 2. Why you don’t see buttons/modals clearly

Buttons are present, but only inside a grouped story:

* Story title: `Actions and status/Primitive Stories`
* Story export: `ButtonAndIconButton`
* It renders `<ButtonMatrix />`, not a direct `Button` component story.

The actual button examples are hidden inside `story-canvas.tsx`, where `ButtonMatrix()` renders primary, secondary, ghost, danger, disabled, busy, long-label, and icon button examples.

Same with modals:

* Story title: `Menus and overlays/P0 States`
* Story export: `ModalDialogStates`
* It renders `ModalDemo`, which uses the existing `Modal` primitive.

So your instinct is correct: **they exist, but they are not presented as a real component library.** A proper library should have clear entries such as:

* `Actions/Button`
* `Actions/IconButton`
* `Forms/Input`
* `Forms/SearchInput`
* `Forms/Select`
* `Overlays/Modal`
* `Overlays/ConfirmDialog`
* `Menus/ActionMenu`
* `Menus/ContextMenu`
* `Feedback/Toast`
* `Feedback/EmptyState`
* `Cards/Card`
* `Tables/DataTable`

Right now, many components are lumped into “matrix” stories, which makes Storybook feel incomplete.

**Component discoverability score: 32/100.**

---

## 3. The biggest issue: the dashboard makes the plan look implemented when it isn’t

The branch adds a `Story Coverage Dashboard` that imports the 809-row inventory and 703-row story manifest from the `.ai` plan markdown files.

But that dashboard is not proof that 703 stories exist. It just parses the plan files and displays their rows. The dashboard itself says it imports the canonical plan matrices as static markdown.

Even more important: the story row table renders the plan status from the matrix, and `NOT_STARTED` rows get a warning badge.  The test also only verifies that the markdown matrix parses to 809 inventory rows and 703 story rows; it does not verify that actual Storybook component stories exist for those rows.

That means the implementation can claim “703 rows are visible” while not actually implementing 703 component stories. This is the core flaw.

**Coverage truthfulness score: 28/100.**

---

## 4. The actual stories are too few and too broad

From the branch diff, the implementation adds roughly these story files:

* foundations
* icon system
* actions/status
* forms
* menus/overlays/feedback
* navigation/layout
* data display
* compositions/domain
* share review
* notifications
* motion boundaries
* documentation dashboard

That is a reasonable **first Storybook scaffold**, not the “whole plan.” The stories mostly render broad matrix previews through `src/stories/ui-library/story-canvas.tsx`, rather than creating standalone stories for each component.

Example: form coverage is one story called `FieldInputSearchAndSelect`, which renders `FormControlMatrix()`. It mentions ControlField, ControlInput, SearchInput, ControlSelect, textarea, invalid, disabled, readonly, helper, and error states—but it is still one grouped story, not individual stories for each form component.

That makes review harder. You cannot inspect a Button or Modal as a component with controls, API docs, args, states, and variants. You inspect a composite board.

**Actual story coverage score: 40/100.**

---

## 5. It did modify production source files

This is another concern. The original implementation prompt said no production app migration, and the canonical plan says production migration remains unimplemented.

But the branch does modify production source files, including:

* `src/components/workshop/ProjectEstimateMetadataStrip.tsx`
* `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
* `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`

The fetched `ProjectEstimateMetadataStrip.tsx` is a live workshop component that imports navigation and estimate actions, so this is not story-only code.

The implementation log says it “restored component-sheet result count display and updated stale component library UI tests.”  That may be legitimate test repair, but it means the branch is **not purely Storybook-only**. It touched live UI. This should be reviewed separately.

**Scope-control score: 62/100.**

---

## 6. Provider/data isolation is good

This part is strong. The branch adds a provider boundary script that scans `.storybook`, `src/stories`, and story files for forbidden imports like Supabase, auth, email, API routes, server actions, repositories, Vercel analytics, `process.env`, and `fetch`.

The corresponding Vitest test repeats those checks for story/config/fixture/decorator files.

That is good. It means the Storybook surface is probably safe from live provider calls.

**Provider-boundary score: 90/100.**

---

## 7. Scorecard

| Area                                        |      Score | Audit                                                  |
| ------------------------------------------- | ---------: | ------------------------------------------------------ |
| Storybook dependencies/scripts              | **90/100** | Installed and wired in `package.json`.                 |
| Storybook config                            | **82/100** | Works structurally; simple config, good enough.        |
| Tailwind/global CSS setup                   | **85/100** | Imports `src/app/globals.css`.                         |
| Static fixtures/decorators                  | **78/100** | Present, but still lightweight.                        |
| Provider-boundary guard                     | **90/100** | Strong script/test coverage.                           |
| Actual standalone Button stories            | **35/100** | Buttons exist only inside a grouped matrix.            |
| Actual standalone Modal stories             | **35/100** | Modal exists only inside a grouped overlay story.      |
| Form component stories                      | **38/100** | One grouped form matrix, not full field library.       |
| Menu/context-menu stories                   | **42/100** | Static menu example, not proper Radix-powered stories. |
| Cards/panels                                | **30/100** | Mostly generic story panels, not a component library.  |
| Data table                                  | **35/100** | Static compact table, not a DataTable component story. |
| Domain components                           | **45/100** | Static previews exist, but not enough depth.           |
| Story coverage truthfulness                 | **28/100** | Dashboard displays plan rows, not implemented stories. |
| Plan compliance                             | **45/100** | Implements scaffold, not whole P0/P1 library.          |
| Production scope control                    | **62/100** | Production files/tests changed. Needs review.          |
| Overall UI component library implementation | **49/100** | Not enough.                                            |

**Final branch score: 49/100 for the full component-library MVP.**

---

## 8. What should happen next

The next implementation pass should not redo Storybook infrastructure. It should fix the core gap: **make the components inspectable as actual Storybook component stories.**

Minimum required next pass:

1. Add standalone stories:

   * `src/stories/primitives/button.stories.tsx`
   * `src/stories/primitives/icon-button.stories.tsx`
   * `src/stories/forms/input.stories.tsx`
   * `src/stories/forms/search-input.stories.tsx`
   * `src/stories/forms/select.stories.tsx`
   * `src/stories/overlays/modal.stories.tsx`
   * `src/stories/menus/action-menu.stories.tsx`
   * `src/stories/menus/context-menu.stories.tsx`
   * `src/stories/feedback/toast.stories.tsx`
   * `src/stories/feedback/empty-state.stories.tsx`
   * `src/stories/cards/card-panel.stories.tsx`
   * `src/stories/data-display/table.stories.tsx`

2. Each story must have:

   * `Default`
   * `Variants`
   * `Sizes`
   * `WithIcon`
   * `Disabled`
   * `Loading`
   * `Error` or `Invalid`
   * `LongContent`
   * `KeyboardFocus`
   * `CompactDensity`

3. Replace the misleading dashboard claim:

   * Do not imply 703 stories are implemented.
   * Track actual story files/exports separately from plan rows.
   * Keep plan manifest as backlog, not “coverage.”

4. Add actual component docs/controls:

   * `Meta<typeof Button>`
   * `component: Button`
   * args/argTypes
   * typed story controls
   * docs descriptions

5. Audit/revert or justify live production source changes:

   * `ProjectEstimateMetadataStrip.tsx`
   * `ComponentLibraryManager.tsx`
   * `LibraryFolderTree.tsx`

---

## Decisive recommendation

Do **not** approve this as the completed UI component library.

Approve it only as:

**“Storybook infrastructure MVP + preliminary component preview board.”**

Your next prompt to the codebase AI should be: **“Create standalone Storybook stories for every P0 primitive and make Button, Modal, Input, Select, ActionMenu, ContextMenu, Toast, Card, Table, and EmptyState individually inspectable with controls, states, and docs. Do not count the plan dashboard rows as implemented stories.”**
