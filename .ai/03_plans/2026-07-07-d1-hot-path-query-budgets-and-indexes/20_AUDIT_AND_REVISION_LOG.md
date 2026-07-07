# 20 — Audit And Revision Log (Improve-Plan-Prompt cycle)

This document records the second-stage audit (Improve-Plan-Prompt) of the pack created in the first stage (Creating-Plan-Prompt). It is the authoritative record of: document inventory, source hierarchy, baseline scorecard, findings, revisions made, before/after scores, research sources, and the final verification matrix.

**verification_mode:** `emulated` (no separate write-capable native reviewer was available in this session; the audit was performed as a separated fresh pass by the same agent after the authoring pass, plus one native `Explore` verification lane for codebase-claim checking).

## Phase 1 — Document inventory and source mapping

| Document | Purpose | Authority | Status | Main claims | Gaps found in audit |
|---|---|---|---|---|---|
| `README.md` | package entrypoint; status; phase order | high | current | IMPLEMENTATION-READY; P0–P5 | missing rows-read framing; status needs emulated-cap honesty |
| `00_AGENT_COORDINATION.md` | master goal; lane ledger | high | current | 3 native Explore lanes + emulated synthesis | none material |
| `01_EXECUTIVE_SUMMARY.md` | findings + readiness | high | current | F1–F5 findings | missing F6 (rows-read) |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | in/out scope | high | current | sibling-pack boundaries | none |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | repo evidence | **highest (repo fact)** | current | 11 HP; 12 repos; index inventory; proof-script inventory | **2 factual errors (canEditEstimateInD1 line/EXISTS-count; proof-router surface split) — FIXED**; G4 uncertainty — FIXED (confirmed) |
| `04_REQUIREMENTS_SPECIFICATION.md` | requirements | high | current | PERF-001…010 | **missing PERF-011 (rows-read) — ADDED** |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | UX applicability | high | current | N/A with reason | none |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | current/target arch | high | current | shared helper; CI=local/release=hosted | none |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | DB blueprints | high | current | DB-CHG-001/002/003 | G4 was conditional — FIXED (confirmed needed) |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | threat model | high | current | T-P2-01 authz; proof-route | **missing Attack Surface Inventory, access-path matrix, credential taxonomy — ADDED**; canEditEstimateInD1 line — FIXED |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | budgets + evaluator | high | current | p95/p99/subreq table | **missing rows-read budget + free-tier citations — ADDED** |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | impact | high | current | direct + transitive | none |
| `11_IMPLEMENTATION_PLAN.md` | execution guide | **highest (execution)** | current | P0–P5 tasks | canEditEstimateInD1 line — FIXED; G4 DISCOVERY removed — FIXED; rows-read gate added to P1/P5 |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | tests | high | current | matrix + adversarial | **test matrix not in proof-contract format — REWRITTEN** |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | rollout | high | current | per-phase gates | none |
| `14_RISK_REGISTER.md` | risks | high | current | RISK-01…15 | none |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | decisions | high | current | DEC-001…008, DEC-AUTH-01, DEC-SEC-01 | none |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | traceability | high | current | both-direction map | **not in mandated column format — REWRITTEN**; missing PERF-011 — ADDED |
| `17_FINAL_READINESS_REVIEW.md` | readiness verdict | high | current | emulated; 95 | **needs revised scores + rows-read — UPDATED below** |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | stack decisions | high | current | per-layer | none |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | research + QA evidence | high | current | cycle 1 + 2 logs | **needs cycle 3 (this audit) — UPDATED below** |

**Source hierarchy (which controls when conflicting):**
1. Repo source files (highest) — verified via Explore lane.
2. Official Cloudflare/React docs — for free-tier limits and framework behavior.
3. This plan pack's documents — consistent with 1 and 2 after audit fixes.
4. AGENTS.md / current-state Fast Path — context.
5. Model memory (lowest) — the source of the two factual errors found; corrected.

## Phase 2 — Baseline scorecard (before audit)

