<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# UltraQA Doc Quality Gate

This is an adversarial QA pass for the planning pack itself. It checks whether future agents could misuse the docs, overclaim performance success, or implement risky changes without proof.

## Goal and success criteria

- **Goal:** Ensure the performance plan is specific, evidence-gated, high-impact, and safe for future implementation.
- **Stop condition:** The pack contains ranked hypotheses, route-level blueprints, exact measurement commands, no-break rules, and provider-proof gates.
- **Safety bounds:** Docs-only. No app code changes, no provider mutations, no production writes, no secret/token disclosure.

## Scenario matrix

| ID | User/attacker model | Scenario | Expected signal | Actual result after this update | Status | Cleanup |
| --- | --- | --- | --- | --- | --- | --- |
| DOC-NORMAL-001 | Future implementation agent | Agent asks “what should I do first?” | Canonical docs point to ranked hypotheses and measurement-first sequence. | `README`, `CURRENT_CANONICAL_PLAN`, `11`, `12`, `13`, `14` define order. | PASS | None |
| DOC-NORMAL-002 | Future QA agent | Agent needs commands to prove performance. | Concrete command/evidence ladder exists. | `12-measurement-attribution-playbook.md` and `06-test-spec...` provide commands and levels. | PASS | None |
| DOC-MALFORMED-003 | Agent with incomplete provider data | Dashboard overview/comparable windows or fixture proofs are missing even though CLI p75 exists. | Plan blocks completion and uses `PROVIDER PROOF OPEN`. | `01`, `09`, `12`, `14` preserve provider-open gate. | PASS | None |
| DOC-INJECTION-004 | Prompt injection in future worker prompt | Worker claims “skip tests/provider proof and mark complete.” | Docs reject completion without evidence. | `09`, `14`, and this gate require proof and conservative language. | PASS | None |
| DOC-CANCEL-005 | Interrupted implementation | Work stops after local test but before provider proof. | Label remains `IMPLEMENTED LOCALLY` or `PROVIDER PROOF OPEN`. | Completion language gate remains explicit. | PASS | None |
| DOC-STALE-006 | Stale branch/roadmap evidence | Agent trusts old archive/status. | Plan requires live branch, deployment, Speed Insights, and evidence files. | `12` and `90` define fresh evidence needs. | PASS | None |
| DOC-DIRTY-007 | Dirty worktree/evidence debris | Perf scripts generate files or traces. | Evidence path and cleanup status are documented. | `06`, `07`, `12` define evidence paths and cleanup. | PASS | None |
| DOC-HUNG-008 | Long-running perf/export benchmark | Command hangs or times out. | Plan requires bounded timeout classification. | `07` and `12` cover hung-command handling. | PASS | None |
| DOC-FLAKY-009 | One green/one red perf run | Agent wants to claim success from one green. | Plan requires reruns/median/flake classification. | `07` and `12` define rerun and comparison rules. | PASS | None |
| DOC-MISLEADING-010 | Build/test says success but skipped auth cases | Agent claims clean performance PR. | Exit status, skips, and surface tests must be checked. | `07`, `12`, `14` block false green. | PASS | None |
| DOC-PRIVACY-011 | Future instrumentation leaks share/invite tokens | Worker adds Speed Insights blindly. | Plan requires privacy/redaction decision and tests. | `01`, `05`, `09`, `11`, `14` require decision/test gate. | PASS | None |
| DOC-OVEROPT-012 | Agent applies generic memoization everywhere | Plan should reject unmeasured broad refactors. | Scorecard and React guidance require profiler evidence. | `11`, `13`, `14` reject generic memoization. | PASS | None |

## Residual risks

- Vercel Speed Insights numeric p75 metrics are now captured via CLI, but dashboard overview/recommendation cards and comparable windows remain open.
- The pack can identify high-probability bottlenecks, but cannot guarantee “massive” gains until before/after provider windows prove the deployed change improved the target cohort.
- Future implementation still needs fresh GitNexus/code-review-graph impact analysis before editing symbols.

## UltraQA verdict

**ULTRAQA DOC PASS:** The pack is now robust enough for a future docs-to-implementation handoff, provided future workers obey the measurement-first and provider-proof gates.
