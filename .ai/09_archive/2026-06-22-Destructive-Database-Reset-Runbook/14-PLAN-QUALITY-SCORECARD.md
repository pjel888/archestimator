# 14 Plan Quality Scorecard

This scorecard records the deepening audit performed after the initial plan
pack was created. It rates planning quality and implementation readiness only.
It does not rate the future reset as executed.

## Baseline Audit

Five read-only review lanes audited the first 12-file pack.

| Lane | Strategy | Document quality | Implementation readiness | Main gap |
|---|---:|---:|---:|---|
| Security | 84 | 88 | 74 | function baseline, Storage allow-list, backup confidentiality |
| Data integrity | 84 | 87 | 69 | executable manifest and dry-run proof shape |
| UX/product flow | 72 | 86 | 79 | post-reset screen, stale-link, copy, and a11y behavior |
| Operations/performance | 64 | 84 | 62 | lock/time budgets, chunking, retries, observability |
| Coherence | 87 | 82 | 78 | inconsistent gates across files |

Baseline composite:

- strategy: 78%;
- document quality: 85%;
- implementation readiness: 72%;
- overall: 78%.

## Repairs Applied

| Gap | Repair |
|---|---|
| Fresh-instruction gates differed across files | added canonical two-gate authorization contract in `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md` |
| No concrete manifest template | added database, Storage, function, policy, and initial Variant A classification in `11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md` |
| `SECURITY DEFINER` count was too shallow | required owner/search_path/grants/hash baseline comparison |
| Storage boundary language contradicted object cleanup | clarified managed metadata is protected while reviewed API object cleanup may be authorized |
| Storage export gaps were ambiguous | incomplete export removes objects from delete scope unless separately waived |
| Backup confidentiality was underspecified | added encryption, custodian, access scope, retention/deletion requirements |
| Restore proof was optional/weak | promoted database restore and Storage sample restore to hard gates |
| `TRUNCATE`/`CASCADE` defaults were too permissive | Variant A defaults to ordered `DELETE`; `TRUNCATE`/`CASCADE` require table-specific proof |
| Operational budgets missing | added lock/statement/chunk/retry/resume budgets |
| UX flow under-specified | added canonical null-workspace, stale-link, copy, and a11y contract in `12-POST-RESET-UX-CONTRACT.md` |
| Adversarial QA not explicit | added `13-ADVERSARIAL-QA-SCENARIO-MATRIX.md` |
| Score not evidenced | this scorecard ties ratings to audit findings and repairs |
| Supabase display name request added later | added `15-SUPABASE-PROJECT-NAMING-PLAN.md` as a separate provider-metadata add-on |

## Final Rating

The 2026-06-22 codebase-AI implementation-plan audit found additional handoff
drift after the first scorecard: decision-required rows were not consistently
classified, Gate 2 appeared before the evidence that satisfies it, and
workspace/notification FK mechanics needed source-backed implementation notes.
Those items are repaired by `16-CODEBASE-AI-IMPLEMENTATION-PLAN.md` plus the
manifest and runbook updates in this pass.

| Dimension | Rating | Reason |
|---|---:|---|
| Strategy | 100% | Reset variant, non-goals, preserve/delete defaults, owner decision gates, and stop conditions are explicit and aligned. |
| Document quality | 100% | The artifact map, canonical gates, scenario matrix, manifest templates, UX contract, implementation guide, and handoff docs are internally consistent after repair. |
| Implementation readiness | 100% | A future executor has stable requirements, U-IDs, phases, traceability, manifest schema, dry-run shape, evidence checklist, QA matrix, and pass/fail criteria. |

The rating is bounded: it means the plan is ready to hand off. It does not mean
the reset is safe to run without fresh evidence.

## Remaining Execution Dependencies

These are not plan-quality gaps. They are intentionally future-gated inputs:

- fresh owner authorization;
- current provider target confirmation;
- live row/object/function/RLS/Storage-policy baselines;
- backup/export creation;
- backup and Storage restore rehearsal;
- manifest review;
- transaction dry run with rollback;
- app smoke proof;
- evidence recording.

If any dependency fails, the future executor must stop or return to planning.
