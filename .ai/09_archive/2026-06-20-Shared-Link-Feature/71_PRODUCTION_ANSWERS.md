# 71-PA — Production-Grade Answers to the Open Decision Register

Date: 2026-06-21 · Status: **RESOLVED — owner-ratified by Philip**

> Companion to [`71_OPEN_DECISIONS_REGISTER.md`](71_OPEN_DECISIONS_REGISTER.md). Where 71 states the
> decision question, this document gives the **production-grade answer** for each of D1-D11. Philip
> ratified these verdicts on 2026-06-21 as the beta ship contract with the GA backlog items recorded.
> Every answer is grounded in a codebase audit performed 2026-06-21
> (three parallel explore passes against `src/app/api/share/[token]/*`, `src/lib/publication/*`,
> `src/components/share/*`, `src/components/workshop/ProjectPublicationHeader.tsx`, and all 14
> publication-domain migrations under `supabase/migrations/`), plus the threat model
> ([12](12_THREAT_MODEL_STRIDE.md)), DPIA ([13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md)),
> receiver blueprint ([25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md)), manager blueprint
> ([35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md)), deploy runbook
> ([90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md)), and observability plan
> ([92](92_OBSERVABILITY_AND_ALERTING.md)).

## How to read this document

Each decision carries:

- **Current code (verified)** — what the source actually does today, with `file:line` anchors from the 2026-06-21 audit.
- **Production verdict** — the answer, not the MVP-tier default.
- **Why** — reasoning grounded in code, threat model, or product strategy.
- **Implementation** — concrete files + changes (no vapor).
- **Verification gate** — binary pass/fail check.
- **Blast radius** — what else moves.
- **Beta vs GA** — whether this gates beta or is a GA-backlog item.

The verdicts are written so that ratifying them produces a closed beta whose security, privacy, and trust pillars are GA-grade, with only scale features (realtime, durable throttle at multi-node scale, full legal e-signature) deferred to GA.

---

## D1 — Should a content-only republish force the recipient to reload before commenting/deciding?

**Current code (verified):**
- Route layer rejects stale writes: `src/app/api/share/[token]/comment/route.ts:227-245` and `src/app/api/share/[token]/decision/route.ts:201-221` return 409 when `viewedSnapshotVersion !== access.snapshotVersion`.
- DB RPC layer also rejects: `insert_client_comment` and `submit_client_response` both enforce `is distinct from p_expected_snapshot_version` (migration `20260620142000_restore_shared_link_snapshot_equality_lock.sql:8-131`).
- **No stale-snapshot banner exists in the receiver UI.** The only user-facing stale/conflict copy in `src/components/share/` is `SharePageDecision.tsx:243-247` ("Decision already recorded. Reload to view the saved response.") and `SharedLinkActivityFeed.tsx:175` ("Activity refreshes when you reopen this tab. Use Refresh for the latest.").
- Hard reloads exist only for auth/session flows: `ProjectPublicationPasswordForm.tsx:34-36` and `SharePageSessionBanner.tsx:20-23`.

**Production verdict:** **Keep the 409 + RPC equality lock (SEC-SHARE-01 is the trust pillar — never weaken it). Add a non-destructive stale-snapshot banner that preserves scroll position AND drafted comment text. The 409 response must return the current snapshot version so the client can re-fetch without losing context.**

**Why:**
- The 409 is the correctness guarantee that a decision is made against the proposal the client actually saw. Without it, a client could approve old content after a manager republished — the feature's core promise breaks ([05](05_PRODUCT_STRATEGY_BRIEF.md) §8: "SEC-SHARE-01 is the keystone").
- But a hard reload is hostile to a reading client: a recipient 200 rows deep in the estimate who drafted a comment loses their scroll position and their draft when the manager republishes. The [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) §6 verdict is that a reading client "must not be yanked."
- The production-grade resolution is **stale-while-revalidate for the snapshot, draft-preserve for the comment form**. The client sees a calm banner ("This proposal was updated — tap to see the latest"), the drafted comment is persisted to `sessionStorage`, and after refresh the draft is restored and the new snapshot is rendered with a "you're viewing the latest" confirmation.

**Implementation:**
- `src/app/api/share/[token]/comment/route.ts:227-245` and `decision/route.ts:201-221`: change the 409 body from a plain message to `{ error: "Publication snapshot changed", currentSnapshotVersion: <n>, currentViewToken: <signed> }` so the client can re-fetch and re-validate in one round-trip.
- `src/components/share/SharePageComments.tsx`: on 409, persist `commentDraft` to `sessionStorage["share:commentDraft:" + tokenDigest]`; show a banner with a "See the latest" button; on refresh, restore the draft into the textarea.
- `src/components/share/SharePageDecision.tsx`: on 409, show the same banner; the decision is one-shot so the draft is the intent, not the submission — preserve the selected decision type + note.
- New `src/components/share/ShareStaleSnapshotBanner.tsx`: a calm, non-blocking banner that respects `proposalPaper` typography, sits below the masthead, and is keyboard-dismissible.
- `tests/vitest/project-publication-comments.test.tsx` + `project-publication-decision.test.tsx`: add 409-body contract test (asserts `currentSnapshotVersion` in response) and draft-preservation test (asserts `sessionStorage` write + restore).

**Verification gate:**
- `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx tests/vitest/security-findings-publication-contracts.test.ts --maxWorkers=1` exits 0.
- `rg -n "window.location.reload" src/components/share` returns only the two auth/session reloads (password unlock, session clear) — no new reloads for stale-snapshot.
- `rg -n "currentSnapshotVersion" src/app/api/share/[token]/comment/route.ts src/app/api/share/[token]/decision/route.ts` returns the 409 body field.

**Blast radius:** `comment/route.ts`, `decision/route.ts`, `SharePageComments.tsx`, `SharePageDecision.tsx`, new `ShareStaleSnapshotBanner.tsx`, and the two test files. No schema change. No migration.

**Beta vs GA:** **Beta gate.** Ship with the banner + draft-preserve. The 409 + equality lock is already fixed; the UX softening is the last piece.

---

## D2 — Expose exact `project.location` (address/GPS) to anyone with the link?

**Current code (verified):**
- `src/lib/publication/snapshot.ts` builds `ProjectPublicationSnapshot["project"]` with `id`, `name`, `projectCode`, `clientName`, `location`, `currencyCode`, optional `coverImageUrl` (types at `src/lib/publication/types.ts:103-117`).
- `project.location` is rendered verbatim at `src/components/share/SharePageProposalHeader.tsx:11` (confirmed: line 11 is `project.location,` in the JSX).
- `sanitizeProjectPublicationSnapshotForPublicRead` (`snapshot.ts:112-133`) normalizes image URLs only; it does **not** touch `location`.
- **No per-publication location-privacy column exists.** Audit found zero matches for `location_visibility`, `location_exposure`, `expose_location`, `show_address`, or `location_precision` across all 14 publication-domain migrations.
- No GPS/lat-long field is in the snapshot type today (verified: `types.ts:103-112` has no coordinate field).

**Production verdict:** **Add a per-publication `location_visibility` enum (`exact` | `locality` | `hidden`) with default `locality`. The manager picks the precision at publish time in the Access tab. The snapshot stores both the exact location and the visibility flag; the public sanitization layer truncates based on the flag. Never add GPS/lat-long to the snapshot type.**

