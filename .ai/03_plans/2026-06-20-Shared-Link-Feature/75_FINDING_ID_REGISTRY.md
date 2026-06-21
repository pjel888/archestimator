# 75 — Canonical Finding-ID Registry

Date: 2026-06-21 · Status: **CANONICAL SOURCE OF TRUTH for IDs, severities, and statuses**

This registry exists because the same finding id meant different things in different docs
(SEC-SHARE-05), one row falsely merged two distinct findings (RUX-10 / SHF-01), severities drifted
between the lane audits and the consolidated register (SEC-SHARE-02/03), and three real findings were
silently dropped (SEC-SHARE-05 unsubscribe, SEC-SHARE-06 digest, MANAGER-F-01). **If any
other doc in this pack disagrees with this table, this table wins and that doc is corrected.**

Status legend: **Fixed** (landed + test) · **Partial** (landed but narrower than the finding) ·
**Open** (not done, tracked in [`91_FORWARD_EXECUTION_PLAN.md`](91_FORWARD_EXECUTION_PLAN.md)) ·
**Deferred** (accepted not-now, with rationale) · **Decision** (gated on an owner call in
[`71_OPEN_DECISIONS_REGISTER.md`](71_OPEN_DECISIONS_REGISTER.md)) · **Stale-invalid** (finding does
not reflect committed source; retire/downgrade).

Severity rule: **canonical severity = the originating lane audit's severity.** Where the consolidated
register (70) deliberately re-rated, the canonical cell carries the origin severity and the Notes
column records the re-rate. Verified facts are in
[`_COORDINATION.md` §4](_COORDINATION.md) and the four source verifications in §5 below.

---

## 1. Security / Privacy / API (origin: `10_SECURITY_PRIVACY_API_AUDIT.md`)

| ID | Canonical title | Sev | Status | Notes / cross-refs |
|---|---|:--:|---|---|
| SEC-SHARE-01 | Stale-snapshot write acceptance after content-only republish | P1 | **Fixed** | Route 409 (`comment/route.ts:228-234`, `decision/route.ts:186-192`) + migration `20260620142000` `is distinct from`. **Source-verified.** Conflicts with AC-MOD-01 / `project-publication-cookie-credential-version.test.ts` intent → see **D1**. |
| SEC-SHARE-02 | Session POST: weaker same-origin, no CSRF pair, no rate limit before recipient verify | **P2** | **Fixed** | Origin sev P2; **70 listed P1 (priority elevation)** — reconcile to P2 or annotate the raise. Fixed at `session/route.ts:29` (`assertSameOriginPublicPost`), `:41` (`checkSharedLinkSessionStartRateLimit`). **Source-verified.** |
| SEC-SHARE-03 | Unbounded open/event writes on page + snapshot GET (limiter only on `/events`) | **P2** | **Fixed** | Origin sev P2 ("mostly telemetry cost/noise"); **70 listed P1** — least-justified raise, settle at P2. Fixed in 80 §10. |
| SEC-SHARE-04 | Unsalted SHA-256 IP hashes in public route logs (vs HMAC pepper in DB) | P2 | **Fixed** | `hashPublicTelemetryValue()`; 80 §12. |
| SEC-SHARE-05 | **Unsubscribe POST**: `assertSameOrigin` allows absent Origin, no CSRF, no rate limit | P3 | **Fixed** | **ID was wrongly reused by 70 for the activity leak.** Restored here to its original unsubscribe meaning. D5 hardening is landed: unsubscribe GET is a read-only interstitial, POST uses `assertSameOriginPublicFormPost` + CSRF nonce + durable `shared_link_unsubscribe` rate limit; covered by `share-unsubscribe-interstitial.test.ts` and `project-publication-page.test.tsx`. |
| SEC-SHARE-06 | Owner digest never fires from public recipient routes (auth-required silent skip) | P3 | **Fixed** | `maybeTriggerSharedLinkActivityDigest` no longer requires a current owner auth context for public comment/decision routes; the helper resolves owner/project context through service-role publication state and remains best-effort/rate-limited. Covered by `project-publication-activity.test.tsx`. D9 may still govern broader notification policy. |
| SEC-SHARE-07 | Public snapshot exposes exact `project.location` | P3 | **Fixed** | D2 is landed: `project_publications.location_visibility` (`exact` / `locality` / `hidden`, default `locality`) controls snapshot sanitization; provider readback confirms the column/constraint. |
| SEC-SHARE-08 | Non-atomic revoke+insert in `createProjectPublication` (transient-failure window) | P3 | **Fixed** | `createProjectPublication` now calls service-role RPC `replace_project_publication(...)`, which locks the project row and revokes/inserts the replacement in one DB transaction; provider readback confirms the RPC and the one-published partial unique index. Evidence: [`evidence/provider-readback/d1-d11-atomic-publish-digest-2026-06-21.md`](evidence/provider-readback/d1-d11-atomic-publish-digest-2026-06-21.md). |
| **SEC-SHARE-09** | **Public activity route returned comment bodies** (bypassed recipient-session comment API) | P1 | **Fixed** | **New canonical id** (was mislabeled SEC-SHARE-05 in 70:31). Review-discovered; activity route no longer selects/returns comment bodies; 80 §19–20. |
| **SEC-SHARE-10** | **OpenGraph `description` leaks proposal total + clientName** on no-password links | P3 | **Fixed** | `generateMetadata` now returns generic public/protected metadata without resolving the proposal snapshot, so link-unfurl crawlers do not receive totals or client name. Covered by `project-publication-page.test.tsx` + `security-findings-publication-contracts.test.ts`. D3 remains only for broader in-page public disclosure policy. |

