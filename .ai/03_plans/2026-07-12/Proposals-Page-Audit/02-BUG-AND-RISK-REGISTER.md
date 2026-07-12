# 02 — Bug & Risk Register: `/workshop/proposals`

Audit date: 2026-07-12. Every entry cites `file:line` evidence from current
source. Severity scale: **P1** (correctness/security/data for first users),
**P2** (real defect, degrades UX/ops), **P3** (polish/tech-debt/stale).

No fix is authorized by this register. Each entry names a recommended surface
and, where a test would help, records a `TEST_PROPOSAL` (named risk + exact
command) and **waits for explicit owner authorization** per the User Test
Authorization Gate.

Legend: `KNOWN` = recorded by the archived 2026-07-11 predecessor or
`.ai/10_state/known-issues.md`. `NEW` = surfaced/confirmed by this 2026-07-12 audit.
`DEEP` = surfaced by the round-2 deep audit (`09` privacy / `10` technical).

**Register expanded from 14 → 25 bugs** after the deep audit (privacy,
enumeration, data-integrity, observability, analytics). See `09` and `10` for
the full evidence on `DEEP` entries.

---

## P0 — blocks the proposals feature entirely

### P0-1 · Email deliverability: Cloudflare Email Sending never onboarded (nameservers on Namecheap) (`DOMAIN`, rounds 6-10)

- **Root cause (sharpened round 10 via `.ai/10_state/current-state.md`):** public nameservers for `archestimator.com` are at **Namecheap**, not Cloudflare. Cloudflare Email Sending (`send_email` binding) requires an **active Cloudflare zone** (DNS hosted on Cloudflare). The project's own evidence records: *"`wrangler email sending list` still reports no Email Sending domains/subdomains. A direct `wrangler email sending enable archestimator.com` attempt failed with Cloudflare API error `Active zone required [code: 2009]`."* So this is not merely an SPF mismatch — **the email substrate the proposals feature depends on is not production-wired.**
- **Secondary evidence (DNS 2026-07-12):** SPF → `include:spf.efwd.registrar-servers.com ~all` (Namecheap); MX → five `eforward*.registrar-servers.com` (Namecheap); DMARC → `p=none`; no DKIM. `wrangler.jsonc:28-32` declares the `EMAIL` binding but it has no backing sending domain.
- **Impact:** the proposals feature routes invitations through `sendCloudflareEmail` when `ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email`. Under that provider, **invitations cannot be sent at all** (sending domain not onboarded). Under the Resend fallback, SPF/DKIM need to be (re)verified against the current DNS. Either way, a recipient who never receives the invitation never opens the proposal, never sees the inbox. **The code can be perfect; the mail never arrives.** Defeats the entire feature for first users.
- **Fix (copy-paste-ready playbook in `20-EMAIL-DNS-FIX-PLAYBOOK.md`):** owner picks Option A (migrate DNS to Cloudflare → onboard Email Sending) or Option B (stay on Namecheap → re-enable Resend path). Exact DNS records, CLI commands, and verification steps are in `20`. No application code changes — provider is already a flag (`ARCHESTIMATOR_EMAIL_PROVIDER`).
- **Test decision:** final verification is `TEST_TASK`-gated (real send to Gmail + Outlook external inboxes).

---

## P1 — must address before first users

### P1-1 · `delivery_status='responded'` is never written (`KNOWN`)

- **Evidence:** `src/lib/publication/d1-store.ts:377` (`SET delivery_status = 'opened'`),
  `:410` (`SET delivery_status = 'opened', last_opened_at = ?`). The `responded`
  enum value is valid (`migrations/0014_publication_shared_links.sql:67`,
  `0066:167`) and the UI handles it (`RecipientEmailComposer.tsx:50,245,673-685`),
  but `submitClientResponse` (`d1-store.ts:717-823`) never writes it.
- **Impact:** Owners cannot tell from roster/digest that a recipient decided;
  inbox "Decision submitted" state relies on `shared_link_responses` only, so the
  roster `delivery_status` column is permanently misleading. Owner workflow
  ("did they respond?") is broken.
- **Blast radius:** Owner-side roster + digests; recipient inbox still shows the
  decision correctly (it reads `shared_link_responses`, not `delivery_status`).
