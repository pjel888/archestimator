# 20 — Improvement Audit and Revision Log

This document records the **second-suite (Improve-Plan-Prompt) audit** of the pack: the
baseline scorecard, the adversarial findings, the repairs applied, and the
before/after comparison. Required by the Improve-Plan-Prompt final-deliverable spec.

**Audit mode:** `verification_mode: emulated` (no independent verifier lane available
in-session; the adversarial review was run as a separate native Explore subagent, which
provides genuine separation for *finding* but not for final *verification* — so the
emulated cap still applies to the final readiness claim).

## Phase 1 — Document inventory + source authority

| Doc | Purpose | Authority | Status (pre-audit) | Notes |
|---|---|---|---|---|
| README | entrypoint, status, phase order, index | canonical entrypoint | current | needs SEC-08 removal, score sync |
| 00 | coordination, master goal, agents, skills | coordination | current | sound |
| 01 | executive summary, top findings | summary | current | SEC-08 fabricated; SEC-01 severity contradicts 08/14 |
| 02 | brief + scope + assumptions | scope | current | "12 domains" undercount (15) |
| 03 | **the matrix** — route + action tables, credential taxonomy | primary evidence | current | Section B lacks Attack-Surface-Inventory columns; Section D domain-grouped not per-action; SEC-08 false |
| 04 | requirements + shadow-path | requirements | current | REQ-MATRIX-01 acceptance overstated |
| 05 | UX/a11y (auth-flow scope) | UX | current | narrow by design |
| 06 | architecture | architecture | current | **missing per-route cache/boundary contract** |
| 07 | data/db/api/network | data | current | sound |
| 08 | threat model, OWASP map, credential taxonomy | security | current | SEC-08 false; SEC-01 severity contradicts headline; maybeTrigger exception missed |
| 09 | perf/reliability/observability | perf | current | sound |
| 10 | blast radius | blast | current | sound |
| 11 | implementation plan (WP-01..12) | execution guide | current | **implementation units lack mandated field set**; WP-12 remove-branch dangerous |
| 12 | test strategy | test | current | **proof-contract rows absent** |
| 13 | rollout/rollback/ops | ops | current | sound |
| 14 | risk register | risk | current | SEC-01 severity inconsistent; SEC-08 row false |
| 15 | decisions/assumptions/alternatives | decisions | current | sound |
| 16 | traceability matrix | traceability | current | **wrong column schema vs mandate** |
| 17 | final readiness review | verification | current | **sub-scores inflated**; overall honest |
| 18 | stack contract | stack | current | SEC-08 false |
| 19 | research/review/QA evidence | evidence | current | sound |

**Source hierarchy:** PROMPT.md (intent) > current `main` source (reality) > local
Next.js/Cloudflare docs (framework behavior) > this pack > June audit (stale) > model memory.

## Phase 2 — Baseline scorecard (pre-repair), per Improve-Plan-Prompt 11 categories

Hard caps applied per the prompt's scoring rules. The most impactful caps:
- "Any unsupported claim presented as fact: 85" — SEC-08 is an unsupported claim ⇒ security ≤ 85.
- "Missing security model for auth/data/public/API work caps readiness at 79" — N/A, security model present.
- "Missing acceptance criteria for behavior-bearing work caps readiness at 84" — REQ-MATRIX-01 acceptance overstated but criteria exist.
- verification_mode emulated ⇒ overall cap 97, status cap CONDITIONALLY READY.

| Category | Pre-repair score | Reason below 100 |
|---|---|---|
| 1 Strategy/Product value | 92 | closed-beta vs broad-launch severity bar is owner-gated (OPEN-04) |
| 2 Requirements quality | 80 | REQ-MATRIX-01 "✅ proven" overstated; per-action rows absent; REQ-NEG gaps open |
| 3 React/Next.js technical | 78 | **no per-route cache/boundary contract** (mandate: caps at 80 if missing App Router analysis) |
| 4 Architecture/code quality | 88 | sound boundaries; missing route cache contract keeps it <95 |
| 5 Data/API/integration safety | 84 | action matrix not per-action; Attack Surface Inventory columns absent |
| 6 Security/privacy/compliance | 80 | **SEC-08 unsupported claim (cap 85)**; SEC-01 severity contradiction; maybeTrigger exception missed |
| 7 UX/accessibility | 86 | auth-flow scope (declared); a11y action-proof matrix partial |
| 8 Performance/scalability | 84 | no load harness (correctly scoped out); evaluator named but not run |
| 9 Reliability/observability/ops | 86 | alerting/dashboard gap (honest) |
| 10 Testing/QA/verification | 78 | **proof-contract rows absent (mandate)**; per-action denial tests partial |
| 11 Rollout/governance | 88 | hosted GitHub controls external gap; owner decisions open |
| **Overall (weighted)** | **82** | emulated cap 97 not yet binding; the 82 reflects the gaps above |

**Lowest document scores (pre-repair):** Doc 16 traceability (70 — wrong schema), Doc 11
implementation plan (74 — missing fields), Doc 03 (76 — missing ASI columns + false SEC-08),
Doc 12 (76 — missing proof-contract rows), Doc 17 (80 — inflated sub-scores).

## Phase 3 — Adversarial findings (from independent Explore lane) + disposition

