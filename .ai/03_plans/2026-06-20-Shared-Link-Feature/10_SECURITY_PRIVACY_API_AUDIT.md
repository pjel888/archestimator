# Shared Link Security / Privacy / Public API Audit

Date: 2026-06-20  
Lane: Security, privacy, auth/session, CSRF, token/password, rate-limit, public API audit  
Mode: read-only source audit. No source, test, migration, git stage, or commit changes were made.

## 1. Audit Scope And Files Inspected

Required startup context inspected:
- `AGENTS.md`
- `.ai/10_state/current-state.md` FAST PATH block only, plus targeted `rg` hits for shared-link/publication history

Primary source inspected:
- `src/app/share/[token]/page.tsx`
- `src/app/api/share/[token]/route.ts`
- `src/app/api/share/[token]/password/route.ts`
- `src/app/api/share/[token]/session/route.ts`
- `src/app/api/share/[token]/comment/route.ts`
- `src/app/api/share/[token]/decision/route.ts`
- `src/app/api/share/[token]/activity/route.ts`
- `src/app/api/share/[token]/events/route.ts`
- `src/app/api/share/[token]/unsubscribe/route.ts`
- `src/lib/publication/security.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/actions.ts`
- `src/lib/publication/email-links.ts`
- `src/lib/publication/activity-helpers.ts`
- `src/lib/publication/image-url.ts`
- `src/lib/publication/snapshot.ts`
- `src/lib/publication/types.ts`

Database / migration scope inspected:
- `supabase/migrations/20260527120000_project_client_publication.sql`
- `supabase/migrations/20260528220000_project_shared_link_overhaul.sql`
- `supabase/migrations/20260531010000_project_publication_password_attempt_event.sql`
- `supabase/migrations/20260531175141_shared_link_recipient_unsubscribe.sql`
- `supabase/migrations/20260601003000_security_rate_limit_events.sql`
- `supabase/migrations/20260601011500_resend_shared_link_delivery_webhooks.sql`
- `supabase/migrations/20260601145000_lock_down_shared_link_recipient_credentials.sql`
- `supabase/migrations/20260603210653_lock_shared_link_response_snapshot_version.sql`
- `supabase/migrations/20260603214151_lock_shared_link_comment_snapshot_version.sql`
- `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql`
- `supabase/migrations-pending-review/AC-MOD-*` and `T4-database-pass.sql` by targeted `rg`

Tests / specs / decisions inspected:
- `tests/vitest/project-publication-route.test.ts`
- `tests/vitest/project-publication-comments.test.tsx`
- `tests/vitest/project-publication-decision.test.tsx`
- `tests/vitest/project-publication-public-repository.test.ts`
- `tests/vitest/project-publication-actions.test.ts`
- `tests/vitest/project-publication-security.test.ts`
- `tests/vitest/project-publication-security-hardening.test.ts`
- `tests/vitest/project-publication-cookie-credential-version.test.ts`
- `tests/vitest/project-publication-snapshot.test.ts`
- `tests/vitest/project-publication-activity.test.tsx`
- `tests/vitest/project-publication-email-links.test.ts`
- `tests/vitest/project-publication-security-headers.test.ts`
- `tests/vitest/security-findings-publication-contracts.test.ts`
- `tests/vitest/publication-client-csrf.test.ts`
- `tests/vitest/share/share-page-get-routes-contract.test.ts`
- `tests/vitest/share/no-dangerous-html.test.ts`
- `tests/vitest/share/share-page-decision-anonymous.test.tsx`
- `tests/vitest/share-unsubscribe-interstitial.test.ts`
- `.ai/06_specs/walkthrough-shared-link-overhaul.md`
- `.ai/06_specs/shared-link-and-publication-spec.md`
- `.ai/10_state/decisions.md` targeted shared-link hits
- `.ai/15_Bugs/2026-06-04-codex-cloud-security-findings-refresh.md` targeted shared-link/security hits

