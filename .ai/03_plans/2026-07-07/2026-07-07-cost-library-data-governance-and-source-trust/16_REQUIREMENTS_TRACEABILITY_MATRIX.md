# 16 — Requirements Traceability Matrix

Directive-required column schema: `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | AC | Test/proof | Risk | Status | Gap/decision`.

Source-strength tags: `brief` (PROMPT.md), `repo evidence` (current source/migrations/tests), `official docs`, `provider proof`, `assumption`, `derived`, `owner-delegated decision`.

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | AC | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-REQ-1 | REQ-1/FR-1 Record full provenance (pricing source/date/confidence/currency/source URL/supplier/region/version) on every cost entry | `PROMPT.md` "provenance model"; `0028` D1 columns; `quick-add-validation.ts` | brief + repo evidence | `04` §Provenance | TASK-002,005,007,014,018 | AC-1.1..1.3 | PROOF-1 `quick-add-validation.test.ts` | low | pending | region/version gated by OPEN-2 |
| SRC-REQ-2 | REQ-2/FR-2 Distinguish owner-accepted origin from imported/unverified | `PROMPT.md` "mark owner decisions"; no existing origin concept (`03` G9) | brief + derived | `04` §Provenance | TASK-014,024 | AC-2.1..2.4 | PROOF-2 `origin-defaults-and-admin-set.test.ts` | medium (mislabeling) | pending | OPEN-1 affects which data gets owner-accepted |
| SRC-REQ-3 | REQ-3/FR-3 Review state machine on D1 (proposed/needs_review/accepted/rejected/superseded) + CHECKs | `supabase/20260622143000` enum+CHECKs (parity ref); `0028` D1 lacks them (`03` G2 D1-only) | repo evidence (reference) + derived | `04` §Review; `07` blueprint | TASK-005,006,007 | AC-3.1..3.4 | PROOF-3,4 `component-library-review-schema.test.ts`; PROOF-DB-1 | medium (D1 CHECK-on-ALTER) | pending | migration renumbered 0037→0038 (DRIFT-1); backfill mode OPEN-1 |
| SRC-REQ-4 | REQ-4/FR-4 Reviewer assignment + due dates | `supabase/20260622143000` `assign_cost_library_cost_refresh` (parity ref) | repo evidence (reference) | `04` §Review | TASK-009 | AC-4.1..4.3 | PROOF-5 `review-assign-cost-entry.test.ts` | low | pending | OPEN-5 role boundary |
| SRC-REQ-5 | REQ-5/FR-5 Accept/reject/supersede/lock/unlock with optimistic revision conflict guard | `supabase/20260622143000` 6 RPCs + `'40001'` (parity ref) | repo evidence (reference) | `04` §Review; `08` attack surface | TASK-010..013 | AC-5.1..5.4 | PROOF-6 `accept/reject/lock/supersede-cost-entry.test.ts`; PROOF-DB-2 | medium (D1 transaction) | pending | OPEN-5 |
| SRC-REQ-6 | REQ-6/FR-6 Append-only review-event audit trail | `supabase/20260622143000` `cost_library_cost_review_events` (parity ref); existing D1 `state_history` | repo evidence (reference) + derived (DEC-3 extend) | `04` §Review; `07` | TASK-005,009..013 | AC-6.1..6.3 | PROOF-7 `review-event-append-only.test.ts` | medium (D1 no-RLS, RISK-7) | pending | RISK-7 mitigation in `08` |
| SRC-REQ-7 | REQ-7/FR-7 Trust chips reflect review state + freshness + confidence | `source-trust-model.ts` `getComponentSourceTrustChips` (no review chip today) | repo evidence | `04` §Trust labels; `05` | TASK-015,019 | AC-7.1..7.3 | PROOF-8 `library-source-trust.test.ts` | low | pending | — |
| SRC-REQ-8 | REQ-8/FR-8 Estimate commit gate reads review state (block rejected/superseded; warn proposed/needs_review) | `source-trust-model.ts` `getLibraryCommitTrustGate` (blocks archived only today) | repo evidence | `04` §Trust labels | TASK-016 | AC-8.1..8.2 | PROOF-8 | low | pending | — |
| SRC-REQ-9 | REQ-9/SEC-1 Governance-admin authz (workspace admin/platform admin parity) | `supabase/20260622143000` `require_cost_library_governance_admin`; `d1-access.ts` has editor/member but no admin helper (`03` G5) | repo evidence | `04` §Roles; `08` | TASK-004 | AC-9.1..9.4 | PROOF-9 `authz-cost-library-governance-admin.test.ts` | high (authz) | pending | OPEN-5 role boundary assumption (admin=owner/admin role) |
| SRC-REQ-10 | REQ-10/FR-9 Stale propagation: library update → estimate rows source-changed | `source-trust-model.ts` reads source-changed; `estimates/` never writes it on mutation (`03` G3) | repo evidence | `04` §Stale; `06` DEC-4 | TASK-020,021,022 | AC-10.1..10.3 | PROOF-10 `stale-propagation.test.ts`; PROOF-PERF-2 | medium (fan-out) | pending | compare basis pinned (version+hash, not timestamp — ADV-10) |
| SRC-REQ-11 | REQ-11/FR-10 Region/version labels recorded + filterable | `PROMPT.md` "region/version labels" | brief | `04` §Stale | TASK-018,030,033 | AC-11.1..11.2 | PROOF-11 `region-version-labels.test.ts` | low | pending (OPEN-2) | OPEN-2 currency/region model |
| SRC-REQ-12 | REQ-12/FR-11 Freshness windows consistent across chips/gate/template/overview/export | `source-trust-model.ts` STALE=90/VERY_STALE=180 | repo evidence | `04` §Stale; `05` | TASK-015,019 | AC-12.1..12.2 | PROOF-12 | low | pending | — |
| SRC-REQ-13 | REQ-13/FR-12 Safe library import (CSV first + JSON, dry-run, formula guard, row cap, origin=imported, no overwrite accepted) | `PROMPT.md` "import validation"; no importer exists (`03` G4) | brief + derived | `04` §Import; `07` | TASK-024,025,028 | AC-13.1..13.5 | PROOF-13 `library-import.test.ts` | medium (injection) | pending (OPEN-6) | OPEN-6 resolved CSV-first (DEC-5) |
| SRC-REQ-14 | REQ-14/FR-13 Library export with provenance + review state | `PROMPT.md` "import/export safety" | brief | `04` §Import | TASK-026,027 | AC-14.1..14.2 | PROOF-14 `library-export.test.ts` | low | pending | — |
| SRC-REQ-15 | REQ-15/FR-14 Estimate row detail shows linked source review state | `PROMPT.md` "estimate impact" | brief | `04` §Estimate; `05` | TASK-029 | AC-15.1..15.2 | PROOF-15 `inspector-review-toolbar.test.tsx`; PROOF-A11Y-1 | low | pending | — |
| SRC-REQ-16 | REQ-16/DATA-1 Existing version/price/state history preserved + extended (DEC-3) | D1 `cost_library_item_versions/_price_history/_state_history` (`0026`) | repo evidence | `04` §Audit; `07` | TASK-005,007 | AC-16.1 | PROOF-16 `component-library-versioning-schema.test.ts` | low | pending | — |

