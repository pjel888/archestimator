# Archestimator Agent Entry Point

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project intelligence root

All AI agents must use `.ai/` as the shared project brain.

Start here:
1. `.ai/README.md`
2. `.ai/00_system/ai-folder-canonical-map.md`
3. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
4. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
5. `.ai/10_state/current-state.md`
6. `.ai/10_state/decisions.md`
7. `DESIGN.md`

## Core rules

- Do not create separate tool-specific knowledge silos.
- Keep durable decisions, plans, specs, prompts, skills, and agent instructions inside `.ai/`.
- Do not store secrets in the repository or `.ai`.
- Stack baseline is Next.js 16 + React 19 + Bun + TypeScript + Tailwind v4 + Supabase/Postgres.
- Supabase/Postgres is active for Archestimator project `ebxxqidacheyapmmzavr`; never mutate unrelated provider projects such as SlateCamp.
- Closed-beta cost posture: keep Supabase PITR disabled unless the owner explicitly re-approves the extra cost; rely on daily physical backups plus manual logical dumps for the cheaper beta path.
- If project reality changes, update `.ai/10_state/current-state.md` and the relevant canonical doc.
- Tool-specific adapters and model payloads must stay subordinate to
  `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and `.ai/12_agents/`.

## Current stage

Archestimator is preparing a closed beta. Prioritize beta auth, estimating workflows, cost library, proposal package, collaboration/publication proof, provider evidence, and design-system consistency.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **archestimator** (13457 symbols, 24277 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/archestimator/context` | Codebase overview, check index freshness |
| `gitnexus://repo/archestimator/clusters` | All functional areas |
| `gitnexus://repo/archestimator/processes` | All execution flows |
| `gitnexus://repo/archestimator/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

<!-- compound-engineering-plugin:start -->
## Compound Engineering Plugin

This project has the [Compound Engineering Plugin](https://github.com/EveryInc/compound-engineering-plugin) installed for OpenCode. Agents must leverage these skills for every applicable task.

### Always Use These Skills

| For | Use |
|-----|-----|
| Planning / architecture decisions | `/ce-plan`, `/ce-brainstorm`, `/ce-strategy` |
| UI / frontend work | `/ce-frontend-design`, `/ce-polish-beta` |
| Code review | `/ce-code-review`, `/ce-doc-review` |
| Debugging | `/ce-debug`, `/ce-report-bug` |
| Performance / optimization | `/ce-optimize` |
| Testing in browser | `/ce-test-browser` |
| Commit / PR workflow | `/ce-commit`, `/ce-commit-push-pr` |
| Code simplification | `/ce-simplify-code` |
| Project health check | `/ce-product-pulse` |
| Multi-agent coordination | `/ce-work`, `/ce-sessions` |

### Rules

- **MUST use `/ce-plan` before any multi-step implementation.** Do not start coding without a plan.
- **MUST use `/ce-code-review` before merging substantial work.**
- **MUST use `/ce-frontend-design` or `/ce-polish-beta` for any UI/visual changes.**
- Agent skills in `~/.config/opencode/agents/ce-*` are available for specialized review — delegate to them when their domain matches.
<!-- compound-engineering-plugin:end -->

<!-- impeccable:start -->
## Impeccable Design System

This project uses [Impeccable](https://impeccable.style/) for design quality enforcement. Skill files live in `.agents/skills/impeccable/`, `.claude/skills/impeccable/`, and `.cursor/skills/impeccable/`.

### Always Do

- **MUST load the impeccable skill before any UI/design work.** Use `skill(name="impeccable")` to load the full design workflow.
- Follow `PRODUCT.md` and `DESIGN.md` as the source of truth for all visual decisions.
- Run `node .agents/skills/impeccable/scripts/context.mjs` at the start of any design session.
- Read the relevant command reference (`reference/craft.md`, `reference/polish.md`, etc.) before using any impeccable sub-command.
- **Never skip contrast verification** — body text must hit ≥4.5:1 against its background.
- **Never use gray text on colored backgrounds** — use a darker shade of the background's hue instead.

### When Building UI

- Prefer the impeccable workflow over ad-hoc styling.
- Use existing design tokens from `src/app/globals.css` — do not invent new colors or spacing.
- All app/workshop UI must use SF Pro, max 12px, 3px radius, 0 letter-spacing, regular/medium weights.
- Refer to `DESIGN.md` before any visual change.
<!-- impeccable:end -->

<!-- ui-component-library:start -->
## UI Component Library

This project has a comprehensive UI component library with 60+ components and 85+ Storybook stories in `src/components/ui/`. All components are barrel-exported from `src/components/ui/index.tsx`.

### Always Do

- **MUST check `src/components/ui/` before creating any new UI markup.** Reuse existing components.
- **NEVER create one-off button, input, card, badge, or modal markup** — use the library components.
- Import from the barrel: `import { Button, Card, Tabs } from "@/components/ui"`.
- Review available components in Storybook before deciding something doesn't exist.

### Key Components

| Category | Available |
|----------|-----------|
| Actions | `Button`, `IconButton`, `ButtonGroup`, `ButtonLink`, `DropdownMenu`, `ToolbarIconButton` |
| Forms | `ControlInput`, `ControlTextarea`, `ControlSelect`, `SearchInput`, `Checkbox`, `RadioGroup`, `Switch`, `NumberInput`, `CurrencyInput`, `DatePicker`, `FileUpload`, `CreatableCombobox` |
| Overlays | `Dialog`, `Modal`, `AppModal`, `Sheet`, `Drawer`, `Popover`, `Tooltip`, `HoverCard`, `CommandDialog`, `ConfirmDialog` |
| Navigation | `Tabs` (+`TabPanel`), `Breadcrumbs`, `PageHeader`, `Pagination`, `ContextMenu` |
| Data | `DataTable`, `Tree`, `Timeline`, `Progress` |
| Feedback | `Toast`, `Alert`, `Banner`, `Spinner`, `Skeleton`, `EmptyState` |
| Layout | `Card`, `Panel`, `Separator`, `Accordion`, `ScrollArea`, `BulkActionToolbar` |
| Domain | `FinancialTotalCard`, `EstimateCell`, `StatusBadge`, `ConfidenceIndicator`, `Avatar` |
| Utility | `Badge`, `Chip`, `HeaderIconToolbar`, `RouteLoadingOverlay` |

### Rules

- **NEVER duplicate an existing component pattern.** If you need a variant, extend the component.
- New components must follow `DESIGN.md`: SF Pro, max 12px, 3px radius, 0 letter-spacing, regular/medium weights.
- New components must be barrel-exported from `src/components/ui/index.tsx`.
- New components must have Storybook stories.
- Run `bun run lint:design-system` after any component change.
<!-- ui-component-library:end -->