Worktree note: `git status --short` showed many unrelated dirty files before this report was written. I did not inspect or touch unrelated dirty files beyond read-only status output.

## 2. Current Security Architecture Summary

Publication links are bearer-token URLs. New raw tokens are generated with 32 random bytes and base64url encoded (`src/lib/publication/security.ts:61`). The raw token is not stored directly; DB lookup uses an HMAC-SHA256 token hash with a production-required secret (`src/lib/publication/security.ts:71`, `src/lib/publication/security.ts:100`, `src/lib/publication/public-repository.ts:143`). The encrypted raw token is retained for manager recopy/email-link workflows (`src/lib/publication/security.ts:76`, `src/lib/publication/actions.ts:500`).

Public reads use server-side service-role Supabase clients, so the route layer is the trust boundary (`src/lib/publication/public-repository.ts:72`). `/api/share/[token]` applies durable token+IP snapshot-read rate limiting before publication lookup, rejects unknown/revoked/expired links, gates password-protected links on a signed access cookie, and re-sanitizes the snapshot DTO before returning JSON (`src/app/api/share/[token]/route.ts:16`, `src/app/api/share/[token]/route.ts:18`, `src/app/api/share/[token]/route.ts:35`, `src/app/api/share/[token]/route.ts:64`).

The `/share/[token]` page resolves active publication access before rendering; password-protected pages return a password gate before snapshot resolution unless the signed access cookie verifies (`src/app/share/[token]/page.tsx:139`, `src/app/share/[token]/page.tsx:142`, `src/app/share/[token]/page.tsx:168`). Password metadata is generic before snapshot resolution (`src/app/share/[token]/page.tsx:271`; tests assert ordering in `tests/vitest/security-findings-publication-contracts.test.ts:81`).

Password verification uses normalized scrypt hashes (`src/lib/publication/security.ts:121`, `src/lib/publication/security.ts:135`) and issues a signed, HttpOnly, SameSite=Lax access cookie bound to token digest, publication id, credential version, and expiry (`src/lib/publication/security.ts:328`, `src/lib/publication/security.ts:343`). Password POST requires same-origin plus CSRF header/cookie pair before verification (`src/app/api/share/[token]/password/route.ts:34`, `src/lib/publication/security.ts:358`). Durable password attempt limiting exists in `security_rate_limit_events` (`src/lib/publication/public-repository.ts:460`, `supabase/migrations/20260601003000_security_rate_limit_events.sql:1`) and a process-local progressive lockout also remains (`src/lib/publication/security.ts:558`, `src/app/api/share/[token]/password/route.ts:57`).

Recipient sessions are separate signed HttpOnly cookies named from the share token digest (`src/lib/publication/security.ts:440`, `src/lib/publication/security.ts:473`). Session creation verifies the publication, password access when needed, and hashed recipient token scoped to the publication (`src/app/api/share/[token]/session/route.ts:51`, `src/app/api/share/[token]/session/route.ts:56`, `src/app/api/share/[token]/session/route.ts:70`, `src/lib/publication/public-repository.ts:751`). The session also sets a non-secret client-visible `_ok` flag for UI state (`src/app/api/share/[token]/session/route.ts:83`).

Comment and decision writes require same-origin CSRF, a signed recipient session bound to the current publication credential version, optional signed view-token snapshot version, durable per-recipient rate limiting, and service-role-only RPCs that validate active publication plus recipient token hash (`src/app/api/share/[token]/comment/route.ts:185`, `src/app/api/share/[token]/comment/route.ts:222`, `src/app/api/share/[token]/comment/route.ts:234`, `src/app/api/share/[token]/comment/route.ts:278`, `src/lib/publication/public-repository.ts:929`; `src/app/api/share/[token]/decision/route.ts:124`, `src/app/api/share/[token]/decision/route.ts:161`, `src/app/api/share/[token]/decision/route.ts:173`, `src/app/api/share/[token]/decision/route.ts:194`, `src/lib/publication/public-repository.ts:1000`). Direct Data API reads of recipient credential hashes are revoked (`supabase/migrations/20260601145000_lock_down_shared_link_recipient_credentials.sql:5`).

