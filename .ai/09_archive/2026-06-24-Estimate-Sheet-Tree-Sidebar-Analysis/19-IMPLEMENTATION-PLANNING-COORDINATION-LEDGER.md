# Estimate Sheet Tree Sidebar Implementation Planning Ledger

Date: 2026-06-25
Mode: planning-only multi-agent coordination
Primary output: `IMPLEMENTATION_PLAN.md`

## Master Goal

Create a canonical, executable implementation plan for the estimate sheet tree/sidebar remediation work, grounded in the source audit pack, current repository code, and specialist review. This pass does not implement application code, create migrations, alter provider configuration, or run browser automation.

## /goal

Intended outcome: one canonical `IMPLEMENTATION_PLAN.md` that a future codebase AI can execute safely without rereading every audit source linearly.

Scope: estimate sheet tree/sidebar remediation, direct state/action/DB/security/performance/test/rollout boundaries, and share-token privacy headers called out by the threat model.

Non-goals: no application implementation, no migrations, no provider changes, no production configuration, no browser automation, and no expansion into unrelated center-content/proposal work.

Workstreams: lead integration, requirements mapping, backend/data/security, UX/a11y, performance/reliability, testing, architecture source inspection, coherence review, adversarial review, and independent verification.

Constraints: preserve unrelated worktree changes, use current source facts over stale plan-pack assumptions, keep SQL sketches non-runnable until implementation, and stay within Supabase project `ebxxqidacheyapmmzavr` for any future DB work.

Acceptance criteria: prompt-required sections and columns present, source contradictions resolved, review findings remediated, no app/provider code edited, and validation evidence recorded.

Validation: source/document reads, targeted `rg`/`sed` inspection, mechanical heading/ID/ASCII/trailing-whitespace checks, coherence review, adversarial review, and independent verification.

Final deliverables: `IMPLEMENTATION_PLAN.md`, this ledger, and final report.

## Scope

- Convert the existing analysis pack into one execution-ready implementation plan.
- Preserve the audit's feature boundary: estimate sheet tree/sidebar navigation and its direct integration with estimate tree state, actions, persistence, and verification.
- Resolve stale or contradictory plan-pack facts before handoff.
- Include phase sequencing, file-level impact, acceptance criteria, rollout, rollback, observability, risks, and traceability.

## Non-Goals

- No edits to `src/**`, `supabase/**`, `tests/**`, provider settings, or production configuration in this planning pass.
- No implementation of tree/sidebar features.
- No live Supabase mutations or migration application.
- No browser, Playwright, screenshot, or visual QA proof for this planning artifact.
- No expansion into the estimate sheet center content, proposal package, or unrelated public-share feature work except where direct integration boundaries or security headers affect this plan.

## Workstreams

| Agent / Lane | Goal | Owned Scope | Dependencies | Findings / Decisions | Validation | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Lead coordinator | Integrate sources, resolve contradictions, write final plan | Prompt contract, repository inspection, final artifact | All lanes | Planning-only constraint enforced; stale `.omx` state ignored because it belonged to an unrelated performance task | Read source docs, checked target folder status, inspected source anchors | Complete |
| Requirements analyst | Map all source documents and canonical authorities | `00`-`18` plan pack, prompt, pasted directive | None | Canonical counts are P1=5, P2=14, P3=8; `13-PLAN-AUDIT-AND-SCORECARD.md` supersedes stale parts of `18`; F-02 signature needs `id`, `parent_id`, `kind`, `name`, `sortOrder` | Read-only source report returned | Complete |
| Backend/data/security guardian | Validate DB/RPC/security assumptions | `actions.ts`, generated Supabase types, migrations, share proxy | Source docs plus current code | Corrected stale M-03 assumptions: create RPC is tab-aware with 9 args; sort uniqueness is tab-scoped; SECURITY DEFINER RPCs already enforce DB edit checks, but app-layer guards are still required | Read-only source report returned | Complete |
| UX/a11y designer | Define target UX and accessibility acceptance | `EstimateSheetTree.tsx`, `tree.tsx`, `ResizableSidePanel.tsx`, `DESIGN.md`, a11y docs in pack | Findings F-11/F-12/F-20/F-21/F-22/F-24/F-25 | Keep compact workspace UI; add keyboard DnD, F2, Shift+F10, type-ahead, visible empty CTA, focus restoration, mobile drawer | Read-only source report returned | Complete |
| Performance/reliability reviewer | Define budgets and reliability work packages | signatures, reorder payload, deletes, race handling, cache cleanup | Findings F-01/F-02/F-03/F-04/F-07/F-16/F-27 | Main bottleneck is repeated full-tree work and refreshes, not a single O(n^2) loop; budgets added for 1,500-node supported trees | Read-only source report returned | Complete |
| Test engineer | Convert findings into RED -> GREEN coverage | Existing Vitest/e2e suite and planned tests | Findings and validation plan | Add targeted tests before each P1/P2 implementation; F-19 acceptance must be per-action, not raw grep count | Read-only source report returned | Complete |
| Architecture lane | Map integration boundaries | Source code and repository structure | Failed native subagent due model capacity; lead performed targeted local inspection | Current code anchors confirmed directly: RPC types, share proxy, tests, Next `useParams` docs, package scripts | Local read-only commands | Complete |
| Integration reviewer | Check final document coherence | Draft `IMPLEMENTATION_PLAN.md` | Draft artifact | Found prompt-field gaps in phase, traceability, risk, open-decision, and ledger structures; all were remediated | Read-only coherence review plus patch verification | Complete |
| Adversarial reviewer | Stress-test plan against omitted blockers | Draft `IMPLEMENTATION_PLAN.md` plus source docs | Draft artifact | Required stricter DB rollback, live M-02 introspection, mandatory bulk-delete authority, measurable rollout triggers, token-bearing share headers, and sparse-sort exhaustion proof | Read-only adversarial review plus patch verification | Complete |
| Independent verifier | Verify completion against prompt | Final artifact set | Reviewer findings | Initial verdict failed on missing prompt fields; plan and ledger were updated before final checks | Section/traceability/constraint checks | Complete |