## 2. Receiver UX / UI / Accessibility (origin: `20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md`)

| ID | Canonical title | Sev | Status | Notes |
|---|---|:--:|---|---|
| RUX-01 | Tree leaf rows keyboard-unreachable | P1 | **Fixed** | `ShareEstimateTreePanel.tsx`; a11y test. |
| RUX-02 | Silent fallthrough on recipient-session setup failure | P1 | **Fixed** | `SharePageRecipientSessionInitializer.tsx`. |
| RUX-03 | No branded unavailable-link state | P1 | **Fixed** | `share/[token]/not-found.tsx`. |
| RUX-04 | Hidden all-row print DOM cost during normal browsing | P1 | **Fixed** | Deferred print package on `beforeprint`. |
| RUX-05 | Load-bearing meta copy on `text-tertiary` (AA fail) | P1 | **Fixed** | Moved to `text-secondary`. See memory [[designmd-tertiary-fails-aa]]. |
| RUX-06 | Session-banner controls below 44px / low contrast | P2 | **Fixed** | `SharePageSessionBanner.tsx`. |
| RUX-07 | Mobile rows hide quantity/unit | P2 | **Fixed** | Grid/tree show `Qty … · unit`. |
| RUX-08 | Plain Enter sends comment (accidental submit) | P2 | **Fixed** | Enter = newline; Ctrl/⌘+Enter submits. |
| RUX-09 | Password feedback not ARIA-associated | P2 | **Fixed** | `aria-invalid`/`aria-describedby`. |
| RUX-10 | Receiver page should not expose owner activity feed in V2 | P2 | **Fixed (V2 removal)** | V1 briefly mounted a public-safe feed, but V2 now removes `SharedLinkActivityFeed` from `/share/[token]`; public feedback appears through comments/decision context while owner activity remains manager-side. Covered by `project-publication-page.test.tsx`. Distinct from SHF-01 realtime. |
| RUX-11 | Storybook receiver state matrix fixture-only | P2 | **Fixed** | `Domain/Share/ReceiverStates` real-component story matrix landed with mocked cookie/fetch seams, plus coverage/provider-boundary tests. Browser visual proof remains QA-G10/RUX-14, not RUX-11. |
| RUX-12 | Stale test comments (`text-[10/9/11px]` vs `13px`) + portal type exemption | P3 | **Fixed** | `project-publication-page.test.tsx` now asserts the actual `text-[13px]` estimate-tab class and documents the path-scoped `/share` Client Portal type-scale exemption. |
| RUX-13 | Hard-coded `#FFFDF8` proposal-paper literals | P2 | **Fixed** | Replaced receiver literals with tokenized `bg-proposalPaper`/design-system surfaces; `rg -n "#FFFDF8" src/components/share src/app/share` returns no matches. |
| RUX-14 | Cover-image scrim contrast image-dependent | P3 | **Fixed (source) / visual-proof open** | Removed the image-dependent text/scrim overlay from `SharePageHero`; browser/visual proof remains part of [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md). |
| RUX-15 | One-off orange activity notice classes | P3 | **Fixed** | Uses accent/secondary tokens. |

