# 75 — Canonical Finding-ID Registry

Date: 2026-06-21 · Status: **CANONICAL SOURCE OF TRUTH for IDs, severities, and statuses**

This registry exists because the same finding id meant different things in different docs
(SEC-SHARE-05), one row falsely merged two distinct findings (RUX-10 / SHF-01), severities drifted
between the lane audits and the consolidated register (SEC-SHARE-02/03), and three real findings were
silently dropped (SEC-SHARE-05 unsubscribe, SEC-SHARE-06 digest, MANAGER-F-01 residual). **If any
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
| SEC-SHARE-05 | **Unsubscribe POST**: `assertSameOrigin` allows absent Origin, no CSRF, no rate limit | P3 | **Open — Deferred** | **ID was wrongly reused by 70 for the activity leak.** Restored here to its original unsubscribe meaning. Impact: email-suppression only for a known token. Deferred (low impact); tracked in 91. `unsubscribe/route.ts` untouched in 80. → also **D5** family. |
| SEC-SHARE-06 | Owner digest never fires from public recipient routes (auth-required silent skip) | P3 | **Open** | Dropped from 70. `maybeTriggerSharedLinkActivityDigest` requires `requireCurrentUserContext()` → `digest-auth-required`, swallowed. Functional notification gap; also flagged by MANAGER (30 §4). Fix = service-role helper. → **D9**. |
| SEC-SHARE-07 | Public snapshot exposes exact `project.location` | P3 | **Decision** | Currently exposed (`SharePageProposalHeader.tsx:11`). → **D2** + DPIA `13`. |
| SEC-SHARE-08 | Non-atomic revoke+insert in `createProjectPublication` (transient-failure window) | P3 | **Open** | Pending-review `AC-MOD-06_one_published_publication_per_project.sql`. → **D8**/`90`. |
| **SEC-SHARE-09** | **Public activity route returned comment bodies** (bypassed recipient-session comment API) | P1 | **Fixed** | **New canonical id** (was mislabeled SEC-SHARE-05 in 70:31). Review-discovered; activity route no longer selects/returns comment bodies; 80 §19–20. |
| **SEC-SHARE-10** | **OpenGraph `description` leaks proposal total + clientName** on no-password links | P3 | **Decision** | **New canonical id** (surfaced by [13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md)). `page.tsx:314` emits total+clientName to link-unfurl crawlers; password links return a safe stub (`:283-302`). Suppress/genericize OG description → **D3**; AC-PRIV-01 in [13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md). |

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
| RUX-10 | Receiver page does not mount the activity feed | P2 | **Fixed** | Feed now mounted via `/api/share/[token]/activity`. **Distinct from SHF-01 (realtime).** 20 §2 step-7 narrative is stale (says "does not mount") → fix. |
| RUX-11 | Storybook receiver state matrix fixture-only | P2 | **Open** | No story imports real routes/session/comments/password. Spec'd in `85`. |
| RUX-12 | Stale test comments (`text-[10/9/11px]` vs `13px`) + portal type exemption | P3 | **Open** | `project-publication-page.test.tsx:476-479`. Docs-only. |
| RUX-13 | Hard-coded `#FFFDF8` proposal-paper literals | P2 | **Open** | **8 occurrences / 4 files** (not 5/2): `SharePageDecision.tsx:138/242/261/317`, `ShareEstimateTreePanel.tsx:256`, `not-found.tsx:5`, `loading.tsx:9/47`. Fix = `bg-proposalPaper` utility + lint guard. |
| RUX-14 | Cover-image scrim contrast image-dependent | P3 | **Open** | `SharePageHero.tsx:42-43` `from-black/35` + `text-white/90`. Needs AA acceptance (see `85`). |
| RUX-15 | One-off orange activity notice classes | P3 | **Fixed** | Uses accent/secondary tokens. |

## 3. Manager Workflow (origin: `30_MANAGER_WORKFLOW_AUDIT.md`)

