I used your uploaded plan-creation prompt as the quality structure, but converted it from “create a plan” into a direct implementation autopilot prompt for the already-refined Storybook/UI-library plan.

````md
You are ChatGPT/Codex/Claude Code/OpenCode/CommandCode/OMX acting as a senior startup technical founder, principal engineer, product strategist, technical architect, Storybook architect, UI component library architect, design-system lead, accessibility engineer, QA strategist, security/performance reviewer, repo-aware implementation agent, documentation maintainer, and careful git/worktree operator.

You are implementing the ArchEstimator Storybook-first UI Component Library MVP.

Repository:
- GitHub repo: pjel888/archestimator
- Local repo path: /Users/philiplewis/archestimator
- Remote: origin
- Main branch: main
- Planning branch containing the implementation plan: docs/ui-component-plan-refinement-2026-06-06
- Target plan folder:
  /Users/philiplewis/archestimator/.ai/03_plans/2026-06-06-ui-component-optimization-componentization

FEATURE / CHANGE REQUEST:
Implement the full Storybook-first ArchEstimator UI Component Library MVP from the plan folder. This means configuring Storybook, building the local UI library foundations/components/stories/fixtures/decorators/governance surfaces, covering the P0/P1 Storybook plan, validating everything, updating .ai durable project memory, committing and pushing the implementation branch, and stopping before production app migration.

OWNER APPROVAL GRANTED BY THIS PROMPT:
Philip approves Storybook-only MVP implementation, including:
- Adding Storybook dev dependencies.
- Editing package.json and bun.lock only for Storybook/UI-library implementation needs.
- Adding `.storybook/` config.
- Adding Storybook scripts.
- Adding story files.
- Adding static fixtures and story-only decorators.
- Adding new local reusable UI components when needed.
- Adding focused tests for new or changed shared behavior.
- Adding minimal package dependencies needed for Storybook and approved P0/P1 accessibility if documented and justified.

OWNER APPROVAL NOT GRANTED BY THIS PROMPT:
- No production app route migration.
- No app-wide replacement of existing route UI.
- No Supabase migration.
- No generated Supabase type change.
- No provider setting change.
- No Vercel deployment/publishing.
- No public Storybook hosting.
- No Flowbite Pro paid-source copying or storage.
- No Flowbite runtime/plugin by default.
- No Aceternity/Motion/Framer dependency unless a blocker is created and Philip explicitly approves later.
- No broad dark mode.
- No replacement of React Complex Tree.
- No production auth/provider/data behavior change.
- No main-branch merge.

HARD BOUNDARY:
This implementation ends when the Storybook UI library MVP is locally inspectable and `build-storybook` succeeds. Production app migration remains blocked until Philip reviews the implemented Storybook library and separately approves a route-by-route migration plan.

AUTOPILOT RULE:
Work in a loop until every required Storybook-only MVP acceptance criterion is either:
1. implemented and validated;
2. explicitly marked `DEFERRED` because it is P2/P3/LANDING_ONLY/out-of-scope; or
3. blocked by a real owner/package/runtime issue recorded in `.ai/15_Bugs`.

Do not stop after the first failure. Diagnose, fix, re-run validation, and continue. If the same blocker persists after reasonable attempts, create a bug/blocker plan, mark the affected work item blocked, continue with non-dependent slices, and report honestly.

DO NOT ASK FOLLOW-UP QUESTIONS UNLESS A SAFETY/OWNER GATE IS TRULY BLOCKING.
Make implementation decisions inside the approved scope using repo evidence and the plan docs. If a decision is ambiguous but safe, document it in `.ai` and proceed. If a decision would violate the approval boundaries, stop that slice and create a blocker.

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

Use the refined plan branch as the base because it contains the canonical Storybook/UI-library plan.

Run:

```bash
git fetch --prune origin
git checkout docs/ui-component-plan-refinement-2026-06-06
git pull --ff-only origin docs/ui-component-plan-refinement-2026-06-06
```

Create an implementation branch from it:

```bash
git checkout -b feat/ui-component-library-storybook-mvp
```

If that branch already exists, create a timestamped branch:

```bash
git checkout -b feat/ui-component-library-storybook-mvp-$(date +%Y%m%d-%H%M)
```

Never direct-edit `main`.
Never merge to `main`.
Push the implementation branch at the end.
Create a PR only if the repo workflow/tools support it; do not merge it.

================================================================================
2. REQUIRED READING ORDER
=========================