## Conflicts And Resolutions

| Conflict | Resolution |
| --- | --- |
| `.omx` runtime state referenced unrelated workshop-library performance work | Ignored for this planning goal; source prompt and pasted directive are authoritative |
| `18-FINAL-VERIFICATION-AND-RESCORING.md` says `17` was absent | Treat `13-PLAN-AUDIT-AND-SCORECARD.md` Wave 3 and `17-ADVERSARIAL-REVIEW.md` as newer authority |
| Older plan text omits `sortOrder` from F-02 target signature | Canonical signature is `id`, `parent_id`, `kind`, `name`, `sortOrder` |
| `16-DATA-MIGRATION-PLAN.md` contains stale DB assumptions | Plan now requires live introspection of constraints, indexes, functions, and generated types before M-02/M-03 |
| Review draft marked reviewer lanes pending while claiming implementation-ready | Reviewer lanes completed and their findings were remediated |
| Unrelated untracked center-content ledger existed in worktree | Preserved untouched |

## Open Questions

| Question | Current recommendation | Owner |
| --- | --- | --- |
| Which keyboard DnD model ships | Choose before Phase 5 coding: `Ctrl+X`/`Ctrl+V`, Shift+Arrow, or explicit move dialog | Frontend/a11y owner |
| Which monitoring sink proves rollback triggers | Define in Phase 0.5; if none exists, restrict rollout to manual/internal | Release owner |
| Sparse sort precision/rebalance | Accept `numeric(20,4)` only after repeated-move exhaustion tests pass or increase precision | Backend/data owner |
| Full `bun run validate` baseline | Use targeted proof first; broad validate/build only when unrelated baseline is interpretable | Release owner |

## Source References By Lane

| Lane | Source references |
| --- | --- |
| Requirements | Prompt file, pasted directive, plan pack `00`-`18` |
| Backend/data/security | `actions.ts`, generated Supabase types, migrations, `src/proxy.ts`, `14`, `16`, `17` |
| UX/a11y | `EstimateSheetTree.tsx`, `tree.tsx`, `ResizableSidePanel.tsx`, `DESIGN.md`, `05`, `08`, `12` |
| Performance/reliability | `estimate-tree-reorder.ts`, load limits, virtualization flags, `07`, `09`, `13` |
| Testing | package scripts, existing Vitest/e2e files, `08`, `11` |
| Review/verification | `IMPLEMENTATION_PLAN.md`, this ledger, prompt-required field list |

## Deliverable Status

| Deliverable | Status | Evidence |
| --- | --- | --- |
| Canonical implementation plan | Complete | `IMPLEMENTATION_PLAN.md` exists and contains prompt-required sections/columns |
| Coordination ledger | Complete | This file includes `/goal`, workstreams, conflicts, open questions, source refs, deliverables, and validation log |
| App implementation | Not started | Planning-only; no `src/**`, `supabase/**`, or `tests/**` edits intended |
| Final verification | Complete after remediation | Mechanical checks and reviewer findings are recorded in the final response |

## Constraints And Safety

- Preserve unrelated worktree changes. At planning start, `git status --short` showed an unrelated untracked ledger in the center-content plan folder; this pass leaves it untouched.
- Before edits, the tree-sidebar target folder was clean and `IMPLEMENTATION_PLAN.md` did not exist.
- Use current repository facts over stale plan-pack assumptions when direct source inspection contradicts older docs.
- Treat SQL in `16-DATA-MIGRATION-PLAN.md` as sketch material, not runnable migration code.
- Use project boundary `ebxxqidacheyapmmzavr` for any future Supabase work; no provider mutations occur in this pass.

## Acceptance Criteria

- `IMPLEMENTATION_PLAN.md` exists in this folder.
- The plan contains the required prompt sections: executive summary, source references, scope, current state, target state, UX/UI, technical architecture, data/DB, security, performance/reliability, blast radius, phased implementation, file-level change map, testing, deployment/rollout, observability/ops, risk register, pros/cons, SWOT, traceability matrix, Definition of Done, and open decisions.
- The plan includes quality scores and reasons below 100.
- The plan resolves known contradictions: P2/P3 counts, F-02 signature fields, F-19 acceptance metric, current create RPC signature, current tab-scoped sort constraints, stale `18` references, and F-04 30-vs-50 sibling budget.
- The plan explicitly states planning-only validation gaps.

## Validation Log

- Read `AGENTS.md`, `.ai/10_state/current-state.md` fast path, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `docs/shared/agent-tiers.md`, the planning prompt, the pasted directive, and the full plan pack as needed.
- Inspected current source anchors with `rg`/`sed`: `EstimateSheetTree.tsx`, `tree.tsx`, `ResizableSidePanel.tsx`, `actions.ts`, `estimate-tree-reorder.ts`, `use-estimate-workspace-state.ts`, `use-estimate-query.ts`, `src/proxy.ts`, generated Supabase types, migrations, package scripts, tests, and local Next 16 docs for `useParams`.
- Confirmed `src/proxy.ts` currently sets cache control for `/share/*` but not `Referrer-Policy`.
- Confirmed generated Supabase types include `target_tab_id` on `create_estimate_node_with_history` args.
- Confirmed existing tests include relevant tree/sidebar coverage anchors but not the full planned P1/P2 remediation matrix.
