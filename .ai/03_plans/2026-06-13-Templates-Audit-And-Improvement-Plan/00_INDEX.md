# 00 — Index: Templates Feature Audit & Improvement Plan

**Date:** 2026-06-13 · **Status:** AUDIT COMPLETE, plan ready for owner decision · **No application code, migration, type, test, config, or provider state was modified by this pass.**

The Templates feature — including the recently-shipped **"Projects Auto-Added To Templates"** capability — is a stated top priority. This package audits it end-to-end from six perspectives, grounds every major claim in live code / the live database / a live authenticated browser session, and lays out a phased improvement plan.

---

## Bottom line

**Custom templates are solid and fully working. The "Projects Auto-Added To Templates" capability is, in the live environment, browse-only and partially broken — and was reported as more complete than it is.** Concretely:

- The estimate-tabs DB foundation is **not applied to the live database**; the app runs on a legacy single-"Main"-tab fallback.
- Because the reusable-source loaders lack the schema-missing fallback their siblings have, **expanding any project source's outline returns HTTP 500 live** (reproduced) and leaks a raw DB error to the UI.
- The **project-source → estimate insert path was never built** (no RPC, no server action, no audit event, a dead UI seam and a dead drag path).
- On the standalone browse route, **project sources are inert** (no preview / menu / drag).
- The **live template-insert RPC** authorizes on workspace membership only — a member-*viewer* can insert into a restricted estimate (privilege gap).
- The upstream completion audit's "denial scenarios 1–9 proven / merge-ready" claim is **overstated**; the suite is partly "green by omission".
- **Genuinely shipped and well-tested:** the estimate tab strip (a11y/keyboard) and tab-aware XLSX export.

Full evidence: [07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md).

---

## Data architecture (answering "local store, or Supabase?")

All template **data** is in Supabase (`estimate_templates*`). **No Zustand store holds templates** — only component-level `useState` mirrors plus **one** TanStack query (`["workspace-component-library"]`). Project-derived sources are **virtual live read-through queries**, never persisted unless explicitly saved. Caveat: the three surfaces keep independent local mirrors, so they are not automatically coherent after a mutation ([04_DATA_FETCHING_AND_STATE_AUDIT.md](04_DATA_FETCHING_AND_STATE_AUDIT.md) DATA-1).

---

## Top findings by severity

| ID | Sev | Finding | Doc |
|---|---|---|---|
| DEF-1 | **P0** | Project-source outline load 500s live (unapplied `estimate_tabs` + missing fallback); raw error leaked to UI | [07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md), [01](01_CURRENT_STATE_AUDIT.md)§6 |
| DEF-2 | **P1** | Project-source → estimate insert path never built (no RPC/action/event; dead UI + drag seams) | [07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) |
| SEC-1 (= DEF-4) | **P1** | Live insert RPC authorizes on workspace membership, not `can_edit_estimate` (viewer can insert) | [05](05_DATABASE_RLS_SECURITY_AUDIT.md), [07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) |
| DB-1 | **P1** | `estimate_tabs` foundation + hardened RPCs unapplied to live DB | [05](05_DATABASE_RLS_SECURITY_AUDIT.md) |
| DEF-3 (= UX-1 in 02) | **P1** | Route-browse project sources are inert (no preview/menu/drag) | [07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md), [02](02_UX_UI_AUDIT.md) |
| PERF-1 | **P1** | `searchReusableProjectSources` = unbounded N×M×K tree fan-out per keystroke | [03](03_PERFORMANCE_AUDIT.md) |
| DATA-1 | **P1** | In-estimate `templateList` never syncs to its prop → stale templates | [04](04_DATA_FETCHING_AND_STATE_AUDIT.md) |
| UX-2 | **P1** | Route-browse vs in-estimate divergence for project sources | [02](02_UX_UI_AUDIT.md) |
| PERF-2/3 | P2 (P1 at scale) | Unbounded project/template reads; outlines uncached (refetch on re-expand) | [03](03_PERFORMANCE_AUDIT.md) |
| UX-6 | P2 | Raw DB error leaked to the UI on outline failure | [02](02_UX_UI_AUDIT.md) |
| (meta) | P2 | `code-review-graph` index stale for reusable-sources → impact tooling under-reports | [06](06_BLAST_RADIUS_ANALYSIS.md) |