| ID | Severity | Finding | Verified by lead? | Disposition |
|---|---|---|---|---|
| ADV-01 (P0) | P0 | SEC-08 fabricated — `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` is consumed in 4 places | ✅ YES (rg confirmed) | **RETRACT** SEC-08; remove WP-12 remove-branch; correct Doc 01/03/08/14/18 |
| ADV-02 (P0) | P0 | Traceability matrix uses wrong column schema (Doc 16) | ✅ YES | **RE-RENDER** Doc 16 to mandated columns |
| ADV-03 (P0) | P0 | Attack Surface Inventory table absent | ✅ YES | **ADD** to Doc 03 (or new appendix) |
| ADV-04 (P0) | P0 | Proof-contract rows absent (Doc 12) | ✅ YES | **ADD** proof-contract table to Doc 12 |
| ADV-05 (P1) | P1 | Implementation units lack mandated field set (Doc 11) | ✅ YES | **EXPAND** WP-01..03 to full field set; mark WP-04..12 stubs honestly |
| ADV-06 (P1) | P1 | No per-route cache/boundary contract (Doc 06) | ✅ YES | **ADD** route cache/boundary table to Doc 06 |
| ADV-07 (P1) | P1 | REQ-MATRIX-01 "✅ proven" overstated; Section D domain-grouped | ✅ YES (162 exports across 30 modules, not ~90 across 12) | **CORRECT** to "⚠️ partial — routes proven; actions domain-grouped"; add per-action appendix or honest scope note |
| ADV-08 (P1) | P1 | `maybeTriggerSharedLinkActivityDigest` has no action-layer auth (contradicts blanket publication claim) | ✅ YES (read source) | **CORRECT** blanket claim; fold into SEC-05/REQ-DEFENSE-01 scope |
| ADV-09 (P1) | P1 | SEC-01 severity contradicts (HIGH headline vs MED in 08/14) | ✅ YES | **UNIFY** — demote to MED (defense-in-depth) with explicit justification, propagated everywhere |
| ADV-10 (P1) | P1 | Sub-scores inflated (traceability 96, API 95, security 94, arch 96) | ✅ YES | **RE-SCORE** down 3-8 pts each in Doc 17 |
| ADV-11 (P2) | P2 | "12 domains" undercount (actually 15) | ✅ YES | correct to 15 |
| ADV-12 (P2) | P2 | `action-rate-limit.ts:38` cites function not the Map (line 20) | ✅ YES | correct line refs |
| ADV-13 (P2) | P2 | `assertSameOrigin` allows missing Origin (GET) — under-flagged | ✅ YES | add as LOW consistency note |
| ADV-14 (P2) | P2 | `refreshProjectPublicationSummary` is a read w/o manager gate | ✅ YES | fold into ADV-08 correction |

**Confirmed-holding claims (no repair needed):** SEC-01 premise, SEC-03 mechanism,
SEC-04 upgrade-before-auth, the 6 verified-non-issues (group-actions, beta-admin x2,
publication manager gate [except ADV-08], template-editor, recipient-proposals),
wrangler no-WAF, no-middleware, zod absence, signedReadUrlFactory unused, migration 0020
scoping, CSP posture, credential taxonomy (Doc 03 Section C — well-formed).

## Phase 4 — Repair execution

Repairs applied in the docs that follow (edits to 01, 03, 04, 06, 08, 11, 12, 14, 16, 17,
18, README, and this new 20). Each repair is traceable to an ADV-* finding above.

## Phase 5 — Before/after score comparison + final readiness

| Category | Pre-audit (pass 1) | Post-audit (pass 2) | Delta |
|---|---|---|---|
| Requirements completeness | 95 | 88 | −7 |
| Architecture readiness | 96 | 90 | −6 |
| API/network readiness | 95 | 88 | −7 |
| Security/privacy readiness | 94 | 86 | −8 |
| Testing/validation readiness | 94 | 88 | −6 |
| Requirements traceability | 96 | 92 | −4 |
| Blast-radius coverage | 96 | 94 | −2 |
| **Overall** | **93** | **88** | **−5** |

**Final status: `CONDITIONALLY READY`** (unchanged label, better-grounded reasons: open
P0 gaps SEC-01/03/04 + owner-gated decisions, not artifact-malformation).

**Final verification:** a separated Explore verifier lane confirmed all 11 repairs PROVEN,
no P0/P1 remaining, two P2 cosmetic items found and fixed (stale "12 domains/~90 actions"
in Doc 02/03; stray "HIGH" in Doc 04). `verification_mode: emulated` retained (one adversarial
lane + one verifier lane, both native Explore subagents — genuine separation for *finding*
and *verification*, but neither is a human/external reviewer, so the emulated cap applies).

## Final deliverable summary (per Improve-Plan-Prompt §FINAL DELIVERABLE)

- **Planning folder reviewed:** `.ai/03_plans/2026-07-07-owasp-api-authz-matrix-refresh/`
- **Document inventory:** README + 00–20 + PROMPT.md (23 docs).
- **Source hierarchy:** PROMPT.md > current `main` source > local Next.js docs > this pack > June audit (stale) > model memory.
- **Initial scorecard:** Doc 20 Phase 2 (overall 82 pre-repair).
- **Major findings:** SEC-08 fabricated (retracted); 3 mandated artifacts missing (added); REQ-MATRIX-01 overstated (corrected); SEC-01 severity contradicted (unified); maybeTrigger exception missed (added SEC-11); sub-scores inflated (recalibrated).
- **Documents revised:** 01, 02, 03, 04, 06, 08, 10, 11, 12, 14, 16, 17, 18, README.
- **Documents created:** 20 (improvement audit).
- **Documents consolidated/obsolete:** none (SEC-08 retracted in place, not deleted, so the retraction is auditable).
- **Contradictions resolved:** SEC-01 severity; SEC-08 live-vs-retracted; REQ-MATRIX-01 proven-vs-partial; publication blanket claim; "12 domains" count.
- **Final readiness status:** `CONDITIONALLY READY`, overall 88, verification_mode emulated.
