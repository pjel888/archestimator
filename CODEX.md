# Codex Entry Point — Archestimator

Read `AGENTS.md`, then use `.ai/` as the shared project brain.

Primary Codex role:
- implementation
- refactoring
- user-authorized testing and QA
- PR-ready diffs
- validation evidence

Implementation baseline is Next.js + Bun on Cloudflare Workers/OpenNext with
D1, R2, Durable Objects, Queues/Cron, Email, Images, Better Auth, TanStack
Query, Zustand, and repository boundaries. Codex role, scope, evidence, and
safety policy live in `.ai/12_agents/payloads/codex.md` and
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`; durable implementation decisions
belong in `.ai/10_state/decisions.md` and specs/plans under `.ai/`. If work
feels stale or off-direction, run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
before continuing.

Verification is always required, but **tests are user-gated, not automatic.**
The **User Test Authorization Gate** is the supreme rule: do not create, expand,
repair, or run any automated test, test suite, build-as-test-gate, browser
automation, or broad validation gate unless the user has explicitly requested
testing for the current task. Critical risk, high blast radius, a user-visible
change, a nearby test, or your own judgment never authorizes running tests —
when they seem warranted, record a `TEST_PROPOSAL` (named risk + exact command)
and wait. The `CHEAPEST_DECISIVE_EXISTING_TEST` self-authorization exception is withdrawn. Map explicit testing/QA output to `TEST_TASK`; it is the only execution trigger and requires an explicit
user request. `TARGETED` (mission-critical)/`BROADER` authorize proposing, not running. Use the
cheapest decisive non-test evidence otherwise.

**Lean Engineering Ethos:** go deep on analysis (problem, blast radius, edge
cases — where bugs are prevented), lean on implementation (smallest coherent
change; over-engineering is a bug, not thoroughness), lean on testing
(user-gated, never a default to feel thorough). Canonical statement:
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md`.

"All possible blast radius" means evidence-supported direct/transitive callers,
contracts, state, failure/recovery, and rollout—not hypothetical systems. Pull
context just in time, minimize tokens/tool calls/lanes/artifacts/review passes,
and stop when the requested claim is grounded.

Read for speed: `AGENTS.md` plus the FAST PATH block at the top of
`.ai/10_state/current-state.md`; pull deeper `.ai` docs by task/risk and use
`rg` for `current-state.md`/`decisions.md` instead of preloading long histories.

<!-- supermemory-bootstrap: required -->
Codex also inherits the shared Supermemory workflow in
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and
`.ai/12_agents/payloads/codex.md`: run `bun run supermemory:ensure` before
meaningful work, search relevant memory before broad/non-trivial work, and add a
sanitized durable update at closeout when project truth changes. Supermemory is
advisory; `.ai`, current source, tests, and provider evidence remain authoritative.

For non-trivial work, follow the bounded loop-engineering default in `AGENTS.md`
and `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` ("Loop activation criteria and
bounds"). Ordinary non-trivial work uses an in-session loop; a dated
`.ai/03_plans/` pack with a `LOOP_LEDGER.md` is required only for
HIGH-BLAST-RADIUS or explicitly exhaustive work. Trivial reversible work stays
direct. Do not duplicate the policy here.
