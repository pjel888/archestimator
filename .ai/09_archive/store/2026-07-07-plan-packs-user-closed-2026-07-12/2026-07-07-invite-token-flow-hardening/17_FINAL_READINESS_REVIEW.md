# Final Readiness Review

**verification_mode:** `emulated` — separated specialist passes by the lead agent; no native independent verifier lane was dispatched in this session. Per the Suite Authority Contract, `emulated` caps overall readiness at **97** and, for a high-blast-radius exhaustive package (auth/invite/shared-link), caps status at **`CONDITIONALLY READY`** until an independent reviewer or the owner signs off. **Note (post-Improve):** the binding constraint on overall readiness is *not* the emulated cap (97) — it is the Data category cap (89, D1 SQLite version NOT VERIFIED) and the Performance category (94, PC-17 not yet landed). Lifting the emulated cap alone would not raise overall above 94 until those two resolve at implementation.

## 1. Per-document scorecard (after Improve-pass cycle 3)

| Doc | Score | Category driver | Exact reason below 100 |
|---|---|---|---|
| 00_AGENT_COORDINATION | 96 | Process | emulated verification (no native independent verifier) |
| 01_EXECUTIVE_SUMMARY | 96 | Clarity | 4 owner decisions open (OPEN-SEC-01, OPEN-SEC-02, OPEN-REL-01, OPEN-REL-02); readiness narrative updated to honest 93 |
| 02_FEATURE_BRIEF_AND_SCOPE | 97 | Scope | — |
| 03_SOURCE_AND_CODEBASE_AUDIT | 97 | Evidence | file:line evidence throughout; direct-grant line range corrected; 0007 CHECK lines fixed |
| 04_REQUIREMENTS_SPECIFICATION | 96 | Requirements | SEC-12..15 added as full entries; SEC-05 rescoped; SEC-10 rescoped; OPEN-SEC-01/02 gated items isolated |
| 05_UX_UI_ACCESSIBILITY_PLAN | 92 | UX | revoke UI is a new subsection (larger than first estimated); alpha DESIGN.md deferred to owner |
| 06_ARCHITECTURE_AND_TECHNICAL_DESIGN | 95 | Architecture | **Route-specific boundary/cache contract added (§6.5)** — closes the Improve hard gate; DEC-01 env-toggle finalizes at impl |
| 07_DATA_DATABASE_API_NETWORK_PLAN | 92 | Data | D1 DROP COLUMN version NOT VERIFIED (RISK-04) — caps category at 89; resolves at impl |
| 08_SECURITY_PRIVACY_THREAT_MODEL | 96 | Security | SEC-16 (Server-Action direct-POST) + SEC-17 (sign-out internal-origin note) added; SEC-05/10 reframed |
| 09_PERFORMANCE_RELIABILITY_OBSERVABILITY | 94 | Perf | PERF-01 query-count assertion is a NEW test (PC-17, P6) — honest downgrade from "assertion exists"; hosted-proof production gap (preview only) |
| 10_BLAST_RADIUS_AND_DEPENDENCIES | 96 | Blast radius | direct-grant line range corrected; concurrent-agent risk noted |
| 11_IMPLEMENTATION_PLAN | 95 | Impl | P1-T2 + P3-T4 + P4-T1 converted from DISCOVERY to concrete (source-resolved); Phase 5 owner-gated; P3-T4 larger (Medium-Large) |
| 12_TEST_AND_VALIDATION_STRATEGY | 95 | Testing | **Proof-contract ledger (PC-01..18) in mandated 10-column format** — closes the Improve format gate; no invite e2e Playwright spec (PC-14 manual) |
| 13_ROLLOUT_ROLLBACK_AND_OPERATIONS | 94 | Rollout | 24h 403 monitoring is the real P1 gate (not provable in planning); Data rollback gated on D1 version |
| 14_RISK_REGISTER | 96 | Risk | RISK-02 + RISK-07 resolved-at-planning; RISK-04 NOT VERIFIED (caps Data); RISK-01 only fully resolved post-monitoring |
| 15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES | 96 | Decisions | 4 owner decisions open; DEC-05 corrected (2x not 3x); DEC-07 rescoped; ASSUMP-04/05/06 resolved |
| 16_REQUIREMENTS_TRACEABILITY_MATRIX | 96 | Traceability | SEC-05/10/15 rows corrected; SEC-08 → non-regression |
| 18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS | 96 | Stack | — |
| 19_RESEARCH_REVIEW_AND_QA_EVIDENCE | 95 | QA | adversarial matrix static-review + unit; no browser proof; AQ-04 sign-out note added |
| 20_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL | 97 | Security | — |
| 21_DATABASE_CHANGE_BLUEPRINTS | 92 | Data | DROP COLUMN version NOT VERIFIED; auth_trigger blueprint normalized to 0039 |

