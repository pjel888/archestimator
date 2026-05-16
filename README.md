# Archestimator

Contractor-first construction estimating and proposal workspace.

## Current stack baseline

- Next.js 16 App Router
- React 19
- Bun package manager/runtime
- TypeScript
- Tailwind CSS v4
- Local-first JSON seed repository while the product/data model changes rapidly

Supabase/Postgres is intentionally deferred. The app uses repository boundaries under `src/lib/local-data/` so future migration can replace the storage backend without rewriting UI surfaces.

## Project intelligence

Agents must read:

1. `AGENTS.md`
2. `DESIGN.md`
3. `.ai/10_state/current-state.md`
4. `.ai/10_state/decisions.md`
5. `.ai/06_specs/`

## Commands

```bash
bun install
bun run dev
bun run type-check
bun run lint
bun run test
bun run test:dom
bun run build
bun run validate
```

## Local data

Tracked seed data:

- `data/local/seed.json`

Mutable local JSON files are ignored by git. Do not commit private client/project data.

## Validation baseline

Use `bun run validate` for the default local gate:

1. TypeScript check
2. ESLint
3. Bun unit tests
4. Vitest DOM tests

Use the full local gate before pushing implementation branches:

```bash
bun run validate
bun run build
bun run test:e2e
```

Playwright smoke tests are configured under `e2e/`. Browser binaries may need to be installed with `npx playwright install chromium` on new machines/CI.

## Current MVP surface

The root app now renders an interactive estimate workspace:

- editable estimate rows
- quantity/rate changes with immediate totals
- searchable cost library panel
- click-to-insert linked library items
- basic link-state badges
- in-memory duplicate-as-revision action
- proposal preview tab generated from the live estimate