- **Recommended surface:** `src/lib/publication/d1-store.ts` — set
  `delivery_status='responded'` in the same transaction that inserts the
  response. Maps to A3 / Slice 2 in `IMPLEMENTATION_PLAN.md`.
- **TEST_PROPOSAL (await owner authorization):** named risk = "recipient
  decision does not flip roster delivery_status to responded". Command:
  `bun run test tests/vitest/publication-d1-store.test.ts` (suite does not exist
  yet — would need creation under a `TEST_TASK`).

### P1-2 · One unmappable row blanks the entire inbox (`NEW`)

- **Evidence:** `src/lib/repositories/recipient-proposals-repository.ts:157`
  `if (rows.some((row) => row === null)) return { ok:false, error:"unknown" };`.
  `mapRecipientProposalRow` returns `null` when `normalizeStatus` returns null
  (`:62-65`), when `normalizeDecision` returns `undefined` (`:63`), or when
  `snapshotVersion` is non-finite (`:64`).
- **Trigger:** A single `shared_link_responses.decision` row containing any
  value outside `accepted|declined|revision_requested` (e.g. legacy data, a
  future enum value, a CHECK-constraint drift), OR a `project_publications.status`
  value outside `published|expired|revoked`, OR a non-numeric `snapshot_version`
  — blanks the whole inbox for that user with a generic "unknown" error and zero
  logging.
- **Impact:** One bad row → the recipient sees "Proposals could not be loaded."
  for **all** their proposals. High blast radius for first-user trust. Also a
  mute failure mode for any future schema/enum change.
- **Recommended surface:** `recipient-proposals-repository.ts` — drop bad rows
  individually (log + skip) instead of failing the whole list; reserve
  `unknown` for genuine DB errors.
- **TEST_PROPOSAL (await owner authorization):** named risk = "single corrupt
  row hides all other proposals". Command:
  `bun run test tests/vitest/recipient-proposals-repository.test.ts` (exists;
  extend under `TEST_TASK`).

### P1-3 · `normalizeDecision` return type contradicts its declared union (`NEW`)

- **Evidence:** `recipient-proposals-repository.ts:55` declares
  `function normalizeDecision(decision: string | null): RecipientProposalDecision | undefined`.
  `RecipientProposalDecision = "accepted" | "declined" | "revision_requested" | null`
  (`:8`) — it does **not** include `undefined`. The function returns `undefined`
  for any unexpected string (`:58`). The `| undefined` in the annotation is the
  only reason TypeScript permits it; the union is a lie.
- **Impact:** This is the mechanism behind P1-2. It also means the type system
  does not accurately describe the "unexpected decision" state — callers cannot
  distinguish "no decision" (`null`) from "corrupt decision" (`undefined`) except
  by the sentinel check at `:65`.
- **Recommended surface:** widen the union explicitly (e.g.
  `RecipientProposalDecision | "unknown"` or a dedicated `DecisionParseResult`)
  and handle the unknown branch explicitly (skip + log), in the same change as
  P1-2.

### P1-4 · Recipient removal leaves PII behind (`DEEP`, `09` §3.1)
- **Evidence:** `removeSharedLinkRecipient` (`actions.ts:1656-1695`) hard-deletes the `shared_link_recipients` row, but `0066` FKs are `ON DELETE SET NULL` on child tables → `shared_link_comments.author_email`/`author_name`/`body`, `shared_link_responses.signer_name`/`note`/`signature_intent_hash` all **retained**. `author_email` is `NOT NULL` (`0014:103`) so can't be blanked without schema change.
- **Impact:** a recipient who asks "delete my data" still has name, email, and signed decision in the publisher's history. Privacy/compliance gap.
- **Recommended surface:** decide policy (soft-delete + anonymize, or nullable `author_email` + purge step). Needs DEC-AUTO (see `06`).
- **TEST_PROPOSAL:** named risk = "removed recipient PII persists in comments/responses". Command: D1 inspection after removal (await `TEST_TASK`).

### P1-5 · `project_publication_events` has no retention TTL (`DEEP`, `09` §5)
- **Evidence:** `retention-core.ts:87-221` includes `shared_link_events` (90-day purge) but **not** `project_publication_events` (`0034:13-29` enum omits it). The access/password audit log grows forever.
- **Impact:** unbounded audit-log growth; inconsistent with the sibling table that IS purged.
- **Recommended surface:** add `project_publication_events` to `DEFAULT_RETENTION_RULES` mirroring `shared_link_events`. Cheapest privacy fix in the register.

