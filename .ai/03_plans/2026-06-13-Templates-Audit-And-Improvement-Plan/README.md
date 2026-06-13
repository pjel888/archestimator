# Templates Feature — Comprehensive Audit & Improvement Plan

**Date:** 2026-06-13
**Status:** AUDIT COMPLETE — improvement plan ready for owner decision
**Type:** Audit + planning pass (no application code, migrations, types, tests, config, or provider state was modified)
**Scope:** The Templates feature end-to-end — the route-level browse (`/workshop/library/templates`), the template editor (`/workshop/library/templates/[templateId]`), the in-estimate Templates panel (reachable from `/workshop/projects/[projectId]/estimates/[nodeId]`), and the recently-shipped **"Projects Auto-Added To Templates"** capability (virtual, read-through project-derived sources).

> Treat the live codebase as authoritative. Every major claim cites `file:line`, a migration, a test, a live DB read, or a live browser observation. Claims that could not be proven without provider/runtime access are labelled **ASSUMPTION** or **manual-proof-pending**.

---

## How this package was produced

Six parallel read-only audit lanes (UX/UI, performance, data-fetching & state, database/RLS/security, blast radius, test-coverage & readiness) plus a live authenticated browser session against the running dev server (`localhost:3000`). Findings were triangulated across lanes; the headline defect (the project-source outline 500) was reproduced live and root-caused in code.

The upstream feature plan pack is archived at `.ai/09_archive/store/2026-06-12-Projects-Auto-Added-To-Templates/`; the original and implementation prompts are at `.ai/08_prompts/2026-06-12-Projects-Auto-Added-To-Templates.md` and `.ai/08_prompts/IMPLEMENT-2026-06-12-Projects-Auto-Added-To-Templates.md`.

---

## Document map

| File | Purpose |
|------|---------|
| [00_INDEX.md](00_INDEX.md) | Executive summary, reality-vs-claim reframe, top findings, scorecard, recommended remediation sequence |
| [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) | Verified architecture of every Templates surface; local-store-vs-Supabase verdict; live browser walkthrough |
| [02_UX_UI_AUDIT.md](02_UX_UI_AUDIT.md) | UX/UI findings, design-system violations, surface divergence, accessibility |
| [03_PERFORMANCE_AUDIT.md](03_PERFORMANCE_AUDIT.md) | Fetching/caching map, N+1 fan-out, unbounded reads, budget compliance, optimizations |
| [04_DATA_FETCHING_AND_STATE_AUDIT.md](04_DATA_FETCHING_AND_STATE_AUDIT.md) | Definitive data-source table, query keys, invalidation gaps, cache coherence |
| [05_DATABASE_RLS_SECURITY_AUDIT.md](05_DATABASE_RLS_SECURITY_AUDIT.md) | Schema, RLS, denial-scenario matrix, SECURITY DEFINER review, unapplied-migration reality |
| [06_BLAST_RADIUS_ANALYSIS.md](06_BLAST_RADIUS_ANALYSIS.md) | Impact matrix per symbol, coupled surfaces, "what breaks if we change X" |
| [07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) | The live 500 root cause, the unbuilt insert path, completion-audit overstatement (truth & integrity centerpiece) |
| [08_SOLUTIONS_AND_OPTIMIZATIONS.md](08_SOLUTIONS_AND_OPTIMIZATIONS.md) | Prioritized, phased improvement plan with implementation units, blast radius, and tests |
| [09_SCORECARD_AND_QUALITY_GATE.md](09_SCORECARD_AND_QUALITY_GATE.md) | Per-document scores (strategy / implementation-readiness / quality / truth & integrity) and pass/fail gate |
| [10_STRATEGY_AND_SUCCESS_METRICS.md](10_STRATEGY_AND_SUCCESS_METRICS.md) | Product/architecture strategy, build-vs-cut, and feature success metrics & DoD |
| [11_REQUIREMENTS_TRACEABILITY_AND_SEQUENCING.md](11_REQUIREMENTS_TRACEABILITY_AND_SEQUENCING.md) | Finding→unit→test→risk matrix and dependency/sequencing graph |
| [12_FIRST_SLICE_IMPLEMENTATION_SPEC.md](12_FIRST_SLICE_IMPLEMENTATION_SPEC.md) | Turnkey spec for the U1+U1b+U4 first slice |
| [13_INSERT_PATH_DESIGN_SPEC.md](13_INSERT_PATH_DESIGN_SPEC.md) | U2 insert-path RPC/action/UI design + denial matrix (gated on D-B) |
| [14_MIGRATION_APPLY_AND_ROLLBACK_RUNBOOK.md](14_MIGRATION_APPLY_AND_ROLLBACK_RUNBOOK.md) | estimate_tabs apply, verification SQL, regression checklist, rollback (gated on D-A) |
| [15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md) | 2nd-pass live-read evidence, code-graph re-index, and assumptions closure |
| [16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) | Adversarial spec bug-hunt: per-unit edge-case & bug catalog with must-fix-before-implementation ranking |
| [17_FRONTEND_BUILD_SPEC.md](17_FRONTEND_BUILD_SPEC.md) | Implementable UX/visual build spec for both Templates surfaces (incl. design-system compliance checklist) |
| [IMPLEMENTATION_HANDOFF_PROMPT.md](IMPLEMENTATION_HANDOFF_PROMPT.md) | **Paste-ready execution contract** for a future implementation agent / `/goal` — start here when building |

---

## Reading order

1. **Decision-makers:** `00_INDEX.md` → `07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md` → `08_SOLUTIONS_AND_OPTIMIZATIONS.md`.
2. **Implementers:** `IMPLEMENTATION_HANDOFF_PROMPT.md` (execution contract) → `16` (must-fix) → the spec for your unit (`12`/`13`/`14`/`17`) → `08_SOLUTIONS_AND_OPTIMIZATIONS.md`.
3. **Reviewers:** `09_SCORECARD_AND_QUALITY_GATE.md` first, then spot-check citations.

## Proof boundary

- **VERIFIED (local):** code reads, migration reads, live read-only Supabase metadata queries (project `ebxxqidacheyapmmzavr`), and live browser observations against the running dev server.
- **NOT performed:** any provider mutation, migration apply, type regeneration, deploy, or destructive UI action. No insert/save was executed in the live app.
- **manual-proof-pending:** runtime perf budgets (p95 latencies, export timings) and two-user RLS harness scenarios that require executing suites/harnesses.
