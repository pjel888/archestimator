# Cursor Rules — Archestimator SOTA Configuration

This folder is Cursor's project-level ruleset. Rules are markdown files with YAML frontmatter that Cursor auto-loads based on `alwaysApply` (always in context) or `globs` (loaded when matching files are touched).

## Rule Architecture

### Always-Loaded (alwaysApply: true)

Loaded into Cursor's context on every interaction. Kept lean to preserve context budget.

| File | Purpose |
|---|---|
| `00-archestimator-project-brain.mdc` | Stack, mission, authority hierarchy, `.ai/` folder map, standing Cloudflare authorization |
| `01-shared-worktree-safety.mdc` | Multi-agent + multi-human coordination discipline. No auto-branch, no auto-push, file ownership, conflict detection |
| `02-validation-and-evidence.mdc` | Validation commands (`bun run validate`, `bun run cf:*`, `bun run ops:*`), evidence classes, completion gates, TDD discipline |
| `03-agent-orchestration.mdc` | When to delegate vs direct, parallel execution patterns, task delegation template, failure recovery |

### Stack-Surface (globs: triggered by file pattern)

Loaded when matching files are open/edited. Deep, codebase-specific guidance.

| File | Triggers | Purpose |
|---|---|---|
| `10-nextjs-16-rsc-server-actions.mdc` | `src/app/**`, `src/lib/**/actions.ts`, `src/middleware.ts`, `src/app/api/**/route.ts` | Next.js 16 Cache Components, Server/Client boundary, Server Action auth checklist |
| `11-cloudflare-d1-repositories.mdc` | `src/lib/repositories/**`, `migrations/**`, `cloudflare-env.d.ts` | Repository boundary, app-layer authz (no RLS), SQL discipline, schema map |
| `12-better-auth-security.mdc` | `src/lib/auth/**`, `src/middleware.ts`, `src/app/api/auth/**`, `src/lib/collaboration/invites/**`, `src/lib/publication/**` | Better Auth on D1, credential material taxonomy, defense-in-depth authz |
| `13-cloudflare-workers-bindings.mdc` | `wrangler.jsonc`, `open-next.config.*`, `cloudflare-env.d.ts`, `src/lib/cloudflare/**`, `src/lib/collaboration/**`, `scripts/cf-*`, `src/lib/email/**` | Cloudflare bindings, DO/Queue/Email/Images, cost posture, free-tier discipline |
| `14-design-system-components.mdc` | `src/components/**`, `src/app/globals.css`, `src/app/**/page.tsx`, `DESIGN.md`, `scripts/enforce-app-design-system.mjs` | SF Pro / 12px max / xs radius tokens, Tailwind v4 CSS-first, Storybook review surface |
| `15-observability-debugging.mdc` | `src/lib/observability/**`, `scripts/ops-*`, `scripts/cf-*`, `scripts/launch-*`, `scripts/perf-*`, `logs/**` | Agent debug snapshot, alert scenarios S-01-S-07, incident lifecycle, Workers Logs proof |
| `16-state-tanstack-zustand.mdc` | `src/hooks/**`, `src/stores/**`, `src/app/providers.tsx` | TanStack Query (server state) + Zustand (UI state) split, optimistic mutation pattern |
| `17-testing-discipline.mdc` | `tests/**`, `e2e/**`, `**/*.test.*`, `**/*.spec.*`, `vitest.config.*`, `playwright.config.*` | Bun unit + Vitest DOM + Playwright E2E, TDD red-green-surface, mutating-spec env flags |
| `18-publication-share-security.mdc` | `src/lib/publication/**`, `src/app/share/**`, `src/app/invite/**`, `src/app/api/share/**`, `src/components/share/**` | Hashed token storage, P10 lockout, snapshot integrity, adversarial scenarios |

### Language Library (paths: triggered by file extension)