## 3. Manager Workflow (origin: `30_MANAGER_WORKFLOW_AUDIT.md`)

| ID | Canonical title | Sev | Status | Notes |
|---|---|:--:|---|---|
| MANAGER-F-01 | RBAC role-rejection matrix across every mutation endpoint | P1 | **Fixed** | `project-publication-actions.test.ts` now exercises all 7 publication mutations × 5 actor classes (signed-in no-access, workspace member, project member, project viewer, public/recipient-token visitor) and asserts rejection plus zero writes/RPC/revalidates. Source fix: `actions.ts` includes `member` in `roleRank` so project/workspace members compare below manager rank instead of falling through `NaN`. |
| MANAGER-F-02 | Rotate/revoke duplicate-submit race | P1 | **Fixed** | In-flight latch + rotate double-click test. |
| MANAGER-F-03 | Generic/ inconsistent invalid-link error copy (page vs API) | P2 | **Fixed** | `SHARED_LINK_UNAVAILABLE_COPY` now drives the branded not-found page and share API 404 envelopes; route/page/no-store tests cover the contract. |
| MANAGER-F-04 | No per-recipient partial-send failure surface/retry | P2 | **Fixed** | `RecipientEmailComposer.tsx` now preserves successful sends, marks per-recipient failures, and exposes retry; covered by `recipient-email-composer.test.tsx`. |
| MANAGER-F-05 | Action tests are symbol-presence/smoke, not behavioral | P3 | **Fixed** | `project-publication-actions.test.ts` now exercises republish, rotate, and owner activity-load success/error contracts with mocked Supabase/action dependencies. |
| MANAGER-F-06 | No dashboard quick-actions (copy/rotate/revoke) | P3 | **Fixed** | `PublishedProjectQuickActions` adds copy/preview/manager-only rotate/revoke controls to the dashboard published list; `workshop-reset.test.tsx` covers keyboard tooltip, copy, preview, destructive confirms, server-action calls, `ok:false` errors, manager-only visibility, and refresh-on-success only. |

## 4. Test / QA (origin: `40_TEST_QA_ULTRAQA_MATRIX.md`)

| ID | Canonical title | Sev | Status | Notes |
|---|---|:--:|---|---|
| QA-G01 | "Comment sanitization weak / not asserted to RPC" | ~~P0~~ | **Stale-invalid** | Test already asserts payload at `comments.test.tsx:259-278`. **Source-verified.** Retired; adjacent QA-G09 exact-status tightening is now Fixed. |
| QA-G02 | "Decision note not server-sanitized/truncated" | ~~P0~~ | **Stale-invalid → Fixed** | Already done at `decision/route.ts:145` (`sanitizeSharedLinkRecipientText(note,2000)`). **Source-verified.** Convert to "add regression test" (P2). |
| QA-G03 | Real DOM-escaping render test (beyond static no-`dangerouslySetInnerHTML`) | P1 | **Fixed** | `tests/vitest/share/recipient-content-escaping.test.tsx` renders stored shared-link content through the DOM and proves escaping. |
| QA-G04 | Recipient-session init redirect/cookie integration test | P1 | **Fixed** | `share-recipient-session-initializer.test.tsx` covers POST + CSRF cookie/header + sanitized `window.location.replace` URL. |
| QA-G05 | Comment circuit-breaker route test | P1 | **Fixed** | Route now opens deterministically after repeated 5xx and returns exact 503 + `Retry-After: 120`; covered by `project-publication-comments.test.tsx`. |
| QA-G06 | Durable duplicate-decision DB race (provider-backed) | P1 | **Partial** | Provider/local-Supabase harness exists at `tests/vitest/share/duplicate-decision-race.provider.test.ts`; local Docker/Supabase was unavailable, so real provider proof remains open. |
| QA-G07 | Offline queue flush + tampered-viewToken 409 route tests | P1 | **Fixed** | Tampered comment/decision `viewToken` 409 tests are landed, and the comment offline-queue test now asserts sessionStorage persistence, reconnect flush, queue clearing, posted body/viewToken, and fresh CSRF headers. |
| QA-G08 | Comments-after-decision behavioral test | P1 | **Fixed** | `project-publication-decision.test.tsx` now drives a decision lock and submits a real follow-up comment through `SharePageComments`. |
| QA-G09 | Tighten permissive status arrays | P2 | **Fixed** | Broad status-array assertions in comments/activity/decision tests were replaced with exact status/payload expectations; `rg` for `toContain(res.status)` style arrays is clean. |
| QA-G10 | Live security-header smoke + mobile/print visual proof | P2 | **Partial** | Header smoke/seed helpers landed and production-mode local `SHARE_URL` smoke passed on 2026-06-21 (`evidence/shared-link-smoke/headers-2026-06-21.md`) after adding no-store to `/share` responses. Mobile/print visual proof remains deferred to `85`. |