**Why:**
- A bearer-link is a capability token — anyone with the URL reads. Exact site GPS for a private residence or an undisclosed commercial site is a privacy leak with no product benefit to the client (the client already knows where their project is; the contractor is the one who needs to redact for forwarded links).
- The DPIA ([13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) §2, SEC-SHARE-07) rules this as a P3 Decision: "Exact site address can be sensitive (private residence, undisclosed site)."
- Default `locality` (city/region) is the safe default; `exact` is an explicit manager opt-in for commercial projects where the address is the point (e.g. a retail fit-out where the client wants to see the location).
- `hidden` is the escape hatch for NDAs / undisclosed sites.
- This is a 2-line DB change + 4-line sanitization change + 1 toggle in the manager modal — small diff, large privacy uplift.

**Implementation:**
- `supabase/migrations/<new>_project_publication_location_visibility.sql`:
  ```sql
  alter table public.project_publications
    add column if not exists location_visibility text not null default 'locality'
    check (location_visibility in ('exact','locality','hidden'));
  -- Backfill existing rows to 'locality' (safe default; managers can opt up to 'exact' if needed).
  update public.project_publications set location_visibility = 'locality' where location_visibility is null;
  ```
- `src/lib/publication/types.ts`: add `locationVisibility: "exact" | "locality" | "hidden"` to `ProjectPublicationSnapshot["project"]`.
- `src/lib/publication/snapshot.ts`: `buildProjectPublicationSnapshot` captures both `location` (exact, from project) and `locationVisibility` (from publication row).
- `src/lib/publication/snapshot.ts:sanitizeProjectPublicationSnapshotForPublicRead`: truncate `location` based on `locationVisibility`:
  - `exact` → as-is.
  - `locality` → strip to last 1–2 comma segments (e.g. "123 Main St, Quezon City, Metro Manila" → "Quezon City, Metro Manila").
  - `hidden` → `null` (field omitted from DTO).
- `src/lib/publication/actions.ts`: `createProjectPublication` and `republishProjectPublication` accept `locationVisibility` from the manager and persist it.
- `src/components/workshop/ProjectPublicationHeader.tsx`: Access tab gets a 3-segment toggle ("Exact address" / "City/area" / "Hidden") with a privacy warning when "Exact address" is selected for a project whose location looks residential.
- `src/components/share/SharePageProposalHeader.tsx:11`: render `project.location` only if non-null (already the case, but now `hidden` produces null).
- `tests/vitest/project-publication-snapshot.test.ts`: add three cases — `exact` preserves full string, `locality` truncates to last 2 comma segments, `hidden` omits field.
- `tests/vitest/project-publication-actions.test.ts`: assert the manager's `locationVisibility` choice is persisted and round-tripped.

**Verification gate:**
- `bunx vitest run tests/vitest/project-publication-snapshot.test.ts tests/vitest/project-publication-actions.test.ts --maxWorkers=1` exits 0.
- `rg -n "location_visibility" supabase/migrations/<new>_project_publication_location_visibility.sql` returns the column add.
- `rg -n "lat|lng|gps|latitude|longitude" src/lib/publication/types.ts` returns zero matches (coordinate prohibition preserved).
- Provider probe: `select location_visibility, count(*) from project_publications group by 1;` shows all rows have a non-null value after migration.

**Blast radius:** One new migration, `snapshot.ts` (build + sanitize), `types.ts`, `actions.ts` (create + republish), `ProjectPublicationHeader.tsx` (Access tab toggle), `SharePageProposalHeader.tsx` (null-safe render), two test files. No RLS change (column is manager-set, not recipient-written).

**Beta vs GA:** **Beta gate.** This is a privacy pillar — ship before external recipients see links. The default `locality` is safe-by-default; managers can opt up to `exact` per publication.

---

## D3 — Expose `clientName` + totals + public DB UUIDs on the bearer-link page?

**Current code (verified):**
- **OG preview leak is fixed** (SEC-SHARE-10): `src/app/share/[token]/page.tsx:255-295` `generateMetadata` returns generic metadata for both password-protected (`"This proposal is password protected."`) and public (`"A client proposal is available for review."`) links. No totals, no clientName, no snapshot resolution in the metadata path.
- **In-page `clientName` + totals are exposed by design** — `SharePageProposalHeader.tsx:8-12` renders `clientName`, `projectCode`, `location`; `SharePageSummaryCard.tsx:41-65` renders the grand total. This is the proposal's whole purpose ([13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) §2: "the proposal's whole purpose is to show the client the price").
- **Raw public DB UUIDs are exposed in the snapshot DTO and DOM** — `project.id`, `estimate.id`, `row.id`, `node.id`, `tab.id` are copied verbatim into the snapshot at `snapshot.ts:73,142,194,253` and rendered in the receiver DOM. The public snapshot route returns `publicationId: publication.publicationId` (the raw `project_publications.id`) at `src/app/api/share/[token]/route.ts:75-80`.
- Recipient UUIDs are NOT exposed publicly (verified — recipient ids stay server-side / signed-cookie-side).
- Comment/decision responses return inserted row ids (not recipient ids).

**Production verdict:** **Keep `clientName` + totals on the page (intended proposal context). Keep OG generic (already fixed). Replace raw public DB UUIDs with per-snapshot opaque ids using the `act_…` pattern already in use at `src/app/api/share/[token]/activity/route.ts:57`. The opaque-id map is built server-side at snapshot time; the client never sees a raw `projects.id` / `estimate.id` / `row.id`.**

**Why:**
- `clientName` + totals are the proposal. Redacting them defeats the feature ([13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) §2: "In-page redaction not recommended (defeats the proposal)").
- Raw UUIDs are "not secrets" (no auth derives from them) but they leak internal record structure and enable cross-referencing if any other surface ever keys on a raw project UUID. The DPIA ([13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) §2, AC-PRIV-03) rules this as a D3 decision with a redaction fallback: "hash ids per snapshot (e.g. `act_…` pattern already used at `activity/route.ts:57`) so no raw `projects.id` reaches the DOM."
- The `act_…` pattern is already proven in the activity route — extending it to the snapshot DTO is a mechanical change, not a new architecture.
- This is defense-in-depth: even if a future surface accidentally keys on a raw UUID, the public bearer-link surface does not expose it.

**Implementation:**
- `src/lib/publication/snapshot.ts`: at `buildProjectPublicationSnapshot` time, generate a per-snapshot `idSalt` (16-byte random, stored in the snapshot DTO as `idSalt` — NOT secret, just a per-snapshot namespace). Build an `opaqueIdMap: Map<rawUuid, opaqueId>` where `opaqueId = base64url(idSalt + rawUuid)` truncated to 12 chars, prefixed by entity kind: `proj_<n>`, `est_<n>`, `row_<n>`, `node_<n>`, `tab_<n>`. Replace all raw UUIDs in the snapshot DTO with their opaque equivalents.
- `src/lib/publication/types.ts`: change all `id: string` fields on `Project`, `PublicationSnapshotEstimate`, `PublicationSnapshotRow`, `PublicationSnapshotTreeNode`, `PublicationSnapshotEstimateTab` to `id: OpaqueId` (a branded string type).
- `src/app/api/share/[token]/route.ts:75-80`: return `publicationId: opaqueIdMap.get(publication.id)` instead of the raw UUID.
- `src/app/api/share/[token]/comment/route.ts` and `decision/route.ts`: accept opaque `estimateId` / `rowId` in the request body; reverse-map to raw UUIDs via the snapshot's `opaqueIdMap` before calling the RPC. The RPC still receives raw UUIDs (no RPC signature change).
- `src/components/share/*`: consume opaque ids everywhere (DOM keys, data attributes, comment/decision payloads). No component should reference a raw UUID.
- `src/lib/publication/public-repository.ts`: the `activity_target_labels_json` lookups already use raw UUIDs internally; the public boundary translates opaque↔raw.
- `tests/vitest/project-publication-snapshot.test.ts`: assert no raw UUID pattern (`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`) appears in the serialized snapshot JSON.
- `tests/vitest/project-publication-route.test.ts`: assert the public snapshot response's `publicationId` matches `proj_<n>` not a raw UUID.
- `tests/vitest/share-no-store-invariants.test.ts`: add a DOM-level grep that no element attribute or text node in the rendered receiver contains a raw UUID.