Snapshots intentionally expose a client-facing DTO: project/client/location/currency/totals, estimate names, rows, quantities, units, row totals, tree nodes, and sanitized image URLs (`src/lib/publication/types.ts:59`, `src/lib/publication/types.ts:100`). Internal unit-rate fields are stripped from future and legacy snapshot reads (`src/lib/publication/snapshot.ts:71`, `src/lib/publication/snapshot.ts:95`, `src/lib/publication/snapshot.ts:112`). Publication image URLs are tightly allow-listed to local component thumbnails or configured Supabase public component-image WebP paths, explicitly excluding private project images and tracking-style URLs (`src/lib/publication/image-url.ts:21`, `src/lib/publication/image-url.ts:36`, `src/lib/publication/image-url.ts:42`).

Telemetry stores HMAC-peppered IP/user-agent hashes in DB event tables through `hashRequestValue` (`src/lib/publication/public-repository.ts:171`, `src/lib/publication/public-repository.ts:179`, `src/lib/publication/public-repository.ts:662`, `src/lib/publication/public-repository.ts:698`). Public API responses generally set `Cache-Control: no-store`.

## 3. Findings Table

| ID | Severity | Evidence | Impact | Recommendation | Verification needed |
| --- | --- | --- | --- | --- | --- |
| SEC-SHARE-01 | P1 | Current latest RPCs reject only `p_expected_snapshot_version > v_snapshot_version`, allowing old versions: `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:144` and `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:207`. Routes pass a signed old view version through after content-only republish: `src/app/api/share/[token]/comment/route.ts:234`, `src/app/api/share/[token]/comment/route.ts:246`, `src/app/api/share/[token]/decision/route.ts:173`, `src/app/api/share/[token]/decision/route.ts:185`. Tests explicitly expect version 1 accepted while current access says version 2: `tests/vitest/project-publication-comments.test.tsx:270`, `tests/vitest/project-publication-comments.test.tsx:273`, `tests/vitest/project-publication-comments.test.tsx:280`, `tests/vitest/project-publication-decision.test.tsx:184`, `tests/vitest/project-publication-decision.test.tsx:187`, `tests/vitest/project-publication-decision.test.tsx:195`. Static security test encodes the loose `>` guard: `tests/vitest/security-findings-publication-contracts.test.ts:36`, `tests/vitest/security-findings-publication-contracts.test.ts:43`, `tests/vitest/security-findings-publication-contracts.test.ts:52`, `tests/vitest/security-findings-publication-contracts.test.ts:59`. | A recipient with an old open page and still-valid recipient session can submit a comment or final approval/decline against a publication after the owner republishes changed content, as long as credentials did not change. This appears to reopen the previously closed stale-comment/stale-decision class described in `.ai/15_Bugs/2026-06-04-codex-cloud-security-findings-refresh.md:412` and `.ai/15_Bugs/2026-06-04-codex-cloud-security-findings-refresh.md:418`. | Restore equality semantics in both RPCs: reject when `v_snapshot_version is distinct from p_expected_snapshot_version`. Add route-level defense too: when a request includes a view token and its version differs from current `access.snapshotVersion`, return 409 before rate/RPC. Update tests to prove old signed view tokens fail after content-only republish and fresh current view tokens pass. | Red/green Vitest for comment and decision stale content-only republish; migration/readback proving latest `insert_client_comment` and `submit_client_response` equality guard; provider proof if applied remotely. |
| SEC-SHARE-02 | P2 | Session POST uses local `assertSameOrigin` that allows missing `Origin` and does not require the CSRF header/cookie pair: `src/app/api/share/[token]/session/route.ts:26`, `src/app/api/share/[token]/session/route.ts:38`. There is no call to a rate limiter in the session route before `verifySharedLinkRecipientToken`: `src/app/api/share/[token]/session/route.ts:44`, `src/app/api/share/[token]/session/route.ts:70`. Other public writes use `assertSameOriginPublicPost` and durable rate limits: `src/app/api/share/[token]/password/route.ts:34`, `src/app/api/share/[token]/comment/route.ts:185`, `src/app/api/share/[token]/decision/route.ts:124`, `src/app/api/share/[token]/events/route.ts:17`. | Recipient token entropy makes credential guessing impractical, but the endpoint is still an unauthenticated DB-backed verifier. Attackers with a known publication token can force repeated publication+recipient lookups and analytics attempts. The weaker CSRF shape is inconsistent with the rest of the public write surface and could mutate a browser session if a same-origin XSS ever exists. | Require `assertSameOriginPublicPost` for session creation, set a CSRF cookie before initializer POST or use a narrowly scoped session-init CSRF helper. Add durable rate limiting keyed by publication token hash + IP, ideally before recipient-token verification. | Route tests for missing CSRF rejected, cross-origin rejected, rate-limited before recipient DB lookup, and happy path still sets HttpOnly session plus `_ok`. |
| SEC-SHARE-03 | P2 | Share page render and `/api/share/[token]` record `open` events but do not call the event rate limiter. Page records two deferred opens on every successful render: `src/app/share/[token]/page.tsx:225`, `src/app/share/[token]/page.tsx:239`. Snapshot GET records an open after returning gated snapshot data: `src/app/api/share/[token]/route.ts:57`. The event limiter exists only on `/events`: `src/app/api/share/[token]/events/route.ts:30`; snapshot GET has a separate 60/min read limiter: `src/lib/publication/public-repository.ts:393`. | Repeated GETs by clients or bots can write unbounded `project_publication_events` rows up to the snapshot-read limit and can also produce duplicate page + API open rows when the UI fetches both surfaces. This is mostly telemetry cost/noise and storage retention risk, but it affects owner-visible activity and rate-limit table pressure. | Apply a write-side event/open limiter inside `recordProjectPublicationEvent` or before page/API open-event writes, dedupe page vs JSON API opens where possible, and consider separate bot/open telemetry budget. | Tests proving repeated page/API opens stop writing events after the limit while normal snapshot read behavior still works. Provider/storage metric check after deployment. |
| SEC-SHARE-04 | P2 | Structured public route logs hash IPs with unsalted SHA256, not the HMAC-peppered helper used for DB telemetry: `src/app/api/share/[token]/comment/route.ts:61`, `src/app/api/share/[token]/comment/route.ts:66`, `src/app/api/share/[token]/decision/route.ts:26`, `src/app/api/share/[token]/decision/route.ts:31`. DB telemetry correctly uses `hashRequestValue` HMAC pepper: `src/lib/publication/public-repository.ts:171`, `src/lib/publication/public-repository.ts:179`. | Unsalted truncated hashes in logs are still reversible for IPv4 with dictionary/rainbow-table attacks. This weakens the privacy statement on the password gate that raw IP/GPS/password values are not stored (`src/app/share/[token]/page.tsx:124`) and creates inconsistent privacy posture between DB and logs. | Replace route-local `getIpHash` helpers with a shared HMAC-peppered log hash helper, or remove IP-derived log fields entirely. Avoid logging user-supplied raw error fragments on public routes unless already sanitized. | Unit/static tests ensuring no `createHash("sha256").update(ip)` remains on share public routes and log hash uses the telemetry pepper. |
| SEC-SHARE-05 | P3 | Unsubscribe POST mutates with `assertSameOrigin`, which allows absent `Origin`, and has no CSRF or rate limit: `src/app/api/share/[token]/unsubscribe/route.ts:66`, `src/app/api/share/[token]/unsubscribe/route.ts:70`, `src/lib/publication/security.ts:346`. The GET interstitial is read-only and escaped, which is good: `src/app/api/share/[token]/unsubscribe/route.ts:47`, `src/app/api/share/[token]/unsubscribe/route.ts:50`, `src/app/api/share/[token]/unsubscribe/route.ts:62`. | Bearer unsubscribe links are expected to be usable without login, but absent-Origin POSTs plus no rate limit leave a weaker mutation boundary than other public write routes. Impact is limited to email suppression for a known publication+recipient token, not data exposure or proposal mutation. | Keep GET read-only, but add a lightweight CSRF nonce in the interstitial form or require `Origin` on POST, and add durable token+IP rate limiting. | Tests for cross-origin/absent-origin behavior decision, scanner GET no-op, POST nonce requirement if adopted, and rate-limited repeated invalid tokens. |
| SEC-SHARE-06 | P3 | Owner digest triggering from public comment/decision routes imports a server action then calls `maybeTriggerSharedLinkActivityDigest`, but that function requires an authenticated current user and returns `digest-auth-required` when called from public recipient routes: `src/app/api/share/[token]/comment/route.ts:307`, `src/app/api/share/[token]/decision/route.ts:213`, `src/lib/publication/actions.ts:1471`, `src/lib/publication/actions.ts:1477`. | Owner digest emails likely do not send for recipient-originated comments/decisions. This is not a direct data breach, but it is a monitoring/security-notification failure: owners may miss external recipient activity. | Split digest triggering into an internal service-role helper that does not require a browser auth session but verifies publication id + token hash internally. Preserve the 15-minute per-publication limiter, preferably durable rather than process-local. | Add tests proving successful public comment/decision triggers digest helper without `requireCurrentUserContext`; verify no digest is sent for inactive/mismatched publication. |
| SEC-SHARE-07 | P3 | Snapshot generation includes `project.location` in the public DTO: `src/lib/publication/actions.ts:429`, `src/lib/publication/actions.ts:434`, `src/lib/publication/types.ts:103`, `src/lib/publication/types.ts:108`. Current-state notes mention recent location privacy work with public/private DTO separation for dashboard surfaces, but this audit did not find equivalent publication-specific location minimization in the snapshot path. Evidence is indirect because publication requirements may intentionally include location. | If project location contains exact address/GPS/sensitive site details, every public share recipient receives it once the link is unlocked/open. This may be intended proposal context, but privacy posture should distinguish exact private location from client-safe project location. | Decide whether publication snapshots should use a public-safe location DTO/redacted address. If exact location is required, mark it as intentional in the spec and UI. | Product/privacy decision plus tests asserting exact coordinates/private metadata are omitted from public snapshots. |
| SEC-SHARE-08 | P3 | Manager action `createProjectPublication` revokes existing published rows before inserting the new publication: `src/lib/publication/actions.ts:540`, `src/lib/publication/actions.ts:550`. Pending migration `AC-MOD-06_one_published_publication_per_project.sql` calls out the same non-atomic risk and proposes a unique index/atomic replacement follow-up: `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql:76`. | A transient DB/network failure after revoke and before insert can leave a project with no active share link. This is availability/integrity, not direct data exposure. | Replace revoke+insert with a transaction/RPC or use an atomic upsert-like publication replacement. Apply one-published-per-project uniqueness after duplicate cleanup. | Failure-injection test for insert error after revoke; migration proof for one active publication per project. |

