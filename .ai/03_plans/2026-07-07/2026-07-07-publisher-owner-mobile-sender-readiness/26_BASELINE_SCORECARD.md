# 26 — Baseline Per-Document Scorecard (Phase 2)

Initial scores **before** this Improve-Plan revision pass (captured so the final scorecard in `17` can show before/after delta honestly). Category rubric and scoring caps per `Improve-Plan-Prompt.md` PHASE 2.

Legend: S=Strategy, R=Requirements, RN=React/Next, A=Architecture, D=Data/API/Integration, SEC=Security/Privacy, UX=UX/A11y, P=Perf, REL=Reliability/Ops, T=Testing/QA, RO=Rollout/Governance. `n/a` = not applicable to that doc.

---

| Doc | S | R | RN | A | D | SEC | UX | P | REL | T | RO | Overall | Cap applied |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `00_AGENT_COORDINATION` | 96 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 96 | — |
| `01_EXECUTIVE_SUMMARY` | 95 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 95 | — |
| `02_FEATURE_BRIEF_AND_SCOPE` | 96 | 95 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 95 | — |
| `03_SOURCE_AND_CODEBASE_AUDIT` | n/a | 96 | 92 | 95 | 95 | 92 | n/a | n/a | n/a | n/a | n/a | 94 | missing route cache contract |
| `04_REQUIREMENTS_SPECIFICATION` | n/a | 94 | n/a | n/a | n/a | 90 | 90 | n/a | n/a | 88 | n/a | 90 | missing proof-contract rows; a11y proof matrix |
| `05_UX_UI_ACCESSIBILITY_PLAN` | n/a | n/a | n/a | n/a | n/a | n/a | 88 | n/a | n/a | n/a | n/a | 88 | **missing action-level a11y proof matrix → cap 84** |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN` | n/a | n/a | 90 | 94 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 90 | missing route cache contract; missed `revalidatePath` |
| `07_DATA_DATABASE_API_NETWORK_PLAN` | n/a | n/a | n/a | n/a | 96 | 92 | n/a | n/a | n/a | n/a | n/a | 94 | missing attack-surface inventory cross-link |
| `08_SECURITY_PRIVACY_THREAT_MODEL` | n/a | n/a | n/a | n/a | n/a | 92 | n/a | n/a | n/a | n/a | n/a | 92 | missing attack-surface inventory table |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY` | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 92 | 92 | n/a | n/a | 92 | hosted RUM deferred |
| `10_BLAST_RADIUS_AND_DEPENDENCIES` | n/a | n/a | n/a | 95 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 95 | — |
| `11_IMPLEMENTATION_PLAN` | n/a | 93 | 92 | 93 | n/a | n/a | n/a | n/a | n/a | 88 | 92 | 92 | missing proof-contract cross-link |
| `12_TEST_AND_VALIDATION_STRATEGY` | n/a | 90 | n/a | n/a | n/a | 88 | n/a | n/a | n/a | 88 | n/a | 89 | **missing proof-contract rows → cap; missing known-red posture** |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS` | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 92 | 93 | n/a | 93 | 93 | — |
| `14_RISK_REGISTER` | n/a | n/a | n/a | n/a | n/a | 93 | n/a | n/a | n/a | n/a | n/a | 93 | — |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES` | 95 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 95 | — |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX` | n/a | 90 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 90 | **missing required columns (Source ID/Source strength/Plan section/Gap)** |
| `17_FINAL_READINESS_REVIEW` | 93 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 93 | only overall score, no per-doc; verification cap |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS` | n/a | n/a | 90 | 93 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 91 | missed `revalidatePath` primitive + cache model |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE` | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 90 | n/a | 90 | — |

**Baseline package overall (pre-revision):** 91/100 (emulated cap 97; Performance gate 92 < 95).

---

## Critical blockers / major gaps found (driving the revision)

| Finding | Severity | Affected docs | Fix in this revision |
|---|---|---|---|
| **No action-level a11y proof matrix** (keyboard path / focus / accessible name / proof type per action) | P1 (caps UX at 84) | `05` | REVISE `05` |
| **Traceability matrix missing required columns** (Source ID, Source strength, Plan section, Gap/decision) | P1 | `16` | REVISE `16` |
| **No route-specific App Router boundary/cache contract** + missed `revalidatePath` primitive + unverified Cache Components status | P1 (caps RN at 89 for unverified framework claim) | `06`,`18` + new | CREATE `23`; REVISE `06`,`18` |
| **No Attack Surface Inventory** for Server Actions | P1 (caps SEC below 80) | `07`,`08` + new | CREATE `22` |
| **No proof-contract rows** (Proof ID/Req IDs/Layer/Fixture/Assertion/Command/Red-green/Cleanup) | P1 | `04`,`11`,`12` | REVISE `12`; cross-link |
| **No Phase-1 inventory/source map** | P2 | (none) | CREATE `25` (done) |
| **No per-document baseline scorecard** | P2 | `17` | CREATE `26` (this doc) |
| **No final verification matrix + evidence-class table** | P1 | `17`,`19` | CREATE `24` |
| Hosted/production RUM deferred (Performance 92<95) | P2 (external) | `09`,`13` | keep; document gap honestly |
| Emulated verification (no 2nd native verifier) | P1 (caps status) | `17` | keep; apply cap honestly |

## Unsupported / weak claims found
- `06`/`18` asserted "no `use cache`/`cacheTag` in this surface" without first verifying Cache Components status → **now verified** (OFF; `revalidatePath` is the primitive). Fixed in `23`.
- No other unsupported claims presented as fact found.

## Required decisions (owner/external)
- DEC-MOBILE final sign-off (owner) — external.
- Independent reviewer / owner acceptance (caps) — external.
- PERF-01 hosted RUM (impl) — deferred.

## Recommended revisions (the work this Improve-Plan pass does)
1. REVISE `05` → add action-level a11y proof matrix.
2. REVISE `16` → add required traceability columns.
3. CREATE `22` → Attack Surface Inventory.
4. CREATE `23` → Route-boundary + cache contract (Cache Components verified OFF).
5. REVISE `06`,`18` → correct the cache primitive to `revalidatePath`; cite `23`.
6. REVISE `12` → add proof-contract rows.
7. CREATE `24` → final verification matrix + evidence-class table.
8. REVISE `17` → before/after scores; cite `24`/`26`.
9. REVISE `README` → index `22`–`26`.

## Exact reason each baseline score is below 100
- Docs at 88–95: missing one of {a11y proof matrix, traceability columns, route cache contract, attack-surface inventory, proof-contract rows, per-doc scorecard, verification matrix, hosted RUM, independent verifier}. Each is named above and closed (or honestly deferred) in this revision.
- No doc scored 100 at baseline → no inflated 100 to retract.