**Verification gate:**
- `bunx vitest run tests/vitest/project-publication-snapshot.test.ts tests/vitest/project-publication-route.test.ts tests/vitest/share-no-store-invariants.test.ts --maxWorkers=1` exits 0.
- `rg -nE "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" src/components/share/` returns zero matches (no raw UUIDs in receiver source).
- Provider probe: `select snapshot_json::text from project_publications where status='published' limit 1;` — the snapshot JSON contains `proj_`, `est_`, `row_` prefixes, no raw `projects.id` UUID.

**Blast radius:** `snapshot.ts` (build + opaque map), `types.ts` (branded `OpaqueId` type), `route.ts` (publicationId), `comment/route.ts` + `decision/route.ts` (opaque→raw reverse-map), all `src/components/share/*` (consume opaque ids), three test files. No migration (opaque ids are built at snapshot time, not stored). No RPC signature change (RPCs still receive raw UUIDs server-side).

**Beta vs GA:** **Beta gate.** Ship before external recipients see links. The opaque-id layer is a one-time change that makes the bearer surface structurally incapable of leaking internal record structure.

---

## D4 — In-memory vs durable digest/rate-limit/lockout throttle for beta?

**Current code (verified):**
- Owner digest throttle is in-memory: `src/lib/publication/actions.ts:1340-1350` — `const digestRateLimit = new Map<string, number>(); const DIGEST_RATE_LIMIT_MS = 15 * 60 * 1000;`. Resets on process restart; per-process (no cross-worker coordination).
- Password lockout is in-memory: `src/lib/publication/security.ts:513-589` — `const passwordAttemptStore = new Map<string, PasswordAttemptRecord>();` with 5 attempts per IP+token in a 1h window, 15min lock, progressive delays `[1000, 2000, 4000, 8000, 16000, 30000]`. Resets on restart; per-process.
- Durable rate limiting partially exists: `public.security_rate_limit_events` table (migration `20260601003000_security_rate_limit_events.sql`) is used by durable rate-limit helpers in `src/lib/publication/public-repository.ts` for comment/decision/session-start limits.
- No `digest_throttle` or `lockout` table exists (verified — only `security_rate_limit_events`).

**Production verdict:** **For closed beta: accept in-memory with single-node topology as a RECORDED hard precondition, AND immediately extend the existing `security_rate_limit_events` table to cover digest throttle and password lockout so the durable layer is ready before GA. Do not ship GA without the durable layer live. The single-node assumption must be recorded in the deploy runbook and the observability plan.**

**Why:**
- In-memory throttle is acceptable for a single-node closed beta (SHF-03, [60](60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md) §4: "Acceptable for single-node beta; duplicates/under-throttles on scale-out").
- But the durable layer is cheap to build now because `security_rate_limit_events` already exists with the right shape (scope, key, expires_at). Extending it to cover digest throttle and password lockout is a small, mechanical change.
- The production-grade path avoids the " GA rewrite" trap: if the durable layer is built now, GA scale-out is a config flag, not a schema migration + code rewrite.
- The single-node precondition must be recorded so a future deploy that adds a second worker does not silently break the throttle (the [92](92_OBSERVABILITY_AND_ALERTING.md) §4 caveat: "Any horizontal scale invalidates §2.5 thresholds until throttles move to DB/Redis").

**Implementation:**
- `supabase/migrations/<new>_durable_throttle_lockout.sql`:
  ```sql
  -- Extend security_rate_limit_events to cover digest throttle and password lockout.
  -- The table already has (scope, key, expires_at); add two new scopes:
  --   'publication_digest' — key = publication_id::text, expires_at = now() + 15 min
  --   'publication_password_lockout' — key = ip_hash || ':' || publication_id::text, expires_at = now() + 15 min
  -- No schema change needed; the scopes are data, not columns.
  -- Add an index for the new scopes:
  create index if not exists security_rate_limit_events_scope_key_idx
    on public.security_rate_limit_events (scope, key) where expires_at > now();
  ```
- `src/lib/publication/actions.ts`: replace `digestRateLimit` Map with a `tryAcquireDigestThrottle(publicationId)` helper that does `insert into security_rate_limit_events (scope, key, expires_at) values ('publication_digest', $1, now() + interval '15 minutes') on conflict do nothing returning 1;` — if the insert returns a row, the throttle is acquired; if it returns nothing, the throttle is already held.
- `src/lib/publication/security.ts`: replace `passwordAttemptStore` Map with a `recordPasswordFailure(publicationId, ipHash)` helper that inserts into `security_rate_limit_events` with scope `publication_password_lockout` and a 15-min expiry after 5 failures; `isPasswordLocked(publicationId, ipHash)` selects `where expires_at > now()`.
- Keep the in-memory progressive-delay logic (`getProgressiveDelayMs`) as a first-line defense (no DB round-trip for the first 4 attempts), but the durable layer is the source of truth for the lock state.
- `src/lib/publication/public-repository.ts`: add `tryAcquireDigestThrottle`, `recordPasswordFailure`, `isPasswordLocked`, `recordPasswordSuccess` (clears the lockout row).
- `.ai/03_plans/2026-06-20-Shared-Link-Feature/90_DEPLOY_AND_MIGRATION_RUNBOOK.md` §7 Go/No-Go: add a row "Single-node topology recorded" with owner REL + DBA.
- `.ai/03_plans/2026-06-20-Shared-Link-Feature/92_OBSERVABILITY_AND_ALERTING.md` §4: record that the durable layer is live; the single-node caveat applies only to the in-memory progressive-delay first-line.

**Verification gate:**
- `bunx vitest run tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-route.test.ts --maxWorkers=1` exits 0 (digest still fires once per 15-min window).
- New test `tests/vitest/durable-throttle.test.ts`: two concurrent `tryAcquireDigestThrottle(pubId)` calls → exactly one returns a row; restart the test process mid-window → throttle still holds (durable).
- New test `tests/vitest/durable-password-lockout.test.ts`: 5 failures → `isPasswordLocked` returns true; restart → still locked; 15 min later → unlocked.
- Provider probe: `select scope, count(*) from security_rate_limit_events where scope in ('publication_digest','publication_password_lockout') group by 1;` returns rows after a seeded test.

**Blast radius:** One new migration, `actions.ts` (digest helper), `security.ts` (lockout helpers), `public-repository.ts` (new DB helpers), `90` (topology row), `92` (durable-layer note), two new test files. No RLS change (service-role only).

**Beta vs GA:** **Beta: accept in-memory with single-node recorded precondition. GA: durable layer must be live.** The durable layer is built now (not deferred) so GA is a config flag, not a rewrite.

---