### P1-6 · `openRecipientProposalAction` no rate limit + enumeration oracle (`DEEP`, `10` §5.2)
- **Evidence:** `actions.ts:304-380` has no `checkRecordedRateLimit`. Returns distinct errors: `not-a-recipient` ("doesn't exist OR not mine") vs `unavailable` ("exists, mine, revoked/expired"). Timing differs too (second SELECT at `:334-345` only runs on auth success).
- **Seeding mechanism (round-3 amplification):** valid `publicationId` UUIDs are **already in every recipient's RSC payload and DOM** — `proposals-data.tsx:12` passes `initialResult` (full rows with `publicationId`) to the client, and `ProposalRow.tsx:146` renders `<input type="hidden" name="publicationId">`. So an attacker does **not** need a "log/screenshot/URL leak" (as the round-1 register implied) — they already have their own valid IDs and can obtain others from any co-recipient. Combined with no rate limit (P2-13), the enumeration is cheaper to mount than originally stated.
- **Impact:** a logged-in user with candidate `publicationId` UUIDs can classify each as exists+mine+active / exists+mine+inactive / not-mine-or-absent. Information disclosure / enumeration.
- **Recommended surface:** (a) collapse `not-a-recipient` + `unavailable` into one generic error; (b) add a per-user/per-IP rate limit to `openRecipientProposalAction`.
- **TEST_PROPOSAL:** named risk = "distinct errors enable publication enumeration". Command: probe action with N random + 1 known UUID (await `TEST_TASK`).

### P1-7 · D1 `shared_link_responses` no unique constraint → decision race (`DEEP`, `10` §6.2)
- **Evidence:** D1 path (`d1-store.ts:760-765`) uses app-level pre-check then `INSERT`; **no DB unique constraint** on `(recipient_id, publication_id)` (`0014:149-151` non-unique). Postgres path uses `ON CONFLICT DO NOTHING` (`supabase/…/20260616…sql:220-226`). Under concurrency, two submissions can race past the pre-check → two rows → "Decision submitted" could flip.
- **Impact:** decision-integrity race; a recipient could (under concurrency) flip a recorded decision, undermining the "first decision is final" contract.
- **Recommended surface:** D1 migration `CREATE UNIQUE INDEX … ON shared_link_responses(recipient_id, publication_id) WHERE recipient_id IS NOT NULL` + make INSERT `INSERT OR IGNORE` or catch the constraint violation.
- **TEST_PROPOSAL:** named risk = "concurrent decision submission creates duplicate rows". Command: concurrent POSTs to `/api/share/[token]/decision` (await `TEST_TASK`).

---

## P2 — real defects that degrade UX/ops

### P2-1 · Silent `LIMIT 50` truncation (`KNOWN`)

- **Evidence:** `recipient-proposals-repository.ts:150,152` — `LIMIT ?` bound to
  `50`; client renders `rows` directly (`proposals-page-client.tsx:111,149`); no
  count, no "load more", no pagination control.
- **Impact:** A recipient with >50 proposals sees only the 50 most recent by
  `last_activity_at` with no indication anything is missing. For a proposals
  inbox this is a silent data-availability bug.
- **Recommended surface:** either (a) add a `truncated` flag + "Showing 50 of N"
  UI, or (b) cursor pagination. DEC-AUTO-104 in this pack chooses
  client-side filtering for V1 assuming ≤50 rows — that assumption is
  undocumented in the repo and unguarded.

### P2-2 · D1 errors swallowed with no logging (`NEW`)

- **Evidence:** `recipient-proposals-repository.ts:160-162`
  `catch { return { ok:false, error:"unknown" } }`. No `logAppError`, no
  `emitLogRecord`. The client surfaces "Proposals could not be refreshed."
  (`proposals-page-client.tsx:44`).
- **Impact:** A D1 outage, missing binding (`getCloudflareD1Database()` returns
  `null` at `:93`), or SQL error is invisible to ops. `bun run logs:debug` will
  show nothing for this path. Directly contradicts the repo's error-logging
  pilot purpose.
