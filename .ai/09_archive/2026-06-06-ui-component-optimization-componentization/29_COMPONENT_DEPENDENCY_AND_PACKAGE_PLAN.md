# Component Dependency And Package Plan

## Current Package Baseline

As inspected in this planning pass:

- Next.js 16 and React 19 are active.
- Tailwind v4 is active.
- Bun is the package/runtime baseline.
- Phosphor React is active.
- `@radix-ui/react-context-menu` is present.
- `class-variance-authority`, `clsx`, and `tailwind-merge` are present.
- TanStack Query/Table and React Complex Tree are present.
- Storybook is not installed.

Future agents must re-check `package.json` and `bun.lock` before editing.

## Package Approval Gates

| Package family | Default | Approval needed for |
|---|---|---|
| Storybook | Not installed | any Storybook package/script/config |
| Radix | Context menu only | dialog, select, tooltip, popover, tabs, checkbox, switch, etc. |
| shadcn/ui | metadata exists | generator/CLI/MCP usage and new dependency output |
| Flowbite | not installed | Flowbite runtime/plugin or paid content |
| Aceternity | not installed | copied components, effect dependencies, motion dependency |
| Motion/Framer | not installed | any animation dependency |
| Charting | existing state must be verified | new chart package |

## Dependency Principles

- Add no dependency without a concrete component need.
- Prefer existing utilities before new packages.
- Keep Storybook-only dependencies dev-scoped.
- Avoid runtime dependencies for visual polish that CSS can handle.
- Document license, bundle, and maintenance posture for any new package.

## Install Validation

After approved package edits:

```bash
bun install
bun run validate
bun run build
bun run storybook
bun run build-storybook
```

If install mutates lockfile unexpectedly, inspect and record the reason before committing.

## Rejected Defaults

- Do not install Flowbite JS runtime just to copy visual examples.
- Do not install Motion/Framer only for app/workshop hover effects.
- Do not add Radix packages reflexively if existing components solve the MVP state.
- Do not install Storybook in docs-only planning passes.
