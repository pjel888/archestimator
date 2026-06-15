---
title: Express Components Traceability Matrix
type: docs
date: 2026-06-15
---

# Express Components Traceability Matrix

Every requirement maps to at least one unit, acceptance example, QA row, and risk. Every QA row maps back to a requirement.

## Requirement Coverage

| Requirement | Units | Acceptance | QA | Risks |
| --- | --- | --- | --- | --- |
| R1 inline Add row editor | U1 U2 U4 | AE1 AE2 AE8 | Q1 Q2 Q3 Q4 Q5 Q6 Q23 Q24 Q39 | RSK2 RSK6 RSK7 RSK10 |
| R2 persist via `estimate_row_items` | U1 U2 U3 U8 | AE1 AE2 AE12 | Q1 Q14 Q19 Q32 Q34 Q44 | RSK3 RSK9 RSK14 |
| R3 optimistic ordered edits | U2 U3 U4 U9 | AE2 AE2a AE10 | Q2 Q5 Q7 Q17 Q19 Q30 Q47 | RSK2 RSK11 |
| R4 duplicate project-specific action | U5 | AE3 AE4 | Q8 Q9 Q43 | RSK4 |
| R5 detached/project-specific rows | U1 U6 U8 | AE4 AE5 | Q9 Q11 Q35 | RSK5 |
| R6 promotion | U7 U9 | AE6 AE10 | Q13 Q21 Q28 Q33 | RSK8 RSK12 |
| R7 Project folder projection | U1 U6 | AE5 | Q10 Q11 Q12 Q20 Q34 Q41 Q42 | RSK5 |
| R8 existing interactions regressions | U4 U8 U9 | AE7 AE8 | Q14 Q15 Q16 Q22 Q23 Q24 Q35 Q37 Q40 Q42 Q44 Q45 | RSK7 RSK10 RSK14 RSK15 |
| R9 no new express table | U1 U2 U3 U6 U7 | AE12 | Q32 Q33 Q38 | RSK1 |
| R10 pending insert lifecycle | U2 U4 U9 | AE1 AE2a AE9 | Q17 Q18 Q24 Q29 Q45 Q47 | RSK2 RSK11 RSK15 |
| R11 idempotent relinking promotion | U7 | AE6 | Q13 Q21 Q33 | RSK8 RSK12 |
| R12 UX/a11y/virtualization/mobile | U4 U9 | AE7 AE8 | Q22 Q23 Q24 Q25 Q26 | RSK7 RSK10 |
| R13 realtime concurrency | U2 U3 U9 | AE9 AE10 | Q29 Q30 Q45 Q47 | RSK11 RSK15 |
| R14 permissions | U4 U7 U9 | AE10 | Q27 Q28 Q33 Q41 Q46 Q48 | RSK12 |
| R15 rollout/rollback | U9 | AE11 | Q31 Q38 Q48 | RSK13 |
| R16 legacy data | U1 U2 U8 U9 | AE12 | Q12 Q15 Q31 Q32 Q36 Q37 Q39 | RSK9 RSK13 |

## Unit Coverage

| Unit | Owns | QA |
| --- | --- | --- |
| U1 helpers/read path | Express/blank/detached classification, metadata read path, defaults | Q12 Q34 |
| U2 Add row insert | Express template, insert return, draft retry, history migration, sort-order collision handling | Q1 Q17 Q18 Q32 Q39 Q45 |
| U3 update contract | App-layer widened patch, JSON merge, revision handling | Q2 Q5 Q7 Q19 Q30 |
| U4 editor | UI, keyboard, focus, a11y, visual tokens, image URL | Q2 Q3 Q4 Q5 Q6 Q7 Q22 Q23 Q24 Q25 Q26 |
| U5 icon bug | Reproduction or normalization hardening | Q8 Q9 Q43 |
| U6 projection | Project context plumbing, virtual tree datum, auth query | Q10 Q11 Q12 Q20 Q34 Q41 |
| U7 promotion | Atomic RPC, idempotency, permission, grants, price-option fields, caches | Q13 Q21 Q28 Q33 Q46 Q48 |
| U8 downstream | History, AI, AI package-builder writes, export, charts, publication, project-source reuse | Q14 Q15 Q16 Q36 Q37 Q42 Q44 |
| U9 shipability | Concurrency, permissions, feature flag, rollout, docs gate | Q27 Q28 Q29 Q30 Q31 Q38 Q45 Q47 Q48 |

## Acceptance Example Coverage

| AE | Requirements | QA |
| --- | --- | --- |
| AE1 | R1 R2 R10 | Q1 Q17 Q24 Q39 |
| AE2 | R1 R3 | Q2 Q5 Q7 Q19 |
| AE2a | R3 R10 | Q17 Q18 Q45 Q47 |
| AE3 | R4 | Q8 Q43 |
| AE4 | R4 R5 | Q9 |
| AE5 | R5 R7 | Q10 Q11 Q12 Q20 Q41 |
| AE6 | R6 R11 | Q13 Q21 Q28 Q33 |
| AE7 | R8 R12 | Q22 Q26 |
| AE8 | R1 R8 R12 | Q23 Q24 |
| AE9 | R10 R13 | Q29 Q47 |
| AE10 | R3 R13 R14 | Q27 Q28 Q30 Q41 |
| AE11 | R15 | Q31 |
| AE12 | R9 R16 | Q12 Q31 Q32 Q36 Q39 |

## Risk Coverage

| Risk | Requirements | Units | QA |
| --- | --- | --- | --- |
| RSK1 | R9 | U1 U2 U3 U6 U7 | Q32 Q33 Q38 |
| RSK2 | R1 R3 R10 | U2 U4 | Q17 Q18 Q47 |
| RSK3 | R2 | U3 | Q19 Q34 |
| RSK4 | R4 | U5 | Q8 Q9 Q43 |
| RSK5 | R5 R7 | U6 | Q10 Q11 Q20 Q41 |
| RSK6 | R1 | U4 | Q6 Q42 |
| RSK7 | R1 R8 R12 | U4 | Q22 Q26 |
| RSK8 | R6 R11 | U7 | Q13 Q21 Q33 Q46 |
| RSK9 | R2 R16 | U2 U8 | Q15 Q32 Q36 |
| RSK10 | R1 R8 R12 | U4 | Q23 Q24 |
| RSK11 | R3 R10 R13 | U2 U3 U9 | Q29 Q30 Q47 |
| RSK12 | R6 R14 | U7 U9 | Q28 Q33 Q46 Q48 |
| RSK13 | R15 R16 | U9 | Q31 Q38 |
| RSK14 | R2 R8 | U8 | Q44 |
| RSK15 | R8 R10 R13 | U2 U9 | Q45 |

## Remaining Product Fork

No requirement cell is intentionally uncovered. The only explicit fork is whether project-local reusable components require a canonical catalog beyond row projection. That fork remains outside day-0 and is represented by RSK1.
