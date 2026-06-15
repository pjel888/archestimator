---
title: Express Components Traceability Matrix
type: docs
date: 2026-06-15
---

# Express Components Traceability Matrix

Every requirement maps to at least one unit, acceptance example, QA row, and risk. Every QA row maps back to a requirement.

This matrix also records the day-0 cut from `00-scope-and-premise-decision.md` and the active third-pass audit findings from `.ai/02_audits/2026-06-15-Express-Components-claude-3rd-pass-audit/`. U1-U4 plus the U9 subset are day-0. U5 is verification/normalization unless its evidence note captures a real production bug. U6 and U7 are fast-follow unless a new scope decision supersedes doc 00.

## Third-Pass Audit Finding Map

| Finding | Status | Owning docs/units | QA/evidence |
| --- | --- | --- | --- |
| DB-N1 viewer write authorization gap | Day-0 P1 | U9, docs 01/04/11 | Q27, Q56 |
| BR-N1 replace/move clobbers express metadata | Day-0 P1 | U8, docs 01/02/04/07/10 | Q35, Q50, Q56 |
| BR-N2 copy rekey not implemented | Day-0 P1 | U8, docs 00/02/04/07 | Q14, Q51, Q56 |
| SEC-N2 no realtime row sync | Day-0 P1 | U9, docs 04/05/11 | Q29, Q52, Q56 |
| PERF-N1 express editor state location | Day-0 P1 | U4, docs 03/04/09 | Q49 |
| DM-N1 legacy source-less row safety | Day-0 P1 | U2/U8, docs 02/04/10, `evidence/live-supabase-evidence.md` | Q53 |
| CO-N1 day-0 cut missing from traceability | Day-0 P1 | doc 08 | this section |
| STRAT-N1 modal fallback unplanned | Day-0 P1 | docs 00/03, `evidence/inline-vs-modal-spike-result.md` | Q22, Q55 |
| SEC-N1 promotion-gate contradiction | Fast-follow P1 | U7, docs 04/07/11 | Q28, Q46 |
| DB-N2 replace RPC JSON semantics | P2 | docs 07/10, U8 | Q50 |
| BR-N3 AI read-tools omitted | P2 | U8, docs 04/10 | Q36, Q44 |
| UX-N1 badge contrast | P2 | docs 03/09 | Q25 |
| UX-N2 multi-editor virtualization | P2 | docs 03/09/10 | Q22 |
| CO-N2 Q35/Q40 Unit mapping | P2 | doc 08 | Unit table |
| CO-N3 reciprocal traceability | P2 | doc 08 | AE/Risk tables |
| CO-N5 category string vs `categoryNodeId` | P2 | docs 02/07 | Q37, Q53 |
| SEC-N3 draft broadcast seam | P2 | U9, doc 11 | Q29, Q47 |
| SEC-N4 promotion idempotency home | P2 | U7, doc 07 | Q21, Q33 |
| STRAT-N2 spike owner/artifact | P2 | docs 00/03, evidence placeholder | Q55 |
| STRAT-N4 net-new stale recovery sizing | P2 | doc 00 | Q30 |
| OB-N1 observability sink | P2 | doc 12 | Q54 |
| DM-N2 `metadata.tags` vs `item.tags` | P2 | U1, docs 04/07 | Q34, Q53 |
| PERF-N2 non-virtual mount bound | P2 | docs 00/09 | Q55 |

## Requirement Coverage

| Requirement | Ship status | Units | Acceptance | QA | Risks |
| --- | --- | --- | --- | --- | --- |
| R1 inline Add row editor | Day-0, gated by spike | U1 U2 U4 | AE1 AE2 AE8 | Q1 Q2 Q3 Q4 Q5 Q6 Q22 Q23 Q24 Q39 Q49 Q55 | RSK2 RSK6 RSK7 RSK10 |
| R2 persist via `estimate_row_items` | Day-0 | U1 U2 U3 U8 | AE1 AE2 AE12 | Q1 Q14 Q19 Q32 Q34 Q44 Q50 Q51 | RSK3 RSK9 RSK14 |
| R3 optimistic ordered edits | Day-0 | U2 U3 U4 U9 | AE2 AE2a AE10 | Q2 Q5 Q7 Q17 Q19 Q30 Q47 | RSK2 RSK11 |
| R4 duplicate project-specific action | Verification/normalization, not day-0 unless evidence proves bug | U5 | AE3 AE4 | Q8 Q9 Q43 | RSK4 |
| R5 detached/project-specific rows | Day-0 classification; U6 projection fast-follow | U1 U6 U8 | AE4 AE5 | Q9 Q11 Q35 Q53 | RSK5 |
| R6 promotion | Fast-follow U7 | U7 U9 | AE6 AE10 | Q13 Q21 Q28 Q33 Q46 Q48 Q54 | RSK8 RSK12 |
| R7 Project folder projection | Fast-follow U6 | U1 U6 | AE5 | Q10 Q11 Q12 Q20 Q34 Q41 Q42 Q53 | RSK5 |
| R8 existing interactions regressions | Day-0 for affected existing row paths; U8 downstream before release | U4 U8 U9 | AE7 AE8 | Q14 Q15 Q16 Q22 Q23 Q24 Q35 Q37 Q40 Q42 Q44 Q45 Q50 Q51 | RSK7 RSK10 RSK14 RSK15 |
| R9 no new express table | Day-0 architecture | U1 U2 U3 U6 U7 | AE12 | Q32 Q33 Q38 | RSK1 |
| R10 pending insert lifecycle | Day-0 | U2 U4 U9 | AE1 AE2a AE9 | Q17 Q18 Q24 Q29 Q45 Q47 | RSK2 RSK11 RSK15 |
| R11 idempotent relinking promotion | Fast-follow U7 | U7 | AE6 | Q13 Q21 Q33 Q46 | RSK8 RSK12 |
| R12 UX/a11y/virtualization/mobile | Day-0 | U4 U9 | AE7 AE8 | Q22 Q23 Q24 Q25 Q26 Q49 Q55 | RSK7 RSK10 |
| R13 collaboration/concurrency | Day-0 integrity; realtime row sync out of scope unless added | U2 U3 U9 | AE9 AE10 | Q29 Q30 Q45 Q47 Q52 | RSK11 RSK15 |
| R14 permissions | Day-0 author/edit; fast-follow promotion | U4 U7 U9 | AE10 | Q27 Q28 Q33 Q41 Q46 Q48 | RSK12 |
| R15 rollout/rollback | Day-0 | U9 | AE11 | Q31 Q38 Q48 Q54 Q56 | RSK13 |
| R16 legacy data | Day-0 | U1 U2 U8 U9 | AE12 | Q12 Q15 Q31 Q32 Q36 Q37 Q39 Q53 | RSK9 RSK13 |

