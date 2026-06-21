# Shared Link Feature — Plan Pack Index

Date opened: 2026-06-20 · Last updated: 2026-06-21
Status: **Implementation landed for the audit-pass fixes; pack upgraded to a decision-ready, deployable plan.**

This folder is the audit, redesign, and execution pack for the shared-link / publication feature (a
manager publishes a read-only proposal link; a client reviews and decides). Read in this order: strategy
([05](05_PRODUCT_STRATEGY_BRIEF.md)) → what's true now ([75](75_FINDING_ID_REGISTRY.md), [70](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md))
→ what to decide ([71](71_OPEN_DECISIONS_REGISTER.md)) → what to do next ([91](91_FORWARD_EXECUTION_PLAN.md), [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md))
→ is it ready ([99](99_QUALITY_SCORECARD_AND_SIGNOFF.md)).

## Pack map

| # | Document | What it owns |
|---|---|---|
| 05 | [Product Strategy Brief](05_PRODUCT_STRATEGY_BRIEF.md) | Problem, personas, metrics, scope, positioning, beta→GA gate |
| 10 | [Security / Privacy / API Audit](10_SECURITY_PRIVACY_API_AUDIT.md) | Token/password/session/CSRF/rate-limit/public API/privacy |
| 12 | [Threat Model (STRIDE)](12_THREAT_MODEL_STRIDE.md) | Systematic per-asset threat enumeration |
| 13 | [Data Privacy Disclosure Decision](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) | Field-by-field public-exposure (DPIA) |
| 20 | [Receiver UX/UI/A11y Audit](20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md) | Public receiver state/a11y/mobile/print audit |
| 25 | [Receiver UX Redesign Blueprint](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) | **Client-facing page redesign (owner priority)** |
| 30 | [Manager Workflow Audit](30_MANAGER_WORKFLOW_AUDIT.md) | Create/publish/rotate/revoke/recipients/activity |
| 35 | [Manager Modal Redesign Blueprint](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) | **Sender-side modal redesign (owner priority)** |
| 40 | [Test/QA UltraQA Matrix](40_TEST_QA_ULTRAQA_MATRIX.md) | Test inventory, coverage gaps, adversarial matrix |
| 50 | [Performance / Speed Audit](50_PERFORMANCE_SPEED_AUDIT.md) | Hot-path perf, budgets, measurement plan |
| 60 | [Spec/Traceability/Architecture Audit](60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md) | Current architecture vs spec/archive intent |
| 70 | [Consolidated Findings & Backlog](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) | Cross-lane register + remaining backlog |
| 71 | [Open Decisions Register](71_OPEN_DECISIONS_REGISTER.md) | Owner decisions D1–D11 |
| 72 | [Blast-Radius / Dependency Map](72_BLAST_RADIUS_DEPENDENCY_MAP.md) | Shared symbols, collisions, ownership glossary |
| 75 | [Finding-ID Registry](75_FINDING_ID_REGISTRY.md) | **Canonical IDs / severities / statuses (source of truth)** |
| 80 | [Implementation & Verification Log](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md) | Exact fixes, files, tests, rollback, validation gaps |
| 85 | [UX Acceptance & Visual-QA Plan](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) | UX acceptance bar + state/viewport matrix |
| 90 | [Deploy & Migration Runbook](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) | Apply order, drift reconciliation, rollback, Go/No-Go |
| 91 | [Forward Execution Plan](91_FORWARD_EXECUTION_PLAN.md) | Sequenced backlog + per-item acceptance criteria |
| 92 | [Observability & Alerting](92_OBSERVABILITY_AND_ALERTING.md) | Signals, thresholds, alerting |
| 99 | [Quality Scorecard & Sign-off](99_QUALITY_SCORECARD_AND_SIGNOFF.md) | Per-lane scores + launch verdict |
| — | [LOOP_LEDGER.md](LOOP_LEDGER.md) | Policy-mandated loop ledger (HIGH-BLAST-RADIUS) |
| — | [_COORDINATION.md](_COORDINATION.md) | Internal remediation coordination (delete on sign-off) |

## Implemented in this pass (audit-driven fixes)

All landed fixes are tagged with their canonical id in [75](75_FINDING_ID_REGISTRY.md) and evidenced in
[70](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) "Fixed In This Iteration" + [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md).
Headlines: stale-snapshot write rejection (**SEC-SHARE-01**), recipient-text sanitization, session CSRF +
rate-limit (**SEC-SHARE-02**), open/event write limiting (**SEC-SHARE-03**), HMAC log hashes (**SEC-SHARE-04**),
activity comment-body redaction (**SEC-SHARE-09**), receiver a11y/print/mobile (**RUX-01..10/15**), perf
deferrals + caps (**PERF-02/03/04(code)/07/07B/08/10/11/13/14**; PERF-04 = code-shape only, p95 unmeasured), manager rotate/revoke guards (**MANAGER-F-02**).

**Verified:** focused shared-link suite green (see [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md) for the
exact reconciled command + count), `bun run type-check` pass, `git diff --check` pass. Browser/visual QA
deferred to the [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) gate.

## ⚠ Release / Deployment constraints (read before shipping)

1. **Migration-before-code.** `activity_target_labels_json` (`20260620064601`) MUST be applied before the
   app revision that reads it. Full ordered sequence in [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
2. **Migration apply not run this pass; remote↔local history is drifted.** Reconcile via
   `supabase migration repair --status applied <version>` (ledger-only) — [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) / D8.
3. **No rollback was authored with the migrations originally** — now covered in [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §rollback and [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md).
4. **Full `bun run validate` was skipped** (dirty worktree); only focused tests + type-check ran.

## Open work / decisions

- Decisions awaiting owner: [71](71_OPEN_DECISIONS_REGISTER.md) (D1–D11).
- Engineering backlog with acceptance criteria: [91](91_FORWARD_EXECUTION_PLAN.md).
- UX redesign (the owner's "fix the bad UX" mandate): [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) + [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md), gated by [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).

## Stop condition (checkable)

This iteration's plan-pack work is done when:
- [x] No **P1 source-fix** finding is Open in [75](75_FINDING_ID_REGISTRY.md) (P1-class test-rigor gaps QA-G03..G08 + SHF-01 tracked in [91](91_FORWARD_EXECUTION_PLAN.md)).
- [x] Every doc binds to [75](75_FINDING_ID_REGISTRY.md) with no severity/ID/status contradiction (final-verification coherence reconciliations CONFIRMED_LANDED + residual polish applied).
- [x] The focused suite + `type-check` + `git diff --check` pass — **16 files / 302 tests passed** (canonical re-run 2026-06-21, [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md)).
- [x] Decisions D1–D11 are at least **Recommended** in [71](71_OPEN_DECISIONS_REGISTER.md) (D11 Open by design — GA decision).
- [x] [99](99_QUALITY_SCORECARD_AND_SIGNOFF.md) returns a scored launch verdict.

Feature ship-readiness (beta) is gated separately by [99](99_QUALITY_SCORECARD_AND_SIGNOFF.md) and the
[90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) Go/No-Go.