| Category | Pre-audit score | Reason below 100 |
|---|---|---|
| Strategy/Product Value | 96 | A1 assumption |
| Requirements Quality | 88 | **missing rows-read requirement (PERF-011)** |
| React/Next Technical | 95 | minimal frontend surface |
| Architecture/Code Quality | 96 | clean |
| Data/API/Integration Safety | 90 | **G4 unconfirmed; missing access-path matrix** |
| Security/Privacy | 84 | **missing Attack Surface Inventory + credential taxonomy (directive cap: auth/data work <80 → capped, but proof route is gated; revised up after adding ASI)** |
| UX/Accessibility | 95 | N/A honest |
| Performance/Scalability | **78** | **missing rows-read budget — the load-bearing free-tier metric; cap applies (missing perf budget)** |
| Reliability/Observability | 95 | proportional |
| Testing/QA | 90 | **matrix not in proof-contract format** |
| Rollout/Governance | 96 | clean |
| **Overall** | **~88** | **rows-read gap is the dominant defect** |

## Phase 3 — Findings and revisions (audit cycle 3)

### Finding A1 (P0) — Rows-read budget entirely missing
- **What:** The pack budgeted p95/p99/queries/subrequests but NOT rows-read. On D1 Free, rows-read (5M/day, counting scanned rows incl. JOIN fan-out) is the metric that determines whether the app stays free-tier. Without it, the pack cannot honestly claim "no paid features" at 10× volume.
- **Source:** Cloudflare D1 Pricing docs (official, 2026-07-07).
- **Fix:** Added PERF-011 (`04`); added rowsRead columns + free-tier ceiling table + projection to `09`; added rows-read to evaluator contract + regression risks; added rows-read gate to P1/P5 (`11`); updated README goal; rewrote `16` with PERF-011; added PROOF-013/014 rows-read assertions (`12`).
- **Status:** Resolved.

### Finding A2 (P0) — Factual errors from model memory
- **What:** `canEditEstimateInD1` cited at `d1-access.ts:234` as "6-way EXISTS" — actually `:271` with 3 EXISTS + 2 creator-shortcuts. Proof-router cited as "5 surfaces" without the 4-read/1-write split and line range 148-223 — actually QUERY_SPECS 146-216 + MUTATION_SPECS to 229.
- **Source:** Explore verification lane (agent_a978cb90).
- **Fix:** Corrected in `03` (audit + HP-5 row + proof-router claim), `08` (threat model current-behavior), `11` (T-P2-01 target + instructions).
- **Status:** Resolved.

### Finding A3 (P1) — G4 index uncertainty resolved
- **What:** G4 was "conditional on column confirmation." Verification confirmed `idx_estimate_sheet_adjustments_updated` leads on `updated_at DESC` (`0029:24-25`), so the `estimate_id`-leading index is definitely needed.
- **Fix:** Updated `03` G4 row, `07` DB-CHG-002, `11` T-P1-02 (removed DISCOVERY sub-step).
- **Status:** Resolved (no longer DISCOVERY).

### Finding A4 (P1) — Missing Attack Surface Inventory, access-path matrix, credential taxonomy
- **What:** Directive Phase 3 §6/§7 + credential rule require these for auth/data/proof-secret work. Pack had a threat model but not the mandated tables.
- **Fix:** Added ASI-1 (proof route), access-path matrix (6 sources), credential material taxonomy (3 materials) to `08`.
- **Status:** Resolved.

### Finding A5 (P1) — Test matrix not in proof-contract format
- **What:** Directive Phase 3 §11 mandates `Proof ID | Req IDs | Implementation unit | Layer | Fixture | Assertion | File target | Command | Red/green | Cleanup`. Pack had a looser matrix.
- **Fix:** Rewrote `12` Test Execution Matrix as PROOF-001…014 in the mandated format + layer classification.
- **Status:** Resolved.

### Finding A6 (P1) — Traceability matrix not in mandated column format
- **What:** Directive Phase 3 §2 mandates `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | AC | Test/proof | Risk | Status | Gap/decision`.
- **Fix:** Rewrote `16` in the mandated format with source-strength tags + PERF-011 row.
- **Status:** Resolved.