Before source/package edits, read:

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
19. `src/app/globals.css`
20. Relevant local Next.js docs under `node_modules/next/dist/docs/` before touching Next/Storybook/framework config.
21. The full target plan folder:

    * `00_INDEX.md`
    * `README.md`
    * `CURRENT_CANONICAL_PLAN.md`
    * `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`
    * `02_CODEBASE_RESEARCH.md`
    * `03_ARCHITECTURE_AND_DESIGN_PLAN.md`
    * `04_IMPLEMENTATION_SEQUENCE.md`
    * `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md`
    * `06_TESTING_AND_VERIFICATION_PLAN.md`
    * `07_UI_UX_AND_ACCESSIBILITY_PLAN.md`
    * `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md`
    * `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md`
    * `10_IMPLEMENTATION_PROMPT_DRAFT.md`
    * `11_READINESS_SCORECARD.md`
    * `12_OPEN_QUESTIONS_AND_DECISIONS.md`
    * `13_TRACEABILITY_MATRIX.md`
    * `14_UI_LIBRARY_MASTER_PLAN.md`
    * `15_COMPONENT_INVENTORY_MATRIX.md`
    * `16_STORYBOOK_INSTALLATION_AND_CONFIGURATION_PLAN.md`
    * `17_STORYBOOK_STORY_COVERAGE_MATRIX.md`
    * `18_DESIGN_TOKEN_AND_THEMING_PLAN.md`
    * `19_ICON_SYSTEM_AND_ASSET_PLAN.md`
    * `20_COMPONENT_API_AND_COMPOSITION_CONTRACTS.md`
    * `21_EXTERNAL_SOURCE_ADOPTION_PLAN_SHADCN_FLOWBITE_ACETERNITY.md`
    * `22_ACCESSIBILITY_AND_KEYBOARD_MATRIX.md`
    * `23_VISUAL_QA_AND_REVIEW_WORKFLOW.md`
    * `24_NO_MIGRATION_STORYBOOK_ONLY_MVP_SCOPE.md`
    * `25_FUTURE_APP_MIGRATION_ROADMAP_DEFERRED.md`
    * `26_IMPLEMENTATION_PROMPT_STORYBOOK_AND_LIBRARY_ONLY.md`
    * `27_COMPONENT_ACCEPTANCE_CHECKLIST.md`
    * `28_MCP_AND_COMPUTER_USE_SOURCE_RESEARCH_GUIDE.md`
    * `29_COMPONENT_DEPENDENCY_AND_PACKAGE_PLAN.md`
    * `30_AGENT_UI_USAGE_RULES_DRAFT.md`
    * `31_DOC_REPAIR_LOG.md`
    * `32_SOURCE_ADOPTION_CROSSWALK.md`
    * `33_STORYBOOK_CONFIG_SKELETONS.md`
    * `34_FIXTURE_AND_DECORATOR_CONTRACTS.md`
    * `35_COMPONENT_API_REFERENCE_MATRIX.md`
    * `36_P0_P1_IMPLEMENTATION_BACKLOG.md`
    * `37_PHILIP_STORYBOOK_REVIEW_PACKET.md`
    * `38_VALIDATION_COMMAND_MATRIX.md`
22. Preserved tree/domain sub-plan docs only after reading the canonical Storybook layer.

================================================================================
3. CODEBASE INTELLIGENCE REQUIREMENTS
=====================================

Use GitNexus and/or code-review-graph tools first if available, per `AGENTS.md`.

Before broad grep/manual scanning, inspect:

* architecture overview;
* UI/component clusters;
* shared primitive blast radius;
* Button/SearchInput/Modal/ContextMenu/Toast/WorkshopTree impacts;
* component library/domain surfaces;
* tests related to current primitives;
* design-system linter impact;
* current branch diff risk.

Before editing any function, class, method, exported component, or shared primitive:

* run GitNexus impact for the exact symbol if available;
* run code-review-graph impact/context if available;
* record HIGH/CRITICAL risks in notes/final report;
* keep high-impact work isolated in separate commits.

If graph tools are unavailable:

* document unavailability;
* fall back to `rg`, `rg --files`, `git grep`, `find`, direct file reading, and `git diff`;
* do not hallucinate files/APIs/routes/components/tests.

Do not claim provider, hosted, Supabase, Vercel, or GitHub state unless actually verified with the correct tool and the task scope allows it.

================================================================================
4. EXTERNAL SOURCE RESEARCH REQUIREMENTS
========================================

Before installing/configuring Storybook or adopting external component patterns, re-check current official docs/public sources for:

1. Storybook:

   * Next.js framework guidance;
   * `@storybook/nextjs-vite` vs `@storybook/nextjs`;
   * App Router/app directory support;
   * scripts;
   * config files;
   * Tailwind/global CSS;
   * path aliases;
   * static assets;
   * docs/autodocs;
   * controls/args;
   * accessibility addon;
   * interaction testing/play functions;
   * build-storybook validation;
   * Bun/package-manager implications if documented.