## 4. Missing / Non-Working Parts And Likely Root Cause

- Stale snapshot locking is currently not working as the older security closure described. The original June 3 migrations used equality-style mismatch guards (`supabase/migrations/20260603210653_lock_shared_link_response_snapshot_version.sql:37`, `supabase/migrations/20260603214151_lock_shared_link_comment_snapshot_version.sql:39`). The later rotation migration replaced both RPCs with a looser guard that accepts any expected version less than or equal to current (`supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:144`, `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:207`). Likely root cause: AC-MOD-01 intentionally made recipient/password cookies survive content-only republishes, then the write-lock tests were updated to preserve interaction from old rendered pages instead of requiring reload (`tests/vitest/project-publication-cookie-credential-version.test.ts:25`, `tests/vitest/project-publication-decision.test.tsx:184`, `tests/vitest/project-publication-comments.test.tsx:270`).
- Owner digest from public recipient activity likely does not work because the public route calls a server action that demands `requireCurrentUserContext()` (`src/lib/publication/actions.ts:1477`). The try/catch in the public routes swallows failures (`src/app/api/share/[token]/comment/route.ts:308`, `src/app/api/share/[token]/decision/route.ts:214`), so the feature can fail silently.
- Several database hardening items remain in `supabase/migrations-pending-review/`, not applied migrations: event retention, `project_publication_events` manager-read RLS symmetry, snapshot-size guardrail, scheduled rate-limit GC, covering indexes, and one-published-publication uniqueness. These are not current production controls until applied.
- The implementation walkthrough is stale in places. It still says rate limiting/circuit breakers/lockout are in-memory only (`.ai/06_specs/walkthrough-shared-link-overhaul.md:159`), while durable DB-backed rate limiting now exists for several routes. It also labels `/api/share/[token]/activity` as owner-only (`.ai/06_specs/walkthrough-shared-link-overhaul.md:117`), while the route is a public-safe filtered GET (`src/app/api/share/[token]/activity/route.ts:27`).

