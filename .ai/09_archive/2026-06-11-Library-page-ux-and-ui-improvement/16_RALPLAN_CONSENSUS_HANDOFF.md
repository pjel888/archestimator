# Ralplan Consensus Handoff

Status: planning-only handoff. Implementation is intentionally not approved.

Consensus status: APPROVED on 2026-06-11 after sequential Architect -> Critic review.

## RALPLAN-DR Summary

### Principles

1. Evidence beats inference: source, DB, browser, or research evidence must back each claim.
2. Preserve context: dense catalogue actions should keep users oriented in list, tree, and search state.
3. Use existing primitives first: no bespoke UI when `src/components/ui` already owns the pattern.
4. Measure before optimizing: performance changes need trace evidence.
5. Accessibility is a core success criterion, not a polish pass.

### Decision Drivers

1. Closed-beta trust: users must believe the cost library and source/confidence metadata.
2. Dense workflow efficiency: search, browse, inspect, add, and archive must stay fast and predictable.
3. Implementation risk control: avoid feature scope that crosses UI, schema, RPC, RLS, and performance without a staged plan.

### Viable Options

| Option | Description | Pros | Cons | Verdict |
| --- | --- | --- | --- | --- |
| A | Audit-first hardening, then small correction slice | Corrects evidence, captures baseline, fixes no-op/design violations first | Slower to visible new features | Recommended |
| B | Build detail/filter redesign immediately | Addresses obvious UX gaps quickly | Risks coding from incomplete visual/performance/a11y evidence | Rejected for now |
| C | Performance optimization first | Could improve scale readiness | No proof current page fails; risks premature virtualization | Rejected until trace evidence |
| D | Full redesign with new visual direction | Could produce larger UX improvement | Conflicts with existing design system and no-coding request | Rejected |

## ADR

Decision: Use an audit-first plan that corrects evidence, captures authenticated visual/performance/accessibility baselines, then scopes a small beta-readiness implementation slice.

Drivers:

1. The previous documents had material false assumptions.
2. The page is behind authentication, and current visual proof is incomplete.
3. Schema data contradicts old content conclusions.
4. UX improvements span route UI, DB lifecycle semantics, accessibility, and performance.

Alternatives considered:

1. Implement from previous docs: rejected because of false sidebar/category/metadata claims.
2. Start with detail/edit: rejected because versioning/RPC/RLS scope is larger than a first slice.
3. Start with virtualization: rejected because current data volume is moderate and accessibility risk is real.
4. Start with visual redesign: rejected because the design system already defines a compact product workspace.

Consequences:

1. The next work item is audit execution, not source-code implementation.
2. Implementation scope should be staged: no-op toolbar and design-token fixes first, then lifecycle/detail/filter/performance based on evidence.
3. Visual Ralph must wait for an approved authenticated baseline.
4. Supabase mutation work must include RLS/RPC review.

Follow-ups:

1. Run authenticated visual/accessibility/performance audit.
2. Update this folder with captured artifacts.
3. Create implementation tickets by slice.
4. Run Architect and Critic review before code.

## Available Agent Types For Future Work

| Lane | Recommended role | Why |
| --- | --- | --- |
| Repo mapping | `explore` | Fast source and dependency lookup. |
| UX/design | `designer` | Product workflow, component reuse, visual hierarchy. |
| Accessibility/test plan | `test-engineer` or `verifier` | Acceptance criteria and e2e coverage. |
| Performance | `verifier` plus `researcher` if docs change | Trace strategy and current framework guidance. |
| Supabase/RLS | Supabase skill plus `dependency-expert` or `architect` | Mutation/RPC/security review. |
| Implementation | `executor` | Bounded code slices only after audit. |
| Final review | `code-reviewer` and `architect` | Independent approval before completion. |

## Suggested Future Team Plan

If the user later approves execution, use `$ultragoal` plus `$team` only after audit artifacts exist:

1. UX lane: authenticated screenshots, task walkthrough, issue list.
2. Accessibility lane: keyboard/focus/status/contrast checks.
3. Performance lane: production trace and cache scenario.
4. Schema lane: RLS/RPC/count recheck.
5. Implementation lane: small first slice.
6. Review lane: code review plus visual/performance regression check.

## Explicit No-Code Boundary

This handoff does not authorize:

1. Source-code edits.
2. Supabase migrations.
3. Production data mutations.
4. New dependencies.
5. Visual redesign implementation.

It authorizes only audit execution, planning refinement, and future scoped implementation planning.

## Consensus Review Record

| Gate | Result | Evidence |
| --- | --- | --- |
| Architect review | APPROVE, `CLEAR` | Verified the plan corrects the 64px rail vs 288px sidebar model, DB counts, no-code boundary, and evidence-gated UX/performance recommendations. Recommended only wording cleanup in the readiness checklist. |
| Architect follow-up | Applied | `15_IMPLEMENTATION_READINESS_CHECKLIST.md` now distinguishes source/DB-verified planning evidence from pending authenticated visual proof. |
| Critic review | APPROVE | Verified files `00` through `16`, the `.omx` PRD/test spec, source citations, Next.js docs, signed-out route behavior, graph stats, and read-only Supabase counts/RLS claims. No required fixes. |
| Ralplan consensus gate | Complete | Planner artifacts exist, Architect review completed first, Critic review completed second, both approved. |

## Quality Gate Notes

Static checks after consensus:

1. `git diff --check` passed for the plan folder and `.omx` PRD/test spec.
2. The plan folder contains 17 markdown files, `00` through `16`.
3. Stale false claim phrases remain only in corrective/test-spec contexts.
4. No source-code implementation files were changed.