2. shadcn/ui:

   * component inventory;
   * Tailwind v4 setup;
   * registry/CLI/MCP;
   * theming;
   * forms;
   * sidebar;
   * chart;
   * accessible API/composition;
   * Radix dependency implications;
   * copy-in local component posture.

3. Flowbite:

   * component inventory;
   * forms;
   * tables;
   * sidebars;
   * navbars;
   * modals/drawers/dropdowns/tooltips/popovers;
   * dashboards;
   * blocks/application UI;
   * Flowbite MCP;
   * Tailwind v4 compatibility;
   * Flowbite Pro boundaries if visible publicly;
   * JS runtime/plugin implications.

4. Aceternity UI:

   * component inventory;
   * cards;
   * buttons;
   * loaders;
   * backgrounds;
   * text effects;
   * overlays;
   * navigation;
   * grids/blocks;
   * Motion/Framer dependency implications;
   * landing-only vs app/workshop suitability;
   * reduced-motion/performance risks.

5. Tailwind CSS v4:

   * CSS variable theme strategy;
   * `@theme` / `@theme inline`;
   * source scanning;
   * animations/utilities if relevant;
   * compatibility with Storybook/global CSS.

Use MCPs if available:

* shadcn MCP if available;
* Flowbite MCP if available;
* browser/computer-use only when visual inspection is needed.

Do not record:

* paid Flowbite source code;
* paid/pro screenshots;
* credentials;
* private dashboard state;
* tokens;
* secrets;
* customer data.

External source rule:

* shadcn/Flowbite/Aceternity/Tailwind are references.
* `DESIGN.md`, current repo code, Storybook review, and ArchEstimator product constraints are authorities.
* Do not paste external defaults into the app/workshop UI without adaptation.

================================================================================
5. IMPLEMENTATION DEFINITION OF “WHOLE PLAN”
============================================

“Whole plan” means the Storybook-only UI library MVP from the plan folder, not production app migration.

You must implement:

1. Storybook package/config setup.
2. Storybook static build.
3. Tailwind v4/global CSS loading in Storybook.
4. Story-only static fixture builders.
5. Story-only decorators and provider isolation.
6. Foundations/token stories.
7. Icon system/gallery stories.
8. Typography/text stories.
9. P0 primitive stories/components.
10. P1 composition/domain stories/components.
11. ArchEstimator domain stories using static fixtures.
12. Motion/reduced-motion documentation and app-safe CSS-only stories where approved.
13. Governance/checklist/review stories or docs.
14. Updates to `.ai` plan/status/readiness docs.
15. Tests for changed behavior-heavy components.
16. Final validation and clean git commit/push.

You must not implement:

* production route migration;
* app-wide component replacement;
* public Storybook hosting;
* Supabase/provider/schema/server-action changes;
* Flowbite runtime or paid-source adoption by default;
* Motion/Framer/Aceternity runtime effects unless separately owner-approved;
* broad dark mode;
* React Complex Tree replacement.

For every P0/P1 row in `15_COMPONENT_INVENTORY_MATRIX.md` and `17_STORYBOOK_STORY_COVERAGE_MATRIX.md`, create one of these dispositions:

A. Real component + Storybook story.
B. Existing component + Storybook story.
C. Story-only documentation/gallery entry.
D. Domain wrapper story using static fixtures.
E. Explicit `DEFERRED`/`OWNER_GATE`/`LANDING_ONLY` status with reason.

No required P0/P1 item may be silently ignored.

================================================================================
6. DESIGN SYSTEM RULES
======================

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
7. PACKAGE AND DEPENDENCY RULES
===============================

Approved by this prompt:

* Storybook dev dependencies.
* `@storybook/nextjs-vite` by default, unless current docs/repo compatibility require `@storybook/nextjs`.
* Storybook docs/controls support as required by current Storybook package.
* `@storybook/addon-a11y` if compatible and useful.
* `@storybook/test` or current Storybook interaction-test package if compatible and useful.
* Minimal additional packages only if essential for P0/P1 accessible behavior and explicitly documented.

Default package posture:

* Prefer existing repo dependencies and primitives.
* Prefer native controls or existing local primitives when sufficient.
* Prefer CSS-only motion for app/workshop.
* Do not add Flowbite runtime/plugin by default.
* Do not add Motion/Framer by default.
* Do not add broad Radix packages reflexively.
* If a new Radix/package is necessary for accessibility, document the exact need, alternatives considered, package risk, rollback, and validation evidence in `.ai/10_state/decisions.md` or the plan closeout.
* If a package creates install/build conflicts, create a blocker and stop that package slice.

Package validation:

```bash
bun install
bun run storybook
bun run build-storybook
bun run validate
bun run build
git diff --check
```

