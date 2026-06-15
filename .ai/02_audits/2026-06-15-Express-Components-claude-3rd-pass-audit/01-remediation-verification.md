---
title: Remediation Verification — Pass-2 Findings & Strategic Decisions
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: Did the applying agent actually absorb the pass-2 audit? Every V-finding and S0 decision, verified against the revised docs AND live code.
---

# Remediation Verification

**Audit-absorption score: 92/100.** Every pass-2 finding and strategic decision was applied,
and the strongest ones (V11, V13, V5) were code-verified to point at the right symbols. The
remediation did **not** repeat the V1 stale-migration error. Two findings have important
*nuances* (V6, V4b) where the doc-level change is present but the underlying claim about
existing code behavior is wrong — those are promoted to new P1 findings (BR-N2, SEC-N1).

## Pass-2 findings (V1–V14)

| ID | Pass-2 issue | Status | Evidence (plan + code) |
|---|---|---|---|
| V1 | `contingencyPercentage` "dropped" (retracted) | **correct** | Live RPC `20260524050746:505/392/84` persists it; doc 07 Field Key Map keeps it as a working key. Retraction honored — not wrongly "fixed." |
| V2 | AI package-builder write clobbers metadata | **correct (but incomplete — see BR-N1)** | doc 04 U8:135, doc 07:68, doc 10:25, Q44, RSK14. Real: `apply.ts:590` wholesale metadata → `replace` RPC. *Gap:* the same hazard on the drag/drop path was not covered (BR-N1). |
| V3 | Virtualization: content-visibility breaks measureElement | **correct** | doc 09:9–31 makes disable-while-editing the **primary** day-0 path, measureElement demoted to follow-up; consistent in doc 03:103, doc 10:18, Q22, RSK7. Matches real CSS (`row-table.tsx:185/421/598`). |
| V4a | Promotion editor gate isn't free (membership-only today) | **correct** | doc 07:122-123, doc 11:69-70. Verified: `validate_cost_library_component_refs:318-325` = membership only. |
| V4b | Pin the gate function (`is_workspace_editor` includes member) | **misapplied → SEC-N1** | The doc warns against `is_workspace_editor` AND says "match the library write policy exactly" — but that policy **is** `is_workspace_editor`. Self-contradictory. See SEC-N1/DB-N3/CO-N4. |
| V4c | Price-option NOT-NULL columns | **correct** | doc 07:141, doc 11:92 enumerate `label/currency/workspace_id/item_id`; matches `20260523120957:40-60`. |
| V4d | DEFINER grants + folder-workspace binding | **correct** | doc 07:129-135 (search_path, REVOKE, grant-authenticated, all-authz-inside, no-leak-on-fail). Minor wording: "revoke from public/anon" vs the row-RPC pattern "revoke from public." |
| V5 | sort_order computed outside the RPC lock | **correct** | doc 07:97-99, U2:84, doc 10:24, doc 11:83, Q45, RSK15. Verified: `actions.ts:2514-2524` outside lock; `unique(node_id,sort_order) deferrable` core `:117`. |
| V6 | Express-id rule (UUIDv4, rekey on copy) | **doc applied; behavior FALSE → BR-N2** | Docs consistently state rekey-on-copy (00/02/04 KTD2/07/Q14/Q34), but **no code rekeys it** — the copy RPC `20260613134852:219` copies metadata verbatim. P1 BR-N2. |
| V7 | Stale-revision recovery UX is net-new | **correct** | doc 11:33 explicitly "do not assume an existing hook"; names `estimate_sheet_row_revision_conflict` (matches `20260524050746:490`). Verified no app handler exists. |
| V8 | doc 04 line-140 duplicated/contradictory bullet | **correct** | U9 now has exactly one Tests bullet; the "dashboard from source snapshot" contradiction is gone (the pack was authored fresh, so it never entered). |
| V9 | `#7F7F7F` fails AA | **correct (one residue → UX-N1)** | doc 03:107, doc 09:127-130 floor at `#5D5D5D`. Residue: the reused Project-specific badge (`cells.tsx:277`) is still `#7F7F7F` and grandfathered. |
| V10 | Orphaned QA rows + RSK6 unmapped | **correct (R-direction; one residue → CO-N2)** | doc 08 maps Q14/15/16/37/42 + RSK6 both… in the **R→Q** direction. Residue: Q35/Q40 still unmapped in the **Unit→Q** half. |
| V11 | U1 read-path = estimate-repository.ts, not workspace-repository | **correct** | doc 04 U1:74 re-pointed; verified `estimate-repository.ts:45` SELECT omits metadata, `:71-92` maps none; cites isPersistedPlaceholder. |
| V12 | `applyEditableValuesToLibraryItem` misdescription | **correct** | doc 10:23 reworded to "object spread preserves…; the function only applies numeric/contingency/misc." Matches `EstimateSheetContent.tsx:398-416`. |
| V13 | "draft has no id to broadcast" was false | **correct** | doc 11:11-20 now requires **active** suppression via `persisted=false`. Verified the optimistic id equals persisted id (`actions.ts:2528`) and is in the DOM pre-persist. |
| V14 | Telemetry owner/events; draft-abandon; static gate | **correct (one residue → OB-N1)** | doc 12:77-97 owner + 16 event names; doc 11:45 draft-abandon; Q47. Residue: the "existing analytics surface" it defers to doesn't concretely exist (OB-N1). |

## Strategic decisions (S0.1–S0.3)

| ID | Decision | Status | Evidence |
|---|---|---|---|
| S0.1 | Day-0 cut to U1–U4 + minimum U9 | **applied (one residue → CO-N1)** | `00:13-27`, INDEX:17, doc 04:13/26-27, doc 12 ship-slices. Residue: doc 08 traceability matrix does **not** encode the cut (CO-N1). |
| S0.2 | Inline-vs-modal spike gate | **applied-incompletely → STRAT-N1/N2** | `00:29-40` real go/no-go criteria. Gaps: no modal design for the fail branch (STRAT-N1), no owner/evidence artifact (STRAT-N2). |
| S0.3 | Table-vs-hedge (keep row-lifetime id, no table) | **genuinely resolved** | `00:42-56` demotes the id from "forward-compat hedge" to row-lifetime UI identity with the rekey rule — resolves the pass-2 "building the catalog's key while deferring the catalog" incoherence. (But the rekey itself isn't implemented — BR-N2.) |

## Reading

The remediation is real and high-quality. The two **misapplied** items (V6, V4b) and the
several **residues** are not failures of effort — they are the points where a doc-level fix
asserted something about existing code that a deeper code read refutes. Those become the new
findings in `02`–`04`. Nothing here needs re-doing wholesale; the pack's spine is sound.
