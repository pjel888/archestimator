# Shared Link / Publication Feature Architecture Audit

Date: 2026-06-20 · Remediated: 2026-06-21 · Status: **REMEDIATED — anchors re-verified against committed source; finding IDs/severities/statuses bound to [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md) (75 wins on any disagreement).**

> **Currency check (as of 2026-06-21).** Re-verified against committed source on the remediation date.
> Sizes at verification: `ProjectPublicationHeader.tsx` = 1172 lines, `src/lib/publication/actions.ts` = 1538 lines,
> `SharePageTabs.tsx` = 677 lines, `SharedLinkActivityFeed.tsx` = 178 lines, `share/[token]/page.tsx` = 333 lines.
> Drift corrected in this pass: the §1 project-memory citations (the original audit cited the same `:793-794` range
> against two different files — `current-state.md` and `decisions.md` — which two files must never legitimately share;
> `current-state.md:793-794` is unrelated `ProjectWorkspaceHeaderRow` content, the real shared-link block is `current-state.md:~111-129`,
> and `decisions.md` keeps its own distinct anchors), the SHF-02 "missing file" strawman (re-framed as a deliberate single-column deferral), the
> SHF-01↔RUX-10 conflation (un-merged per 75), and the loose 200-300-line spans in §2. Re-run the currency check by
> diffing the cited anchors against `HEAD` before relying on this doc:
> `bun run type-check && rg -n "id: \"sheets\", label: \"Estimates\"" src/components/workshop/ProjectPublicationHeader.tsx`.
> Canonical IDs here: **SHF-01 (P2, Open/Decision)**, **SHF-02 (P3, Decision — deferral not debt)**, **SHF-03 (P3, Decision)** — see [`75` §6](75_FINDING_ID_REGISTRY.md).

Scope:
- `.ai/06_specs/walkthrough-shared-link-overhaul.md`
- `.ai/06_specs/proposal-package-system.md`
- `.ai/10_state/decisions.md`
- `.ai/10_state/current-state.md`
- `.ai/09_archive/store/2026-05-27-project-client-publication-complete/`
- `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/`
- `src/app/share/[token]/`
- `src/app/api/share/[token]/`
- `src/components/share/`
- `src/components/workshop/publication/`
- `src/lib/publication/`
- `src/lib/share/`
- `supabase/migrations/`

Evidence note:
- Direct evidence is cited as `path:line-range`.
- When I rely on absence from repo scan, I mark it as indirect evidence.
- I did not edit source code or run browser automation.

## 1. Intended architecture summary from specs/archive

The intended V2 shared-link architecture is a production-grade split between:
- a manager-facing publication modal on the project page, and
- a client-facing receiver dashboard at `/share/[token]`.

V2 is explicitly described as replacing the original V1 "Public link" with recipient management, tabbed navigation, client comments and decisions, owner activity feeds, email digests, security hardening, error resilience, and testing (`.ai/06_specs/walkthrough-shared-link-overhaul.md:10-18`).

The archived implementation plan says the receiver dashboard should include:
- cost donut chart,
- Tree View / Grid Preview sub-tabs,
- a floating navigation rail with IntersectionObserver behavior,
- comments and decision controls,
- and owner notifications via Resend (`.ai/06_specs/proposal-package-system.md:38-50`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:152-157`).

The manager modal in the archive is a five-tab surface:
- Link, Sheets, Access, Recipients, Activity,
- with owner-only full activity feed and recipient email delivery/resend (`.ai/06_specs/walkthrough-shared-link-overhaul.md:21-44`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:82-158`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/08-api-routes-and-server-actions-plan.md:117-160`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/08-api-routes-and-server-actions-plan.md:224-237`).

