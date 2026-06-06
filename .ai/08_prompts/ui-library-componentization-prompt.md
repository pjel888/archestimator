You are ChatGPT acting as a senior prompt architect, startup technical founder, principal engineer, product strategist, technical architect, UI systems architect, design-system lead, Storybook architect, accessibility reviewer, QA strategist, security/performance reviewer, technical documentation maintainer, and careful git/worktree operator.

You are operating inside the local ArchEstimator repository.

Your job is to convert the existing plan folder:

/Users/philiplewis/archestimator/.ai/03_plans/2026-06-06-ui-component-optimization-componentization

from a narrower UI/tree optimization and componentization plan into a much larger, Storybook-first ArchEstimator UI Component Library planning pack.

This is PLAN/DOCUMENTATION REFINEMENT ONLY.

Do not implement the UI library.
Do not install Storybook.
Do not add dependencies.
Do not modify production source code.
Do not migrate current app screens.
Do not modify runtime behavior.
Do not modify Supabase, migrations, generated types, provider settings, secrets, package files, build config, app code, or tests.

Only create/update .ai planning and documentation files.

FEATURE / CHANGE REQUEST:

Expand and formalize the existing UI Component Optimization and Componentization plan folder into a complete ArchEstimator UI Component Library + Storybook planning pack.

The refined plan must define a future implementation whose final output is:

1. A formal reusable ArchEstimator UI component library.
2. Storybook installed and configured for ArchEstimator.
3. Every planned foundational UI component displayed in Storybook.
4. Storybook stories that cover variants, states, responsive behavior, accessibility states, empty/loading/error/success states, density rules, and ArchEstimator-specific product usage.
5. Clear governance so future codebase AI agents use ArchEstimator library components instead of one-off local UI.
6. No migration of current production app surfaces yet. Migration must be explicitly deferred to a future phase after Philip reviews and approves the Storybook library.

The plan must heavily use these sources as inspiration and/or implementation sources, while adapting everything to ArchEstimator’s own design system:

- https://ui.shadcn.com/
- https://flowbite.com/
- https://ui.aceternity.com/
- Tailwind CSS v4

Important source posture:

- shadcn/ui is the preferred source for accessible primitives, Radix-style composition, component APIs, and copy-in local component patterns.
- Flowbite is the preferred source for breadth: forms, dashboards, navs, sidebars, tables, cards, banners, modals, drawers, indicators, page sections, and paid/pro block inspiration if available through Philip’s paid access. Use Flowbite MCP or computer-use/browser access if available, but never record credentials, private tokens, account details, proprietary screenshots, or secrets in the repo.
- Aceternity is the preferred source for selective microinteractions, animation ideas, cards, overlays, hover effects, text effects, loaders, empty states, and tasteful motion. Do not blindly add Motion/Framer dependencies without a package and performance decision gate.
- Tailwind CSS is the styling substrate. ArchEstimator’s local DESIGN.md rules override external design defaults.
- Existing ArchEstimator primitives under src/components/ui and src/components/workshop must be audited and reused before planning new primitives.

The current folder already contains useful docs and evidence. Read them first. Do not delete them. Preserve useful research, but explicitly supersede the old “do not build a broad generic design system” thesis. The new canonical thesis is:

ArchEstimator now needs a formal, Storybook-first product UI library that standardizes primitives, patterns, domain components, icons, and microinteractions before app-wide migration. The old tree/componentization work becomes one domain-component sub-plan inside the larger UI library strategy, not the whole plan.

CRITICAL SCOPE RULES:

This refinement plans only the future UI library + Storybook implementation.

The future implementation plan may propose adding Storybook dependencies, story files, fixtures, local library components, component docs, and Storybook scripts.

But this current task must not perform those implementation changes.

No current app migration is allowed in the planned MVP. The planned MVP ends when the UI library and Storybook are inspectable. Production app adoption/migration is a separate future plan after Philip approves the Storybook result.

INITIAL REPO SAFETY CHECK:

Run and record:

- pwd
- git rev-parse --show-toplevel
- git status --short --branch
- git branch --show-current
- git worktree list
- git remote -v
- git fetch --prune origin
- git log --oneline -5

Assume another codebase AI agent may be working in the repo.

Do not:

- force push
- use git reset --hard
- use git clean -fd
- overwrite unrelated dirty files
- stage unrelated files
- delete branches
- delete worktrees
- touch secrets
- edit production source code
- edit package files
- edit runtime/build configuration
- edit migrations/generated files
- edit app behavior

If unrelated dirty files exist, leave them alone and mention them in the final report.

REQUIRED READING ORDER:

Before editing docs, read:

1. AGENTS.md
2. .ai/README.md
3. .ai/00_system/DOCS_SOURCE_OF_TRUTH.md if present
4. .ai/00_system/ai-folder-canonical-map.md if present
5. .ai/00_system/AGENT_OPERATING_PROTOCOL.md
6. .ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md if present
7. .ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md if present
8. .ai/00_system/VALIDATION_MATRIX.md if present
9. .ai/10_state/current-state.md
10. .ai/10_state/decisions.md
11. .ai/10_state/known-issues.md if present
12. .ai/01_roadmap/README.md
13. DESIGN.md
14. package.json
15. README.md
16. Relevant specs inside .ai/06_specs
17. The full target plan folder:
    - .ai/03_plans/2026-06-06-ui-component-optimization-componentization/README.md
    - .ai/03_plans/2026-06-06-ui-component-optimization-componentization/CURRENT_CANONICAL_PLAN.md
    - .ai/03_plans/2026-06-06-ui-component-optimization-componentization/00_INDEX.md
    - every existing markdown document in that folder
18. Relevant active or archived plans touching:
    - route transition performance
    - design system enforcement
    - component library manager
    - estimate sheet/tree
    - share tree
    - notifications/modals
    - app shell/workshop layout
    - visual regression
    - agentic development and CI/CD
19. Existing UI source files only as evidence, not for modification:
    - src/components/ui
    - src/components/workshop
    - src/components/share
    - src/features if UI exists there
    - src/app protected app/workshop surfaces
    - scripts/enforce-app-design-system.mjs
    - tests/vitest and tests/unit related to UI

CODEBASE INTELLIGENCE REQUIREMENTS:

Use GitNexus and/or code-review-graph tools first if available, per AGENTS.md.

Use them to inspect:

- architecture overview
- UI/component clusters
- component dependencies
- current component reuse
- blast radius for major UI primitives
- affected flows for src/components/ui and src/components/workshop
- test coverage for existing primitives
- impact risks for Storybook setup and future component extraction

If graph tools are unavailable, record that and fall back to:

- rg
- rg --files
- git grep
- find
- direct file reading

Do not hallucinate files, routes, dependencies, tests, APIs, components, package scripts, or architecture.

Verify all repo facts from live files.

EXTERNAL SOURCE RESEARCH REQUIREMENTS:

Research current official/public docs for:

1. shadcn/ui
   - components inventory
   - CLI / registry
   - MCP server
   - theming
   - forms
   - sidebar
   - charts
   - registry usage
   - accessibility/composition approach

2. Flowbite
   - components inventory
   - Flowbite Pro/premium block categories if accessible
   - Flowbite MCP if available
   - Tailwind v4 support
   - React/Next.js guidance if relevant
   - icons/illustrations/forms/tables/dashboard blocks
   - data-attribute JavaScript vs copy/adapt strategy

