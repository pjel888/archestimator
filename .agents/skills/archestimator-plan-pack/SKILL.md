---
name: archestimator-plan-pack
description: Route Archestimator work into Direct, Brief, or the canonical Plan Pack workflow and keep high-risk plans executable through closeout. Use for an explicit Plan Pack request or work genuinely expensive to reverse; do not create a Plan Pack for ordinary features, debugging, UI work, focused refactors, or as a second workflow around Direct or Brief work.
---

# Archestimator Plan Pack Binding

This is a thin repository adapter. `AGENTS.md` and
`.ai/00_system/PLAN_PACK_EXECUTION_POLICY.md` own lane selection. The planning
suite supplies the one canonical Plan Pack workflow; this skill does not create
another lifecycle, ledger, or approval layer.

## Routing

- **Direct:** clear, bounded work; no written plan.
- **Brief:** multi-file, moderately risky, or ambiguous work; keep a compact
  in-session target, sequence, evidence choice, and stop condition.
- **Plan Pack:** explicit exhaustive planning or genuinely expensive-to-reverse
  destructive data, live auth/token compatibility, material security boundary,
  broad architecture replacement, or coordinated multi-owner work.

High blast radius increases analysis depth, not automatic artifacts, agents,
tests, reviewers, rollout, or approval.

## Plan Pack Workflow

1. Load `.ai/08_prompts/000_Planning Prompts/README.md`, then only the kernel,
   triggered gates, current stage prompt, and schema it routes.
2. Load
   `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`
   only when orchestration is selected; it governs handoffs inside the same Plan
   Pack rather than defining another workflow.
3. Reconcile the current user request, Git state, active diff, source,
   configuration, and manifest before authoring and before each execution unit.
   Repair stale paths, assumptions, dependencies, status, and hashes locally.
4. Create `plan-pack.json` plus only the artifacts a fresh executor needs. Use
   `NOT_REQUIRED`, `TEST_PROPOSAL`, or `TEST_TASK` from the Validation Matrix.
5. Validate with the executable contract:

   ```bash
   bun run validate:plan-pack -- <folder>
   ```

6. During execution, reread current source, integrate by dependency boundary,
   inspect actual artifacts, and rerun only invalidated authorized evidence.

## Closeout

- Audit every original requirement, decision, boundary, risk, cleanup item, and
  deliverable against fresh evidence.
- Resolve every repository-controlled prerequisite while safe work remains.
  Reserve `AUTH_BLOCKED` for an exact prohibited external action and
  `TECH_BLOCKED` for a core deliverable that remains impossible after materially
  different local fallbacks fail.
- Use `ACHIEVED` only when every core repository requirement is complete and
  evidenced; use `CANCELLED` only when the user cancelled.
- Update canonical state, archive only after the requirement audit, validate the
  archived copy, and leave no partial or stale duplicate active pack.

Preserve unrelated shared-worktree changes and every Git, provider, external
side-effect, and user test boundary from `AGENTS.md`.