Never edit package files without a recorded reason.

================================================================================
8. STORYBOOK ARCHITECTURE REQUIREMENTS
======================================

Implement Storybook according to the current official docs and plan docs.

Expected outputs:

* `.storybook/main.ts`
* `.storybook/preview.tsx`
* optional `.storybook/preview-head.html` only if necessary
* optional `.storybook/manager.ts` only if necessary
* Storybook scripts in `package.json`:

  * `storybook`
  * `build-storybook`
* Optional scripts only if useful and package-approved.
* `.gitignore` entry for `storybook-static` if not already ignored.
* `src/stories/fixtures/`
* `src/stories/decorators/`
* Story files under either:

  * colocated `*.stories.tsx`, or
  * `src/stories/**`
    Choose one approach or a hybrid deliberately, document it, and keep it consistent.

Required Storybook IA:

* Foundations
* Icons
* Typography
* Actions
* Forms
* Status
* Menus
* Overlays
* Navigation
* Cards / Panels
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

Storybook must:

* load ArchEstimator Tailwind v4/global CSS;
* preserve app/workshop compact styling;
* use static fixtures;
* avoid live Supabase/provider calls;
* avoid server actions;
* avoid analytics/provider scripts;
* support docs/controls where useful;
* build statically with `bun run build-storybook`.

If Storybook starts but static build fails, the MVP is not complete.

================================================================================
9. STATIC FIXTURE AND DECORATOR REQUIREMENTS
============================================

Create static fixtures and decorators according to `34_FIXTURE_AND_DECORATOR_CONTRACTS.md`.

Recommended future layout:

```txt
src/stories/fixtures/
  project-fixtures.ts
  estimate-fixtures.ts
  component-library-fixtures.ts
  share-review-fixtures.ts
  notification-fixtures.ts
  user-workspace-fixtures.ts
  proposal-fixtures.ts

src/stories/decorators/
  withArchEstimatorTheme.tsx
  withMockRouter.tsx
  withMockAuth.tsx
  withStaticQueryClient.tsx
  withReducedMotion.tsx
  withStoryFrame.tsx
  withNoProviderNetworkGuard.tsx
```

Fixture rules:

* fake data only;
* deterministic data only;
* no real UUIDs unless documented fake UUID shape is required;
* no real emails;
* no real project names;
* no real share tokens;
* no provider URLs;
* no customer images;
* no private proposal data;
* no secrets;
* no environment-variable reads;
* no Supabase client imports;
* no server action imports;
* no repository imports;
* no API route imports;
* no Vercel analytics/speed-insights.

Required fixture builders:

* `makeUserFixture`
* `makeWorkspaceFixture`
* `makeProjectFixture`
* `makeEstimateFixture`
* `makeEstimateTreeFixture`
* `makeEstimateRowFixture`
* `makeComponentLibraryFixture`
* `makeShareReviewFixture`
* `makeNotificationFixture`
* `makeProposalFixture`

Every domain story must use these fixtures or equivalent static fixtures.

================================================================================
10. COMPONENT IMPLEMENTATION RULES
==================================

Prioritize additive, backward-compatible work.

Preferred order:

1. Story-only documentation/galleries for foundations.
2. Stories for existing primitives before source modifications.
3. Add missing wrappers/components only when repeated usage or story coverage requires it.
4. Avoid changing existing production-used components unless necessary.
5. If changing a shared primitive, run graph impact first, add/update focused tests, and preserve backward compatibility.
6. Domain stories should prefer static wrapper components and fixtures; do not import server/provider modules.

Existing components to story first:

* `src/components/ui/button.tsx`
* `src/components/ui/button-link.tsx`
* `src/components/ui/badge.tsx`
* `src/components/ui/chip.tsx`
* `src/components/ui/control-input.tsx`
* `src/components/ui/control-select.tsx`
* `src/components/ui/creatable-combobox.tsx`
* `src/components/ui/search-input.tsx`
* `src/components/ui/action-menu.tsx`
* `src/components/ui/context-menu.tsx`
* `src/components/ui/modal.tsx`
* `src/components/ui/toolbar-tooltip.tsx`
* `src/components/ui/toolbar-icon-button.tsx`
* `src/components/ui/header-icon-toolbar.tsx`
* `src/components/ui/toast.tsx`
* `src/components/ui/skeleton.tsx`
* `src/components/ui/empty-state.tsx`
* `src/components/ui/route-loading-overlay.tsx`

If existing components are insufficient, add new local components under a clear library structure such as:

* `src/components/ui/foundations/`
* `src/components/ui/icons/`
* `src/components/ui/forms/`
* `src/components/ui/overlays/`
* `src/components/ui/navigation/`
* `src/components/ui/data-display/`
* `src/components/ui/layout/`
* `src/components/ui/feedback/`
* `src/components/ui/motion/`
* `src/components/workshop/ui/`
* `src/components/share/ui/`

