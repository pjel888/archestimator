# Hero Path Performance Audit And Improvement

Date: 2026-06-20

Target path:

1. `http://localhost:3000/workshop`
2. `http://localhost:3000/workshop/projects`
3. `http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222`
4. `http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates`
5. `http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/bf254cbd-13d4-4dbf-b21a-84b171cdd6db`

Goal: make the authenticated hero route chain fast without weakening auth, RLS, stale-data safety, or the workshop UX.

## Artifacts

- `00-PLAN.md` - active plan, success criteria, constraints, and implementation loop.
- `LOOP_LEDGER.md` - benchmark/evidence log and next-iteration decisions.
- `research/official-patterns.md` - official-doc findings that shape the implementation.
- `benchmarks/` - route-transition and trace JSON artifacts.
- `evidence/` - raw local run logs when needed.

## Stop Condition

Do not close the goal until the exact hero scenarios have fresh benchmark evidence, targeted tests pass, and independent review finds no blocking correctness/performance issue.