| ID | Canonical title | Sev | Status | Notes |
|---|---|:--:|---|---|
| MANAGER-F-01 | RBAC role-rejection matrix across every mutation endpoint | P1 | **Partial** | 80 §11 landed assertion-ordering + rotate double-click only. **Full owner/member/viewer/recipient × every-mutation matrix still Open.** 70 "Covered" → "Partial". |
| MANAGER-F-02 | Rotate/revoke duplicate-submit race | P1 | **Fixed** | In-flight latch + rotate double-click test. |
| MANAGER-F-03 | Generic/ inconsistent invalid-link error copy (page vs API) | P2 | **Open** | Table row malformed in 30 → repair + acceptance criteria. |
| MANAGER-F-04 | No per-recipient partial-send failure surface/retry | P2 | **Open** | `RecipientEmailComposer.tsx:163-207`; UX spec in `35`. |
| MANAGER-F-05 | Action tests are symbol-presence/smoke, not behavioral | P3 | **Open** | Behavioral contracts for republish/rotate/loadActivity. |
| MANAGER-F-06 | No dashboard quick-actions (copy/rotate/revoke) | P3 | **Open** | UX spec in `35`. |

## 4. Test / QA (origin: `40_TEST_QA_ULTRAQA_MATRIX.md`)

| ID | Canonical title | Sev | Status | Notes |
|---|---|:--:|---|---|
| QA-G01 | "Comment sanitization weak / not asserted to RPC" | ~~P0~~ | **Stale-invalid** | Test already asserts payload at `comments.test.tsx:259-278`. **Source-verified.** Retire; keep only the adjacent permissive-RPC tightening (QA-G09, P2). |
| QA-G02 | "Decision note not server-sanitized/truncated" | ~~P0~~ | **Stale-invalid → Fixed** | Already done at `decision/route.ts:145` (`sanitizeSharedLinkRecipientText(note,2000)`). **Source-verified.** Convert to "add regression test" (P2). |
| QA-G03 | Real DOM-escaping render test (beyond static no-`dangerouslySetInnerHTML`) | P1 | **Open** | New `recipient-content-escaping.test.tsx`. |
| QA-G04 | Recipient-session init redirect/cookie integration test | P1 | **Open** | Initializer POST + Set-Cookie + `replace` + sanitized URL. |
| QA-G05 | Comment circuit-breaker route test | P1 | **Open** | >50% 5xx → 503 `Retry-After:120`. |
| QA-G06 | Durable duplicate-decision DB race (provider-backed) | P1 | **Open** | Mocked only; needs provider/local-Supabase harness. |
| QA-G07 | Offline queue flush + tampered-viewToken 409 route tests | P1 | **Open** | `comment/decision` POST `viewToken:"tampered"` → 409. |
| QA-G08 | Comments-after-decision behavioral test | P1 | **Open** | Asserted by copy only today. |
| QA-G09 | Tighten permissive status arrays | P2 | **Open** | `comments:~287`, `activity:451-460,604-610` accept broad `[200,201,…,503]`. |
| QA-G10 | Live security-header smoke + mobile/print visual proof | P2 | **Open** | Deferred to `85` visual-QA + a header smoke command. |

## 5. Performance (origin: `50_PERFORMANCE_SPEED_AUDIT.md`)

| ID | Canonical title | Sev | Status | Notes |
|---|---|:--:|---|---|
| PERF-01A | Recipient-link needs render + session POST + reload | P2 | **Open** | (70 uses PERF-01A; 50 uses PERF-01 — **canonical = PERF-01A**.) Session analytics now deferred; server-redirect flow gated on **D2/security**. |
| PERF-02 | Synchronous open telemetry on snapshot GET | P1 | **Fixed** | `after()`; prior-plan id **DB08**. |
| PERF-03 | Rate-limit cleanup on every attempt | P1 | **Fixed** | Throttled single-flight. |
| PERF-04 | Activity reads pulled full `snapshot_json` | P2 | **Fixed (code) / measure-open** | `activity_target_labels_json`; provider p95 unmeasured. |
| PERF-05 | App-layer + RPC-layer double validation on comment/decision | P2 | **Open** | One-RPC path only after security review. |
| PERF-06 | Snapshot JSON duplicates row data; O(n) growth | P2 | **Open (measure first)** | Byte-size budget needed. |
| PERF-07 | Large inline tree rows | P2 | **Fixed** | Desktop/mobile caps. |
| PERF-07B | Large Grid Preview rows | P2 | **Fixed** | Cap 250 + refine copy. |
| PERF-08 | Serial recipient invite sends | P2 | **Fixed** | Bounded concurrency (4). |
| PERF-09 | Password unlock scrypt + sync writes latency | P3 | **Open (measure)** | Don't weaken hashing. |
| PERF-10 | Comment POST reloaded full list | P3 | **Fixed** | Canonical inserted-row reconcile. |
| PERF-11 | No share loading boundary | P3 | **Fixed** | `share/[token]/loading.tsx`; prior-plan id **RT03**. |
| PERF-12 | Rotate is O(recipient count) | P3 | **Open (measure)** | Credential-version model = scale backlog. |
| PERF-13 | Snapshot row thumbnail pulled full `source_snapshot` | P2 | **Fixed** | `source_snapshot->>imageUrl`. (50 folded this into PERF-06; canonical id = PERF-13.) |
| PERF-14 | Full print package mounted on first render | P2 | **Fixed** | Deferred to `beforeprint`. (50 had it as a positive note; canonical id = PERF-14.) |