3. Aceternity UI
   - components inventory
   - microinteraction categories
   - card effects
   - text effects
   - buttons
   - loaders
   - overlays/popovers
   - navigation
   - backgrounds/effects
   - free vs paid limitations
   - Motion/Framer dependency risks

4. Storybook
   - latest install guidance
   - Next.js framework guidance
   - @storybook/nextjs-vite vs @storybook/nextjs decision
   - Storybook + Next app directory support
   - global CSS/Tailwind setup
   - controls/docs/a11y/testing guidance
   - build-storybook validation
   - Storybook scripts and output folder
   - package-manager compatibility with Bun

Record external source findings in the docs with source URLs and dates accessed.

Do not over-copy copyrighted or paid material into .ai docs. Summarize inventories, source posture, and implementation guidance. Do not store paid Flowbite account content, secrets, credentials, screenshots, private URLs, or license-sensitive source code in .ai.

TARGET PLAN FOLDER:

Update this folder in place:

/Users/philiplewis/archestimator/.ai/03_plans/2026-06-06-ui-component-optimization-componentization

Do not create a new plan folder unless the target folder is missing or unusable. If missing, create a bug/blocker record first and then create a replacement plan folder only if necessary.

The existing plan folder must become the canonical UI Component Library + Storybook planning pack.

REQUIRED CANONICAL SCOPE CHANGE:

Update README.md, CURRENT_CANONICAL_PLAN.md, and 00_INDEX.md so they clearly say:

- This folder no longer only covers tree optimization/componentization.
- The canonical plan is now “ArchEstimator UI Component Library + Storybook.”
- Existing tree optimization docs are preserved as the “Domain Tree Components and Estimate/Share Tree Sub-plan.”
- The near-term planned implementation is Storybook and reusable components only.
- Current production app migration is explicitly out of scope.
- Future app migration requires Philip’s approval after Storybook review.
- No implementation has happened yet.
- No source code, package files, dependencies, migrations, runtime config, generated files, provider settings, or secrets changed during this docs pass.

REQUIRED DOCUMENT UPDATES:

You may keep existing docs, but you must add the new canonical layer and component-library planning layer.

At minimum, update or create these documents inside the target plan folder:

00_INDEX.md
README.md
CURRENT_CANONICAL_PLAN.md
01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md
02_CODEBASE_RESEARCH.md
03_ARCHITECTURE_AND_DESIGN_PLAN.md
04_IMPLEMENTATION_SEQUENCE.md
05_BLAST_RADIUS_AND_RISK_ANALYSIS.md
06_TESTING_AND_VERIFICATION_PLAN.md
07_UI_UX_AND_ACCESSIBILITY_PLAN.md
08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md
09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md
10_IMPLEMENTATION_PROMPT_DRAFT.md
11_READINESS_SCORECARD.md
12_OPEN_QUESTIONS_AND_DECISIONS.md
13_TRACEABILITY_MATRIX.md

Also create these specialized documents unless a clearly equivalent document already exists and is updated comprehensively:

14_UI_LIBRARY_MASTER_PLAN.md
15_COMPONENT_INVENTORY_MATRIX.md
16_STORYBOOK_INSTALLATION_AND_CONFIGURATION_PLAN.md
17_STORYBOOK_STORY_COVERAGE_MATRIX.md
18_DESIGN_TOKEN_AND_THEMING_PLAN.md
19_ICON_SYSTEM_AND_ASSET_PLAN.md
20_COMPONENT_API_AND_COMPOSITION_CONTRACTS.md
21_EXTERNAL_SOURCE_ADOPTION_PLAN_SHADCN_FLOWBITE_ACETERNITY.md
22_ACCESSIBILITY_AND_KEYBOARD_MATRIX.md
23_VISUAL_QA_AND_REVIEW_WORKFLOW.md
24_NO_MIGRATION_STORYBOOK_ONLY_MVP_SCOPE.md
25_FUTURE_APP_MIGRATION_ROADMAP_DEFERRED.md
26_IMPLEMENTATION_PROMPT_STORYBOOK_AND_LIBRARY_ONLY.md
27_COMPONENT_ACCEPTANCE_CHECKLIST.md
28_MCP_AND_COMPUTER_USE_SOURCE_RESEARCH_GUIDE.md
29_COMPONENT_DEPENDENCY_AND_PACKAGE_PLAN.md
30_AGENT_UI_USAGE_RULES_DRAFT.md
31_DOC_REPAIR_LOG.md

Do not create documents for volume alone. If you merge two docs, explain why in 00_INDEX.md. But the final plan must be comprehensive enough that a future implementation agent can build Storybook and the complete initial UI library without ambiguity.

DOCUMENT CONTENT REQUIREMENTS:

00_INDEX.md must include:

- Updated task goal.
- Canonical scope.
- Old scope supersession note.
- Non-goals.
- Plan document map.
- Start-here instructions for future implementation agent.
- Recommended implementation sequence.
- Required verification commands.
- Risk summary.
- Bug/blocker references.
- Current status.
- Readiness score table.
- Clear instruction: no current app migration until Philip approves Storybook.

README.md must include:

- Plan metadata.
- One-paragraph thesis.
- What changed from the old plan.
- Current implementation status.
- Reading order.
- Source-of-truth hierarchy inside the folder.
- Success criteria.
- “Do not migrate app yet” warning.
- Relationship to existing tree/performance docs.
- Relationship to DESIGN.md and design-system lint.
- Relationship to Storybook.
- Relationship to shadcn/Flowbite/Aceternity/Tailwind.

CURRENT_CANONICAL_PLAN.md must include:

- Canonical thesis.
- Canonical MVP:
  - Phase 0: repo and design-system audit
  - Phase 1: Storybook installation/configuration plan
  - Phase 2: design tokens/icon system/foundational primitives
  - Phase 3: form, overlay, navigation, data-display, layout components
  - Phase 4: ArchEstimator domain components and stories
  - Phase 5: selective microinteractions and motion wrappers
  - Phase 6: governance docs and future migration readiness
- Explicit non-goal: production app migration.
- Superseded statements from the old plan.
- Gating decisions:
  - Storybook package approval
  - @storybook/nextjs-vite vs @storybook/nextjs
  - Flowbite paid-source handling
  - Motion/Framer dependency decision
  - Radix/shadcn dependency decision
  - visual/a11y QA gate
  - Philip Storybook review gate
- Readiness table by scope.
- “Do not quote a single readiness score without scope.”

01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md must include:

- Functional requirements.
- Non-functional requirements.
- UI/UX requirements.
- Accessibility requirements.
- Performance requirements.
- Security/privacy requirements.
- Storybook requirements.
- Component governance requirements.
- External source adoption requirements.
- Explicit non-goals.
- Assumptions.
- Pass/fail acceptance criteria.
- Requirement priority: MUST / SHOULD / COULD / OUT_OF_SCOPE.

At minimum, include these MUST requirements:

- Future implementation installs and configures Storybook.
- Future implementation creates Storybook stories for all P0 and P1 components in the inventory.
- Components follow DESIGN.md.
- Stories use local fixtures/mocks and never live Supabase/provider data.
- Components expose typed, stable APIs.
- New app/workshop UI should use library components after the library is approved.
- Current app migration is not part of the MVP.
- Existing source components are audited before new components are created.
- Every component has state coverage: default, hover/focus where representable, active/selected, disabled, loading, error, empty, success, destructive, compact/dense, responsive if relevant.
- Every interactive component has keyboard and accessibility expectations.
- Every component story is inspectable in Storybook.

