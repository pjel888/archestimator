# ArchEstimator UI Component Library + Storybook

**Plan folder:** `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/`
**Updated:** 2026-06-06
**Mode:** Planning/documentation refinement only
**Implementation status:** Not implemented. Storybook is not installed. No app surfaces have been migrated.

## Thesis

ArchEstimator now needs a formal, Storybook-first product UI component library that standardizes primitives, patterns, domain components, icons, and microinteractions before any app-wide migration. Existing tree optimization work remains valuable, but it is now the Domain Tree Components and Estimate/Share Tree Sub-plan inside this larger UI library strategy.

## What Changed From The Old Plan

- Superseded the old narrow tree/componentization-only scope.
- Superseded the old "do not build a broad generic design system" thesis for this plan pack.
- Added a Storybook-first UI library MVP with explicit external source posture for shadcn/ui, Flowbite, Aceternity, and Tailwind CSS v4.
- Preserved old tree documents as domain-component evidence and future sub-plan material.
- Added a hard no-migration boundary: the MVP ends when Storybook and the reusable library are inspectable.

## Current Implementation Status

- Storybook packages/scripts/config: not present in `package.json`.
- `.storybook/`: not present.
- Shared primitives present under `src/components/ui`: `Button`, `Badge`, `Chip`, `ControlInput`, `ControlSelect`, `CreatableCombobox`, `EmptyState`, `Modal`, `SearchInput`, `Skeleton`, `Toast`, `ContextMenu`, toolbar controls.
- Existing product/domain components present under `src/components/workshop`, `src/components/share`, `src/features/notifications`, `src/components/sidebar`, and `src/components/landing`.
- Existing design-system lint is active through `bun run lint:design-system`.
- No source/package/runtime/provider changes were made by this docs pass.

## Reading Order

1. `00_INDEX.md`
2. `CURRENT_CANONICAL_PLAN.md`
3. `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`
4. `02_CODEBASE_RESEARCH.md`
5. `15_COMPONENT_INVENTORY_MATRIX.md`
6. `16_STORYBOOK_INSTALLATION_AND_CONFIGURATION_PLAN.md`
7. `21_EXTERNAL_SOURCE_ADOPTION_PLAN_SHADCN_FLOWBITE_ACETERNITY.md`
8. `30_AGENT_UI_USAGE_RULES_DRAFT.md`
9. Preserved tree sub-plan docs only after reading the canonical layer.

## Source-Of-Truth Hierarchy

1. `DESIGN.md` controls product/workshop visual rules.
2. `.ai/00_system/*`, `.ai/10_state/*`, and `.ai/01_roadmap/README.md` control project governance and current state.
3. This folder controls future UI library and Storybook implementation planning.
4. Current source files, tests, package scripts, and graph output win over stale docs.
5. External docs inform package/source decisions but do not override ArchEstimator design rules.

## Success Criteria

- Future implementation installs and configures Storybook only after package approval.
- All P0/P1 component inventory items have inspectable stories.
- Stories cover variants, states, density, accessibility, responsive behavior, empty/loading/error/success, and ArchEstimator usage.
- Stories use static fixtures and mocks only.
- Components use typed, stable APIs and follow `DESIGN.md`.
- The library is reviewed in Storybook by Philip before any production app migration.

## Do Not Migrate App Yet

The MVP must not migrate current production app screens. Production app adoption is a separate future plan after Philip reviews and approves the Storybook library.

## Relationship To Existing Tree/Performance Docs

The old tree docs remain the Domain Tree Components and Estimate/Share Tree Sub-plan. They provide evidence for later `Tree`, `WorkshopTree`, `EstimateSheetTree`, `ShareTreeSurface`, and library-folder stories, but they are not the whole plan.

## Relationship To DESIGN.md And Design-System Lint

All non-landing app/workshop components must use SF Pro, regular/medium weights, visible text at or below 12px, normal controls around 10px, labels/meta around 8-9px, zero letter spacing, 3px radius, neutral product colors, and Phosphor regular outline icons. `bun run lint:design-system` is blocking for future implementation.

## Relationship To Storybook

Storybook is the inspection and QA surface, not the design source of truth. Storybook should show the ArchEstimator library clearly enough for Philip to approve or reject before app adoption begins.

## Relationship To shadcn, Flowbite, Aceternity, And Tailwind

- shadcn/ui: preferred source for accessible primitives, Radix-style composition, copy-in local component patterns, registry/MCP workflows, and API shape.
- Flowbite: preferred source for breadth across forms, tables, modals, sidebars, dashboards, banners, application blocks, and paid/pro inspiration if Philip provides approved access.
- Aceternity: selective source for microinteractions, cards, overlays, loaders, and marketing/landing motion. App/workshop usage is approval-gated and reduced-motion-gated.
- Tailwind CSS v4: styling substrate. Use CSS variables and `@theme inline` posture already present in `src/app/globals.css`.
