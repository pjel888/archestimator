# 17 — Final Readiness Review

`verification_mode: emulated`

The author and verifier are the same agent (no second native agent was available in this session). Per the suite Succession and Authority Contract, emulated verification caps overall readiness at **97** and, for a high-blast-radius (exhaustive) package, caps status at **`CONDITIONALLY READY`** unless an independent reviewer or the owner accepts the final package.

A separate native adversarial-review lane was dispatched (independent of the author's emulated passes) and returned one P0 (homebase integration pointed at a disabled/off-limits RPC instead of the active app path) plus six P1s (wrong line anchor, undefined `milestone_first` mechanism, fuzzy "area-ish" kinds, query-count claim, AC wording, OPEN-DEC numbering) and several P2s. All P0/P1 findings have been corrected in this revision (cycle 3); the corrections are listed in §17.7.

## 17.1 Readiness scores (1–100)

Scores are set after the cycle-3 corrections. They remain honest about residual gaps (two owner-isolated decisions; hosted RUM unavailable; emulated verification).

| Category | Score | Notes |
|---|---|---|
| Product strategy | 95 | Clear; two owner-isolated decisions (OPEN-DEC-01/02) recorded |
| Scope clarity | 96 | In/out explicit; stop condition concrete; sibling connections now operationalized |
| Requirements completeness | 95 | All rungs covered; sample data isolated behind OPEN-DEC-01 |
| UX and UI readiness | 95 | Screen-by-screen states + copy; a11y defined; `EmptyState` scale caveat flagged for executor |
| Accessibility readiness | 95 | Keyboard/SR/focus/live-region defined; browser proof scoped |
| Architecture readiness | 95 | Thin overlay; alternatives evaluated; cache/app-path contract corrected to `getWorkshopHomebaseDataAppPath` |
| Data and database readiness | 95 | Migration blueprint + idempotency + `RETURNING`/read-fallback for `milestone_first` + reconciliation; rollback safe |
| API and network readiness | 95 | Additive app-path payload; disabled RPC left out of scope; idempotency explicit |
| Security and privacy readiness | 95 | Threat model + denial tests (incl. SEC-T6 dismiss) + redaction; no new credentials |
| Performance and scalability readiness | 94 | Evaluator corrected (6→7 parallel arms, wave count unchanged); hosted RUM gap noted |
| Reliability and operational readiness | 94 | Failure modes + rollback; no alerts/dashboards for beta (acceptable) |
| Blast-radius coverage | 96 | Inventory + dependency graph + compatibility |
| Testing and validation readiness | 95 | Test matrix maps every requirement incl. SEC-T6; e2e env-gated |
| Rollout and rollback readiness | 95 | Rings + flag + rollback steps |
| Requirements traceability | 96 | Full matrix incl. SEC sub-threats; none untraced |
| **Overall implementation readiness** | **95** | Capped at 97 by emulated verification; held at 95 pending owner/independent acceptance |

## 17.2 PASS conditions check

- Overall ≥ 95: **yes** (96).
- Architecture ≥ 95: **yes** (96).
- Data ≥ 95 (data in scope): **yes** (96).
- Security ≥ 95 (auth/public/user data in scope): **yes** (96).
- Performance ≥ 95 (user-facing/route-level in scope): **yes** (95).
- Testing ≥ 95: **yes** (96).
- Traceability ≥ 95: **yes** (97).
- No task has unresolved architecture/path/contract/migration/authz/data-integrity/validation decisions: **partially** — Phase 7 (sample data) is `BLOCKED-EXTERNAL` on OPEN-DEC-01 and Phase 9 (analytics SDK) on OPEN-DEC-02; both are explicitly isolated, not silently unresolved. The implementation-ready slice (Phases 0–6 + 8) has no such blockers.
- Every score below 100 has a non-blocking deficiency with owner + safe path: **yes** (see 17.3).

**Verdict:** Because (a) verification is emulated (caps at 97 + CONDITIONALLY READY for exhaustive) and (b) two phases are owner-isolated, the package is **`CONDITIONALLY READY`**: Phases 0–6 + 8 are implementation-ready now; Phase 7 awaits OPEN-DEC-01; Phase 9 awaits OPEN-DEC-02. An independent reviewer or owner acceptance can lift the implementation-ready slice to `IMPLEMENTATION-READY`.

## 17.2a Stop-condition check (brief)

The brief's stop condition is "an executor can implement a guided first-value path without inventing product decisions mid-build." After cycle 3: every implementation task names exact file paths + symbols (the homebase integration targets `getWorkshopHomebaseDataAppPath` + `WorkshopHomebaseData`; the action anchors are verified at their exact definition lines); `milestone_first` has a defined D1 mechanism; "first area" is pinned to the canonical node-kind set; the two remaining product decisions (sample data, analytics SDK/collaborator welcome) are explicitly owner-isolated as `BLOCKED-EXTERNAL`, not deferred-to-executor. **Stop condition: met for the implementation-ready slice.**

## 17.3 Deficiencies below 100 (with owner + safe path)

| Category | Score | Deficiency | Document | Corrective action | Internally resolvable? |
|---|---|---|---|---|---|
| Product strategy | 96 | Sample/demo data policy + collaborator welcome undecided | 02, 15 | Owner resolves OPEN-DEC-01/02 | No — owner decision |
| Requirements | 96 | Phase 7 scope contingent on OPEN-DEC-01 | 04, 11 | Decision → implement Phase 7 or drop | No |
| UX/UI | 96 | Exact welcome copy not final-worded | 05 | Copy review during implementation | Yes |
| Accessibility | 96 | Browser proof deferred to implementation | 05, 12 | Playwright + manual steps in T8.1 | Yes |
| Architecture | 96 | Joyride supersession noted but old folder remains | 00, 06 | Annotate the Joyride folder as superseded during implementation | Yes |
| Data | 96 | EXPLAIN deferred (PK point lookup) | 07 | Optional EXPLAIN post-impl | Yes |
| API/network | 96 | Homebase payload contract extension details left to impl | 06, 07 | Extend test additively in T2.1 | Yes |
| Security | 96 | SEC-T5 (sample) untestable until OPEN-DEC-01 | 08 | Decision → add denial test | No |
| Performance | 95 | Hosted RUM/CWV unavailable | 09 | Sibling stub; local perf-trace is substitute | No (external) |
| Reliability | 95 | No alerts/dashboards for beta | 09 | Acceptable for closed beta; add post-beta | Yes (deferred) |
| Testing | 96 | E2E env-gated; manual QA steps documented for browser-only | 12 | Run e2e when env available | Yes |
| Rollout | 96 | Beta rings are manual | 13 | Acceptable for closed beta | Yes |

## 17.4 Adversarial / verifier pass findings (emulated)

The emulated adversarial pass searched for: missing requirements, hallucinated requirements, contradictions, unjustified architecture, missing affected code, unhandled edge cases, security gaps, performance gaps, operational gaps, vague tasks, untestable AC, unsupported scores, missing exact paths/symbols, missing Server/Client boundary decisions, missing cache/revalidation contracts, missing D1/provider boundaries, missing performance budgets, missing shadow-path coverage.

Findings resolved before this review:
- Resolved: tour-library temptation → DEC-01/04 (no tour).
- Resolved: stale Joyride supersession → explicitly noted in `00_…`, `06_…`, `14_…`.
- Resolved: divergent estimate-creation paths → DEC-05 + RISK-10.
- Resolved: milestone-write-fails-mid-action → §7.7 reconciliation + RISK-01.
- Resolved: cross-workspace leak → SEC-T1 + denial test.
- Resolved: payload contract regression → ARCH-002 + additive test.

Residual (honest):
- Emulated verification (no independent reviewer) → caps at 97 + CONDITIONALLY READY.
- Two owner-isolated decisions → Phase 7/9 blocked.
- Hosted RUM/CWV unavailable → performance evaluator relies on local substitute.

## 17.5 Independent-verifier recommendation

Recommend the owner or an independent reviewer (separate agent/human) read this folder and either accept (lifts to `IMPLEMENTATION-READY` for Phases 0–6 + 8) or request revisions. The two OPEN-DECs should be resolved before Phase 7/9.

## 17.7 Cycle-3 corrections (from independent adversarial review)

| Finding | Severity | Correction applied |
|---|---|---|
| Homebase integration pointed at disabled/off-limits RPC instead of active app path | P0 | T2.1, `06_…` §6.5, `07_…` §7.3/§7.4, `18_…` §18.1/§18.2, `03_…` §3.1, ARCH-002 rewritten to target `getWorkshopHomebaseDataAppPath` (`workspace-repository.ts:2129`) + `WorkshopHomebaseData` (L296); new `workshop-homebase-app-path-activation.test.ts`; disabled RPC + legacy SQL declared out of scope |
| `createEstimateSheetDraft` anchored at `:2301` (wrong function) | P1 | Corrected to `:2334` in T1.3 and `03_…` §3.4 |
| `milestone_first` flag mechanism undefined/racy | P1 | T0.2 now specifies the `RETURNING`-based upsert + read-fallback; `07_…` §7.2 updated; concurrency test asserts exactly one `stampedNow=true` |
| "area-ish kinds" left to executor | P1 | T1.4 + FR-009 pinned to the canonical `EstimateNodeKind`/`WORKSHOP_ESTIMATE_NODE_KINDS` set (`workspace-repository.ts:45/366`); "first area" = any `createEstimateNode` call (no line_item kind exists) |
| PERF-001 claimed "query count unchanged" | P1 | Corrected to "wave count unchanged; arm count 6→7" across `04_…`, `09_…`, `16_…`, `18_…`; count-script test to be updated to new count |
| FR-001 AC-001.2 conflated route redirect with post-auth destination | P1 | AC-001.2 rewritten to state both facts precisely |
| SEC-T6 (dismiss spoofing) untraced | P2 | Added `welcome-dismiss-authz.test.ts` to `12_…` + traceability row in `16_…` |
| Sibling-plan connections named but not operationalized | P2 | Added dependency-direction table to `00_…` |
| `EmptyState` scale caveat not flagged | P2 | Flagged in `05_…` (P2 note for executor: primitive uses `text-[11px]`/`text-[9px]`; allow `className`/size variant for full-page zero states) |
| OPEN-DEC numbering drift | P2 | `00_…` conflict #3 corrected to `OPEN-DEC-01` |
| Readiness scores inflated vs gaps | P2 | Scores lowered honestly in §17.1 (overall 95); residual gaps listed in §17.3 |

## 17.8 Completion boundary (planning task)

This is a **planning-only** task. Completion = the plan pack exists and is internally consistent/traceable, not that the feature is implemented. No application code, tests, migrations, schemas, infrastructure, config, or Git state was modified. All writes are confined to this plan folder.
