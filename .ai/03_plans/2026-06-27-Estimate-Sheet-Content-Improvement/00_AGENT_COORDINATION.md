# Estimate Sheet Content Improvement - Agent Coordination

## Master /goal

Create a complete, evidence-based, codebase-specific planning and readiness package for making the Archestimator estimate sheet content page mission-critical reliable, non-blocking, lag-free, and implementation-ready.

The business outcome is that first users can add, edit, delete, move, reorder, and recover estimate sheet rows, components, areas, and related sheet content without UI blocking, lost work, broken drag/reorder state, confusing global saving toasts, or unproven persistence. The immediate problem is the reported estimate sheet page at `/workshop/projects/0139e1e5-951d-4f2f-9081-6c953d288d8a/estimates/8080f04c-fe18-4314-a1d8-9222e62d1eed`, where row/component mutations feel blocking and a content-to-tree drag can leave row items in the target area unable to drag/reorder.

This is a planning, audit, and readiness task only. It must not implement code, modify application tests, change database schema, run migrations, alter infrastructure, or claim that the product defects are fixed. The plan must give a future implementation agent enough repo-specific evidence, action matrices, requirements, architecture, sequencing, validation, and readiness gates to execute without rediscovering the system.

Planning scope:

- Audit all relevant estimate sheet content CRUD and organization actions, including row item create/edit/delete/bulk delete, blank row insert, library component insert/replace/clear/detach/promote, template/source insert, row move/reorder inside content, content-to-tree row moves, tree/area CRUD or reorder where it affects content, undo/history, column/user preference actions, and collaboration/route-context effects.
- Define current behavior and target behavior for non-blocking persistence, optimistic/local state, failure recovery, idempotency, stale revision handling, cache invalidation, and user-facing feedback.
- Investigate the reported drag/reorder bug from all plausible layers: browser DnD state, `useEstimateWorkshopDrag`, row table/branch rendering, tree external drop handling, persisted sort order reconciliation, tree patching, row item identity, virtualized rows, and route refresh/cache effects.
- Produce a matrix proving every user action has an owner, persistence path, expected optimistic behavior, error path, undo/retry path, validation method, and required evidence.
- Define performance and reliability benchmark contracts for "lag-free" MVP readiness rather than vague speed claims.
- Record exact affected paths, symbols, tables, RPCs, tests, docs, risks, decisions, assumptions, and open external decisions.

Non-goals:

- No implementation or hotfix in this planning pass.
- No provider database mutation, migration, code generation, production deploy, or branch/history operation.
- No broad source formatting or unrelated refactor.
- No claim of zero bugs, 100% readiness, browser proof, provider proof, or fixed UX until future implementation and verification actually prove it.

Implementation-readiness criteria:

- Every requirement has a stable ID, objective acceptance criteria, affected code areas, implementation tasks, and validation coverage.
- Every known and inferred action is represented in an action matrix with current evidence and target behavior.
- Architecture decisions evaluate credible alternatives for local-first/non-blocking persistence and drag/drop recovery.
- The plan defines test, benchmark, manual/browser proof, rollout, rollback, and observability gates with exact commands or future evidence artifacts.
- At least two critique-and-revision passes plus independent final verification are recorded before completion.

Stop condition:

- Stop only when the full planning package under this folder satisfies the referenced planning prompt, all internally resolvable gaps are addressed, and the independent verifier approves the package or documents exact remaining external blockers.

## Source Inputs

| Source | Purpose | Status |
|---|---|---|
| User feature brief in active Codex goal | Authoritative business problem and required workflow invocations | Read |
| `/Users/philiplewis/.codex/attachments/2c9a5772-de09-4eee-9bcd-1b00472f3843/pasted-text-1.txt` | Multi-agent execution directive | Read |
| `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md` | Active planning-improvement contract and scoring/completion authority | Read |
| `AGENTS.md` | Repo operating contract and current stack constraints | Read |
| `.ai/10_state/current-state.md` fast path and estimate-sheet matches | Current project truth and recent estimate sheet work | Read targeted fast path and estimate-sheet entries |
| `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` | Loop, planning, and multi-agent policy | Read relevant sections |

## Skills And Workflow Surfaces

