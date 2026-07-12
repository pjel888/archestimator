# Archestimator Estimate Sheet — Lean Performance Refactor Plan Pack

**Plan date:** 2026-07-12  
**Repository:** `pjel888/archestimator`  
**Replaces:** `.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization`  
**Primary surface:** `/workshop/projects/[projectId]/estimates/[nodeId]`  
**Status:** `COMPLETE` — archived after the implementation record is finalized.  
**Implementation performed by this pack:** UNIT-001 through UNIT-004 completed; UNIT-005 and UNIT-006 were not activated.  
**Test/browser/provider activity performed by this pack:** no automated test, browser, build, or provider proof ran under the User Test Authorization Gate.

## Decision

The previous performance program is cancelled as an execution authority. It correctly identified several real bottlenecks, but it put an evidence platform, mode framework, receipt system, broad test expansion, and hosted-proof workflow in front of the first product optimization.

This replacement adopts a different operating model:

> **One user-visible symptom → one cheap trace → one proven bottleneck → one minimal production edit → one narrow correctness check → one before/after result.**

The estimate sheet does not need another performance framework. It needs a small number of direct hot-path fixes, beginning with the one existing baseline already proves: shared project-component updates scan thousands of unrelated rows.

## What changes

The new implementation sequence has four product slices:

1. **Fix measured project-component fan-out.**
2. **Isolate high-frequency row draft state and update totals incrementally.**
3. **Stop dormant full-tree derivations and simplify render subscriptions.**
4. **Touch route loading or virtualization only if a focused trace proves they remain dominant.**

A fifth slice removes the obsolete performance framework after the first real optimization lands, so cleanup cannot consume another implementation cycle before users benefit.

## What does not change

Preserve the current product behavior unless a unit explicitly says otherwise:

- canonical estimate calculations;
- optimistic saves and row-revision conflict handling;
- Group/Area hierarchy;
- tabs and route selection;
- row and branch virtualization;
- component-library identity propagation;
- proposal preview and export semantics;
- collaboration and activity history;
- current Cloudflare D1 authorization boundaries.

## Canonical files

| File | Purpose |
|---|---|
| `00-EXECUTIVE-RESET.md` | Binding replacement decision and scope |
| `01-OLD-PACK-FORENSIC-AUDIT.md` | Why the previous program stalled |
| `02-CURRENT-CODE-HOT-PATH-MAP.md` | Current implementation and likely costs |
| `03-RESEARCH-BACKED-REACT-PLAYBOOK.md` | Official React/Next/TanStack tactics tailored to this surface |
| `04-LEAN-AI-IMPLEMENTATION-PROTOCOL.md` | How an AI agent must execute without ceremony |
| `05-TARGET-ARCHITECTURE.md` | Minimal target architecture and state ownership |
| `06-MEASUREMENT-AND-BUDGETS.md` | Cheap metrics, budgets, and stop rules |
| `IMPLEMENTATION_PLAN.md` | Sole execution authority |
| `07-MINIMUM-SUFFICIENT-TESTING.md` | Risk-based, user-gated test proposals |
| `08-CLEANUP-AND-SIMPLIFICATION-MAP.md` | Exact tooling and dead-plumbing retirement plan |
| `09-RISKS-ROLLBACK-RELEASE.md` | Failure modes, rollback, and rollout |
| `10-REQUIREMENTS-TRACEABILITY.md` | Requirement → code → unit → evidence |
| `11-SOURCE-REGISTRY.md` | Repository and official research sources |
| `LOOP_LEDGER.md` | Small append-only implementation record |
| `PACK-MANIFEST.md` | File inventory and integrity summary |

## Authority

`IMPLEMENTATION_PLAN.md` is the only implementation authority.

The supporting documents explain why. They do not add hidden gates, mandatory reviewers, generated receipts, source fingerprints, or extra execution units.

If a supporting document conflicts with the implementation plan:

1. current `AGENTS.md`;
2. `IMPLEMENTATION_PLAN.md`;
3. current source;
4. supporting documents.

## Core constraints

- No new dependency.
- No new feature-flag system.
- No new benchmark framework.
- No generated runtime-evidence directories.
- No source-fingerprint gate.
- No automatic broad test expansion.
- No browser automation unless Philip explicitly authorizes it for the implementation task.
- No route/database work unless server timing proves it is material.
- No virtualization rewrite merely because the dataset is large.
- No React Compiler rollout; it is currently off.
- No global state rewrite beyond the high-frequency editable-draft boundary.
- No “clean architecture” refactor unrelated to a measured interaction.

## Definition of success

The refactor is successful when:

- a shared project-component edit does not scan unrelated rows;
- editing one row does not make the estimate-sheet root and unrelated rows do full-sheet work;
- visible node/project totals remain immediate and correct;
- closed dialogs and unopened panels do no full-tree derivation;
- the result meets the existing row-edit responsiveness target;
- implementation removes more performance machinery than it adds;
- the final production diff is materially smaller than the retired framework;
- behavior is preserved with the narrowest authorized evidence.

## Completion record

`LOOP_LEDGER.md` records the implemented units, static evidence, and the owner-gated focused test proposal. The archive preserves that validation boundary rather than claiming unrun automated proof.
