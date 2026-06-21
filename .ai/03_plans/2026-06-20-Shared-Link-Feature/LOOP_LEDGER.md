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
| I-2 | 2026-06-21 | Drive the pack to 100% (strategy/quality/impl-readiness) + redesign the bad UX | 19-agent audit (rate+lenses+source-verify); built canonical [75](75_FINDING_ID_REGISTRY.md); authored 05/12/13/25/35/71/72/85/90/91/92/99 + this ledger; remediated 00/10/20/30/40/50/60/70/80; UX redesign blueprints 25/35 | All 15 authoring agents WRITTEN, bound to 75, no conflicts; 4/4 source verifications CONFIRMED | Proceed to final verification + then-open owner decisions. |
| I-3 | 2026-06-21 | Close targeted review/test/story/perf-evidence gates without overstating ship readiness | Landed MANAGER-F-04 retry chips, RUX-11 real-component Storybook matrix, QA-G03/G04/G08/G09 tests, perf-budget helper, perf evidence, and native code-review artifact | `type-check` passed; the then-current targeted post-review suite passed; Storybook coverage/provider-boundary passed; activity + snapshot evidence captured; native code-reviewer found 0 blockers | Kept feature NO-GO because PERF-06 was still open then, and ratified-implementation/deploy/visual/hosted perf gates remained open. |
| I-4 | 2026-06-21 | Turn PERF-06 from measured fail into a real payload optimization | Added compact snapshot schema v1.3: tab payloads store `rowIds` instead of duplicated row objects; `SharePageTabs` resolves v1.3 row IDs and legacy v1.2 `tab.rows`; perf evidence refreshed | Red-first snapshot/perf tests failed on old shape; after implementation `project-publication-snapshot.test.ts` + `shared-link-perf-budgets-script.test.ts` passed 2 files / 10 tests, the later canonical shared-link suite passed 23 files / 353 tests, `type-check` passed, and `evidence/perf-budgets.md` records 10k rows 2.55 MiB PASS vs 4 MiB | PERF-06 fixed locally; feature remains NO-GO because ratified decision implementation, deploy smoke, visual/browser proof, QA-G06/G10, and hosted/provider perf evidence remain open. |
| I-5 | 2026-06-21 | Close RUX-12 stale receiver-test typography contract | Updated the estimate-tab test to assert the actual `text-[13px]` class and document the path-scoped `/share` Client Portal type-scale exemption | `bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1` passed 1 file / 38 tests; `git diff --check` passed | RUX-12 fixed locally; no product-source behavior changed. |
| I-6 | 2026-06-21 | Make QA-G10/PERF-09/PERF-12 evidence executable without overstating external proof | Added header-smoke and seed scripts, ignored the bearer-token `url.env`, made perf evidence append rows, and recorded local password-unlock + rotate-cost measurements | `shared-link-header-smoke-script`, `shared-link-smoke-seed-script`, and `shared-link-perf-budgets-script` passed 3 files / 12 tests; `type-check` passed; local perf rows PASS in `evidence/perf-budgets.md` | QA-G10 remains open until live SHARE_URL smoke + visual proof; PERF-09/12 remain open for hosted/provider timing. |
| I-7 | 2026-06-21 | Close MANAGER-F-03 unavailable-link copy parity | Added `SHARED_LINK_UNAVAILABLE_COPY` and reused it from the branded not-found page plus public share API 404 envelopes | Targeted route/page/no-store suite passed 6 files / 155 tests; `type-check` passed | MANAGER-F-03 fixed locally; manager redesign can still improve copy/preview presentation, but page/API parity is no longer open. |
| I-8 | 2026-06-21 | Close MANAGER-F-05 behavioral action-test gap | Added mocked Supabase/server-action harness coverage for republish, rotate, and owner activity-load success/error branches | `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1` passed 1 file / 24 tests; `type-check` passed | MANAGER-F-05 fixed locally; MANAGER-F-01 role matrix remained separate until I-9. |
| I-9 | 2026-06-21 | Close MANAGER-F-01 full RBAC role-rejection matrix | Added the 7 publication mutations × 5 actor classes matrix and fixed `member` role ranking below manager rank | `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1` passed 1 file / 25 tests; canonical shared-link suite passed 23 files / 353 tests; `type-check` passed | MANAGER-F-01 fixed locally; feature remains NO-GO on ratified implementation/deploy/browser/live/provider gates. |
| I-10 | 2026-06-21 | Close QA-G07 offline queue hardening | Replaced the soft offline-queue placeholder with assertions for sessionStorage persistence, reconnect flush, queue clearing, posted body/viewToken, and fresh CSRF headers | `bunx vitest run tests/vitest/project-publication-comments.test.tsx --maxWorkers=1` passed 1 file / 33 tests | QA-G07 fixed locally; QA-G06 provider race remains the only P1-class QA test-rigor gate. |
| I-11 | 2026-06-21 | Close MANAGER-F-06 dashboard quick actions | Added published-row copy/preview plus manager-only rotate/revoke controls in `PublishedProjectQuickActions`, with existing publication actions, tooltip semantics, destructive confirms, `ok:false` error handling, and dashboard refresh only after successful mutations | `bunx vitest run tests/vitest/workshop-reset.test.tsx tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-header.test.tsx --maxWorkers=1` passed 3 files / 107 tests; `type-check` passed | MANAGER-F-06 fixed locally; browser/visual/deploy/provider/ratified-implementation gates remain open. |
| I-11R | 2026-06-21 | Resolve dashboard quick-action review findings | Follow-up code review found `ok:false` success handling, viewer destructive controls, and overstated evidence; the source/tests/docs were patched and the resolution artifact was added | Same 3-file / 107-test manager regression passed; targeted ESLint had 0 errors; `type-check` and `git diff --check` passed | Review findings resolved; no change to feature NO-GO status. |
| I-12 | 2026-06-21 | Make QA-G06 provider race executable | Added gated provider/local-Supabase Vitest harness plus evidence notes for the duplicate-decision race | `bunx vitest run tests/vitest/share/duplicate-decision-race.provider.test.ts --maxWorkers=1` passed as 1 skipped file when `SUPABASE_DB_URL` was absent; `bun run lint tests/vitest/share/duplicate-decision-race.provider.test.ts` passed. `supabase status` failed because Docker was not running. | QA-G06 is Partial: harness exists, but real DB proof still must run against local Supabase or linked provider. |
| I-13 | 2026-06-21 | Sync owner ratification for D1-D11 | Marked `71`/`71-PA` as owner-ratified, recorded the decision in `.ai/10_state/decisions.md`, and updated dependent gate language so implementation remains open but no longer blocked on owner calls | `git diff --check`; stale owner-gate scan | Owner-decision gate closed; feature remains NO-GO on ratified implementation, deploy, browser/visual, QA-G06/QA-G10, and hosted/provider perf evidence. |

