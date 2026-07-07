# Codex Entry Point — Archestimator

Read `AGENTS.md`, then use `.ai/` as the shared project brain.

Primary Codex role:
- implementation
- refactoring
- tests
- PR-ready diffs
- validation evidence

Implementation baseline is now Next.js + Bun with Supabase/Postgres (live),
TanStack Query, Zustand, and repository boundaries. Codex role, scope, evidence,
and safety policy live in `.ai/12_agents/payloads/codex.md` and
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`; durable implementation decisions
belong in `.ai/10_state/decisions.md` and specs/plans under `.ai/`. If work
feels stale or off-direction, run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
before continuing.

Read for speed: `AGENTS.md` plus the FAST PATH block at the top of
`.ai/10_state/current-state.md`; pull deeper `.ai` docs by task/risk and use
`rg` for `current-state.md`/`decisions.md` instead of preloading long histories.

Codex also inherits the shared Supermemory workflow in
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and
`.ai/12_agents/payloads/codex.md`: check `http://localhost:6767/`, start
`./node_modules/.bin/supermemory local start --port 6767` if it is down and local process startup is
available, search memory before meaningful work, and update it at closeout when
durable project truth changes. Supermemory is advisory; `.ai`, current source,
tests, and provider evidence remain authoritative.

For non-trivial work, follow the bounded loop-engineering default in `AGENTS.md`
and `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` ("Loop activation criteria and
bounds"). Ordinary non-trivial work uses an in-session loop; a dated
`.ai/03_plans/` pack with a `LOOP_LEDGER.md` is required only for
HIGH-BLAST-RADIUS or explicitly exhaustive work. Trivial reversible work stays
direct. Do not duplicate the policy here.