## 6. Spec / Architecture (origin: `60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md`)

| ID | Canonical title | Sev | Status | Notes |
|---|---|:--:|---|---|
| SHF-01 | Owner activity feed has no realtime/live updates (focus/visibility refresh only) | P2 | **Open / Decision** | **NOT closed by RUX-10.** **Source-verified** no realtime in `SharedLinkActivityFeed.tsx`. → **D7** (implement realtime vs ratify focus-refresh). |
| SHF-02 | Floating navigation rail not present | P3 | **Decision (deferral, not debt)** | Intentionally collapsed to single column (`ShareContainer.tsx:8`; decisions.md 2026-05-29). Re-frame; not a missing file. → **D6**. |
| SHF-03 | In-memory digest/rate-limit throttle not durable across workers | P3 | **Decision** | Acceptable single-node beta only. → **D4**. |

## 7. Dropped / reassigned / re-rated ledger

| Item | What happened | Disposition |
|---|---|---|
| SEC-SHARE-05 | 70 reused the id for the activity leak | Activity leak → **SEC-SHARE-09**; SEC-SHARE-05 restored to **unsubscribe**, status Open-Deferred |
| SEC-SHARE-06 | Absent from 70 entirely | **Re-added** as Open; → D9 |
| MANAGER-F-01 | 70 marked "Covered" | **Downgraded to Partial**; residual matrix Open |
| SEC-SHARE-02 / -03 | 70 raised P2→P1 silently | Canonical **P2**; 70 must annotate any raise |
| RUX-10 / SHF-01 | 70 merged as one "Fixed" row | **Un-merged**: RUX-10 Fixed, SHF-01 Open |
| QA-G01 / QA-G02 | 40 flagged as P0 against stale tree | **Stale-invalid**; QA-G02 already Fixed, both → regression-test P2 |
| PERF-13 / PERF-14 | 50 lacked first-class ids | **Assigned** to match 70 |
| PERF-01 vs PERF-01A | id mismatch 50↔70 | Canonical **PERF-01A** |
| Prior-plan ids | DB08 / RT03 linkage dropped in 70 | Recorded: PERF-02→DB08, PERF-11→RT03 |
| OG description leak | surfaced by [13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) (`page.tsx:314`) | minted **SEC-SHARE-10** (P3, Decision→D3) |
| D11 (e-signature) | new this pass from [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) | added to decision-gated roll-up + [71](71_OPEN_DECISIONS_REGISTER.md) |

---

## 8. Status roll-up (for `99_QUALITY_SCORECARD_AND_SIGNOFF.md`)

- **Fixed:** SEC-SHARE-01/02/03/04/09, RUX-01..10/15, MANAGER-F-02, PERF-02/03/04(code)/07/07B/08/10/11/13/14. QA-G02 (already done).
- **Partial:** MANAGER-F-01.
- **Open (engineering backlog):** SEC-SHARE-05/06/08, RUX-11/12/13/14, MANAGER-F-03/04/05/06, QA-G03..G10, PERF-01A/05/06/09/12, SHF-01(if realtime chosen).
- **Decision-gated:** D1–D11 (`71`). **Stale-invalid:** QA-G01.
- **No P1 *source-fix* finding is open.** P1-class **test-rigor** gaps (QA-G03..G08) and the SHF-01
  realtime question remain — so "ready" is conditional, not unqualified (see `99`).