02_CODEBASE_RESEARCH.md must include:

- Commands run.
- Files/folders inspected.
- Existing plan docs inspected.
- Existing UI primitives found.
- Existing workshop/share/domain components found.
- Existing validation scripts.
- Existing design-system linter behavior.
- Existing package/dependency state.
- Existing tests and gaps.
- Storybook absence/presence verification.
- Existing component naming/import patterns.
- Existing icon usage patterns.
- Existing Tailwind/global CSS architecture.
- Existing route/app shell constraints.
- GitNexus/code-review graph evidence or fallback note.
- Gaps/unknowns.
- Evidence links as local file paths.

03_ARCHITECTURE_AND_DESIGN_PLAN.md must include:

- Proposed UI library architecture.
- Proposed folder architecture.
- Source-of-truth rules.
- Component layering:
  1. design tokens
  2. low-level primitives
  3. composed controls
  4. layout/shell primitives
  5. data-display primitives
  6. domain components
  7. motion/microinteraction wrappers
  8. Storybook docs/stories
- Recommended future file locations.
- Import boundaries.
- Public API/export strategy.
- Avoid circular dependencies.
- Avoid domain logic inside primitives.
- Avoid Storybook stories importing server-only code.
- Accessibility contract.
- Token contract.
- External-source adoption contract.
- Alternatives rejected.
- Anti-overengineering guardrails.

04_IMPLEMENTATION_SEQUENCE.md must include:

- Step-by-step future implementation order.
- Files likely involved per step.
- Expected changes per step.
- Validation after each step.
- Rollback point after each major step.
- Dependency between steps.
- What not to touch.
- When to update .ai during implementation.
- When tests/stories must be added.
- Clear phase boundary: stop after Storybook library; do not migrate app screens.

05_BLAST_RADIUS_AND_RISK_ANALYSIS.md must include:

- Affected user flows.
- Affected modules.
- Affected tests.
- Affected build/runtime behavior.
- Storybook/package risk.
- Tailwind/global CSS risk.
- Design-system linter risk.
- Bundle/dependency risk.
- Icon/motion risk.
- Flowbite paid-content/privacy risk.
- Aceternity Motion dependency risk.
- shadcn/Radix dependency risk.
- Storybook app-directory/Next.js risk.
- Visual drift risk.
- Accessibility regression risk.
- Merge conflict risk.
- Agent misuse risk.
- Severity/likelihood/mitigation/rollback table.
- GitNexus/code-review graph impact requirements for future implementation.

06_TESTING_AND_VERIFICATION_PLAN.md must include:

- Existing relevant commands from package.json.
- Required future commands:
  - bun run validate
  - bun run build
  - git diff --check
  - bun run lint:design-system
  - bun run test
  - bun run test:dom
  - bun run storybook or equivalent after Storybook script exists
  - bun run build-storybook or equivalent after Storybook script exists
- Storybook-specific verification:
  - starts locally
  - builds static Storybook
  - stories load without live provider calls
  - no broken imports
  - no server-only modules imported into stories
  - controls/docs render
  - a11y checks if addon is installed
- Component tests required.
- Interaction tests/play functions where useful.
- Visual QA checklist.
- Manual QA.
- Pass/fail definitions.
- Strongest alternative verification if Storybook test tooling is not added.
- E2E not required for Storybook-only MVP unless production app routes are touched, which they must not be in the MVP.

07_UI_UX_AND_ACCESSIBILITY_PLAN.md must include:

- User journey for Philip inspecting Storybook.
- Storybook IA/navigation structure.
- Component categories.
- Empty/loading/error/success states.
- Responsive behavior.
- Keyboard/focus behavior.
- Screen reader expectations.
- Reduced motion expectations.
- Copy/content requirements.
- Design-system alignment.
- Shared primitive reuse.
- App/workshop density rules.
- Landing/marketing vs app/workshop component boundary.
- Accessibility checklist for every interactive component.

Must include ArchEstimator-specific UI constraints:

- Non-landing app/workshop UI must follow DESIGN.md.
- SF Pro stack for app/workshop surfaces.
- Regular/medium weights only for app/workshop.
- 12px maximum visible app/workshop text unless explicitly approved.
- Normal controls/body/table/input/button text around 10px.
- Labels/meta/helper text around 8–9px.
- Zero letter spacing.
- xs/3px radius only.
- Phosphor regular outline icon style for app/workshop.
- Reuse src/components/ui and src/components/workshop primitives before creating local controls.
- Design-system lint failures are blocking.
- Landing/marketing can have more experimental Aceternity-style motion, but app/workshop stays crisp, neutral, dense, and restrained.

08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md must include:

- Auth/authorization concerns.
- Supabase/RLS concerns if relevant.
- Storybook data isolation.
- No live provider data in stories.
- No secrets/environment variables in stories.
- Mock/fixture strategy.
- Input validation implications.
- Data privacy.
- Performance implications.
- Bundle/dependency implications.
- Caching implications.
- Rate limits/concurrency if any.
- Failure modes.
- If Supabase is not relevant to Storybook-only MVP, mark N/A with evidence.
- Never touch SlateCamp resources.
- Only ArchEstimator Supabase project ebxxqidacheyapmmzavr may be referenced if Supabase is relevant.
- Do not commit secrets.
- Do not claim linked Supabase/hosted/provider state from local-only evidence.

09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md must include:

- Storybook is local/dev/documentation artifact unless Philip later approves publishing.
- No production app deployment required for Storybook-only MVP.
- No production migration.
- No Supabase migration.
- No app migration.
- Storybook static build output handling.
- .gitignore considerations for storybook-static if generated.
- Rollback process for future Storybook dependency/config changes.
- Post-implementation checks.
- Future publishing/deployment options only as deferred decisions:
  - local-only
  - static artifact
  - internal preview
  - Chromatic or visual service only if approved
- If provider deployment is not applicable, mark N/A with evidence.

10_IMPLEMENTATION_PROMPT_DRAFT.md must include:

- Future direct implementation prompt draft for the entire UI library + Storybook MVP.
- It must reference this plan folder.
- It must tell the implementation agent to verify current repo reality before editing.
- It must tell the implementation agent to install/configure Storybook only after package plan confirmation.
- It must tell the implementation agent to build components and stories only; no app migration.
- It must tell the implementation agent to add/update tests where necessary.
- It must tell the implementation agent to update .ai docs.
- It must tell the implementation agent to create bug plans in .ai/15_Bugs if issues are discovered.
- It must tell the implementation agent not to archive this plan until Philip approves the Storybook result or implementation is complete.
- It must tell the implementation agent to commit/push.
- It must explain branch/merge policy:
  - default repo decision says feature branches/PRs and no automatic main merge
  - only merge to main automatically if Philip’s implementation prompt explicitly authorizes it

11_READINESS_SCORECARD.md must include:

- Score per document.
- Overall plan readiness score.
- Evidence for each score.
- Missing items.
- Improvement log.
- Final pass/fail decision.
- Honest blockers if score cannot reach 98%.
- Separate readiness scores for:
  - docs package readiness
  - Storybook setup readiness
  - primitive component readiness
  - full component matrix readiness
  - ArchEstimator domain component readiness
  - migration readiness
- Migration readiness must remain intentionally low/deferred because migration is out of scope.

12_OPEN_QUESTIONS_AND_DECISIONS.md must include:

