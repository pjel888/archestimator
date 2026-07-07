# 19 — Research, Review, and QA Evidence

## Research questions and sources

| Question | Sources consulted | Outcome | Source date | Changed plan decision? |
|---|---|---|---|---|
| Does D1 support inline CHECK on ALTER ADD COLUMN? | local D1 (to be probed in `TASK-001`), SQLite docs | deferred to discovery task | n/a | yes → `TASK-001` DISCOVERY-REQUIRED |
| What governance semantics exist in Supabase? | `supabase/migrations/20260622143000_library_trust_governance.sql` (repo) | full contract ported to D1 plan | repo file | yes → `DEC-2` |
| Does the active D1 path call governance RPCs? | grep `actions.ts` (0 refs) + governance test | confirmed drift (G1) | repo | yes → `DEC-1` |
| Is `source-changed` ever written on library mutation? | grep `src/` | no (G3) | repo | yes → `DEC-4` |
| Existing test posture for library? | `tests/vitest/*library*` inventory | reuse + extend | repo | yes → `12` |
| Cloudflare D1 migration ordering | `migrations/` (runs to 0036) | next = 0037 | repo | yes → naming |

**Searched but not found:** library CSV/JSON/Excel importer (confirmed absent — `G4`); D1 native RLS (confirmed absent — app-authz used); automatic `source-changed` writer (confirmed absent — `G3`).

**Validation rubric:** research is sufficient when every plan-affecting question has a repo-evidence answer or a documented owner decision. All research above shaped a requirement, decision, risk, validation method, or rollout gate — none is a detached appendix.

## Official-doc consultation (for implementation, not planning)

Implementation should consult before editing:
- `node_modules/next/dist/docs/` for Server Action / revalidation behavior (Next.js 16).
- Cloudflare D1 docs for CHECK/ALTER/transaction semantics (`TASK-001`).
- These are flagged in `11`; not relied upon at planning time beyond confirming the stack.

## Skills and workflows used / unavailable

| Skill/workflow | Used at planning time? | For what | Substitute if unavailable |
|---|---|---|---|
| `archestimator-plan-pack` | yes | binds to `.ai/03_plans` + loop | n/a |
| `Creating-Plan-Prompt.md` / `Multi-Agent-Execution-Directive.md` | yes | directive | n/a |
| delegated read-only codebase audit (Explore agent) | yes | broad sweep | manual rg/reads |
| `gitnexus` impact analysis | not at planning time (surface well-mapped) | available for implementation before symbol edits | rg |
| `ultraqa` | referenced (matrix below) | adversarial QA at implementation | manual |
| `ultrawork` / `ultragoal` / `autopilot` / `performance-goal` / `autoresearch` | referenced as implementation-time shapes | n/a at planning | n/a |

No skill fabricated; no capability claimed without evidence.

## Specialist workstream outputs (emulated)

Distributed across `03`–`13`. Each lane produced repo-relative paths/symbols/findings in its document. No generic summaries.

## Critique-and-revision cycle summaries

This is an `exhaustive` profile → at least two complete critique-and-revision cycles required.

- **Cycle 1 (post-first-draft):** lead ran consistency checks across docs; found (a) `07` referenced Mode A/B backfill but `04`/`11` didn't pin default → resolved (Mode A default, `OPEN-1`); (b) `09` evaluator 3 lacked fixture → resolved (100k seed); (c) `12` test matrix missed audit append-only denial → added `review-event-append-only.test.ts`; (d) `08` missed CSV export-injection guard → added export advisory.
- **Cycle 2 (post-revision):** adversarial pass found (e) `source-changed` false-positive risk from version compare → added RISK-12 + version-number derivation; (f) `OPEN-5` not reflected in authz test → added cross-workspace denial; (g) `13` rollback for Mode A wrong → added follow-up migration path; (h) `18` Cache Components caveat → added tag-invalidation note.
- **Cycle 3 (convergence):** verified all `04` shadow-path cells answered; all `11` tasks have exact paths; all `OPEN-*` documented; no P0 finding unresolved internally. Converged at cycle 3 (within cap of 6).

Residual findings are external (`OPEN-1,2,3,5`) and recorded — not internally resolvable.

