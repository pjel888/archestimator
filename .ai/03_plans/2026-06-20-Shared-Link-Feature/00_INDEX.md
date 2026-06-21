# Shared Link Feature — Plan Pack Index

Date opened: 2026-06-20 · Last updated: 2026-06-21
Status: **D1-D11 source/provider implementation advanced; pack remains open for deploy, visual proof, QA-G06, and hosted/provider perf gates.**

This folder is the audit, redesign, and execution pack for the shared-link / publication feature (a
manager publishes a read-only proposal link; a client reviews and decides). Read in this order: strategy
([05](05_PRODUCT_STRATEGY_BRIEF.md)) → what's true now ([75](75_FINDING_ID_REGISTRY.md), [70](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md))
→ what to decide ([71](71_OPEN_DECISIONS_REGISTER.md)) → what to do next ([91](91_FORWARD_EXECUTION_PLAN.md), [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md))
→ requirement closure ([95](95_REQUIREMENT_TO_EVIDENCE_CLOSURE_LEDGER.md)) → is it ready ([99](99_QUALITY_SCORECARD_AND_SIGNOFF.md)).

## Pack map

| # | Document | What it owns |
|---|---|---|
| 05 | [Product Strategy Brief](05_PRODUCT_STRATEGY_BRIEF.md) | Problem, personas, metrics, scope, positioning, beta→GA gate |
| 10 | [Security / Privacy / API Audit](10_SECURITY_PRIVACY_API_AUDIT.md) | Token/password/session/CSRF/rate-limit/public API/privacy |
| 12 | [Threat Model (STRIDE)](12_THREAT_MODEL_STRIDE.md) | Systematic per-asset threat enumeration |
| 13 | [Data Privacy Disclosure Decision](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) | Field-by-field public-exposure (DPIA) |
| 15 | [Market & UX Research Note](15_MARKET_AND_UX_RESEARCH_NOTE.md) | External proposal-sharing patterns and planning implications |
| 20 | [Receiver UX/UI/A11y Audit](20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md) | Public receiver state/a11y/mobile/print audit |
| 25 | [Receiver UX Redesign Blueprint](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) | **Client-facing page redesign (owner priority)** |
| 30 | [Manager Workflow Audit](30_MANAGER_WORKFLOW_AUDIT.md) | Create/publish/rotate/revoke/recipients/activity |
| 35 | [Manager Modal Redesign Blueprint](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) | **Sender-side modal redesign (owner priority)** |
| 40 | [Test/QA UltraQA Matrix](40_TEST_QA_ULTRAQA_MATRIX.md) | Test inventory, coverage gaps, adversarial matrix |
| 50 | [Performance / Speed Audit](50_PERFORMANCE_SPEED_AUDIT.md) | Hot-path perf, budgets, measurement plan |
| 60 | [Spec/Traceability/Architecture Audit](60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md) | Current architecture vs spec/archive intent |
| 70 | [Consolidated Findings & Backlog](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) | Cross-lane register + remaining backlog |
| 71 | [Owner-Decision Register](71_OPEN_DECISIONS_REGISTER.md) | Ratified owner decisions D1-D11 |
| 72 | [Blast-Radius / Dependency Map](72_BLAST_RADIUS_DEPENDENCY_MAP.md) | Shared symbols, collisions, ownership glossary |
| 75 | [Finding-ID Registry](75_FINDING_ID_REGISTRY.md) | **Canonical IDs / severities / statuses (source of truth)** |
| 80 | [Implementation & Verification Log](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md) | Exact fixes, files, tests, rollback, validation gaps |
| 85 | [UX Acceptance & Visual-QA Plan](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) | UX acceptance bar + state/viewport matrix |
| 90 | [Deploy & Migration Runbook](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) | Apply order, drift reconciliation, rollback, Go/No-Go |
| 91 | [Forward Execution Plan](91_FORWARD_EXECUTION_PLAN.md) | Sequenced backlog + per-item acceptance criteria |
| 92 | [Observability & Alerting](92_OBSERVABILITY_AND_ALERTING.md) | Signals, thresholds, alerting |
| 95 | [Requirement-to-Evidence Closure Ledger](95_REQUIREMENT_TO_EVIDENCE_CLOSURE_LEDGER.md) | 100% planning-artifact closure vs operational NO-GO separation |
| 99 | [Quality Scorecard & Sign-off](99_QUALITY_SCORECARD_AND_SIGNOFF.md) | Per-lane scores + launch verdict |
| — | [LOOP_LEDGER.md](LOOP_LEDGER.md) | Policy-mandated loop ledger (HIGH-BLAST-RADIUS) |
| — | [_COORDINATION.md](_COORDINATION.md) | Internal remediation coordination (delete on sign-off) |

## Implemented in this pass (audit-driven fixes)

All landed fixes are tagged with their canonical id in [75](75_FINDING_ID_REGISTRY.md) and evidenced in
[70](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) "Fixed In This Iteration" + [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md).
Headlines: stale-snapshot write rejection (**SEC-SHARE-01**), recipient-text sanitization, session CSRF +
rate-limit (**SEC-SHARE-02**), open/event write limiting (**SEC-SHARE-03**), HMAC log hashes (**SEC-SHARE-04**),
activity comment-body redaction (**SEC-SHARE-09**), generic OG metadata (**SEC-SHARE-10**), receiver a11y/print/mobile/story/test-comment matrix (**RUX-01..14(source)/15**), perf
deferrals + caps (**PERF-02/03/04(code)/06/07/07B/08/10/11/13/14**; PERF-04 = code-shape only, p95 unmeasured; PERF-06 = local snapshot-byte budget pass), manager RBAC matrix/invalid-link copy parity/rotate-revoke guards/recipient retry chips/behavioral action tests/dashboard quick actions (**MANAGER-F-01/F-02/F-03/F-04/F-05/F-06**), plus targeted QA closure (**QA-G03/G04/G07/G08/G09**).