## 5. Performance (origin: `50_PERFORMANCE_SPEED_AUDIT.md`)

| ID | Canonical title | Sev | Status | Notes |
|---|---|:--:|---|---|
| PERF-01A | Recipient-link needs render + session POST + reload | P2 | **Open** | (70 uses PERF-01A; 50 uses PERF-01 — **canonical = PERF-01A**.) Session analytics now deferred; server-redirect flow gated on **D2/security**. |
| PERF-02 | Synchronous open telemetry on snapshot GET | P1 | **Fixed** | `after()`; prior-plan id **DB08**. |
| PERF-03 | Rate-limit cleanup on every attempt | P1 | **Fixed** | Throttled single-flight. |
| PERF-04 | Activity reads pulled full `snapshot_json` | P2 | **Fixed (code) / measure-open** | `activity_target_labels_json`; provider p95 unmeasured. |
| PERF-05 | App-layer + RPC-layer double validation on comment/decision | P2 | **Open** | One-RPC path only after security review. |
| PERF-06 | Snapshot JSON duplicates row data; O(n) growth | P2 | **Fixed** | Compact snapshot schema v1.3 keeps estimate-level legacy rows and stores tab membership as `rowIds`; legacy v1.2 `tab.rows` remains readable. `evidence/perf-budgets.md` now records 100 rows 29.7 KiB PASS, 1k rows 263.1 KiB PASS, and 10k rows 2.55 MiB PASS vs 4 MiB. Hosted/provider perf evidence remains separate under PERF-01A/04/09/12. |
| PERF-07 | Large inline tree rows | P2 | **Fixed** | Desktop/mobile caps. |
| PERF-07B | Large Grid Preview rows | P2 | **Fixed** | Cap 250 + refine copy. |
| PERF-08 | Serial recipient invite sends | P2 | **Fixed** | Bounded concurrency (4). |
| PERF-09 | Password unlock scrypt + sync writes latency | P3 | **Open (hosted evidence)** | Local CPU-only scrypt verify measured PASS in `evidence/perf-budgets.md` (10k p95 30.46 ms vs 500 ms); route DB writes/backoff still require hosted evidence. Don't weaken hashing. |
| PERF-10 | Comment POST reloaded full list | P3 | **Fixed** | Canonical inserted-row reconcile. |
| PERF-11 | No share loading boundary | P3 | **Fixed** | `share/[token]/loading.tsx`; prior-plan id **RT03**. |
| PERF-12 | Rotate is O(recipient count) | P3 | **Open (provider evidence)** | Local CPU-only token-hash loop measured PASS in `evidence/perf-budgets.md` (100 recipients p95 0.23 ms vs 2 s); provider lock/update cost still requires Supabase evidence. Credential-version model = scale backlog. |
| PERF-13 | Snapshot row thumbnail pulled full `source_snapshot` | P2 | **Fixed** | `source_snapshot->>imageUrl`. (50 folded this into PERF-06; canonical id = PERF-13.) |
| PERF-14 | Full print package mounted on first render | P2 | **Fixed** | Deferred to `beforeprint`. (50 had it as a positive note; canonical id = PERF-14.) |