## 2. Category scores (after Improve-pass cycle 3 — honest re-score)

Re-scored after the Improve-pass source re-verification and the P1/P2 fixes. Scores apply the Improve directive's category caps literally: missing route contract → cap 84 (now repaired, so Architecture rises); missing proof-contract format → cap 89/84 (now repaired, so Testing rises); unverified provider claim controlling implementation → cap 89 (D1 SQLite version NOT VERIFIED, so Data caps at 89); stale framing corrected (SEC-05/SEC-10) → Security/Requirements rise.

| Category | Improve-pre | Improve-post | Notes / exact reason below 100 |
|---|---|---|---|
| Product strategy and value | 95 | 96 | Beta-flow preservation explicit; 4 owner decisions open |
| Scope clarity | 97 | 97 | In/out scope explicit; non-goals reasoned |
| Requirements completeness | 96 | 96 | SEC-12..15 now full entries; SEC-05/10 reframed; OPEN-SEC-01/02/REL-01/REL-02 isolated |
| UX/UI readiness | 93 | 92 | Revoke UI is a new subsection (not just a button — larger than first estimated); alpha DESIGN.md deferred to owner; manual keyboard proof at impl |
| Accessibility readiness | 92 | 92 | Revoke a11y planned (PC-15); manual keyboard proof at impl |
| Architecture readiness | 96 (cap-84 violation) | 95 | **Route-specific boundary/cache contract added (06 §6.5)** — closes the Improve directive's hard gate. Capped at 95 not 100 because the env-toggle (DEC-01) finalizes at impl and the cache-components posture is asserted from `next.config.ts`, not from a running proof. |
| Data/database readiness | 96 (cap-89 violation) | **89** | **D1 SQLite version for DROP COLUMN is NOT VERIFIED** (planning-only; `wrangler d1 execute` read-back did not return in-session). Per Improve directive §"Scoring rules" this unverified provider claim controlling rollback caps the category at 89. Fix-forward fallback (leave the nullable column) keeps implementation unblocked. Resolves to ≥95 at impl via `wrangler d1 execute ... "SELECT sqlite_version();"`. |
| API/network readiness | 96 | 96 | Route + action contracts explicit; idempotency documented; Server-Action direct-POST threat (SEC-16) added |
| Security/privacy readiness | 95 | 96 | Threat model complete (SEC-16/17 added); SEC-05 rescoped to continue-only; SEC-10 rescoped to direct-grant call sites; emulated cap; residual risks documented |
| Performance/scalability | 95 | 94 | No hot-path regression; PERF-01 query-count assertion is a NEW test (PC-17, P6) — until it lands, evidence is code-review gate (honest downgrade from "assertion exists") |
| Reliability/operations | 94 | 94 | Per-phase rollback; 24h monitoring is the real P1 gate |
| Blast-radius coverage | 96 | 96 | Direct + transitive mapped; concurrent-agent risk noted; direct-grant line range corrected |
| Testing/validation | 95 (cap-89 violation) | 95 | **Proof-contract ledger (PC-01..18) now uses the mandated 10-column format (12 §2)** — closes the Improve directive's format gate. Capped at 95 not 100 because no invite e2e Playwright spec (PC-14 is manual preview proof). |
| Rollout/rollback | 94 | 94 | Kill switch + monitoring; production-proof gap; Data rollback gated on D1 version (RISK-04) |
| Requirements traceability | 96 | 96 | Every requirement (SEC-01..17, FR-01..06, ARCH-01..03, DATA-01..02, UX-01..03, A11Y-01..02, PERF-01..02, REL-01..02, TEST-01..02, DOC-01..02) traced in `16` |
| **Overall implementation readiness** | **95 (over-asserted)** | **93** | Bounded by Data=89 (D1 version NOT VERIFIED) and Performance=94 (PC-17 not yet landed). Even with an independent verifier lifting the emulated cap, these two category caps keep overall at ≤94 until resolved at implementation. Emulated verification independently caps at 97, which is not the binding constraint here. |