## Traceability summary

- All 16 requirements trace to source evidence + strength tag + work item + AC + proof + risk + status + gap/decision. ✓
- All implementation tasks (`TASK-001..038`) reference ≥1 requirement. ✓
- All acceptance criteria objective + testable. ✓
- All shadow-path cells answered (`04`). ✓
- All DB changes have blueprint (`07`) + rollback (`13`) + migration `0038` (renumbered from `0037` — DRIFT-1). ✓

## Performance-sensitive requirements (extra mapping)

| Source ID | Baseline | Target | Measurement | Regression | Rollback trigger |
|---|---|---|---|---|---|
| SRC-REQ-10 (stale) | current estimate read p95 | ≤ baseline +5% | PROOF-PERF-2 (200-row estimate) | > +10% | fall back to non-computed source-changed |
| SRC-REQ-3,7 (review in browse) | current library browse p95 | ≤ baseline +10% | PROOF-PERF-1 (10k items) | > +15% | flag off review UI |
| SRC-REQ-3 (overview count) | n/a | ≤200ms @100k | PROOF-PERF-3 EXPLAIN | >500ms | denormalize via Cron |

## Coverage verification (completion gates)

- Every requirement has source evidence + AC + proof path. ✓
- No work item is orphaned (each maps to ≥1 REQ). ✓
- No REQ lacks a work item. ✓
- Gaps/decisions column populated for every REQ with an open decision. ✓
