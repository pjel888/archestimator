# Architecture And Design Plan

**Scope:** Future ArchEstimator UI Component Library + Storybook MVP

## Proposed UI Library Architecture

The future implementation should add a local product UI library that remains inside the app repo and is inspectable in Storybook. The library should not become a separate package until a real distribution need exists.

Recommended future folders:

```txt
src/components/ui/                       # existing low-level product primitives
src/components/ui/foundations/           # token galleries, typography helpers if needed
src/components/ui/icons/                 # AppIcon wrapper, semantic map, gallery
src/components/ui/forms/                 # field/control composites
src/components/ui/overlays/              # dialogs, popovers, sheets, tooltips
src/components/ui/navigation/            # tabs, breadcrumbs, sidebar primitives
src/components/ui/data-display/          # table/card/list/display primitives
src/components/ui/layout/                # stack/grid/panel/shell helpers
src/components/ui/feedback/              # empty/loading/error/success
src/components/ui/motion/                # reduced-motion-safe wrappers
src/components/workshop/ui/              # domain components when not generic
src/components/share/ui/                 # share-specific domain components
src/stories/fixtures/                    # static story fixtures/builders
.storybook/                              # future Storybook config
```

If implementation finds that colocated stories are simpler, use colocated `*.stories.tsx` for component-owned examples and keep cross-domain fixture builders under `src/stories/fixtures/`.

## Component Layering

1. Design tokens: CSS variables, typography, radius, spacing, status, focus, density, motion.
2. Low-level primitives: Button, IconButton, Text, Field, Input, Badge, Tooltip, Card, Modal, Menu.
3. Composed controls: Combobox, date controls, input groups, validation summaries, table cells.
4. Layout/shell primitives: AppShell, PageShell, Sidebar, Toolbar, Panel, SplitPane, Stack, Grid.
5. Data-display primitives: Table, DataTable, List, Tree shell, Chart containers, Stat cards.
6. Domain components: Project, Estimate, Component Library, Share, Notification, Release modal, proposal preview.
7. Motion/microinteraction wrappers: reduced-motion-aware only; landing-only effects marked.
8. Storybook docs/stories: stories, docs pages, token/icon galleries, acceptance tables.

## Source-Of-Truth Rules

- `DESIGN.md` controls visual tokens and app/workshop constraints.
- `src/app/globals.css` holds current Tailwind v4 CSS-variable substrate.
- `components.json` informs shadcn CLI/MCP configuration, but the app icon rule remains Phosphor regular unless changed by owner decision.
- Storybook displays and documents; it does not override `DESIGN.md`.

## Import Boundaries

- Low-level primitives may import `cn`, type utilities, and approved icon wrappers.
- Low-level primitives must not import route components, server actions, Supabase clients, repositories, or live stores.
- Domain components may compose primitives and static fixture types, but Storybook stories must not import server-only modules.
- Storybook fixtures may mirror data shapes but must remain local/static.

## Public API And Export Strategy

- Keep `src/components/ui/index.tsx` as the stable public primitive barrel.
- Add category barrels only when a category has multiple stable exports.
- Export types with components when they are part of public API.
- Avoid exporting internal implementation helpers that would lock accidental APIs.
- Preserve named exports over default exports for library components.

## Accessibility Contract

Every component must define focus, keyboard, disabled, labels, invalid state, error message, and reduced-motion expectations in docs/stories. Components built on accessible primitives should still document ArchEstimator-specific density and keyboard expectations.

## Token Contract

- App/workshop token values come from `DESIGN.md` and `src/app/globals.css`.
- Component variants should use tokenized classes, not arbitrary one-off colors/radius/text sizes.
- Tailwind v4 `@theme inline` remains the CSS bridge.

## External-Source Adoption Contract

- shadcn/ui may provide copy-in primitive structure and accessible APIs, adapted to ArchEstimator tokens.
- Flowbite may provide breadth/inventory/block references, but Flowbite JS/data-attribute runtime is not the default app architecture.
- Aceternity may provide animation ideas; production app/workshop adoption requires dependency, performance, and reduced-motion approval.

## Alternatives Rejected

| Alternative | Why rejected |
|---|---|
| Migrate production app while creating library | Violates explicit MVP boundary and increases regression risk. |
| Drop in Flowbite React as the product library | Conflicts with existing local primitives and design-system enforcement. |
| Use Aceternity effects broadly in workshop | Conflicts with compact neutral product UI and performance/reduced-motion risk. |
| Replace React Complex Tree now | Explicitly deferred unless measured and approved. |
| Build a separate npm package | No current distribution need; increases setup burden. |

## Anti-Overengineering Guardrails

- Add abstractions only for repeated component behavior or Storybook/library inspectability.
- Do not invent a token pipeline if `DESIGN.md` + `globals.css` cover the need.
- Do not add package dependencies for components that can be implemented from existing primitives.
- Do not create app migration shims in the MVP.