- Open questions.
- Decisions made.
- Assumptions.
- Evidence behind decisions.
- Items requiring Philip.
- Items implementation agent may decide.
- No hidden ambiguity.

At minimum, include these Philip decisions:

- Approve Storybook package installation.
- Approve @storybook/nextjs-vite vs @storybook/nextjs if compatibility is ambiguous.
- Approve any Motion/Framer dependency if Aceternity patterns require it.
- Approve any new Radix packages beyond currently installed packages.
- Approve whether Flowbite Pro paid content can be used by implementation agents and under what license/access constraints.
- Approve whether Storybook should ever be published or remain local-only.
- Approve future production app migration after inspecting Storybook.

13_TRACEABILITY_MATRIX.md must connect:

- Requirement.
- Acceptance criterion.
- Component category.
- Files/modules likely affected.
- Implementation step.
- Storybook story requirement.
- Test/verification method.
- Risk/rollback note.
- Status.

14_UI_LIBRARY_MASTER_PLAN.md must include:

- Library vision.
- Design principles.
- Component taxonomy.
- Layering model.
- Naming conventions.
- Folder/export conventions.
- Variants/states policy.
- Component API principles.
- Storybook IA.
- Documentation rules.
- Future agent usage rules.
- What belongs in the UI library vs route/domain modules.
- How old tree componentization docs fit into the new plan.
- Definition of done.

15_COMPONENT_INVENTORY_MATRIX.md is critical. It must be extremely comprehensive.

Create a matrix with columns:

- Category
- Component / Pattern
- Priority: P0 / P1 / P2 / P3 / DEFERRED / LANDING_ONLY
- Current repo status: EXISTING / PARTIAL / BUILD / ADAPT / DEFER / UNKNOWN
- Likely source inspiration: ArchEstimator existing / shadcn / Flowbite / Aceternity / Tailwind / Phosphor / custom
- Planned local component/API name
- Primary variants
- Required states
- Required Storybook stories
- Accessibility/keyboard requirements
- Notes / ArchEstimator use cases
- Migration status: NOT_IN_MVP / FUTURE_ONLY / STORYBOOK_ONLY

The matrix must include at least the following inventory.

A. Design tokens and foundations

- Color tokens
- Semantic color tokens
- Typography tokens
- Font stack story
- Font weight rules
- Radius tokens
- Spacing tokens
- Sizing tokens
- Shadow/elevation tokens
- Border/hairline tokens
- Z-index layers
- Focus ring tokens
- Motion duration/easing tokens
- Reduced-motion policy
- Density tokens
- Responsive breakpoint tokens
- Surface/background tokens
- Data visualization tokens
- Status tokens: neutral/success/warning/danger/info
- Skeleton/loading tokens
- Scrollbar/scroll area styling
- Storybook design token gallery
- Tailwind utility examples
- DESIGN.md compliance examples
- Do/don’t examples

B. Icon system

- AppIcon wrapper
- Icon gallery
- Semantic icon map
- Icon button icon sizing
- Inline icon
- Status icon
- Empty state icon
- Menu item icon
- Tree row icon
- Table/action icon
- File/image/media icon
- Alert icon
- Loading/spinner icon
- External link icon
- Chevron/caret/disclosure icons
- Sort/filter/group icons
- Add/create/edit/delete/archive icons
- Share/export/download/upload icons
- Comment/notification/activity icons
- Project/estimate/component/library/template icons
- Phosphor regular outline enforcement
- Icon-only accessibility labels
- Icon size scale: 8, 10, 12, 14, 16, 18, 20, 24
- Landing-only experimental icon treatments if needed

C. Typography and text primitives

- Text
- Heading
- AppTitle
- AppSubtitle
- BodyText
- MutedText
- LabelText
- HelperText
- ErrorText
- NumericText
- CurrencyText
- Kbd
- CodeInline
- CodeBlock
- TruncatedText
- CopyableText
- LinkText
- ExternalLink
- EmptyStateCopy
- SectionHeader
- PanelTitle
- TableHeaderText
- BadgeText
- TooltipText
- Storybook typography scale
- App/workshop 8–12px enforcement
- Landing/proposal exceptions

D. Buttons and actions

- Button
- IconButton
- ToolbarIconButton
- SplitButton
- ButtonGroup
- ToggleButton
- ToggleGroup
- SegmentedControl
- LinkButton
- DestructiveButton
- GhostButton
- PrimaryButton
- SecondaryButton
- QuietButton
- OverlayButton
- ScrimButton
- StatefulButton
- LoadingButton
- AsyncActionButton
- CopyButton
- FavoriteButton
- ExpandCollapseButton
- AddButton
- SaveButton
- CancelButton
- DeleteButton
- ImportButton
- ExportButton
- ShareButton
- FilterButton
- SortButton
- GroupButton
- MoreActionsButton
- Aceternity-inspired HoverBorderButton
- Aceternity-inspired MovingBorderButton
- Aceternity-inspired MagneticButton, landing-only unless approved
- Flowbite-style button groups
- Required states: default, hover, focus-visible, active, disabled, loading, success, destructive, selected, pressed, icon-only
- Stories for size, variant, tone, loading, destructive, toolbar, responsive

E. Badges, pills, tags, indicators

- Badge
- Pill
- StatusBadge
- DenseStatusBadge
- CountBadge
- NotificationBadge
- BetaBadge
- RoleBadge
- PermissionBadge
- Price/CostBadge
- CategoryTag
- FilterChip
- RemovableChip
- SelectionPill
- KeyboardShortcutPill
- DotIndicator
- OnlinePresenceIndicator
- ErrorIndicator
- WarningIndicator
- SuccessIndicator
- LoadingIndicator
- ProgressIndicator
- Flowbite-style badge variants
- Stories for all tones/sizes/removable/interactive

F. Form field primitives

- Field
- ControlField
- Label
- RequiredIndicator
- HelperText
- ErrorMessage
- FieldDescription
- Fieldset
- Legend
- Input
- ControlInput
- Textarea
- ControlTextarea
- NumberInput
- CurrencyInput
- QuantityInput
- PercentageInput
- UnitInput
- MeasurementInput
- SearchInput
- PasswordInput
- EmailInput
- PhoneInput
- URLInput
- FileInput
- DragDropFileUpload
- ImageUpload
- ColorInput
- DateInput
- TimeInput
- DatePicker
- Calendar
- DateRangePicker
- TimePicker
- Select
- NativeSelect
- ControlSelect
- Combobox
- SearchableSelect
- MultiSelect
- CreatableSelect
- Checkbox
- CheckboxGroup
- RadioGroup
- Switch
- Toggle
- Slider
- Range
- InputGroup
- InputAddon
- InputPrefix/Suffix
- FloatingLabel, likely Flowbite-inspired but app-use only if DESIGN.md compliant
- InputOTP, low priority unless needed
- FormSection
- ModalFormSection
- TwoColumnControlRow
- InlineEditableField
- EditableTextCell
- EditableMoneyCell
- EditableNumberCell
- ValidationSummary
- Stories for default, placeholder, filled, disabled, readonly, invalid, helper, required, compact, dense, with icons, with prefix/suffix, loading

G. Menus and command surfaces