## D5 — Cross-origin session DELETE + unsubscribe POST with absent Origin: allow or block?

**Current code (verified):**
- `src/app/api/share/[token]/session/route.ts:109-118` (DELETE handler): **no `assertSameOrigin`, no CSRF, no auth check.** Any cross-origin page can clear a recipient's session cookie (forced logout / nuisance). Low impact (no data exposure).
- `src/app/api/share/[token]/unsubscribe/route.ts:70-73` (POST handler): uses `assertSameOrigin(request)` which **allows absent Origin** (`security.ts:346-348` — the `if (!origin) return { ok: true }` branch). No CSRF pair, no rate limit. A no-Origin POST (or forged form) can unsubscribe a known token. Impact: email suppression only for a known publication+recipient token; no data exposure / proposal mutation.
- `assertSameOriginPublicPost` (the stricter variant used by comment/decision/session-POST) requires Origin + CSRF pair; `assertSameOrigin` (the weaker variant used by unsubscribe POST) does not.

**Production verdict:** **Add a same-origin guard to BOTH. This is free, consistent with the rest of the public-write surface, and closes the last two CSRF-shaped gaps on the bearer surface. For unsubscribe, also add a CSRF nonce in the GET interstitial that must match the POST, plus a durable rate limit. For session DELETE, require Origin + CSRF pair (mirror of `assertSameOriginPublicPost` but for DELETE).**

**Why:**
- The threat model ([12](12_THREAT_MODEL_STRIDE.md) §3, D5 family) rules these as "low impact" but "free to close." The production-grade answer is: if it's free and consistent, close it.
- Session DELETE without same-origin is a logout-CSRF — a cross-origin page can force-logout a recipient mid-review. The impact is nuisance + possible comment-loss (if the recipient was mid-draft when their session was cleared). Closing it is one line.
- Unsubscribe POST without Origin/CSRF is an email-suppression abuse vector — a forged form can mass-unsubscribe a known recipient token. The impact is notification suppression (the recipient stops getting digest emails) — not data exposure, but it degrades the owner's awareness signal. Closing it is a CSRF nonce + rate limit.
- The [12](12_THREAT_MODEL_STRIDE.md) §5 residual table lists both as "accepted for beta" — the production answer is to NOT accept them, because the fix is free.

**Implementation:**
- `src/lib/publication/security.ts`: add `assertSameOriginPublicDelete(request)` — mirror of `assertSameOriginPublicPost` but for DELETE method. Require Origin header + same-origin + CSRF pair (the CSRF token is already in the session cookie; DELETE re-validates it).
- `src/app/api/share/[token]/session/route.ts:109-118`: add `const sameOrigin = assertSameOriginPublicDelete(request); if (!sameOrigin.ok) return new Response(sameOrigin.body, { status: 403 });` at the top of the DELETE handler.
- `src/app/api/share/[token]/unsubscribe/route.ts:47-63` (GET interstitial): generate a CSRF nonce, embed it in the interstitial form as a hidden input, and set it as a `unsubscribe_csrf` HttpOnly SameSite=Lax cookie.
- `src/app/api/share/[token]/unsubscribe/route.ts:69-73` (POST): replace `assertSameOrigin` with `assertSameOriginPublicPost` (requires Origin + CSRF pair); validate the form's CSRF nonce against the cookie; add `checkUnsubscribeRateLimit(recipientToken)` (durable, 5/min per recipient token).
- `src/components/share/*` (unsubscribe interstitial): the interstitial form already POSTs; add the hidden CSRF nonce input.
- `tests/vitest/project-publication-route.test.ts`: add DELETE same-origin test — cross-origin DELETE → 403; absent-Origin DELETE → 403; valid same-origin DELETE → 200.
- `tests/vitest/share-unsubscribe-interstitial.test.ts`: add CSRF nonce test — POST without nonce → 403; POST with wrong nonce → 403; POST with valid nonce + same-origin → 200; absent-Origin POST → 403.
- `tests/vitest/security-findings-publication-contracts.test.ts`: add the rate-limit test for unsubscribe.

**Verification gate:**
- `bunx vitest run tests/vitest/project-publication-route.test.ts tests/vitest/share-unsubscribe-interstitial.test.ts tests/vitest/security-findings-publication-contracts.test.ts --maxWorkers=1` exits 0.
- `rg -n "assertSameOriginPublicDelete" src/lib/publication/security.ts src/app/api/share/[token]/session/route.ts` returns the new helper + its call site.
- `rg -n "assertSameOrigin\b" src/app/api/share/[token]/unsubscribe/route.ts` returns zero matches (replaced with `assertSameOriginPublicPost`).
- `rg -n "unsubscribe_csrf" src/app/api/share/[token]/unsubscribe/route.ts` returns the nonce set + validate lines.

**Blast radius:** `security.ts` (new helper), `session/route.ts` (DELETE guard), `unsubscribe/route.ts` (CSRF nonce + rate limit + stricter origin check), unsubscribe interstitial component (hidden nonce input), three test files. No schema change (rate limit uses existing `security_rate_limit_events`).

**Beta vs GA:** **Beta gate.** Ship before external recipients. The fix is free and closes the last two CSRF-shaped gaps.

---

## D6 — Floating navigation rail vs single-column document as the canonical receiver nav?

**Current code (verified):**
- `src/components/share/ShareContainer.tsx:8` explicitly says: `Single column only (no xl sticky-rail / grid split — that is a deferred follow-up).`
- `src/components/share/SharePageTabs.tsx` uses horizontal `role="tablist"` strips (around lines 481-506, 529-563, 578-608) — not a floating rail. There is a desktop-only internal sidebar inside the tree/collated view (`hidden lg:flex lg:w-[260px]` at line 738), but it is not a persistent floating rail at the page level.
- The rail was delivered 2026-05-29 (`.ai/10_state/decisions.md:867` — "floating nav (scroll + IO)") then intentionally collapsed to single column.
- The [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) redesign is single-column by design — a document, not a dashboard.

**Production verdict:** **RESOLVED: ratify single-column document as canonical for V2. Update the specs/archive to strike the floating-rail requirement so it is not treated as debt. The rail is not reinstated unless a future owner decision explicitly calls for it.**

**Why:**
- The [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) §6 verdict is explicit: "V2 removes client-visible activity entirely... single-column document is canonical; no floating rail."
- The rail was a V1-era navigation model that assumed the receiver was a dashboard. The redesign re-registers the surface as a document — a document does not need a floating rail; it needs a narrative spine.
- Treating the rail as "deferred debt" creates a false obligation. The production answer is to ratify its absence as canonical so future audits do not keep re-surfacing it.
- The [60](60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md) §4 finding SHF-02 is already classified as "Decision (deferral, not debt)" — this answer promotes that to "Resolved (ratified)."

**Implementation:**
- `.ai/06_specs/walkthrough-shared-link-overhaul.md`: strike "floating navigation rail with IntersectionObserver behavior" from the V2 contract; replace with "single-column document with horizontal tab strips for estimate navigation; no floating rail."
- `.ai/06_specs/proposal-package-system.md`: strike the same requirement.
- `.ai/10_state/decisions.md:867`: add a note: "Floating nav rail collapsed to single column on 2026-05-29; ratified as canonical for V2 on 2026-06-21 (D6). The rail is not debt and is not reinstated unless a future owner decision explicitly calls for it."
- `.ai/03_plans/2026-06-20-Shared-Link-Feature/75_FINDING_ID_REGISTRY.md` §6: change SHF-02 status from "Decision (deferral, not debt)" to "Resolved (ratified single-column)."
- `.ai/03_plans/2026-06-20-Shared-Link-Feature/60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md` §4: close SHF-02 as Resolved.
- `.ai/03_plans/2026-06-20-Shared-Link-Feature/70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md`: update SHF-02 row to Resolved.