The `angular-*.mdc`, `arkts-*.mdc`, `cpp-*.mdc`, `csharp-*.mdc`, `dart-*.mdc`, `fsharp-*.mdc`, `golang-*.mdc`, `java-*.mdc`, `kotlin-*.mdc`, `nuxt-*.mdc`, `perl-*.mdc`, `php-*.mdc`, `python-*.mdc`, `react-*.mdc`, `ruby-*.mdc`, `rust-*.mdc`, `swift-*.mdc`, `typescript-*.mdc`, `vue-*.mdc`, `web-*.mdc` files are a generic language library installed by ECC (Everything Claude Code). They only fire on matching file extensions and provide baseline style/hook/pattern/security/testing guidance per language.

For Archestimator-specific overrides, the `00-18-*.mdc` rules take precedence in your reasoning because they encode actual project reality.

## Legacy Compatibility

`.cursorrules` (repo root) is the legacy single-file rule format. Some Cursor versions and external tools still read it. It's a concise entry point that points back to this folder.

## Related Configuration

| File | Purpose |
|---|---|
| `.cursor/mcp.json` | MCP servers (code-review-graph, chrome-devtools) |
| `.cursor/hooks.json` | Cursor lifecycle hooks (session start/end, before/after shell, file edit, MCP, etc.) |
| `.cursor/agents/` | Agent definitions (ECC-managed) |
| `.cursor/skills/` | Skill library (ECC-managed) |
| `.cursor/commands/` | Slash commands (ECC-managed) |
| `.cursor/scripts/` | Helper scripts |
| `.cursor/ecc-install-state.json` | ECC install state snapshot |

## Project Brain (Read First)

Cursor rules are a subset of the project brain. For full authority:

1. `AGENTS.md` (repo root) — entry point
2. `.ai/10_state/current-state.md` — FAST PATH block at top, then `rg` for task area
3. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — loop rules, validation matrix
4. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` — agent/payload/proof contracts
5. `.ai/06_specs/` — feature specifications
6. `DESIGN.md` — design system (alpha-stage)
7. `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` — 892-line SOTA execution directive for non-trivial work

## Authority Hierarchy (When Sources Conflict)

1. **User intent** (explicit current request) — product goal
2. **Repo reality** (`AGENTS.md`, `.ai/`, source, tests, migrations, `wrangler.jsonc`) — implementation truth
3. **Installed framework docs** (`node_modules/next/dist/docs/`, Cloudflare docs via MCP) — version behavior
4. **Local installed skills** (`.cursor/skills/`, `.opencode/skills/`) — workflows
5. **Older plans + model memory** — low authority

## Maintenance

- **Add Archestimator-specific rules** with numeric prefixes (`19-`, `20-`, ...) to control load order
- **Keep `alwaysApply: true` lean** (4-5 rules max) to preserve context budget
- **Prefer `globs:` targeting** for surface-specific guidance
- **Update this README** when adding/removing rules
- **Run `bun run validate:agents`** after structural changes (if available) to catch stale schema

## What Was Removed (2026-07-10 SOTA Upgrade)

The following `common-*.mdc` files were removed because they referenced `~/.claude/agents/` (a different tool's path) and contained generic advice already covered by the new `00-03-*.mdc` alwaysApply rules:

- `common-agents.mdc` → replaced by `03-agent-orchestration.mdc`
- `common-coding-style.mdc` → replaced by stack-specific rules `10-18-*.mdc`
- `common-code-review.mdc` → covered by `02-validation-and-evidence.mdc` completion audit
- `common-development-workflow.mdc` → replaced by `02-validation-and-evidence.mdc` + `03-agent-orchestration.mdc`
- `common-git-workflow.mdc` → replaced by `01-shared-worktree-safety.mdc`
- `common-hooks.mdc` → covered by `.cursor/hooks.json` itself
- `common-patterns.mdc` → replaced by stack-specific rules `10-18-*.mdc`
- `common-performance.mdc` → covered by `15-observability-debugging.mdc` (perf scripts)
- `common-security.mdc` → replaced by `12-better-auth-security.mdc` + `18-publication-share-security.mdc`
- `common-testing.mdc` → replaced by `17-testing-discipline.mdc`

The language-specific library (`react-*.mdc`, `typescript-*.mdc`, etc.) is retained as a reference — those rules only fire on matching file extensions.