## 5. Positive Controls To Preserve

- Raw publication tokens are HMAC-hashed for lookup and encrypted separately only for manager recopy/email reconstruction (`src/lib/publication/security.ts:71`, `src/lib/publication/security.ts:76`, `src/lib/publication/actions.ts:500`).
- Production token secrets fail closed when missing (`src/lib/publication/security.ts:93`, `src/lib/publication/security.ts:100`).
- Passwords use normalized scrypt hashes and are never stored in plaintext (`src/lib/publication/security.ts:121`, `src/lib/publication/security.ts:135`).
- Password access cookies are signed, HttpOnly, SameSite=Lax, max-age limited, token/publication/credential bound (`src/lib/publication/security.ts:328`, `src/lib/publication/security.ts:343`).
- Password, comment, decision, and event public POSTs use same-origin CSRF header/cookie checks (`src/lib/publication/security.ts:358`, `src/app/api/share/[token]/password/route.ts:34`, `src/app/api/share/[token]/comment/route.ts:185`, `src/app/api/share/[token]/decision/route.ts:124`, `src/app/api/share/[token]/events/route.ts:17`).
- Recipient session cookies are signed, HttpOnly, SameSite=Lax, Secure in production, and bound to token/publication/credential/recipient (`src/lib/publication/security.ts:473`, `src/lib/publication/security.ts:493`, `src/lib/publication/security.ts:445`).
- Password-protected snapshot JSON and page metadata are gated before project details are exposed (`src/app/api/share/[token]/route.ts:35`, `src/app/share/[token]/page.tsx:142`, `src/app/share/[token]/page.tsx:271`).
- Public snapshot rows strip unit cost, misc cost, and contingency percentage from both fresh and legacy snapshots (`src/lib/publication/snapshot.ts:71`, `src/lib/publication/snapshot.ts:95`, `src/lib/publication/snapshot.ts:112`; tested at `tests/vitest/project-publication-snapshot.test.ts:68`).
- Public image URL normalization blocks off-origin, credentialed, query/hash, traversal, project-image, and non-WebP Supabase URLs (`src/lib/publication/image-url.ts:31`, `src/lib/publication/image-url.ts:36`, `src/lib/publication/image-url.ts:38`, `src/lib/publication/image-url.ts:42`).
- Public comment/decision routes validate UUID-shaped optional target ids, sanitize comments, truncate note/body length, map unexpected DB errors to generic public 500 envelopes, and keep details server-side (`src/app/api/share/[token]/comment/route.ts:255`, `src/app/api/share/[token]/comment/route.ts:289`, `src/app/api/share/[token]/comment/route.ts:327`, `src/app/api/share/[token]/decision/route.ts:137`, `src/app/api/share/[token]/decision/route.ts:235`).
- Direct Data API access is default-deny for share credential material; recipient token hashes are service-role-only (`supabase/migrations/20260601145000_lock_down_shared_link_recipient_credentials.sql:5`, `supabase/migrations/20260601145000_lock_down_shared_link_recipient_credentials.sql:24`).
- GET unsubscribe is read-only and renders an escaped confirmation interstitial, preventing email scanner prefetch from mutating state (`src/app/api/share/[token]/unsubscribe/route.ts:47`, `src/app/api/share/[token]/unsubscribe/route.ts:50`, `tests/vitest/share-unsubscribe-interstitial.test.ts:22`).
- Most public API responses include `Cache-Control: no-store`; route tests cover important no-store/public gating behavior.

