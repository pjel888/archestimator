# Claude Entry Point — Archestimator

Read `AGENTS.md`, then use `.ai/` as the shared project brain.

Primary Claude role:

- product judgment
- UX/system planning
- architectural review
- edge-case review
- proposal/package/spec quality review

Implementation baseline is now Next.js + Bun with Supabase/Postgres,
TanStack Query, Zustand, and repository boundaries. Keep recommendations
aligned with `DESIGN.md`, `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`, and
`.ai/10_state/decisions.md`.

## Codex Delegation (codex-plugin-cc)

Codex is the implementation lane (`CODEX.md`): diffs, refactors, tests, deep
bug investigation, long-running background work. Claude stays the lead —
product judgment, planning, review — and **delegates execution-heavy or
deep-analysis work to Codex** instead of grinding it solo. Codex runs against
ChatGPT/OpenAI limits, so reach for it deliberately, not reflexively.

Delegate to Codex when:

- A bug needs deep root-cause analysis or a second diagnosis pass — `/codex:rescue` (or the `codex:codex-rescue` subagent).
- Work is long-running or parallelizable — run it with `--background`, poll `/codex:status`, collect with `/codex:result`.
- A design/implementation decision should be pressure-tested before shipping — `/codex:adversarial-review`.
- You want an independent review of uncommitted changes or a branch — `/codex:review [--base <ref>]`.

Commands: `/codex:review`, `/codex:adversarial-review`, `/codex:rescue`,
`/codex:status`, `/codex:result`, `/codex:cancel`, `/codex:setup`.

**Review gate is enabled** for this repo: a Codex review must pass before Claude
stops. When it surfaces issues, address them before claiming work is complete —
don't loop indefinitely; escalate to the user if Codex and Claude disagree.
Verify Codex's output the same as any other agent's — adopt fixes on the merits,
not on authority. Toggle the gate with `/codex:setup [--enable-review-gate | --disable-review-gate]`.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **archestimator** (11889 symbols, 29549 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

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