- DropdownMenu
- ContextMenu / right-click menu
- ActionMenu
- ContextActionMenuContent
- MenuItem
- MenuCheckboxItem
- MenuRadioItem
- MenuLabel
- MenuSeparator
- MenuShortcut
- SubMenu
- Menubar
- CommandPalette
- CommandMenu
- QuickActionMenu
- SearchCommandMenu
- MoreActionsMenu
- BulkActionMenu
- RowActionMenu
- SortMenu
- FilterMenu
- ViewOptionsMenu
- ExportMenu
- ShareMenu
- UserAccountMenu
- NotificationMenu
- KebabMenu
- RightClickTreeMenu
- RightClickTableRowMenu
- Required keyboard: arrow keys, Enter, Space, Escape, typeahead if supported, focus return
- Stories for simple, grouped, disabled item, destructive item, submenus, checkbox/radio, shortcut, right-click trigger

H. Overlays, dialogs, popovers

- Modal/Dialog
- AlertDialog
- ConfirmDialog
- DeleteConfirmDialog
- UnsavedChangesDialog
- Drawer
- Sheet
- SidePanel
- Popover
- HoverCard
- Tooltip
- ToolbarTooltip
- AnimatedTooltip
- LinkPreview
- Toast
- Sonner/ToastProvider if adopted
- Banner
- StickyBanner
- Callout
- Alert
- InlineAlert
- Snackbar
- ReleaseAnnouncementModal
- NotificationCenterPopover
- CommandDialog
- HelpPopover
- InfoPopover
- DatePickerPopover
- Aceternity AnimatedModal pattern, adapted only if dependency/performance approved
- Stories for open/closed, sizes, scroll body, long content, destructive, form modal, stacked/blocked state, focus trap, escape close, reduced motion

I. Navigation and app shell

- AppShell
- WorkshopShell
- PageShell
- WorkspaceShell
- Sidebar
- AppSidebar
- CollapsibleSidebar
- ResizableSidebar
- SidebarSection
- SidebarItem
- SidebarGroup
- SidebarFooter
- Topbar
- Header
- HeaderActionCluster
- HeaderIconToolbar
- Breadcrumb
- BreadcrumbItem
- Tabs
- AnimatedTabs
- TabList
- TabPanel
- NavigationMenu
- Navbar
- MegaMenu, likely landing/marketing only
- BottomNavigation, low priority
- FloatingDock, landing/marketing only unless approved
- FloatingNavbar, landing/marketing only
- Pagination
- Stepper
- WizardSteps
- BackButton
- RouteTitleBar
- EntitySwitcher
- WorkspaceSwitcher
- ProjectSwitcher
- ViewSwitcher
- Stories for expanded/collapsed, active, nested, disabled, mobile, overflow, keyboard nav

J. Cards, panels, surfaces

- Card
- CardHeader
- CardTitle
- CardDescription
- CardContent
- CardFooter
- ProductCard
- ProjectCard
- EstimateCard
- ComponentCard
- CatalogueCard
- PricingCard, landing/proposal only
- StatCard
- MetricCard
- SummaryCard
- EmptyCard
- ErrorCard
- LoadingCard
- SelectableCard
- InteractiveCard
- ExpandableCard
- HoverCard
- SpotlightCard
- FocusCard
- CardStack, landing/marketing only unless approved
- BentoCard
- BentoGrid
- Panel
- WorkspacePanel
- SidePanel
- InspectorPanel
- SettingsPanel
- DetailPanel
- Surface
- SurfaceMuted
- Section
- SectionHeader
- Aceternity-inspired CardHoverEffect
- Aceternity-inspired CardSpotlight
- Aceternity-inspired GlareCard, landing-only unless approved
- Aceternity-inspired WobbleCard, landing-only unless approved
- Stories for static, interactive, selected, disabled, loading, empty, dense, image/media, metrics, actions

K. Tables and data grids

- Table
- DataTable
- DenseDataTableShell
- TableHeader
- TableBody
- TableRow
- TableCell
- TableFooter
- TableToolbar
- TableColumnHeader
- SortableColumnHeader
- ResizableColumn
- StickyColumn
- EmptyTableState
- LoadingTableState
- ErrorTableState
- TablePagination
- TableFilters
- TableSearch
- TableSelectionCheckbox
- BulkActionToolbar
- InlineTableActionMenu
- EditableTextCell
- EditableMoneyCell
- EditableQuantityCell
- EditableUnitCell
- EditableFormulaCell
- NumericCell
- CurrencyCell
- StatusCell
- AvatarCell
- ActionCell
- RowExpander
- RowDetailsPanel
- ColumnVisibilityMenu
- TableColumnSizingVars
- EmptyFillerRows
- TanStack Table wrapper policy
- VirtualizedTable deferred unless measured/approved
- Stories for dense, sortable, selectable, editable, empty, loading, error, pagination, overflow, sticky header, action menu

L. Trees and hierarchy

Preserve and integrate existing tree plan here.

- Tree
- TreeSurfaceShell
- TreeRowLayout
- TreeNode
- TreeBranch
- TreeLeaf
- TreeExpander
- TreeCheckbox
- TreeDragHandle
- TreeIndentGuide
- TreeToolbar
- TreeSearch
- TreeFilter
- TreeEmptyState
- TreeLoadingState
- TreeContextMenu
- TreeBulkActionBar
- WorkshopTree
- EstimateSheetTree
- ShareTreeSurface
- ShareTreeNodeRow
- LibraryFolderTree
- ComponentLibraryTree
- ActivityScopeTree
- TemplateTree
- FolderTree
- ControlledTree adapter
- ReadOnlyTree adapter
- Tree selection hook
- Tree expansion hook
- Tree filtering utility
- Tree flattening utility
- Tree aria utility
- VirtualizedTree deferred until measured/approved
- React Complex Tree remains for editable trees unless a future owner-approved plan replaces it
- Stories for simple tree, nested tree, selected rows, expanded/collapsed, keyboard nav, read-only share tree, right-click menu, loading, empty, filtered, dense

M. Lists and item rows

- List
- ListGroup
- ListItem
- Item
- ItemHeader
- ItemContent
- ItemActions
- DescriptionList
- KeyValueList
- CommandList
- ActivityList
- NotificationList
- CommentList
- FileList
- ImageList
- SearchResultsList
- EmptyListState
- SelectableListItem
- DraggableListItem
- RowActionListItem
- Stories for dense, interactive, with icon, with avatar, with meta, selected, disabled, loading

N. Feedback, loading, empty, error

- Spinner
- Loader
- MultiStepLoader
- Skeleton
- SkeletonText
- SkeletonCard
- SkeletonTable
- Progress
- ProgressBar
- CircularProgress
- StepProgress
- Toast
- Alert
- Banner
- EmptyState
- ErrorState
- SuccessState
- LoadingState
- NoResultsState
- PermissionDeniedState
- OfflineState
- MaintenanceState
- InlineValidationState
- Aceternity loader patterns adapted carefully
- Aceternity text-generate effect for landing/empty states only if approved
- Stories for all statuses, long copy, with actions, compact, responsive

O. Layout primitives

- Container
- Stack
- Inline
- Cluster
- Grid
- ResponsiveGrid
- SplitPane
- Resizable
- ScrollArea
- AspectRatio
- Separator
- Divider
- Spacer
- StickyHeader
- StickyFooter
- Toolbar
- ActionBar
- SelectionActionBar
- CommandBar
- FilterBar
- SearchToolbar
- HeaderToolbar
- PanelLayout
- MasterDetailLayout
- ThreeColumnWorkshopLayout
- SidebarContentLayout
- FormGrid
- BentoGrid
- MasonryGrid, deferred
- Stories for spacing, overflow, resizing, mobile, dense app layout

