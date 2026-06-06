# Workflow Handoff and Agent Staffing

## How invoked skills map to this docs-only plan

- `$plan` / `$ralplan`: used as the governing planning mode. The plan includes RALPLAN-DR principles, drivers, alternatives, ADR, tests, and risk/rollback gates.
- `$ultragoal`: recommended future durable implementation ledger after this plan is accepted and legal copy is approved.
- `$ultrawork` / `$team`: useful future parallel lanes only after source implementation is authorized; not used for this docs-only task.
- `$ultraqa`: adversarial QA should run after implementation for auth/protected-route/user-flow changes; skipped for docs-only current diff.
- `$autopilot`: not run as runtime loop because the user constrained this task to plan creation only; its canonical phases are represented as future handoff gates.
- `$code-review`: independent review lanes could not be launched in this current tool surface with required `agent_type`; future implementation PR must use proper code-reviewer + architect lanes. Current docs package used self-audit, code-review-graph, and diff checks instead.
- `superpowers:writing-plans`: plan is saved to user-specified `.ai/03_plans` rather than default `docs/superpowers/plans`; steps are bite-sized and verification-oriented.
- `Explore Codebase`: code-review-graph was used before broad grep/local inspection.

## Recommended future agent staffing

| Lane | Role | Purpose |
| --- | --- | --- |
| Lead | `architect` or `planner` | Re-verify plan, legal decisions, and architecture. |
| Implementation | `executor` | Content/source/schema/UI implementation. |
| Supabase/RLS | `dependency-expert` or `test-engineer` | Migration/RLS/grants/types and denial tests. |
| UI/accessibility | `designer` + `test-engineer` | Design-system and focus/mobile states. |
| Verification | `verifier` | Validation commands, provider proof boundaries, `.ai` sync. |
| Review | `code-reviewer` + `architect` | Independent code/security/design review before merge. |

## Team + Ultragoal path

- Use `$ultragoal` to own durable goal state and checkpoints.
- Add `$team` only if splitting source work into independent lanes: schema/RLS, auth/gate, UI/settings, tests/docs.
- Team proves tests and review evidence; Ultragoal records ledger/checkpoints and final completion.

## UltraQA path

Run UltraQA after implementation if any of these change:

- `/login`, `/auth/callback`, `/workshop`, protected route gating.
- Terms acceptance UI.
- Supabase RLS or acceptance persistence.
- Re-acceptance behavior.

Adversarial scenarios should include bypass attempts, route loops, stale Terms version, concurrent tabs, DB write failure, old browser/mobile, keyboard-only, revoked closed-beta user, and future billing checkout if billing exists.