- **Recommended surface:** add `logAppError(error, { event:"recipient_proposals_list_failed", ... })`
  in the catch, keeping the typed `unknown` return for the client.

### P2-3 · `error.tsx` is unreachable for repo failures (`NEW`)

- **Evidence:** `listRecipientProposals` never throws — it returns
  `{ ok:false, error:"unknown" }` (`:160-162`). The RSC `ProposalsData`
  (`proposals-data.tsx`) therefore never throws into the `<Suspense>` boundary,
  so `error.tsx` (`WorkshopRouteErrorState`) only fires for an
  `requireCurrentUserContext()` redirect-throw or a React render error, not for
  data failures.
- **Impact:** The carefully-built `error.tsx`/`WorkshopRouteErrorState` surface
  is mostly dead for this page; data errors render as the in-page
  `ProposalsErrorState` instead. Not a bug per se, but a UX/observability
  mismatch worth noting — the two error surfaces (route vs in-page) are
  inconsistent and the route one is near-unreachable.
- **Recommended surface:** decide intentionally which surface owns data errors
  and document it; the current split is accidental.

### P2-4 · `responded` enum drift / `download_attempt_blocked` dropped (`KNOWN`)

- **Evidence:** `migrations/0066_publication_foreign_keys.sql:26-27,127` recreates
  the `project_publication_events.event_type` CHECK **without**
  `download_attempt_blocked`. Any code emitting that event value now fails the
  CHECK at insert.
- **Impact:** Latent break if any publication-events writer still emits
  `download_attempt_blocked`. Not exercised by the inbox, but in the same
  surface family.
- **Recommended surface:** confirm no writer emits it (`rg
  download_attempt_blocked src/`); if clean, leave the migration as-is; if any
  writer remains, fix forward. Maps to Slice 6 in `IMPLEMENTATION_PLAN.md`.

### P2-5 · Email-reuse / plus-addressing authz edge (`KNOWN`, accepted design)

- **Evidence:** `WHERE lower(recipient.email) = ?` (`recipient-proposals-repository.ts:147`).
  Scoping is by email string only — no stable `userId` join, no plus-address
  folding. `addSharedLinkRecipients` normalizes `trim().toLowerCase()`
  (`publication/actions.ts` ~`:1128`), consistent with the read.
- **Impact:** (a) `user+tag@x.com` and `user@x.com` are different recipients —
  if the IdP folds plus-tags but invite-time did not, the recipient sees zero
  proposals. (b) If an email is reassigned to a different account (email reuse),
  the new owner sees those proposals. Low likelihood pre-launch, but the only
  authz boundary is the email string.
- **Recommended surface:** documented assumption; consider matching on a stable
  recipient identity when one exists, or plus-address folding if the IdP does
  it. Defense-in-depth is intact at open time (`authorize_recipient_publication_for_current_user`).

### P2-6 · `last_activity_at` ordering relies on uniform TEXT-ISO timestamps (`NEW`)

- **Evidence:** `recipient-proposals-repository.ts:114-123` computes
  `last_activity_at = MAX(...)` over mixed TEXT columns, then `ORDER BY
  last_activity_at DESC` (`:149`). D1 stores these as TEXT.
- **Impact:** `MAX`/`ORDER BY` on TEXT ISO-8601 is only correct if every writer
  emits the same UTC format. A single non-ISO or non-UTC timestamp would
  mis-order the list. All current writers use `new Date().toISOString()`
  (UTC `Z`), so this is low-risk today, but fragile and unverified at the
  constraint level (no CHECK on timestamp format).
- **Recommended surface:** no immediate change; add a note to the repo header
  documenting the format invariant, or a CHECK constraint if a future migration
  touches these columns.

### P2-7 · Computed `status` diverges from stored `status` for auto-expiry (`NEW` → **resolved to P3, no live bug**)

