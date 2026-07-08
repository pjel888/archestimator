# 00 - Agent Coordination

## Mode

Planning-only, multi-lane audit. No implementation changes.

## Active Constraints

- Do not edit source, tests, migrations, provider resources, environment files, or runtime config as part of this pack.
- Write only inside this plan folder.
- Stay on the current branch and worktree.
- Treat existing user/human changes as unrelated unless directly required for this pack.
- Use official docs for current framework guidance.
- Use direct source reads as authoritative over GitNexus because GitNexus reported the repo index as four commits behind HEAD.

## Skill Application

Skill-to-plan mapping:

- `react-doctor`: requires any future React changes to run `bun run doctor -- --verbose`; also informs the giant-component and hook-dependency risk analysis.
- `vercel:react-best-practices`: anchors Client/Server boundary, state ownership, memoization, and accessibility expectations.
- `ponytail`: keeps the plan focused on measured bottlenecks, deletion/reuse, and avoiding new abstractions without payoff.
- `Refactor Safely`: requires staged migration, blast-radius analysis, parity tests, and no broad refactor without evidence.
- `performance-goal` and `ce-optimize`: require a real evaluator and before/after metric contract before optimization.
- `gitnexus`: supplies graph/context evidence, but direct reads are authoritative for exact current state.
- `ultraqa`: supplies adversarial scenario matrix and proof-before-claim posture.
- `ultragoal` and `ultrawork`: supply durable ledger and independent lane discipline.
- `autopilot`, `plan`, and `ralplan`: supply planning loop, consensus structure, and readiness verdict.
- `autoresearch` and `autoresearch-goal`: supply source-backed research validation.
- `ce-plan` and `ce-strategy`: supply implementation-ready plan structure and decision-record framing.
- `dispatching-parallel-agents` and `subagent-driven-development`: supply bounded agent lanes and integration discipline.
- `ralph`: retained as execution-loop fallback for a later implementation phase; not activated for coding in this planning turn.

## Multi-Agent Evidence

| Lane | Role | Output Used |
|---|---|---|
| Repository exploration | `explore` | Current route, query cache, repository, subtree, render, and virtualization map. |
| Official-doc research | `researcher` | Current React, Next.js, TanStack, Cloudflare D1, SQLite, and web.dev guidance. |
| Architecture | `architect` | Normalized graph target and phased migration strategy. |
| Test strategy | `test-engineer` | Existing coverage map, missing Chrome/D1 proof, fixture tiers, and budgets. |

## Coordination Rules For Future Implementation

- A lead agent owns integration, test selection, and final claims.
- Implementation lanes may split only by disjoint write scope:
  - D1/query proof and indexes.
  - Browser/performance evaluator.
  - Normalized graph read model.
  - Incremental totals and selector migration.
  - Mutation rollback/entity patch migration.
  - UI/interaction affordances.
- No lane may rewrite the entire estimate sheet in one pass.
- Every lane must add or update its own focused tests before changing behavior.
- Every lane must report changed files, evidence commands, and residual risk.

## Required Review Passes

Before implementation begins:
- Product scope review: confirm the sheet workflows that matter for MVP.
- Architecture review: confirm normalized graph/store boundary.
- Performance review: confirm Phase 0 baseline and metric budgets.
- QA review: confirm adversarial scenario matrix.
- Security/data review: confirm D1 proof redaction and authorization gates.

Before implementation ships:
- Maker/checker split for code and tests.
- React Doctor after React changes.
- Targeted vitest + browser performance proof.
- D1 query-plan proof.
- `git diff --check`.
- Plan evidence updated.