## Landed this pack (cross-ref [75](75_FINDING_ID_REGISTRY.md))

See [70](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) "Fixed In This Iteration" for the id → files → test → verified table. Status roll-up in [75](75_FINDING_ID_REGISTRY.md) §8.

## Open loops (each an entry/exit-criteria item in [91](91_FORWARD_EXECUTION_PLAN.md))

- **Security/privacy:** SEC-SHARE-05 (unsubscribe/session-DELETE same-origin), SEC-SHARE-06 (digest hardening), SEC-SHARE-07 (location visibility), SEC-SHARE-08 (atomic publication), D3 opaque IDs.
- **Test rigor (P1-class):** QA-G06 provider-backed duplicate-decision race proof is still pending, though the gated harness exists; QA-G10 live headers/mobile/print visual proof remains P2/browser-gated.
- **Manager:** all MANAGER-F source/test gaps are fixed locally; broader manager redesign polish remains in [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md).
- **Perf (measure/scale):** PERF-01A/05 plus hosted/provider evidence for PERF-09/12. PERF-06 snapshot bytes, local password-unlock CPU cost, and local rotate token-hash cost now pass locally.
- **Architecture:** SHF-01 realtime (D7), SHF-03 durable throttle (D4).
- **UX redesign:** receiver phases A–D ([25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md)), manager phases A–D ([35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md)), gated by [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
- **Deploy:** D8 migration reconciliation + canonical-history promotion ([90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md)).

## Validation gates

| Gate | I-1 | Notes |
|---|---|---|
| Focused Vitest (shared-link suite) | ✅ | **Canonical 23-file suite re-run 2026-06-21 → 23 files / 353 tests passed (exit 0).** Includes shared-link page/manager/API/schema tests plus compact snapshot, perf-helper, header-smoke-helper, and smoke-seed-helper tests; reconciled command + verbatim summary in [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md). |
| `bun run type-check` | ✅ | |
| `git diff --check` | ✅ | |
| Focused ESLint (changed files) | ✅ | |
| Targeted post-review suite | ✅ | Superseded by the canonical 23-file shared-link suite above. |
| Perf helper/evidence | ✅ partial | Helper tests pass and local evidence recorded. PERF-06 10k snapshot bytes = **2.55 MiB PASS** vs 4 MiB; hosted/provider perf gates remain open. |
| Browser / visual QA | ⏸ deferred | → [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) gate (overrides the Codex browser guardrail for client-facing UX). |
| Provider migration apply + readback | ✅ shared-link slice | `20260620064601`, `20260620142000`, `20260621042221`, and `20260621051701` are Local+Remote on `ebxxqidacheyapmmzavr`; label maps complete, row-target mismatches 0/0, target columns/RPC grants verified. App deploy/post-deploy smoke still open in [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md). |
| Full `bun run validate` | ⛔ skipped | Dirty worktree (unrelated files). |

## Codex review-gate (HIGH-BLAST-RADIUS → required before declaring the *implementation* done)

**Status: SATISFIED for the current scoped shared-link code-review gate.** Native `code-reviewer`
subagent `019ee8bd-10a5-7641-81ee-f6a600cc9e63` reviewed 30 scoped shared-link files/docs and reported
0 blocking findings. Artifact: [`evidence/review/codex-review-shared-link-2026-06-21.md`](evidence/review/codex-review-shared-link-2026-06-21.md).
This is not a launch sign-off; ratified decision implementation, deploy smoke, visual QA, and hosted/provider perf remain separate gates.

## Stop conditions (mirror [00](00_INDEX.md))

- [x] Canonical registry exists; all docs bound to it.
- [x] Strategy, decisions, deploy runbook, forward plan, observability, scorecard authored.
- [x] UX redesign blueprints authored (owner mandate).
- [x] Final verification pass confirms no residual cross-doc contradiction (I-2). Evidence: `git diff --check`
  passed; stale-claim scan for old D10 beta-gate drift, the old PERF-01A status contradiction, unverified
  harness/tool placeholders, and old "not 100" wording returned no hits.
- [x] Decisions D1-D11 resolved by owner.
- [x] Codex review-gate satisfied for the current scoped shared-link code diff.
- [ ] [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) Go/No-Go executed before shipping to beta.
