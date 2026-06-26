# Implementation Planning Coordination Ledger

## Master Goal

Create one authoritative, traceable, implementation-ready plan at
`.ai/03_plans/2026-06-24-Estimate-Sheet-Center-Content-Analysis/IMPLEMENTATION_PLAN.md`
from the existing estimate-sheet center-content analysis package and the
planning prompt at `.ai/08_prompts/000_Planning Prompts/Create-Implementation-Prompt.md`.

This is a planning-only run. Application code, migrations, provider settings,
and production configuration are out of scope.

## Acceptance Criteria

- Every source document in this planning folder is reviewed and represented in
  the source map.
- Current estimate-sheet code paths and tests are inspected deeply enough to
  make the plan executable without reinterpreting the feature intent.
- The final plan includes all 22 required sections from the planning prompt.
- Work is phased with file-level impacts, dependencies, validation commands,
  rollback notes, and parallel/sequential boundaries.
- Security, data integrity, performance, accessibility, observability,
  deployment, and rollback are covered.
- Review passes cover completeness/traceability, adversarial technical and
  operational risk, and independent implementation-readiness verification.
- No unrelated worktree changes are overwritten or reverted.

## Workstream Ledger

| Workstream | Owned Scope | Dependencies | Current Work | Findings | Decisions | Conflicts | Validation | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Lead coordinator | Source intake, synthesis, final plan writing, integration | All lanes | Complete | Created `IMPLEMENTATION_PLAN.md` with all 22 required sections, prompt-required scoring axes, per-phase execution template, risk schema, traceability schema, source map, file map, tests, rollout, rollback, ops, and DoD. Integrated all worker and reviewer findings. | Existing active Codex goal is the master goal for this run; stale OMX state from unrelated tasks is not authoritative. This run remains planning-only and does not claim runtime/provider/browser proof. | Initial draft missed prompt-specific schemas for phase/risk/traceability and needed stricter actor/source-freshness/rollout language; patches applied. | Local static checks pass: required 22 headings present, no trailing whitespace, `git diff --check` clean, scoped worktree shows only the two new planning files. | Complete |
| Requirements/source analysis | Planning docs 00-22; requirement/source map | Source documents | Complete | Reviewed AGENTS, FAST PATH, planning prompt, and docs 00-23. Source authority map, key domain requirements, conflicts/resolutions, assumptions, open implementation decisions, and proposed requirement-to-source map delivered. Phase 0/1 is source-supported; runtime evidence remains implementation responsibility. | Use `15`, `16`, `18`, `19`, and `22` as authoritative when historical critique conflicts; no blocked planning decisions remain. | Residual risks: TOCTOU source freshness, M-1 effort estimate, M-4 DoD specificity, telemetry sink proof, manual QA script, runtime/a11y/perf evidence gaps. | Static source review only; no files edited, no code/runtime/provider checks run. | Complete |
| Architecture/integration analysis | Current estimate-sheet components, hooks, services, state, tests | Repo inspection | Complete: mapped route -> workspace -> content -> rows -> mutation hook -> server actions/RPCs; confirmed move/bulk-delete/project-source/trust-gate/read-only/drag seams | Current code matches planning assumptions: move is 2 `replaceRow` calls; bulk row delete is N single deletes; project-source insert applies server tree unguarded; row controls lack `canEditEstimate` gating; raw library drag JSON remains; activity lacks `row_moved` | Reuse template insert revision guard, row mutation identity/expected revision helpers, row tree patch helpers, authz tests, and existing bulk node RPC patterns | First architect lane failed due model capacity; replacement repo-research lane completed static integration map | Static repo inspection only; no tests/browser | Complete |
| UX/UI/accessibility planning | User journeys, component states, interaction/a11y constraints | Source docs + current UI code | Complete | Concrete requirements supplied: read-only gating for all row mutation controls; explicit no-results state; per-row save chips; all-or-nothing bulk-delete failure copy; trust-gate stale-target disabled state; mobile read-only fallback under 768px; keyboard replace/move picker; table semantics/live-region/focus/reduced-motion requirements | Preserve target row values for move; disabled-not-hidden controls for read-only; WCAG 2.2 AA target; mobile read-only fallback | Browser/SR runtime proof not run; current evidence is source-level planning input | Source inspection only; implementation must add Vitest/DOM a11y tests plus manual NVDA/VoiceOver/axe checks | Complete |
| Backend/data/security planning | APIs, Supabase/schema/RLS, persistence, data integrity, authz | Source docs + current backend code | Complete | Current move is two independent row RPCs; bulk delete is N independent deletes; project-source RPC authz is strong but client full-tree apply needs revision gate; library source freshness has TS-side TOCTOU. | Add atomic `move_estimate_row_component_with_history` RPC, atomic all-or-nothing `delete_estimate_row_items_bulk_with_history` RPC, client revision gate for project-source insert, and transaction-local source freshness checks for new source-bearing RPC paths. | First architect lane failed due model capacity; replacement data-integrity lane completed read-only. | Supabase migration + generated types + targeted RPC/action tests + activity `row_moved` consumers required during implementation. | Complete |
| Performance/reliability/operations planning | Performance budgets, caching, concurrency, observability, rollout | Source docs + current code | Complete | Budget envelope: 1500 nodes/5000 live rows, 1200/3000 export cap; 5min tree/tab staleTime; 30min lazy library gcTime. Critical risks: non-atomic move, non-atomic bulk delete, project-source full-tree overwrite, global save toast, express-editor virtualization cliff, console-only express telemetry. Required ops: Phase 0 sink, seven outcome events, row-count caps/timeouts, degraded load/export behavior, staged RPC rollout, client rollback guard/checklist. | Prefer shared sanitized telemetry sink; all-or-nothing bulk delete; move RPC preserves target values; no broad flag framework unless existing config fits. | Telemetry provider proof and runtime perf baseline remain implementation gates. | Static source/doc evidence only; no browser/provider mutation. | Complete |
| Testing/QA planning | Test matrix, validation plan, adversarial scenarios, DoD | Source docs + current tests | Complete | Completed read-only inventory of package scripts, Vitest/Playwright configs, estimate-sheet test files, RLS/prove-script reality, and plan docs 14/15/17/19/20/21/22 | Current coverage is broad but misses atomic move, all-or-nothing bulk delete, project-source race, stale trust gate, read-only row controls, payload validation, SR semantics, and large-data editor pinning | Use targeted Vitest/prove/E2E gates; do not rely on full validate because unrelated reds and DOM hangs are known. Existing bulk partial-failure test documents broken behavior and must be replaced/inverted for M-3. | Commands and UltraQA matrix supplied by test-engineer; no files edited, no suites run | Complete |
| Adversarial reviewer | Challenge final plan for contradictions, omissions, unsafe sequencing | Draft plan | Complete | First pass found high-severity gaps: actor spoofing ambiguity, non-executable rollout/rollback, source-freshness TOCTOU acceptance, realistic auth matrix, and missing edge-case traceability. Follow-up re-check returned PASS with no remaining high-severity issues. | RPC actors must derive from `auth.uid()`; source freshness is a Phase 1 blocker for new/touched source-bearing writes; rollout uses default-off guard/allowlist plus SQL checklist; traceability includes orphan/offline/multi-client gaps. | No remaining high-severity issues after patches. | Independent read-only adversarial re-review passed; no files edited by reviewer. | Complete |
| Coherence/prompt reviewer | Verify section structure, schemas, terminology, and prompt compliance | Draft plan | Complete | First pass found blockers in Section 12 phase schema, Section 17 risk schema, and Section 20 traceability schema. Follow-up re-review returned PASS. | Use fixed phase mini-template, prompt-required risk fields, and prompt-required traceability columns. | No remaining blocker from prior blocker set. | Independent read-only coherence re-review passed; all 22 numbered sections present. | Complete |
| Final verifier | Verify prompt compliance, traceability, implementation readiness score, and durable ledger evidence | Draft plan + reviews | Complete | First pass blocked on missing prompt scoring axes and pending ledger rows. Second pass passed plan content but blocked on ledger rows. This row records final verifier evidence and closes that ledger gap. | Plan uses prompt-required scoring axes and explicitly denies runtime/provider/browser proof claims. Final completion depends on this ledger status update plus local static checks. | No plan-content blocker remains; prior blocker was ledger-only. | Final verifier read-only evidence passed plan content after patches; ledger now records lead, adversarial, coherence, and verifier outcomes. | Complete |

