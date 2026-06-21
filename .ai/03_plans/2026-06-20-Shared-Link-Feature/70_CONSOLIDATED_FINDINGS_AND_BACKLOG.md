# Consolidated Findings And Upgrade Backlog

Date: 2026-06-20 · **As-of remediation: 2026-06-21** · Status: **RECONCILED to canonical registry**

> **Canonical binding.** Every finding id, severity, and status in this doc is bound to
> [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md). Where 75 and this doc previously
> disagreed (severity drift, the SEC-SHARE-05 id collision, the RUX-10/SHF-01 mis-merge,
> MANAGER-F-01 over-claim, dropped SEC-SHARE-06), **75 wins** and the cells below are corrected to
> match. Owner decisions are ratified in [`71_OPEN_DECISIONS_REGISTER.md`](71_OPEN_DECISIONS_REGISTER.md);
> the sequenced backlog with per-item acceptance criteria lives in
> [`91_FORWARD_EXECUTION_PLAN.md`](91_FORWARD_EXECUTION_PLAN.md); deploy/migration order in
> [`90_DEPLOY_AND_MIGRATION_RUNBOOK.md`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
>
> **Doc-10 provenance.** [`10_SECURITY_PRIVACY_API_AUDIT.md`](10_SECURITY_PRIVACY_API_AUDIT.md) is the
> **pre-fix SOURCE audit** from which canonical severities are inherited; **70/75 are the post-remediation
> reconciled registers.** So 10's "PRE-IMPLEMENTATION" banner reflects its capture point and does **not**
> contradict the Fixed statuses below — read 10 for origin severity, read 70/75 for current status.

## Executive Finding

The shared-link feature is substantially implemented, but it had a few sharp readiness gaps across correctness, public API safety, receiver UX, and performance. The most important fixed bug was stale snapshot acceptance: a recipient with an old open page could submit feedback after the manager republished changed proposal content. That is now rejected at the route layer and restored in the database RPC migration contract.

## Fixed In This Iteration

Severity column = **canonical (75)** severity. Where 70 previously re-rated, the `Provenance / notes`
column records the raise. `Provenance` maps each id to its origin-doc id + line so the chain is auditable.

| ID | Sev (75) | Status | Evidence | Provenance / notes |
|---|---:|---|---|---|
| SEC-SHARE-01 | P1 | Fixed | `src/app/api/share/[token]/comment/route.ts:226,234`, `src/app/api/share/[token]/decision/route.ts:186-192`, `supabase/migrations/20260620142000_restore_shared_link_snapshot_equality_lock.sql`, `tests/vitest/project-publication-comments.test.tsx`, `tests/vitest/project-publication-decision.test.tsx`, `tests/vitest/security-findings-publication-contracts.test.ts` | Origin `10` SEC-SHARE-01. Conflicts with AC-MOD-01 intent → **D1** ([71](71_OPEN_DECISIONS_REGISTER.md)). |
| QA-G02 (decision note safety) | P2 | Fixed | `src/lib/share/sanitize-recipient-text.ts`, `src/app/api/share/[token]/decision/route.ts:145`, `tests/vitest/project-publication-decision.test.tsx` | Origin `40`. **Was flagged P0; source-verified already-fixed** (`decision/route.ts:145` `sanitizeSharedLinkRecipientText(note,2000)`). Canonical 75 = **Stale-invalid → Fixed**, residual = add regression test (P2). |
| QA-G01 (comment sanitizer assertion) | P2 | Fixed | `tests/vitest/project-publication-comments.test.tsx:259-278` already asserts sanitized RPC payload exactly | Origin `40`. **Was flagged P0; source-verified Stale-invalid** in 75. Follow-up QA-G09 permissive-status tightening is now Fixed. |
| PERF-02 | P1 | Fixed | `src/app/api/share/[token]/route.ts` uses `after()`; `tests/vitest/project-publication-route.test.ts` | Origin `50` PERF-02; prior-plan id **DB08**. |
| PERF-11 / RT03 | P3 | Fixed | `src/app/share/[token]/loading.tsx`, `tests/vitest/share-no-store-invariants.test.ts` | Origin `50` PERF-11; prior-plan id **RT03**. |
| RUX-01 | P1 | Fixed | `src/components/share/ShareEstimateTreePanel.tsx`, `tests/vitest/share-estimate-tree-panel-a11y.test.tsx` | Origin `20` RUX-01. |
| RUX-02 | P1 | Fixed | `src/components/share/SharePageRecipientSessionInitializer.tsx`, `tests/vitest/share-recipient-session-initializer.test.tsx` | Origin `20` RUX-02. |
| RUX-03 | P1 | Fixed | `src/app/share/[token]/not-found.tsx`, `tests/vitest/share-no-store-invariants.test.ts` | Origin `20` RUX-03. |
| RUX-04 | P1 | Fixed | `src/components/share/SharePageTabs.tsx`, `src/app/share/print.css`, `tests/vitest/project-publication-page.test.tsx` | Origin `20` RUX-04. |
| SEC-SHARE-02 | P2 | Fixed | `src/app/api/share/[token]/session/route.ts:29,41`, `src/components/share/SharePageRecipientSessionInitializer.tsx`, `src/lib/publication/public-repository.ts`, `tests/vitest/project-publication-page.test.tsx`, `tests/vitest/share-recipient-session-initializer.test.tsx` | Origin `10` = **P2**. **70 previously listed P1 (priority elevation); raised on consolidation, reconciled to canonical P2 per 75.** |
| SEC-SHARE-03 | P2 | Fixed | `src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/route.ts`, `src/lib/publication/public-repository.ts`, `tests/vitest/project-publication-page.test.tsx`, `tests/vitest/project-publication-route.test.ts` | Origin `10` = **P2** ("mostly telemetry cost/noise"). **70 previously listed P1; raised on consolidation, reconciled to canonical P2 per 75** (least-justified raise). |
| MANAGER-F-01 | P1 | Fixed | `src/lib/publication/actions.ts` `roleRank` includes `member`; `tests/vitest/project-publication-actions.test.ts` rejects 7 publication mutations × 5 actor classes and asserts zero writes/RPC/revalidates | Origin `30` MANAGER-F-01. Closes the residual RBAC matrix that was previously over-claimed. |
| MANAGER-F-02 | P1 | Fixed | `tests/vitest/project-publication-actions.test.ts`, `tests/vitest/project-publication-header.test.tsx` guard rotate/revoke duplicate-submit (in-flight latch + rotate double-click) | Origin `30` MANAGER-F-02. |
| SEC-SHARE-04 | P2 | Fixed | `src/lib/publication/public-repository.ts`, `src/app/api/share/[token]/comment/route.ts`, `src/app/api/share/[token]/decision/route.ts`, `tests/vitest/security-findings-publication-contracts.test.ts` | Origin `10` SEC-SHARE-04. |
| RUX-08 | P2 | Fixed | `src/components/share/SharePageComments.tsx`, `tests/vitest/project-publication-comments.test.tsx` | Origin `20` RUX-08. |
| RUX-09 | P2 | Fixed | `src/components/share/ProjectPublicationPasswordForm.tsx`, `tests/vitest/project-publication-page.test.tsx` | Origin `20` RUX-09. |
| PERF-03 | P1 | Fixed | `src/lib/publication/public-repository.ts` throttles cleanup; `tests/vitest/project-publication-public-repository.test.ts` | Origin `50` PERF-03. |
| PERF-04 | P2 | Fixed (code) / measure-open | `supabase/migrations/20260620064601_project_publication_activity_target_labels.sql`, `src/lib/publication/activity-helpers.ts`, `src/app/api/share/[token]/activity/route.ts`, `src/lib/publication/actions.ts`, `tests/vitest/project-publication-activity.test.tsx` | Origin `50` PERF-04. **Provider p95 unmeasured** — see [91](91_FORWARD_EXECUTION_PLAN.md). |
| **SEC-SHARE-09** | P1 | Fixed | Public `/api/share/[token]/activity` no longer selects or returns comment bodies (`activity/route.ts:212` projects `author_email\|author_name\|created_at\|estimate_id\|id\|recipient_id\|row_id` only); `tests/vitest/project-publication-activity.test.tsx` guards against comment-text leakage | **Review-discovered. New canonical id (was mislabeled SEC-SHARE-05 in 70:31 — id collision resolved per 75).** 80 §19-20. |
| PERF-07 | P2 | Fixed | `src/components/share/ShareEstimateTreeView.tsx`, `src/components/share/ShareEstimateTreePanel.tsx`, `tests/vitest/share-estimate-tree-view-performance.test.tsx` | Origin `50` PERF-07. |
| PERF-07B | P2 | Fixed | `src/components/share/SharePageTabs.tsx`, `tests/vitest/project-publication-page.test.tsx` cap Grid Preview rows at 250 | Origin `50` PERF-07B. |
| PERF-08 | P2 | Fixed | `src/lib/publication/actions.ts` bounded-concurrency invite pipeline; `tests/vitest/project-publication-rotate-resend.test.ts` | Origin `50` PERF-08 (concurrency = 4). |
| PERF-06 | P2 | Fixed | `src/lib/publication/snapshot.ts` emits compact schema v1.3 tab `rowIds` instead of duplicated tab row objects; `SharePageTabs` resolves v1.3 row IDs and legacy v1.2 `tab.rows`; `tests/vitest/project-publication-snapshot.test.ts`, `tests/vitest/shared-link-perf-budgets-script.test.ts`, `evidence/perf-budgets.md` | Origin `50` PERF-06. Local synthetic tabbed snapshot bytes now pass: 100 rows 29.7 KiB, 1k rows 263.1 KiB, 10k rows 2.55 MiB vs 4 MiB. Hosted/provider perf evidence remains separate. |
| PERF-13 | P2 | Fixed | `src/lib/publication/actions.ts` selects `source_snapshot->>imageUrl`; `tests/vitest/project-publication-actions.test.ts` | Origin `50` (50 folded into PERF-06; **canonical id = PERF-13** per 75). |
| PERF-14 | P2 | Fixed | `SharePageTabs` defers print package to `beforeprint`; `tests/vitest/project-publication-page.test.tsx` covers `beforeprint`/`afterprint` | Origin `50` (50 had as positive note; **canonical id = PERF-14** per 75). |
| PERF-10 | P3 | Fixed | Public comment POST returns canonical inserted comment; `SharePageComments` reconciles optimistic row; `tests/vitest/project-publication-comments.test.tsx` | Origin `50` PERF-10. |
| RUX-05 | P1 | Fixed | Receiver copy moved `text-tertiary` → `text-secondary` across shared-link surfaces incl. `SharedLinkActivityFeed.tsx` | Origin `20` RUX-05. See memory [[designmd-tertiary-fails-aa]]. |
| RUX-06 | P2 | Fixed | `SharePageSessionBanner.tsx` 44px hit areas; `tests/vitest/project-publication-page.test.tsx` | Origin `20` RUX-06. |
| RUX-07 | P2 | Fixed | Mobile grid/tree rows show qty+unit; `tests/vitest/project-publication-page.test.tsx`, `tests/vitest/share-estimate-tree-panel-a11y.test.tsx` | Origin `20` RUX-07. |
| **RUX-10** | P2 | Fixed | Receiver page no longer mounts the owner/public activity feed; `tests/vitest/project-publication-page.test.tsx` verifies no `activity-feed` and no `/api/share/[token]/activity` fetch from `/share`. | Origin `20` RUX-10, superseding the V1 public-feed fix. **Un-merged from the false "RUX-10 / SHF-01" row per 75 §7. Distinct from SHF-01 (owner realtime) — see backlog below.** |
| RUX-15 | P3 | Fixed | `SharedLinkActivityFeed.tsx` uses accent/secondary tokens instead of one-off orange | Origin `20` RUX-15. |
| MANAGER-F-03 | P2 | Fixed | `src/lib/publication/share-copy.ts`, public share API 404 envelopes, `src/app/share/[token]/not-found.tsx`, `tests/vitest/project-publication-route.test.ts`, `tests/vitest/share-no-store-invariants.test.ts` | Origin `30` MANAGER-F-03. Unified unavailable-link copy across branded page and API recovery envelope. |
| MANAGER-F-05 | P3 | Fixed | `tests/vitest/project-publication-actions.test.ts` behavioral harness for republish/rotate/loadSharedLinkActivity success and error branches | Origin `30` MANAGER-F-05. Replaced smoke-only coverage with observable return/write/RPC/revalidation contracts. |
| MANAGER-F-06 | P3 | Fixed | `src/components/workshop/dashboard/PublishedProjectQuickActions.tsx`, `src/components/workshop/dashboard/WorkshopDashboard.tsx`, `tests/vitest/workshop-reset.test.tsx` | Origin `30` MANAGER-F-06. Dashboard published rows now expose copy/preview/rotate/revoke quick actions with tooltip semantics, destructive confirms, existing server actions, and refresh after mutation. |

### Un-merged from the Fixed table (not fixed)

| ID | Sev (75) | Status | Why it left the Fixed table |
|---|---:|---|---|
| SHF-01 | P2 | **Open / Decision (D7)** | 70 previously merged it into the RUX-10 "Fixed" row. **Source-verified:** `SharedLinkActivityFeed.tsx:81-95,175` refresh on focus/visibility only — **no WebSocket/polling/SSE/Supabase-realtime**. Owner choice: implement realtime **or** ratify focus-refresh as intended V2 behavior → **D7** ([71](71_OPEN_DECISIONS_REGISTER.md)). Tracked in [91](91_FORWARD_EXECUTION_PLAN.md). |

## Remaining P1 Backlog

**No P1 *source-fix* finding from this audit pass is open** — every shipped-code P1 (SEC-SHARE-01,
PERF-02/03, RUX-01..05) is Fixed with regression coverage. This is **not** an unqualified "no P1
remaining" claim:

- **P1-class test-rigor gap QA-G06** remains Open: durable duplicate-decision DB race. QA-G03, QA-G04,
  QA-G05, QA-G07, and QA-G08 are Fixed with targeted tests, and QA-G09 is also Fixed as a P2
  test-maintenance item.
- **SHF-01 (realtime)** is Open/Decision-gated (**D7**) and is P1-class if the owner chooses to ship realtime.

So "ready" is **conditional, not unqualified** — see [99](99_QUALITY_SCORECARD_AND_SIGNOFF.md) for the launch verdict.

## Remaining P2 Backlog

Each row carries an exact target, a runnable verification command, an owner-lane, and a binary gate.
The sequenced DAG and full acceptance criteria are in [91](91_FORWARD_EXECUTION_PLAN.md) (this table is
the cross-lane index, 91 is the spine).

| ID | Finding | Target / verification | Owner-lane | Pass/fail gate |
|---|---|---|---|---|
| PERF-05 | App-layer + RPC-layer double validation on comment/decision. | One-RPC path **only after security review**. Verify: `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx --maxWorkers=1`. Acceptance in [91](91_FORWARD_EXECUTION_PLAN.md). | Backend + Security | **PASS** = single secure RPC round-trip with all current 409/sanitize assertions still green; **FAIL** = any regression or unreviewed RPC widening. |
| PERF-01A | Recipient personalization still needs render + session POST + reload (analytics no longer blocks). | Server route/redirect session flow **gated on D2/token-leakage review**. Verify: `bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1` + `bun scripts/measure-shared-link-perf-budgets.ts --mode recipient-session-tti --samples 20 --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-budgets.md`. | Backend + Security | **PASS** = server-set cookie redirect with no token in a logged/leakable surface and p95 recorded; **FAIL** = token exposure, session regression, or missing perf evidence. Gated on **D2** ([71](71_OPEN_DECISIONS_REGISTER.md)). |

> Remaining P2/P3 items not listed here (RUX-14 visual proof, PERF-09/12) are tracked under
> their canonical id and severity in [75](75_FINDING_ID_REGISTRY.md) and sequenced in [91](91_FORWARD_EXECUTION_PLAN.md).

## Re-added / Open security findings (were dropped or mis-collided)

These were silently dropped or collided in the earlier consolidation; re-added here per [75](75_FINDING_ID_REGISTRY.md) §7.

| ID | Sev (75) | Status | Finding | Target / verification | Gate |
|---|---:|---|---|---|---|
| SEC-SHARE-05 | P3 | **Open — Deferred** | **Unsubscribe POST** (`src/app/api/share/[token]/unsubscribe/route.ts:70` uses `assertSameOrigin`, which **allows absent Origin**, no CSRF pair, no rate limit). The id was wrongly reused by 70 for the activity leak; **restored to its unsubscribe meaning**. Impact: email-suppression only, for a known token. | Add CSRF/rate-limit or accept the risk. Verify: `bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1` once a guard test exists. → **D5** family ([71](71_OPEN_DECISIONS_REGISTER.md)). | **PASS** = owner ratifies deferral **or** guard lands with a test; **FAIL** = neither. Deferred (low impact) → [91](91_FORWARD_EXECUTION_PLAN.md). |
| SEC-SHARE-06 | P3 | **Fixed** | **Owner digest now fires from public recipient routes.** The prior `digest-auth-required` silent skip has been removed from the public route path; the helper resolves publication/owner context through service-role state and remains rate-limited. Functional notification gap is closed locally; D9 remains beta notification/delivery acceptance. | Evidence: `tests/vitest/project-publication-activity.test.tsx` digest public-route case; keep observability evidence in [92](92_OBSERVABILITY_AND_ALERTING.md). | **PASS** = digest fires with no current-user auth and no recipient PII leak. |

## Deployment Constraints

Replaced with a gated, numbered checklist. **The authoritative deploy order, drift reconciliation, and
Go/No-Go gate live in [90_DEPLOY_AND_MIGRATION_RUNBOOK.md](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).** This is the
pointer + the two constraints that gate it:

1. **Migration-before-code dependency (committed, in canonical history).** `activity_target_labels_json`
   must be applied before code that selects/writes it. Old code is safe (non-null default), but the
   PERF-04 code path requires `supabase/migrations/20260620064601_project_publication_activity_target_labels.sql`
   first. Both 2026-06-20 migrations are committed to `supabase/migrations/`. → gate #1 in [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
2. **Pending-review ledger drift — reconcile, do NOT re-apply.** Per
   `supabase/migrations-pending-review/README.md`, a reviewed subset was **provider-applied 2026-06-19**
   to project `ebxxqidacheyapmmzavr` (`AC-MOD-04`, `AC-MOD-06`, T4 `P1/P3/P4/P5/P6/P7`). The local↔remote
   `schema_migrations` ledger is drifted; reconcile with `supabase migration repair --status applied <version>`
   (ledger-only), **not** re-apply. **Only `AC-MOD-T4-P2` (drop redundant token-hash indexes) is genuinely
   open** — it was **not** applied because the zero-scan preflight failed
   (`project_publications_token_hash_idx.idx_scan = 215`); leave P2 gated until both target indexes show zero
   scans. → gate #2 in [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).

## Database Hardening Backlog

All hardening items are **either already provider-applied (pending ledger reconciliation) or gated**; the
canonical per-file status, preflight, and rollback are owned by
[90_DEPLOY_AND_MIGRATION_RUNBOOK.md](90_DEPLOY_AND_MIGRATION_RUNBOOK.md). This table is the index.

| File | State (per pending-review README) | Action | Gate / owner-lane |
|---|---|---|---|
| `AC-MOD-04_shared_link_responses_recipient_set_null.sql` | Provider-applied 2026-06-19 | Reconcile ledger only (`migration repair --status applied`) | DBA — see [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §reconcile |
| `AC-MOD-06_one_published_publication_per_project.sql` | Provider-applied 2026-06-19 | Reconcile ledger only; verify partial unique index present | DBA — [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) |
| `AC-MOD-T4-P1_shared_link_telemetry_retention.sql` | Provider-applied 2026-06-19 | Reconcile ledger only | DBA — [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) |
| `AC-MOD-T4-P3_project_publication_events_manager_rls.sql` | Provider-applied 2026-06-19 | Reconcile ledger if already-live; otherwise keep as a recorded **D10 post-launch defense-in-depth** deferral for beta | DBA + Security — **D10** ([71](71_OPEN_DECISIONS_REGISTER.md)) |
| `AC-MOD-T4-P4_shared_link_comments_public_feed_index.sql` | Provider-applied 2026-06-19 | Reconcile ledger only | DBA — [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) |
| `AC-MOD-T4-P5_fk_covering_indexes.sql` | Provider-applied 2026-06-19 | Reconcile ledger only | DBA — [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) |
| `AC-MOD-T4-P6_snapshot_size_guardrail.sql` | Provider-applied 2026-06-19 | Reconcile ledger only | DBA — [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) |
| `AC-MOD-T4-P7_security_rate_limit_gc.sql` | Provider-applied 2026-06-19 | Reconcile ledger only | DBA — [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) |
| `AC-MOD-T4-P2_drop_redundant_token_hash_indexes.sql` | **NOT applied — zero-scan preflight failed** | **Genuinely open.** Re-run zero-scan preflight in a window; apply only when both target indexes show `idx_scan = 0`. | DBA — gate in [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md). → **D8**. |

> Reconciliation strategy (provider-applied vs local ledger) is owner decision **D8** ([71](71_OPEN_DECISIONS_REGISTER.md)).

## Product Decisions Needed

Consolidated into the owner register. **See [71_OPEN_DECISIONS_REGISTER.md](71_OPEN_DECISIONS_REGISTER.md)** for
D1-D11 with production-grade verdicts and implementation gates. The ones surfaced by this consolidation:

- **D1** content-only republish forces recipient reload? (SEC-SHARE-01 current behavior = yes, for correctness)
- **D2/D3** expose exact `project.location` / `clientName` / public IDs to recipients? (currently exposed)
- **D4** in-memory vs durable digest/rate-limit throttle for beta? (SHF-03)
- **D8** how to reconcile provider-applied-but-local-pending migrations without re-applying present objects?
- **D9** fix SEC-SHARE-06 digest now vs beta backlog? · **D10** manager-read RLS (`AC-MOD-T4-P3`) as post-launch defense-in-depth vs apply-now?

## Scope cut for beta (in-scope-now / deferred / out-of-scope)

| Bucket | Items |
|---|---|
| **In scope now (beta blockers)** | All Fixed-table items (already landed) · remaining QA-G06 provider-backed test-rigor · QA-G10 live/visual proof · migration ledger reconcile + `AC-MOD-T4-P2` gate · the D-decisions that gate behavior (D1-D5, D8-D9). |
| **Deferred (beta-acceptable, post-beta backlog)** | SEC-SHARE-05 (unsubscribe CSRF, low impact only if D5 accepts) · RUX-14 visual proof · PERF-05/09/12 · QA-G10 · D10 manager-read RLS if recorded as post-launch defense-in-depth. |
| **Out of scope (V2 / decision-deferred)** | SHF-01 realtime (unless D7 chooses ship) · SHF-02 floating-nav rail (intentional single-column, D6). |

**Beta-readiness Definition of Done** lives in [99_QUALITY_SCORECARD_AND_SIGNOFF.md](99_QUALITY_SCORECARD_AND_SIGNOFF.md)
(per-lane scorecard + residual-risk + launch verdict) and the product gate in
[05_PRODUCT_STRATEGY_BRIEF.md](05_PRODUCT_STRATEGY_BRIEF.md) (beta→GA gate). This doc's binary stop condition:
**all In-scope-now items Fixed/decided + every Open item carries a canonical id, owner-lane, and gate in [91](91_FORWARD_EXECUTION_PLAN.md).**
