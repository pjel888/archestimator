# Archestimator

Contractor-first construction estimating and proposal workspace.

## Current stack baseline

- Next.js 16 App Router
- React 19
- Bun package manager/runtime
- TypeScript
- Tailwind CSS v4
- Local-first JSON runtime repository while the product/data model changes rapidly

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

## Local data

Tracked starter data lives in:

```text
data/local/seed.json
```

Runtime edits are written to:

```text
data/local/runtime.json
```

`runtime.json` is ignored by git. Delete it to reset from seed on the next app load, or set `ARCHESTIMATOR_DATA_PATH` to point the app at another local JSON file.

## UI component system

Archestimator should grow its own internal UI library early. Prefer shared primitives under `src/components/ui/` and token helpers under `src/lib/ui/` before creating one-off screen markup. Improve primitives as use cases evolve. Do not install Storybook unless Philip explicitly approves it.

Current shared primitives:

- `Button`
- `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`
- `Field`, `TextInput`, `Textarea`
- `StatCard`
- `TabList`, `TabButton`
- `StatusPill`

## Current MVP surface

The app currently includes:

- `/` project dashboard
- `/projects/[projectId]` editable estimate workspace
- searchable cost library panel
- click-to-insert linked library items
- local JSON save action
- persisted revision action
- proposal terms builder
- immutable proposal snapshot issuing
- `/proposals/[proposalId]` print-ready proposal package screen

Playwright smoke tests are configured under `e2e/`. Browser binaries may need to be installed with `npx playwright install chromium` on new machines/CI.