| Skill / Surface | Why Relevant | Application In This Planning Pass |
|---|---|---|
| `ultragoal` | Active durable goal discipline and completion audit rules | Goal remains active until the whole planning package is verified; no `update_goal` until full objective is proven complete |
| `ultrawork` | Parallel evidence lanes | Used native subagents for independent read-only workstreams |
| `ultraqa` | Requires adversarial scenario matrix | Its scenario-matrix discipline will be adapted into planning and readiness artifacts; no product QA/fix loop starts in this planning-only pass |
| `autopilot` | Full clarify-plan-execute-review-QA lifecycle | Applied phase discipline but stopped at planning/readiness because implementation is explicitly out of scope |
| `performance-goal` | Evaluator-gated performance work | Used to define future benchmark/evaluator contracts before any optimization |
| `autoresearch` / `autoresearch-goal` | Validator-gated research loops | Used as a research-quality bar for source-backed planning; no deprecated direct autoresearch CLI surface used |
| `gitnexus` | Broad estimate-sheet architecture/bug tracing | Loaded exploring/debugging/impact guidance; graph use is proportional and source reads remain authoritative |
| `react-doctor` | React diagnostics and health posture | Used for planning React quality/performance gates; no scan/fix run yet because this is no-code planning |
| `vercel:react-best-practices` | React state/hooks/performance checklist | Used as a React review checklist for target-state planning |
| `compound-engineering:ce-plan` | Structured implementation planning | Used for plan quality bar and portability rules |
| `compound-engineering:ce-doc-review` | Multi-persona plan review | Used for critique/revision expectations; final plan will record review cycles |
| `superpowers:subagent-driven-development` | Subagent delegation discipline | Used for bounded native subagent workstreams, read-only in this planning pass |

Runtime note: OMX runtime workflows are represented through the available Codex tools and durable `.ai` artifacts in this session. Shell-level runtime state commands are not used as substitutes for Codex hidden goal state.

## Active Artifact Authority

This package is judged against `Improve-Plan-Prompt.md`, not the older plan-creation prompt. The plan folder is the primary handoff artifact, and the active prompt file is a co-target for this planning-improvement pass because the user explicitly named it in the goal. Any completion claim must account for both:

- `.ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/`
- `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md`

If a future reviewer finds a conflict between this package and the active prompt, the active prompt wins unless a newer owner decision says otherwise.

## Specialist Workstream Ledger