P. Media and assets

- Avatar
- AvatarGroup
- Logo
- LogoMark
- Image
- Thumbnail
- Gallery
- ImageCard
- FilePreview
- AttachmentPreview
- PDFPreview placeholder
- Video placeholder
- DeviceMockup, landing/marketing only
- BeforeAfterCompare, optional for proposal/media review
- ImageUploadPreview
- EmptyImagePlaceholder
- Stories for fallback, loading, error, aspect ratio, avatar initials, gallery

Q. Charts and visualization

- ChartContainer
- ChartTooltip
- MiniBarChart
- MiniLineChart
- DonutChart
- ProgressRing
- Sparkline
- StatGrid
- MetricTrend
- CostBreakdownChart
- ProjectChartBucketTable integration
- Gauge, optional
- WorldMap/Globe, landing/marketing only unless approved
- D3 integration boundaries
- shadcn chart inspiration
- Stories using static fixture data only

R. Domain components for ArchEstimator

- ProjectCard
- ProjectListItem
- ProjectEstimatesTable
- EstimateCard
- EstimateSummaryPanel
- EstimateSheetHeader
- EstimateSheetBranch
- EstimateRowItemsTable
- EstimateRowItem
- EstimateRowEditor
- EstimateTotalSummary
- CostBreakdownPanel
- ComponentCatalogueCard
- CatalogueCardGrid
- ComponentCatalogueBranch
- LibraryTreePanel
- AddComponentModalSections
- ComponentVersionBadge
- TemplateCard
- TemplateListItem
- ShareEstimateTreePanel
- ShareEstimateTreeView
- ShareTreeSurface
- ShareReviewHeader
- ProposalPreviewCard
- ProposalSectionCard
- CommentThread
- CommentComposer
- DecisionBadge
- ApprovalStatusBadge
- NotificationBell
- NotificationCenter
- ReleaseAnnouncementModal
- UserPresencePill
- WorkspaceMemberAvatar
- InviteStatusBadge
- ImportEstimateDialog
- ExportProposalDialog
- ImageAttachmentCard
- FileAttachmentList
- AuditActivityItem
- RecentActivityTimeline
- Stories must use static fixture data and no live Supabase calls

S. Motion and microinteractions

Split app/workshop-safe vs landing/marketing-only.

App/workshop-safe:

- FadeIn
- ScaleIn
- CollapseExpand
- SlidePanel
- FocusRingMotion
- Pressable
- StatefulButton motion
- Tooltip motion
- Menu open/close motion
- Modal open/close motion
- Skeleton shimmer, if design-approved
- Row insertion/removal hint
- ReducedMotionProvider/helper
- Motion tokens

Landing/marketing-only unless approved:

- MagneticButton
- MovingBorder
- HoverBorderGradient
- BackgroundGradient
- Sparkles
- Spotlight
- AuroraBackground
- BackgroundBeams
- WavyBackground
- Vortex
- TextGenerateEffect
- TypewriterEffect
- FlipWords
- CardSpotlight
- 3DCardEffect
- ParallaxScroll
- HeroParallax
- FloatingDock
- FloatingNavbar
- TracingBeam
- Lens
- Compare
- Globe/WorldMap
- InfiniteMovingCards

Every microinteraction must include:

- dependency requirement
- performance risk
- reduced-motion fallback
- app/workshop vs landing/proposal scope
- Storybook story
- reason to exist
- rejection criteria

T. Page sections and blocks

These are mostly landing/marketing/future proposal, but should be inventoried:

- HeroSection
- FeatureSection
- CTASection
- TestimonialSection
- LogoCloud
- PricingSection
- FAQSection
- StatsSection
- ContactSection
- BlogCard/Grid
- Footer
- Navbar
- Auth/Login/SignupSection
- EmptyStateSection
- BentoFeatureSection
- ProposalCoverSection
- ProposalLineItemSection
- ProposalSummarySection
- Storybook-only unless current app needs them

U. Utility patterns and hooks

- cn/className merge policy
- cva/variant policy
- useControllableState
- useDisclosure
- useCopyToClipboard
- useMediaQuery
- useReducedMotion
- useFocusReturn
- useKeyboardShortcut
- useOutsideClick
- useRovingFocus, if needed
- useTreeExpansion
- useTreeSelection
- useCommandMenu
- useDebouncedValue
- useMeasureElement
- Format currency/number/date utilities
- Story fixtures/builders
- Mock providers for Storybook

V. Documentation and governance components

- ComponentDocTemplate
- Storybook docs page template
- Design token docs page
- Icon gallery docs page
- Component status badge
- Component checklist table
- Deprecation notice
- Source attribution note
- Agent usage rule note
- Migration readiness note

16_STORYBOOK_INSTALLATION_AND_CONFIGURATION_PLAN.md must include:

- Current package state verification.
- Recommended install command, but clearly mark as future implementation only.
- Package-manager note for Bun.
- Decision between @storybook/nextjs-vite and @storybook/nextjs.
- .storybook/main.ts plan.
- .storybook/preview.tsx plan.
- Tailwind/global CSS import plan.
- Next appDirectory parameter plan.
- Path alias support.
- Static assets/fonts plan.
- Mock providers/decorators:
  - QueryClient provider if needed
  - mock router/navigation
  - mock auth/session
  - mock Zustand stores where needed
  - no live Supabase
- Story file location policy:
  - colocated stories vs src/stories
  - recommended naming
  - docs/autodocs tagging
- Storybook IA/category naming:
  - Foundations
  - Icons
  - Primitives
  - Forms
  - Menus
  - Overlays
  - Navigation
  - Data Display
  - Layout
  - Feedback
  - Domain / Workshop
  - Domain / Share
  - Motion
  - Blocks / Landing
- Scripts plan:
  - storybook
  - build-storybook
  - optional test-storybook only if chosen
- Validation plan.
- Rollback plan.
- Do not publish Storybook unless Philip approves.

17_STORYBOOK_STORY_COVERAGE_MATRIX.md must include:

- Story coverage matrix for every P0/P1/P2 component.
- Required stories per component:
  - Default
  - Variants
  - Sizes
  - Tones
  - Disabled
  - Loading
  - Error
  - Empty
  - Success
  - Selected/active
  - With icon
  - With actions
  - Dense/compact
  - Long content/truncation
  - Responsive/mobile
  - Keyboard/focus
  - Reduced motion if animated
- Fixture requirements.
- Controls/args requirements.
- Play function candidates.
- Docs page requirements.
- A11y notes.
- Coverage status: NOT_STARTED because this is planning only.

18_DESIGN_TOKEN_AND_THEMING_PLAN.md must include:

- DESIGN.md extraction.
- Token model.
- Tailwind v4 variable strategy.
- Storybook token gallery.
- Light/dark posture.
- App/workshop neutral theme.
- Landing experimental theme boundary.
- Color semantic mapping.
- Typography scale mapping.
- Radius mapping.
- Spacing mapping.
- Shadow/elevation mapping.
- Motion token mapping.
- Focus token mapping.
- Lint alignment.
- Forbidden patterns.

19_ICON_SYSTEM_AND_ASSET_PLAN.md must include:

- Phosphor regular outline standard.
- Existing icon import audit.
- Semantic icon map.
- AppIcon wrapper plan.
- Icon story gallery.
- Icon sizes.
- Icon accessibility.
- Icon-only button rules.
- Flowbite icons decision, likely defer or do not adopt unless approved because app icon style is Phosphor regular.
- Asset folder rules.
- No font files shared or committed beyond existing allowed repo assets.
- No paid asset leakage.