## Evidence Log

- Loaded pasted directive:
  `/Users/philiplewis/.codex/attachments/7d2fd210-f5db-42d5-b100-ddef2f6a6979/pasted-text-1.txt`.
- Loaded workflow skills: `autopilot`, `ultragoal`, `ultrawork`,
  `ultraqa`, and `superpowers:dispatching-parallel-agents`.
- Loaded project entry instructions: `AGENTS.md`.
- Loaded current-state fast path: `.ai/10_state/current-state.md`.
- Loaded planning prompt:
  `.ai/08_prompts/000_Planning Prompts/Create-Implementation-Prompt.md`.
- Initial worktree state captured with `git status --short`.
- Spawned read-only worker lanes for requirements, architecture/repo integration,
  UX/a11y, backend/data/security, performance/ops, and testing/QA. The initial
  architect lane failed due model capacity and was replaced with a
  data-integrity guardian lane.
- Requirements, repo integration, UX/a11y, performance/ops, and testing/QA lanes
  completed with no file edits and no runtime/provider/browser mutation.
- Package scripts inspected: `type-check`, `lint`, `lint:design-system`,
  `lint:design`, `test`, `test:dom`, `test:e2e`, `validate`, and existing
  Postgres prove scripts.
- Current source inspection confirmed the load-bearing implementation seams:
  `moveRowComponent`, `deleteSelectedRows`, project-source insert, trust-gate
  confirmation, global save toast, `canEditEstimate` propagation gap, raw
  library drag/custom-event payloads, missing `row_moved` activity support,
  existing load limits, and perf tracing helpers.
- Drafted canonical plan at
  `.ai/03_plans/2026-06-24-Estimate-Sheet-Center-Content-Analysis/IMPLEMENTATION_PLAN.md`.
- Coherence review first blocked on phase/risk/traceability schemas; patched
  Section 12, Section 17, and Section 20; follow-up re-review returned PASS.
- Adversarial review first returned PASS-WITH-FINDINGS with high-severity
  patches for actor derivation, rollout/rollback, source freshness, auth matrix,
  and missing edge cases; patched all listed issues; follow-up re-review returned
  PASS.
- Final verifier confirmed plan scoring, guardrails, schemas, and no runtime
  proof claim; final blocker was ledger status. This ledger update closes that
  durable-evidence gap.
- Local validation after patches: no trailing whitespace, `git diff --check`
  clean, 22 required headings present, scoped status shows only
  `IMPLEMENTATION_PLAN.md` and this ledger file as new planning artifacts.