## 6. Implementation Priorities And Tests Needed

1. Fix stale snapshot write authorization first.
   - Change both current RPCs to reject any mismatch, not only future versions.
   - Add app-layer 409 when `viewedSnapshotVersion !== access.snapshotVersion`.
   - Replace tests that currently accept old view-token writes after content-only republish.
   - Add red tests tied to the old security findings: stale decision and stale comment must fail after republish while fresh current page submits.

2. Harden session initialization.
   - Add CSRF to `POST /api/share/[token]/session`.
   - Add durable session-init rate limiting before recipient token lookup.
   - Test missing CSRF, cross-origin, absent Origin policy, rate-limited repeated invalid recipient token, password-gated session creation, and happy path.

3. Bound public open/event write volume.
   - Add event write limiting to page/API open recording, not only `/events`.
   - Test page render and API snapshot GET under repeated requests do not write unbounded event rows.

4. Align log privacy with DB telemetry privacy.
   - Replace unsalted route-local IP hashes with shared HMAC-peppered helper.
   - Add static test preventing `createHash("sha256").update(ip)` in public share routes.

5. Decide and document public location privacy.
   - Either intentionally preserve `project.location` in publication snapshots or introduce a redacted/public-safe location field.
   - Test exact GPS/private route metadata cannot appear in public snapshots.

