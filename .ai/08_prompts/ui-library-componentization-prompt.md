You are ChatGPT acting as a senior prompt architect, startup technical founder, principal engineer, product strategist, technical architect, Storybook architect, design-system lead, UI component library architect, accessibility reviewer, QA strategist, security/performance reviewer, codebase-AI workflow designer, documentation maintainer, and careful git/worktree operator.

You are operating inside the local ArchEstimator repository.

Repository:
- GitHub repo: pjel888/archestimator
- Local repo path: /Users/philiplewis/archestimator
- Target branch: docs/ui-component-plan-refinement-2026-06-06
- Target plan folder: /Users/philiplewis/archestimator/.ai/03_plans/2026-06-06-ui-component-optimization-componentization

FEATURE / CHANGE REQUEST:
Refine the existing Storybook-first ArchEstimator UI Component Library planning pack on branch `docs/ui-component-plan-refinement-2026-06-06` from the current strong-but-incomplete state into a true 100/100 implementation-ready planning pack for the Storybook-only UI library MVP.

The current branch already reframes the old tree/componentization folder into an ArchEstimator UI Component Library + Storybook plan. However, the plan is not yet final because the component inventory, story matrix, Storybook setup plan, per-component API contracts, accessibility contracts, external-source adoption crosswalk, and implementation prompts are still too compressed and grouped. Your job is to refine the existing docs in place until a future codebase AI agent can implement the Storybook UI component library without guessing.

This is PLAN REFINEMENT ONLY.

Do not implement Storybook.
Do not install Storybook.
Do not add dependencies.
Do not change package.json.
Do not change bun.lock.
Do not modify production source code.
Do not modify app behavior.
Do not modify migrations.
Do not modify generated files.
Do not modify runtime/build configuration.
Do not modify Supabase/Vercel/Resend/GitHub provider settings.
Do not touch secrets.
Do not migrate production app screens.
Do not create UI components.
Do not create Storybook stories.
Only create/update `.ai` planning and documentation files.

The final result must be a 100/100 docs/planning handoff for the Storybook-only UI library MVP, while keeping production app migration intentionally deferred and scored separately as low/deferred.

CRITICAL TARGET OUTCOME

The target folder must become strong enough that a future frontier implementation agent such as Codex, Claude Code, OpenCode, CommandCode, OMX, or a similar repo-aware agent can implement:

1. Storybook setup for ArchEstimator.
2. Storybook configuration for Next.js 16, React 19, Bun, TypeScript, Tailwind CSS v4, and the current app/global CSS system.
3. A local reusable ArchEstimator UI component library.
4. Exhaustive Storybook stories for P0/P1 components.
5. Static fixtures and story-only decorators.
6. Design token, typography, icon, form, menu, overlay, navigation, data-display, tree, domain, motion, block, and governance stories.
7. Accessibility, keyboard, visual QA, reduced-motion, and no-live-provider story policies.
8. Source-adapted usage of shadcn/ui, Flowbite, Aceternity UI, and Tailwind CSS.
9. No production app migration.
10. A future migration roadmap that starts only after Philip reviews and approves the implemented Storybook library.

The plan must be implementation-specific, not generic.
The plan must not be inflated by false scores.
If any unavoidable owner/package/license decision remains, it must be isolated as an implementation gate, not a planning gap.
The docs package itself should still reach 100/100 if all required decisions, gates, sequences, inventories, contracts, and verification steps are explicit.

BRANCH AND TARGET FOLDER REQUIREMENTS

Work on branch:

docs/ui-component-plan-refinement-2026-06-06

Target folder:

/Users/philiplewis/archestimator/.ai/03_plans/2026-06-06-ui-component-optimization-componentization

Do not create a new plan folder.
Do not archive the existing plan folder.
Do not delete the preserved old tree documents.
Preserve the old tree/componentization docs as the Domain Tree Components and Estimate/Share Tree Sub-plan.
Refine the canonical Storybook/UI-library layer and add any missing specialized docs inside the same target folder.

INITIAL REPO SAFETY CHECK

Run and record:

- pwd
- git rev-parse --show-toplevel
- git status --short --branch
- git branch --show-current
- git worktree list
- git remote -v
- git fetch --prune origin
- git log --oneline -5
- git diff --stat main...HEAD
- git diff --name-status main...HEAD

If not already on `docs/ui-component-plan-refinement-2026-06-06`, checkout that branch safely:

- git checkout docs/ui-component-plan-refinement-2026-06-06

If the branch does not exist locally, fetch it:

- git fetch origin docs/ui-component-plan-refinement-2026-06-06:docs/ui-component-plan-refinement-2026-06-06

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
- modify production source code
- modify package files
- modify dependencies
- modify generated files
- modify migrations
- modify runtime/build config
- modify app behavior

If unrelated dirty files exist, leave them alone and report them.

REQUIRED READING ORDER

Before editing docs, read:

1. AGENTS.md
2. CLAUDE.md if present
3. .ai/README.md
4. .ai/00_system/DOCS_SOURCE_OF_TRUTH.md if present
5. .ai/00_system/ai-folder-canonical-map.md if present
6. .ai/00_system/AGENT_OPERATING_PROTOCOL.md
7. .ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md if present
8. .ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md if present
9. .ai/00_system/VALIDATION_MATRIX.md if present
10. .ai/10_state/current-state.md
11. .ai/10_state/decisions.md
12. .ai/10_state/known-issues.md if present
13. .ai/01_roadmap/README.md
14. DESIGN.md
15. package.json
16. README.md
17. components.json if present
18. scripts/enforce-app-design-system.mjs
19. src/app/globals.css
20. Relevant specs inside .ai/06_specs
21. Relevant active/archived plans related to:
    - UI componentization
    - design system enforcement
    - Storybook
    - route-transition performance
    - component library manager
    - estimate sheet/tree
    - share page/client review
    - notification/release modal UI
    - app shell/workshop layout
    - visual regression
    - CI/CD and agentic development
22. The entire target plan folder:
    - README.md
    - CURRENT_CANONICAL_PLAN.md
    - 00_INDEX.md
    - 01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md
    - 02_CODEBASE_RESEARCH.md
    - 03_ARCHITECTURE_AND_DESIGN_PLAN.md
    - 04_IMPLEMENTATION_SEQUENCE.md
    - 05_BLAST_RADIUS_AND_RISK_ANALYSIS.md
    - 06_TESTING_AND_VERIFICATION_PLAN.md
    - 07_UI_UX_AND_ACCESSIBILITY_PLAN.md
    - 08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md
    - 09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md
    - 10_IMPLEMENTATION_PROMPT_DRAFT.md
    - 11_READINESS_SCORECARD.md
    - 12_OPEN_QUESTIONS_AND_DECISIONS.md
    - 13_TRACEABILITY_MATRIX.md
    - 14_UI_LIBRARY_MASTER_PLAN.md
    - 15_COMPONENT_INVENTORY_MATRIX.md
    - 16_STORYBOOK_INSTALLATION_AND_CONFIGURATION_PLAN.md
    - 17_STORYBOOK_STORY_COVERAGE_MATRIX.md
    - 18_DESIGN_TOKEN_AND_THEMING_PLAN.md
    - 19_ICON_SYSTEM_AND_ASSET_PLAN.md
    - 20_COMPONENT_API_AND_COMPOSITION_CONTRACTS.md
    - 21_EXTERNAL_SOURCE_ADOPTION_PLAN_SHADCN_FLOWBITE_ACETERNITY.md
    - 22_ACCESSIBILITY_AND_KEYBOARD_MATRIX.md
    - 23_VISUAL_QA_AND_REVIEW_WORKFLOW.md
    - 24_NO_MIGRATION_STORYBOOK_ONLY_MVP_SCOPE.md
    - 25_FUTURE_APP_MIGRATION_ROADMAP_DEFERRED.md
    - 26_IMPLEMENTATION_PROMPT_STORYBOOK_AND_LIBRARY_ONLY.md
    - 27_COMPONENT_ACCEPTANCE_CHECKLIST.md
    - 28_MCP_AND_COMPUTER_USE_SOURCE_RESEARCH_GUIDE.md
    - 29_COMPONENT_DEPENDENCY_AND_PACKAGE_PLAN.md
    - 30_AGENT_UI_USAGE_RULES_DRAFT.md
    - 31_DOC_REPAIR_LOG.md
    - Preserved old tree/domain sub-plan docs.