**Verified:** focused shared-link suite green (see [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md) for the
exact reconciled command + count), canonical shared-link + snapshot/perf/smoke-helper suite 23 files / 353 tests,
`bun run type-check` pass, `git diff --check` pass, Storybook coverage/provider-boundary checks, header-smoke helper tests,
local password/rotate perf helper rows, and `#FFFDF8` receiver-token search clean. A 2026-06-21 provider readback on `ebxxqidacheyapmmzavr` confirmed shared-link migrations
`20260620064601`, `20260620142000`, `20260621042221`, and `20260621051701` are Local+Remote, target label maps
are complete, row-target mismatches are 0/0, target columns exist, and target-aware RPCs are service-role only.
The D1-D11 hardening migrations and atomic publish/digest-slot migration are provider-applied and read back in
[`evidence/provider-readback/d1-d11-atomic-publish-digest-2026-06-21.md`](evidence/provider-readback/d1-d11-atomic-publish-digest-2026-06-21.md).
Native code review is green. QA-G10 production-mode header smoke now passes against a seeded local shared link
(`evidence/shared-link-smoke/headers-2026-06-21.md`), but browser/mobile/print visual QA, app
deploy/post-deploy smoke, QA-G06 real DB race proof, and remaining hosted/provider perf budgets remain open;
PERF-06 snapshot bytes now pass locally at the 10k tier, local PERF-09/PERF-12 CPU-only measurements pass,
and linked-provider read-only DB performance inventory exists under `evidence/live-db-performance-2026-06-21/`.

## ⚠ Release / Deployment constraints (read before shipping)

1. **Migration-before-code.** `activity_target_labels_json` (`20260620064601`) and target-context schema/RPCs
   (`20260621042221`/`20260621051701`) MUST stay applied before the app revision that reads/writes them. Full
   ordered sequence in [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
2. **Provider shared-link migration/readback is green as of 2026-06-21**, but app deploy/post-deploy smoke and
   broader drift/advisor checks remain open — [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) / D8.
3. **No rollback was authored with the migrations originally** — now covered in [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §rollback and [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md).
4. **Live provider snapshot no longer blocks on missing shared-link columns**, but [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md)
   still must pass app deploy, post-deploy smoke, advisors delta, and owner signoff before any app-deploy claim.
5. **Full `bun run validate` was skipped** (dirty worktree); only focused tests + type-check ran.

## Open work / decisions

- Remaining D1-D11 external evidence backlog: [71](71_OPEN_DECISIONS_REGISTER.md), [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md), and [91](91_FORWARD_EXECUTION_PLAN.md).
- Engineering backlog with acceptance criteria: [91](91_FORWARD_EXECUTION_PLAN.md).
- UX redesign (the owner's "fix the bad UX" mandate): [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) + [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md), gated by [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).

## Stop condition (checkable)

This iteration's plan-pack work is done when:
- [x] No **P1 source-fix** finding is Open in [75](75_FINDING_ID_REGISTRY.md) (remaining P1-class provider test-rigor gap QA-G06 is tracked in [91](91_FORWARD_EXECUTION_PLAN.md); SHF-01 is beta-resolved by D7, with realtime in GA backlog).
- [x] Every doc binds to [75](75_FINDING_ID_REGISTRY.md) with no severity/ID/status contradiction after the
  explicit open gates are called out as gates, not hidden readiness.
- [x] The focused suite + `type-check` + `git diff --check` pass — **canonical 23 files / 353 tests passed** (latest re-run 2026-06-21, [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md)).
- [x] Decisions D1-D11 are owner-ratified in [71](71_OPEN_DECISIONS_REGISTER.md) and `.ai/10_state/decisions.md`; source/provider implementation is now evidenced, while external deploy/live-QA/perf evidence remains a separate beta ship gate.
- [x] [95](95_REQUIREMENT_TO_EVIDENCE_CLOSURE_LEDGER.md) maps every explicit pasted-request requirement to evidence,
  giving 100/100 **planning-artifact** closure while preserving operational NO-GO gates.
- [x] [99](99_QUALITY_SCORECARD_AND_SIGNOFF.md) returns a scored verdict that distinguishes plan-pack assembly from feature deploy/ship readiness.

Feature ship-readiness (beta) is gated separately by [99](99_QUALITY_SCORECARD_AND_SIGNOFF.md) and the
[90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) Go/No-Go.

**Archive status:** do **not** archive this folder yet. The user asked to archive only when everything in the folder is implemented; current open gates include app deploy/post-deploy smoke, browser/mobile/print visual QA, QA-G06 real DB race proof, hosted/provider perf evidence, and remaining backlog items in [75](75_FINDING_ID_REGISTRY.md)/[91](91_FORWARD_EXECUTION_PLAN.md). QA-G10's header-smoke half is closed; its visual half remains open.