Do not import story-only fixtures/decorators into production components.
Do not make primitives depend on domain components.
Do not make primitives import Supabase/provider/server-action modules.
Do not create broad style escape-hatch APIs.
Use named exports.

================================================================================
11. P0 IMPLEMENTATION REQUIREMENTS
==================================

P0 must be complete enough for first Storybook review.

Implement/cover these P0 groups:

A. Foundations

* color token gallery
* semantic color token gallery
* surface token gallery
* typography token gallery
* font stack demo
* font weight demo
* radius token gallery
* spacing/density gallery
* focus ring gallery
* status token gallery
* skeleton/loading token demo
* app/workshop vs landing boundary demo
* design-system do/don’t examples

B. Icons

* AppIcon wrapper or equivalent story-only standard
* icon gallery
* semantic icon map
* icon size demos
* icon-only accessibility demos
* decorative icon demos
* Phosphor regular app/workshop examples

C. Typography/Text

* Text
* Heading/AppTitle/AppSubtitle
* BodyText/MutedText
* LabelText/HelperText/ErrorText
* Numeric/Currency/Percent/Unit text
* Kbd
* Truncated/long-content text
* Link/ExternalLink examples

D. Actions

* Button
* IconButton
* ToolbarIconButton
* ButtonLink
* ButtonGroup if needed
* Toggle/ToggleGroup or clearly deferred if not needed
* Loading/disabled/danger/long-label states
* Copy/Favorite/Expand/Add/Save/Cancel/Delete/Export/Share action examples where practical

E. Status

* Badge
* Chip
* Pill/StatusPill
* Count/Notification badges
* Dot/status indicators
* removable chip states

F. Forms

* Field
* Label
* RequiredIndicator
* HelperText
* ErrorMessage
* ControlInput/TextInput
* SearchInput/SearchField
* ControlSelect/NativeSelect
* Textarea
* Number/Currency/Quantity/Unit/Percentage examples
* Checkbox/Radio/Switch if implementable without unjustified package risk, otherwise story/disposition per plan
* ValidationSummary
* FormSection/TwoColumnControlRow examples

G. Menus

* ActionMenu
* DropdownMenu if local wrapper needed
* ContextMenu / right-click menu
* MenuItem/Separator/Shortcut examples
* destructive/disabled/nested/grouped states where supported
* Tree/table/card right-click examples as static stories

H. Overlays

* Modal/Dialog
* Confirm/Delete confirm pattern
* Tooltip/ToolbarTooltip
* Popover/HelpPopover if feasible
* loading/error/destructive/form modal states

I. Cards/Panels

* Card
* Panel
* SectionHeader
* EmptyCard/ErrorCard/LoadingCard
* interactive/selectable card states
* no nested-card do/don’t story

J. Feedback

* Toast
* Skeleton
* EmptyState
* LoadingOverlay
* InlineAlert/ErrorState if feasible
* empty/loading/error/success examples

K. Governance

* Component acceptance checklist story/docs page
* Story coverage dashboard or docs page
* migration status label examples
* source attribution/adoption note examples

Every P0 story must have:

* default state;
* variants where applicable;
* disabled state where applicable;
* loading state where applicable;
* invalid/error state where applicable;
* long-content state where applicable;
* keyboard/focus notes for interactive components;
* accessibility notes;
* static fixture or “no fixture needed” note;
* migration status.

================================================================================
12. P1 IMPLEMENTATION REQUIREMENTS
==================================

Implement/cover these P1 groups after P0 is green:

A. Advanced/composed controls

* CreatableCombobox
* Select/Combobox states
* Checkbox/Radio/Switch wrappers if not already P0
* SegmentedControl if useful
* InputGroup/Prefix/Suffix
* InlineEditableField/EditableCell examples

B. Navigation/layout

* Tabs
* Breadcrumbs if feasible
* AppShell/WorkshopShell story wrapper
* Sidebar/AppSidebar/SidebarNav examples
* HeaderActionCluster/HeaderIconToolbar
* Toolbar/ActionBar/FilterBar/SearchToolbar
* Stack/Inline/Grid/SplitPane layout examples

C. Data display

* DataTable shell
* DenseDataTableShell
* sortable/selected/empty/loading/error/overflow states
* EditableCell
* Numeric/Currency/Status/Action cell examples
* ColumnVisibilityMenu if feasible

D. Trees/hierarchy

* TreeShell
* TreeRow
* TreeEmpty/Loading/Error
* TreeContextMenu
* ShareReviewTree story
* EstimateTree story fixture
* LibraryFolderTree story fixture
* do not migrate real tree app behavior
* do not refactor editable estimate tree mutations

