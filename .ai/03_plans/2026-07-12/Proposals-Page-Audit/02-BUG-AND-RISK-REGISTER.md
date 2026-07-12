# 02 — Bug & Risk Register: `/workshop/proposals`

Audit date: 2026-07-12. Every entry cites `file:line` evidence from current
source. Severity scale: **P1** (correctness/security/data for first users),
**P2** (real defect, degrades UX/ops), **P3** (polish/tech-debt/stale).

No fix is authorized by this register. Each entry names a recommended surface
and, where a test would help, records a `TEST_PROPOSAL` (named risk + exact
command) and **waits for explicit owner authorization** per the User Test
Authorization Gate.

Legend: `KNOWN` = already recorded in `.ai/03_plans/2026-07-11/Proposals-Feature/`
or `.ai/10_state/known-issues.md`. `NEW` = surfaced/confirmed by this 2026-07-12 audit.

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
  response. Maps to `UNIT-014` in the active pack.
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
  UI, or (b) cursor pagination. DEC-AUTO-003 in the active pack chose
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
  writer remains, fix forward. Maps to `UNIT-008` in the active pack.

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

### P2-7 · Computed `status` diverges from stored `status` for auto-expiry (`NEW`)

- **Evidence:** SQL CASE (`:107-111`) returns `expired` when
  `expires_at <= now` even if the stored `publication.status` is still
  `published`. The stored row is not updated to `expired` by the read path.
- **Impact:** The UI shows "Expired" but the DB row is still `published`. Any
  downstream query that filters on `status='published'` (e.g. the partial unique
  index `idx_project_publications_one_published_per_project WHERE status='published'`)
  will still treat it as published. There is no background sweeper observed that
  flips `published`→`expired` at `expires_at`. Could block re-publishing a new
  proposal for the same project if the old one expired but was never swept.
- **Recommended surface:** confirm whether a cron sweeps expired publications;
  the bound crons (`0/15/30 3 * * *` in `wrangler.jsonc`) are candidates. If no
  sweeper, add one or relax the partial unique index. Needs runtime confirmation
  (out of scope for a static audit).

---

## P3 — polish / tech debt / stale

### P3-1 · Page does not match the owner directive ("looks like the projects page") (`KNOWN`)

- **Evidence:** `rg WorkshopCollectionLayout src/components/workshop/proposals-page/
  src/components/workshop/proposals-page-client.tsx` → none. Page is a flat
  bordered table. Projects page uses `WorkshopCollectionLayout` + card grid
  (`src/components/workshop/projects-page-client.tsx`).
- **Impact:** The primary UX gap. This is the reason the active
  `2026-07-11/Proposals-Feature` pack exists. Not a "bug" in the defect sense,
  but the dominant readiness gap.
- **Recommended surface:** the active pack (`UNIT-001…016`).

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