- **Evidence (statically resolved 2026-07-12):** SQL CASE (`:107-111`) returns `expired` when `expires_at <= now` even if the stored `publication.status` is still `published`. **Confirmed there is no sweeper:** the three crons (`worker.ts:202,231`) run upload-jobs and the retention pass (`runRetentionPassInD1`), neither touches `project_publications.status`. The only `UPDATE … SET status = …` writes are `status = 'revoked'` (`admin-d1-client.ts:552`, on revoke) — **never `'expired'`**. Expiry is read-time-computed everywhere (`d1-store.ts:216` `status='published' AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)`).
- **Impact (re-assessed):** the originally-feared index conflict (`idx_project_publications_one_published_per_project WHERE status='published'` blocking republish) **does not occur**, because `replace_project_publication` first sets the old row to `'revoked'` (`admin-d1-client.ts:551-553`) before inserting the new one — clearing the partial unique index regardless of auto-expiry. So a `published`-but-expired row never blocks a republish.
- **Residual (P3):** the stored `status` column and the computed status disagree for auto-expired rows. This is cosmetic (no query relies on stored `status='expired'` for an auto-expired row — all read paths recompute). Document the invariant; no fix needed for beta.
- **Recommended surface:** none for beta. Optionally add a comment in `migrations/0014` noting "auto-expiry is read-time-computed; `status` column is only set to `revoked` by explicit revoke or `published`/`expired` by legacy paths."

### P2-8 · Console log path leaks un-redacted record (`DEEP`, `09` §6.2)
- **Evidence:** `logger.ts:163-177` — `const line = JSON.stringify(record); console.error(line);` serializes the **un-redacted** record to stdout/Workers Logs. `logAppError` pre-redacts, but direct `emitLogRecord({ context: { email: ... } })` calls (or fields named `to`/`recipient`) leak plaintext email.
- **Impact:** email PII can land in Cloudflare Workers observability logs.
- **Recommended surface:** one-line fix — serialize the redacted copy in `consoleAppLogger.log`.

### P2-10 · Client refresh failure emits no production signal (`DEEP`, `10` §2.3)
- **Evidence:** the React Query refresh path (`proposals-page-client.tsx:31-35,79,98-108`) catches failures client-side and shows a toast **without calling `postClientErrorReport`**.
- **Impact:** a recipient who loads the inbox but cannot refresh gets zero production signal (combines with P2-2 server-side silence).
- **Recommended surface:** add `postClientErrorReport` on the client refresh-failure path.

### P2-11 · No inbox-side analytics (`DEEP`, `10` §3.2)
- **Evidence:** GA4/Clarity mounted only on public pages via `PublicPageShell`. The proposals inbox has zero view/open/decision telemetry. The inbox → open → decision funnel is unmeasurable.
- **Impact:** GTM blind spot for a startup preparing for first users.
- **Recommended surface:** emit at least a `project_publication_events` row (or new event type) when `openRecipientProposalAction` fires + an inbox-view event.

### P2-12 · `shared_link_events` is write-dead (`DEEP`, `10` §3.3)
- **Evidence:** `insertSharedLinkEvent` is defined (`d1-store.ts:433-461`) but has **zero callers**. The per-recipient decision/comment funnel schema (`open`/`comment_add`/`accept_decision`/`decline_decision`) records nothing.
- **Impact:** cannot answer "how many recipients who opened also decided" despite the schema being designed for exactly that.
- **Recommended surface:** wire `insertSharedLinkEvent` into the decision + comment route handlers, or drop the table.

### P2-13 · `loadRecipientProposals` not rate-limited (`DEEP`, `10` §5.3)
- **Evidence:** `recipient-proposals/actions.ts:9-12` + `recipient-proposals-repository.ts:86-163` — no rate limit on the 4-join + lateral-subquery D1 query.
- **Impact:** authenticated DoS vector (bounded by LIMIT 50 + indexed, so medium-low, but unprotected).
- **Recommended surface:** add a per-user rate limit (mirror the share-surface limiters).

### P2-14 · Inbox shows multiple rows per project across versions (`DEEP`, `10` §7.3)
- **Evidence:** `recipient-proposals-repository.ts:128-150` filters `status IN ('published','expired','revoked')` but doesn't de-dupe by `project_id`. A recipient on v1 (revoked) re-invited to v2 (published) sees two rows for the same project.
- **Impact:** confusing UX; `LIMIT 50` means a heavily-republished project crowds out others.
- **Recommended surface:** either collapse to latest-per-`project_id` in SQL, or migrate recipient rows on republish. Needs DEC-AUTO (history vs latest) — closed as DEC-AUTO-112 (latest-per-project).