| Agent | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead coordinator | Synthesize the full planning package without application-code edits | Own plan directory, source integration, final readiness | Current file, source reads, subagent returns | All lanes | Drafted package and owns review/revision loop | None | Active |
| Product/requirements analyst (`analyst`, Fermat) | Identify product requirements, scope, action inventory, and success metrics | User brief, current docs/source, CRUD/action matrix | Requirements/action inventory integrated into `04` and `18` | None | Defined row/component/tree requirements, non-goals, success metrics, doc drift | None | Complete |
| Architecture auditor (`architect`, Hegel) | Map current and target architecture, drag/drop fault surfaces, state ownership | Estimate sheet components, hooks, RPC actions, cache flows | Root-cause assessment integrated into `03` and `06` | None | Found likely client-state topology issue: tree event bridge, global save gate, shared query cache, row-order-blind tree sync | None | Complete |
| UX/A11Y designer (`designer`, Pauli) | Define non-blocking UX, feedback states, keyboard/touch alternatives, accessibility | UI source/docs and design guidance | Integrated into `05` | Product + architecture findings helpful | Found global save toasts, toast-only undo, blank selected-node state, tab delete recovery, and DnD alternative gaps | None | Complete |
| Data/API integrity guardian (`ce-data-integrity-guardian`, Planck) | Audit persistence, RPCs, transactions, idempotency, history, cache invalidation | Supabase migrations, server actions, repositories | Integrated into `07` and `08` | Architecture findings helpful | Found direct browser row writes, inconsistent cache finalization, mutation ID/idempotency gaps, adjustment history gap, broad JSON adapter contracts | None | Complete |
| Performance oracle (`ce-performance-oracle`, Halley) | Define lag-free performance budgets and benchmark/evaluator matrix | Perf tests, render probes, route-context evidence, hot paths | Integrated into `09` and `19` | Architecture findings helpful | Produced concrete route, typing, totals, drag/drop, queue, cache, large-sheet, offline budgets | None | Complete |
| Test engineer (`test-engineer`, Kepler) | Map existing and missing test/QA coverage into an action/scenario matrix | Unit/DOM/e2e tests and source actions | Integrated into `12`, `16`, `18` | Product/action inventory helpful | Found stale revision, offline/degraded, load-limited, touch DnD, cross-tab, undo-failure, cache-reload proof gaps | None | Complete |
| Security/privacy auditor (`ce-security-sentinel`, Euler) | Audit authz, trust boundaries, abuse/failure surfaces | RPCs/RLS/API routes/publication/upload surfaces | Integrated into `08` | Data/API findings helpful | Found release blockers: RPC edit checks, private image route access, history RLS, sourceSnapshot allowlist, direct browser writes | None | Complete |
| Blast-radius/docs/ops auditor (`ce-repo-research-analyst`, Arendt) | Map transitive impact, docs, rollout, rollback, active dirty-worktree risks | Docs/source/perf/ops paths | Integrated into `10` and `13` | Source inventory helpful | Found spec drift, high-blast mutation coordinator/cache risks, flag/rollback sequencing, monitoring gaps | None | Complete |
| Adversarial reviewer (`ce-adversarial-document-reviewer`, Erdos) | Challenge plan assumptions and completeness | Revision 1 package | Findings recorded in `20_CRITIQUE_AND_REVISION_LOG.md` | Draft package | Found lifecycle, boundary-proof, ID taxonomy, action-matrix, coordinator-contract, and security-test-surface gaps | None | Complete |
| Independent final verifier (`verifier`, Sagan) | Verify completed package against prompt and source evidence | Revision 2 package | Recorded in `20_CRITIQUE_AND_REVISION_LOG.md` | Final draft | Found only stale lifecycle wording in `17_FINAL_READINESS_REVIEW.md`; correction applied | None | Complete |
| Continuation source explorer (`explore`, Averroes) | Re-check current repo evidence and stale citations after continuation | Current source and plan package | Findings integrated in revision 3 targets | None | Found stale attachment path, current global toast evidence, row-move no-op/refetch wording mismatch, and adjustment persistence nuance. | None | Complete |
| Continuation UX designer (`designer`, Banach) | Stress-test UX, dense table, state, accessibility, visual QA coverage | `DESIGN.md`, sheet UI docs, action matrix | Findings integrated in `05`, `12`, `18` | None | Required explicit state matrix, dense-table ergonomics, per-action a11y proof, responsive/touch, and visual QA gates. | None | Complete |
| Continuation test engineer (`test-engineer`, Ohm) | Stress-test proof contracts and validation gates | Test docs, prompt schema, plan package | Findings integrated in `12`, `16`, `19`, `21` | None | Required executable proof-contract fields, exact trace schema, adversarial QA matrix, known-red ledger, benchmark schema, and fresh dirty-worktree preflight. | None | Complete |
| Continuation security reviewer (`ce-security-lens-reviewer`, Aquinas) | Stress-test server-action, public/export, abuse, DTO, and secrets coverage | Security/data docs and public/export source surfaces | Findings integrated in `07`, `08`, `11`, `12`, `18` | None | Required Server Action attack-surface inventory, public/share/export redaction contracts, ACL precedence, abuse/rate limits, DTO minimization, and secrets inventory. | None | Complete |
| Continuation adversarial reviewer (`critic`, Huygens) | Try to disprove prompt-level implementation readiness | Revision 2 package plus active prompt | Findings recorded in `20` and revision 3 targets | None | Rejected revision 2 for P1 blockers: active-prompt mismatch, missing React/Next authority, nonconforming trace schema, underspecified implementation units, and inflated final scoring. | None | Complete |
| Revision 3 final verifier (`verifier`, Confucius) | Verify revised package against active prompt and continuation findings | Revision 3 package and active prompt | Findings recorded in `17` and `20` | All revision 3 patches | PASS; no unresolved P0/P1 planning blockers; residual only that docs needed to record the pass. | None | Complete |

## Coordination Rules

- Subagents are read-only and must not edit application code, tests, migrations, config, or plan files.
- The lead owns all planning-file writes to avoid concurrent document conflicts.
- Before each planning-file write, recheck worktree status and re-read the target file when it exists.
- Preserve unrelated dirty work. Current worktree modifications outside this plan folder are treated as pre-existing/current reality.
- All paths in final planning docs should be repo-relative unless recording the exact requested output folder path.
- Evidence beats inference. Unsupported hypotheses must be marked as hypotheses, not defects.
