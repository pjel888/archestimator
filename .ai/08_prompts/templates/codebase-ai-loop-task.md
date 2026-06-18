# Archestimator Non-Trivial Work Loop Prompt

Paste this before a serious task. It activates the canonical bounded loop defined in
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md` ("Loop activation criteria and bounds") and the
durable-artifact / `LOOP_LEDGER` contract in `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`. Replace
the `<…>` fields. This template is an adapter — it points to the canonical mandate, it does not fork it.

## Task

<one-line objective + the concrete outcome that proves success>

## Mode

<implementation | plan-only | review | debug | provider-proof | release | recovery>

## Required behavior

1. Read `AGENTS.md` and the FAST PATH block at the top of `.ai/10_state/current-state.md`;
   pull `.ai/00_system` source-of-truth docs only when the task/risk needs them.
2. Classify: trivial or non-trivial? (See "Loop activation criteria and bounds".)
3. If trivial — take the narrowest direct path with proportional verification; do not over-loop.
4. If ordinary non-trivial - run an in-session loop. Create/update a dated
   `.ai/03_plans/<YYYY-MM-DD>-<slug>/` plan pack + `LOOP_LEDGER.md` only for
   HIGH-BLAST-RADIUS or explicitly exhaustive work.
5. Run bounded iterations: `DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE`, updating the ledger
   DURING the work (not at the end). Default cap 3–6 iterations unless the task sets its own.
6. Maker/checker: verify with a lane or surface distinct from the one that made the change when risk,
   breadth, or user-visible impact justifies it. The lead owns final integration and evidence.
7. Match proof to the claim and label it precisely:
   `local-only` / `provider-proven` / `browser-proven` / `manual-proof-pending` / `not-verified`.
8. Stop only on: proven pass · explicit blocker · owner decision · approval-gated action · iteration cap.
9. Final report: files changed · evidence + proof boundary · validation gaps · remaining risks · next action.

## Hard rules

- Do not claim completion from intent; a worker self-report or one green check is not completion.
- Do not use chat as durable memory — loop state lives in `.ai`.
- Stay inside the standing scope: Supabase project `ebxxqidacheyapmmzavr` only; no production deploys,
  destructive/irreversible actions, paid add-ons, or provider/GitHub/Notion mutations without fresh approval.
- When multiple agents share the directory, use disjoint file scopes. If the
  active user says to stay on `main`, keep lanes on the current checkout or
  read-only unless the lead explicitly authorizes isolation. The lead owns
  conflict checks and integration.
- Tool adapters translate this loop; they never fork or weaken it. `.ai/00_system` is the authority.