E. Domain / Workshop

* ProjectCard
* ProjectEstimateRow / ProjectEstimatesTable static story
* EstimateSummaryPanel
* EstimateTree story fixture
* EstimateRowItemsTable story fixture
* ComponentLibraryCard
* ComponentCatalogueCard
* LibraryFolderTree static story
* TemplateCard if feasible

F. Domain / Share

* ShareReviewHeader
* ShareDecisionPanel
* ShareTreeSurface
* ShareEstimateTreePanel/View static stories
* ProposalPreviewCard
* ProposalReviewBlock

G. Domain / Notifications

* NotificationBell
* NotificationCenter
* NotificationListItem
* ReleaseAnnouncementModal
* unread/read/empty/loading/dismiss states

H. Motion

* ReducedMotionProvider/story
* CSS-only FadeIn/ScaleIn/CollapseExpand examples if useful
* app/workshop-safe microinteraction docs
* Aceternity-inspired effects only as `LANDING_ONLY` or `DEFERRED` unless no dependency is added and reduced-motion is safe

Every P1 story must have:

* static fixtures;
* no live provider imports;
* viewports where meaningful;
* keyboard/a11y notes;
* deferred/migration label;
* review state.

================================================================================
13. P2/P3/DEFERRED/LANDING_ONLY HANDLING
========================================

Do not attempt to implement every P2/P3/LANDING_ONLY item as production-ready code in this MVP.

For P2/P3/DEFERRED/LANDING_ONLY:

* represent them in the inventory/governance docs;
* create docs-only or backlog stories only if easy and safe;
* mark dependency-gated items clearly;
* do not block P0/P1 MVP on them;
* do not add Motion/Framer/Flowbite runtime for them;
* do not move them into app/workshop UI.

================================================================================
14. AUTOPILOT IMPLEMENTATION LOOP
=================================

Use this loop for every slice:

1. Select next slice from `36_P0_P1_IMPLEMENTATION_BACKLOG.md`.
2. Read related rows in:

   * `15_COMPONENT_INVENTORY_MATRIX.md`
   * `17_STORYBOOK_STORY_COVERAGE_MATRIX.md`
   * `35_COMPONENT_API_REFERENCE_MATRIX.md`
   * `32_SOURCE_ADOPTION_CROSSWALK.md`
   * `34_FIXTURE_AND_DECORATOR_CONTRACTS.md`
   * `38_VALIDATION_COMMAND_MATRIX.md`
3. Run graph/GitNexus impact before editing shared source.
4. Implement the smallest complete slice.
5. Add stories and fixtures.
6. Add/update tests if behavior changed or component is behavior-heavy.
7. Run targeted validation for the slice.
8. Fix failures.
9. Re-run targeted validation.
10. Update plan/backlog/checklist statuses.
11. Commit the green slice.
12. Continue to the next slice.

Do not leave a slice half-implemented unless:

* a blocker is recorded in `.ai/15_Bugs`;
* the item is marked `DEFERRED` with reason;
* the final report clearly lists it.

Recommended commit slicing:

* `chore(storybook): configure storybook`
* `feat(ui): add storybook fixtures and decorators`
* `feat(ui): add foundation and icon stories`
* `feat(ui): add p0 primitive stories`
* `feat(ui): add form menu overlay stories`
* `feat(ui): add navigation data tree stories`
* `feat(ui): add domain story fixtures`
* `docs(ai): update storybook library implementation status`

If a commit becomes too large, split it.

================================================================================
15. TESTING AND VALIDATION REQUIREMENTS
=======================================

Current repo baseline commands to use:

```bash
bun run validate
bun run build
bun run lint:design-system
bun run type-check
bun run test
bun run test:dom
git diff --check
```

Future Storybook commands after setup:

```bash
bun run storybook
bun run build-storybook
```

Run targeted tests whenever source behavior changes.

Known relevant tests to inspect/use where applicable:

* UI modal/tooltip tests
* toast tests
* header icon toolbar tests
* component-library UI tests
* component-library manager tests
* library folder tree tests
* estimate sheet/tree tests
* project estimates table tests
* share tree reconstruction tests
* release announcement modal tests
* workshop route error boundary tests
* design-system lint/contracts

Do not run `bun run test:e2e` unless production routes/auth/protected flows are changed, which this MVP must avoid.

Validation sequence:

1. After Storybook setup:

   * `bun install`
   * `bun run storybook`
   * `bun run build-storybook`
   * `git diff --check`

2. After P0 foundations/primitives:

   * `bun run build-storybook`
   * `bun run lint:design-system`
   * focused tests if source changed
   * `bun run type-check`

