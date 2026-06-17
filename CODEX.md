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

For non-trivial work (features, plan implementation, multi-file or shared-surface
changes, DB/auth/security, performance, provider-facing, release, unclear debugging),
follow the bounded loop-engineering default in `AGENTS.md` and
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md` ("Loop activation criteria and bounds"):
a dated `.ai/03_plans/` pack with a `LOOP_LEDGER.md`, bounded iterations, and
proportional proof. Trivial reversible work stays direct. Do not duplicate the policy here.