20_COMPONENT_API_AND_COMPOSITION_CONTRACTS.md must include:

- Component naming.
- Prop naming.
- Variant prop strategy.
- Size prop strategy.
- Tone prop strategy.
- Polymorphic/asChild policy.
- Ref forwarding policy.
- Controlled/uncontrolled policy.
- Event handler naming.
- Data attributes.
- Accessibility props.
- Slot/subcomponent composition.
- Barrel exports.
- Server/client component boundaries.
- Storybook fixture contracts.
- Domain component contracts.
- Deprecation policy.
- Codemod/migration future note.

21_EXTERNAL_SOURCE_ADOPTION_PLAN_SHADCN_FLOWBITE_ACETERNITY.md must include:

- Source comparison.
- Use shadcn for primitives and accessible APIs.
- Use Flowbite for breadth and dashboard/forms/table/sidebar examples.
- Use Aceternity for microinteractions and marketing/landing motion.
- Tailwind adaptation rules.
- Licensing/access notes.
- MCP usage plan.
- Computer-use plan for Flowbite paid access if available.
- What can be copied/adapted.
- What must be rewritten.
- What must be deferred.
- Dependency gates.
- Accessibility gates.
- Performance gates.
- Design-system adaptation rules.
- No secrets, no paid-content leakage.

22_ACCESSIBILITY_AND_KEYBOARD_MATRIX.md must include:

- Component-by-component accessibility requirements.
- Keyboard matrix for:
  - Button
  - Menu
  - Context menu
  - Dropdown
  - Dialog
  - Drawer
  - Popover
  - Tooltip
  - Combobox
  - Select
  - Checkbox/radio/switch
  - Tabs
  - Accordion/collapsible
  - Table
  - Tree
  - Command palette
  - Date picker
  - File upload
- ARIA expectations.
- Focus trap/return expectations.
- Screen reader labels.
- Error announcement.
- Reduced motion.
- Color contrast.
- Pointer target policy for compact UI.
- Testing and Storybook play function opportunities.

23_VISUAL_QA_AND_REVIEW_WORKFLOW.md must include:

- How Philip reviews Storybook.
- Review order.
- Screenshot/manual review plan.
- Responsive viewport list.
- App/workshop density checklist.
- Motion/reduced-motion checklist.
- Visual drift checklist.
- Design-system lint gate.
- Optional Chromatic/visual service only if approved.
- QA signoff template.
- Storybook review acceptance form.
- No production migration until signoff.

24_NO_MIGRATION_STORYBOOK_ONLY_MVP_SCOPE.md must include:

- Explicit boundary.
- Why app migration is deferred.
- What future implementation may touch.
- What future implementation must not touch.
- How to prevent accidental app adoption.
- Storybook-only success definition.
- Philip approval gate.
- Future migration prerequisites.

25_FUTURE_APP_MIGRATION_ROADMAP_DEFERRED.md must include:

- Deferred migration strategy.
- Inventory current surfaces to migrate later.
- Migration priority after Storybook approval:
  - low-risk isolated primitives first
  - overlays/forms next
  - tables/navigation after tests
  - tree/estimate surfaces last due blast radius
- Codemod/finder strategy.
- App-screen rollout strategy.
- Regression testing.
- Owner approval gates.
- This doc must clearly say it is NOT part of the MVP.

26_IMPLEMENTATION_PROMPT_STORYBOOK_AND_LIBRARY_ONLY.md must include a future copy-paste implementation prompt that implements only:

- Storybook setup.
- UI component library foundations.
- Stories for P0/P1 components.
- Static fixtures/mocks.
- Tests where required.
- Documentation updates.
- No app migration.

27_COMPONENT_ACCEPTANCE_CHECKLIST.md must include:

Per-component checklist:

- Has typed props.
- Has stable import path.
- Has variants documented.
- Has state stories.
- Has accessibility notes.
- Has keyboard notes if interactive.
- Has responsive story if layout affected.
- Has loading/error/empty/success where applicable.
- Uses DESIGN.md tokens.
- Passes design-system lint.
- Does not import server-only code.
- Does not call live network/provider.
- Has reduced-motion fallback if animated.
- Has test/play function if behavior-heavy.
- Has source attribution/inspiration notes if adapted externally.
- Is marked P0/P1/P2/P3/deferred.
- Is not migrated into production app unless future phase approves.

28_MCP_AND_COMPUTER_USE_SOURCE_RESEARCH_GUIDE.md must include:

- How future agents should use shadcn MCP.
- How future agents should use Flowbite MCP if available.
- How future agents should use computer-use/browser access for Flowbite paid library if Philip provides access.
- How future agents should browse Aceternity.
- What not to record.
- What to summarize.
- How to avoid credentials/secrets.
- How to adapt external components to DESIGN.md.
- How to cite or record source URLs in docs.
- What to do if MCP/computer use is unavailable.

29_COMPONENT_DEPENDENCY_AND_PACKAGE_PLAN.md must include:

- Current dependency audit.
- Required future package candidates.
- Storybook package candidates.
- shadcn/Radix package candidates.
- Existing Radix context menu status.
- cva/clsx/tailwind-merge status.
- Motion/Framer candidate decision gate.
- Flowbite package decision gate.
- Aceternity dependency implications.
- Bundle/performance risks.
- Package addition approval process.
- Rollback strategy.
- No package changes in current docs pass.

30_AGENT_UI_USAGE_RULES_DRAFT.md must include:

- Draft future rule for codebase AI agents:
  - Always prefer ArchEstimator UI library components.
  - Do not create one-off buttons/inputs/cards/menus if a library component exists.
  - Do not bypass DESIGN.md.
  - Do not add arbitrary text sizes/radii/icon styles.
  - Use Phosphor regular icons for app/workshop.
  - Add Storybook stories for new reusable components.
  - Update component inventory when components change.
  - Do not migrate app screens without plan approval.
- Suggested future locations for this rule:
  - .ai/00_system
  - AGENTS.md
  - component library README
- Mark as draft only; do not edit AGENTS.md in this docs pass unless Philip explicitly instructed.

31_DOC_REPAIR_LOG.md must include:

- What was wrong/incomplete about old plan scope.
- What was added.
- What was superseded.
- What remained from tree plan.
- What still needs owner decision.
- Docs edited.
- Readiness before/after.
- No source implementation statement.

COMPONENT MATRIX PRIORITY GUIDANCE:

Use this priority model:

P0:
- Foundations, tokens, icons, typography, Button/IconButton, Field/Input/Label/Textarea/Select/SearchInput, Badge/Pill, Tooltip, Modal/Dialog, DropdownMenu/ContextMenu, Card/Panel, Table basics, Tabs, Sidebar/AppShell basics, Empty/Loading/Error states, Storybook setup and docs shell.

P1:
- Advanced forms, Combobox, DatePicker, Checkbox/Radio/Switch, Toast/Banner/Alert, Drawer/Sheet/Popover/HoverCard, DataTable, Tree shell/read-only tree, Navigation/Breadcrumb/Pagination, Skeleton/Progress/Spinner, Project/Estimate/Component domain cards, NotificationBell/Center stories, Release modal stories.

