# LOOP_LEDGER — Shared Link Feature

Feature: Shared-link / publication (publish read-only proposal → client reviews & decides)
Blast-radius classification: **HIGH** — DB schema + RPC migrations, RLS, auth/session, CSRF, public
unauthenticated surface, client-facing money figures. (Per `AGENT_OPERATING_PROTOCOL` this mandates a
dated pack + this ledger.)
Owner: Philip · Lead agent: Claude · Opened: 2026-06-20 · Updated: 2026-06-21

Canonical status: [75](75_FINDING_ID_REGISTRY.md). Backlog/execution: [91](91_FORWARD_EXECUTION_PLAN.md).
Decisions: [71](71_OPEN_DECISIONS_REGISTER.md). Deploy: [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).

---

## Iteration log

| # | Date | Goal | Change | Verification | Decision |
|---|---|---|---|---|---|
| I-1 | 2026-06-20 | Close audit-found correctness/security/UX/perf gaps | 24 fixes (see [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md)): SEC-SHARE-01/02/03/04/09, RUX-01..10/15, MANAGER-F-02, PERF-02/03/04(code)/07/07B/08/10/11/13/14; + 2 migrations | Focused shared-link suite green; `type-check`; `git diff --check`. Browser QA deferred; provider migration apply NOT run. | Proceed; carry validation gaps to backlog. |
| I-2 | 2026-06-21 | Drive the pack to 100% (strategy/quality/impl-readiness) + redesign the bad UX | 19-agent audit (rate+lenses+source-verify); built canonical [75](75_FINDING_ID_REGISTRY.md); authored 05/12/13/25/35/71/72/85/90/91/92/99 + this ledger; remediated 00/10/20/30/40/50/60/70/80; UX redesign blueprints 25/35 | All 15 authoring agents WRITTEN, bound to 75, no conflicts; 4/4 source verifications CONFIRMED | Proceed to final verification + owner decisions. |

## Landed this pack (cross-ref [75](75_FINDING_ID_REGISTRY.md))

See [70](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) "Fixed In This Iteration" for the id → files → test → verified table. Status roll-up in [75](75_FINDING_ID_REGISTRY.md) §8.

## Open loops (each an entry/exit-criteria item in [91](91_FORWARD_EXECUTION_PLAN.md))

- **Security/privacy:** SEC-SHARE-05 (unsubscribe/session-DELETE same-origin, D5), SEC-SHARE-06 (digest, D9), SEC-SHARE-07 (location, D2), SEC-SHARE-08 (atomic publication), D3 (OG/clientName/IDs).
- **Test rigor (P1-class):** QA-G03..G10 (DOM escaping, recipient-session integration, circuit breaker, duplicate-decision race, offline queue, tampered viewToken, comments-after-decision, tighten permissive asserts).
- **Manager:** MANAGER-F-01 residual RBAC matrix, F-03/F-04/F-05/F-06.
- **Perf (measure/scale):** PERF-01A/05/06/09/12 + perf budgets.
- **Architecture:** SHF-01 realtime (D7), SHF-03 durable throttle (D4).
- **UX redesign:** receiver phases A–D ([25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md)), manager phases A–D ([35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md)), gated by [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
- **Deploy:** D8 migration reconciliation + canonical-history promotion ([90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md)).

## Validation gates

| Gate | I-1 | Notes |
|---|---|---|
| Focused Vitest (shared-link suite) | ✅ | **Canonical 16-file suite re-run 2026-06-21 → 16 files / 302 tests passed (exit 0).** Reconciled command + verbatim summary in [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md). |
| `bun run type-check` | ✅ | |
| `git diff --check` | ✅ | |
| Focused ESLint (changed files) | ✅ | |
| Browser / visual QA | ⏸ deferred | → [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) gate (overrides the Codex browser guardrail for client-facing UX). |
| Provider migration apply + readback | ⛔ not run | → [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) (D8). Headline SEC-SHARE-01 RPC lock is local-history-aligned; provider proof outstanding. |
| Full `bun run validate` | ⛔ skipped | Dirty worktree (unrelated files). |

## Codex review-gate (HIGH-BLAST-RADIUS → required before declaring the *implementation* done)

**Status: OUTSTANDING for I-1.** The shared-link diff touches DB/RLS/RPC/auth/security/migrations, so
`CLAUDE.md` requires a passing Codex review before stopping on the implementation. [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md)
recorded local Vitest/type-check/eslint only. **Action:** run `/codex:review` on the shared-link diff (or
record an explicit owner waiver) and capture the result id here before the *code* iteration is closed.
(Note: this planning/remediation pass I-2 is documentation-only and not itself a code-review-gated change.)

## Stop conditions (mirror [00](00_INDEX.md))

- [x] Canonical registry exists; all docs bound to it.
- [x] Strategy, decisions, deploy runbook, forward plan, observability, scorecard authored.
- [x] UX redesign blueprints authored (owner mandate).
- [ ] Final verification pass confirms no residual cross-doc contradiction (in progress, I-2).
- [ ] Decisions D1–D11 resolved by owner.
- [ ] Codex review-gate satisfied for the I-1 code diff (or waived).
- [ ] [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) Go/No-Go executed before shipping to beta.