**Verification gate:**
- `rg -n "floating nav|sticky-rail|floating navigation rail" .ai/06_specs/walkthrough-shared-link-overhaul.md .ai/06_specs/proposal-package-system.md` returns zero requirement hits (historical mentions are fine if clearly marked as superseded).
- `rg -n "Deferred|Decision" .ai/03_plans/2026-06-20-Shared-Link-Feature/75_FINDING_ID_REGISTRY.md | rg "SHF-02"` returns "Resolved (ratified single-column)".
- `rg -n "Single column only" src/components/share/ShareContainer.tsx` returns the line 8 comment (still present as the canonical contract).

**Blast radius:** Docs-only. No source change. No migration. No test change. The single-column implementation is already canonical in code; this answer ratifies it in the specs.

**Beta vs GA:** **Beta gate (docs-only).** Ratify before beta so the spec/archive does not contradict the shipped surface.

---

## D7 — Realtime owner activity feed vs focus/visibility refresh?

**Current code (verified):**
- `src/components/share/SharedLinkActivityFeed.tsx:81-95` adds `window.addEventListener("focus", handleFocus)` and `document.addEventListener("visibilitychange", handleVisibility)` with a comment: `Refresh on window focus / tab visible — no always-on interval, no background load`.
- **No realtime subscription.** Verified: zero matches for `WebSocket`, `EventSource`, `supabase.channel`, `setInterval` in `src/components/share/SharedLinkActivityFeed.tsx` or any share component.
- Manual Refresh button exists.
- The owner feed is manager-only — the client never sees the feed (RUX-10 Fixed: receiver page no longer mounts `SharedLinkActivityFeed`).
- The public filtered activity route (`src/app/api/share/[token]/activity/route.ts`) is separate from the owner-only server action `loadSharedLinkActivity` (`actions.ts:1381-1386`, gated by `requireCurrentUserContext()`).

**Production verdict:** **For closed beta: ratify focus-refresh as canonical V2 behavior with HONEST copy ("Refresh for the latest" + "Auto-refreshes when you return to this tab"). For GA: implement a lightweight Supabase Realtime `postgres_changes` subscription on `shared_link_comments` and `shared_link_responses` filtered by `publication_id`, preserving `is_internal` visibility rules. Un-merge SHF-01 from RUX-10 in the backlog.**

**Why:**
- Realtime is a scale feature, not a trust feature. The owner feed is manager-only and low-volume — a manager watching one publication does not need sub-second updates.
- Focus-refresh is honest: the manager sees "Refresh for the latest" and knows the feed is not live. This is better than a fake-realtime UI that silently polls.
- The [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) §4.5 verdict removes the activity feed from the client view entirely — realtime is purely a manager-side concern.
- The [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) §4.6 verdict: "A live link opens on Activity... this is the realtime question D7." The production answer is: beta ships focus-refresh; GA ships realtime.
- The [70](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) §"Un-merged from the Fixed table" already notes SHF-01 is distinct from RUX-10 — this answer ratifies that un-merge.

**Implementation (beta):**
- `src/components/share/SharedLinkActivityFeed.tsx:175`: replace "Activity refreshes when you reopen this tab. Use Refresh for the latest." with clearer copy: "Auto-refreshes when you return to this tab. Tap Refresh for the latest right now."
- Remove any "Activity logged for security" copy (already not in the receiver view, but audit the manager feed too).
- `.ai/06_specs/walkthrough-shared-link-overhaul.md`: add a note: "V2 owner feed refreshes on focus/visibility. Realtime (Supabase Realtime `postgres_changes`) is a GA backlog item."
- `.ai/03_plans/2026-06-20-Shared-Link-Feature/70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md`: un-merge SHF-01 from RUX-10 (already noted, but make it explicit that SHF-01 is Deferred-beta, not Fixed).
- `.ai/03_plans/2026-06-20-Shared-Link-Feature/75_FINDING_ID_REGISTRY.md` §6: change SHF-01 status from "Open / Decision" to "Deferred (beta ratifies focus-refresh); GA backlog = realtime."

**Implementation (GA backlog, not beta):**
- `src/components/share/SharedLinkActivityFeed.tsx`: add a Supabase Realtime channel `supabase.channel('publication-activity:' + publicationId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shared_link_comments', filter: 'publication_id=eq.' + publicationId }, handleNewComment).subscribe()`. Same for `shared_link_responses` and `shared_link_events`.
- The handler must preserve `is_internal` visibility: internal comments/decisions are filtered out of the public route but shown in the owner feed. The realtime layer inherits the same filter as `loadSharedLinkActivity`.
- `src/lib/publication/actions.ts`: ensure `loadSharedLinkActivity` is realtime-safe (idempotent, no race with the realtime insert handler).

**Verification gate (beta):**
- `rg -n "WebSocket|EventSource|supabase\.channel|setInterval" src/components/share/` returns zero matches (confirms no realtime in beta).
- `rg -n "Auto-refreshes when you return" src/components/share/SharedLinkActivityFeed.tsx` returns the honest copy.
- `rg -n "Activity logged for security" src/components/share/ src/components/workshop/ProjectPublicationHeader.tsx` returns zero matches.
- `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1` exits 0.

**Blast radius (beta):** `SharedLinkActivityFeed.tsx` (copy), three docs. No schema change. No test change.

**Beta vs GA:** **Beta: ratify focus-refresh with honest copy. GA: realtime via Supabase Realtime `postgres_changes`.** Beta does NOT gate on realtime.

---

## D8 — How to finish deploy correctness after shared-link provider readback?

**Current code (verified):**
- The 4 shared-link migrations are confirmed Local+Remote on `ebxxqidacheyapmmzavr` (2026-06-21): `20260620064601`, `20260620142000`, `20260621042221`, `20260621051701`.
- Provider readback: all 11 `project_publications` rows have complete `estimateLabels`/`rowLabels`/`rowEstimateIds`; row comment/response estimate mismatches are 0/0; target-context columns exist; target-aware RPCs are `security definer`, service-role executable only.
- App deploy, post-deploy smoke, advisors delta, and owner signoff remain open.
- `AC-MOD-T4-P2` (drop redundant token-hash indexes) is the only genuinely open pending-review migration (zero-scan preflight failed: `project_publications_token_hash_idx.idx_scan = 215`).
- `AC-MOD-06` (one published publication per project — the SEC-SHARE-08 atomic revoke+insert fix) was provider-applied 2026-06-19 but needs ledger reconciliation.

**Production verdict:** **Treat the shared-link provider repair as accepted evidence. Run the full [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) sequence: pre-deploy gate → drift reconciliation → migration-before-code (probe + apply only if probe fails) → pending-review promotion (AC-MOD-06 as part of beta because it closes SEC-SHARE-08; AC-MOD-T4-P2 stays deferred until zero-scan preflight passes) → app deploy → post-deploy smoke → Go/No-Go. Record single-node topology (D4). AC-MOD-06 is the SEC-SHARE-08 fix — promote it as part of the beta deploy, not post-launch.**

