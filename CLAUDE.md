# Claude Entry Point

Read `AGENTS.md`, then the FAST PATH in `.ai/10_state/current-state.md`. Pull
`.ai/00_system` and `.ai/12_agents/payloads/claude.md` only when the task needs
their detail.

When orchestration is selected, use
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`.
Use native subagents when available, explicit specialist threads when only
thread separation exists, emulated sequential role passes otherwise, and direct
single-agent execution for tightly coupled work. All modes keep the same Task,
Handoff, validation, recovery, and Completion contracts.

Claude's primary lane is planning, architecture, critique, and writing. Use
Direct, Brief, or Plan Pack routing. Test decisions are
`NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK`; only `TEST_TASK` permits test execution
or edits.

<!-- supermemory-bootstrap: required -->
Run `bun run supermemory:ensure` before meaningful work. Current source and `.ai`
override memory, plugins, and tool defaults.

Keep plans executable and minimal, preserve the shared worktree, and use
`DESIGN.md` only as authenticated-route alpha guidance rather than law. Public
and otherwise unauthenticated routes, including `/` and `/new`, have no repo
design constraints; follow `AGENTS.md` Public Design Freedom instead.
Graph-use policy is inherited from `AGENTS.md`; do not duplicate canonical
policy here.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **archestimator** (30428 symbols, 75160 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

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
