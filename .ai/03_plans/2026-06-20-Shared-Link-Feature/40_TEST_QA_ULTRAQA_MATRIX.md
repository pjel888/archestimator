# Shared Link / Publication Test QA + UltraQA Matrix

Date: 2026-06-20 · **Remediated: 2026-06-21**
**Status:** REMEDIATED & reconciled against committed source. Finding IDs/severities/statuses are
bound to [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md) §4 (canonical). Historical anchor
pass was verified against commit **`1feb85a5`**; current-head verification on 2026-06-21 ran the
canonical 23-file shared-link suite + type-check and supersedes the older 16-file baseline.

> **As-of banner (2026-06-21).** This pass corrects the original read-only audit against committed
> source. **Two flagship P0s were FALSE/stale** and have been retired: (1) "decision note not
> server-sanitized" — it **is** sanitized at `decision/route.ts:145` via
> `sanitizeSharedLinkRecipientText(note, 2000)`; (2) "weak comment sanitizer" — the strong assertion
> already exists at `project-publication-comments.test.tsx:260-278`. The genuinely-loose *permissive
> status* critique is re-pointed at the real offenders (comment RPC test `:287`, activity
> current anchors `:484`, `:491`, `:657`) and re-rated **P2 (QA-G09)**. Follow-up implementation
> then fixed QA-G03, QA-G04, QA-G07, QA-G08, and QA-G09 with targeted tests. Remaining local QA gaps are
> QA-G06 and QA-G10. Per [`75`](75_FINDING_ID_REGISTRY.md): **QA-G01 = Stale-invalid**,
> **QA-G02 = already-Fixed** (regression test only, P2). **There is no open P0 in this matrix.**
> The original date stands as the audit date.

Original scope: read-only audit of shared-link/publication tests and anchors. No tests, source,
commits, staging, browser automation, or long validation were run **in the original pass**. The
2026-06-21 remediation re-verified the original line anchors against committed source at `1feb85a5`
(decision/comment routes, comments/activity test files). The current-head verification confirmed the
23-file / 353-test baseline and re-anchored QA-G09 broad-status assertions to the current test tree.
The later targeted pass added/fixed QA-G03, QA-G04, QA-G07, QA-G08, QA-G09, and QA-G10 helper evidence.
Re-anchor all line numbers before implementing.

## 1. Existing Test Inventory

> **Evidence-grade note (2026-06-21).** Rows whose Evidence cell reads "**name-level evidence
> (assertions not read)**" were inventoried from `rg` test-*name* output only — the assertion bodies
> were **not** read in this audit. Such rows establish that a test *exists by name*; they do **not**
> by themselves prove a requirement is fully covered. In §2 (Traceability), requirements resting only
> on name-level evidence are marked **"Name-level only"** rather than fully "Covered". Rows where the
> assertion body was read (e.g. `comments:260-278`, `decision`, `activity`, `route`, `page`,
> `snapshot`, `reconstruct-share-tree`, the static guards) carry line-pinned assertion evidence
> verified against `1feb85a5`.

