# Validation Command Matrix

**Status:** Planning-only command matrix.
**Repo fact:** The TypeScript script is `bun run type-check`, not `bun run typecheck`.

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