**Honest narrative:** the Improve pass *lowered* the headline from 95→93 because the original 95 was over-asserted — it ignored the Data cap-89 (unverified D1 version) and the Performance code-review-gate reality. The improvements *raised* Architecture (route contract), Testing (proof-contract format), and Security (threat-model completeness + reframed SEC-05/10), and closed 3 of the 4 DISCOVERY sub-steps from source. The net is a more honest, lower-but-defensible 93. The `CONDITIONALLY READY` *label* is unchanged and defensible (the open decisions are genuinely owner-gated), but the 95 number was not.

## 3. PASS conditions (honest, post-improvement)

- Overall ≥ 95? **No (93).** Bounded by Data=89 (D1 version NOT VERIFIED — resolves at impl) and Performance=94 (PC-17 lands at impl).
- Architecture ≥ 95? **Yes (95).** Route contract added.
- Data/database ≥ 95 (data in scope)? **No (89).** D1 SQLite version NOT VERIFIED — Improve directive cap-89. Resolves at impl.
- Security/privacy ≥ 95 (auth/public/mutations in scope)? **Yes (96).**
- Performance ≥ 95 (route-level in scope)? **No (94).** PC-17 query-count assertion lands at impl; until then code-review gate.
- Testing ≥ 95? **Yes (95).** Proof-contract format added.
- Traceability ≥ 95? **Yes (96).**
- No task has unresolved architecture/path/contract/migration/authz/data-integrity/validation decisions? **Yes** — all such items are now either resolved-at-planning (P1-T2, P4-T1 DISCOVERY sub-steps closed from source), or `BLOCKED-EXTERNAL` (OPEN-*) with options + recommendation, or a single named NOT-VERIFIED provider read-back (D1 version) with a fix-forward fallback.
- Every score below 100 has a non-blocking deficiency with owner + implementation-safe path? **Yes** (see §7).