| File | Behaviors covered | Evidence |
| --- | --- | --- |
| `tests/vitest/project-publication-snapshot.test.ts` | Snapshot DTO strips internal supplier/library/rate metadata, computes totals, emits compact v1.3 estimate-tab row IDs while preserving legacy v1.2 tab-row reads, excludes inactive tab rows/nodes, normalizes safe image URLs. | Client-safe DTO and redaction assertions at lines 5-74; legacy rate stripping at 76-135; v1.3 tabs at 181-255; inactive tab exclusion at 257-321; legacy v1.2 sanitizer at 327+. |
| `tests/vitest/project-publication-page.test.tsx` | Public receiver page renders outside Workshop shell, loads print CSS, defers recipient token mutation to route handler, avoids raw token rendering in session cookies, supports Not-you recovery, gates passworded snapshots. | Render/shell assertions at lines 135-168; print CSS at 170-180; route-bound recipient session at 182-201; session cookie creation without raw token at 256-285; password gate at 339-357. |
| `tests/vitest/project-publication-route.test.ts` | Main `/api/share/[token]`, `/events`, and `/password` route contracts: token-scoped read, no-store, snapshot read rate limit, 404, password cookie gate, CSRF event writes, password attempt audit. | Snapshot route at lines 120-140; snapshot rate limit at 142-156; password gate at 168-206; event CSRF/rate/cross-origin at 208-273; password verify/audit at 275-379. |
| `tests/vitest/project-publication-comments.test.tsx` | Comment POST: CSRF, recipient-session guard, durable rate limit, stale credential rejection, malformed UUID rejection, **server-side HTML/script sanitization + ≤1000 truncation asserted against the inserted RPC payload**, rendered-view snapshot locking, generic 500 envelope, basic component CSRF/optimistic path. | Route guard/rate tests at lines 81-146; stale credential at 148-190; UUID validation at 192-247; **strong sanitization assertion at 260-278 (asserts `inserted.body` excludes `<script`/`<img`/`<b>`/`onerror`, includes `bold`, length === 1000) — verified against `1feb85a5`**; rendered-view snapshot at 270-298; generic 500 at 300-328. The adjacent status assertion was tightened by QA-G09 follow-up work. |
| `tests/vitest/project-publication-decision.test.tsx` | Decision POST: CSRF, recipient-session guard, duplicate 409, stale credential rejection, valid payload, rendered-view snapshot locking, durable rate limit, generic 500 envelope, anonymous/read-only UI and reload lock. | Route contract at lines 83-285; anonymous UI and buttons at 301-320; prior decision reload at 321-340. |
| `tests/vitest/project-publication-activity.test.tsx` | Activity route: same-origin GET, cross-origin block, internal-comment filtering, password gate, no recipient decisions/events without session, durable rate limit, client-safe serialized payload, opaque cursor pagination. | Activity GET cases cover this surface; QA-G09 tightened the prior broad-status anchors. Client-safe field assertions remain at `:518-555`; cursor pagination at `:558-602`. |
| `tests/vitest/share/share-page-get-routes-contract.test.ts` | Additive GET for public comment history and recipient decision state: session required, password gate preserved, read-rate limits, no-store-ish cache headers. | Comment GET cases at lines 92-181; decision GET at 184-221. |
| `tests/vitest/share/reconstruct-share-tree.test.ts` | Share tree reconstruction from row designations and snapshot tree nodes: totals, sorting, empty inputs, hostile long designations/labels, XSS literal string handling, large-sheet DoS fallback, exact hierarchy preservation. | Designation fidelity at lines 43-134; DoS fallback at 136-173; XSS literal strings at 176-188; snapshot tree nodes at 234-330. |
| `tests/vitest/share/no-dangerous-html.test.ts` | Static guard that comment, decision, and activity components do not opt into `dangerouslySetInnerHTML`. | Source guard scope and assertion at lines 5-34. |
| `tests/vitest/share-no-store-invariants.test.ts` | Static guard that all tokenized share API routes are force-dynamic/no-store and share page avoids revalidate/unstable_cache. | Route list and assertions at lines 4-32. |
| `tests/vitest/share-unsubscribe-interstitial.test.ts` | Unsubscribe is read-only on GET; POST mutates only on same-origin; missing token and cross-origin POST fail closed. | Name-level evidence (assertions not read): test-name lines 24-59 in `rg` output. Source backs read-only GET and same-origin POST at `src/app/api/share/[token]/unsubscribe/route.ts:47-93`. |
| `tests/vitest/publication-client-csrf.test.ts` | Client CSRF token/cookie generation uniqueness and crypto-backed randomness. | Name-level evidence (assertions not read): test-name lines 5-34 in `rg` output. Source POST verifier requires origin plus matching cookie/header at `src/lib/publication/security.ts:358-371`. |
| `tests/vitest/project-publication-security.test.ts` | Token/password crypto helpers, same-origin/CSRF, signed access cookies, password normalization/min length, in-memory lockout/progressive delay, CSP/security-header static checks. | Name-level evidence (assertions not read): test-name lines 27-253 in `rg` output. Source lockout store is in-memory and per IP+token at `src/lib/publication/security.ts:512-588`. |
| `tests/vitest/project-publication-cookie-credential-version.test.ts` | Access/session cookies bind to credential version, not snapshot version; content-only republish keeps session; credential changes invalidate; tamper/expiry/mismatched recipient rejected. | Name-level evidence (assertions not read): test-name lines 32-251 in `rg` output; source credential/session verification at `src/lib/publication/security.ts:174-181` and `445-460`. |
| `tests/vitest/project-publication-header.test.tsx` | Manager modal/header flows: create/update/revoke/rotate/expired link, password state, selected estimate validation, stale snapshot warning, recipient management, activity dot, tab a11y, optimistic reconciliation. | Broad test inventory at lines 60-1620 in `rg` output. |
| `tests/vitest/project-publication-rotate-resend.test.ts` | Rotate/resend/expires/password-min/action semantics; concurrent rotation conflict; resend sends before persisting; self-recipient rejection. | Name-level evidence (assertions not read): test-name lines 140-829 in `rg` output. |
| `tests/vitest/project-publication-resolved-ids.test.ts` | Create/republish persists only estimate IDs that resolved into the snapshot and rejects zero-estimate snapshots. | Name-level evidence (assertions not read): test-name lines 197-284 in `rg` output. |
| `tests/vitest/project-publication-public-repository.test.ts` | Public repository: server-side password verification, cached lookup wrappers, duplicate decision mapping, stale-comment locking, analytics without prohibited side effects, bot open behavior, telemetry disabled by default. | Name-level evidence (assertions not read): test-name lines 6-368 in `rg` output. |
| `tests/vitest/project-publication-email-links.test.ts` | Recipient and unsubscribe email URLs are absolute/canonical and fail closed in production without canonical origin. | Name-level evidence (assertions not read): test-name lines 5-42 in `rg` output. |
| `tests/vitest/project-publication-security-headers.test.ts` | Public CSP policy applies to client publication pages. | Name-level evidence (assertions not read): test-name lines 5-6 in `rg` output. |
| `tests/vitest/project-publication-schema.test.ts` | Migration/schema contract and generated Supabase type alignment for publication tables. | Name-level evidence (assertions not read): test-name lines 7-41 in `rg` output. |
| `tests/vitest/project-publication-summary.test.ts` | Publication summary separated from private Teamspaces membership; latest activity timestamp aggregation. | Name-level evidence (assertions not read): test-name lines 12-72 in `rg` output. |
| `tests/vitest/share/share-summary-card.test.tsx` | Summary card total, counts, currency, client/prepared-on display, singularization and missing client behavior. | Name-level evidence (assertions not read): test-name lines 26-62 in `rg` output. |
| `tests/vitest/share/share-page-decision-anonymous.test.tsx` | Anonymous visitor sees read-only explanation and no response actions; valid session shows actions. | Test comments and assertions at lines 16-42 in `rg` output. |
| `tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx` | Decision bar renders three actions and client-friendly finality copy. | Name-level evidence (assertions not read): test-name lines 16-32 in `rg` output. |
| `tests/vitest/share/cost-donut-chart-hydration.test.tsx` | Deterministic SVG output, coordinate rounding, no debug diagnostics in chart states. | Name-level evidence (assertions not read): test-name lines 24-51 in `rg` output. |
| `tests/vitest/shared-link-activity-benchmark.test.ts` | Static benchmark locks current activity query fan-out and public/internal composition behavior. | Name-level evidence (assertions not read): test-name lines 12-45 in `rg` output. |
| `tests/vitest/project-publication-one-published-index.test.ts` | Migration/index hardening contract for one published publication per project and preflight warning. | Name-level evidence (assertions not read): test-name lines 38-43 in `rg` output. |
| Other scoped guards (`project-deletion-active-publication-contract`, `projects-page-shared-access`, `design-enforcer-share-allowlist`, `security-findings-publication-contracts`) | Related contracts around delete warnings, project-page shared access, design allowlist, and prior security findings. | Present in scoped file inventory; not deeply read because they are adjacent rather than core `/share/[token]` receiver/API paths. |

## 2. Requirements-To-Test Traceability