### Finding A7 (P2) — Readiness score honesty
- **What:** `17` claimed IMPLEMENTATION-READY at 95 but the emulated-verification cap for high-blast-radius packs technically caps at CONDITIONALLY READY without owner accept. Pre-audit this was mentioned but the headline status was IMPLEMENTATION-READY.
- **Fix:** `17` updated (below) to state the cap honestly: status is **CONDITIONALLY READY** pending owner accept (the content is implementation-ready; the cap is procedural). This is more honest, not less ready.
- **Status:** Resolved.

## Phase 4 — After-audit scorecard

| Category | Post-audit score | Delta | Reason below 100 |
|---|---|---|---|
| Strategy/Product Value | 97 | +1 | A1 still an assumption (validated via P4) |
| Requirements Quality | 96 | +8 | PERF-011 added; all source-strength-tagged |
| React/Next Technical | 95 | 0 | minimal frontend surface |
| Architecture/Code Quality | 97 | +1 | access-path matrix confirms no P0 blocker |
| Data/API/Integration Safety | 95 | +5 | G4 confirmed; access-path matrix complete |
| Security/Privacy | 92 | +8 | ASI + credential taxonomy added; RISK-01 open until P2 merge |
| UX/Accessibility | 95 | 0 | N/A honest |
| Performance/Scalability | **93** | **+15** | rows-read budget added; hosted rows-read capture is P4 execution (not planning) |
| Reliability/Observability | 95 | 0 | proportional |
| Testing/QA | 95 | +5 | proof-contract format; PROOF-001…014 |
| Rollout/Governance | 96 | 0 | clean |
| **Overall** | **~94** | **+6** | **emulated cap → max 97; honest status CONDITIONALLY READY** |

**Score ceiling rationale:** `verification_mode: emulated` caps overall at 97. The pack scores 94 because two pieces of evidence are execution-time, not planning-time: (a) hosted rows-read capture (T-P4-02 may need fallback), (b) hosted EXPLAIN confirmation of P1 indexes (T-P4-03). Both are named tasks with scope and stop conditions — not planning defects.

## Research sources (official docs, cited per directive "SOURCE OF TRUTH")

These were consulted during the audit to ground Cloudflare free-tier claims (the directive forbids relying on model memory for provider billing/limit facts):

- **Cloudflare D1 Pricing** — https://developers.cloudflare.com/d1/platform/pricing/ — verified 5M rows read/day free, 100k rows written/day free, 5GB storage included. (Accessed 2026-07-07.)
- **Cloudflare D1 Limits** — https://developers.cloudflare.com/d1/platform/limits/ — 500MB max DB size, 10 DBs/account.
- **Cloudflare Workers Limits** — https://developers.cloudflare.com/workers/platform/limits/ — 50 subrequests/invocation free; 10ms CPU/invocation free; 100k requests/day free.
- **Workers Subrequests changelog (2026-02-11)** — https://developers.cloudflare.com/changelog/post/2026-02-11-subrequests-limit/ — paid plans now default 10,000 subrequests (was 1,000 hard cap), raisable to 10M. Free unchanged at 50.
- **D1 FAQs** — https://developers.cloudflare.com/d1/reference/faq/ — daily limits reset 00:00 UTC; queries error when exhausted.

No React/Next.js official-doc research was needed (this plan is data-layer; no framework-sensitive claim depends on a version detail). Local `node_modules/next/dist/docs/` not consulted because no App Router / cache / Server Component / rendering claim is made by this plan.

## Cycle log (Improve-Plan-Prompt)

- **Cycle 3 (this audit):** 1 native Explore verification lane (codebase claims) + 1 web search (Cloudflare limits) + emulated adversarial + emulated final-verification passes. 7 findings (A1–A7), all resolved. Re-scored. Directive cap is 6 cycles; this is cycle 3 overall (cycles 1–2 were in the Creating stage per `19`).
- **Remaining internally-resolvable issues:** none. Remaining items are execution-time evidence (P4 hosted proof) or owner sign-off (status cap), neither of which further planning cycles can resolve.

## Final verification matrix (directive "FINAL VERIFICATION REQUIREMENTS")

Requirement-by-requirement audit against the Improve-Plan-Prompt completion gates:

