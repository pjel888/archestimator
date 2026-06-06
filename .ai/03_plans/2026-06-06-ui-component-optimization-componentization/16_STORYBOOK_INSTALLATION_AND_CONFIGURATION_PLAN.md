# Storybook Installation And Configuration Plan

**Current status:** Not installed in this docs-only pass.
**Future default:** Use the latest official Storybook Next.js guidance at implementation time.

## Package Gate

Storybook package installation requires Philip approval before editing:

- `package.json`
- `bun.lock`
- `.storybook/`
- Storybook scripts
- story files and fixture helpers

## Official-Docs Baseline

Official docs checked during this planning pass:

- Storybook Next.js framework docs: `https://storybook.js.org/docs/get-started/frameworks/nextjs-vite/?renderer=react`
- Storybook accessibility docs: `https://storybook.js.org/docs/writing-tests/accessibility-testing`
- Tailwind v4 upgrade/docs posture: `https://tailwindcss.com/docs/upgrade-guide`
- shadcn/ui Tailwind v4 docs: `https://ui.shadcn.com/docs/tailwind-v4`

Future implementation must re-check current docs before installation because Storybook/Next/Tailwind integration changes over time.

## Expected Setup Shape

Preferred future scripts after approval:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

Preferred config goals:

- Next.js framework support compatible with Next.js 16 and React 19.
- Tailwind v4/global CSS loaded in Storybook preview.
- Path aliases aligned with `tsconfig` and `components.json`.
- Decorators for app/workshop theme and story-only providers.
- No live Supabase/provider client initialization.
- Accessibility addon if approved and compatible.

## Configuration Files To Plan

| File | Purpose | Notes |
|---|---|---|
| `.storybook/main.ts` | Story discovery, framework, addons, static dirs. | Must use current official framework guidance. |
| `.storybook/preview.ts` | Global decorators, parameters, CSS import. | Must import app CSS safely. |
| `.storybook/preview-head.html` if needed | Fonts/meta only. | No analytics or provider scripts. |
| `src/stories/` or `src/components/**/*.stories.tsx` | Story files. | Choose based on repo convention at implementation time. |
| `src/stories/fixtures/` or equivalent | Static fixtures. | No live ids/secrets. |

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

## Validation

```bash
bun install
bun run storybook
bun run build-storybook
bun run validate
bun run build
git diff --check
```

If `storybook dev` runs but `build-storybook` fails, the MVP is not ready for review.
