---
title: Coherence, Traceability & Audit Absorption
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: Did the remediation genuinely absorb the prior audit? Is the traceability matrix internally consistent? What contradictions and new gaps survive? Is 12 docs enough?
---

# Coherence, Traceability & Audit Absorption

**Audit-absorption: 91/100. Internal-coherence: 86/100.** The remediation is real — every prior
critical and recommended document was genuinely closed with a concrete mechanism, not nominal
words. The deductions are a handful of specific defects (carried as V6, V8, V10, V14 in `01`).

## 1. Absorption table — did the remediation actually close the prior audit?

| Prior audit item | Closed? | Where in the remediated plan |
|---|---|---|
| C1 virtualization (fixed-height overlap) | **GENUINE** | doc 09 §Virtualization; doc 03 §Layout; Q22; AE7; RSK7 (mechanism has a residual blocker — V3) |
| C2 projectId plumbing | **GENUINE** | doc 01 §Components Tab; KTD6/U6; doc 11 §Project folder query; Q41 |
| C3 arrow-nav vs caret | **GENUINE** | doc 09 §Keyboard Policy; doc 03; Q23; RSK10 |
| C4 promotion atomicity | **GENUINE** | doc 07 §Promotion Contract; KTD8/U7; Q21/Q33; RSK8 (under-specs remain — V4) |
| C5 unreproduced U5 bug | **GENUINE** | doc 01; U5; `evidence/u5-…repro-note.md`; Q43 |
| Blind spot: realtime concurrency | **GENUINE** | doc 11 §Realtime/Concurrent Edits; AE9; Q29/Q30; RSK11 (stale-revision UX is net-new — V7) |
| Blind spot: mobile/touch | **PARTIAL** | doc 03/09 §Mobile; Q26 — spec'd but no implementation anchor |
| Blind spot: permissions | **GENUINE** | doc 11 §Permission Matrix; AE10; Q27/Q28; RSK12 (gate-function selection — V4b) |
| Blind spot: rollback/kill-switch | **GENUINE** | doc 12 §Feature Flags/Rollback; AE11; Q31; RSK13 |
| Blind spot: existing data (29 rows) | **GENUINE** | doc 12 §Existing Data; doc 10; Q12/Q32; RSK9 |
| Blind spot: analytics/i18n/error-budget | **PARTIAL** | doc 12 §Observability + doc 09 i18n note — no telemetry owner/event names (V14a) |
| 6 recommended new docs (07–12) | **GENUINE** | all six authored, on-topic, valid frontmatter |
| KTD7 overstatement / U3 no-migration | **GENUINE** | doc 07 §JSON Semantics; INDEX glossary — corrected & verified true |
| itemCost→unitCost canonical map | **GENUINE** | doc 07 Field Key Map; INDEX glossary |

**Net:** 12/14 GENUINE, 2 PARTIAL (mobile depth, telemetry specificity). This is a high-quality
remediation. The plan did not paper over the audit; it absorbed it.

## 2. Traceability matrix defects (doc 08) — V10

Doc 08 states its own invariant: "every QA row maps back to a requirement." It is violated:

- **Orphaned QA rows:** Q14, Q15, Q16, Q37, Q42 appear only under U8's unit row and map to **no**
  requirement. (These are the downstream-surface checks — history/AI/export/charts/published-image.)
  Fix: map Q14/Q15/Q16/Q37 → R8 (and/or R16); Q42 → R7 (+R8).
- **Unmapped risk:** RSK6 (image upload / storage policy) is referenced by no R/U/Q. Fix: map to
  U4/R1 image scope, or mark explicitly deferred.
- Everything else reconciles both ways: R1–R16, U1–U9, AE1–AE12, RSK1–5/7–13 are covered; Q1–Q43
  are all defined.

## 3. Internal contradictions / terminology drift

| # | Issue | Verdict |
|---|---|---|
| V8 | doc 04 **line 140** is a duplicated stray U9 "Tests:" bullet ending "dashboard aggregation **from source snapshot**," contradicting line 132 ("from row fields") and the line-131 amendment | **Real contradiction — delete line 140** |
| V6 | "survives project-source copy" (Q14/Q34) vs "stable/unique id" (doc 02:53) vs "rekeys row ids" (U8) — unreconciled; verbatim survival = cross-project collision | **Real gap — define the id rule** |
| — | "Creating" state vs 5-value `saveState` | **Consistent** — doc 03:36 and doc 09:72 both treat it as a per-row insert flag separate from `saveState` |
| — | express `designation = ""` | **Consistent** across docs 02/07/08/10 |
| — | "category Unassigned" | **Consistent** — survives only in doc 02:61 as a deliberate contrast to the *legacy* template, correctly attributed |
| — | line numbers presented as authoritative | **No** — INDEX:37 flags all as "indicative / re-grep"; disciplined |

## 4. New gaps the remediation did not cover

| Gap | Severity | Detail |
|---|---|---|
| Express stable-id generation + collision (V6) | **P1** | who mints it, UUID?, rekey-on-copy? — undefined |
| Stale-revision recovery UX net-new (V7) | **P1** | no existing conflict-error hook in the app |
| Telemetry owner + event names (V14a) | P2 | doc 12 lists metrics but no owning system/taxonomy |
| Draft-abandon on navigation/tab-switch (V14b) | P2 | docs 09/10/11 never cover the local-draft-abandon path |
| Static-docs gate is manual (V14c) | LOW | doc 12/Q38 "run or manually verify"; no script/owner |
| Rollout-order dependency implied not asserted | LOW | doc 12 §Ship Slices orders work but doesn't pin "U2 migration + flag must precede express inserts hitting prod classification" |

## 5. Is 12 documents enough? — Yes, with one decision record

**The pack is document-complete at 12 docs.** Every concern area the prior audit demanded now has
an owning document; a 13th content doc would be over-fragmentation. The remaining work is **fixes
inside existing docs** (V1–V14), not new files.

**The one document worth adding is a short decision record** (not a spec) resolving the strategic
questions in `05`:
- the day-0 scope cut (U1–U4 vs full bundle),
- the inline-vs-modal spike outcome,
- the table-now-vs-strip-the-hedge call.

Suggested location: `.ai/03_plans/2026-06-15-Express-Components/00-scope-and-premise-decision.md`
(or an entry in `.ai/05_decisions/`). This is the only genuinely missing artifact, and it is a
decision, not a document of analysis.