| Requirement | Source / spec evidence | Existing test evidence | Status |
| --- | --- | --- | --- |
| Public `/share/[token]` renders a snapshot without Workshop shell. | Spec overview and receiver files at `.ai/06_specs/walkthrough-shared-link-overhaul.md:21-32`; page render at `src/app/share/[token]/page.tsx:60-99`. | `project-publication-page.test.tsx:135-168`. | Covered by DOM unit; no browser proof. |
| Unknown/revoked/expired token fails closed. | Snapshot/access resolver active-state behavior in repository at `src/lib/publication/public-repository.ts:136-141`; API 404 path at `src/app/api/share/[token]/route.ts:29-55`. | `project-publication-route.test.ts:158-166`. | Covered for API; page-level expired/revoked rendering not separately visible in scoped tests. |
| Tokenized routes are dynamic/no-store. | Routes export `dynamic` and `Cache-Control: no-store`, e.g. `route.ts:10-14`, `comment/route.ts:17-20`, `activity/route.ts:30`. | Static route guard in `share-no-store-invariants.test.ts:4-32`; API assertions at `project-publication-route.test.ts:120-127`. | Covered statically and partly behaviorally. |
| Password gate hides snapshot until access cookie verifies. | Page gate at `src/app/share/[token]/page.tsx:142-170`; API gate at `src/app/api/share/[token]/route.ts:35-50`. | Page gate at `project-publication-page.test.tsx:339-357`; API gate at `project-publication-route.test.ts:168-206`. | Covered. |
| Password attempts are CSRF-guarded, audited, rate-limited, and lock out. | CSRF verifier at `security.ts:358-371`; password route at `password/route.ts:34-108`; lockout source at `security.ts:512-588`. | Password route tests at `project-publication-route.test.ts:275-379`; lockout UI at `project-publication-page.test.tsx:359-389`; helper tests in `project-publication-security.test.ts` inventory. | Covered in unit/sim; durable provider enforcement not proven here. |
| Recipient token must establish HttpOnly session through route handler, not RSC mutation. | Page defers to initializer at `page.tsx:172-176`; initializer posts then replaces URL at `SharePageRecipientSessionInitializer.tsx:14-33`; session route cookies at `session/route.ts:38-101`. | Deferral and raw-token protections at `project-publication-page.test.tsx:182-285`. | Covered; no full browser redirect/cookie round trip. |
| Comments require valid session, same-origin CSRF, rate limit, sanitization, snapshot locking, and generic public errors. | Comment route at `comment/route.ts:185-333`; **sanitize at `comment/route.ts:280` (`sanitizeSharedLinkRecipientText(rawBody, 1000)`) — was mis-anchored to `:74-90`, corrected at `1feb85a5`**; snapshot view-token read at `comment/route.ts:234-246`. | CSRF/session/rate/stale/generic tests at `project-publication-comments.test.tsx:81-328`; **strong sanitization assertion at `:260-278`**; GET read contract at `share-page-get-routes-contract.test.ts:92-181`; QA-G09 exact-status tightening. | **Covered, incl. sanitization and exact-status tightening.** |
| Decisions require valid session, same-origin CSRF, single final decision, snapshot locking, rate limit, and generic errors. | Decision route at `decision/route.ts:124-242`; UI locks after decision at `SharePageDecision.tsx:237-253`. | Route tests at `project-publication-decision.test.tsx:83-285`; UI reload lock at lines 321-340. | Covered at unit level. Race/provider uniqueness not proven. |
| Comments remain allowed after a decision. | Spec P7 says post-decision comments allowed at `.ai/06_specs/walkthrough-shared-link-overhaul.md:111-115`; UI locked badge says comments remain available at `SharePageDecision.tsx:249`. | Copy/decision tests mention non-interference in inventory; no integrated test submits comment after decision in same recipient session. | Gap. |
| Public activity hides internal/private fields and only exposes recipient-scoped decisions/events. | Activity route filters public visibility at `activity/route.ts:156-174` and maps public model at `246-264`. | Activity filtering/client-safe tests at `project-publication-activity.test.tsx:518-555`; QA-G09 exact-status cases. | **Covered for field-redaction and exact-status assertions.** |
| Owner activity feed can include internal activity and refreshes without background interval. | Owner component uses server action at `SharedLinkActivityFeed.tsx:31-43`; focus/visibility refresh at `81-95`. **No realtime/WebSocket/SSE — that is SHF-01, Open per [`75`](75_FINDING_ID_REGISTRY.md)§6 → D7.** | Owner action — **name-level only** (assertions not read) at `project-publication-activity.test.tsx:613-620`. | **Name-level only / Partial; no real owner auth/RLS/provider proof. (Realtime is a separate Open finding SHF-01, not a QA gap.)** |
| Snapshot strips private metadata, internal rates, unsafe images, and inactive tab content. | Snapshot sanitizer at `snapshot.ts:95-133`; tab filtering at `snapshot.ts:204-263`; schema version at `snapshot.ts:282-292`. | `project-publication-snapshot.test.ts:5-321`. | Strong unit coverage. |
| Share tree reconstructs safely and resists hostile designation strings. | `SharePageTabs` uses `getBestShareTree` at `SharePageTabs.tsx:274-282`. | `share/reconstruct-share-tree.test.ts:43-330`. | Strong helper coverage; visual/interaction proof missing. |
| Recipient/user content does not become executable HTML. | React text rendering in comment/decision/activity components at `SharePageComments.tsx:350-358`, `SharePageDecision.tsx:247-249`, `SharedLinkActivityFeed.tsx:145-148`. | Static no-dangerous-html guard at `share/no-dangerous-html.test.ts:5-34`; reconstruction literal string test at `share/reconstruct-share-tree.test.ts:176-188`. | Covered statically; DOM render escaping test gap remains. |
| P12 retry/offline queue/circuit breaker resilience. | Spec at `.ai/06_specs/walkthrough-shared-link-overhaul.md:141-145`; client queue/retry at `SharePageComments.tsx:57-216`; circuit breaker at `comment/route.ts:19-59` and `269-276`. | Comments suite now asserts offline queue persistence/reconnect flush/clear and route circuit breaker behavior. | Covered locally; provider-backed race remains QA-G06. |
| CSP/security headers and no tracking scripts on `/share`. | Spec P11 at `.ai/06_specs/walkthrough-shared-link-overhaul.md:136-139`. | `project-publication-security.test.ts` inventory lines 240-253 and `project-publication-security-headers.test.ts` inventory lines 5-6. | Static coverage; no live header smoke in this audit. |
| Responsive/mobile visual behavior and safe-area decision bar. | Spec P9 at `.ai/06_specs/walkthrough-shared-link-overhaul.md:123-128`; decision bar safe-area class at `SharePageDecision.tsx:256-262`. | Some DOM/copy tests; no browser automation by rule. | Gap for actual layout proof. |