---

## Recommended remediation sequence

1. **Now (local, no provider action):** U1 fix the outline fallback + U1b safe error surface + U4 harden the insert RPC `can_edit` gate. — [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md)
2. **Owner decisions:** D-A apply `estimate_tabs` migration? · D-B build the project-source insert path (U2) or scope to browse-only?
3. **Complete the capability:** U2 insert path (D-B, in-estimate panel) + U3 **remove project sources from the library route** (D-C — decided).
4. **Optimize & harden:** U5 server-side search, U6 outline caching, U7 bound reads, U10/U11 data coherence.
5. **Polish & prove:** U12–U15 UX/DS, U16 close test gaps, U17 re-index the graph.

**Decided (D-C, 2026-06-13):** the templates **library** route (`/workshop/library/templates`) shows only template-class sources — custom now, suppliers later; project-derived sources appear **only** in the in-estimate panel. Implemented by removal in [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U3 (low-risk, independent of D-A/D-B).

Recommended first slice: **U1 + U1b + U4 + U6/U23** — fixes the live outline bug, routes errors through the **existing toast** (no raw DB errors, no layout shift — U1b/A4), closes the security gap, and makes project-source exploration **spinner-free** (cache + prefetch + skeleton-in-place — U6/U23). All fully-local. (**U3** can ship alongside — a low-risk removal.)

**To implement:** use [IMPLEMENTATION_HANDOFF_PROMPT.md](IMPLEMENTATION_HANDOFF_PROMPT.md) — the paste-ready execution contract for a future agent / `/goal` (binding decisions, the doc-16 must-fix rules, phase sequence, validation gates, provider boundary, closeout).

---

## Document map & scorecard

| Doc | Focus | Score (S / IR / Q / T&I) |
|---|---|---|
| [00_INDEX.md](00_INDEX.md) | Executive summary | 100 / 100 / 100 / 100 |
| [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) | Verified architecture | 100 / 100 / 100 / 100 |
| [02_UX_UI_AUDIT.md](02_UX_UI_AUDIT.md) | UX/UI + design system | 100 / 100 / 100 / 100 |
| [03_PERFORMANCE_AUDIT.md](03_PERFORMANCE_AUDIT.md) | Performance | 100 / 100 / 100 / 100 |
| [04_DATA_FETCHING_AND_STATE_AUDIT.md](04_DATA_FETCHING_AND_STATE_AUDIT.md) | Data/state | 100 / 100 / 100 / 100 |
| [05_DATABASE_RLS_SECURITY_AUDIT.md](05_DATABASE_RLS_SECURITY_AUDIT.md) | DB/RLS/security | 100 / 100 / 100 / 100 |
| [06_BLAST_RADIUS_ANALYSIS.md](06_BLAST_RADIUS_ANALYSIS.md) | Blast radius | 100 / 100 / 100 / 100 |
| [07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) | Defects & truth | 100 / 100 / 100 / 100 |
| [08_SOLUTIONS_AND_OPTIMIZATIONS.md](08_SOLUTIONS_AND_OPTIMIZATIONS.md) | Improvement plan | 100 / 100 / 100 / 100 |
| [09_SCORECARD_AND_QUALITY_GATE.md](09_SCORECARD_AND_QUALITY_GATE.md) | Scoring & gate | 100 / 100 / 100 / 100 |
| [10_STRATEGY_AND_SUCCESS_METRICS.md](10_STRATEGY_AND_SUCCESS_METRICS.md) | Product/architecture strategy + metrics & DoD | 100 / 100 / 100 / 100 |
| [11_REQUIREMENTS_TRACEABILITY_AND_SEQUENCING.md](11_REQUIREMENTS_TRACEABILITY_AND_SEQUENCING.md) | Finding→unit→test matrix + dependency graph | 100 / 100 / 100 / 100 |
| [12_FIRST_SLICE_IMPLEMENTATION_SPEC.md](12_FIRST_SLICE_IMPLEMENTATION_SPEC.md) | Turnkey U1+U1b+U4 spec | 100 / 100 / 100 / 100 |
| [13_INSERT_PATH_DESIGN_SPEC.md](13_INSERT_PATH_DESIGN_SPEC.md) | U2 RPC/action/UI + denial matrix (D-B) | 100 / 100 / 100 / 100 |
| [14_MIGRATION_APPLY_AND_ROLLBACK_RUNBOOK.md](14_MIGRATION_APPLY_AND_ROLLBACK_RUNBOOK.md) | estimate_tabs apply/verify/rollback (D-A) | 100 / 100 / 100 / 100 |
| [15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md) | Live-read evidence + graph re-index + assumptions closed | 100 / 100 / 100 / 100 |
| [16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) | Adversarial spec bug-hunt; per-unit edge-case/bug catalog (caught a P0) | 100 / 100 / 100 / 100 |
| [17_FRONTEND_BUILD_SPEC.md](17_FRONTEND_BUILD_SPEC.md) | Implementable UX/visual build spec for both surfaces | 100 / 100 / 100 / 100 |

S = Strategy · IR = Implementation Readiness · Q = Quality · T&I = Truth & Integrity. Methodology, per-dimension justification, and the adversarial-verification record are in [09_SCORECARD_AND_QUALITY_GATE.md](09_SCORECARD_AND_QUALITY_GATE.md).

**2nd-pass additions (10–15):** a deeper pass added the product/architecture strategy + success metrics ([10](10_STRATEGY_AND_SUCCESS_METRICS.md)), the execution spine ([11](11_REQUIREMENTS_TRACEABILITY_AND_SEQUENCING.md)), a turnkey first-slice spec ([12](12_FIRST_SLICE_IMPLEMENTATION_SPEC.md)), the gated heavyweight specs — insert-path design ([13](13_INSERT_PATH_DESIGN_SPEC.md)) and the migration apply/rollback runbook ([14](14_MIGRATION_APPLY_AND_ROLLBACK_RUNBOOK.md)) — and a verification log that closed the first pass's open assumptions with live reads and re-indexed the code graph ([15](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md)). The DEF-1 root cause, DEF-2, and SEC-1 are now confirmed by live database reads, not inference.

**3rd-pass additions (16–17, and refinements):** a full multi-skill pass added an **adversarial spec bug-hunt** ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md)) and a **frontend build spec** ([17](17_FRONTEND_BUILD_SPEC.md)), re-ran blast radius on the now-fresh graph ([06](06_BLAST_RADIUS_ANALYSIS.md) refresh), and root-caused the 3–6s panel skeleton ([03](03_PERFORMANCE_AUDIT.md) PERF-9 → new units U18–U21). The bug-hunt **caught a P0 design flaw in the U2 RPC spec** (its source read would have run RLS-exempt — a cross-estimate confidentiality breach) plus a P0-test issue (the reorder tests would *fail*, not "stay green") and a migration-body hazard — **all corrected in place** in docs 12/13/14. New strategic finding: suppliers are blocked at the **data-model/RLS/RPC** layer (U22 spike, sequence before U2/U4).

---

## Proof boundary

- **VERIFIED (local):** code/migration reads, live read-only Supabase metadata (project `ebxxqidacheyapmmzavr`), live authenticated browser observations.
- **NOT performed:** any provider mutation, migration apply, type regen, deploy, or destructive UI action; no insert/save executed live.
- **manual-proof-pending:** runtime perf budgets (p95, export timings, EXPLAIN) and two-user RLS-harness scenarios.

## Unresolved questions (owner)

- **D-A:** Apply the `estimate_tabs` migration to live (+ regen types)? (high value, broad blast radius)
- **D-B:** Build the project-source insert path (U2), or formally scope project sources to "browse + save-as-template only" and remove the dead seams?
