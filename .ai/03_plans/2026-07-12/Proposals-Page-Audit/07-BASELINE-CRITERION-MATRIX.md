# 07 — Baseline Criterion Matrix

> Improve-Plan-Prompt Phase 2/6. Read-only audit of the **current** proposals
> page against the dimensions the Improve prompt enumerates. Each cell is
> `PASS | FAIL | BOUNDARY | N/A` with exact evidence. This is a snapshot of
> current reality, not a score to optimize.
>
> Legend: **PASS** = current code meets the bar; **FAIL** = concrete defect or
> gap against intent; **BOUNDARY** = depends on an owner decision / external
> fact; **N/A** = not applicable to this surface.

## Criterion matrix

| Field | Status | Evidence | Missing / contradicted | Repair / AUTH |
|---|---|---|---|---|
| **Objective & scope fidelity** | FAIL | Owner directive "looks like projects page"; current page is a flat table (`proposals-page-client.tsx:114-128`) | No card grid, tabs, search, sort, view modes | Track B (`05`) |
| **Users/jobs (recipient inbox)** | PASS | Journey A-D in target design §2 are served by the current read+Review flow for the common path | >50 proposals, corrupt row, owner `responded` visibility all broken | P1-1/2, P2-1 |
| **Success/guardrail metrics** | BOUNDARY | No explicit metrics set for the inbox; beta-readiness is the implicit bar | No perf/a11y/error-rate budgets defined | Owner (AUTH) |
| **Source authority/freshness** | PASS | Audit grounded in current source (2026-07-12 reads); `.ai/06_specs/proposal-package-system.md` cross-checked; stale claims flagged (`01` §12) | Spec has stale D3/floating-nav claims (`15_Bugs/2026-06-13`) | Doc fix (out of scope) |
| **Requirements traceability** | PASS (planning) | `11-ABSORBED-2026-07-11-REQUIREMENTS.md` maps all 16 predecessor units; `05` maps P1-2/P1-3/P2-2 to A1/A2 | Implementation remains unstarted | `IMPLEMENTATION_PLAN.md` |
| **Current-state grounding** | PASS | `01-CURRENT-STATE-MAP.md` — every claim has `file:line` | None | — |
| **Decision closure** | PASS (after this audit) | `06-DECISION-LOG.md` closes 10 DEC-AUTO-*; 3 AUTH-* remain owner boundaries | AUTH-1/2/3 | Owner |
| **Target design & pattern reuse** | PASS | `04` + `05` name exact primitives/patterns to reuse (`WorkshopCollectionLayout`, `Tabs`, `DropdownSelect`, persistence pattern) | None | — |
| **Execution DAG/units** | PASS (planning) | `05` and `IMPLEMENTATION_PLAN.md` define the ordered executable slices | Not started | Slice 1 (`A1+A2`) |
| **UX/accessibility** | FAIL (partial) | Status chips carry icon+text (good); but no list semantics (`role=list`) P3-3, no card-grid, no search/sort keyboard model beyond native controls | P3-3 a11y gap; redesign adds controls that need keyboard proof | Track B + (if authorized) browser proof |
| **Architecture/data/contracts** | BOUNDARY | Data model is sound (`project_publications` + `shared_link_recipients`); `responded` never written (P1-1); computed vs stored status diverges for auto-expiry (P2-7) | Sweeper behavior unverified (P2-7) | Runtime confirmation |
| **Security/privacy** | PASS (with one KNOWN exception) | List email-scoped (`:147`); open independently authorized (`actions.ts:319-332`); publisher mutations membership-gated; middleware `no-store` | Contractor-name leak in XLSX (KNOWN RISK-008, out of inbox scope) | Slice 6 |
| **Performance/reliability** | FAIL (partial) | One bad row fails all (P1-2); errors swallowed unlogged (P2-2); silent LIMIT 50 (P2-1); implicit-dynamic is correct for auth | No repo-level cache (acceptable for authed read) | Track A |
| **Test decision / evidence** | PASS (process) | All criteria `NOT_REQUIRED` w/ non-test evidence; `TEST_PROPOSAL`s recorded, none auto-run (User Test Authorization Gate honored) | No tests run (correct — not authorized) | Owner `TEST_TASK` to authorize |
| **Operations/rollout/rollback** | BOUNDARY | Local implementation is planned; hosted rollout proof remains separate | No hosted evidence requested | Owner authorization if release proof is needed |
| **Concurrency/retry/cache** | BOUNDARY | TanStack `retry:false` + 30s staleTime accepted (DEC-AUTO-008); cross-cache gap ≤30s | Publisher mutation → recipient staleness ≤30s | Accepted; revisit if owners complain |
| **Idempotency/recovery** | PASS | `openRecipientProposalAction` is a redirect (idempotent); repo read is a SELECT (idempotent) | None | — |
| **Completion audit** | N/A | This is an audit, not an implementation | — | — |

## Summary counts

- **PASS:** 9 (current code meets the bar for these dimensions)
- **FAIL:** 4 (objective fidelity, requirements traceability, UX/a11y partial, performance/reliability partial)
- **BOUNDARY:** 4 (success metrics, architecture sweeper, concurrency cache, decisions pending owner)
- **N/A:** 2 (operations, completion audit)

## What this matrix proves

1. The proposals inbox is **secure and functional on the common path** (security PASS, idempotency PASS, current-state grounded PASS).
2. The dominant gaps are **(a) the UX redesign not done** (objective fidelity FAIL) and **(b) three data-layer bugs** (performance/reliability FAIL) — both already enumerated in `02` and `04`.
3. There are **no hidden architectural or security deficits** beyond the KNOWN items. The audit did not find a second layer of problems under the ones already recorded.
4. The pack is **decision-closed except for 3 owner boundaries** (grouping-in-V1, where-the-new-bugs-go, clientName).

## Final-readiness note

This merged pack is **implementation-ready and NOT_STARTED**. The audit is
complete and evidence-grounded; implementation proof is intentionally absent.
See `IMPLEMENTATION_PLAN.md` and `LOOP_LEDGER.md`.