## 6. Spec / Architecture (origin: `60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md`)

| ID | Canonical title | Sev | Status | Notes |
|---|---|:--:|---|---|
| SHF-01 | Owner activity feed has no realtime/live updates (focus/visibility refresh only) | P2 | **Resolved for beta / GA backlog** | D7 ratifies focus/visibility refresh for beta with honest copy; Supabase Realtime remains GA backlog. |
| SHF-02 | Floating navigation rail not present | P3 | **Resolved** | D6 ratifies the single-column document as canonical V2. Rail is not reinstated unless a future owner decision explicitly calls for it. |
| SHF-03 | In-memory digest/rate-limit throttle not durable across workers | P3 | **Fixed for beta / GA scale backlog** | D4 source/provider hardening is landed for beta: public password attempts already use durable `security_rate_limit_events`, owner digest throttling now reserves a durable slot through `reserve_security_rate_limit_slot(...)`, and delivery attempts are logged in `publication_digest_log`. GA still needs multi-node topology/perf proof, not a source rewrite. |

## 7. Dropped / reassigned / re-rated ledger

| Item | What happened | Disposition |
|---|---|---|
| SEC-SHARE-05 | 70 reused the id for the activity leak | Activity leak → **SEC-SHARE-09**; SEC-SHARE-05 restored to **unsubscribe**, then fixed by D5 hardening |
| SEC-SHARE-06 | Absent from 70 entirely | **Re-added, then Fixed**; D9 remains policy/waiver surface only |
| MANAGER-F-01 | 70 marked "Covered" before the matrix existed | **Now Fixed** by the explicit 7 mutations × 5 actor classes matrix; prior "Covered" over-claim is historical only |
| SEC-SHARE-02 / -03 | 70 raised P2→P1 silently | Canonical **P2**; 70 must annotate any raise |
| RUX-10 / SHF-01 | 70 merged as one "Fixed" row | **Un-merged**: RUX-10 Fixed by V2 removal, SHF-01 beta-resolved by D7 with realtime in GA backlog |
| QA-G01 / QA-G02 | 40 flagged as P0 against stale tree | **Stale-invalid**; QA-G02 already Fixed, both → regression-test P2 |
| PERF-13 / PERF-14 | 50 lacked first-class ids | **Assigned** to match 70 |
| PERF-01 vs PERF-01A | id mismatch 50↔70 | Canonical **PERF-01A** |
| Prior-plan ids | DB08 / RT03 linkage dropped in 70 | Recorded: PERF-02→DB08, PERF-11→RT03 |
| OG description leak | surfaced by [13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) (`page.tsx`) | minted **SEC-SHARE-10** (P3, Fixed; D3 remains broader disclosure policy) |
| D11 (e-signature) | new this pass from [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) | added to decision-gated roll-up + [71](71_OPEN_DECISIONS_REGISTER.md) |

---

## 8. Status roll-up (for `99_QUALITY_SCORECARD_AND_SIGNOFF.md`)

- **Fixed:** SEC-SHARE-01/02/03/04/05/06/07/08/09/10, RUX-01..13/14(source)/15, MANAGER-F-01/02/03/04/05/06, PERF-02/03/04(code)/06/07/07B/08/10/11/13/14, QA-G02/03/04/05/07/08/09, SHF-03(beta).
- **Partial:** QA-G06 (harness added; provider/local-Supabase proof pending).
- **Open (engineering backlog):** QA-G10 visual half, PERF-01A/05/09/12, plus external deploy/live-QA/provider evidence in `90`/`91`.
- **Owner decisions resolved:** D1-D11 (`71` + `.ai/10_state/decisions.md`). **Stale-invalid:** QA-G01.
- **No P1 *source-fix* finding is open.** Remaining P1-class **test-rigor** gap is QA-G06 provider race; SHF-01
  is beta-resolved by D7 focus-refresh ratification with Supabase Realtime kept in GA backlog — so "ready" is conditional, not unqualified (see `99`).