P2:
- Editable table cells, advanced tree patterns, CommandPalette, Stepper, resizable panels, chart wrappers, file upload/media components, advanced domain composites, visual QA tooling, Storybook interaction tests.

P3:
- Marketing/landing blocks, advanced Aceternity effects, carousel, parallax, animated text, background effects, visual publishing workflow.

DEFERRED:
- Production app migration, virtualized trees/tables unless measured and approved, broad Motion dependency if not approved, Flowbite JS runtime import unless justified, Chromatic publishing unless approved, dark mode unless Philip approves, replacement of React Complex Tree.

DESIGN-SYSTEM CONSTRAINTS:

The refined plan must bake in these ArchEstimator constraints:

- Non-landing app/workshop UI follows DESIGN.md.
- Use SF Pro for product/workshop UI.
- Regular/medium weights only.
- App/workshop visible text max 12px unless explicitly approved.
- Normal controls/body/table/input/button text around 10px.
- Labels/meta/helper text around 8–9px.
- Zero letter spacing.
- Radius is xs/3px.
- Compact neutral product UI.
- Phosphor regular outline icons.
- No random Tailwind text sizes/radii/shadows outside token policy.
- Existing design-system lint failures block implementation.
- Landing/proposal/marketing can be separately marked as experimental and must not leak into workshop UI.

STORYBOOK REQUIREMENTS:

The future implementation plan must make Storybook the inspection surface.

The plan must specify:

- How to install Storybook.
- How to configure Storybook for Next.js app directory.
- How to import global Tailwind CSS.
- How to handle aliases.
- How to provide decorators.
- How to mock providers.
- How to prevent live Supabase/provider calls.
- How to organize stories.
- How to create docs pages.
- How to build Storybook.
- How to validate Storybook.
- How to review Storybook manually.
- How to decide when Storybook is complete enough for Philip review.

Future implementation must add stories before app migration.

Every component in the P0/P1 MVP must have Storybook coverage.

REPO-SPECIFIC VALIDATION BASELINE:

The docs must reference these current/repo-verified baseline commands when present:

- bun run validate
- bun run build
- git diff --check
- bun run lint:design-system
- bun run test
- bun run test:dom
- bun run test:e2e only when browser/auth/protected-route/user-flow changes require it
- Supabase commands only if schema changes, which this plan must avoid for Storybook-only MVP

Storybook future commands must be proposed, not assumed already present until package.json is verified after implementation:

- bun run storybook
- bun run build-storybook
- optional Storybook test runner/a11y command only if chosen by future package plan

BUG DISCOVERY PROTOCOL:

If you discover a bug, blocker, failing test, stale assumption, architecture issue, missing prerequisite, security concern, test gap, source/doc contradiction, or serious ambiguity, create a dated bug plan in:

/Users/philiplewis/archestimator/.ai/15_Bugs

Filename format:

YYYY-MM-DD-{bug-slug}.md

Bug plan must include:

- Title
- Classification
- Date discovered
- Discovery context
- Evidence
- Reproduction steps or command if applicable
- Expected behavior if applicable
- Actual behavior if applicable
- Suspected root cause
- Affected files/modules
- Impact
- Severity
- Relationship to current plan
- Proposed fix plan
- Verification plan
- Status
- Whether it blocks implementation
- Link/reference to the current plan folder

Examples of blockers that should create bug/blocker plans:

- Target plan folder missing.
- Storybook cannot be planned because package/dependency state is contradictory.
- DESIGN.md and design-system linter conflict.
- Existing UI primitive imports are broken.
- Existing docs claim implementation that is not present.
- Flowbite paid access/license unclear enough to block source adoption.
- Storybook official compatibility with Next.js 16/React 19 appears unclear.
- GitNexus/code-review graph unavailable when required and no fallback evidence is adequate.

.ai PROJECT MEMORY UPDATES:

Update relevant .ai memory files if they exist:

- /Users/philiplewis/archestimator/.ai/10_state/current-state.md
- /Users/philiplewis/archestimator/.ai/10_state/decisions.md
- /Users/philiplewis/archestimator/.ai/10_state/known-issues.md if relevant
- /Users/philiplewis/archestimator/.ai/01_roadmap/README.md if relevant
- /Users/philiplewis/archestimator/.ai/04_tasks if structure exists and relevant
- /Users/philiplewis/archestimator/.ai/05_logs if structure exists and relevant

Rules:

- Follow existing structure.
- Do not create conflicting source-of-truth docs.
- Do not mark the UI library or Storybook implemented.
- Record this as docs-only plan refinement.
- Record the target plan folder.
- Record the new canonical scope.
- Record that production app migration is deferred.
- Record bugs/blockers if any.
- Keep .ai durable for future agents.

READINESS LOOP:

Perform:

Audit → improve → score → find gaps → improve again → rescore.

Every required document must reach 98–100% planning readiness for the Storybook/UI-library MVP.

The overall plan package must reach 98–100% readiness for docs handoff.

Scoring must be honest.

100% is allowed only if:

- repo facts are verified
- no unsupported assumptions remain
- instructions are implementation-specific
- external source posture is clear
- Storybook plan is clear
- component matrix is comprehensive
- no current app migration ambiguity remains
- future implementation agent can execute without guessing

If a blocker prevents 98%, create a bug/blocker plan, update scorecard honestly, and report BLOCKED or NEEDS_HUMAN_DECISION instead of lying.

Scoring categories:

- Repository evidence accuracy.
- Requirement clarity.
- Component inventory completeness.
- Storybook implementation specificity.
- Test/verification readiness.
- Risk/blast-radius/rollback coverage.
- Security/performance/data coverage.
- UX/accessibility/design-system coverage.
- External source adoption clarity.
- Future implementation usability.
- .ai documentation hygiene.

FINAL GIT REQUIREMENTS:

Before staging:

- git status --short
- git diff --stat
- git diff --check
- git diff -- .ai

Then:

- Stage only intended .ai documentation changes.
- Do not stage production source code.
- Do not stage package files.
- Do not stage generated files.
- Commit with:

docs(ai): expand ui component library storybook plan

- Pull/reconcile remote changes safely if needed.
- Never force push.
- Push to origin.
- Capture final commit hash.

Planning/refinement agents must not merge to main automatically unless Philip explicitly asks.

FINAL REPORT REQUIREMENTS:

Return a final report with:

- Final status:
  - READY_FOR_IMPLEMENTATION
  - NEEDS_REFINEMENT
  - NEEDS_HUMAN_DECISION
  - BLOCKED
- Plan folder updated.
- Documents created.
- Documents updated.
- .ai cross-updates.
- Bugs/issues discovered.
- Bug plan files created.
- Readiness score per document.
- Overall readiness score.
- Commands run.
- Git branch.
- Commit hash.
- Push status.
- Blockers/open questions.
- Next recommended step.

QUALITY BAR:

This plan must be strong enough for a future frontier implementation agent such as Codex, Claude Code, OpenCode, OMX, or similar to implement the Storybook UI library without rethinking scope.

Do not produce generic design-system filler.

Every section must be tied to ArchEstimator’s repo reality, DESIGN.md constraints, current component structure, Storybook, and the three external source libraries.

The final plan must make it impossible for a future agent to misunderstand these boundaries:

- Build UI library and Storybook first.
- Show components in Storybook.
- Do not migrate production app yet.
- Existing tree work is preserved as a domain component sub-plan.
- External components are adapted into ArchEstimator’s design system, not pasted as alien UI.
- Storybook review by Philip is the gate before app-wide migration.