## Unit Coverage

| Unit | Ship status | Owns | QA |
| --- | --- | --- | --- |
| U1 helpers/read path | Day-0 | Express/blank/detached classification, metadata read path, defaults, metadata-tags mapping | Q12 Q34 Q53 |
| U2 Add row insert | Day-0 | Express template, insert return, draft retry, history migration, sort-order collision handling, legacy source-less evidence gate | Q1 Q17 Q18 Q32 Q39 Q45 Q53 |
| U3 update contract | Day-0 | App-layer widened patch, JSON merge, revision handling | Q2 Q5 Q7 Q19 Q30 |
| U4 editor | Day-0, spike-gated | UI, keyboard, focus, a11y, visual tokens, image URL, `EditableRowValue` state location | Q2 Q3 Q4 Q5 Q6 Q7 Q22 Q23 Q24 Q25 Q26 Q49 Q55 |
| U5 icon bug | Verification/normalization | Reproduction or normalization hardening | Q8 Q9 Q43 |
| U6 projection | Fast-follow | Project context plumbing, virtual tree datum, auth query | Q10 Q11 Q12 Q20 Q34 Q41 Q53 |
| U7 promotion | Fast-follow | Atomic RPC, idempotency, permission, grants, price-option fields, caches, telemetry | Q13 Q21 Q28 Q33 Q46 Q48 Q54 |
| U8 downstream | Day-0 for affected replacement/copy/read surfaces; projection/promotion parts follow their owning units | History, AI read-context/read-tools, AI package-builder writes, export, charts, publication, project-source/template rekey, replace/move preservation | Q14 Q15 Q16 Q35 Q36 Q37 Q40 Q42 Q44 Q50 Q51 |
| U9 shipability | Day-0 subset plus fast-follow gates | Concurrency, permissions, feature flag, rollout, docs gate, observability, UltraQA | Q27 Q28 Q29 Q30 Q31 Q38 Q45 Q47 Q48 Q52 Q54 Q56 |

## Acceptance Example Coverage

| AE | Requirements | QA |
| --- | --- | --- |
| AE1 | R1 R2 R10 | Q1 Q17 Q24 Q39 |
| AE2 | R1 R3 | Q2 Q5 Q7 Q19 |
| AE2a | R3 R10 | Q17 Q18 Q45 Q47 |
| AE3 | R4 | Q8 Q43 |
| AE4 | R4 R5 | Q9 |
| AE5 | R5 R7 | Q10 Q11 Q12 Q20 Q41 |
| AE6 | R6 R11 R14 | Q13 Q21 Q28 Q33 Q46 |
| AE7 | R8 R12 | Q22 Q26 |
| AE8 | R1 R8 R12 | Q23 Q24 |
| AE9 | R10 R13 | Q29 Q47 Q52 |
| AE10 | R3 R13 R14 | Q27 Q28 Q30 Q41 Q46 |
| AE11 | R15 | Q31 |
| AE12 | R9 R16 | Q12 Q31 Q32 Q36 Q39 |

## Risk Coverage

| Risk | Requirements | Units | QA |
| --- | --- | --- | --- |
| RSK1 | R9 | U1 U2 U3 U6 U7 | Q32 Q33 Q38 |
| RSK2 | R1 R3 R10 | U2 U4 | Q17 Q18 Q47 |
| RSK3 | R2 | U3 U8 | Q19 Q34 Q50 |
| RSK4 | R4 | U5 | Q8 Q9 Q43 |
| RSK5 | R5 R7 R16 | U6 U8 | Q10 Q11 Q20 Q41 Q53 |
| RSK6 | R1 | U4 | Q6 Q42 |
| RSK7 | R1 R8 R12 | U4 | Q22 Q26 Q55 |
| RSK8 | R6 R11 | U7 | Q13 Q21 Q33 Q46 Q54 |
| RSK9 | R2 R16 | U2 U8 | Q15 Q32 Q36 |
| RSK10 | R1 R8 R12 | U4 | Q23 Q24 |
| RSK11 | R3 R10 R13 | U2 U3 U9 | Q29 Q30 Q47 Q52 |
| RSK12 | R6 R14 | U7 U9 | Q28 Q33 Q46 Q48 |
| RSK13 | R15 R16 | U9 | Q31 Q38 Q54 Q56 |
| RSK14 | R2 R8 | U8 | Q44 Q50 Q51 |
| RSK15 | R8 R10 R13 | U2 U9 | Q45 |

## Remaining Product Fork

No requirement cell is intentionally uncovered. The only explicit fork is whether project-local reusable components require a canonical catalog beyond row projection. That fork remains outside day-0 and is represented by RSK1. U6/U7 rows in this matrix are retained for contract readiness and fast-follow planning, not as first-ship commitments.
