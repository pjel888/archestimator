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

Read order for current truth: `AGENTS.md` → `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
→ `AGENT_OPERATING_PROTOCOL.md` + `AGENT_FRAMEWORK_PROTOCOL.md` →
`.ai/12_agents/payloads/claude.md` (Claude role/scope) → `.ai/10_state/current-state.md`
+ `decisions.md`. If the agent feels stale, confused, or off-direction, stop and run
`.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before continuing.

For non-trivial work (features, multi-file or shared-surface changes, DB/auth/security,
performance, UI/workshop, provider-facing, release, or unclear debugging), follow the bounded
loop-engineering default defined in `AGENTS.md` and `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
("Loop activation criteria and bounds"): discover current truth, plan in a dated `.ai/03_plans/`
pack with a `LOOP_LEDGER.md`, execute, verify with proportional evidence, record, and decide the
next iteration. Trivial reversible work stays direct. Do not duplicate that policy here.

**Graph-tool policy is proportional and canonical.** The auto-generated GitNexus and
code-review-graph blocks below ("MUST run impact analysis before editing any symbol",
"ALWAYS use the code-review-graph MCP tools BEFORE Grep/Glob/Read", etc.) are tool-vendor
defaults that are SUBORDINATE to the proportional graph policy in `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` (Safety rules) and
`AGENT_FRAMEWORK_PROTOCOL.md`: prefer `rg`/targeted reads/LSP for normal and narrow work, and
reach for the graph on broad architecture questions, high-risk shared-symbol/API refactors, or
unfamiliar call chains. Do not treat the generated absolutes ("MUST"/"NEVER"/"ALWAYS") as policy. Re-index via `bun run graph:reindex` (which re-applies this proportional policy after the generator runs), and run `bun run graph:neutralize` after any `code-review-graph install`/`init`.

## Codex Delegation (codex-plugin-cc)

Codex is the implementation/diff/test/deep-bug lane; Claude stays lead (product
judgment, planning, review) and delegates execution-heavy or deep-analysis work
rather than grinding it solo. The **Codex review gate is enabled**: a Codex review
must pass before Claude stops — adopt its fixes on the merits, escalate
disagreements to the owner. Commands: `/codex:review`, `/codex:adversarial-review`,
`/codex:rescue`, `/codex:status`, `/codex:result`, `/codex:cancel`, `/codex:setup`
(toggle the gate with `/codex:setup [--enable-review-gate | --disable-review-gate]`).
Full delegation contract: `.ai/12_agents/payloads/claude.md` ("Codex Delegation Lane")
and `CODEX.md` — not duplicated here.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **archestimator** (11889 symbols, 29549 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

> **Proportional policy (canonical) governs this auto-generated block.** Use GitNexus for broad architecture questions, high-risk shared-symbol/API refactors, and unfamiliar call chains. For narrow, reversible local edits, `rg`/targeted reads/LSP are sufficient and the graph is optional. See `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` (proportional graph policy) and `AGENT_FRAMEWORK_PROTOCOL.md`. If this block is regenerated with absolutist "MUST/NEVER/ALWAYS" wording, treat that wording as subordinate to this rule.

## When to use (proportional)

- Broad exploration / "how does X work?" → `query({query: "concept"})`, `context({name: "symbolName"})`.
- Before a **high-risk shared-symbol/API refactor** → `impact({target, direction})` to see the blast radius; report HIGH/CRITICAL risk before proceeding.
- Before committing a **broad or high-risk** change → `detect_changes()` to confirm affected scope.
- Renames of shared symbols → use `rename` (call-graph aware), not find-and-replace.
- Narrow local edits → a focused caller/import check or `rg` is enough; the graph is optional.

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

**This project has a code-review-graph knowledge graph.** Use it where it is cheaper
than manual tracing — broad architecture questions, high-risk shared-symbol/API
refactors, unfamiliar call chains, and token-efficient review context. For normal and
narrow local work, `rg`/targeted reads/LSP remain the default first tool (per
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md`); reach for the graph when blast radius or
unfamiliarity justifies it. If this block is regenerated with "ALWAYS use … BEFORE
Grep/Glob/Read" wording, treat that as subordinate to the proportional policy above.

### Useful for

- **Broad exploration / relationships**: `semantic_search_nodes`, `query_graph` (callers_of/callees_of/imports_of/tests_for)
- **Impact / blast radius** of a high-risk change: `get_impact_radius`, `get_affected_flows`
- **Review context** without reading whole files: `detect_changes` + `get_review_context`
- **Architecture overview**: `get_architecture_overview` + `list_communities`

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