### P2-15 · i18n / locale — date format floats with browser locale (`ADVERSARIAL`, round 3) → **closed by DEC-AUTO-114**
- **Evidence:** no i18n framework (grep `next-intl|react-intl|i18next|formatjs` in `package.json` → empty). Root layout pins `lang="en"` (`src/app/layout.tsx:36`) app-wide. But `ProposalRow.tsx:44` uses `new Intl.DateTimeFormat(undefined, { month:"short", day:"numeric", year:"numeric" })` — `undefined` resolves to the **browser default locale**, not a fixed locale. So a US-browser recipient sees "Jul 8, 2026" while an en-PH/en-GB recipient sees "8 Jul 2026".
- **Impact:** for days 1–12, `month:"short", day:"numeric"` is genuinely ambiguous across locales (is "Jul 8" July 8 or 8 July?). On a proposals inbox where expiry/Sent dates drive urgency decisions, this is a real correctness/UX gap for a PH-targeted AEC product — not just polish. (`CurrencyInput` hardcodes `locale="en-US"` too, `src/components/ui/currency-input.tsx:30`, but the inbox shows no currency so that's a separate surface.)
- **Decision (DEC-AUTO-114):** fix to `Intl.DateTimeFormat("en", { month:"short", day:"2-digit", year:"numeric" })`. Fixed `"en"` matches the declared `lang="en"`; `day:"2-digit"` removes the 1–12 ambiguity. One-line change in `ProposalRow.tsx:44`.
- **Test decision:** `NOT_REQUIRED` (static: read the date format + locale config).

### P2-16 · Publisher version-swap leaves stale row + generic open error (`ADVERSARIAL`, round 3)
- **Evidence:** when a publisher republishes, `replace_project_publication` (`admin-d1-client.ts:548-579`) sets the old v1 row `status='revoked'` and inserts a new v2 row. The recipient's inbox still shows the stale v1 row (P2-14) until the next 30s-stale TanStack refetch. If the recipient clicks Review on the stale v1 row in that window, `openRecipientProposalAction` re-checks `isRecipientProposalPublicationAvailable` (`actions.ts:348-350`) and returns `unavailable`. The user sees "This proposal is no longer available. Contact the sender for an updated link." (`ProposalRow.tsx:68`) — **with no indication that a newer version exists or that they should refresh.**
- **Impact:** for a normal publisher operation (swapping versions mid-review), the recipient experience is confusing. `handleActionError` (`proposals-page-client.tsx:91-96`) does call `refresh()`, so the list self-heals — but there's no targeted "version was replaced" affordance. Distinct from P1-7 (decision-write concurrency) and P2-14 (duplicate rows) — this is the open-time failure mode of the same version-swap flow.
- **Recommended surface:** on `unavailable` error, surface a targeted message ("This version was replaced — refreshing to show the latest") rather than the generic "no longer available" copy, OR proactively de-dupe (DEC-AUTO-112 / A12) so the stale row isn't there to click.
- **Test decision:** `NOT_REQUIRED`.

### P2-17 · `/workshop/*` CSP is Report-Only, not enforced (`OWASP` A05, round 7)
- **Evidence:** `next.config.ts:251-257` — `/workshop/:path*` applies `Content-Security-Policy-Report-Only` (not enforced). The workshop CSP allows `script-src 'unsafe-inline' 'unsafe-eval'` (`:39`). The comment at `:242-245` documents an intentional staged rollout with **unbounded deferral** ("Enforcement is DEFERRED… coordinated with the Shared-Link CSP-nonce work").
- **Impact:** the proposals page has **no enforced CSP**. An XSS injection (if one existed) would not be blocked — the browser only reports. Defense-in-depth gap, not a live exploit.
- **Severity:** P2 (A05 Security Misconfiguration). Cross-app effort to enforce (needs CSP-nonce pipeline), not proposals-specific. **Track as known security debt.**

### P2-18 · `/workshop/proposals` not in route-budget table; no enforced perf guard (`PERF`, round 9)
- **Evidence:** `.ai/01_roadmap/27-performance-budget-and-regression-gates.md:64-70` lists budgets for `/` and `/login` only — no `/workshop/*` row. The CI perf gate (`e2e/route-transition-performance.spec.ts`) has "loose (multi-second medians)" budgets and "authenticated scenarios skip in CI without dev-auth/storage-state secrets" (`:231`).
- **Impact:** no enforced performance budget for a core workflow route. A bundle or blocking-fetch regression would not be caught by CI (which skips authed routes), and has no numeric budget to breach.
- **Severity:** P2. No live regression (route is currently small/lean), but no guard either.
- **Recommended surface:** add `/workshop/proposals` to the route-budget table (e.g. Main Bundle < 80KB gz, LCP < 2.5s authed); wire the authed-perf scenario into the CI gate or document a manual-check cadence.

---

## P3 — polish / tech debt / stale

### P3-1 · Page does not match the owner directive ("looks like the projects page") (`KNOWN`)

- **Evidence:** `rg WorkshopCollectionLayout src/components/workshop/proposals-page/
  src/components/workshop/proposals-page-client.tsx` → none. Page is a flat
  bordered table. Projects page uses `WorkshopCollectionLayout` + card grid
  (`src/components/workshop/projects-page-client.tsx`).
- **Impact:** The primary UX gap. This is the reason the active
  merged implementation plan exists. Not a "bug" in the defect sense,
  but the dominant readiness gap.
- **Recommended surface:** Slices 4–5 in `IMPLEMENTATION_PLAN.md`.

### P3-2 · Empty state is dashed-border, directive wants glass-card (`KNOWN`)

- **Evidence:** `ProposalsEmptyState.tsx` renders a dashed-border card with
  "This inbox shows proposals sent to your email address." The 2026-07-11 target
  design (`03_TARGET_UX_UI_DESIGN.md:176-184`) wants a glass-card empty state
  with secondary line "Not seeing a proposal? It may have been sent to a
  different email."
- **Impact:** Minor UX/branding mismatch.

### P3-3 · No focus-trap / keyboard nav for the proposals list (`NEW`)

- **Evidence:** `ProposalRow.tsx` renders an `<article>` per row with a `<form>`
  + submit `<Button>`. There is no `role="list"`/`role="listitem"`, no roving
  tabindex, and the grid (`md:grid-cols-[…]`) is layout-only. The Refresh
  button and per-row Review button are individually focusable but there is no
  list-level keyboard model.
- **Impact:** Minor a11y gap; screen-reader users get a sequence of articles
  without a list semantic. Tab order works; arrow-key nav does not.
- **Recommended surface:** add `role="list"` to `ProposalsList` container and
  `role="listitem"` to `ProposalRow` `<article>`; consider roving tabindex if
  the row count grows.

### P3-4 · Dead e2e contract for the share surface (`KNOWN`)

- **Evidence:** `.ai/15_Bugs/2026-06-13-shared-link-stale-doc-claims-reconciled.md:25`
  — `e2e/shared-link-receiver.spec.ts:66` asserts
  `data-testid="sticky-decision-bar"` which does not exist
  (`SharePageDecision.tsx` uses `data-share-decision-bar`). Also:
  `ShareFloatingTreeNav` is dead code (imported nowhere); live sidebar is
  `ShareEstimateTreePanel`.
- **Impact:** Not the inbox page itself, but the surface the inbox navigates
  into. Anyone relying on that e2e as recipient-flow proof is mistaken.
- **Recommended surface:** fix the e2e selector or delete the stale spec; remove
  `ShareFloatingTreeNav`. Out of scope here unless the owner asks.

### P3-9 · Mobile responsive is single-breakpoint, less polished than projects (`DEEP`, `10` §4)
- **Evidence:** `ProposalRow.tsx` uses only `md:` breakpoints (`:86,152`). No `sm:`/`lg:` ladder, no `@media(hover:none)` touch adaptation, no `content-visibility`. Compare `LiveProjectCard.tsx` which has the full ladder + touch adaptation + scroll perf.
- **Impact:** the current mobile layout works at 375px (graceful stacking), but is less polished than the projects page gold standard.
- **Recommended surface:** the redesign (`05` Track B) should adopt the `sm`/`md`/`lg` + `@media(hover:none)` ladder.

### P3-11 · No `Permissions-Policy` header anywhere (`OWASP` A05, round 7)
- **Evidence:** `rg "Permissions-Policy|Feature-Policy" next.config.ts` → none. The global catch-all (`:271-285`) sets 4 hardening headers (HSTS, X-Frame-Options, nosniff, no-referrer) but not `Permissions-Policy`.
- **Impact:** the browser allows all features (camera, microphone, geolocation, payment) by default on all routes. For an authed app surface, a `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` would be cheap defense-in-depth.
- **Severity:** P3 (no live abuse path; polish).
- **Recommended surface:** add `Permissions-Policy` to the global hardening catch-all. One-line config change.

### P3-12 · A06 vulnerable-components scan — **CLOSED (round 9)**
- `bun audit` run against `bun.lock` → **"No vulnerabilities found."** OWASP A06 is PASS. (Caveat: advisory scan, not a full SCA tool; wire Dependabot/OSV for Enterprise.)

### P3-13 · No route-segment `dynamic` config on `/workshop/proposals` (`PERF`, round 9)
- **Evidence:** `rg "export const" src/app/workshop/proposals/*.tsx` → none. No `dynamic`/`revalidate`/`fetchCache`/`runtime` directive.
- **Impact:** route is implicitly dynamic (correct for authed), but intent is undocumented. A future contributor could accidentally make it static or add a long `revalidate` serving stale authed data.
- **Severity:** P3 (guardrail; no live bug).
- **Recommended surface:** add `export const dynamic = "force-dynamic"` + a short comment to `proposals-data.tsx` documenting why (cookies/headers/D1 = always dynamic).

### P3-14 · No bundle-size CI budget (`PERF`, round 9)
- **Evidence:** `.ai/01_roadmap/27-performance-budget-and-regression-gates.md:231` explicitly notes *"No bundle-size CI budget (size-limit/bundlewatch) exists."*
- **Severity:** P3 (roadmap-tracked, cross-app, not proposals-specific).
- **Recommended surface:** wire `size-limit`/`bundlewatch` into CI with per-route chunk budgets.

---

## Privacy findings (from `09`)

The deep audit added privacy-specific risks P1-4, P1-5, P2-8 and P3-5…P3-8.
P3-5…P3-8 (DSAR erasure unimplemented; unsubscribe is soft-only; no D1 residency
config; plaintext emails at rest) are **Enterprise** classification and live in
`09-PRIVACY-AND-COMPLIANCE-AUDIT.md` §7 to keep this register focused on
actionable beta defects. They are not duplicated here.

---

## Security review (positive findings)

For completeness, the audit confirmed the following are **not** defects:

- **List authz:** scoped by `lower(recipient.email) = logged-in-email`, not
  global. `requireCurrentUserContext()` enforces authn; the repo re-resolves and
  fails closed on empty email (`:90`). ✓
- **Open authz:** independently re-gated by the
  `authorize_recipient_publication_for_current_user` D1 RPC
  (`publication/actions.ts:319-332`). A leaked `publicationId` alone grants
  nothing. ✓
- **Publisher mutations:** all gated by `requireAuth()` +
  `assertProjectPublicationManager(projectId)` (workspace/project membership). ✓
- **XLSX export audience:** `audience=internal` (supplier/pricing Source
  Breakdown sheet) only granted when `isWorkspaceMemberInD1` returns true;
  otherwise falls back to `client`. The contractor-name leak
  (`route.ts:241` → `create-proposal-workbook.ts:297`) is the one open export
  finding (`KNOWN`, RISK-008, `UNIT-016`). ✓ with one known exception.
- **Cache headers:** middleware sets `Cache-Control: private, no-cache, no-store`
  on all `/workshop/*` responses. ✓
- **Open redirect:** `redirect("/share/${token}")` uses the decrypted token from
  the DB row, not user input. ✓

## Known-red items carried from prior packs (context, not re-audited)

- **Contractor-name leak in client XLSX** (`01_AUDIT_AND_CURRENT_STATE.md:301-302`,
  RISK-008) — `route.ts:241` sets `contractorName = workspace.name`; not stripped
  by `applyAudiencePolicy`. → `UNIT-016`.
- **No `error.tsx` under `src/app/share/`** (`01_AUDIT:304-305`) — `UNIT-012`.
- **Open git-history security findings** (`known-issues.md:130,155-156`) —
  committed share token + client proposal in history; require non-destructive
  redaction or authorized history purge. Out of scope for this code audit.
