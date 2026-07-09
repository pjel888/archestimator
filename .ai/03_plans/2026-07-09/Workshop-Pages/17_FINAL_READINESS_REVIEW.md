# 17 — Final Readiness Review (revised, cycle 1)

**verification_mode:** `emulated` (two concurrent independent read-only lanes — industry-facets research + adversarial review — both verified against current source by the lead; no separate native final-verifier dispatched). Per the Improve-Plan-Prompt authority contract, a **behavior-bearing** package with emulated verification **cannot be `IMPLEMENTATION-READY`** — it is capped at `CONDITIONALLY READY` unless a real independent verifier or explicit owner acceptance reviews the final package.

This package is behavior-bearing (restructures an **auth/terms gate** — SEC-1 P0; changes navigation/shell rendering — FR-1/FR-2 P0).

## Corrected readiness status: `CONDITIONALLY READY`

**What can proceed:** Phases 1–3 are fully specified with exact paths/symbols, concrete contracts (P0-3/P0-4 resolved), corrected security posture (P0-2), traceability (16), and proof-contract rows. An implementer can execute them without invention.

**What blocks `IMPLEMENTATION-READY`:**
1. Emulated verification (cap rule) — needs a real independent verifier lane OR explicit owner acceptance.
2. DEC-01 (keep nested URLs) is owner-delegated — needs Philip's ack (product/URL decision).
3. Phase 0 baseline numbers not yet measured (intentional DISCOVERY step).

## Revised scorecard (honest re-score after fixes)

| Category | Baseline | Revised | Reason for delta |
|---|---|---|---|
| Strategy & Product Value | 92 | 94 | DEC-01 clearly flagged |
| Requirements Quality | 82 | 94 | proof rows added (16); SEC-1 corrected |
| React/Next.js Technical Readiness | 78 | 94 | child→layout contract resolved (P0-3); route cache contracts added; line cites fixed |
| Architecture & Code Quality | 80 | 93 | slot contract concrete; nested-layout reconciliation specified (P0-4) |
| Data/API/Integration | n/a | n/a | no scope |
| Security/Privacy | **68** | **92** | threat model added (08); gate mischaracterization fixed (P0-2); Phase 2 rewritten |
| UX/A11y | 80 | 92 | state matrix + a11y proof matrix added (05) |
| Performance/Scalability | 82 | 91 | INP/CLS/LCP + bfcache + bundle addressed (09, 20); existing harness identified |
| Reliability/Ops | 84 | 92 | bfcache interaction analyzed; failure modes corrected |
| Testing/QA | **74** | **93** | breaking tests inventoried + planned (P1-3); proof-contract rows (16); e2e harness reused |
| Rollout/Governance | 82 | 93 | go/no-go checklist + rollback + no-flag rationale (13) |
| Requirements Traceability | — | 95 | matrix created (16) |
| **Overall** | **~78** | **~93** | `CONDITIONALLY READY` (emulated cap + DEC-01 ack + Phase 0 pending) |

## Why not 95+/IMPLEMENTATION-READY (exact reasons)
1. **Emulated verification** → cap at 97 AND behavior-bearing → status cap `CONDITIONALLY READY` ( Improve-Prompt:77-85). Only a real independent verifier or owner acceptance lifts this.
2. **DEC-01 owner ack pending** (product/URL decision — not a planning defect).
3. **Phase 0 baseline unmeasured** (intentional DISCOVERY-REQUIRED; not a defect).
4. **No production RUM for CWV** (P2-1) — fix is structurally correct but real-world CWV win unmeasurable in prod; lab proof is the declared evaluator.
5. Scores are ceiling-capped by item 1 regardless of doc quality.

## Completion-gate audit (revised)
- [x] All relevant docs reviewed + inventoried (01).
- [x] Source hierarchy documented.
- [x] All requirements traceable to source (16).
- [x] Scope/non-goals explicit.
- [x] Contradictions resolved or recorded (P0-1 status fix; P0-2 gate; P0-3/P0-4 contract; line-cite drift).
- [x] Goals/success/guardrail metrics defined (09).
- [x] UX states + a11y defined (05).
- [x] React/Next Server/Client boundaries clear (18).
- [x] Route-level App Router boundary/cache contracts exist (06).
- [x] Architecture/module boundaries clear (06, 11).
- [x] Security/privacy covered — threat model added (08); SEC corrected.
- [x] Performance budgets + measurement plan (09).
- [x] Blast radius + breaking tests documented (10, 12).
- [x] Risks have severity/mitigation/owner (14).
- [x] Implementation units scoped/sequenced/testable with unit IDs (11).
- [x] Acceptance criteria objective (04, 16).
- [x] Test strategy maps to requirements + proof-contract rows (12, 16).
- [x] Rollout/rollback/observability defined (13).
- [x] Adversarial review: P0/P1 findings resolved this cycle (01 register).
- [x] No files outside this folder modified.

## Adversarial findings resolution summary
| Finding | Resolution |
|---|---|
| P0-1 (status) | Downgraded to `CONDITIONALLY READY` (this doc) |
| P0-2 (gate) | Threat model (08) + Phase 2 rewritten (11) + SEC-1 corrected (04) + RISK-2 corrected (14) |
| P0-3 (slot contract) | Core design decision resolved (11) — `WorkshopShell` + `WorkshopRouteHeader` split |
| P0-4 (project subtree) | WP-1.5 enumerates exact prop changes; mini-sidebar/padding/footer-overlay preserved |
| P1-1 (vague instr) | All "decide in-task"/"both safe" replaced with concrete decisions/open decisions |
| P1-2 (traceability) | 16 created with proof-contract rows |
| P1-3 (breaking tests) | Inventoried (12) + WP-1.7 update task |
| P1-4 (threat model) | 08 created |
| P2-1..P2-6 | 09/18/20 address CWV/bfcache/route-config/React-Compiler/View-Transitions/cite-drift |

## Smallest actions to reach `IMPLEMENTATION-READY` (98–100)
1. Dispatch a real independent verifier lane (fresh agent, read-only) to confirm the completion gates — OR Philip explicitly accepts the package.
2. Philip acks DEC-01.
3. Run Phase 0 baseline + record numbers.
4. (Optional follow-up) wire prod RUM for CWV to close P2-1.