6. Convert pending DB hardening into reviewed applied migrations when ready.
   - One active publication per project.
   - Snapshot-size guardrail.
   - Telemetry retention and scheduled rate-limit GC.
   - Manager-read RLS symmetry for `project_publication_events`.

## 7. Handoffs / Conflicts For Other Lanes

- Implementation lane: treat SEC-SHARE-01 as the highest-priority security fix. It may conflict with the current UX/product expectation that old open pages can still submit after content-only republish. Security recommendation is reload-required on content change for comments/decisions.
- Product/UX lane: decide whether old rendered pages should be allowed to comment on historical content. If yes, the data model needs explicit historical snapshot binding and owner UI must show the comment/decision was made against version N, not the current proposal. Current code stores only current publication plus expected version and does not render historical snapshot context.
- Database lane: pending review migrations under `supabase/migrations-pending-review/` should not be assumed live. Coordinate before applying because several are low-risk but one-published-publication and index-drop work have preflight requirements.
- Privacy/legal lane: confirm whether public publication snapshots may include exact `project.location`, `clientName`, and total cost by default. The code currently does.
- Notifications lane: owner digest currently likely requires auth and silently skips from public routes. Split this from security fixes if needed, but do not claim recipient activity email digest is working until tested.
- Worktree coordination: many unrelated files were dirty at audit start. This report intentionally does not modify source or tests.
