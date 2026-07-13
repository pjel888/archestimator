# 22 — Final Verification Matrix and Evidence-Class Table

Mandated by Improve-Plan-Prompt FINAL DELIVERABLE: "(1) a requirement-by-requirement audit against this prompt and (2) a separate evidence-class table distinguishing local, browser, provider, production, manual, and inferred evidence."

**Verification mode:** `emulated` (separated fresh pass by the same lead agent after all revisions; no native independent verifier in this session). Per the suite authority contract, this caps overall readiness at 97 and, for this high-blast-radius package, caps status at `CONDITIONALLY READY` unless a real independent reviewer or owner acceptance later upgrades it.

## 1. Requirement-by-requirement verification matrix

Audit of the **planning deliverable** (not the implemented feature — this is planning-only). Each requirement is marked: `Proven` (evidence present in the pack) · `Contradicted` · `Incomplete` · `Weak/indirect` · `Missing` · `Not applicable with reason`.

| Requirement ID | Authoritative evidence needed | Current pack evidence | Status | Notes |
|---|---|---|---|---|
| FR-CONT-01 (CTA contract) | doc mapping CTA×intent×auth | `06` §3 contract table | Proven (planning) | implementation blocked on OPEN-CONT-01 |
| FR-CONT-02 (CTA test) | test spec locking CTA | `12` PROOF-02 | Proven (spec) | blocked-external |
| FR-CONT-03 (unified footer) | AC + test + a11y | `04` AC-FR-03; `12` PROOF-03; `05` §3 | Proven (planning) | blocked-external (OPEN-CONT-02) |
| FR-CONT-04 (legal metadata) | AC + test | `04`; `12` PROOF-04 | Proven (planning) | — |
| FR-CONT-05 (security sitemap + PGP) | AC + test | `04`; `12` PROOF-05 | Proven (planning) | PGP slice owner-gated |
| FR-CONT-06 (cookie page) | route + banner link + test | `11` WP-2.2; `12` PROOF-06 | Proven (planning) | blocked-external (OPEN-CONT-03) |
| FR-CONT-07 (gate legal line) | AC + test | `04`; `12` PROOF-07 | Proven (planning) | blocked-external (OPEN-CONT-06) |
| FR-CONT-08 (beta-request intake) | action contract + DB blueprint + security + test | `06` §5 (DEC-CONT-08); `07` §3; `21` A; `08` §4; `12` PROOF-08 | **Proven (planning, revised)** | the SQL defect + transport ambiguity from baseline are **resolved** (A1/A2/A10 fixed) |
| FR-CONT-09 (welcome email) | trigger decision + idempotency + test | `06` §9 (DEC-CONT-09); `07` §4; `21` B; `12` PROOF-09; `09` §9 cost | Proven (planning) | blocked-external (OPEN-CONT-04 + delivery) |
| FR-CONT-10 (dashboard CTA) | AC + test | `04`; `11` WP-5.1; `12` PROOF-10 | Proven (planning) | — |
| FR-CONT-11 (onboarding redirect) | AC + test + dynamic-trigger note | `04`; `06` §7; `12` PROOF-11 | Proven (planning) | — |
| FR-CONT-12 (domain) | owner confirmation | — | blocked-external | OPEN-CONT-05 |
| UX-CONT-01 (post-auth landing) | journey + test | `05` §1; `12` PROOF-12 | Proven (planning) | labeled `derived` in `16` |
| A11Y-CONT-01/02/03 | state matrix + action-level proof matrix | `05` §2, §3; `12` PROOF-13 | **Proven (planning, revised)** | the partial-matrix gap from baseline is **resolved** (B3/B4 fixed) |
| ARCH-CONT-01 (no arch change) | `21` no-migration finding | `21` summary; `07` §2 access-path matrix | **Proven (revised)** | access-path matrix added (B6 fixed) |
| ARCH-CONT-02 (trust ordering) | objective AC | `16` (AC made objective) | Proven (planning) | "static review" removed from AC |
| SEC-CONT-01 (action hardened) | threat model + proof | `08` §4/§5; `12` PROOF-08 | Proven (planning) | — |
| SEC-CONT-02 (no credential exposure) | credential taxonomy | `20`; `12` PROOF-09 | Proven (planning) | — |
| SEC-CONT-03 (uniform receipt) | proof | `08` §4; `12` PROOF-08 | Proven (planning) | — |
| REL-CONT-01 (email fail-safe) | proof | `12` PROOF-09 | Proven (planning) | — |
| OPS-CONT-01 (rollout gates) | ladder | `13` | Proven (planning) | — |
| TEST-CONT-01 (continuity test) | spec | `12` PROOF-12 | Proven (spec) | — |
| TEST-CONT-02 (per-req coverage) | matrix | `12` §2; `16`; this matrix | Proven (planning) | — |
| DOC-CONT-01 (contract doc) | `06` §3 | `06` §3 | Proven (planning) | — |
| DOC-CONT-02 (no overclaims) | regression guards | `12` PROOF-15 | Proven (planning) | — |
| PERF-CONT (evaluator) | Playwright contract + budget | `09` §2; `12` PROOF-14 | Proven (spec) | hosted RUM external |