3. After P1/domain stories:

   * `bun run build-storybook`
   * static import/provider audit
   * focused tests if source changed
   * `bun run validate`

4. Final:

   * `bun run validate`
   * `bun run build`
   * `bun run lint:design-system`
   * `bun run type-check`
   * `bun run test`
   * `bun run test:dom`
   * `bun run build-storybook`
   * `git diff --check`

If `bun run storybook` is interactive and cannot remain running, start it long enough to prove it compiles and serves, then stop it cleanly. Prefer `build-storybook` as the final non-interactive proof.

If validation fails:

* identify whether failure is from your change or baseline;
* fix your change if caused by you;
* if baseline or external blocker, create `.ai/15_Bugs/YYYY-MM-DD-{slug}.md`;
* do not hide failures.

================================================================================
16. STATIC IMPORT / PROVIDER SAFETY AUDIT
=========================================

Before final validation, audit story/fixture/decorator imports.

Stories, fixtures, and decorators must not import:

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

If a production component imports provider/server code and cannot be safely rendered in Storybook:

* do not import it directly;
* create a story-only presentational wrapper using static fixtures;
* or defer that story with a recorded blocker/disposition.

Add a lightweight import-audit script only if it materially improves safety and does not overcomplicate the MVP.

================================================================================
17. UI / ACCESSIBILITY REQUIREMENTS
===================================

Every interactive component story must document or show:

* keyboard behavior;
* focus-visible behavior;
* disabled state;
* loading state where applicable;
* invalid/error state where applicable;
* ARIA label/name requirements;
* error/status announcement behavior where applicable;
* reduced-motion behavior if animated;
* long-label/long-content behavior;
* responsive behavior if layout-sensitive.

Complex components need keyboard notes:

* menus: open, arrow keys, Enter, Escape, focus return;
* context menus: pointer and keyboard open path if supported;
* dialogs: focus trap, Escape, title/description labels, focus return;
* tooltips: hover and focus behavior;
* tabs: arrow keys and tab-panel relationship;
* combobox/select: typing, arrow keys, selection, escape;
* tables/editable cells: commit/cancel/Tab behavior;
* trees: expand/collapse, selected vs focused distinction;
* toasts: live region/status behavior without stealing focus.

A11y addon/play tests:

* Add Storybook a11y addon if approved and compatible.
* Use play functions where useful for menus/dialogs/combobox/tabs/tree/editable cell.
* If not implementing automated a11y/play tests in first pass, document manual keyboard checks in stories/docs and final report.

================================================================================
18. STORYBOOK REVIEW PACKET REQUIREMENTS
========================================

Implement or update the future review packet from `37_PHILIP_STORYBOOK_REVIEW_PACKET.md`.

At final closeout, provide Philip:

* local Storybook URL or startup command;
* static build status;
* list of completed P0/P1 story groups;
* known deferred items;
* validation summary;
* accessibility/keyboard summary;
* migration still blocked statement;
* how to review stories;
* labels to use:

  * `APPROVED_FOR_STORYBOOK_MVP`
  * `NEEDS_REVISION`
  * `REJECTED_FOR_APP_WORKSHOP`
  * `LANDING_ONLY`
  * `DEFERRED`
  * `BLOCKS_MIGRATION`

Philip approving Storybook components does not automatically approve app migration. Migration requires a separate future prompt/plan.

================================================================================
19. .ai MEMORY AND PLAN UPDATES
===============================

During and after implementation, update relevant `.ai` docs.

At minimum update:

* target plan folder status docs;
* `36_P0_P1_IMPLEMENTATION_BACKLOG.md`;
* `27_COMPONENT_ACCEPTANCE_CHECKLIST.md`;
* `17_STORYBOOK_STORY_COVERAGE_MATRIX.md` statuses where feasible;
* `11_READINESS_SCORECARD.md`;
* `31_DOC_REPAIR_LOG.md` or create an implementation closeout doc;
* `.ai/10_state/current-state.md`;
* `.ai/10_state/decisions.md` if package/framework decisions are made;
* `.ai/05_logs/` with an implementation run log.

Do not mark production app migration complete.
Do not mark Storybook publicly deployed.
Do not mark P0/P1 approved by Philip unless Philip actually reviewed and approved.
Do not activate root `AGENTS.md` UI enforcement rules unless Storybook exists, P0/P1 are approved, and Philip explicitly approves enforcement.

Recommended new/updated closeout docs in the plan folder:

* `39_IMPLEMENTATION_CLOSEOUT.md`
* `40_STORYBOOK_REVIEW_STATUS.md`
* `41_VALIDATION_EVIDENCE.md`

If you create new docs, add them to `00_INDEX.md` and README reading order.