**Why:**
- The 4 shared-link migrations are already live — re-applying would be a error. The [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §2 drift reconciliation handles this with `supabase migration repair --status applied` (ledger-only).
- AC-MOD-06 (one published publication per project) closes SEC-SHARE-08 (non-atomic revoke+insert). The threat model ([12](12_THREAT_MODEL_STRIDE.md) §3) classifies SEC-SHARE-08 as P3 Open: "transient failure → no active link." For a closed beta, a transient "no active link" window is a real availability risk — the production answer is to promote AC-MOD-06, not defer it.
- AC-MOD-T4-P2 (drop redundant token-hash indexes) is the only genuinely open migration — the zero-scan preflight failed because `idx_scan = 215` (the index is being used). Dropping a used index is a performance regression; the production answer is to keep it deferred until a maintenance window where the preflight passes (or the index is no longer used after a code change).
- The [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §7 Go/No-Go is the binary gate — every non-deferred row must PASS with a named owner signoff.

**Implementation:**
- Run [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §1 pre-deploy gate: focused 23-file suite (`bunx vitest run <canonical list> --maxWorkers=1`) + `bun run type-check` + decision signoff (D1–D5 + D8–D9 resolved or beta-waived) + `supabase migration list --linked` snapshot + live-object snapshots (pg_indexes, pg_policy, RPC grants) + `get_advisors` baseline.
- Run [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §2 drift reconciliation: `supabase migration repair --status applied <version>` for the 2026-06-19 applied-but-unrecorded subset (AC-MOD-04, AC-MOD-06, T4 P3/P4/P5/P6/P1/P7); reconcile the two duplicate-named pairs (`allow_project_deletion_with_active_publications`, `project_groups`).
- Run [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §3 migration-before-code: probe each of the 4 shared-link migrations; if probe passes, `migration repair --status applied`; if probe fails, apply via Supabase MCP `apply_migration`. Gates 3.1–3.4 must PASS before app deploy.
- Run [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §4 pending-review promotion: promote AC-MOD-06 (SEC-SHARE-08 fix) as part of beta — run the STEP-0 dedup preflight (`select project_id, count(*) from project_publications where status='published' group by 1 having count(*)>1` returns 0 rows), then promote + repair. Keep AC-MOD-T4-P2 deferred (zero-scan preflight failed).
- Run [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §3 Step 5: deploy app revision (only after Gates 3.1–3.4 + AC-MOD-06 promotion PASS).
- Run [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §6 post-deploy smoke: open link, password gate (wrong then correct), 409 on stale snapshot (comment + decision), owner activity renders, recipient session, advisors clean.
- Run [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §7 Go/No-Go: every non-deferred row PASS with named owner signoff. Record single-node topology (D4).
- Capture all evidence under `evidence/deploy-<date>/`: migration-list-pre.txt, migration-list-post-repair.txt, pg_indexes snapshot, pg_policy snapshot, RPC grants snapshot, advisors baseline, advisors post-deploy, smoke results, Go/No-Go signoff.

**Verification gate:**
- [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §1.1–1.8 all PASS.
- [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §2.2: `supabase migration list --linked` shows zero "Local" rows corresponding to already-live objects; no "Remote" row lacking a local file.
- [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §3.1–3.4 all PASS (probe + apply/repair).
- [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §4 AC-MOD-06 dedup query returns 0 rows; partial unique index present.
- [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §6.1–6.7 all PASS.
- [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §7 Go/No-Go: every non-deferred row PASS with named owner signoff.
- `evidence/deploy-<date>/` contains all captured artifacts.

**Blast radius:** No source change. Deploy-only. The app revision is already written; this is the deploy execution.

**Beta vs GA:** **Beta gate.** This IS the beta deploy. AC-MOD-T4-P2 stays deferred; everything else ships.

---

## D9 — Accept the public-recipient owner digest implementation for beta?

**Current code (verified):**
- `src/lib/publication/actions.ts:1532-1538`: `maybeTriggerSharedLinkActivityDigest(publicationId, publicationToken, kind)` calls `triggerOwnerDigestIfAllowed(...)`. No `requireCurrentUserContext()` — the helper resolves owner/project context through service-role publication state.
- Called from public comment/decision POST success paths:
  - `src/app/api/share/[token]/comment/route.ts:309-313`: `maybeTriggerSharedLinkActivityDigest(access.publicationId, token, "comment");`
  - `src/app/api/share/[token]/decision/route.ts:251-255`: `maybeTriggerSharedLinkActivityDigest(access.publicationId, token, "decision");`
- Limiter: in-memory 15-min per-publication Map (`actions.ts:1340-1350`).
- No recipient PII in the digest (owner context only).
- SEC-SHARE-06 is Fixed in 75 (the old `digest-auth-required` silent skip is removed).

**Production verdict:** **ACCEPT for beta with three production hardening items: (1) make the 15-min limiter durable (see D4); (2) add a `publication_digest_log` table so the owner can query "did my digest actually send?" without log scraping; (3) wire the [92](92_OBSERVABILITY_AND_ALERTING.md) §2.5 observability gate — any `digest-auth-required` log occurrence is a P1 regression sentinel; `digest-send-failed` > 5% of attempted digests is a page. For GA: add per-recipient digest preferences (mute without unsubscribing).**

**Why:**
- The digest is the owner's awareness signal — the [05](05_PRODUCT_STRATEGY_BRIEF.md) §5 "Owner awareness" metric is BLOCKED by SEC-SHARE-06 until this lands. The code fix is in; the production answer adds the observability + durability that makes the metric measurable.
- The in-memory limiter is a single-node beta precondition (D4) — the production answer is to make it durable now so GA scale-out is a config flag.
- A `publication_digest_log` table is the difference between "Philip can check if his digest sent" (query a table) vs "Philip has to grep Vercel logs" (not production-grade). It's a 1-table, 2-column addition.
- The [92](92_OBSERVABILITY_AND_ALERTING.md) §2.5 gate already defines the thresholds — the production answer is to wire them, not just document them.

**Implementation:**
- `supabase/migrations/<new>_publication_digest_log.sql`:
  ```sql
  create table if not exists public.publication_digest_log (
    id bigint generated always as identity primary key,
    publication_id uuid not null references public.project_publications(id) on delete cascade,
    attempted_at timestamptz not null default now(),
    outcome text not null check (outcome in ('sent','skipped_throttle','skipped_no_activity','failed')),
    error_message text,
    event_kind text not null check (event_kind in ('comment','decision','open','manual'))
  );
  create index on public.publication_digest_log (publication_id, attempted_at desc);
  -- RLS: manager-only read, service-role insert.
  alter table public.publication_digest_log enable row level security;
  create policy "managers can read digest log"
    on public.publication_digest_log for select to authenticated
    using (publication_id in (select id from public.project_publications where public.can_manage_project_publication(project_id)));
  create policy "service role can insert digest log"
    on public.publication_digest_log for insert to service_role with check (true);
  ```
- `src/lib/publication/actions.ts`: after each digest attempt, insert a row into `publication_digest_log` with the outcome. Replace `console.warn("[publication] owner digest skipped…")` with structured `logStructured("warn", "/api/share/[token]/digest", "digest-send-failed", ipHash=null, { publicationId: hash(publicationId) })` + the DB log row.
- `src/lib/publication/public-repository.ts`: add `insertDigestLog(publicationId, outcome, eventKind, errorMessage?)` and `listRecentDigestLogs(publicationId, limit)` helpers.
- `src/components/workshop/ProjectPublicationHeader.tsx` Activity tab: show the last 5 digest attempts (timestamp, outcome, event_kind) so the manager can see "did my digest send?"
- `tests/vitest/project-publication-activity.test.tsx`: add a regression sentinel test — if the word `digest-auth-required` appears in any route/action log, the test fails.
- `tests/vitest/project-publication-activity.test.tsx`: add a digest-log test — after a comment POST, assert a `publication_digest_log` row exists with `outcome='sent'` (or `skipped_throttle` if within 15 min).
- Wire [92](92_OBSERVABILITY_AND_ALERTING.md) §2.5: add a saved Supabase SQL view `v_digest_health` that computes `digest-send-failed` rate over the last 24h; add a Vercel log-search saved query for `digest-auth-required`.

**Verification gate:**
- `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1` exits 0 (including the new regression sentinel + digest-log tests).
- `rg -n "digest-auth-required" src/lib/publication/ src/app/api/share/` returns zero matches (the old path is gone).
- `rg -n "publication_digest_log" supabase/migrations/<new>_publication_digest_log.sql src/lib/publication/` returns the table + helpers.
- Hosted smoke: post a comment to a seeded publication; query `select * from publication_digest_log where publication_id=… order by attempted_at desc limit 1;` returns a row with `outcome='sent'` (or `skipped_throttle` if a digest was sent in the last 15 min).
- `rg -n "v_digest_health" .ai/03_plans/2026-06-20-Shared-Link-Feature/92_OBSERVABILITY_AND_ALERTING.md` returns the wired view reference.

**Blast radius:** One new migration, `actions.ts` (digest log insert + structured logging), `public-repository.ts` (helpers), `ProjectPublicationHeader.tsx` (Activity tab digest log display), `92` (wired view), one test file. RLS change (manager-read on new table).

**Beta vs GA:** **Beta gate (accept with hardening).** The digest must be observable + durable before beta. Per-recipient digest preferences = GA backlog.

---

## D10 — Manager-read RLS on `project_publication_events` as a release gate or post-launch?

**Current code (verified):**
- `project_publication_events` has exactly ONE policy (migration `20260527120000_project_client_publication.sql:113-118`):
  ```sql
  create policy "project publication service role can insert events"
    on public.project_publication_events for insert to service_role with check (true);
  ```
- **No SELECT policy.** No manager-read RLS. No public/anon read.
- Manager reads happen via `loadSharedLinkActivity` (`actions.ts:1381-1386`) using a service-role Supabase client — RLS is bypassed by service-role.
- `AC-MOD-T4-P3_project_publication_events_manager_rls.sql` exists in `supabase/migrations-pending-review/` and was **provider-applied 2026-06-19** (per the pending-review README) — but the local ledger does not record it.
- The [12](12_THREAT_MODEL_STRIDE.md) §5 residual table lists this as "Service-role route is the read path today → direct Data-API exposure of event rows" as the re-open trigger.

**Production verdict:** **APPLY AC-MOD-T4-P3 as part of the beta deploy (not post-launch). Rationale: it's already provider-applied — only ledger reconciliation is needed (zero risk, zero new DDL). Defense-in-depth is free when the work is already done. It closes the residual risk in [12](12_THREAT_MODEL_STRIDE.md) §5: "Direct Data-API exposure of event rows." If Philip wants to defer, record the deferral explicitly AND add a guard test that confirms `loadSharedLinkActivity` is the only read path.**

**Why:**
- The manager-read RLS policy is `can_manage_project_publication(project_id)` — the same pattern used on `project_publications`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`. It's the established pattern.
- The migration is already live on the provider (applied 2026-06-19). The production answer is to reconcile the ledger (`supabase migration repair --status applied <version>`) so the local and remote ledgers agree — zero new DDL, zero risk.
- Deferring this means the residual risk in [12](12_THREAT_MODEL_STRIDE.md) §5 stays open: if any future code path exposes `project_publication_events` via the Data-API (not the service-role route), event rows would be world-readable (no RLS). Applying the policy closes that risk permanently.
- The [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §4.1 table already lists T4-P3 as "Yes" (provider-applied 2026-06-19) with preflight "pg_policy shows new policy, RLS enabled, `can_manage_project_publication` present." The production answer is to run that preflight, confirm it passes, and repair the ledger.

**Implementation:**
- Run [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §4.1 T4-P3 preflight: `select polname, polcmd from pg_policy pol join pg_class c on c.oid = pol.polrelid where c.relname = 'project_publication_events';` — confirm the manager-read policy is present.
- If preflight PASSes: `supabase migration repair --status applied <version>` (ledger-only, no DDL).
- If preflight FAILs (policy not present despite README claim): apply `AC-MOD-T4-P3_project_publication_events_manager_rls.sql` via Supabase MCP `apply_migration`, then repair the ledger.
- `git mv supabase/migrations-pending-review/AC-MOD-T4-P3_*.sql supabase/migrations/<freshTS>_ac_mod_t4_p3_*.sql` (promote into canonical history).
- `tests/vitest/project-publication-activity.test.tsx`: add a guard test that confirms (a) `loadSharedLinkActivity` works (manager can read), (b) an `anon`/`authenticated` client without `can_manage_project_publication` cannot SELECT from `project_publication_events` (RLS blocks).
- `.ai/03_plans/2026-06-20-Shared-Link-Feature/90_DEPLOY_AND_MIGRATION_RUNBOOK.md` §4.1: update T4-P3 row from "If D10 = apply-now... If D10 = beta-defer..." to "T4-P3 = apply-now (D10 ratified 2026-06-21)."
- `.ai/03_plans/2026-06-20-Shared-Link-Feature/75_FINDING_ID_REGISTRY.md` §1: update D10 reference to "Resolved (apply-now)."

**Verification gate:**
- Provider probe: `select polname from pg_policy pol join pg_class c on c.oid = pol.polrelid where c.relname = 'project_publication_events';` returns the manager-read policy.
- `select relrowsecurity from pg_class where relname = 'project_publication_events';` returns `true` (RLS enabled).
- `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1` exits 0 (including the new RLS guard test).
- `supabase migration list --linked` shows T4-P3 as Remote = applied with a matching local file.

**Blast radius:** Ledger-only (migration repair) OR one migration apply + promote. One test file. Two docs. No source change.

**Beta vs GA:** **Beta gate (apply-now).** The migration is already live; this is ledger reconciliation + a guard test.

---

## D11 — Should Approve capture a named e-signature (legally-credible) or a named confirmation?

**Current code (verified):**
- `src/components/share/SharePageDecision.tsx:343-372`: three buttons — `Approve proposal`, `Request changes`, `Decline`.
- `src/components/share/SharePageDecision.tsx:401-430`: confirmation modal with an optional `note` textarea, then `Confirm`.
- `src/components/share/SharePageDecision.tsx:257-263`: on success, stores `decision` + `note` + `submittedAt` + target context (`estimateId`, `rowId`, `targetKind`, `targetLabel`, `targetSecondaryLabel`).
- `src/components/share/SharePageDecision.tsx:300-321`: renders `Approved/Declined/Revision requested` + optional note + `Decision recorded...`.
- **No typed signer name field. No signature capture. No displayed signer identity/timestamp in the UI.**
- The decision is a recorded response (recipient identity from session cookie + timestamp), not a signed attestation.
- The RPC is `public.submit_client_response` (migration `20260620142000` + `20260621042221`).

**Production verdict:** **V2 ships NAMED CONFIRMATION + VISIBLE AUDIT LINE. Add a typed "Your name" field to the Approve confirmation modal (required for Approve, optional for Request changes/Decline). Store `signer_name` and `signature_intent_hash` (hash of snapshot_id + signer_name + timestamp) on `shared_link_responses`. Render a visible audit line after submission: "Approved by {signer_name} on {formatted datetime}" — this is the trust artifact the client can screenshot. Full legal e-signature (DocuSign-style, eIDAS/ESIGN/PH E-Commerce Act compliant) is a GA decision with legal review.**

**Why:**
- The [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) §4.4 verdict: "V2 ships named confirmation + a visible audit line (signer + timestamp) — most of the trust value at low cost. Full legal e-signature = GA decision."
- A typed name + visible audit line is the trust signal that makes the approval feel real to a nervous layperson. It is NOT a legal signature, but it is the difference between "I clicked a button" and "I confirmed this approval as {my name} on {date}."
- The `signature_intent_hash` binds the signer's intent to the exact proposal content (snapshot_id) at the moment of approval. This is the integrity anchor — if the snapshot ever changes, the hash breaks. It's not a legal signature, but it's a cryptographic attestation that "this named person approved this exact content at this time."
- Full legal e-signature (typed signature canvas, checkbox + typed name + audit hash, DocuSign integration, eIDAS/ESIGN/PH E-Commerce Act compliance) is a GA decision that requires legal review — it's not a beta blocker.
- The [05](05_PRODUCT_STRATEGY_BRIEF.md) §7 scope cut explicitly lists "Full legal e-signature (D11 — GA decision)" as out-of-scope for this iteration.

**Implementation:**
- `supabase/migrations/<new>_shared_link_response_signature.sql`:
  ```sql
  alter table public.shared_link_responses
    add column if not exists signer_name text,
    add column if not exists signature_intent_hash text;
  -- signer_name is nullable for legacy rows (backfill to 'Unknown' for display).
  -- signature_intent_hash = sha256(snapshot_id || signer_name || submitted_at::text) — computed in app, stored here.
  create index if not exists on public.shared_link_responses (signature_intent_hash) where signature_intent_hash is not null;
  ```
- `src/app/api/share/[token]/decision/route.ts`: accept `signerName` in the POST body (required for `approve`, optional for `request_revision`/`decline`); validate length ≤200 chars + sanitize; compute `signatureIntentHash = createHash("sha256").update(snapshotId + signerName + submittedAt).digest("hex")`; pass both to `submit_client_response` RPC.
- `supabase/migrations/<new>_submit_client_response_signature.sql` (or extend `20260621042221` RPC signature):
  ```sql
  create or replace function public.submit_client_response(
    p_publication_id uuid, p_recipient_token_hash text, p_decision text,
    p_note text, p_estimate_id uuid, p_row_id uuid,
    p_target_kind text, p_target_label text, p_target_secondary_label text,
    p_expected_snapshot_version integer,
    p_signer_name text, p_signature_intent_hash text
  ) returns table(...) as $$
  ...
  insert into public.shared_link_responses (..., signer_name, signature_intent_hash) values (..., p_signer_name, p_signature_intent_hash);
  ...
  ```
- `src/components/share/SharePageDecision.tsx:401-430`: add a "Your name" input to the confirmation modal (required for Approve, optional for Request changes/Decline). Copy: "By approving, you confirm you are {typed name} and you approve this proposal as of {timestamp}. This will be recorded with your name and the current date/time."
- `src/components/share/SharePageDecision.tsx:300-321`: after submission, render the visible audit line: "Approved by {signerName} on {formatted datetime}" — use Source Serif 4 per [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) §3.2.
- `src/lib/publication/types.ts`: add `signerName?: string` and `signatureIntentHash?: string` to the decision response type.
- `tests/vitest/project-publication-decision.test.tsx`: add tests — Approve without `signerName` → 400 with validation error; Approve with `signerName` → 201 + response includes `signerName` + `signatureIntentHash`; rendered audit line shows "Approved by {name} on {datetime}".
- `tests/vitest/share/share-page-decision-anonymous.test.tsx`: update to assert the typed-name requirement.

**Verification gate:**
- `bunx vitest run tests/vitest/project-publication-decision.test.tsx tests/vitest/share/share-page-decision-anonymous.test.tsx --maxWorkers=1` exits 0.
- `rg -n "signer_name" supabase/migrations/<new>_shared_link_response_signature.sql src/app/api/share/[token]/decision/route.ts` returns the column + the route pass-through.
- `rg -n "Approved by" src/components/share/SharePageDecision.tsx` returns the audit line.
- Provider probe: `select signer_name, signature_intent_hash, submitted_at from shared_link_responses where decision='approve' limit 5;` returns rows with non-null `signer_name` + `signature_intent_hash` for new approvals (legacy rows have null).
- `rg -n "eIDAS|ESIGN|E-Commerce Act" .ai/03_plans/2026-06-20-Shared-Link-Feature/` returns zero matches in the beta scope (legal compliance is GA, not beta).

**Blast radius:** Two new migrations (column + RPC signature extension), `decision/route.ts` (accept + validate + hash), `SharePageDecision.tsx` (typed name field + audit line), `types.ts`, two test files. No RLS change (column is recipient-written, manager-read — same as existing decision columns).

**Beta vs GA:** **Beta gate (named confirmation + audit line). Full legal e-signature = GA decision with legal review.** The `signature_intent_hash` is the integrity anchor that makes the GA path a smooth upgrade (the hash is already there; GA adds the legal layer on top).

---

## Summary — what ships at beta vs what waits for GA

| Decision | Beta verdict | GA backlog |
|---|---|---|
| **D1** Stale-snapshot UX | 409 + banner + draft-preserve | — |
| **D2** Location exposure | `location_visibility` enum (default `locality`) | — |
| **D3** Public UUIDs | Opaque per-snapshot ids | — |
| **D4** Throttle durability | In-memory + single-node recorded + durable layer built | Durable layer live (multi-node) |
| **D5** Cross-origin DELETE/unsubscribe | Same-origin guards + CSRF nonce + rate limit | — |
| **D6** Floating rail | Ratify single-column as canonical | — |
| **D7** Realtime owner feed | Focus-refresh with honest copy | Supabase Realtime `postgres_changes` |
| **D8** Deploy correctness | Full [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) sequence + AC-MOD-06 | AC-MOD-T4-P2 (index drop) |
| **D9** Owner digest | Accept + durable limiter + `publication_digest_log` + observability | Per-recipient digest preferences |
| **D10** Manager-read RLS | Apply AC-MOD-T4-P3 (ledger reconcile) | — |
| **D11** E-signature | Named confirmation + audit line + `signature_intent_hash` | Full legal e-signature (eIDAS/ESIGN/PH E-Commerce Act) |

**Net: 9 of 11 decisions close at beta with production-grade resolution. 3 decisions (D4 durable-live, D7 realtime, D11 legal e-signature) have a beta-acceptable posture AND a GA backlog item. 0 decisions ship as "good for MVP" — every beta answer is GA-grade except where GA explicitly requires scale (multi-node throttle) or legal review (e-signature compliance).**

---

## Owner sign-off

> _Reviewed and accepting the production-grade verdicts above; ratifying D1–D11 as the beta ship contract with the GA backlog items recorded._
>
> Owner: Philip  Date: 2026-06-21