Security intent in the archive:
- token hash -> optional password gate -> immutable snapshot -> optional recipient session -> read-only receiver UI with comments/decisions,
- 15-minute lockout after 5 password failures,
- enforced CSP on `/share/:path*`,
- and three hardening headers on share routes (`.ai/06_specs/walkthrough-shared-link-overhaul.md:169-188`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/05-security-privacy-auth-plan.md:29-68`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/05-security-privacy-auth-plan.md:72-110`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/05-security-privacy-auth-plan.md:126-161`).

Project memory also records the V1 baseline as a simple public link and the V2 completion as a separate shared-link surface. Each anchor below was re-derived independently against committed source on 2026-06-21. The original audit's collision was an anchor copy-paste: it cited the **same** line range — `:793-794` — against **two different files** (`current-state.md:793-794` *and* `decisions.md:793-794`). Two distinct files do not legitimately share a finding's line numbers, which is the tell that the citation was fabricated. Verified on re-derivation: `current-state.md:793-794` is unrelated `ProjectWorkspaceHeaderRow` layout-test content, and the real shared-link record in `current-state.md` lives at **~`:111-129`** (the "Shared-link/publication receiver surface audited and hardened (2026-06-20)" block); `decisions.md` has its own *distinct* anchors (`:793-794`/`:865`/`:867`, below). The corrected, per-file anchors are:
- **V1 baseline (public link), 2026-05-27:** `.ai/10_state/decisions.md:793-794` — "Project client publication is active as a separate public sharing surface … managers publish a token-scoped `/share/[token]` snapshot from the project header's `Public link` control … PDF/download artifacts are not part of this V1".
- **V2 completion (Shared Link Overhaul V2, P14), 2026-05-28:** `.ai/10_state/decisions.md:865` — "Shared Link Overhaul V2 Complete. P0–P13 delivered terminology ('Shared link'), 5-tab manager (Link/Sheets/Access/Recipients/Activity), recipient + Resend email …" (note: the decision text says "Sheets"; the shipped manager tab **label** is "Estimates" — see §2 and the rename task).
- **Receiver enhancement incl. floating nav, 2026-05-29:** `.ai/10_state/decisions.md:867` — "Share Page Estimate View Enhancement … Added per-sheet D3 donut … sub-tab Tree|Grid … **floating nav (scroll + IO)**. Client-side only." The floating rail was **delivered** here, then later collapsed to a single-column container (see SHF-02 below).
- **Current-state record of the audited surface:** `.ai/10_state/current-state.md:~111-129` (the "Shared-link/publication receiver surface audited and hardened (2026-06-20)" block; the adjacent "Shared-link upgrade second pass" block sits just above it). This is the correct shared-link anchor in `current-state.md` — explicitly **not** `:793-794` (unrelated `ProjectWorkspaceHeaderRow` content) and not co-numbered with any `decisions.md` anchor.

## 2. Current architecture summary from source

The current receiver route is `src/app/share/[token]/page.tsx`. It renders a single-column share page with:
- recipient session initialization,
- session banner,
- proposal header,
- summary card,
- decision controls,
- hero image,
- estimate tabs,
- comments,
- and a footer (`src/app/share/[token]/page.tsx:74-97`, `src/app/share/[token]/page.tsx:131-260`).

The manager-facing publication modal lives in `src/components/workshop/ProjectPublicationHeader.tsx`. It currently implements a five-tab modal — internal tab ids are `link / sheets / access / recipients / activity`, but the rendered **labels** are **Link / Estimates / Access / Recipients / Activity** (`ProjectPublicationHeader.tsx:660-664`, where `{ id: "sheets", label: "Estimates" }`). Tab state and the active-tab switch are at `ProjectPublicationHeader.tsx:305-306` and `:382`. Supporting controls:
- Estimates picker panel (`ProjectPublicationHeader.tsx:771-795`),
- expiry/password (Access) controls (`ProjectPublicationHeader.tsx:796-885`),
- recipient composer mount (`ProjectPublicationHeader.tsx:885-900`),
- and always-visible link/generate controls below the tabs (`ProjectPublicationHeader.tsx:901-945`).

> **Terminology note (binds to [`75`](75_FINDING_ID_REGISTRY.md) / `_COORDINATION.md` §4.11):** source standard is **"Estimates"** (the visible label). The spec/archive (`walkthrough-shared-link-overhaul.md`, decisions.md:865) still say **"Sheets"**, and the internal tab id is `"sheets"`. **Spec-rename task:** update the spec/archive copy to "Estimates" (see SHF-D in §4). The internal `id: "sheets"` is an implementation detail and is out of scope for the rename.

The receiver-side estimate navigator is `src/components/share/SharePageTabs.tsx`. It currently implements:
- per-sheet donut aggregation,
- Tree View / Grid Preview sub-tabs,
- horizontal estimate tabs with roving tabindex,
- tree reconstruction,
- a hidden desktop tree panel alongside the main tree view,
- and a grid search/table fallback (`src/components/share/SharePageTabs.tsx:82-85`, `src/components/share/SharePageTabs.tsx:269-551`, `src/lib/share/reconstruct-share-tree.ts:81-195`, `src/lib/share/aggregate-share-chart-buckets.ts:37-89`).

Comments and decisions are implemented as client-side gated interactions:
- comments require a valid recipient session, same-origin POST, CSRF headers, snapshot-version validation, sanitize/truncate, and per-recipient rate limits (`src/app/api/share/[token]/comment/route.ts:134-334`, `src/components/share/SharePageComments.tsx:38-280`).
- decisions require a valid recipient session, same-origin POST, snapshot-version validation, allowed decision types, and per-recipient rate limits (`src/app/api/share/[token]/decision/route.ts:69-241`, `src/components/share/SharePageDecision.tsx:66-280`).

Activity is split into two paths:
- a public-safe filtered activity route for recipient/public views (`src/app/api/share/[token]/activity/route.ts:27-29`, `src/app/api/share/[token]/activity/route.ts:80-265`), and
- an owner-only server action that loads the full feed including internal items (`src/lib/publication/actions.ts:1381-1386` `loadSharedLinkActivity` (gated by `requireCurrentUserContext()`), consumed in `src/components/share/SharedLinkActivityFeed.tsx:31-43`; the focus/visibility-only refresh wiring is `SharedLinkActivityFeed.tsx:74-95`).

Snapshot and security plumbing are in place:
- publication snapshot types include schema version 1 / 1.2, tree nodes, tabs, cover image, and row metadata (`src/lib/publication/types.ts:10-44`, `src/lib/publication/types.ts:51-117`),
- public-read sanitization strips unsafe/legacy data before exposure (`src/lib/publication/snapshot.ts:112-133`, `src/lib/publication/snapshot.ts:265-293`),
- and `next.config.ts` applies enforced CSP/hardening to `/share/:path*` plus security headers to share API routes (`next.config.ts:11-45`, `next.config.ts:108-152`, `next.config.ts:168-205`).

Recipient management is implemented end-to-end in the manager lane:
- list/add/resend/remove recipient actions,
- best-effort Resend dispatch,
- and owner digest triggering (`src/lib/publication/actions.ts:967-1267` recipient list/add/resend/remove; `:1339-1346` in-memory digest rate limiter; `:1526-1538` `maybeTriggerSharedLinkActivityDigest` gate; `src/components/workshop/publication/RecipientEmailComposer.tsx:16-25`, `:81-117`, `:146-260`).

## 3. Traceability matrix

| Requirement / capability | Implemented evidence | Gaps / non-working risk | Severity |
|---|---|---|---|
| Immutable public snapshot with optional password gate and access cookie | `src/app/share/[token]/page.tsx:139-170`, `src/lib/publication/actions.ts:504-565`, `src/lib/publication/security.ts:328-372` | No functional gap found. Current route still resolves snapshot, gates on password cookie, and derives a view token from snapshot version. | OK |
| Recipient session bootstrap for `?recipient=` links and subsequent session reuse | `src/app/share/[token]/page.tsx:172-209`, `src/app/api/share/[token]/session/route.ts:38-113`, `src/lib/publication/security.ts:375-510` | No functional gap found. Session cookie is additive to password access and is cleared by DELETE. | OK |
| Commenting and decision workflows bound to recipient identity, CSRF, snapshot version, and rate limits | `src/app/api/share/[token]/comment/route.ts:185-334`, `src/app/api/share/[token]/decision/route.ts:124-241`, `src/components/share/SharePageComments.tsx:57-280`, `src/components/share/SharePageDecision.tsx:82-280` | No functional gap found. Routes reject invalid session/view tokens and sanitize/truncate input. | OK |
| Manager recipient email management and resend flow | `src/components/workshop/ProjectPublicationHeader.tsx:885-900`, `src/components/workshop/publication/RecipientEmailComposer.tsx:81-117`, `src/components/workshop/publication/RecipientEmailComposer.tsx:146-260`, `src/lib/publication/actions.ts:967-1267` | No functional gap found. Recipient rows, resend rotation, and removal are present. | OK |
| Owner activity feed mounted (RUX-10) + realtime/live updates (SHF-01) | mount: `SharedLinkActivityFeed.tsx:31-43`, owner action `actions.ts:1381-1386`; refresh wiring `SharedLinkActivityFeed.tsx:74-95,175` | **RUX-10 (mount the feed) = Fixed** per [`75` §2](75_FINDING_ID_REGISTRY.md). **SHF-01 (realtime) = Open** — refresh is focus/visibility only; no WebSocket/SSE/polling/Supabase-realtime. **The two are distinct; SHF-01 is NOT closed by RUX-10's mount** (`_COORDINATION.md` §4.2). Digest trigger present but auth-gated (SEC-SHARE-06, separate). | SHF-01 = P2 (per 75 §6) |
| Receiver-side floating navigation rail / sticky section nav (SHF-02) | spec: `.ai/06_specs/proposal-package-system.md:38-46`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:152-157`; **delivered:** decisions.md:867 ("floating nav (scroll + IO)"); **then collapsed:** `src/components/share/ShareContainer.tsx:8` | **Not a missing file.** The rail was delivered 2026-05-29 then intentionally collapsed to a single-column container ("Single column only (no xl sticky-rail / grid split — that is a deferred follow-up)" — `ShareContainer.tsx:8`). This is a **deliberate deferral (decision D6)**, not architecture debt and not a fabricated `ShareFloatingTreeNav` gap. | SHF-02 = P3, Decision |
| Share route and share API security headers / CSP hardening | enforced CSP `next.config.ts:148`; hardening headers `next.config.ts:135-137`, `:142` | No functional gap found in current source. Share routes have enforced CSP and the expected hardening headers (X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy no-referrer). | OK |
| Notification / digest-throttle durability (SHF-03) | in-memory limiter `src/lib/publication/actions.ts:1339-1346` (`const digestRateLimit = new Map<string, number>()`); `:1353` skip path; source comment `:1339` already names the target ("production would use **DB row or Redis**") | In-memory only; resets on restart and is per-process. Fine for a single-node beta, but not durable for horizontal scale-out. **Durable-store target = a DB row (preferred for one-source-of-truth with the snapshot/recipient tables) or Redis** behind the existing `shouldSendDigest()` helper. | SHF-03 = P3, Decision |

## 4. Architectural findings

Severity/status here are bound to [`75_FINDING_ID_REGISTRY.md` §6](75_FINDING_ID_REGISTRY.md); the owner-decision IDs (D6/D7/D4) are in [`71_OPEN_DECISIONS_REGISTER.md`](71_OPEN_DECISIONS_REGISTER.md). Every finding below carries acceptance criteria, an exact target/test path, a runnable verification command, an owner-lane, and a binary pass/fail gate.

| ID | Severity (75) | Status (75) | Evidence | Impact | Recommendation | Owner-lane |
|---|---|---|---|---|---|---|
| SHF-01 | P2 | **Open / Decision (D7)** | `SharedLinkActivityFeed.tsx:74-95` (mount + focus/visibility refresh), `:175` ("Activity refreshes when you reopen this tab"); owner action `actions.ts:1381-1386`; spec intent `.ai/06_specs/walkthrough-shared-link-overhaul.md:117-121` | The owner feed refreshes on mount, focus, and visibility only — no realtime (WebSocket/SSE/polling/Supabase-realtime). Owners can miss new comments/decisions until they refocus the tab. **Source-verified Open per `_COORDINATION.md` §4.2; NOT closed by RUX-10 (mount).** | **D7 first:** either (a) add live updates on top of the existing owner action and public route, or (b) spec-ratify focus-refresh as intended V2. Keep the public filtered route privacy-rules unchanged either way. | Backend + owner decision |
| SHF-02 | P3 | **Decision (D6) — deferral, not debt** | delivered: decisions.md:867; collapsed: `ShareContainer.tsx:8`; receiver sub-tab UX `SharePageTabs.tsx:171` (Tree/Grid sub-tabs) | The floating rail was **built then intentionally collapsed to single column** ("no xl sticky-rail / grid split — that is a deferred follow-up"). The earlier "missing `ShareFloatingTreeNav` file" framing was a strawman and is retired. No action required unless D6 reinstates the rail. | **D6:** ratify single-column as canonical (update spec/archive to drop the rail from the contract), or schedule the rail re-introduction as a receiver-redesign item (see [`25_RECEIVER_UX_REDESIGN_BLUEPRINT.md`](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md)). | UI + owner decision |
| SHF-03 | P3 | **Decision (D4)** | in-memory limiter `actions.ts:1339-1346` (`const digestRateLimit = new Map<string, number>()`), skip path `:1353`; target named in source comment `:1339` | Digest throttle is in-process; resets on restart and does not coordinate across workers/instances. Acceptable for single-node beta; duplicates/under-throttles on scale-out. | **D4:** keep in-memory for single-process beta, OR move throttle state to a **durable store — a DB row (preferred: one source of truth alongside `project_publication_events`) or Redis** — behind the existing `shouldSendDigest()`/`triggerOwnerDigestIfAllowed()` helpers. | Infra + owner decision |
| SHF-D | P3 | **Open (docs)** | source label `ProjectPublicationHeader.tsx:661` (`label: "Estimates"`); spec/archive still "Sheets" (decisions.md:865, `walkthrough-shared-link-overhaul.md`) | Spec/archive name the 2nd manager tab "Sheets"; shipped label is "Estimates". Future audits keep misrouting against the stale name. | Rename the spec/archive copy "Sheets" → "Estimates" (internal `id:"sheets"` stays). Docs-only. | Docs |

### Acceptance criteria + verification per finding

**SHF-01 — owner-feed realtime (gated on D7)**
- Acceptance (if D7 = implement realtime): *Given* an owner has the manager activity panel open, *When* a recipient posts a new comment/decision, *Then* the new item appears in the owner feed without a manual focus/refocus or Refresh click, *And* `is_internal` visibility rules are preserved (no internal item leaks to the public `/api/share/[token]/activity` route).
- Acceptance (if D7 = ratify focus-refresh): *Given* the spec/archive, *When* read, *Then* it explicitly states focus/visibility refresh is the intended V2 behavior and removes any "realtime/live" wording; SHF-01 then moves to **Deferred** in 75.
- Target file(s): `src/components/share/SharedLinkActivityFeed.tsx`; new/updated test `src/components/share/__tests__/SharedLinkActivityFeed.test.tsx` (or the existing shared-link feed test if present).
- Verification command: `bunx vitest run src/components/share/__tests__/SharedLinkActivityFeed.test.tsx --maxWorkers=1 && bun run type-check`. Browser proof tracked in [`85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
- **Gate (binary):** PASS = D7 recorded in [`71`](71_OPEN_DECISIONS_REGISTER.md) AND the chosen branch's acceptance test is green AND `type-check` passes; FAIL otherwise. UNVERIFIED until D7 is taken — verify the current behavior with `rg -n "WebSocket|EventSource|supabase.*channel|setInterval" src/components/share/SharedLinkActivityFeed.tsx` (expect **no matches**, confirming Open).

**SHF-02 — floating-nav contract (gated on D6)**
- Acceptance (if D6 = ratify single-column): *Given* the spec/archive, *When* read, *Then* the floating-rail requirement is struck and `ShareContainer.tsx:8`'s single-column model is named canonical; SHF-02 closes as **Deferred/ratified** in 75.
- Acceptance (if D6 = reinstate rail): the rail re-intro is scheduled as a `25` redesign item with its own acceptance criteria; this finding stays a Decision pointer.
- Target file(s): docs (`.ai/06_specs/walkthrough-shared-link-overhaul.md`, `.ai/06_specs/proposal-package-system.md`) for ratify; `src/components/share/ShareContainer.tsx` + `SharePageTabs.tsx` for reinstate.
- Verification command: `rg -n "sticky-rail|grid split|deferred follow-up" src/components/share/ShareContainer.tsx` (confirms the deliberate-deferral evidence is still present at the cited anchor).
- **Gate (binary):** PASS = D6 recorded and the spec/archive reflects the decision; FAIL = the doc still treats the rail as silent debt.

**SHF-03 — durable digest throttle (gated on D4)**
- Acceptance (if D4 = durable): *Given* two worker processes/instances behind the same publication, *When* a digest-eligible event fires twice inside the 15-minute window, *Then* exactly one digest email is dispatched (throttle state shared via the DB row/Redis); *And* a process restart inside the window does not reset the throttle.
- Acceptance (if D4 = keep in-memory for beta): *Given* the beta deploy, *When* documented, *Then* the runbook ([`90_DEPLOY_AND_MIGRATION_RUNBOOK.md`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md)) records single-process deployment as a hard constraint for the throttle to hold.
- Target file(s): `src/lib/publication/actions.ts` (`digestRateLimit`/`shouldSendDigest`/`triggerOwnerDigestIfAllowed`); test `src/lib/publication/__tests__/digest-throttle.test.ts`.
- Verification command: `bunx vitest run src/lib/publication/__tests__/digest-throttle.test.ts --maxWorkers=1 && bun run type-check`.
- **Gate (binary):** PASS = D4 recorded AND (durable: the multi-instance + restart test is green) OR (beta: the single-process constraint is in `90`); FAIL otherwise.

**SHF-D — spec rename "Sheets" → "Estimates" (docs-only)**
- Acceptance: *Given* the spec/archive, *When* read, *Then* the 2nd manager tab is named "Estimates" to match the shipped label (`ProjectPublicationHeader.tsx:661`), with a one-line note that the internal id remains `"sheets"`.
- Target file(s): `.ai/06_specs/walkthrough-shared-link-overhaul.md` (+ archive references); no source change.
- Verification command: `rg -n "Sheets" .ai/06_specs/walkthrough-shared-link-overhaul.md` (expect no manager-tab "Sheets" label remaining) and `rg -n 'label: "Estimates"' src/components/workshop/ProjectPublicationHeader.tsx` (confirms source label).
- **Gate (binary):** PASS = spec label reads "Estimates" and source label unchanged; FAIL = spec still says "Sheets".

## 5. Proposed upgrade sequencing

1. Resolve the receiver-navigation contract first (decision **D6**).
   - The floating rail was delivered (decisions.md:867) then intentionally collapsed to single column (`ShareContainer.tsx:8`). Decide whether to ratify single-column as canonical (spec/archive moves) or reinstate the rail as a `25` redesign item (code moves). This is a deliberate-deferral call, not debt recovery.
   - Dependency: this choice controls whether the spec/archive or the code should move.
   - Conflict risk: any parallel UI lane touching `src/components/share/SharePageTabs.tsx`, `ShareContainer.tsx`, or the receiver dashboard can reintroduce the wrong navigation model.

2. Add realtime activity updates on top of the existing owner/public split.
   - Keep the public filtered route and the owner-only server action separate.
   - Dependency: the owner feed must preserve `is_internal` visibility rules while the public route stays privacy-filtered.
   - Conflict risk: if a lane "simplifies" the feed to one endpoint, it can leak internal comments or regress recipient visibility.

3. Promote in-memory throttling/digest state only if the deployment model needs it.
   - Dependency: this should follow the live-update decision because the same activity domain owns both notification and feed freshness.
   - Conflict risk: moving the state too early can complicate beta delivery without changing user-visible behavior.

4. Reconcile the archive/spec names with actual source ownership.
   - `ProjectPublicationHeader` currently owns the manager modal tabs; `SharePageTabs` owns the receiver estimate UI.
   - Dependency: without that mapping, future audits will keep misrouting work to the wrong file.
   - Conflict risk: documentation-only work can drift from the code if another lane is renaming the same surfaces.

## 6. Handoffs / conflicts for other lanes

- UI lane: the floating nav is **not** a missing file — it was built then deliberately collapsed to single column (`ShareContainer.tsx:8`). Resolve **D6** (ratify single-column vs reinstate rail); only on a reinstate call is this a receiver-dashboard implementation task (route via [`25`](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md)).
- Backend lane: implement or reject realtime activity updates. The current feed and notification logic are already split cleanly enough to extend without a schema rewrite.
- Infrastructure lane: decide whether digest/rate-limit state remains in-memory for beta or moves to a durable store before scale-out.
- Docs lane: update the spec/archive to reflect the current file ownership split (`ProjectPublicationHeader` for manager modal, `SharePageTabs` for receiver estimate views) if that split is intentional.
- Coordination note: I did not observe conflicting source edits in the files I inspected, but if another agent is modifying any of the share/publication files listed above, treat this report as the current-state baseline and avoid overlapping edits until the contract is settled.