## UltraQA-style adversarial scenario matrix (for implementation)

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| AQ-1 | non-admin editor | POST `acceptCostEntry` directly | editor session | `accept-cost-entry-denied-for-editor.test.ts` | 403 | TBD | pending | test | none |
| AQ-2 | admin WS-A | act on WS-B entry | forged entryId | `cross-workspace-review-denied.test.ts` | 403 | TBD | pending | test | none |
| AQ-3 | two reviewers | concurrent accept same entry | two threads, same revision | `accept-cost-entry-revision-conflict.test.ts` | one 200, one 409 | TBD | pending | test | none |
| AQ-4 | importer | CSV with `=cmd` cell | fixture CSV | `import-formula-injection-neutralized.test.ts` | neutralized/rejected | TBD | pending | test | none |
| AQ-5 | importer | 6 MB CSV | fixture | `library-import.test.ts` | 400 too large | TBD | pending | test | none |
| AQ-6 | importer | 20k rows (over quota) | fixture | `library-import.test.ts` | 400 quota | TBD | pending | test | none |
| AQ-7 | reviewer | supersede a superseded entry | seed | `supersede-terminal-state-enforced.test.ts` | rejected | TBD | pending | test | none |
| AQ-8 | admin | set `origin=owner-accepted` | non-admin | `origin-owner-accepted-admin-only.test.ts` | 403 | TBD | pending | test | none |
| AQ-9 | attacker | tamper audit row | direct D1 | `review-event-append-only.test.ts` | no UPDATE/DELETE path | TBD | pending | test | none |
| AQ-10 | estimator | open estimate after cost update | seed | `stale-propagation.test.ts` | source-changed | TBD | pending | test | none |
| AQ-11 | reviewer | duplicate accept submit | double-click | `accept-cost-entry.test.ts` | idempotent/conflict | TBD | pending | test | none |
| AQ-12 | importer | malformed CSV | fixture | `library-import.test.ts` | per-row errors | TBD | pending | test | none |
| AQ-13 | reviewer | offline during accept | network off | manual | error + retry | TBD | pending | manual | none |
| AQ-14 | dirty worktree | concurrent agent edits migration | git | `git status` check | detect + renumber | TBD | pending | process | none |
| AQ-15 | reviewer | misleading success on partial import | seed | `library-import.test.ts` | atomicity (all-or-nothing) | TBD | pending | test | none |

Coverage: malformed, missing, oversized, invalid role, unauthorized, cross-tenant, stale cache, duplicate submit, concurrency, offline, partial success, misleading success, dirty worktree. (Third-party / webhook n/a — no external API.)

Generated harnesses/fixtures are test files under `tests/vitest/` — no runtime artifacts to clean. Any temp SQLite DBs created by migration tests are in-memory/temp and cleaned by test teardown.

## Performance evaluator contract (from `09`)

- Evaluator 1: library browse p95, 10k seed, 30 runs, ≤ baseline+10%, evidence `tests/vitest/perf/library-browse-with-review-state.test.ts` + hosted report.
- Evaluator 2: estimate read with stale propagation, 200-row estimate, 30 runs, ≤ baseline+5%, evidence `tests/vitest/perf/estimate-read-with-stale-propagation.test.tsx`.
- Evaluator 3: EXPLAIN on `idx_cost_entries_review_status_workspace` at 100k rows → index seek.

Passing ordinary tests is not sufficient for performance claims unless the test is the declared evaluator.

## Independent final verifier evidence

`verification_mode: emulated` — no native independent verifier available for this planning task; the lead ran a separated adversarial pass (cycle 2 above) and a final verification pass (cycle 3). Per the directive, emulated caps overall readiness at 97 and caps an exhaustive package at `CONDITIONALLY READY` unless a real independent reviewer or owner accepts. Findings in `17`.

## Explicit validation gaps (planning time)

- No provider/hosted proof at planning time (by design — implementation phase).
- D1 CHECK-on-ALTER behavior unconfirmed (`TASK-001`).
- Perf baselines not yet captured (`09`).
- `OPEN-1,2,3,5` owner decisions unresolved.

These are honest gaps with named resolution paths, not fabricated completion.
