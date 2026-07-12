# Test And Adversarial QA

## Authority

This is the detailed negative-path and receipt design for `TEST-001` through
`TEST-010`. Stable IDs and scenario baselines remain documented in
`VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`; current live status remains solely in
`plan-pack.json`. This supporting document cannot promote evidence.

## Fixture Families

- Fixed-clock pure health facts cover every provenance origin, threshold edge,
  severity, grade, budget source, currency state, and deterministic issue order.
- Clean/replayed temp D1 covers nullable project inputs, policy constraints,
  origin columns, append-only fact constraints/indexes, and authorization.
- Producer fixtures enumerate every product/non-product row and revision-fact
  writer so a new unclassified producer fails.
- Repository fixtures cover healthy/risky/mixed/truncated/unauthorized projects,
  exact row references, query count/plan, and payload bytes.
- DOM/browser fixtures cover route state, selection/clear/back, all cockpit
  states, keyboard/focus/announcements, 200% reflow, and reduced motion.

## Adversarial Matrix

| Boundary | Required negative cases | Primary tests |
|---|---|---|
| Health rules | Nil project/estimate/rows, invalid date/number, threshold exact/one beyond, missing/synthesized origin, mixed currency | TEST-001, TEST-003 |
| Migration/producers | Legacy null, invalid enum/range, replay twice, new unclassified writer, copy/restore loss, atomic event/fact failure | TEST-002, TEST-003, TEST-006 |
| Authorization/query | Cross-workspace project/policy/row, tampered cursor, 5,001+ rows, timeout, per-row/unindexed query | TEST-004, TEST-007 |
| URL/UX | Unknown/duplicate filter, stale policy revision, clear/back, keyboard-only, error/truncated/unavailable, reflow | TEST-005, TEST-008 |
| Revision | Same-timestamp ordering, missing range/fact/ordinal, duplicate/late, partial before/after, tombstone gaps, cross-estimate, high-water drift | TEST-006 |
| Reliability/privacy | Retry/idempotency, stale cache, raw data in errors/logs, instruction-like row text | TEST-007, TEST-009, TEST-010 |

Instruction-like customer text remains inert data and never enters logs, rule IDs,
commands, operator guidance, or evidence filenames.

## Red-First And Evidence Contract

Each behavior unit starts from an existing red, a strengthened/new red, or a
recorded characterization. The failing signal must identify the absent/wrong
contract; fixture setup failure, environmental noise, and an unrelated test
failure are not proof. Expected pass signals are the exact values/denials/
budgets in the stable test matrix.

Every receipt records command and exit, stable IDs, source revision, scoped diff,
fixture/policy/evaluator/Activity receipt hashes, fixed clock/runtime versions,
expected and actual signal, created resources, cleanup, and earliest causal unit.
Raw customer-like rows, URLs, tokens, D1 exports, and logs are not persisted.

## Maker/Checker And Handback

The implementer may produce focused receipts; an independent verifier samples at
least one happy, nil, invalid, unauthorized, concurrent/retry, partial-failure,
stale/legacy, high-cardinality, accessibility, and cleanup case for every changed
boundary. Any P0/P1 returns to the earliest causal unit, then reruns its focused
proof and every dependent consumer proof. A plan validator or worker summary is
never substituted for runtime evidence.
