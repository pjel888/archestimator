# Storybook Installation And Configuration Plan

**Current status:** Implemented on `feat/ui-component-optimization` after the
owner-authorized Storybook MVP pass.
**Implementation default:** Continue using official Storybook Next.js guidance
when upgrading or extending this setup.

## Implementation Update - 2026-06-07 local / 2026-06-06Z

Installed packages:

- `storybook@10.4.2`
- `@storybook/nextjs-vite@10.4.2`
- `@storybook/addon-docs@10.4.2`
- `@storybook/addon-a11y@10.4.2`
- `vite@8.0.16`

Implemented scripts:

```json
{
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build",
  "storybook:check-boundary": "node scripts/check-storybook-boundary.mjs"
}
```

Implemented files:

- `.storybook/main.ts`
- `.storybook/preview.tsx`
- `src/stories/decorators/*`
- `src/stories/fixtures/product-fixtures.ts`
- `src/stories/lib/storybook-plan-matrix.ts`
- `src/stories/ui-library/story-canvas.tsx`
- P0/P1 stories under `src/stories/foundations`, `icons`, `primitives`,
  `compositions`, `domain`, `motion`, and `documentation`.
- `scripts/check-storybook-boundary.mjs`
- `tests/vitest/storybook-provider-boundary.test.ts`
- `tests/vitest/storybook-plan-matrix.test.ts`

The setup is Storybook-only. It does not approve or perform production route
migration.

## Package Gate

Storybook package installation required Philip approval before editing. The
implementation pass was owner-authorized for:

- `package.json`
- `bun.lock`
- `.storybook/`
- Storybook scripts
- story files and fixture helpers

## Official-Docs Baseline

Official docs checked during planning and re-checked at implementation time:

- Storybook Next.js framework docs: `https://storybook.js.org/docs/get-started/frameworks/nextjs-vite/?renderer=react`
- Storybook accessibility docs: `https://storybook.js.org/docs/writing-tests/accessibility-testing`
- Tailwind v4 upgrade/docs posture: `https://tailwindcss.com/docs/upgrade-guide`
- shadcn/ui Tailwind v4 docs: `https://ui.shadcn.com/docs/tailwind-v4`

Future upgrades must re-check current docs because Storybook/Next/Tailwind
integration changes over time.

## Expected Setup Shape

Implemented scripts:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "storybook:check-boundary": "node scripts/check-storybook-boundary.mjs"
  }
}
```

Implemented config goals:

- Next.js framework support compatible with Next.js 16 and React 19.
- Tailwind v4/global CSS loaded in Storybook preview.
- Path aliases aligned with `tsconfig` and `components.json`.
- Decorators for app/workshop theme and story-only providers.
- No live Supabase/provider client initialization.
- Accessibility addon if approved and compatible.
- Implementation follows the skeletons captured in `33_STORYBOOK_CONFIG_SKELETONS.md`.

## Configuration Files

| File | Purpose | Notes |
|---|---|---|
| `.storybook/main.ts` | Story discovery, framework, addons, static dirs. | Must use current official framework guidance. |
| `.storybook/preview.tsx` | Global decorators, parameters, CSS import. | Imports app CSS and story-only decorators. |
| `src/stories/` | Story files. | Chosen implementation location for MVP review. |
| `src/stories/fixtures/` | Static fixtures. | No live ids/secrets. |

## Tailwind v4 Plan

- Load `src/app/globals.css` or a Storybook-specific CSS entry that imports the same tokens.
- Preserve `@theme inline` variables and app/workshop font expectations.
- Verify Storybook canvas renders compact radius/type/spacing correctly.
- Do not introduce a Tailwind config file unless required by current tooling.

## Provider Decorator Plan

Allowed decorators:

- Theme/density wrapper.
- Mock route state wrapper.
- Static app shell wrapper.
- Static query state wrapper if no provider/network calls occur.

Disallowed decorators:

- Supabase clients.
- Server action calls.
- Auth session refresh.
- Analytics.
- Vercel provider setup.
- Live project/workspace loaders.

`34_FIXTURE_AND_DECORATOR_CONTRACTS.md` is the detailed fixture/decorator authority. Future implementation must reject stories that need live Supabase, auth refresh, provider env values, server actions, or external network calls.

## Validation

```bash
bun install
bun run storybook
bun run storybook:check-boundary
bun run build-storybook
bun run validate
bun run build
bun run type-check
git diff --check
```

If `storybook dev` runs but `build-storybook` fails, the MVP is not ready for review.

Current implementation evidence:

- `bun run storybook` is configured for port 6006. During the final
  implementation smoke, port 6006 was already occupied, so the verified local
  Storybook server ran on `http://127.0.0.1:6007/` and was stopped afterward.
- `bun run storybook:check-boundary` passes with 24 files scanned, 809 inventory
  rows, and 703 story rows.
- `STORYBOOK_DISABLE_TELEMETRY=1 bun run build-storybook -- --output-dir
  /tmp/archestimator-storybook-static` passes.
- `bun run build`, `bun run type-check`, `bun run lint`, and
  `bun run lint:design-system` pass.
- Focused Storybook/provider/matrix tests and focused changed-component DOM
  tests pass.
- Full `bun run validate` passes: 205 Vitest DOM files passed, 1 skipped; 1514
  tests passed, 3 skipped.
