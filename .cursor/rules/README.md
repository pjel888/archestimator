# Cursor Rules - Archestimator

Cursor is a project adapter under the authority of `AGENTS.md` and `.ai/`.
Rules use YAML frontmatter: `alwaysApply` for the one compact startup contract,
and `globs` for guidance loaded only on relevant files.

## Load Architecture

### Always Loaded

| File | Purpose |
|---|---|
| `00-archestimator-project-brain.mdc` | Lean authority, Supermemory, shared-worktree, routing, evidence, and stop contract |

Keep exactly one project rule marked `alwaysApply: true`, below 8 KiB. Durable
detail belongs in `AGENTS.md` or `.ai/`, not duplicated here.

### Project Surfaces

| File | Triggered surface | Purpose |
|---|---|---|
| `10-nextjs-16-rsc-server-actions.mdc` | Next app/routes/actions | Next.js 16 server/client and action boundaries |
| `11-cloudflare-d1-repositories.mdc` | repositories, migrations, env types | D1 repository and application-authorization discipline |
| `12-better-auth-security.mdc` | auth, middleware, invites, publication | Better Auth and credential-material boundaries |
| `13-cloudflare-workers-bindings.mdc` | Wrangler, Cloudflare adapters | Worker bindings, DO/Queue/Email/Images, cost posture |
| `14-design-system-components.mdc` | components, layouts, design files | UI primitives, Tailwind v4, proportional visual evidence |
| `15-observability-debugging.mdc` | observability and ops scripts/logs | Local diagnostics and hosted-proof boundaries |
| `16-state-tanstack-zustand.mdc` | hooks, stores, providers | Server-state and UI-state ownership |
| `17-testing-discipline.mdc` | tests and runner configs | Behavior-focused tests after the shared test gate selects them |
| `18-publication-share-security.mdc` | publication/share/invite | Token, lockout, snapshot, and denial-path security |

Generic language rules (`typescript-*`, `react-*`, `python-*`, and peers) are
installed reference material and load only through their globs. The numbered
Archestimator rules and canonical repo contracts take precedence.

## Hooks

`.cursor/hooks.json` intentionally registers only five local events:

| Event | Behavior |
|---|---|
| `sessionStart` | runs `bun run supermemory:ensure`; on failure, reports degraded memory and continues with `.ai` |
| `beforeShellExecution` | blocks actual Git `--no-verify` flags and foreground dev servers outside tmux; strict profile adds reminders |
| `beforeReadFile` | warns on likely secret/credential paths |
| `beforeSubmitPrompt` | warns on common secret formats |
| `beforeTabFileRead` | blocks likely secret/credential paths |

Hook commands must point to existing scripts under `.cursor/hooks/`. They must
not delegate to absent repo/plugin scripts. Keep descriptions aligned with
observable behavior; do not add edit, stop, compaction, MCP, or subagent logging
hooks without a measured benefit and focused deterministic contract evidence.

## Related Configuration

| Path | Purpose |
|---|---|
| `.cursor/hooks.json` | Cursor lifecycle safety hooks |
| `.cursor/agents/` | Optional role definitions selected by the lead |
| `.cursor/skills/` | Installed workflow library |
| `.cursor/commands/` | Slash commands |
| `.cursor/mcp.json` | Project MCP configuration |
| `.cursor/ecc-install-state.json` | Installer snapshot; not runtime authority |

## Project Brain

1. `AGENTS.md`
2. the marked FAST PATH at the top of `.ai/10_state/current-state.md`
3. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` when execution rules apply
4. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` for agent and payload work
5. `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`
   when orchestration is selected
6. task-specific specs, decisions, roadmap, and `DESIGN.md` only as needed

The planning prompt suite is under `.ai/08_prompts/000_Planning Prompts/`; do
not copy its contents or line count into Cursor rules.

## Maintenance

- Prefer a targeted glob rule over more always-loaded text.
- Point to source-owned facts; do not copy migration, binding, schedule, test, or component counts.
- Keep agent descriptions capability-based and opt-in. Avoid forced, proactive, or automatic activation language.
- Preserve shared-worktree changes and stay on the current checkout.
- After changes, use `git diff --check`, `bun run validate:agents`, and the
  narrowest relevant Cursor resolver/static check. Run a hook contract test only
  when the user explicitly authorizes testing for the current task.

Shared-worktree, evidence, and orchestration guidance is consolidated in the
compact `00` rule to reduce per-turn context without removing those contracts.