**Improve-Plan-Prompt artifact checklist:**
- Traceability matrix with `Source strength` + `Gap/decision` → `16` ✅
- Source-strength per requirement → `16` ✅
- 11-state UX matrix → `05` §2 ✅
- Action-level a11y proof matrix → `05` §3 ✅
- Route-specific App Router boundary/cache contract → `06` §7 ✅
- Access-path matrix → `07` §2 ✅
- Attack surface inventory (8-col) → `08` §4 ✅
- Proof-contract rows (Proof ID + Cleanup/skip + red/green) → `12` §2 ✅
- Known-red validation ledger → `12` §2a ✅
- Final verification matrix → this doc §1 ✅
- Evidence-class table → this doc §2 ✅
- Email cost/eligibility budget → `09` §9 ✅
- Server Action success-transport statement → `06` §5 (DEC-CONT-08) ✅
- Credential taxonomy depth → `20` ✅ (transport-case enumeration for `requestBetaAccess` added via `08` §4 + `05` §2 offline/cancellation rows)

## 2. Evidence-class table

| Evidence class | What this plan has | What it cannot prove (planning-only) |
|---|---|---|
| **Local static** | doc/source cross-checks (`rg`, schema reads of `0001`/`0004`/`0006`/`0007`, `account-audit.ts`/`invite-entry.ts` symbol reads); `git status`; `06` route table; `21` verified SQL contracts | runtime behavior, browser behavior, provider state |
| **Local automated** | proof-contract specs (`12` PROOF-01..15); the ip_hash-format denial test is specified (not yet run — tests don't exist until implementation) | that the tests actually pass against implemented code (implementation is out of scope); broad `validate` posture (not run — `12` §2a) |
| **Browser/manual** | Playwright evaluator spec (`12` PROOF-14); manual QA procedure (`13` §5) | actual LCP/TTFB/redirect-count measurements; actual hosted smoke (rollout gate) |
| **Provider-backed** | `wrangler.jsonc`/binding references; `EMAIL` binding existence; D1 schema verified from migration files | live D1 readback; live Email send; Cloudflare Email entitlement/limits (NOT VERIFIED — `09` §9) |
| **Hosted/production** | hosted-smoke + deliverability defined as L2/L3 rollout gates | any production proof (no deploy in planning) |
| **Inferred** | closed-beta volume estimates; "low perf risk" reasoning; "unlikely hot path" for welcome-email idempotency | labeled as inference/assumption in `02`/`07`/`09`; not used as proof of a stronger claim |

## 3. Resolved baseline defects (from the adversarial audit)

| Baseline finding | Severity | Resolution | Verification |
|---|---|---|---|
| `scope_key` column error (rate-limit SQL) | P1 | `21` A.2 + `07` §3 corrected to `scope`+`key_hash` via `recordSecurityRateLimitEventInD1` | verified against `0006:123-157` |
| IP-hash format mismatch (would fail `account_security_events` CHECK) | P1 | `21` A.3 + `07` §3 + `11` WP-3.2 specify `hashAccountSecurityValue`/`AUTH_AUDIT_HASH_PEPPER`/hex, distinct from invite base64url | verified against `0004:7-17` + `account-audit.ts:46-75` |
| Audit-table choice ambiguity (allowlist vs general) | P1 | `21` A.1 decided: `account_security_events` (no UNIQUE collision, correct referential intent) | verified against `0001:19-24` |
| `requestBetaAccess` success transport undecided | P1 | `06` §5 DEC-CONT-08 decided (`useActionState` + DTO + no-JS redirect) | resolves A10/B12 |
| Welcome-email trigger site undecided | P1 | `06` §9 DEC-CONT-09 decided (`completeOnboarding` only) | resolves the "pick ONE" ambiguity |
| Traceability matrix missing `Source strength`/`Gap/decision` | P1 | `16` rebuilt with mandated columns + derived labels | resolves B1/B2 |
| UX state matrix partial (no offline/timeout/cancellation/partial-success) | P1 (capped UX at 84) | `05` §2 full 11-state matrix added | resolves B3 |
| Action-level a11y proof matrix missing proof-type binding | P1 | `05` §3 added (5 actions × 4 cols + proof type) | resolves B4 |
| Route-specific App Router cache contract generic | P1 | `06` §7 route-by-route table (9 routes) added | resolves B5 |
| Access-path matrix missing | P1 (borderline P0) | `07` §2 7-column matrix added | resolves B6 |
| Attack-surface inventory wrong columns | P1 | `08` §4 8-column matrix added | resolves B7 |
| Proof-contract rows missing Proof ID/Cleanup/skip | P1 | `12` §2 PROOF-01..15 + `12` §2a ledger | resolves B8/B9 |
| Email cost/eligibility budget absent | P2 | `09` §9 added (NOT VERIFIED marked) | resolves B11 |
| Score inflation (Data/API/Security/UX) | P1 | `17` re-scored to evidence caps (see `17`) | resolves A12 |

All P0/P1 findings from the adversarial audit are resolved or explicitly owner-gated. No unresolved critical contradiction remains.