================================================================================
20. BUG / BLOCKER PROTOCOL
==========================

If you discover a bug, failing test, blocker, stale assumption, package incompatibility, Storybook/Next compatibility problem, Tailwind CSS issue, security concern, provider import leak, test gap, design-system conflict, or serious ambiguity, create:

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
If a blocker prevents Storybook setup or static build, final status must be `BLOCKED` or `NEEDS_HUMAN_DECISION`.

================================================================================
21. DO-NOT-TOUCH LIST
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

* `package.json` and `bun.lock` for approved Storybook/dev dependency work.
* `.storybook/*`
* story files.
* `src/stories/**`
* static fixtures/decorators.
* new reusable UI components.
* existing UI primitives only when necessary, backward-compatible, tested, and graph-reviewed.
* docs and `.ai` memory updates.
* `.gitignore` for Storybook generated output if needed.
* focused tests for changed components.

================================================================================
22. FINAL ACCEPTANCE CRITERIA
=============================

The implementation is complete only when:

1. Storybook is installed/configured.
2. `bun run storybook` starts successfully.
3. `bun run build-storybook` succeeds.
4. Tailwind v4/global CSS loads in Storybook.
5. Static fixtures exist and are provider-free.
6. Storybook decorators exist and are provider-free.
7. P0 foundations/icon/typography/action/form/status/menu/overlay/card/feedback/governance stories are implemented or explicitly dispositioned.
8. P1 composition/domain/table/tree/navigation/layout/notification/share stories are implemented or explicitly dispositioned.
9. No story uses live Supabase/provider/server-action data.
10. No production route migration exists in the diff.
11. `bun run lint:design-system` passes or any baseline blocker is documented.
12. `bun run type-check` passes or any baseline blocker is documented.
13. `bun run validate` passes or any baseline blocker is documented.
14. `bun run build` passes or any baseline blocker is documented.
15. `git diff --check` passes.
16. `.ai` docs are updated.
17. Final report clearly lists completed, deferred, blocked, and not-in-scope items.
18. Branch is committed and pushed.
19. App migration remains blocked pending Philip review.

Do not claim complete if `build-storybook` fails.

================================================================================
23. FINAL VERIFICATION BEFORE COMMIT
====================================

Run:

```bash
git status --short --branch
git diff --stat
git diff --check
git diff --name-status
git diff -- package.json bun.lock .storybook src/stories src/components .ai
bun run build-storybook
bun run lint:design-system
bun run type-check
bun run validate
bun run build
```

If `bun run validate` already includes type/lint/tests, still run the Storybook-specific command separately.

If validation output is long, summarize key pass/fail lines in `.ai/05_logs` and final report.
Do not record secrets or raw provider values.

================================================================================
24. COMMIT AND PUSH REQUIREMENTS
================================

Stage only intended files.

Before staging, inspect:

```bash
git status --short
git diff --stat
git diff --check
```

Do not stage unrelated dirty files.

Use separate commits for major green slices if practical. Suggested final commit messages:

```bash
git commit -m "chore(storybook): configure ui library storybook"
git commit -m "feat(ui): add storybook foundations and primitives"
git commit -m "feat(ui): add storybook domain fixtures and stories"
git commit -m "docs(ai): update ui library storybook implementation status"
```

If you use one commit, use:

```bash
git commit -m "feat(ui): implement storybook ui component library mvp"
```

Push:

```bash
git push -u origin HEAD
```

Never force push.
Do not merge to `main`.
If `gh` is available and repo workflow allows it, create a PR without merging. Otherwise report the pushed branch.

================================================================================
25. FINAL REPORT REQUIREMENTS
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
* Summary of implementation.
* Storybook package/config summary.
* Storybook local command and URL.
* `build-storybook` status.
* P0 coverage summary.
* P1 coverage summary.
* Deferred P2/P3/LANDING_ONLY summary.
* Components/stories created.
* Fixtures/decorators created.
* Tests added/updated.
* Validation commands run and results.
* Design-system lint result.
* Type-check result.
* App build result.
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
* Next recommended step: Philip reviews local Storybook using `37_PHILIP_STORYBOOK_REVIEW_PACKET.md`.

================================================================================
26. QUALITY BAR
===============

Do not optimize for speed over correctness.
Do not pretend incomplete stories are done.
Do not hide validation failures.
Do not import live provider data.
Do not migrate app routes.
Do not copy external UI defaults blindly.
Do not create giant unreviewable diffs if smaller commits are possible.
Do not leave the repo with untracked generated output unless intentionally ignored.
Do not mark Philip approval unless Philip actually reviewed.

The goal is a polished, inspectable Storybook UI Component Library MVP that can become the foundation for ArchEstimator’s future app migration, while preserving closed-beta production safety.

```
```