| Gate (directive §COMPLETION GATES) | Evidence | Verdict |
|---|---|---|
| Every relevant source reviewed | `03`, `20` research sources | proven |
| Inventory + source authority documented | this doc Phase 1 | proven |
| All requirements traceable to source | `16` (Source ID + strength columns) | proven |
| Scope + non-goals explicit | `02` | proven |
| Cross-doc contradictions resolved | A2/A3 fixes; cycle 3 found none new | proven |
| Goals/success/guardrail metrics defined | `09` budget table; `13` rollback triggers | proven |
| User journeys + UX states | `05` (N/A with reason — data-layer plan) | proven (N/A) |
| Accessibility requirements | `05` (N/A — no UI) | proven (N/A) |
| React/Next Server/Client boundaries | `18` (all server-side; no boundary move) | proven |
| Data fetching/caching/revalidation | `06`, `18` (only new cache is G5 TTL) | proven |
| Route-specific App Router boundary/cache contracts | N/A — no App Router route touched (only repositories/scripts/Worker route) | N/A with reason |
| Technical architecture + boundaries | `06` | proven |
| Data/API/network/security/performance covered | `07`, `08`, `09` | proven |
| Cloudflare D1/R2/DO/Queue/Email + Better Auth + legacy | `07` (D1 in scope; others explicitly out per `02`) | proven |
| Dependencies + blast radius | `10` | proven |
| Risks have severity/mitigation/owner/trigger | `14` | proven |
| Implementation units scoped/sequenced/testable | `11` P0–P5 | proven |
| Acceptance criteria objective/measurable | `04` AC-PERF-*-n | proven |
| Testing strategy maps to requirements + units | `12` PROOF-001…014 | proven |
| Performance budgets + measurement | `09` (4-metric budget incl. rows-read) | proven |
| Observability/ops/rollout/rollback | `13` | proven |
| Adversarial review no unresolved P0/P1 | `12` ADV matrix; cycle 3 found none unresolved | proven |
| Final verification confirms scores | this doc Phase 4 | proven (emulated) |
| No unresolved critical ambiguity | none identified | proven |
| No unsupported score of 100 | no score is 100 | proven |

### Evidence-class table (directive FINAL DELIVERABLE)

| Evidence class | What this pack has | What it cannot prove |
|---|---|---|
| Local static | `03` file:line citations (verified); `07` migration blueprints | runtime behavior |
| Local automated | PROOF-001…012 (vitest + local sqlite3 proofs) | hosted D1 planner behavior; real rows-read accounting |
| Browser/manual | none (intentionally skipped — no browser claim) | n/a |
| Provider-backed | none yet (P4 will produce) | hosted rows-read, hosted EXPLAIN — these are execution-time |
| Hosted/production | none yet (P4 release gate) | production p95 |
| Inferred | rows-read/day projection (from A1 volume + `09` per-req budgets) | actual daily rows-read until P4 hosted capture |

## Final readiness status

**CONDITIONALLY READY.**

Rationale per directive: the *content* is implementation-ready (every task has exact paths/symbols, every requirement is traceable, every gap is closed or named as an execution task). However:
- `verification_mode: emulated` caps high-blast-radius packs at CONDITIONALLY READY without owner/independent accept.
- Two evidence items (hosted rows-read, hosted EXPLAIN) are execution-time (P4), not planning-time.

To convert to unqualified **IMPLEMENTATION-READY**: (1) owner (Philip) accepts the package, AND (2) P4 produces the hosted rows-read + EXPLAIN evidence. Neither is a planning defect. The pack is safe to begin implementation on the named slices P0, P1, P2, P3 immediately (these do not depend on the deferred hosted evidence); P4/P5 are the conditionally-gated slices.

**Approved-for-implementation slices (CONDITIONALLY READY):** P0 (foundation), P1 (additive indexes), P2 (repository fixes — with mandatory TEST-SEC-01 denial parity), P3 (local proofs). P4 (hosted proof expansion) and P5 (CI/release gate wiring that depends on P4 output) proceed after P4's hosted evidence confirms the rows-read projection.