→ **Status: `CONDITIONALLY READY`.** Two category PASS thresholds are not met at 95 (Data=89, Performance=94), but both resolve at implementation via named, low-risk actions (one read-only D1 query; one new unit test). Per the Improve directive, the package is `CONDITIONALLY READY` (not `IMPLEMENTATION-READY`) because (a) verification is `emulated`, (b) 4 owner decisions remain open, and (c) two category caps are bounded by impl-time evidence. The named implementation-ready slices are Phases 1, 2, and 4 (Phase 3's migration is gated on the D1-version read-back; Phase 5 is owner-gated on OPEN-REL-02/OPEN-SEC-01).

## 4. Final verification matrix (requirement-by-requirement against the directive)

| Directive requirement | Evidence | Status |
|---|---|---|
| Dated plan folder created | `.ai/03_plans/2026-07-07-invite-token-flow-hardening/` | Proven |
| Repo instructions + skills inspected | 00 §"Skills and repository instructions used" | Proven |
| Required specialist workstreams completed | 00 lanes L1-L7 | Proven |
| Relevant codebase systematically analyzed | 03 §1-8 (file:line evidence) | Proven |
| Relevant documents traced | 03 §8; 02 §2 | Proven |
| README states status | README header `CONDITIONALLY READY` | Proven |
| 18_STACK_CONTRACT complete | 18 | Proven |
| 19_RESEARCH_REVIEW_AND_QA_EVIDENCE records evidence | 19 | Proven |
| Current + target behavior defined | 06 §1-2 | Proven |
| All requirements have stable IDs | 04 (SEC/FR/ARCH/DATA/UX/A11Y/PERF/REL/TEST/DOC) | Proven |
| Every requirement traceable | 16 | Proven |
| UX/A11Y states defined | 05 | Proven |
| Architecture + integration boundaries defined | 06 | Proven |
| Data/API/network behavior defined | 07 | Proven |
| Security/privacy risks addressed | 08 | Proven |
| Performance/reliability defined | 09 | Proven |
| Blast radius documented | 10 | Proven |
| Implementation phases dependency-aware | 11 | Proven |
| Tasks identify exact paths/symbols (or BLOCKED tags) | 11 (DISCOVERY-REQUIRED + OPEN-* tags) | Proven |
| Acceptance criteria objective/testable | 04 AC-<CAT>-## | Proven |
| Shadow-path matrices complete | 04 §"Shadow-path matrices" (S1, S2) | Proven |
| Database change blueprints complete | 21 | Proven |
| Test execution matrix maps every requirement | 12 §2 | Proven |
| Performance evaluator contract complete | 09 §1.2 | Proven |
| Rollout/monitoring/rollback/recovery defined | 13 | Proven |
| Rollout performance gates defined | 13 §4 | Proven |
| Risks + decisions documented | 14, 15 | Proven |
| Critique-and-revision cycles occurred (exhaustive ≥ 2) | 01 §"Critique-and-revision cycles" (2 cycles) | Proven |
| Final verification occurred (mode recorded) | this doc §header | Proven (emulated) |
| No internally-resolvable critical gap remains | §7 | Proven |
| No files outside plan folder intentionally modified | git status (only plan folder written) | Proven |

## 5. Evidence-class table

| Evidence class | Used in this plan | Cannot prove |
|---|---|---|
| Local static | 03 file:line audit; 16 traceability; rg token scan (P6) | runtime/browser/provider behavior |
| Local automated | existing invite test suite (referenced throughout 12) | provider/production state |
| Browser/manual | FR-03 manual e2e (preview); AQ-05; A11Y-01 keyboard (preview) | provider/production unless on those envs |
| Provider-backed | migration readback (P3); hosted proof harness (preview D1) | production until applied there |
| Hosted/production | 24h 403 monitoring (P1) — at impl | local code path details |
| Inferred | pepper-compromise impact (AQ-13, documented not executed) | completion claims requiring direct proof |
| Official docs | ASSUMP-01 (Fetch Origin); ASSUMP-03 (SQLite ADD COLUMN) | repo-specific runtime |

## 6. Adversarial-review findings + resolutions

| Finding (cycle 1 + 2 + 3) | Resolution |
|---|---|
| continue route has no origin check | SEC-02 / DEC-02 / P1-T2 |
| sign-out cookie attrs missing | SEC-04 / DEC-05 / P1-T4 |
| direct-grant can downgrade | SEC-10 / DEC-07 / P4-T1 (**rescoped to call sites only after source re-verify**) |
| `auth_trigger` dead enum | SEC-11 / DEC-08 / OPEN-SEC-01 |
| rate limits fail-open on disabled flag | SEC-05 / DEC-04 / P2-T1 / OPEN-SEC-02 (**rescoped to continue-route-only after source re-verify**) |
| pepper reused for realtime | SEC-09 / DEC-06 / OPEN-REL-02 |
| revoke needs IDOR guard | SEC-15 / P3-T3 denial test |
| revoke needs audit metadata | DEC-09 / migration 0038 |
| **(cycle 3) migration number self-contradiction in 21/README/P5-T2** | **normalized: 0038 revoke, 0039 auth_trigger** |
| **(cycle 3) missing route-specific App Router boundary/cache contract** | **added 06 §6.5** |
| **(cycle 3) test matrix not in mandated proof-contract format** | **replaced with PC-01..18 ledger (12 §2)** |
| **(cycle 3) P1-T2/P3-T4/P4-T1 DISCOVERY sub-steps resolvable from source** | **converted to concrete tasks (Continue `<a>`→`<form>`; revoke subsection; direct-grant call-site guard)** |
| **(cycle 3) D1 SQLite version unverified → Data cap-89** | **recorded NOT VERIFIED; honest re-score to 89** |
| **(cycle 3) SEC-05 framing stale (accept/page already short-circuit)** | **rescoped to continue-only** |
| **(cycle 3) SEC-15 not a full requirement in 04** | **SEC-12..15 added as full entries** |
| **(cycle 3) inflated category scores (95 overall unsupported)** | **honest re-score to 93; PASS conditions corrected** |
| **(cycle 3) DEC-05 "3x" session-cookie claim wrong** | **corrected to 2x (set-cookie-forwarding is OAuth-state, different family)** |
| **(cycle 3) AQ-04 sign-out internal-origin not noted** | **SEC-17 threat row added** |
| **(cycle 3) Server-Action direct-POST threat missing for revoke** | **SEC-16 threat row added** |

No unresolved P0/P1 findings.

## 7. Residual gaps (honest, post-Improve)

| Gap | Severity | Owner | Path to close |
|---|---|---|---|
| D1 SQLite version NOT VERIFIED (DROP COLUMN rollback) | **Low (caps Data at 89)** | impl | `wrangler d1 execute archestimator-proof-db --command "SELECT sqlite_version();"` at P3-T1; fix-forward fallback always available |
| PERF-01 query-count assertion not yet a test (PC-17 lands at P6) | Low (caps Perf at 94) | impl | add the assertion in P6-T1 |
| P3-T4 revoke UI is a new subsection (larger than first estimated) | Low | impl | Medium-Large task; PC-15 + manual keyboard proof |
| OPEN-SEC-01 (`auth_trigger`) | Low | owner | P5-T2 — recommend remove |
| OPEN-SEC-02 (continue fail-closed semantics) | Low-Medium | owner | P2-T1 confirmation |
| OPEN-REL-01 (email queue/bounce) | Low | owner | future work (DEC-10) |
| OPEN-REL-02 (realtime key rotation) | Low-Medium | owner | P5-T1 confirmation |
| No invite e2e Playwright spec | Low | impl/future | PC-14 manual proof; future spec |
| CSP Report-Only on `/invite` | Low | sibling plan | SEC-01 is primary control |
| emulated verification | Medium (cap at 97, not binding) | reviewer/owner | independent review or owner sign-off |

## 8. Critique-and-revision cycles (this planning pass)

- **Cycle 1 (after initial draft):** Cross-document consistency, traceability, shadow-path completeness, credential-material taxonomy. Closed 4 gaps (SEC-02, SEC-04, SEC-10, SEC-11).
- **Cycle 2 (adversarial + final verifier):** UltraQA-style adversarial pass; closed 3 residual gaps (SEC-05, SEC-09, revoke audit metadata DEC-09).
- **Cycle 3 (Improve-pass, source re-verification):** Native adversarial `Explore` lane + targeted source re-checks. Closed 11 gaps (migration numbers, route contract, proof-contract format, 3 DISCOVERY→concrete conversions, D1-version NOT-VERIFIED honesty, SEC-05 rescope, SEC-12..15 entries, score honesty, DEC-05 correction, SEC-16/17 threat rows). Two planning defects of substance were caught and fixed: the SEC-10 "shared helper" framing would have broken `updateProjectCollaboratorRole`; the 95-overall score was unsupported under the Improve directive's category caps.

## 9. Smallest set of actions to reach `IMPLEMENTATION-READY` for the whole pack

1. **Independent reviewer (or owner) signs off** on the pack → lifts the `emulated` cap (97).
2. **Resolve the D1 SQLite version** at P3-T1 (one read-only query) → lifts Data from 89 to ≥95.
3. **Land PC-17** (the query-count assertion) at P6 → lifts Performance from 94 to ≥95.
4. **Owner resolves OPEN-SEC-01** (`auth_trigger`: remove recommended) and **OPEN-SEC-02** (continue fail-closed confirm).
5. **Owner resolves OPEN-REL-02** (realtime key rotation confirm) — or explicitly defers Phase 5.
6. (Optional) Owner resolves OPEN-REL-01 (email queue: defer confirmed).

Once (1)+(2)+(3)+(4) land, Phases 1-4 are unconditionally implementation-ready; Phase 5 remains owner-gated on (5). Without (2)+(3), overall is bounded at 94 even with an independent verifier.
