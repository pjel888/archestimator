# Requirements Traceability Matrix

## REQ ↔ WP ↔ AC ↔ TEST mapping

| REQ ID | Requirement | WP ID | Work package | AC ID | Acceptance criterion | TEST ID | Test/proof | Status |
|---|---|---|---|---|---|---|---|---|
| REQ-001 | Tolerate warning safely | WP-1.1 | Add in-source comment | AC-001 | `src/middleware.ts` contains explanatory comment | TEST-001 | Manual review of `git diff src/middleware.ts` | Planning-only (Phase 1 not yet implemented) |
| REQ-001 | Tolerate warning safely | WP-1.3 | README note | AC-002 | `README.md` line ~176 updated | TEST-002 | `grep "middleware.ts" README.md` shows updated text | Planning-only |
| REQ-002 | CF deploy preserved | WP-3 (blocked) | (Phase 3 future) | AC-003 | `bun run cf:deploy` succeeds post-rename | TEST-003 | `bun run cf:build && bun run cf:check-readiness` | Already satisfied by current code (Phase 3 not implemented) |
| REQ-002 | CF deploy preserved | WP-1.1 | Preserve file | AC-004 | `src/middleware.ts` exists unchanged (Phase 1 only adds comment) | TEST-004 | `existsSync("src/middleware.ts") === true` (existing test) | Already satisfied |
| REQ-003 | Preserve test lock-in | N/A | Do not modify `proxy-file-convention.test.ts` | AC-005 | Test remains as-is | TEST-005 | `bun run test:dom -- proxy-file-convention` passes | Already satisfied |
| REQ-004 | Blast radius captured | WP-AUDIT | (already done in planning) | AC-006 | 13 files listed in `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | TEST-006 | Manual review | COMPLETE |
| REQ-005 | Reconcile state-doc | WP-1.2 | Mark stale entries superseded | AC-007 | `rg "src/proxy\.ts" .ai/10_state/current-state.md` returns only historical entries | TEST-007 | `rg` command output | Planning-only (Phase 1) |
| REQ-006 | Phase 3 plan complete | WP-PLAN | (already done in planning) | AC-008 | Phase 3 WP-3.1 through WP-3.4 documented | TEST-008 | Manual review of `11_IMPLEMENTATION_PLAN.md` | COMPLETE |
| REQ-007 | Upstream monitoring | WP-4.1, WP-4.2 | Phase 4 monitoring | AC-009 | Monthly check logged in current-state.md | TEST-009 | Owner manual | Phase 4 ready |
| REQ-008 | Shared-worktree safety | WP-PLAN | (already done in planning) | AC-010 | `git status` clean post-plan-pack | TEST-010 | `git status --short --branch` | COMPLETE |

## Source-strength mapping

| REQ | Source strength | Source |
|---|---|---|
| REQ-001 | brief | User request |
| REQ-002 | repo evidence | Philip's commit + OpenNext source + AGENTS.md mandate |
| REQ-003 | repo evidence | Existing test file |
| REQ-004 | repo evidence | File inventory via rg |
| REQ-005 | repo evidence | Audit of `.ai/10_state/current-state.md` |
| REQ-006 | derived | Standard planning hygiene |
| REQ-007 | derived | Follow-through on REQ-006 |
| REQ-008 | repo evidence | AGENTS.md + .ai/AGENTS.md |

## Skipped dimensions (with N/A rationale)

| Standard exhaustive dimension | N/A reason |
|---|---|
| UX/UI/accessibility (05) | No UI change. File rename + comment is invisible to users. |
| Data/database/API/network (07) | No data layer, schema, API contract, or network behavior change. Middleware delegates session verification to server layout; no DB coupling. |
| Performance/reliability/observability (09) | No measurable runtime delta. Same code, different export name. |
| Rollout/rollback/operations (13) | No rollout (planning-only). Phase 3 rollback is `git revert`. |

## Coverage summary

- **Requirements:** 8 (REQ-001 through REQ-008)
- **Work packages:** 11 (across 4 phases)
- **Acceptance criteria:** 10
- **Tests/proofs:** 10
- **Status:** 4 COMPLETE, 5 planning-only (awaiting Phase 1), 1 already satisfied

## Requirement-by-requirement completion audit

| REQ | Status | Evidence |
|---|---|---|
| REQ-001 | Planning-only complete; Phase 1 implementation-ready | Plan pack |
| REQ-002 | Already satisfied by current code | `src/middleware.ts` exists; existing tests pass |
| REQ-003 | Already satisfied | `proxy-file-convention.test.ts` exists and passes |
| REQ-004 | COMPLETE | `10_BLAST_RADIUS_AND_DEPENDENCIES.md` lists 13 files |
| REQ-005 | Planning-only complete; Phase 1 implementation-ready | Plan pack identifies stale entries |
| REQ-006 | COMPLETE | Phase 3 plan in `11_IMPLEMENTATION_PLAN.md` |
| REQ-007 | Phase 4 ready | WP-4.1, WP-4.2 documented |
| REQ-008 | COMPLETE | `git status` verified clean during plan pack creation |

## Plan pack completeness audit

| Required artifact (per Creating-Plan-Prompt.md exhaustive profile) | Present | Location |
|---|---|---|
| README.md | ✓ | `README.md` |
| 00_AGENT_COORDINATION.md | ✓ | `00_AGENT_COORDINATION.md` |
| 01_EXECUTIVE_SUMMARY.md | ✓ | `01_EXECUTIVE_SUMMARY.md` |
| 02_FEATURE_BRIEF_AND_SCOPE.md | ✓ | `02_FEATURE_BRIEF_AND_SCOPE.md` |
| 03_SOURCE_AND_CODEBASE_AUDIT.md | ✓ | `03_SOURCE_AND_CODEBASE_AUDIT.md` |
| 04_REQUIREMENTS_SPECIFICATION.md | ✓ | `04_REQUIREMENTS_SPECIFICATION.md` |
| 05_UX_UI_ACCESSIBILITY_PLAN.md | N/A | (skipped — no UI) |
| 06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md | ✓ | `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` |
| 07_DATA_DATABASE_API_NETWORK_PLAN.md | N/A | (skipped — no data) |
| 08_SECURITY_PRIVACY_THREAT_MODEL.md | ✓ | `08_SECURITY_PRIVACY_THREAT_MODEL.md` |
| 09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md | N/A | (skipped — no perf impact) |
| 10_BLAST_RADIUS_AND_DEPENDENCIES.md | ✓ | `10_BLAST_RADIUS_AND_DEPENDENCIES.md` |
| 11_IMPLEMENTATION_PLAN.md | ✓ | `11_IMPLEMENTATION_PLAN.md` |
| 12_TEST_AND_VALIDATION_STRATEGY.md | ✓ | `12_TEST_AND_VALIDATION_STRATEGY.md` |
| 13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md | N/A | (skipped — planning-only) |
| 14_RISK_REGISTER.md | ✓ | `14_RISK_REGISTER.md` |
| 15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md | ✓ | `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` |
| 16_REQUIREMENTS_TRACEABILITY_MATRIX.md | ✓ | (this file) |
| 17_FINAL_READINESS_REVIEW.md | ✓ | `17_FINAL_READINESS_REVIEW.md` |
| 18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md | ✓ | `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` |
| 19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md | ✓ | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` |
| LOOP_LEDGER.md | ✓ | `LOOP_LEDGER.md` (Archestimator-specific addition) |
| evidence/ | ✓ | `evidence/git-history.txt`, `evidence/opennext-source.txt` |

**Count: 18 plan files + 1 LOOP_LEDGER + 2 evidence files = 21 artifacts.** Exceeds the exhaustive profile minimum.