CODEBASE INTELLIGENCE REQUIREMENTS

Use GitNexus and/or code-review-graph tools first if available, per AGENTS.md.

Use them to inspect:

- architecture overview
- UI/component clusters
- shared primitive blast radius
- current component dependencies
- Button/SearchInput/Modal/ContextMenu/Toast/WorkshopTree impacts
- domain surfaces for project/estimate/library/share/notifications
- affected flows for Storybook/package/config/source docs if relevant
- tests related to existing primitives
- design-system linter impact
- current branch diff risk

If graph tools are unavailable, document that and fall back to:

- rg
- rg --files
- git grep
- find
- direct file reading
- git diff / git log

Do not hallucinate files, routes, packages, scripts, tests, APIs, components, database tables, provider state, or architecture.
Verify every repo fact from live files.

EXTERNAL SOURCE RESEARCH REQUIREMENTS

Research current official/public docs for:

1. Storybook
   - Next.js framework guidance
   - Next.js Vite framework package
   - App Router/app directory support
   - Storybook scripts
   - Storybook config files
   - Tailwind/global CSS setup
   - path aliases
   - static assets
   - docs/autodocs
   - controls/args
   - accessibility addon
   - interaction testing/play functions
   - build-storybook validation
   - package-manager/Bun compatibility if documented

2. shadcn/ui
   - component inventory
   - Tailwind v4 setup
   - registry/CLI
   - MCP
   - theming
   - forms
   - sidebar
   - chart
   - accessible API/composition patterns
   - Radix dependency implications
   - copy-in local component posture

3. Flowbite
   - component inventory
   - forms
   - tables
   - sidebars
   - navbars
   - modals/drawers/dropdowns/tooltips/popovers
   - dashboards
   - blocks/application UI
   - Flowbite MCP
   - Tailwind v4 compatibility
   - Flowbite Pro/premium content boundaries if visible publicly
   - JS runtime/plugin implications

4. Aceternity UI
   - component inventory
   - cards
   - buttons
   - loaders
   - backgrounds
   - text effects
   - overlays
   - navigation
   - grids/blocks
   - AI recommendations
   - Motion/Framer dependency implications
   - landing-only vs app/workshop suitability
   - reduced-motion/performance risks

5. Tailwind CSS v4
   - CSS variable theme strategy
   - @theme / @theme inline posture
   - content/source scanning
   - animations/utilities if relevant
   - compatibility with Storybook/global CSS

Record source URLs and date checked in the relevant docs.
Do not paste large copyrighted/premium content.
Do not store paid Flowbite source code, private screenshots, credentials, private URLs, dashboard state, or secrets.
Summarize source inventories and adaptation decisions.

CORE REFINEMENT GOAL

The existing branch is good but not final. Improve it specifically in these dimensions:

1. Expand `15_COMPONENT_INVENTORY_MATRIX.md` from grouped categories into a true component-by-component master matrix.
2. Expand `17_STORYBOOK_STORY_COVERAGE_MATRIX.md` from high-level story groups into a per-component story manifest.
3. Expand `16_STORYBOOK_INSTALLATION_AND_CONFIGURATION_PLAN.md` into an implementation-grade Storybook setup plan.
4. Expand `20_COMPONENT_API_AND_COMPOSITION_CONTRACTS.md` with per-component API contract families.
5. Expand `22_ACCESSIBILITY_AND_KEYBOARD_MATRIX.md` with complex component accessibility details.
6. Expand `21_EXTERNAL_SOURCE_ADOPTION_PLAN_SHADCN_FLOWBITE_ACETERNITY.md` into a source-adoption crosswalk.
7. Expand `29_COMPONENT_DEPENDENCY_AND_PACKAGE_PLAN.md` with exact package candidates, package gates, fallback paths, and rollback strategy.
8. Expand `26_IMPLEMENTATION_PROMPT_STORYBOOK_AND_LIBRARY_ONLY.md` into a fully actionable future implementation prompt.
9. Fix validation command inconsistencies, especially `typecheck` vs repo script `type-check`.
10. Update `11_READINESS_SCORECARD.md` so scores are honest and then improve docs until all documentation-readiness categories reach 100/100.
11. Keep production migration readiness intentionally low/deferred.
12. Keep Storybook package approval as an owner gate, but remove all avoidable planning ambiguity.
13. Add missing specialized docs if needed.
14. Update `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, roadmap/log/task docs if appropriate.
15. Do not over-edit root `AGENTS.md` or `CLAUDE.md`. If already changed only for generated index metadata, leave or document. Do not activate UI enforcement rules in root agent docs until Storybook exists and Philip approves.

REQUIRED DOCUMENT IMPROVEMENTS

You must update the following docs at minimum.

## 00_INDEX.md

Improve it so it includes:

- Final task goal.
- Explicit 100/100 refinement objective.
- Source-of-truth hierarchy.
- Document map.
- P0/P1/P2/P3/DEFERRED/LANDING_ONLY priority model.
- Start-here instructions.
- Implementation sequence.
- Required future commands.
- Docs-only verification commands.
- Risk summary.
- Package/owner gate summary.
- Bug/blocker references.
- Readiness table.
- Absolute no-migration boundary.
- Link to preserved tree sub-plan.
- Warning that app migration readiness is intentionally low.

## README.md

Improve it so it includes:

- Canonical name.
- Branch/refinement status.
- Implementation status.
- What changed from old plan.
- What changed from the previous 83/100 audit state.
- Reading order.
- Success criteria.
- Design-system authority.
- Storybook role.
- External source role.
- Component matrix role.
- Story matrix role.
- No-migration boundary.
- How future agents should use the plan.
- How Philip should review the future Storybook result.

## CURRENT_CANONICAL_PLAN.md

Improve it so it includes:

- Canonical thesis.
- Canonical MVP phases with deliverables and stop conditions.
- Superseded old statements.
- Gating decisions.
- Owner decisions.
- Implementation-agent decisions.
- Readiness table.
- Scope-specific score rules.
- RALPLAN-DR summary.
- ADR.
- Hard rule: no production app migration.
- Hard rule: Storybook first.
- Hard rule: static fixtures only.
- Hard rule: external sources are adaptation references, not visual authorities.
- Hard rule: `DESIGN.md` wins.
- Hard rule: no live Supabase/provider data in stories.

## 01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md

Add a much more detailed requirements matrix.

Include priorities:

- MUST
- SHOULD
- COULD
- OUT_OF_SCOPE

Each row should include:

- ID
- Requirement
- Rationale
- Acceptance criterion
- Verification method
- Related docs
- Status

Must cover:

- Storybook install/config.
- P0/P1 component stories.
- Static fixtures.
- Provider-free stories.
- Tailwind v4/global CSS loading.
- DESIGN.md compliance.
- Phosphor icon posture.
- shadcn/Flowbite/Aceternity/Tailwind source adaptation.
- Accessibility/keyboard documentation.
- Visual QA.
- Reduced motion.
- No production migration.
- Package gates.
- Owner Storybook review gate.
- Future migration plan only after approval.
- No secrets/premium leakage.
- No live Supabase/provider calls.
- Storybook build success.
- App build still passes.
- `bun run validate`.
- `bun run lint:design-system`.
- Component API stability.
- Component acceptance checklist.

## 02_CODEBASE_RESEARCH.md

Make it more evidence-rich.

Add:

- Branch diff summary.
- Current docs changed on branch.
- Existing primitives inventory with actual file paths.
- Existing domain surfaces with paths.
- Existing tests inventory with paths.
- Existing scripts inventory.
- Existing Storybook absence proof.
- Existing package absence proof.
- Existing design-system linter constraints.
- Existing Tailwind v4/global CSS architecture.
- Existing shadcn metadata from `components.json`.
- Existing icon import pattern.
- GitNexus/code-review-graph evidence.
- Gaps/unknowns.
- External source research evidence.
- Exact commands run.
- Clear note: no source/package changes in this refinement.

## 03_ARCHITECTURE_AND_DESIGN_PLAN.md

Make it implementation-grade.

Add:

- Proposed folder architecture.
- Story file location decision tree.
- `src/components/ui` layering.
- `src/components/workshop/ui` and `src/components/share/ui` domain lane.
- Storybook fixture folder strategy.
- Decorator architecture.
- Mock provider architecture.
- Source import boundaries.
- Barrel export strategy.
- Server/client component boundary.
- Tailwind token contract.
- Component API style.
- Domain component boundary.
- Motion boundary.
- Future migration boundary.
- Rejected alternatives.
- Anti-overengineering rules.
- How to avoid making Storybook fixtures production dependencies.

## 04_IMPLEMENTATION_SEQUENCE.md

Make it step-by-step enough to execute.

Break into phases:

0. Re-verify repo + owner package gates.
1. Storybook dependency decision and install.
2. `.storybook` config and global CSS.
3. Static fixture/decorator infrastructure.
4. Foundations stories.
5. Icons and asset stories.
6. Typography/text primitives.
7. P0 actions/forms/status/menu/overlay/feedback primitives.
8. P1 navigation/layout/data/table/tree primitives.
9. ArchEstimator domain stories.
10. Motion/microinteraction stories.
11. Governance docs/stories.
12. Philip review package.
13. Stop before app migration.

For each phase include:

- Likely files.
- Exact outputs.
- Validation.
- Rollback.
- Stop conditions.
- What not to touch.
- `.ai` update trigger.

## 05_BLAST_RADIUS_AND_RISK_ANALYSIS.md

Improve risk matrix with severity/likelihood/owner/mitigation/rollback.

Must include risks for:

- Storybook package incompatibility.
- Next.js 16 / React 19 compatibility.
- Bun install/lockfile drift.
- Tailwind v4 CSS not loading in Storybook.
- `src/app/globals.css` divergence.
- Storybook importing server-only modules.
- Storybook importing live Supabase/provider clients.
- App build accidentally including Storybook-only code.
- Shared primitive API changes.
- `Button` critical impact.
- `SearchInput` critical impact.
- `WorkshopTree` high impact.
- Editable estimate tree/sheet mutation risk.
- Flowbite paid-content/privacy leakage.
- Flowbite JS runtime bloat.
- Aceternity/Motion dependency risk.
- shadcn/Radix dependency expansion.
- components.json lucide vs app Phosphor rule.
- Visual drift from external defaults.
- Accessibility regressions.
- Missing story coverage.
- Missing tests for behavior-heavy components.
- Agent misuse.
- Unauthorized app migration.
- Merge conflicts.
- Multi-agent worktree risk.
- Storybook publishing/privacy risk.

## 06_TESTING_AND_VERIFICATION_PLAN.md

Fix all command names.

Use actual repo command:

- `bun run type-check`

Not:

- `bun run typecheck`

Include:

- Pre-edit evidence commands.
- Docs-only closeout commands.
- Future implementation commands:
  - bun install after package edits
  - bun run storybook
  - bun run build-storybook
  - bun run validate
  - bun run build
  - bun run lint:design-system
  - bun run test
  - bun run test:dom
  - targeted Vitest/DOM tests
  - git diff --check
- Storybook verification:
  - starts locally
  - static build succeeds
  - docs/controls render
  - CSS loads
  - no provider calls
  - no server-only imports
  - static fixtures only
  - P0/P1 story coverage complete
  - a11y checks if addon approved
  - keyboard walkthrough recorded
- Manual QA:
  - desktop/mobile viewport list
  - long labels/content
  - compact density
  - reduced motion
  - focus visibility
  - no generic external visual drift
- Stop conditions.

## 07_UI_UX_AND_ACCESSIBILITY_PLAN.md

Improve it with Storybook review flow and component-level UX.

Add:

- Philip review journey.
- Storybook IA.
- Required docs-page pattern.
- Required story layout pattern.
- State coverage per category.
- Empty/loading/error/success states.
- Responsive behavior.
- Long content/truncation behavior.
- Keyboard/focus behavior.
- Screen reader notes.
- Copy/content policy.
- App/workshop density policy.
- Landing-only boundary.
- Reduced-motion policy.
- Accessibility acceptance checklist.

Reinforce:

- SF Pro app/workshop.
- 12px max app/workshop visible text unless approved.
- 10px normal controls/body/table/input/button.
- 8–9px labels/meta/helper.
- Zero letter spacing.
- 3px/xs radius.
- Phosphor regular outline icons.
- Reuse existing primitives first.
- Design-system lint is blocking.

## 08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md

Expand with:

- Storybook data isolation.
- Fixture builders.
- Fake IDs and fake people/workspaces/projects/estimates.
- No share tokens.
- No provider env reads.
- No analytics.
- No Supabase client.
- No server actions.
- No auth refresh.
- No Vercel/Resend provider scripts.
- No paid Flowbite leakage.
- No private screenshots.
- No customer data.
- Performance rules for Storybook.
- Dev dependency isolation.
- App bundle leakage prevention.
- Large fixture performance.
- Motion performance.
- Cache/network policy.
- Failure modes.
- Storybook publishing risk as deferred.

## 09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md

Expand with:

- Storybook local-only default.
- Static `storybook-static` handling.
- `.gitignore` consideration.
- No public hosting.
- No Vercel provider setup.
- No production deployment.
- Rollback for Storybook package/config.
- Rollback for stories/components.
- Rollback for accidental production app import changes.
- Post-implementation checks.
- Future hosted Storybook as deferred option.
- Future app migration path as separate plan.
- Stop conditions.

## 10_IMPLEMENTATION_PROMPT_DRAFT.md

Make this a full direct implementation prompt, not a short sketch.

It must tell the future implementation agent to:

- Verify branch/worktree state.
- Read AGENTS.md and .ai source-of-truth chain.
- Read this whole plan pack.
- Re-check official docs.
- Ask/confirm package approval if not already recorded.
- Install/configure Storybook only after approval.
- Use current Storybook official guidance.
- Read Next.js local docs in `node_modules/next/dist/docs` before Next/Storybook config.
- Create static fixtures.
- Add Storybook decorators.
- Add token/icon/typography stories.
- Add all P0 stories.
- Add all P1 stories.
- Add domain stories.
- Add tests for behavior-heavy shared components.
- Run validation commands.
- Update `.ai`.
- Create bug plans if blockers are discovered.
- Commit/push.
- Do not merge to main unless Philip explicitly authorizes.
- Do not migrate production app routes.
- Do not publish Storybook.
- Stop at Storybook review.

## 11_READINESS_SCORECARD.md

This document must be honest and must reach 100/100 only if the docs truly contain all necessary instructions.

Create scores for:

- Repository evidence accuracy.
- Requirement clarity.
- Storybook setup specificity.
- Component inventory completeness.
- Story coverage specificity.
- Component API specificity.
- Accessibility/keyboard specificity.
- Design token/theming specificity.
- Icon system specificity.
- External source adoption specificity.
- Security/data isolation.
- Risk/rollback coverage.
- Testing/verification readiness.
- Visual QA readiness.
- Future implementation prompt usability.
- .ai documentation hygiene.
- Production migration readiness.

Important scoring rule:

- Production migration readiness must stay low/deferred by design.
- That low migration score must not reduce Storybook-only MVP readiness.
- Docs/package planning readiness can be 100/100 if all implementation gates and decisions are explicit.
- If package approval is still required, Storybook implementation status is `READY_AFTER_OWNER_PACKAGE_APPROVAL`, not `IMPLEMENTED`.
- Do not claim Storybook is installed.
- Do not claim UI library is implemented.
- Do not claim migration is ready.

Add:

- Before score from audit: 83/100.
- After score from this refinement.
- Evidence for every score.
- Remaining owner gates.
- Why each remaining gate is not a docs-readiness blocker.
- Final pass/fail decision.

## 12_OPEN_QUESTIONS_AND_DECISIONS.md

Expand:

Owner decisions:

- Approve Storybook package installation.
- Approve exact Storybook package path if compatibility is ambiguous.
- Approve Storybook addon set.
- Approve whether Flowbite Pro can be referenced.
- Approve whether Flowbite JS/runtime/plugin is forbidden or allowed.
- Approve Motion/Framer dependency or CSS-only motion.
- Approve new Radix packages beyond current context-menu dependency.
- Approve whether shadcn CLI/MCP may write generated components.
- Approve Storybook publishing/hosting later or local-only.
- Approve P0/P1 Storybook output before migration.
- Approve future app migration plan.

Implementation-agent decisions:

- Story file organization.
- Fixture folder structure.
- Decorator implementation.
- Exact package versions after current docs check.
- Whether to wrap existing primitives or create category folders first.
- Which P2 items can enter MVP if P0/P1 complete.
- Whether to add a11y addon/test runner in first Storybook install.
- Whether components are source-compatible enough to avoid new Radix packages.

Rejected decisions:

- App migration during Storybook MVP.
- External visual defaults without adaptation.
- Live provider data in stories.
- Storybook publishing by default.
- Broad Aceternity effects in workshop.
- Flowbite runtime by default.
- Treating old tree plan as the whole UI plan.

## 13_TRACEABILITY_MATRIX.md

Expand into a comprehensive traceability table.

Columns:

- Requirement ID
- Requirement
- Acceptance criterion
- Component category
- Plan doc(s)
- Likely files/modules
- Implementation phase
- Storybook story/stories
- Test/verification
- Risk/rollback
- Status

Must include rows for:

- Storybook install.
- Tailwind CSS load.
- Static fixtures.
- Provider-free stories.
- Foundations.
- Icons.
- Typography.
- Buttons/actions.
- Forms.
- Menus.
- Context/right-click menus.
- Overlays.
- Navigation.
- Sidebars/app shell.
- Cards/panels.
- Tables.
- Trees.
- Lists.
- Feedback states.
- Layout primitives.
- Media/assets.
- Charts.
- Domain project/estimate/library/share/notification components.
- Motion.
- External source adoption.
- Accessibility.
- Visual QA.
- No migration.
- Future migration deferred.

SPECIALIZED DOC REQUIREMENTS

The following specialized docs must be deepened substantially.

## 14_UI_LIBRARY_MASTER_PLAN.md

Expand into the canonical product UI library master plan.

Must include:

- Library vision.
- Design principles.
- Component taxonomy.
- Library layers.
- Folder/export model.
- Naming conventions.
- Variant/status naming.
- Storybook IA.
- Documentation requirements.
- Governance model.
- App/workshop vs landing/proposal boundary.
- Domain component boundary.
- Tree sub-plan relationship.
- External-source role.
- Implementation definition of done.
- Component definition of done.
- Story definition of done.
- Review definition of done.

## 15_COMPONENT_INVENTORY_MATRIX.md

This is the most important file. Rewrite/expand it into an exhaustive component-by-component matrix.

The matrix must have these columns:

- ID
- Category
- Component / Pattern
- Priority: P0 / P1 / P2 / P3 / DEFERRED / LANDING_ONLY
- Current repo status: EXISTING / PARTIAL / BUILD / ADAPT / DEFER / UNKNOWN
- Existing repo source/path if any
- Likely source inspiration: ArchEstimator existing / shadcn / Flowbite / Aceternity / Tailwind / Phosphor / Radix / TanStack / custom
- Planned local component/API name
- Primary variants
- Required states
- Required Storybook stories
- Accessibility/keyboard requirements
- Test requirement
- Notes / ArchEstimator use cases
- Migration status: STORYBOOK_ONLY / FUTURE_ONLY / NOT_IN_MVP / LANDING_ONLY / APP_MIGRATION_DEFERRED

Do not group many components into one row when they need separate API/story coverage.
Every reusable component or pattern should have its own row unless it is truly a subcomponent with no independent API.

At minimum include all of the following as individual rows where applicable:

A. Foundations and tokens

- ColorTokenGallery
- SemanticColorTokenGallery
- SurfaceTokenGallery
- TypographyTokenGallery
- FontStackDemo
- FontWeightDemo
- RadiusTokenGallery
- SpacingTokenGallery
- SizingTokenGallery
- ShadowElevationGallery
- BorderHairlineGallery
- ZIndexLayerGallery
- FocusRingGallery
- MotionTokenGallery
- ReducedMotionDemo
- DensityTokenGallery
- ResponsiveBreakpointDemo
- StatusTokenGallery
- SkeletonTokenGallery
- ScrollAreaTokenDemo
- DataVisualizationTokenGallery
- TailwindUtilityExamples
- DesignSystemDoDont
- AppWorkshopVsLandingBoundaryDemo

B. Icon system and assets

- AppIcon
- IconGallery
- SemanticIconMap
- IconButtonIcon
- InlineIcon
- StatusIcon
- EmptyStateIcon
- MenuItemIcon
- TreeRowIcon
- TableActionIcon
- FileIcon
- ImageIcon
- MediaIcon
- AlertIcon
- SpinnerIcon
- ExternalLinkIcon
- ChevronIcon
- DisclosureIcon
- SortIcon
- FilterIcon
- GroupIcon
- AddIcon
- EditIcon
- DeleteIcon
- ArchiveIcon
- ShareIcon
- ExportIcon
- ImportIcon
- UploadIcon
- DownloadIcon
- CommentIcon
- NotificationIcon
- ActivityIcon
- ProjectIcon
- EstimateIcon
- ComponentLibraryIcon
- TemplateIcon
- UserIcon
- WorkspaceIcon
- SettingsIcon
- IconSizeDemo
- DecorativeIconDemo
- AccessibleIconOnlyDemo
- AssetPlaceholder
- LogoMark
- LogoFull
- ImagePlaceholder
- DocumentPlaceholder

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
- SuccessText
- NumericText
- CurrencyText
- PercentText
- UnitText
- Kbd
- CodeInline
- CodeBlock
- TruncatedText
- ClampText
- CopyableText
- LinkText
- ExternalLink
- EmptyStateCopy
- SectionHeader
- PanelTitle
- TableHeaderText
- BadgeText
- TooltipText
- DescriptionText
- MetadataText
- TimestampText

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
- ArchiveButton
- ImportButton
- ExportButton
- UploadButton
- DownloadButton
- ShareButton
- FilterButton
- SortButton
- GroupButton
- MoreActionsButton
- OpenButton
- CloseButton
- RetryButton
- ConfirmButton
- ResetButton
- ClearButton
- ApplyButton
- ButtonWithShortcut
- LandingHoverButton
- LandingMovingBorderButton
- LandingMagneticButton

E. Badges, pills, tags, indicators

- Badge
- Pill
- StatusBadge
- StatusPill
- DenseStatusBadge
- CountBadge
- NotificationBadge
- BetaBadge
- RoleBadge
- PermissionBadge
- PriceBadge
- CostBadge
- CategoryTag
- SupplierTag
- BrandTag
- FilterChip
- RemovableChip
- SelectionPill
- KeyboardShortcutPill
- DotIndicator
- OnlinePresenceIndicator
- OfflineIndicator
- ErrorIndicator
- WarningIndicator
- SuccessIndicator
- InfoIndicator
- LoadingIndicator
- ProgressIndicator
- DirtyStateIndicator
- UnsavedIndicator

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
- SearchField
- PasswordInput
- EmailInput
- PhoneInput
- URLInput
- FileInput
- FileDropzone
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
- SearchableSelect
- Combobox
- CreatableCombobox
- MultiSelect
- Checkbox
- CheckboxGroup
- RadioGroup
- Switch
- Toggle
- Slider
- RangeSlider
- NumberStepper
- InputGroup
- InputAddon
- InputPrefix
- InputSuffix
- FloatingLabel
- InputOTP
- FormSection
- ModalFormSection
- TwoColumnControlRow
- InlineEditableField
- EditableTextCell
- EditableMoneyCell
- EditableNumberCell
- EditableQuantityCell
- EditableUnitCell
- EditablePercentCell
- ValidationSummary
- FormActions
- FieldGrid
- FormErrorBanner

G. Menus, dropdowns, right-click, command surfaces

- DropdownMenu
- ContextMenu
- RightClickMenu
- ActionMenu
- ContextActionMenuContent
- MenuItem
- MenuCheckboxItem
- MenuRadioItem
- MenuLabel
- MenuSeparator
- MenuShortcut
- MenuSub
- MenuSubTrigger
- MenuSubContent
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
- ImportMenu
- ShareMenu
- UserAccountMenu
- NotificationMenu
- KebabMenu
- RightClickTreeMenu
- RightClickTableRowMenu
- RightClickCardMenu
- CommandEmptyState
- CommandLoadingState
- CommandGroup
- CommandItem

H. Overlays, dialogs, popovers, feedback overlays

- Modal
- Dialog
- AlertDialog
- ConfirmDialog
- DeleteConfirmDialog
- UnsavedChangesDialog
- ReleaseAnnouncementDialog
- CommandDialog
- Drawer
- Sheet
- SidePanel
- InspectorPanel
- Popover
- HelpPopover
- InfoPopover
- DatePickerPopover
- FilterPopover
- HoverCard
- Tooltip
- ToolbarTooltip
- AnimatedTooltip
- LinkPreview
- Toast
- ToastViewport
- Snackbar
- Banner
- StickyBanner
- Callout
- Alert
- InlineAlert
- ValidationAlert
- NotificationCenterPopover
- LoadingOverlay
- RouteLoadingOverlay
- Scrim
- PortalLayer
- FocusTrapDemo

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
- TabList
- TabPanel
- AnimatedTabs
- NavigationMenu
- Navbar
- MegaMenu
- BottomNavigation
- FloatingDock
- FloatingNavbar
- Pagination
- PaginationControls
- Stepper
- WizardSteps
- BackButton
- RouteTitleBar
- EntitySwitcher
- WorkspaceSwitcher
- ProjectSwitcher
- EstimateSwitcher
- ViewSwitcher
- SkipLink
- SectionNav
- MobileNav

J. Cards, panels, surfaces

- Surface
- SurfaceMuted
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
- PricingCard
- StatCard
- MetricCard
- SummaryCard
- EmptyCard
- ErrorCard
- LoadingCard
- SelectableCard
- InteractiveCard
- ExpandableCard
- HoverCardSurface
- SpotlightCard
- FocusCard
- CardStack
- BentoCard
- BentoGrid
- Panel
- WorkspacePanel
- DetailPanel
- InspectorPanelSurface
- SettingsPanel
- Section
- SectionHeader
- SectionFooter
- ToolbarPanel
- CardGrid
- CardList
- LandingCardSpotlight
- LandingGlareCard
- LandingWobbleCard
- LandingCardHoverEffect

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
- VirtualizedTable
- DataGrid
- DenseRow
- TableOverflowContainer

L. Trees and hierarchy

Preserve old tree plan but express Storybook component coverage.

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
- TreeErrorState
- TreeContextMenu
- TreeBulkActionBar
- TreeNodeIcon
- TreeNodeLabel
- TreeNodeMeta
- TreeDropIndicator
- WorkshopTree
- EstimateSheetTree
- EstimateTreeRow
- EstimateTreeSurface
- ShareTreeSurface
- ShareTreeNodeRow
- ShareReviewTree
- LibraryFolderTree
- ComponentLibraryTree
- ActivityScopeTree
- TemplateTree
- FolderTree
- ControlledTreeAdapter
- ReadOnlyTreeAdapter
- TreeExpansionHook
- TreeSelectionHook
- TreeFilteringUtility
- TreeFlatteningUtility
- TreeAriaUtility
- VirtualizedTreeRows

M. Lists and item rows

- List
- ListGroup
- ListItem
- ItemRow
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
- LoadingListState
- ErrorListState
- SelectableListItem
- DraggableListItem
- RowActionListItem
- Timeline
- TimelineItem
- AuditActivityItem
- RecentActivityTimeline

N. Feedback, loading, empty, error, progress

- Spinner
- Loader
- MultiStepLoader
- Skeleton
- SkeletonText
- SkeletonCard
- SkeletonTable
- SkeletonTree
- SkeletonList
- Progress
- ProgressBar
- CircularProgress
- ProgressRing
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
- SaveStatusIndicator
- AutoSaveIndicator
- RetryState
- PartialFailureState
- FormErrorState
- ImportProgressState
- ExportProgressState

O. Layout primitives

- Container
- Stack
- Inline
- Cluster
- Grid
- ResponsiveGrid
- SplitPane
- ResizablePanel
- ResizablePanelGroup
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
- MasonryGrid
- Center
- Bleed
- Frame
- ViewportFrame
- FullHeightShell
- OverflowFade

P. Media and assets

- Avatar
- AvatarGroup
- UserAvatar
- WorkspaceAvatar
- Logo
- LogoMark
- LogoFull
- Image
- Thumbnail
- Gallery
- ImageCard
- FilePreview
- AttachmentPreview
- PDFPreviewPlaceholder
- VideoPlaceholder
- DeviceMockup
- BeforeAfterCompare
- ImageUploadPreview
- EmptyImagePlaceholder
- DocumentPreview
- FileTypeBadge
- AttachmentList
- AttachmentCard
- DropzonePreview

Q. Charts and visualization

- ChartContainer
- ChartTooltip
- ChartLegend
- MiniBarChart
- MiniLineChart
- DonutChart
- ProgressRing
- Sparkline
- StatGrid
- MetricTrend
- CostBreakdownChart
- CostSummaryChart
- DistributionBar
- Gauge
- Heatmap
- WorldMap
- Globe
- DataVizEmptyState
- DataVizLoadingState
- DataVizErrorState

R. ArchEstimator domain components

- ProjectCard
- ProjectListItem
- ProjectEstimatesTable
- ProjectEstimateRow
- ProjectStatusBadge
- ProjectFavoriteButton
- EstimateCard
- EstimateSummaryPanel
- EstimateSheetHeader
- EstimateSheetBranch
- EstimateRowItemsTable
- EstimateRowItem
- EstimateRowEditor
- EstimateTotalSummary
- EstimateCostBreakdownPanel
- EstimateVersionBadge
- EstimateActivityItem
- EstimateActivityTimeline
- EstimateRowDetailsPanel
- CostBreakdownPanel
- ComponentCatalogueCard
- CatalogueCardGrid
- ComponentCatalogueBranch
- LibraryTreePanel
- LibraryFolderRow
- ComponentLibraryCard
- ComponentVersionBadge
- AddComponentModalSections
- AddComponentIdentitySection
- AddComponentPricingSection
- AddComponentClassificationSection
- TemplateCard
- TemplateListItem
- TemplateTreePanel
- ShareEstimateTreePanelStory
- ShareEstimateTreeViewStory
- ShareTreeSurface
- ShareReviewHeader
- ShareDecisionPanel
- ShareDecisionBadge
- ProposalPreviewCard
- ProposalSectionCard
- ProposalSummaryPanel
- CommentThread
- CommentComposer
- DecisionBadge
- ApprovalStatusBadge
- NotificationBell
- NotificationCenter
- NotificationListItem
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

S. Motion and microinteractions

App/workshop-safe:

- FadeIn
- ScaleIn
- CollapseExpand
- SlidePanel
- FocusRingMotion
- Pressable
- StatefulButtonMotion
- TooltipMotion
- MenuMotion
- ModalMotion
- SkeletonShimmer
- RowInsertHint
- RowRemoveHint
- ReducedMotionProvider
- MotionTokenDemo

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
- ThreeDCardEffect
- ParallaxScroll
- HeroParallax
- FloatingDock
- FloatingNavbar
- TracingBeam
- Lens
- Compare
- Globe
- WorldMap
- InfiniteMovingCards
- AnimatedTestimonials
- AnimatedTooltip
- BackgroundLines
- GridBackground
- ShootingStars

T. Page sections and blocks

Mostly landing/marketing/future proposal unless app use is justified:

- HeroSection
- FeatureSection
- CTASection
- TestimonialSection
- LogoCloud
- PricingSection
- FAQSection
- StatsSection
- ContactSection
- BlogCard
- BlogGrid
- Footer
- AuthLoginSection
- AuthSignupSection
- EmptyStateSection
- BentoFeatureSection
- ProposalCoverSection
- ProposalLineItemSection
- ProposalSummarySection
- ProposalAcceptanceSection
- WorkshopShellBlock
- EstimateEditorBlock
- ComponentLibraryBlock
- ProposalReviewBlock
- NotificationCenterBlock

U. Utility patterns and hooks

- cnPolicy
- cvaVariantPolicy
- useControllableState
- useDisclosure
- useCopyToClipboard
- useMediaQuery
- useReducedMotion
- useFocusReturn
- useKeyboardShortcut
- useOutsideClick
- useRovingFocus
- useTreeExpansion
- useTreeSelection
- useCommandMenu
- useDebouncedValue
- useMeasureElement
- formatCurrency
- formatNumber
- formatPercent
- formatDate
- formatRelativeTime
- makeProjectFixture
- makeEstimateFixture
- makeComponentLibraryFixture
- makeShareReviewFixture
- makeNotificationFixture
- withArchEstimatorTheme
- withMockRouter
- withMockQueryClient
- withMockAuth
- withReducedMotion

V. Documentation and governance components

- ComponentDocTemplate
- StorybookDocsPageTemplate
- DesignTokenDocsPage
- IconGalleryDocsPage
- ComponentStatusBadge
- ComponentChecklistTable
- DeprecationNotice
- SourceAttributionNote
- AgentUsageRuleNote
- MigrationReadinessNote
- ComponentReviewStatus
- StoryCoverageDashboard
- StorybookReviewChecklist
- DoDontExample
- ApprovedRejectedExamples

The matrix must explicitly mark:

- P0 items required for first Storybook review.
- P1 items required before migration planning.
- P2/P3 items useful after P0/P1.
- DEFERRED items that require owner/package/evidence gates.
- LANDING_ONLY items that must not leak into workshop UI.

## 16_STORYBOOK_INSTALLATION_AND_CONFIGURATION_PLAN.md

Make it executable after owner approval.

Add:

- Current package baseline.
- Exact package candidate list:
  - storybook
  - @storybook/nextjs-vite or @storybook/nextjs
  - @storybook/addon-docs if not bundled by framework
  - @storybook/addon-a11y if approved
  - @storybook/test if interaction testing is approved
  - any required transitive package notes from official docs
- Explicit note: future implementation must re-check exact versions before install.
- Bun-compatible install command candidates.
- Exact future script shape:
  - `storybook`
  - `build-storybook`
  - optional `test-storybook` only if package-approved
- `.storybook/main.ts` skeleton.
- `.storybook/preview.tsx` skeleton.
- `.storybook/preview-head.html` use/no-use decision.
- Story discovery globs.
- Global CSS import plan.
- Tailwind v4 plan.
- Next appDirectory parameter plan.
- Static asset plan.
- Path alias plan.
- Fonts plan.
- Mock decorators:
  - theme/density
  - mock router/navigation
  - mock auth/session
  - QueryClient provider with no network
  - Zustand/static UI state if needed
  - reduced motion
- Disallowed decorators:
  - Supabase client
  - server actions
  - analytics
  - live auth refresh
  - provider scripts
- Fixture folders.
- Docs/autodocs policy.
- Controls/args policy.
- A11y addon policy.
- Storybook static build validation.
- Rollback.

## 17_STORYBOOK_STORY_COVERAGE_MATRIX.md

Rewrite into a per-component story manifest.

Columns:

- Story ID
- Component ID from inventory
- Storybook title/path
- Required story names
- Args/controls required
- Required states
- Fixture needed
- Viewports
- Accessibility notes
- Keyboard/play-function candidate
- Reduced-motion requirement
- Owner review label
- Status

Every P0 and P1 component in `15_COMPONENT_INVENTORY_MATRIX.md` must be represented.

Required story names should be explicit, for example:

- `Default`
- `Variants`
- `Sizes`
- `WithIcon`
- `Loading`
- `Disabled`
- `Invalid`
- `Empty`
- `Error`
- `Success`
- `LongContent`
- `Compact`
- `Responsive`
- `KeyboardFocus`
- `ReducedMotion`
- `DomainFixture`

Do not leave P0/P1 story planning at grouped category level.

## 18_DESIGN_TOKEN_AND_THEMING_PLAN.md

Expand into a token specification.

Include:

- Token source hierarchy.
- Color roles.
- Semantic roles.
- Surface roles.
- Text roles.
- Typography roles.
- Font families.
- Font weights.
- Line heights.
- Radius.
- Spacing.
- Sizing.
- Borders/hairlines.
- Focus.
- Shadows/elevation.
- Motion.
- Z-index.
- Density.
- Responsive.
- Data visualization.
- Skeleton/loading.
- App/workshop vs landing.
- Tailwind v4 mapping.
- `@theme inline` strategy.
- Storybook token gallery requirements.
- Do/don’t examples.
- Lint rules.
- Forbidden external defaults.

## 19_ICON_SYSTEM_AND_ASSET_PLAN.md

Expand into a semantic icon map.

Include:

- Phosphor regular app/workshop standard.
- components.json lucide conflict handling.
- AppIcon wrapper contract.
- Icon size scale: 8, 10, 12, 14, 16, 18, 20, 24.
- Semantic icon categories:
  - navigation
  - action
  - status
  - entity
  - tree
  - table
  - form
  - file/media
  - notification
  - collaboration
  - import/export
  - danger/warning/success
- Icon-only accessibility.
- Decorative icon rules.
- Storybook icon gallery.
- Asset placeholder rules.
- No paid/private asset leakage.
- Future landing icon exceptions.

## 20_COMPONENT_API_AND_COMPOSITION_CONTRACTS.md

Expand with per-family API contracts.

Include:

- Naming rules.
- Variant/tone/size rules.
- asChild/polymorphic policy.
- Ref forwarding policy.
- Controlled/uncontrolled policy.
- Event naming.
- Disabled/loading/invalid/selected prop policy.
- Data attribute policy.
- Slot/subcomponent policy.
- Server/client boundary.
- Barrel export strategy.
- Deprecation policy.
- Source attribution notes.
- Component family contracts for:
  - Button
  - IconButton
  - Text
  - Badge/Pill
  - Field/Input
  - Select/Combobox
  - Checkbox/Radio/Switch
  - Menu/ContextMenu
  - Dialog/Modal
  - Tooltip/Popover
  - Tabs
  - Sidebar/AppShell
  - Card/Panel
  - Table/DataTable
  - Tree
  - Toast/Alert
  - Skeleton/Loading
  - Domain cards
  - Domain trees
  - Motion wrappers

Use TypeScript-like signatures where helpful, but mark them as planning contracts only.

## 21_EXTERNAL_SOURCE_ADOPTION_PLAN_SHADCN_FLOWBITE_ACETERNITY.md

Expand into a source crosswalk.

Columns:

- External source
- External component/category
- Local target component(s)
- Adoption posture: COPY_ADAPT / REFERENCE_ONLY / REJECT / LANDING_ONLY / DEFERRED
- Reason
- Dependency impact
- License/privacy note
- Accessibility note
- Visual adaptation needed
- Storybook requirement
- Owner gate
- Status

Add sections:

- shadcn/ui crosswalk
- Flowbite crosswalk
- Aceternity crosswalk
- Tailwind v4 crosswalk
- Phosphor/Radix/TanStack crosswalk where relevant

Do not just say external libraries are references. Map actual categories.

## 22_ACCESSIBILITY_AND_KEYBOARD_MATRIX.md

Expand into a deeper component-by-component a11y matrix.

Columns:

- Component
- Role/semantics
- Keyboard support
- Focus behavior
- ARIA/labelling
- Disabled/invalid behavior
- Screen reader notes
- Error/status announcement
- Reduced-motion if applicable
- Story evidence
- Test/play-function candidate
- Risk

Must cover:

- Button
- IconButton
- LinkButton
- TextField
- SearchField
- Select
- Combobox
- Checkbox
- RadioGroup
- Switch
- Slider
- DatePicker/Calendar
- FileInput/Dropzone
- Tabs
- DropdownMenu
- ContextMenu
- CommandPalette
- Tooltip
- Popover
- Dialog/Modal
- AlertDialog
- Drawer/Sheet
- Toast
- Alert/Banner
- DataTable
- EditableCell
- Tree
- Tree drag/drop affordances
- Sidebar/AppShell
- NotificationCenter
- ReleaseModal
- Domain cards
- Domain blocks
- Motion effects

## 23_VISUAL_QA_AND_REVIEW_WORKFLOW.md

Expand with:

- Philip review flow.
- Storybook review order.
- Story acceptance labels.
- Screenshot/manual evidence plan.
- Viewport list.
- Long content tests.
- Responsive tests.
- Density checklist.
- Icon checklist.
- Motion/reduced-motion checklist.
- Accessibility review checklist.
- External-default rejection checklist.
- Component rejection workflow.
- Component revision workflow.
- Migration approval workflow.
- No-migration confirmation checklist.

## 24_NO_MIGRATION_STORYBOOK_ONLY_MVP_SCOPE.md

Strengthen:

- Allowed MVP changes.
- Forbidden MVP changes.
- App files/routes that must not be touched for migration.
- Domain files that may be used only as story references/static extraction with caution.
- What counts as accidental migration.
- How to detect accidental migration in git diff.
- Stop conditions.
- Philip approval gate.
- Separate future migration plan requirement.

## 25_FUTURE_APP_MIGRATION_ROADMAP_DEFERRED.md

Refine:

- After-Storybook migration prerequisites.
- Route-by-route candidate order.
- Component-by-component migration order.
- Blast-radius gates.
- Visual parity proof.
- Test proof.
- Owner smoke proof.
- Rollback plan.
- What must remain out of scope.
- Migration scoring must stay low/deferred in current plan.

## 26_IMPLEMENTATION_PROMPT_STORYBOOK_AND_LIBRARY_ONLY.md

Make this the strongest copy-paste implementation prompt in the repo.

It must include:

- Exact repo path.
- Branching instructions.
- Required reading.
- Required graph impact.
- Package approval confirmation.
- Official-doc re-check.
- Next.js local docs requirement.
- Storybook install/config phase.
- Fixture/decorator phase.
- Component/story phases.
- Per-priority build order.
- Validation commands.
- Stop conditions.
- Bug protocol.
- `.ai` update protocol.
- Commit/push instructions.
- No-main-merge rule.
- No app migration rule.
- Final report template.

## 27_COMPONENT_ACCEPTANCE_CHECKLIST.md

Expand checklist.

Per component require:

- Component ID from inventory.
- Purpose.
- Priority.
- Source inspiration/adoption status.
- API props/types.
- Variant coverage.
- State coverage.
- Storybook stories.
- Fixture policy.
- Accessibility notes.
- Keyboard notes.
- Responsive notes.
- Reduced-motion notes.
- Visual QA.
- Tests/play function.
- Design lint compatibility.
- No provider/server-only import.
- No production migration.
- Owner review status.
- Rejection/revision notes.
- Migration status.

## 28_MCP_AND_COMPUTER_USE_SOURCE_RESEARCH_GUIDE.md

Expand:

- How to use shadcn MCP.
- How to use Flowbite MCP if available.
- How to use Flowbite paid access if Philip provides browser/computer-use access.
- How to browse Aceternity safely.
- How to extract category inventory without leaking paid/proprietary content.
- What to record.
- What not to record.
- How to cite URLs in docs.
- How to handle unavailable MCP/browser tools.
- How to adapt generated/copied components to ArchEstimator tokens.
- How to avoid secrets.

## 29_COMPONENT_DEPENDENCY_AND_PACKAGE_PLAN.md

Expand:

- Current package baseline from package.json.
- Current absent package list.
- Storybook package candidates.
- Storybook addon candidates.
- Radix package candidates.
- shadcn CLI/MCP implications.
- Flowbite package/runtime/plugin implications.
- Aceternity/Motion implications.
- Chart package posture.
- Existing `class-variance-authority`, `clsx`, `tailwind-merge`, Phosphor, Radix context menu, TanStack, D3 status.
- Approval gates.
- Dev vs runtime dependency rules.
- Install validation.
- Lockfile drift handling.
- Rollback.
- Rejected defaults.
- Owner decision table.

## 30_AGENT_UI_USAGE_RULES_DRAFT.md

Keep as draft only.

Expand with:

- Future rule text.
- Activation gate.
- Where it might go later.
- What agents must do after Storybook exists.
- What agents must not do.
- How agents should use Storybook.
- How agents should update inventory/story docs.
- How agents should handle new component requests.
- How agents should handle production migration requests.
- Why not to activate before Storybook approval.

Do not edit root AGENTS.md to activate these rules unless Philip explicitly approved.

## 31_DOC_REPAIR_LOG.md

Update:

- What was wrong with previous 83/100 state.
- What was improved.
- What docs were edited.
- What docs were added if any.
- What remains owner-gated.
- What is now 100/100 docs-ready.
- What is still not implemented.
- No source/package/app migration statement.
- Branch hygiene notes.

OPTIONAL ADDITIONAL DOCS

Create additional docs only if they materially improve implementation readiness. Do not create documents for volume alone.

Recommended additional docs if useful:

32_SOURCE_ADOPTION_CROSSWALK.md
33_STORYBOOK_CONFIG_SKELETONS.md
34_FIXTURE_AND_DECORATOR_CONTRACTS.md
35_COMPONENT_API_REFERENCE_MATRIX.md
36_P0_P1_IMPLEMENTATION_BACKLOG.md
37_PHILIP_STORYBOOK_REVIEW_PACKET.md
38_VALIDATION_COMMAND_MATRIX.md

If you create them, add them to `00_INDEX.md`, README reading order, and traceability.

STRONG RECOMMENDATION:

Create these four new docs unless you can fully integrate their content elsewhere without making existing docs bloated:

### 32_SOURCE_ADOPTION_CROSSWALK.md

A detailed crosswalk for shadcn/ui, Flowbite, Aceternity, Tailwind, Radix, Phosphor, TanStack.

### 33_STORYBOOK_CONFIG_SKELETONS.md

Planning-only skeletons for:

- package scripts
- `.storybook/main.ts`
- `.storybook/preview.tsx`
- provider decorators
- fixture builders
- story file template
- docs page template

Mark as planning skeletons only, not implemented.

### 34_FIXTURE_AND_DECORATOR_CONTRACTS.md

Define static fixture builders and decorators in detail:

- project fixture
- estimate fixture
- component library fixture
- share review fixture
- notification fixture
- user/workspace fixture
- theme decorator
- mock router decorator
- mock auth decorator
- mock QueryClient decorator
- reduced motion decorator

### 35_COMPONENT_API_REFERENCE_MATRIX.md

Per-component planned API contracts for all P0/P1 components.

### 36_P0_P1_IMPLEMENTATION_BACKLOG.md

Checklist-style backlog for future implementation with:

- component
- priority
- files
- stories
- tests
- dependencies
- owner gates
- status

### 37_PHILIP_STORYBOOK_REVIEW_PACKET.md

A human review packet that tells Philip exactly how to review the future Storybook:

- review order
- acceptance labels
- rejection labels
- what screenshots/evidence to capture
- how to approve P0/P1
- how to block migration
- how to reopen migration later

### 38_VALIDATION_COMMAND_MATRIX.md

Exact command matrix:

- docs-only pass
- package setup
- storybook setup
- primitive changes
- domain stories
- app migration future
- provider/schema future

READINESS LOOP

Perform this loop:

Audit → improve → score → find gaps → improve again → rescore.

The docs/planning package must reach 100/100 for Storybook-only UI library implementation handoff.

Every required document must reach 98–100%.
The final docs package score should be 100/100 only if:

- all repo facts are verified
- all missing component categories are explicitly represented
- all P0/P1 components have story requirements
- Storybook setup has concrete config/package guidance
- all package/owner gates are explicit
- all external source adoption decisions are mapped
- accessibility/keyboard requirements are component-level
- no live provider data policy is explicit
- no production app migration boundary is explicit
- validation commands are exact
- future implementation prompt is actionable
- no unsupported assumptions remain
- no hidden ambiguity remains

If any blocker prevents 100/100, create a bug/blocker plan and report `NEEDS_HUMAN_DECISION` or `BLOCKED`.
Do not fake the score.

Scoring categories:

- Repository evidence accuracy.
- Requirement clarity.
- Storybook setup specificity.
- Component inventory completeness.
- Story coverage specificity.
- Component API specificity.
- Accessibility/keyboard specificity.
- Design token/theming specificity.
- Icon system specificity.
- External source adoption specificity.
- Security/data isolation.
- Risk/rollback coverage.
- Testing/verification readiness.
- Visual QA readiness.
- Future implementation prompt usability.
- .ai documentation hygiene.
- Future implementation usability.
- Migration boundary clarity.

BUG DISCOVERY PROTOCOL

If you discover a bug, failing test, blocker, stale assumption, architecture issue, missing prerequisite, security concern, test gap, command mismatch, package ambiguity, doc contradiction, serious scoring overclaim, or other issue, create a dated bug plan in:

/Users/philiplewis/archestimator/.ai/15_Bugs

Filename:

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

Likely bug/blocker examples:

- Storybook package compatibility ambiguity blocks exact implementation guidance.
- Existing plan claims a score unsupported by content.
- `typecheck` command is referenced but repo uses `type-check`.
- External source research is too stale or incomplete.
- Flowbite Pro license/access uncertainty blocks paid-source adoption.
- Tailwind v4 Storybook integration cannot be specified without a package decision.
- Root AGENTS.md was modified contrary to the plan’s activation gate.
- Required docs are missing from index/reading order.

.ai PROJECT MEMORY UPDATES

Update relevant `.ai` memory files if they exist:

- /Users/philiplewis/archestimator/.ai/10_state/current-state.md
- /Users/philiplewis/archestimator/.ai/10_state/decisions.md
- /Users/philiplewis/archestimator/.ai/10_state/known-issues.md if relevant
- /Users/philiplewis/archestimator/.ai/01_roadmap/README.md
- /Users/philiplewis/archestimator/.ai/04_tasks if structure exists and relevant
- /Users/philiplewis/archestimator/.ai/05_logs if structure exists and relevant

Rules:

- Follow existing structure.
- Do not create conflicting source-of-truth docs.
- Do not mark Storybook implemented.
- Do not mark UI library implemented.
- Do not mark migration ready.
- Record this as docs-only refinement.
- Record target folder.
- Record branch.
- Record final readiness.
- Record owner/package gates.
- Record bugs/blockers.
- Keep `.ai` durable for future agents.

BRANCH HYGIENE AND ROOT DOC RULES

The branch currently may include changes outside the target plan folder such as `.ai` memory/log/prompt docs and root agent docs.

Rules:

- `.ai` memory/log/prompt updates are allowed if relevant.
- Avoid further changes to root `AGENTS.md` and `CLAUDE.md` unless required by generated index metadata or explicitly justified.
- Do not activate UI-library enforcement rules in root agent docs until Storybook exists, P0/P1 are approved, and Philip approves enforcement.
- If `AGENTS.md` or `CLAUDE.md` already changed only because GitNexus index counts changed, document it in final report.
- Stage only intended docs changes.
- Do not stage production source/package/runtime changes.

FINAL VERIFICATION BEFORE STAGING

Run:

- git status --short --branch
- git diff --stat
- git diff --check
- git diff -- .ai
- git diff -- AGENTS.md CLAUDE.md if they are modified
- git diff --name-status main...HEAD

If any production source, package, lockfile, migration, generated file, provider config, runtime config, or secret file is changed unexpectedly, stop and report.

FINAL GIT REQUIREMENTS

After verification:

- Stage only intended `.ai` documentation changes and any already-intended root documentation changes if justified.
- Do not stage unrelated dirty files.
- Commit with:

docs(ai): bring ui component storybook plan to 100

- Pull/reconcile remote changes safely if needed.
- Never force push.
- Push to origin branch:

docs/ui-component-plan-refinement-2026-06-06

- Capture final commit hash.

Do not merge to main automatically unless Philip explicitly asks.

FINAL REPORT REQUIREMENTS

Return a final report with:

- Final status:
  - READY_FOR_IMPLEMENTATION
  - READY_AFTER_OWNER_PACKAGE_APPROVAL
  - NEEDS_REFINEMENT
  - NEEDS_HUMAN_DECISION
  - BLOCKED
- Branch.
- Target plan folder.
- Documents created.
- Documents updated.
- `.ai` cross-updates.
- Bugs/issues discovered.
- Bug plan files created.
- Readiness score per document.
- Readiness score per category.
- Overall docs package score.
- Storybook-only MVP readiness score.
- Production migration readiness score.
- Owner/package gates remaining.
- Commands run.
- Git diff summary.
- Commit hash.
- Push status.
- Blockers/open questions.
- Next recommended step.

QUALITY BAR

This plan must become the best UI-library planning pack in the repository.

The final docs must make it impossible for a future implementation agent to misunderstand:

- Build Storybook and UI library first.
- Show components in Storybook.
- Use static fixtures.
- Do not use live provider data.
- Do not migrate production app screens.
- Do not publish Storybook.
- Do not add unapproved dependencies.
- Adapt shadcn/Flowbite/Aceternity into ArchEstimator’s design system.
- Keep app/workshop UI compact, neutral, SF Pro, 8–12px, 3px radius, Phosphor regular icons.
- Preserve the old tree work as a domain sub-plan.
- Require Philip Storybook review before migration.
- Treat future app migration as a separate route-by-route plan.

Completion means the docs package is truly 100/100 for future Storybook-only UI library implementation handoff, not because it claims perfection, but because it removes all avoidable ambiguity and isolates unavoidable owner/package decisions as explicit gates.