## 3. Missing Tests / Gaps

> **Re-id'd & reconciled (2026-06-21).** The original "Severity" column carried six **P0** rows; two
> of those were FALSE against committed source (see As-of banner) and are retired here. Every row now
> carries a **Canonical ID** bound to [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md)§4. The
> canonical severity in `75` **wins** over any older severity in this table. **No row is P0.** Rows
> without a canonical QA-G id (P1/P2/P3 process/coverage notes that 75 does not track as a numbered
> finding) are kept as **"audit notes"** and flagged `(note)`; they are not launch gates.
>
> Owner-lane + sequence per remaining gap, plus the Definition-of-test-done sign-off gate, are in §7
> below; the forward execution sequencing of these items lives in
> [`91_FORWARD_EXECUTION_PLAN.md`](91_FORWARD_EXECUTION_PLAN.md).

| Canonical ID | Sev | Affected behavior | File(s) | Recommended test file | Exact scenario |
| --- | :--: | --- | --- | --- | --- |
| **QA-G01** | ~~P0~~ → **Stale-invalid** | ~~"Comment sanitization not proven to RPC."~~ **FALSE per `75` §4 (QA-G01 / QA-G02 rows) + `_COORDINATION.md`§4.4.** The inserted-body assertion already exists at `project-publication-comments.test.tsx:260-278` (excludes `<script`/`<img`/`<b>`/`onerror`, includes `bold`, length === 1000). Sanitizer source: `comment/route.ts:280` (`sanitizeSharedLinkRecipientText(rawBody, 1000)`), **not** `:74-90`. | `comment/route.ts:280`, `tests/vitest/project-publication-comments.test.tsx:260-278` | — (retire) | **No action.** Retired. Adjacent QA-G09 exact-status tightening is already Fixed and is **not** a sanitizer gap. |
| **QA-G02** | ~~P0~~ → **Fixed** (regression test only, **P2**) | ~~"Decision note not server-sanitized/truncated before RPC."~~ **FALSE per `75` §4 (QA-G01 / QA-G02 rows) + `_COORDINATION.md`§4.3.** It **is** sanitized at `decision/route.ts:145` (`sanitizeSharedLinkRecipientText(body.note, 2000)`, falling back to `null` on empty). The original P0 mis-anchored to `:131-145`/`:204-211` "passes through" — corrected. | `decision/route.ts:145`; UI maxLength at `SharePageDecision.tsx:330-340` | `tests/vitest/project-publication-decision.test.tsx` | **Add regression test (P2):** direct POST decision with `note: "<img src=x onerror=alert(1)>" + "x".repeat(5000)`; assert the value handed to `submitSharedLinkDecision` is sanitized (no `<img`/`onerror`) and length ≤ 2000. **No source change.** |
| **QA-G03** | **P1 · Fixed** | DOM escaping for recipient-supplied comment/decision/activity content is now behavior-tested. | `SharePageComments.tsx:350-358`, `SharePageDecision.tsx:247-249`, `SharedLinkActivityFeed.tsx:145-148`; `tests/vitest/share/recipient-content-escaping.test.tsx` | `tests/vitest/share/recipient-content-escaping.test.tsx` | Render comments/decision/activity with `<img src=x onerror=alert(1)>`; assert text is visible literally and no `img`, `script`, or event-handler attributes exist in the container. |
| **QA-G04** | **P1 · Fixed** | Recipient-session initializer POST/redirect/no-token-leak behavior is now integrated at component level. | `SharePageRecipientSessionInitializer.tsx:14-33`, `session/route.ts:75-101`, `tests/vitest/share-recipient-session-initializer.test.tsx` | `tests/vitest/share-recipient-session-initializer.test.tsx` | Render initializer with raw token; mock fetch 200; assert POST body contains recipientToken, `AbortController` cleanup on unmount, `window.location.replace("/share/<token>")`, and no raw recipient token is rendered. |
| **QA-G05** | **P1** | Comment circuit breaker has no direct test that >50% 5xx opens a `503` with `Retry-After: 120` before rate/RPC. **Source confirmed at `1feb85a5`:** circuit check at `comment/route.ts:259-265` returns `503` + `Retry-After: 120`. | `comment/route.ts:259-265` (was mis-anchored to `:19-59`/`:269-276`) | `tests/vitest/project-publication-comments.test.tsx` | Force four valid POSTs with three `insertSharedLinkComment` 500s, then a fifth valid POST; assert route returns `503`, `Retry-After: 120`, and does not call rate/RPC while open. Add test reset hook or isolate module between tests. |
| **QA-G06** | **P1 · Partial** | Durable database uniqueness/race for duplicate decisions now has a gated provider/local-Supabase harness, but it is not provider-proven here because local Docker/Supabase was unavailable. | `decision/route.ts:186-225`, `project-publication-decision.test.tsx:105-119`, `tests/vitest/share/duplicate-decision-race.provider.test.ts` | Run the harness with `SUPABASE_DB_URL` against local Supabase or linked provider (not mocks) | Two concurrent `submit_client_response` calls for same publication/recipient/snapshot; assert exactly one row and one duplicate failure. |
| **QA-G07** | **P1 · Fixed** | Offline queue flush + tampered-viewToken 409 route tests are now asserted. | `SharePageComments.tsx:57-216`, `261-279`; `comment/route.ts:234-245`; `decision/route.ts:173-184` | `tests/vitest/project-publication-comments.test.tsx`, `tests/vitest/project-publication-decision.test.tsx` | (a) `navigator.onLine=false`: submit after fetch failure; queue key `shared-link-pending-comments-<token>` holds body, online event flushes once and clears, body/viewToken/CSRF are asserted. (b) Direct POST with `viewToken:"tampered"` + valid session → `409` reload message, no rate/RPC call. |
| **QA-G08** | **P1 · Fixed** | Comments-after-decision behavior is now asserted, not only implied by copy. | Spec `.ai/06_specs/walkthrough-shared-link-overhaul.md:111-115`; `SharePageDecision.tsx:249`; comments route independent at `comment/route.ts:185-333`; `tests/vitest/project-publication-decision.test.tsx` | `tests/vitest/project-publication-decision.test.tsx` | Establish valid recipient session, mock existing decision GET to locked state, then submit comment with same session/viewToken; assert comment POST still reaches `insertSharedLinkComment` and returns `201`. |
| **QA-G09** | **P2 · Fixed** | Prior permissive status arrays were tightened to exact expected status/payload assertions. | `tests/vitest/project-publication-comments.test.tsx`; `tests/vitest/project-publication-activity.test.tsx`; route filter at `activity/route.ts:156-174`, `250-253` | Tightened in the two existing test files. | Comment RPC test asserts exact `201`; public unauthenticated activity returns exactly `200` with no internal comments, no recipient decisions/events, and no raw IDs/emails. |
| **QA-G10** | **P2** | Live security-header smoke + mobile/print visual proof. Static tests can miss Next config/runtime header mismatches; layout/print proof is class/source-level only. | Spec P11 `.ai/06_specs/walkthrough-shared-link-overhaul.md:136-139`; Spec P9 `:123-128`; `SharePageDecision.tsx:256-262`, `SharePageTabs.tsx:310-360`; security inventory lines 240-253 | Header smoke + seed helpers landed; live `SHARE_URL` run + visual matrix deferred to [`85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) | Local dev/preview request to a valid no-password share link: assert CSP enforced, nosniff, DENY/frame-ancestors, Referrer-Policy, no-store, and noindex. Mobile 320/390/768: no unintended horizontal overflow, decision bar visible, modal focus reachable; print hides receiver chrome. |
| `(note)` | P1 | Session DELETE route has no same-origin guard. It only expires cookies, so risk is lower, but cross-origin image/form probes could log a recipient out. **Gated on decision D5** ([`71`](71_OPEN_DECISIONS_REGISTER.md)). | `session/route.ts:104-112` | `tests/vitest/project-publication-page.test.tsx` or new `share-session-route.test.ts` | Cross-origin `DELETE /api/share/[token]/session` should either be allowed by explicit product decision or blocked with 403. Document intended behavior. |
| `(note)` | P1 | Public activity GET same-origin policy may block useful direct client fetches if `Origin` is sent by browser contexts differently; tests cover same/cross origin but not absent-origin cache/proxy probes. | `activity/route.ts:80-84`; `project-publication-activity.test.tsx:421-442` | `tests/vitest/project-publication-activity.test.tsx` | GET with no `Origin` and no cookies from a crawler/proxy should return valid public filtered activity or documented fail-closed response. |
| `(note)` → **QA-G07(b)** | P1 | View-token stale snapshot invalid path covered for comments/decisions only through mocked `readPublicationViewSnapshotVersion`; helper tamper coverage exists indirectly in security tests but not tied to route invalid-token payloads. **Folded into QA-G07(b) above — kept here for traceability.** | `comment/route.ts:234-245`; `decision/route.ts:173-184`; `security.ts:200-269` | `project-publication-comments.test.tsx` and `project-publication-decision.test.tsx` | Direct POST with `viewToken: "tampered"` and valid session; assert 409 reload message and no rate/RPC call. |
| `(note)` | P1 | Public route telemetry via `after()` is not proven non-blocking/failure-isolated. | `page.tsx:151-168`, `218-251` | `tests/vitest/project-publication-page.test.tsx` | Mock `recordProjectPublicationAnalyticsEvent`/`recordProjectPublicationEvent` to reject inside captured `after` callbacks; assert page still renders and console logs only. |
| `(note)` | P1 | Password route includes real `setTimeout(delayMs)` on failures; route test does not bound delay behavior with fake timers. | `password/route.ts:86-92` | `tests/vitest/project-publication-route.test.ts` | Mock durable failure delay to `4000` and in-memory delay `8000`; with fake timers assert route waits max delay then returns 401 without hanging test runner. |
| `(note)` | P2 | Share page tab nested keyboard isolation likely tested in page suite, but audit did not confirm current line evidence beyond source. | `SharePageTabs.tsx:109-115`, `134-176`, `225-267` | `tests/vitest/project-publication-page.test.tsx` | With main estimate tabs and nested Tree/Grid tabs, ArrowRight on nested tab changes only view mode and does not change active estimate; Home/End on main tabs works. |
| `(note)` | P2 | Email digest failure is intended non-blocking but route tests do not assert dynamic import helper failure isolation. | `comment/route.ts:307-311`; `decision/route.ts:213-217` | `project-publication-comments.test.tsx`, `project-publication-decision.test.tsx` | Mock `maybeTriggerSharedLinkActivityDigest` import/helper throw; assert comment/decision response remains `201`. |
| `(note)` | P2 | Snapshot fixtures cover representative trees but not a very large compact v1.3 tabbed snapshot with unsafe images and mixed node kinds together. | `snapshot.ts:204-292`; existing fixture tests at `project-publication-snapshot.test.ts:181-321` | `tests/vitest/project-publication-snapshot.test.ts` | Build 2 estimates x 3 tabs x 500 rows with mixed area/group nodes, unsafe cover/row URLs, orphan rows; assert row counts, tab totals, no unsafe URL, v1.3 `rowIds`, and reasonable runtime. |
| `(note)` | P2 | Activity pagination under concurrent insert between page 1 and page 2 not covered. | Cursor logic at `activity-helpers` used by `activity/route.ts:101-107`, `246-255` | `tests/vitest/project-publication-activity.test.tsx` | Page 1 returns cursor, insert a newer event before page 2 fixture, page 2 must not duplicate or skip older page-1 items. |
| `(note)` | P2 | Dirty worktree / multiple agent collision is not a product test, but feature verification commands must avoid unrelated dirty files. | Worktree may have unrelated modified tests in `git status --short`; no scoped anchor dirty files before report write. | Report handoff / implementation workflow | Verification scripts should pass explicit file lists and avoid broad `bun run validate` until active agents finish. |
| `(note)` | P3 | Cost donut deterministic SVG covered, but visual chart label collision is not proven. | `SharePageTabs.tsx:355-360`; donut tests inventory lines 24-51 (name-level) | Manual/browser visual QA (see `85`) | Multi-discipline sheet with long discipline names and tiny buckets; inspect label clipping/overlap on mobile/desktop. |
| `(note)` | P3 | Unsubscribe HTML interstitial uses inline HTML string; escaping tests cover route behavior but not all reflected token edge cases. | `unsubscribe/route.ts:30-52` | `tests/vitest/share-unsubscribe-interstitial.test.ts` | Token and recipient contain `<>&"'`; GET response must contain escaped entities only, no raw tags/attribute breaks. |

## 4. UltraQA Scenario Matrix

| Scenario class | Adversarial scenario | Expected result | Current evidence | Gap / next test |
| --- | --- | --- | --- | --- |
| Normal | Open valid unprotected share link. | Page renders project snapshot outside Workshop, logs open best-effort, API returns sanitized snapshot no-store. | Page test `project-publication-page.test.tsx:135-168`; API `project-publication-route.test.ts:120-140`; source `page.tsx:253-260`. | Browser visual proof still open. |
| Normal | Open password-protected link, unlock, then fetch snapshot. | Snapshot hidden until valid signed cookie; password attempts audited; no plaintext cookie. | Source `page.tsx:142-170`, `password/route.ts:68-108`; tests `project-publication-route.test.ts:168-206`, `275-321`. | Add fake-timer delay test for progressive failures. |
| Normal | Recipient opens personalized link and comments/decides. | Session route verifies recipient token, sets HttpOnly session + `_ok`, redirects to clean URL; comments/decisions use session. | Source `session/route.ts:70-101`, initializer `SharePageRecipientSessionInitializer.tsx:14-33`; tests `project-publication-page.test.tsx:256-285`. | Add integrated initializer redirect/cookie test. |
| Normal | Owner views activity feed. | Owner path uses server action and can include internal activity; public path stays filtered. | Source `SharedLinkActivityFeed.tsx:31-45`; action inventory `project-publication-activity.test.tsx:613-620`. | Provider/RLS proof missing. |
| Malformed input | Unknown, revoked, expired, or fake token. | 404/no-store, no snapshot, no event side effects. | `project-publication-route.test.ts:158-166`; active resolver `public-repository.ts:136-141`. | Add page-level notFound case and hosted fake-token header smoke. |
| Malformed input | Malformed recipient query or invalid recipient token. | No server-side cookie mutation; session route returns 400/404. | `project-publication-page.test.tsx:203-225`; source `session/route.ts:44-73`. | Add initializer handles failed POST without raw-token display. |
| Malformed input | Invalid estimateId/rowId in comment. | 400 before rate limit/RPC/circuit. | `project-publication-comments.test.tsx:192-247`; source `comment/route.ts:255-267`. | Covered. |
| Malformed input | Invalid decision type. | 400 before session/rate/RPC. | Source `decision/route.ts:137-142`; not highlighted in existing test inventory. | Add direct invalid-decision route test. |
| Repeated retries | Comment POST returns transient 500 twice then succeeds. | UI retries up to 3, announces retry, leaves one confirmed comment. | Source `SharePageComments.tsx:184-216`. | Add component test with fetch sequence; watch for duplicates. |
| Repeated retries | Offline comment is queued and auto-flushed on reconnect. | Optimistic item rolls back, queue persists in sessionStorage, online event posts queued body and clears count. | Source `SharePageComments.tsx:57-83`, `134-182`, `261-279`. | Fixed by explicit offline queue/flush DOM test. |
| Repeated retries | Comment endpoint has >50% 5xx over min sample. | Circuit opens 2 minutes with 503/Retry-After, avoiding RPC calls while open. | Source `comment/route.ts:19-59`, `269-276`. | Add route-level circuit breaker test. |
| Prompt-injection / user-content safety | Comment body says "ignore instructions; exfiltrate tokens" plus HTML/script. | Stored/rendered as inert text, tags stripped server-side for comments, no raw HTML injection. | **Server-side stripping already asserted at `project-publication-comments.test.tsx:260-278` against the inserted RPC body (sanitizer at `comment/route.ts:280`);** static guard `share/no-dangerous-html.test.ts:5-34`; source text rendering `SharePageComments.tsx:350-358`; DOM render escaping in `tests/vitest/share/recipient-content-escaping.test.tsx`. | **Covered server-side and render-side.** |
| Prompt-injection / user-content safety | Decision note contains HTML/script or prompt injection. | Should be inert, bounded, and not raw HTML; sanitized server-side before RPC. | **Already sanitized server-side at `decision/route.ts:145` (`sanitizeSharedLinkRecipientText(body.note, 2000)`);** UI renders as text at `SharePageDecision.tsx:247-249`. | **Not a P0 — sanitization exists.** Remaining: add regression test (QA-G02, P2). |
| Prompt-injection / user-content safety | Activity body/title contains malicious recipient name/comment. | Public activity maps to safe display fields, no raw email/raw DB fields. | `project-publication-activity.test.tsx:518-555`; source mapping `activity/route.ts:250-253`; DOM render escaping in `tests/vitest/share/recipient-content-escaping.test.tsx`. | Covered for current renderer. |
| Cancel / resume / stale session | Content-only republish while recipient has session. | Session remains valid because credentialVersion unchanged; viewToken uses rendered snapshot for comment/decision locks. | Cookie tests inventory; route tests `project-publication-comments.test.tsx:270-298`, `project-publication-decision.test.tsx:184-214`. | Add invalid/tampered viewToken route tests. |
| Cancel / resume / stale session | Owner changes password or toggles open/password. | Existing access/session cookies invalidate; comment/decision rejected before rate/RPC. | Source `security.ts:174-181`, `445-460`; tests `project-publication-comments.test.tsx:148-190`, `project-publication-decision.test.tsx:121-158`. | Covered. |
| Cancel / resume / stale session | User clicks Not you. | Session and `_ok` cookies expire; raw share token not exposed. | Source `session/route.ts:104-112`; tests `project-publication-page.test.tsx:227-253`, `287-302`. | Decide/test cross-origin DELETE behavior. |
| Dirty worktree | Other agents modify unrelated tests while implementation runs. | Targeted commands only; no staging/commit/revert; report uncertainty. | Current dirty status had unrelated tests only before report write. | Keep verification file-scoped; rerun `git status --short -- <scoped paths>` before final handoff. |
| Hung / timeout | Password failure delay or route circuit tests hang. | Use fake timers/module isolation for delay/circuit; avoid full validation. | Source delay `password/route.ts:86-92`. | Add fake-timer tests; do not use real 8s/16s waits. |
| Hung / timeout | Activity route large data/cursor fan-out. | Bounded `limit` 1-100 and opaque cursor; no raw cursor leakage. | Source `activity/route.ts:98-107`, `246-264`; tests `project-publication-activity.test.tsx:558-602`. | Add concurrent insert pagination case. |
| Flaky / misleading success | Permissive tests pass with `503` or broad status arrays. | Tests should assert exact expected status and payload unless testing fallback. | QA-G09 follow-up tightened the genuine permissive comment/activity cases to exact statuses and side-effect assertions. | Covered for the named comment/activity anchors; keep the static scan for future broad arrays. |
| Flaky / misleading success | Static no-store/header tests pass but runtime Next headers differ. | Runtime smoke should confirm deployed/dev headers. | Static guard `share-no-store-invariants.test.ts:4-32`. | Add targeted header probe command after implementation. |
| Privacy / token leakage | Raw share token/recipient token leaks in cookies, URL after init, activity, or errors. | Cookie tests assert no raw tokens at `project-publication-page.test.tsx:256-302`; activity field redaction at `project-publication-activity.test.tsx:518-555`; generic 500 tests for comment/decision. | Add initializer redirect test and hosted fake/valid-token redacted evidence when allowed. |
| Privacy / token leakage | Internal IDs/emails appear in public activity. | Public activity IDs are hashed, raw UUIDs/emails absent. | `project-publication-activity.test.tsx:518-555`; source `activity/route.ts:56-77`. | Covered for fixture; add recipient-session path exact test. |
| Privacy / token leakage | Unsafe images track clients. | Snapshot image URL normalization and public read sanitizer. | `project-publication-snapshot.test.ts:324+`; source `snapshot.ts:112-133`. | Add combined large v1.3/legacy-v1.2 unsafe image fixture. |
| Mobile / responsive / manual visual proof | 320px mobile with long rows, decision modal, comments, activity. | No unintended horizontal overflow, tappable controls, focus trap, safe-area bottom. | Source classes in `SharePageDecision.tsx:256-360`, `SharePageTabs.tsx:310-360`. | Manual/Playwright proof explicitly not run by this audit; add later targeted browser matrix. |
| Mobile / responsive / manual visual proof | Print share page. | Receiver chrome hidden, estimate content printable. | `project-publication-page.test.tsx:170-180`; `page.tsx:94-96`. | Manual print preview proof missing. |

## 5. Suggested Targeted Command Sequence

Use these after implementation changes. They are intentionally narrow because the worktree has unrelated dirty files and the full validation suite is known to be noisy/hang-prone from FAST PATH state.

```bash
git status --short -- \
  '.ai/03_plans/2026-06-20-Shared-Link-Feature' \
  tests/vitest/project-publication-*.test.* \
  tests/vitest/share \
  tests/vitest/share-no-store-invariants.test.ts \
  tests/vitest/publication-client-csrf.test.ts \
  tests/vitest/share-unsubscribe-interstitial.test.ts \
  src/app/share \
  src/app/api/share \
  src/lib/publication \
  src/components/share

bunx vitest run \
  tests/vitest/project-publication-comments.test.tsx \
  tests/vitest/project-publication-decision.test.tsx \
  tests/vitest/project-publication-route.test.ts \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/share/share-page-get-routes-contract.test.ts \
  --maxWorkers=1

bunx vitest run \
  tests/vitest/project-publication-snapshot.test.ts \
  tests/vitest/project-publication-activity.test.tsx \
  tests/vitest/share/reconstruct-share-tree.test.ts \
  tests/vitest/share/no-dangerous-html.test.ts \
  tests/vitest/share-no-store-invariants.test.ts \
  tests/vitest/share-unsubscribe-interstitial.test.ts \
  tests/vitest/publication-client-csrf.test.ts \
  --maxWorkers=1

bun run type-check
git diff --check -- \
  '.ai/03_plans/2026-06-20-Shared-Link-Feature' \
  tests/vitest/project-publication-*.test.* \
  tests/vitest/share \
  tests/vitest/share-no-store-invariants.test.ts \
  tests/vitest/publication-client-csrf.test.ts \
  tests/vitest/share-unsubscribe-interstitial.test.ts \
  src/app/share \
  src/app/api/share \
  src/lib/publication \
  src/components/share
```

Optional later manual/browser QA, outside this report's rules:
- Desktop 1440 and mobile 320/390 share page with valid open link, password link, recipient link, multi-sheet compact v1.3 snapshot plus legacy v1.2 tab snapshot, long labels, comments, decision modal, activity feed, and print preview.
- Header smoke against a running app or preview: `/share/<fake-token>`, `/api/share/<fake-token>`, `/api/share/<fake-token>/activity` must be no-store and fail closed without raw token/cookie leakage.

## 6. Handoffs / Conflicts For Other Lanes

- Worktree concurrency: before writing this report, `git status --short -- <scoped anchors>` showed unrelated dirty tests under `tests/vitest/*` but no dirty files in `src/app/share`, `src/app/api/share`, `src/lib/publication`, `src/components/share`, or this plan directory. Treat broad validation results as potentially contaminated until those lanes settle.
- Security lane: **RESOLVED — direct API decision notes ARE sanitized/truncated server-side.** `decision/route.ts:145` calls `sanitizeSharedLinkRecipientText(body.note, 2000)` before `submitSharedLinkDecision`. The earlier "passes `note` through" claim was stale (QA-G02, now Fixed). Only a regression test remains (P2).
- Reliability lane: add route tests for comment circuit breaker and password delay fake timers. Offline queue/retry hardening is now covered by QA-G07's reconnect flush/sessionStorage assertions.
- QA/browser lane: run the mobile/print/manual visual proof matrix later. This audit did not run browser automation by instruction.
- Provider/database lane: duplicate decision race, durable rate-limit table behavior, RLS visibility, and owner activity server action are not proven by this read-only local audit. Existing tests mock or simulate those surfaces.
- Test-maintenance lane: keep the no-broad-status-array scan in verification; QA-G09's named comment/activity anchors are now tightened.

## 7. Definition-of-Test-Done, Sign-off Gate, and Per-Gap Owner + Sequence

Historical line anchors were verified against commit `1feb85a5`; current-head verifier evidence at
`8ea51272` keeps the baseline green and re-anchors QA-G09. Sequencing/lane assignment is owned by
[`91_FORWARD_EXECUTION_PLAN.md`](91_FORWARD_EXECUTION_PLAN.md); this section gives the QA-lane
acceptance bar each item must clear before it is marked done in `75`/`99`.

### 7.1 Definition of test-done (per QA-G item)

Baseline: the canonical 23-file shared-link suite was re-run **2026-06-21 → 23 files / 353 tests
passed**, so any new/changed QA-G test is measured against a known-green baseline (a regression must
turn that baseline red, not merely add a passing test).

A QA-G item is **done** only when ALL of the following hold (binary, no partial credit):

1. The named test file exists and the named scenario is implemented (no `it.skip`, no `it.todo`).
2. The test asserts an **exact** status/payload/side-effect — not a broad status array — and **fails
   if the behavior regresses** (proven by temporarily reverting the behavior or by a red-first commit).
3. The new/changed tests pass under the §5 scoped command with `--maxWorkers=1` (no real long waits;
   use fake timers/module isolation for delay/circuit cases).
4. `bun run type-check` is green.
5. `git diff --check` reports no whitespace errors on the scoped paths (§5).
6. The item's status is updated in [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md) §4 and
   rolled up in [`99_QUALITY_SCORECARD_AND_SIGNOFF.md`](99_QUALITY_SCORECARD_AND_SIGNOFF.md).

### 7.2 Sign-off gate (binary pass/fail for the QA lane)

**PASS** the QA lane iff: QA-G01 retired in `75`; QA-G02 carries a green regression test;
QA-G03, QA-G04, QA-G05, QA-G07, QA-G08, and QA-G09 are green; remaining QA-G06 harness is implemented
but still needs provider/local-Supabase proof or explicit beta acceptance; QA-G10 header-smoke helper recorded and live/visual matrix
scheduled in [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md). **FAIL**
otherwise. There is **no open P0** in this matrix, so the QA lane does not block on a P0.

Gate verification command (run after the implementing changes land):

```bash
bunx vitest run \
  tests/vitest/project-publication-comments.test.tsx \
  tests/vitest/project-publication-decision.test.tsx \
  tests/vitest/project-publication-activity.test.tsx \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/share/recipient-content-escaping.test.tsx \
  --maxWorkers=1
bun run type-check
```

Binary gate: **all listed suites green AND type-check exit 0 ⇒ PASS; any red/non-zero ⇒ FAIL.**

### 7.3 Per-gap owner-lane + sequence

| ID | Sev | Owner-lane | Sequence | Target test path | Binary gate |
| --- | :--: | --- | --- | --- | --- |
| QA-G01 | Stale-invalid | QA / registry | S0 (do first; doc-only) | — (retire in `75`) | `75` row reads Stale-invalid ⇒ PASS |
| QA-G02 | P2 (Fixed + regression) | QA | S1 | `tests/vitest/project-publication-decision.test.tsx` | regression test green, no source change ⇒ PASS |
| QA-G03 | P1 · Fixed | Security / QA | S1 | `tests/vitest/share/recipient-content-escaping.test.tsx` | render escaping test green ⇒ PASS |
| QA-G04 | P1 · Fixed | QA / frontend | S1 | `tests/vitest/share-recipient-session-initializer.test.tsx` | initializer redirect/cookie/no-raw-token assertions green ⇒ PASS |
| QA-G05 | P1 | Reliability | S2 | `tests/vitest/project-publication-comments.test.tsx` | circuit-open returns `503`+`Retry-After:120`, no rate/RPC ⇒ PASS |
| QA-G06 | P1 · Partial | Provider / DB | S3 (harness added; needs provider run) | `tests/vitest/share/duplicate-decision-race.provider.test.ts` | concurrent submit ⇒ exactly one row + one duplicate failure ⇒ PASS |
| QA-G07 | P1 · Fixed | Reliability / QA | S2 | `tests/vitest/project-publication-comments.test.tsx`, `…-decision.test.tsx` | (a) offline queue flush + clear; (b) tampered viewToken ⇒ `409`, no rate/RPC ⇒ PASS |
| QA-G08 | P1 · Fixed | QA | S2 | `tests/vitest/project-publication-decision.test.tsx` | comment after locked decision still `201` ⇒ PASS |
| QA-G09 | P2 · Fixed | Test-maintenance | S1 | `tests/vitest/project-publication-comments.test.tsx`, `…-activity.test.tsx` | no broad status arrays remain; exact `200`/`201` asserted ⇒ PASS |
| QA-G10 | P2 | QA / browser | S4 (deferred to `85`) | header-smoke helper + `85` matrix | live header smoke recorded + visual matrix scheduled ⇒ PASS |

`(note)` rows in §3 are not part of the sign-off gate; they are tracked as audit notes and only
escalate if an owner decision (e.g. D5 for the session DELETE guard) converts them into a finding in
[`75`](75_FINDING_ID_REGISTRY.md).
