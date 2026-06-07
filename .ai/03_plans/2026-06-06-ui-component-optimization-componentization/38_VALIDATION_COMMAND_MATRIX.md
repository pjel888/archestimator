# Validation Command Matrix

**Status:** Implementation-aware command matrix.
**Repo fact:** The TypeScript script is `bun run type-check`, not `bun run typecheck`.

## Storybook MVP Implementation Evidence - 2026-06-06

| Command | Result | Notes |
|---|---|---|
| `bun run storybook -- --host 127.0.0.1 --port 6007` | Passed startup | Port 6006 was already occupied, so this implementation pass used `http://127.0.0.1:6007/` and stopped that temporary server after smoke. |
| `bun run storybook:check-boundary` | Passed | 24 files scanned, 809 inventory rows, 703 story rows. |
| `STORYBOOK_DISABLE_TELEMETRY=1 bun run build-storybook -- --output-dir /tmp/archestimator-storybook-static` | Passed | Static build generated in `/tmp`; generated output is not committed. |
| `bun run build` | Passed | Next app build still succeeds after Storybook-only additions. |
| `bun run type-check` | Passed | TypeScript accepts Storybook config, stories, and tests. |
| `bun run lint` | Passed with warnings | Existing warning surfaces remain; no lint errors. |
| `bun run lint:design-system` | Passed | Storybook additions and touched UI files satisfy design-system lint. |
| Focused Storybook/provider/matrix tests | Passed | `storybook-provider-boundary`, `storybook-plan-matrix`, and focused changed-component DOM tests passed. |
| Local Playwright Storybook smoke | Passed | Seven representative iframe stories loaded with nonblank screenshots and no final-run console/page errors; screenshots saved under `/tmp/archestimator-storybook-<story-id>.png`. |
| In-app Browser plugin smoke | Not available | Browser plugin was installed, but the `iab` browser instance was unavailable in this session; local Playwright was used as the visual fallback. |
| `bun run validate` | Passed | 205 Vitest DOM files passed, 1 skipped; 1514 tests passed, 3 skipped. |

## Docs-Only Plan Refinement

| Situation | Required commands | Expected proof | Notes |
|---|---|---|---|
| Current docs-only closeout | `git status --short --branch`; `git diff --stat`; `git diff --check`; `git diff -- .ai`; `git diff --name-status main...HEAD` | Only intended `.ai` docs/prompt/state/log changes, no whitespace errors | Do not run Storybook/package commands because Storybook is not installed. |
| Root docs already modified | `git diff -- AGENTS.md CLAUDE.md` | Only generated metadata or documented existing branch changes | Do not activate UI usage rules in root docs. |
| Graph/change closeout | code-review-graph `detect_changes` or CLI parity; GitNexus `detect-changes` if available | Docs-only risk or explicit tool fallback note | If MCP transport dies, use CLI/file-backed fallback and record it. |

## Future Package Setup

| Situation | Required commands | Expected proof | Notes |
|---|---|---|---|
| Storybook package install approved | `bun install` | Lockfile updates match approved deps | Inspect `bun.lock` drift before committing. |
| Storybook dev server | `bun run storybook` | Local Storybook URL starts | Use Browser plugin or Playwright only after server starts. |
| Static Storybook build | `bun run build-storybook` | `storybook-static` generated successfully | Generated output should not be committed unless intentionally approved. |
| App build safety | `bun run build` | Next app build passes | Confirms Storybook-only helpers do not leak into app build. |

## Future Component/Story Work

| Situation | Required commands | Expected proof | Notes |
|---|---|---|---|
| Shared primitive source changed | graph impact before edit; focused DOM/unit tests; `bun run lint:design-system`; `bun run validate`; `bun run build-storybook` | Tests pass and Storybook still builds | Button/SearchInput/high-impact primitives require extra caution. |
| Story-only file changed | `bun run build-storybook`; `git diff --check` | Storybook builds with static fixtures | Also run `bun run validate` if source imports changed. |
| Domain story wrapper changed | `bun run build-storybook`; relevant focused DOM tests if production component source changed | No live provider imports; stories render offline | Do not import repositories/actions. |
| Accessibility addon approved | `bun run build-storybook`; Storybook a11y run or manual addon evidence | Violations triaged | Package approval required first. |
| Interaction/play tests approved | Storybook test command selected by future docs | Keyboard/focus scenarios pass | Only after `@storybook/test`/test runner approval. |

## Future App Migration

| Situation | Required commands | Expected proof | Notes |
|---|---|---|---|
| Migration planning only | graph/GitNexus impact for route files; route-specific test inventory | Separate migration plan exists | This is outside current MVP. |
| Production route UI migrated | `bun run validate`; `bun run build`; `bun run lint:design-system`; focused route tests; visual/browser smoke | Route behavior and visual parity proven | Requires Philip approval before starting. |
| Auth/provider route touched | Add `bun run test:e2e` or focused Playwright smoke when appropriate | Protected flow still works | Outside Storybook-only scope. |

## Stop Conditions

- Stop if `package.json` or `bun.lock` changed without recorded package approval.
- Stop if a story imports Supabase/provider/server-action code.
- Stop if Tailwind v4 styles do not load in Storybook.
- Stop if Storybook static build fails.
- Stop if production app migration appears in a Storybook-only branch.
