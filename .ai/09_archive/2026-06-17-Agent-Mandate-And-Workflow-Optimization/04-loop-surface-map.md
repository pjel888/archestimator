# 04 — Loop Surface Map

Synthesized from the canonical contract: `AGENT_OPERATING_PROTOCOL.md` (loop-engineered
product development + loop surface routing), `AGENT_FRAMEWORK_PROTOCOL.md` (loop contract,
modes, receipt), and `VALIDATION_MATRIX.md` (proof gates). This is the practical "which
surface do I use?" map every agent should be able to answer without guessing.

## Routing ladder (work type → surface)

| Work type | Default loop surface | Required memory | Required proof | Stop condition |
|---|---|---|---|---|
| Small reversible fix (typo, copy, single narrow edit) | Direct solo execution — no plan pack | None beyond commit msg | `git diff --check` + focused type/test/LSP on the touched unit | Change verified locally |
| Multi-file implementation (a feature/refactor with coupling) | Dated plan pack `.ai/03_plans/<YYYY-MM-DD>-<slug>/` + focused execution loop | Plan pack + run log if framework/release/multi-agent | Targeted tests for touched behavior; broader `bun run validate`/`build` only if risk justifies | Plan criteria met + validation evidence |
| Independent slices (disjoint file scopes, parallelizable) | Parallel lanes / subagents (`ultrawork`) / worktrees | Plan pack + lane scopes; durable state outside chat | Per-lane focused checks; lead integrates + validates | Lead reconciles all lanes + integration validated |
| Durable / resumable goal across stories | `ultragoal` (durable goal + ledger/checkpoints) | `.ai` plan pack + `.omx`/`.omo` ledger | Criterion evidence per checkpoint | Goal ledger criteria all proven |
| Criterion-by-criterion real-surface proof needed | `omo:ulw-loop` | Plan pack + criterion ledger + cleanup receipts | Real-surface evidence per criterion | Every criterion green on its real surface |
| Full clarify→plan→execute→review→QA lifecycle | `autopilot` | Plan pack + run log | Review + adversarial QA pass | Lifecycle complete, lead-verified |
| High-risk shared API / symbol refactor | Graph/impact analysis (code-review-graph / GitNexus) **+ maker/checker** | Plan pack + impact record + run log | Impact/blast-radius check, targeted tests, broader validate if risk justifies | Blast radius understood + regression-safe |
| UI behavior change (user-visible) | Focused component/DOM test; browser/visual proof when the behavior is user-visible | Plan pack if multi-file | Targeted DOM/browser proof; `lint:design-system` for substantial UI; Impeccable/visual only when the visual result is the deliverable | User-visible behavior proven on a real surface |
| Provider / database / security / RLS / auth | Provider-proof boundary + targeted checks; DB work uses standing `ebxxqidacheyapmmzavr` mandate | Run log w/ proof boundary labels | `local-only` vs `provider-proven` vs `manual-proof-pending` kept distinct; never claim provider proof from local checks | Behavior proven on the real provider/db surface |
| Research-heavy / uncertain factual claims | Dated `.ai/13_research/<topic>-<YYYY-MM-DD>.md`; `omo:ultraresearch` when exhaustion required | Research note with cited sources + dates | Source citations; separate assumptions from verified facts | Claims source-backed + dated |
| Adversarial behavior / false-green risk | `ultraqa` | Run log | Adversarial QA pass distinct from the maker | No false green survives the QA pass |
| Browser-facing claim | `vercel:agent-browser` or equivalent | Run log | Real browser transcript/screenshot | Web behavior observed, not asserted |
| Agent drift / confusion / repeated mistakes | **Self-diagnostic recovery loop** (`AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`) | Re-read source-of-truth chain; live git state | Smallest corrective change verified | State coherent + corrected doc/source patched |

## Lead-vs-worker decision (from AGENT_FRAMEWORK_PROTOCOL modes + tiers)

- **Lead orchestrator** = highest-capability active agent for the session. Owns scope, routing,
  model/effort, integration, validation, final claim. Worker "done" is never a stop condition;
  the lead reconciles and verifies.
- **Effort tiers:** Low (search/inventory/path checks/status), Standard (ordinary impl/focused
  tests/refactors), High (architecture/security/data-integrity/auth/migrations/adversarial review),
  Highest (lead orchestration of broad/risky work + final arbitration).
- **Parallelize** when independent lanes materially improve quality/speed/coverage; keep coupled
  critical-path work local; write-capable lanes need disjoint scopes or worktrees; shared policy
  files are edited sequentially; read-only auditors stay read-only.

## Proof boundary (never blur these)

`local-only` (type/test/lint/LSP/`git diff --check`) ≠ `provider-proven` (real Supabase/HTTP/
browser/db diff) ≠ `manual-proof-pending`. The matrix's docs-only gate is path checks + `git
diff --check`; the framework-docs gate adds "adapters point back to `.ai` and don't duplicate
long policy" + `_template.md`/source-of-truth link existence.

## Anti-infinite-loop rule

A loop is complete only when the stop condition is proven by evidence **outside the chat**, a
documented blocker requires owner judgment, or the iteration cap is hit with an exact continuation
handoff. A green unit test or worker self-report supports a claim but does not replace real-surface
proof for user-/provider-facing behavior.

> Reconciled against the `loop-eng-archive` audit lane in iteration 3 (the durable loop contract
> now lives in `.ai/00_system`; the 2026-06-13 archive pack is its historical origin, cross-linked
> from `DOCS_SOURCE_OF_TRUTH.md`).
