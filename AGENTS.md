# Archestimator Agent Contract

## Mission

Ship Archestimator quickly for first users. This is alpha/pre-beta software, not
a released production system. Ordinary local repository edits are development
work, not production change events. Prefer direct replacement, deletion, and
fix-forward iteration. Do not invent compatibility layers, feature flags,
rollout ceremony, hosted proof, or approval pauses for hypothetical users.

Go deep on the real blast radius, then make the smallest coherent change.
Over-engineering, unnecessary testing, excessive planning, and process-only
artifacts are workflow bugs.

## Authority And Startup

Current source and this file are authoritative. `.ai/00_system` supplies detail;
tool payloads and prompts are adapters and cannot override it. When orchestration
is selected, `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`
is the canonical lifecycle and handoff contract.

At session start:

1. Run `bun run supermemory:ensure`.
2. Read only the `FAST PATH:START` to `FAST PATH:END` block in
   `.ai/10_state/current-state.md`.
3. Inspect `git status --short --branch` before edits.
4. Pull deeper docs only for the surface being changed.

<!-- supermemory-bootstrap: required -->
Supermemory failure is degraded tooling, never a blocker for unrelated work.
Search it before broad, non-trivial, or recovery work. Add one sanitized durable
memory only when project truth materially changes. Never store secrets.

## Three Execution Lanes

Choose the lightest lane that can finish the request.

### Direct

Use for clear, bounded work. Inspect the relevant source, edit, verify with the
cheapest decisive evidence, and finish. No written plan, ledger, reviewer,
subagent, or durable workflow state is required.

### Brief

Use for multi-file, moderately risky, or ambiguous work. Keep a short in-session
plan with target result, affected surface, sequence, evidence, and stop condition.
Do not create a dated plan pack.

### Plan Pack

Use only when explicitly requested or when a wrong change is genuinely expensive
to reverse: destructive D1/data migrations, live auth/token compatibility,
security boundaries, broad architecture replacement, or coordinated multi-owner
work. Follow `.ai/00_system/PLAN_PACK_EXECUTION_POLICY.md` and the planning suite.

High blast radius increases analysis depth, not ceremony. Internally resolvable
dependencies are work, never human blockers.

## Execution Loop

For non-trivial work use a lightweight loop:

`DISCOVER -> DECIDE -> EDIT -> VERIFY -> FINISH`

- Discover only the evidence-supported direct and transitive blast radius.
- Resolve ordinary reversible decisions autonomously.
- Prefer deletion, existing utilities, and current patterns.
- Add dependencies only when explicitly requested or demonstrably necessary.
- Preserve unfamiliar concurrent changes and reread shared files before edits.
- Stop when the requested result is implemented and sufficiently evidenced.

Use subagents only for independent bounded work when the time or coverage gain
clearly exceeds coordination cost. The lead owns integration and the final claim.
Use the directive above for native, parallel-thread, emulated-pass, and
single-agent fallback behavior.

## Verification And User Test Gate

Verification is required. Automated testing is user-controlled.

Do not create, expand, repair, or run automated tests, test suites, builds as
test gates, browser automation, screenshots, Storybook, or visual QA unless the
user explicitly requests testing for the current task. Use:

- `NOT_REQUIRED`: default; source, diff, type/LSP, lint, static, dry-run, or
  narrow runtime evidence.
- `TEST_PROPOSAL`: name the risk and exact command when a test would materially
  improve confidence; do not run it.
- `TEST_TASK`: the user explicitly requested testing; execute only that scope.

Static contract validators for docs/prompts are not product tests and may run
when those contracts change. Never claim unrun tests passed or local evidence is
hosted/production proof.

## Repository And Git Safety

Assume humans and other agents share the current worktree.

- Stay on the current branch/worktree.
- Never reset, clean, stash, revert, overwrite, or delete unfamiliar work.
- Do not create/switch/delete branches or worktrees, commit, push, force-push,
  or rewrite history unless explicitly requested.
- Keep diffs small, scoped, and reversible.
- No secrets, raw tokens, private URLs, or sensitive logs in Git or `.ai`.

These safety rules protect real shared state. They must not be stretched into
approval gates for ordinary local implementation.

## Stack And Provider Boundaries

Stack: Next.js 16, React 19, Bun, TypeScript, Tailwind v4, Cloudflare
Workers/OpenNext, D1, R2, Durable Objects, Queues/Cron, Images, Email, Better
Auth, TanStack Query, and Zustand.

This is not the Next.js in model memory. Read the relevant guide under
`node_modules/next/dist/docs/` before changing framework APIs or conventions.

`wrangler.jsonc` is the executable source for provider truth. Current resources:

- Worker `archestimator-proof`
- D1 `ARCH_DB`
- R2 `ARCH_UPLOADS_R2`
- Durable Objects `COLLAB_ROOMS`, `GLOBAL_PRESENCE`, `SUPPORT_INBOX`
- Queues `UPLOAD_JOBS_QUEUE`, `CLIENT_PORTAL_NOTIFICATIONS_QUEUE`
- Images `IMAGES`
- Email `EMAIL`
- Crons `0 3 * * *`, `15 3 * * *`, `30 3 * * *`

Philip grants standing authorization for changes inside those bound resources,
including active migrations in `migrations/`, scoped SQL, schema/index/query
work, integration configuration, and fix-forward repairs. Do not mutate legacy
`supabase/migrations/`, Supabase project `ebxxqidacheyapmmzavr`, the unrelated
Cloudflare `archestimator` project, other accounts, paid add-ons, or unbound
resources without explicit approval.

Actual external deployment, paid services, irreversible data loss, credential-
gated actions, and out-of-scope systems remain real authorization boundaries.

## Task-Specific Pull Rules

- Runtime/route/D1 debugging: start with `bun run ops:agent-debug-snapshot`, then
  `bun run logs:debug` or targeted `logs:tail`/`logs:explain`.
- Performance/loading/mount work: read
  `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md`.
- Agent framework/payload/proof work: read
  `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.
- Validation choices: read `.ai/00_system/VALIDATION_MATRIX.md`.
- UI: use `DESIGN.md` as alpha guidance, not law; do not block Philip-directed
  design changes on design-system ceremony.
- GitHub security work: use live GitHub state, redact evidence, and never claim
  hosted controls from local checks.

## Completion

Before claiming completion, reconcile every requested requirement against fresh
evidence. Continue while safe in-scope work remains. `TECH_BLOCKED` is reserved
for a core deliverable that remains impossible after materially different local
fallbacks fail. Optional tools, memory, reviewers, tests without authorization,
hosted proof, and release evidence are not implementation blockers.

Report the result, changed files, decisive evidence, and real remaining risk.
Do not ask permission for clear, reversible, already-requested local work.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **archestimator** (29075 symbols, 71282 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
