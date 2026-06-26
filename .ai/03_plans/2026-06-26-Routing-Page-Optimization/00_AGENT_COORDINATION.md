# 00 - Agent Coordination

## Master Goal

Make the target estimate sheet route load as one stable estimate-workspace experience, with the most specific leaf loading state and no visible cascade through `/workshop`, `/workshop/projects`, project dashboard, or estimates-list skeletons.

The future implementation is complete only when before/after benchmark artifacts prove both perceived and actual performance improved or met fixed budgets.

## Operating Constraints

- Planning only in this pass.
- Do not modify application, tests, schema, config, provider state, or generated types.
- Write artifacts only inside `.ai/03_plans/2026-06-26-Routing-Page-Optimization`.
- Treat `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md` as the planning directive source; do not modify it during this docs-only pass.
- Respect the dirty worktree. Many unrelated files are already modified by other work.
- Browser automation is required for final implementation proof of skeleton timing, but it was not run during this planning pass.
- `cacheComponents` / PPR migration is out of scope unless a separate high-blast-radius plan approves it.

## Skills and Surfaces Used

| Surface | Use |
|---|---|
| `Explore Codebase` | Route and source mapping |
| `Refactor Safely` | Boundary and blast-radius review posture |
| `gitnexus-exploring` | Code intelligence and route relationship lookup |
| `gitnexus-impact-analysis` | Blast-radius planning posture |
| `gitnexus-refactoring` | Future refactor protocol |
| `vercel:react-best-practices` | React/Next implementation checklist |
| `react-doctor` | Future post-edit React verification gate |
| `superpowers:writing-plans` | Plan format and handoff quality |
| `compound-engineering:ce-plan` | Plan sections, requirements, handoff shape |
| `performance-goal` | Benchmark-first optimization contract |
| `ultrawork` / `ultraqa` / `autopilot` / `ultragoal` | Applied as planning concepts in Codex App; no OMX runtime workflow was claimed |

## Agent Workstreams

| ID | Role | Agent | Status | Main Output |
|---|---|---:|---|---|
| W1 | Repo route explorer | native `explore` | Complete | Target URL maps through `workshop/layout`, `projects/[projectId]/layout`, and `estimates/[nodeId]/page`; project layout and leaf page are likely fallback-boundary suspects |
| W2 | External docs researcher | native `researcher` | Complete | Official React/Next guidance: keep static shell small, push uncached async work behind local Suspense, measure soft navigations |
| W3 | Benchmark/test engineer | native `test-engineer` | Complete | Before/after protocol: skeleton sequence, overlay timing, RSC count, server spans, bundle deltas |
| W4 | Requirements analyst | native `analyst` | Complete | Baseline-first requirement set; no parent fallback, one stable sheet skeleton, overlay contract, same-environment before/after |
| W5 | UX/a11y designer | native `designer` | Complete | Acceptable skeleton map and a11y constraints; leaf skeleton only for sheet route |
| W6 | Architecture reviewer | native `architect` | Complete | Parent blockers are auth/terms and project bootstrap; keep security checks before protected content |
| W7 | Security reviewer | native `ce-security-lens-reviewer` | Complete | Do not move data above auth/RLS gates; reject static/cross-user caches for protected route data |
| W8 | Performance reviewer | native `ce-performance-oracle` | Complete | Ranked bottlenecks: project layout, leaf page top-level await, route-context data waterfall, shell request work, bundle/hydration |
| W9 | Feasibility reviewer | native `ce-feasibility-reviewer` | Complete | Leaf Suspense split is buildable; project layout title streaming and overlay changes need explicit gates |
| W10 | Scope reviewer | native `ce-scope-guardian-reviewer` | Complete | Keep scope route-local and evidence-gated; no broad PPR/cache/database/global overlay work |
| W11 | Adversarial reviewer | native `critic` | Complete | Found sequencing, budget, benchmark-command, security-proof, privacy, and stale-ledger blockers; fixes integrated |
| W12 | Final verifier | native `verifier` | Complete | Initial partial found an unenforceable relative-improvement gate; recheck passed after adding baseline comparison inputs |

## Coordination Ledger

| Time | Action | Evidence | Result |
|---|---|---|---|
| 2026-06-26 | Read project instructions | `AGENTS.md`, `.ai/10_state/current-state.md` fast path | Stack, verification, no-code-planning constraints confirmed |
| 2026-06-26 | Read planning directive | `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md` | Required 18 docs and multi-agent loop confirmed |
| 2026-06-26 | Inspected route implementation | `src/app/workshop/...` route files | Leaf skeleton exists; parent layout and page awaits are likely suspects |
| 2026-06-26 | Inspected perf tooling | `scripts/measure-route-transitions.ts`, `scripts/check-route-transition-readiness.ts` | Existing harness lacks skeleton timeline and strict target budgets |
| 2026-06-26 | Inspected prior state | `.ai/10_state/current-state.md` entries for June 14/21/22 performance work | Prior optimizations already include cache, overlay delay, and sheet skeleton |
| 2026-06-26 | Spawned specialists | Native subagents | At least eight independent workstreams initiated |
| 2026-06-26 | Integrated specialist review cycle | W6-W10 outputs | Added cache/security, project-layout, overlay, bundle/hydration, and instant-navigation caveats |
| 2026-06-26 | Integrated adversarial review | W11 output | Reconciled Phase 0 sequencing, route-specific budgets, before/after commands, security fixtures, privacy policy, and review ledger |
| 2026-06-26 | Integrated final verifier review | W12 output | Added readiness-check baseline comparison env vars; verifier recheck found no remaining blockers |

## Completion Criteria

- Required documents exist in the plan folder.
- Requirements have stable IDs and traceability.
- Benchmark protocol defines before and after measurement artifacts.
- Implementation tasks identify exact code areas and validation commands.
- Risks, decisions, non-goals, rollback, and provider-proof boundaries are documented.
- At least two review/revision cycles are recorded in `17_FINAL_READINESS_REVIEW.md`.
- Independent verifier records a final result.
