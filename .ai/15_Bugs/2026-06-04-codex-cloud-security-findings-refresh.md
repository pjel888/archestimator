# Codex Cloud Security Findings Refresh Blocks Beta Readiness

**Detected:** 2026-06-04 local / 2026-06-03T18:39:31.434Z UTC
**Source:** Authenticated Chrome visit to `https://chatgpt.com/codex/cloud/security/findings`, refreshed via the Codex Security UI.
**Status:** OPEN
**Severity:** Launch blocker until triaged; latest refresh still shows `1-20 of 43` findings and a Scans page behind latest `main`.

## Why This Exists

The cheaper closed-beta provider path is partially proven, but the current Codex Security dashboard still lists open findings against `pjel888/archestimator`. Closed beta cannot be honestly called launch-ready until the medium findings are triaged and either fixed, accepted by owner/legal/security judgment, or proven stale/false-positive with evidence.

## Latest Dashboard Refresh - 2026-06-04T04:05:09.942Z

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-dashboard-refresh-2026-06-04T0405Z.json`.
- Findings page: authenticated Chrome refresh still reports `1-20 of 43`.
- Scans page: status is `Waiting for new commits`; owner is
  `philipjonlewis@gmail.com`; repository is `pjel888/archestimator`;
  environment is `archestimator`; branch is `main`; last scanned commit is
  `28601375` at `11:52 AM Jun 4, 2026`; latest pushed repo head is `6297cec`.
- GitHub: no open PRs, no open issues, no new commit/issue/PR review comments
  since June 4, and no status contexts/check-runs for latest `main`. The combined
  status appears pending only because GitHub reports zero contexts/check-runs.
- Launch meaning: Codex Security is not caught up to the latest pushed proof
  commits. Do not treat the remaining dashboard findings as closed until Codex
  Security rescans/clears them or the owner explicitly accepts the residual risk.

Latest first-page finding titles:

1. `Project deletion no longer cleans project image objects`
2. `Unscoped Speed Insights exposes sensitive app URLs`
3. `New share review GET APIs are not rate limited`
4. `Mass deletion audit records are caller-tamperable`
5. `Role demotion migration is blocked by its own trigger`
6. `Hosted auth smoke sends cookies to unvalidated URL`
7. `Beta feedback RLS allows forged cross-tenant context`
8. `Denied beta users keep Supabase sessions`
9. `Committed Lighthouse reports leak Supabase session cookies`
10. `Unauthenticated digest server action emails owners`
11. `Revoked invite RPC leaks project and email metadata`
12. `Committed public share token and user project data`
13. `Unbounded share tree parsing can DoS share renders`
14. `Global comment circuit breaker can be tripped by bad UUIDs`
15. `Unvalidated share image URLs enable client tracking`
16. `Stale share sessions can approve newer publication snapshots`
17. `Stale recipient sessions can post share comments`
18. `Password-protected share metadata leaks project details`
19. `Republish can widen shared links to all estimate sheets`
20. `Project images are uploaded to a public listable bucket`

## Current Findings Snapshot

| # | Severity | Finding |
|---|---|---|
| 1 | medium | Unscoped Speed Insights exposes sensitive app URLs |
| 2 | medium | New share review GET APIs are not rate limited |
| 3 | medium | Mass deletion audit records are caller-tamperable |
| 4 | medium | Role demotion migration is blocked by its own trigger |
| 5 | medium | Hosted auth smoke sends cookies to unvalidated URL |
| 6 | medium | Beta feedback RLS allows forged cross-tenant context |
| 7 | medium | Denied beta users keep Supabase sessions |
| 8 | medium | Committed Lighthouse reports leak Supabase session cookies |
| 9 | medium | Unauthenticated digest server action emails owners |
| 10 | medium | Revoked invite RPC leaks project and email metadata |
| 11 | medium | Committed public share token and user project data |
| 12 | medium | Unbounded share tree parsing can DoS share renders |
| 13 | medium | Global comment circuit breaker can be tripped by bad UUIDs |
| 14 | medium | Unvalidated share image URLs enable client tracking |
| 15 | medium | Stale share sessions can approve newer publication snapshots |
| 16 | medium | Stale recipient sessions can post share comments |
| 17 | medium | Password-protected share metadata leaks project details |
| 18 | medium | Republish can widen shared links to all estimate sheets |
| 19 | medium | Project images are uploaded to a public listable bucket |
| 20 | medium | AI Ask endpoint lacks quota and fails open on audit |
| 21 | medium | Unbounded chart and XLSX export loading can exhaust server resources |
| 22 | medium | Direct RLS grants bypass component price audit |
| 23 | medium | Viewer members can mutate library folders |
| 24 | medium | CSV export allows spreadsheet formula injection |
| 25 | medium | Unpinned MCP tooling auto-executes external packages |
| 26 | medium | Proposal pages now expose internal unit-rate details |
| 27 | medium | Confidential client proposal committed to repository |
| 28 | low | Public activity cursors leak raw database IDs |
| 29 | low | Client activity view models leak raw UUID identifiers |
| 30 | low | Hosted export proof leaks project names in artifacts |
| 31 | low | Unescaped tree node IDs can crash share-page navigation |
| 32 | low | Persisted row image URLs can track estimate viewers |
| 33 | low | Unvalidated component source URLs allow script links |
| 34 | informational | Prompt overrides no-auto-merge policy and pushes main |
| 35 | informational | Bid workbook formulas omit contingency costs |
| 36 | informational | Shared-link recipient email exposed to project viewers |
| 37 | informational | Codex config auto-runs unpinned external tooling |
| 38 | informational | Folder delete can fail from sort-order collision |
| 39 | informational | Workspace seed migration reuses global item UUIDs |
| 40 | informational | Optimistic tree IDs can be submitted as parents |
| 41 | informational | Luna Heights seed estimate is rebuilt then deleted |
| 42 | informational | Production grid accepts negative estimate numbers |

## Speed Insights Finding Remediation

- Finding: `Unscoped Speed Insights exposes sensitive app URLs`.
- Repo fix: `5b9c3cb` on `main` removes `@vercel/speed-insights`, the root-layout import, and `<SpeedInsights />`.
- Production deploy: `dpl_CrCtjK3HfEKszvS44DWdQy8mEj8a`, Ready, target `production`, URL `https://archestimator-rb9kpgrst-philipjonlewis-projects.vercel.app`.
- Aliases verified by Vercel inspect: `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`.
- Hosted smoke: `https://www.archestimator.com/api/health` returned HTTP 200 after deploy.
- HTML marker scan: homepage contained no `SpeedInsights`, `speed-insights`, `/_vercel/speed-insights`, or `va.vercel-scripts.com` markers after deploy.
- Dashboard status: still pending Codex cloud rescan/closure; do not mark the overall 42-finding blocker closed from this single fix.

## Additional Repo Remediation Pending Rescan

- Production deploy: `dpl_4pGbs2jq95XDaXJotdc84D2QMy4n`, Ready, target `production`, URL `https://archestimator-9xupmkzu7-philipjonlewis-projects.vercel.app`.
- Aliases verified by Vercel inspect: `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`.
- Hosted smoke after deploy: `https://www.archestimator.com/api/health` returned app health JSON with HTTP 200; `https://archestimator.vercel.app/api/health` returned HTTP 200; apex `/api/health` redirected to `www`; signed-out `HEAD /workshop` returned HTTP 307 to `/login?next=%2Fworkshop`; `HEAD /login` returned HTTP 200.
- HTML marker scan after deploy: homepage contained 0 `SpeedInsights`, `speed-insights`, `/_vercel/speed-insights`, or `va.vercel-scripts.com` markers.
- Post-deploy Codex Security dashboard refresh: Findings still shows `1-20 of 42`; selected Speed Insights finding still points at old commit `bde0ae4`; Scans reports last scanned commit `00f6d8b8` at 3:07 AM Jun 4; Scans status remains `Waiting for new commits`; the aggregate scan badges show 4 critical, 6 high, 30 medium, and 6 low findings; the New Scan form says the repository is already being scanned and keeps Create disabled. No signed validation artifact URLs were copied into this note.
- Follow-up Findings pagination check: direct `sev=critical` filtering returned no rows, and pages 1-3 of the current Findings table contain 27 medium, 6 low, and 9 informational rows. The earlier 4 critical / 6 high / 30 medium / 6 low count is therefore tracked as a stale or different scan-aggregate surface, not the current Findings table content.
- Production deploy: `dpl_8ZQDQopHv95H94m1uR6xZgU8RvYD`, Ready, target `production`, URL `https://archestimator-f6dbdasoj-philipjonlewis-projects.vercel.app`.
- Aliases verified by Vercel inspect: `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`.
- Hosted smoke after deploy: `https://www.archestimator.com/api/health` returned HTTP 200; signed-out `HEAD /workshop` returned HTTP 307 to `/login?next=%2Fworkshop`; `HEAD /login` returned HTTP 200.
- HTML marker scan after deploy: homepage contained no `SpeedInsights`, `speed-insights`, `/_vercel/speed-insights`, or `va.vercel-scripts.com` markers.
- Finding: `New share review GET APIs are not rate limited`.
  - Repo fix: comment-history and decision-state GET handlers now apply durable recipient-scoped read rate limits before loading review data.
  - Verification: focused publication/auth suites passed 8 files / 106 tests.
- Finding: `Denied beta users keep Supabase sessions`.
  - Repo fix: denied or revoked beta access in both `/auth/callback` and `src/proxy.ts` now calls Supabase `signOut()` before redirecting to `/beta/access-required`; proxy redirects preserve cookie-clearing response cookies.
  - Verification: focused auth suites passed 3 files / 27 tests, then passed again inside the 8-file focused suite.
- Findings: `Committed Lighthouse reports leak Supabase session cookies`, `Committed public share token and user project data`, and `Confidential client proposal committed to repository`.
  - Repo fix: raw authenticated Lighthouse `.report.html` / `.report.json` artifacts were deleted, old auth/share seed evidence was redacted or removed, and the client-identifying Grand Hyatt proposal extraction was replaced with a redacted README.
  - Verification: targeted repository scan no longer finds the raw Supabase auth cookie value patterns, raw access/refresh tokens, or the removed Grand Hyatt client-identifying terms in the cleaned archive paths.
- Finding: `Hosted auth smoke sends cookies to unvalidated URL`.
  - Repo fix deployed in `e5b17dc` / production `dpl_4pGbs2jq95XDaXJotdc84D2QMy4n`: `scripts/verify-hosted-auth-routes.ts` now validates `HOSTED_AUTH_BASE_URL` against `HOSTED_AUTH_ALLOWED_ORIGINS` (or safe production defaults) and refuses to send hosted cookies to unapproved or non-HTTPS origins.
  - Verification: `tests/vitest/hosted-auth-route-smoke-script.test.ts` passed inside the 12-file / 127-test security-focused suite.
- Finding: `Beta feedback RLS allows forged cross-tenant context`.
  - Local repo fix: new forward migration `20260603191535_harden_beta_feedback_context.sql` replaces the insert policy so authenticated direct inserts must match `auth.uid()`, the JWT email, actor workspace membership, actor project access, and project/workspace consistency.
  - Linked Supabase proof: exact-file `db query --linked` apply succeeded, `migration repair --status applied 20260603191535` succeeded, and targeted readback verified exactly 1 hardened feedback insert policy with actor/email/workspace/project checks.
  - Verification: `tests/vitest/beta-feedback.test.ts` passed inside the 12-file / 127-test security-focused suite.
- Finding: `Unauthenticated digest server action emails owners`.
  - Repo fix deployed in `e5b17dc` / production `dpl_4pGbs2jq95XDaXJotdc84D2QMy4n`: `maybeTriggerSharedLinkActivityDigest` now returns `digest-auth-required` before sending when invoked without an authenticated current-user context.
  - Verification: `tests/vitest/project-publication-activity.test.tsx` passed inside the 12-file / 127-test security-focused suite.
- Finding: `Mass deletion audit records are caller-tamperable`.
  - Actor-attribution fix deployed in `e5b17dc` / production `dpl_4pGbs2jq95XDaXJotdc84D2QMy4n`: forward migration `20260603191903_harden_mass_deletion_actor_derivation.sql` drops the caller-supplied execute signatures and recreates mass deletion execute RPCs with `actor_id := auth.uid()`; app RPC calls and generated Supabase types no longer pass `acting_user_id` for project/sheet/component bulk delete/archive.
  - Cleanup-result follow-up: migration `20260604031000_lock_mass_deletion_cleanup_result_rpc.sql` recreates `record_mass_deletion_storage_cleanup_result(uuid,jsonb)` as service-role-only, revokes `authenticated` execution, and limits updates to pending project cleanup events; `src/lib/projects/actions.ts` now records cleanup audit results through server-only `createSupabaseServiceRoleClient`.
  - Linked Supabase proof: exact-file apply/repair succeeded for `20260603191903` and `20260604031000`; readback verified 3 actor-derived execute RPCs, 0 legacy `acting_user_id` execute args, `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`, cleanup guard clauses present, and both migration versions recorded.
  - Verification: focused mass-deletion/storage/security suite passed 5 files / 31 tests, `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --check`, and GitNexus low-risk detect-changes passed. Production deploy `dpl_CyfR2LA7vMLqR9sDMncgxbgVbcRj` is Ready from clean commit `9fed643`, aliases include `https://www.archestimator.com` and `https://archestimator.com`, `https://www.archestimator.com/api/health` returned HTTP 200, and apex `/login` redirects to `www`.
- Finding: `Revoked invite RPC leaks project and email metadata`.
  - Repo fix deployed in `e96f26d` / production `dpl_9oD4kCVrJjAqjwTsP8jYsgkMbufe`: new forward migration `20260603195154_harden_revoked_invite_resolution.sql` preserves `public.resolve_collaboration_invitation(text)` and its anon/authenticated execute grants while changing revoked-token responses to return only `state = 'revoked'` and null invitation/project/contact metadata.
  - Linked Supabase proof: pre-readback snapshot under `/Users/philiplewis/.codex/backups/archestimator/supabase/20260603T195348Z-revoked-invite-resolution` showed the old revoked branch returning token/project/contact fields and the new version absent; exact-file `db query --linked` apply succeeded; `migration repair --status applied 20260603195154` succeeded; post-readback verified the revoked-null branch is live, the revoked-metadata branch is absent, versions `20260601033000` and `20260603195154` are recorded, anon/authenticated execute grants remain, and a bogus-token RPC smoke returned `invalid` with no metadata.
  - Verification: red/green `tests/vitest/project-invite-entry-schema.test.ts` passed, then focused invite suite passed 4 files / 30 tests; `bun run type-check`, `bun run lint` with existing 14 warnings / 0 errors, `git diff --check`, and `bun run build` passed. Post-deploy smoke returned HTTP 200 from `https://www.archestimator.com/api/health` and `https://archestimator.vercel.app/api/health`, apex `/api/health` redirected to `www`, `/login` returned HTTP 200, signed-out `/workshop` returned HTTP 307 to `/login?next=%2Fworkshop`, homepage title was `Archestimator | Quote, Proposal & Estimate Workspace`, and homepage HTML contained 0 Speed Insights markers.
  - Dashboard status: refresh after deploy still shows the revoked-invite finding in the current Findings table against old commit `2822b07`; pending Codex Security rescan/closure.
- Finding: `Unbounded share tree parsing can DoS share renders`.
  - Repo fix deployed in `d5e2f72` / production `dpl_GZGTeF1vzqA3X18MZ92rpz3eDDwT`: `src/lib/share/reconstruct-share-tree.ts` now bounds attacker-controlled share snapshot `designation` text before split/allocation by slicing to 2048 characters, capping split output to `MAX_DEPTH + 1` segments, capping node labels to 120 characters, and preserving the hostile row on the last retained segment.
  - Verification: red/green `tests/vitest/share/reconstruct-share-tree.test.ts` first failed on the old behavior (row count `0` for an 80-segment designation and an uncapped 2000-character label), then passed after the fix; focused share/publication suite passed 5 files / 64 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --check`, `bun run build`, GitNexus impact/detect-changes LOW risk, and code-review-graph detect_changes risk `0.55` with 0 affected flows passed. A direct Bun adversarial probe with 100,000 delimiter segments returned in about 5.8ms with 21 nodes, max depth 20, rowCount 1, and total 777.
  - Hosted smoke: production deploy `dpl_GZGTeF1vzqA3X18MZ92rpz3eDDwT` is Ready and aliased to `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, `/login` returned HTTP 200, signed-out `/workshop` returned HTTP 307 to `/login?next=%2Fworkshop`, homepage title was `Archestimator | Quote, Proposal & Estimate Workspace`, and homepage HTML had 0 Speed Insights markers.
  - Dashboard status: refresh after deploy still shows the share-tree finding in the current Findings table against old commit `fc81341`; pending Codex Security rescan/closure.
- Finding: `Global comment circuit breaker can be tripped by bad UUIDs`.
  - Repo fix deployed in `e6f3191` / production `dpl_2Db33pi2kaUiExZQnU4hShpEJSwv`: `src/app/api/share/[token]/comment/route.ts` now validates authenticated shared-link comment `estimateId` and `rowId` payload fields as optional canonical UUIDs before durable rate-limit checks, process-global circuit accounting, or `insert_client_comment` RPC calls. Malformed optional target IDs return HTTP 400 and never become Supabase/PostgREST UUID cast 500s.
  - Verification: red/green `tests/vitest/project-publication-comments.test.tsx` first failed on the old behavior (malformed `estimateId` returned HTTP 500), then passed after the fix; the regression proves repeated malformed `estimateId`/`rowId` attempts do not call `checkSharedLinkCommentRateLimit` or `insertSharedLinkComment`, and a later valid comment still returns 201. Full comment route/component suite passed 23 tests; focused share/publication route suite passed 4 files / 55 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --check`, `bun run build`, GitNexus exact-symbol impact LOW, and code-review-graph affected-flow check 0 flows passed. A broad `bunx vitest run --maxWorkers=1` attempt still fails on unrelated stale closed-beta readiness-doc expectations for old `vercel-env-readiness-*` artifact names.
  - Hosted smoke: production deploy `dpl_2Db33pi2kaUiExZQnU4hShpEJSwv` is Ready and aliased to `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, `/login` returned HTTP 200, and signed-out `/workshop` returned HTTP 307 to `/login?next=%2Fworkshop`.
  - Dashboard status: refresh after deploy still shows the comment-circuit finding in the current Findings table against old commit `2d93eef`; pending Codex Security rescan/closure.
- Finding: `Unvalidated share image URLs enable client tracking`.
  - Repo fix deployed in `dc0aff1` / production `dpl_HiJpSuKpvqnHbCNxi93e89p7Ay1k`: new `normalizePublicationImageUrl` allows only local `/component-thumbnails/*` raster assets and same-origin Supabase public WebP images under `/storage/v1/object/public/component-images/`, with no query strings, fragments, credentials, traversal, SVG, `data:`, `blob:`, off-origin URLs, or `/project-images/` paths. Snapshot creation normalizes project cover and row image URLs, and `SharePageHero`, `SharePageTabs`, `ShareEstimateTreeView`, and `ShareEstimateTreePanel` defensively normalize legacy snapshot values before passing them to `next/image`.
  - Verification: red/green `tests/vitest/project-publication-snapshot.test.ts` and `tests/vitest/project-publication-page.test.tsx` first failed on the old behavior (tracker/data URLs rendered or persisted), then passed after the fix. Full focused snapshot/page suite passed 2 files / 26 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --check`, `bun run build`, GitNexus refresh, and code-review-graph detect/flow checks passed with 0 affected flows.
  - Hosted smoke: production deploy `dpl_HiJpSuKpvqnHbCNxi93e89p7Ay1k` is Ready, target `production`, URL `https://archestimator-1qcjoesal-philipjonlewis-projects.vercel.app`, and aliased to `https://www.archestimator.com`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, `/login` returned HTTP 200, and signed-out `/workshop` returned HTTP 307 to `/login?next=%2Fworkshop`.
  - Dashboard status: refresh after deploy still shows the share-image finding in the current Findings table against old commit `4c7c406`; pending Codex Security rescan/closure.
- Finding: `Stale share sessions can approve newer publication snapshots`.
  - Repo fix deployed in `e28a8d6` / production `dpl_ET8ZwGjxdfv7CxsXoJgUuao1eHfY`: `/api/share/[token]/decision` now resolves current publication access from the token, verifies the recipient-session cookie against current DB `publicationId` and `snapshotVersion`, passes `expectedSnapshotVersion` through the repository helper, and returns HTTP 409 when the publication snapshot changed before submission.
  - Linked Supabase proof: exact-file `db query --linked` applied `20260603210653_lock_shared_link_response_snapshot_version.sql`; `migration repair --linked --status applied 20260603210653` succeeded; readback under `/Users/philiplewis/.codex/backups/archestimator/supabase/20260603T211000Z-decision-snapshot-lock` verified old 4-arg `submit_client_response` signature count `0`, new 5-arg signature count `1`, expected-snapshot argument and mismatch guard present, `service_role` execute true, anon/authenticated execute false, and migration version recorded.
  - Verification: red/green focused route/repository/security-contract suite passed 3 files / 32 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --check`, `bun run build`, and graph checks passed.
  - Hosted smoke: production deploy `dpl_ET8ZwGjxdfv7CxsXoJgUuao1eHfY` is Ready and aliased to `https://www.archestimator.com`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, `/login` returned HTTP 200, and signed-out `/workshop` returned HTTP 307 to `/login?next=%2Fworkshop`.
  - Dashboard status: refresh after deploy still showed the stale-decision finding in the current Findings table against old commit `45673c8`; pending Codex Security rescan/closure.
- Finding: `Stale recipient sessions can post share comments`.
  - Repo fix deployed in `d4b5733` / production `dpl_2Ne8GUjgs1TT8tjj24Z3SaZLHxQ2`: `/api/share/[token]/comment` now resolves current publication access from the token, verifies the recipient-session cookie against current DB `publicationId` and `snapshotVersion`, passes `expectedSnapshotVersion` through the repository helper, and returns HTTP 409 when the publication snapshot changed before comment insert.
  - Linked Supabase proof: exact-file `db query --linked` applied `20260603214151_lock_shared_link_comment_snapshot_version.sql`; `migration repair --linked --status applied 20260603214151` succeeded; readback under `/Users/philiplewis/.codex/backups/archestimator/supabase/20260603-214151-comment-snapshot-lock` verified old 5-arg `insert_client_comment` signature count `0`, new 6-arg signature count `1`, expected-snapshot argument and mismatch guard present, `service_role` execute true, anon/authenticated execute false, and migration version recorded.
  - Verification: red/green focused route/repository/security-contract suite passed 3 files / 42 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --check`, `bun run build`, and graph checks passed.
  - Hosted smoke: production deploy `dpl_2Ne8GUjgs1TT8tjj24Z3SaZLHxQ2` is Ready and aliased to `https://www.archestimator.com` and `https://archestimator.com`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, `/login` returned HTTP 200, and signed-out `/workshop` returned HTTP 307 to `/login?next=%2Fworkshop`.
  - Dashboard status: pending Codex Security rescan/closure; this local/linked/deployed proof does not close the overall security blocker by itself.
- Finding: `Password-protected share metadata leaks project details`.
  - Repo fix deployed in `25025d3` / production `dpl_FsPnWZiVEtZGGKMuDQAWHUXULyp4`: `/share/[token]` `generateMetadata` now checks `resolveProjectPublicationAccessByToken(token)` and returns generic locked-proposal metadata before calling `resolveProjectPublicationSnapshotByToken(token)` when `passwordRequired` is true.
  - Verification: red/green `tests/vitest/project-publication-page.test.tsx -t "password-protected share metadata"` first failed on old snapshot resolution, then passed after the fix; full affected share/security suite passed 3 files / 48 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --check`, `bun run build`, and graph checks passed.
  - Hosted smoke: production deploy `dpl_FsPnWZiVEtZGGKMuDQAWHUXULyp4` is Ready and aliased to `https://www.archestimator.com` and `https://archestimator.com`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, `/login` returned HTTP 200, and signed-out `/workshop` returned HTTP 307 to `/login?next=%2Fworkshop`.
  - Proof gap: no real locked hosted share token was available for crawler-level HTML/OpenGraph proof; dashboard status remains pending Codex Security rescan/closure.
- Finding: `Republish can widen shared links to all estimate sheets`.
  - Repo fix deployed in `84f12e3` / production `dpl_5MXgQGJYUr8QjEmRgvX2DhioPZ2o`: `getProjectPublicationSummary()` now returns persisted `selectedEstimateIds`, and `ProjectPublicationHeader` defaults the live-link sheet picker from that persisted scope instead of every project sheet when `summary.status === "published"`.
  - Verification: red/green `tests/vitest/project-publication-header.test.tsx -t "does not widen" --maxWorkers=1` first failed on the old all-sheet default, then passed after the fix; full affected publication header/summary/actions suite passed 3 files / 47 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --check`, `bun run build`, code-review-graph detect/affected-flow/impact checks, and `npx gitnexus analyze` / status passed.
  - Hosted smoke: production deploy `dpl_5MXgQGJYUr8QjEmRgvX2DhioPZ2o` is Ready and aliased to `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, `/login` returned HTTP 200, and signed-out `/workshop` returned HTTP 307 to `/login?next=%2Fworkshop`.
  - Proof gap: no hosted manual republish against a real previously subset-scoped project was run; dashboard status remains pending Codex Security rescan/closure.
- Finding: `Project images are uploaded to a public listable bucket`.
  - Repo fix deployed in `ea4aa95` / production `dpl_AinsiY5f2yaS3pED1zGnfKzKumwE`: project cover uploads now use the private `project-images` bucket, return same-origin `/api/projects/images?path=...` URLs, and serve only after authenticated project access resolves. Public share snapshot image normalization strips project-image route/storage URLs, `next.config.ts` no longer allows public `project-images` remotes, project cleanup targets the private bucket, and existing project metadata was rewritten to private route URLs.
  - Linked Supabase proof: exact-file `db query --linked` applied `20260603222628_private_project_image_storage.sql`; `migration repair --linked --status applied 20260603222628` succeeded; follow-up exact-file apply of `20260603224800_qualify_project_image_storage_policies.sql` repaired policy predicates with explicit `storage.objects.name` qualification and full UUID checks, with version `20260603224800` recorded remotely. Readback verified `project-images.public=false`, `component-images` public policy excludes `/project-images/`, old public component-bucket project-image object count `0`, private project-image object count `6`, project metadata public references `0`, private route references `3`, and project-image read/insert/update/delete policies present.
  - HTTP proof: cache-busted old public component-image project object returned HTTP 400 `Object not found`; direct public `project-images` bucket URL returned HTTP 400; unauthenticated same-origin `/api/projects/images?path=...` returned HTTP 307 to `/login`.
  - Verification: focused storage/security contract passed `tests/vitest/security-findings-contracts.test.ts` after the policy repair; earlier affected suite for the code change passed 6 files / 69 tests, `bun run type-check`, `bun run lint` with existing warnings / 0 errors, `git diff --check`, and `bun run build`. Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/project-images-private-storage-2026-06-04.json`.
  - Dashboard status: pending Codex Security rescan/closure; hosted signed-in image-view proof with a real beta browser session remains useful but is not required to prove the public/listable bucket exposure is removed.
- Finding: `AI Ask endpoint lacks quota and fails open on audit`.
  - Repo fix deployed in `e48eb0f` / production `dpl_GbaEYo8NPmFVS6MQCirpqRBs5RF3`: `/api/ai/ask` now checks durable quota in `security_rate_limit_events` before workspace context reads or provider calls, returns HTTP 429 with `Retry-After` on quota denial, returns HTTP 503 when quota storage is unavailable, requires a `started` Ask audit upsert before DeepSeek is called, withholds successful provider output unless the `completed` audit update succeeds, and requires failed audit persistence for read-context/provider failures before returning their normal error response.
  - Verification: red/green AI Ask route coverage first failed on the old behavior, then focused AI route/audit verification passed 5 files / 66 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `bun run build`, `git diff --check`, GitNexus staged detect-changes LOW risk with 0 affected processes, and production Vercel build/deploy all passed. Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/ai-ask-quota-audit-fail-closed-2026-06-04.json`.
  - Hosted smoke: production deploy `dpl_GbaEYo8NPmFVS6MQCirpqRBs5RF3` is Ready and aliased to `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, and signed-out `POST https://www.archestimator.com/api/ai/ask` returned HTTP 404 with `{"error":"AI is disabled for closed beta."}`.
  - Proof gap: no hosted enabled-AI provider call or linked live audit/quota row insertion was run because AI remains intentionally disabled for the cheaper closed beta; dashboard status remains pending Codex Security rescan/closure.
- Finding: `Unbounded chart and XLSX export loading can exhaust server resources`.
  - Repo fix deployed in `0e5dfff` / production `dpl_3zUJ5kvqkT9QUA75boNcGA75Ref8`: project chart repository reads now cap estimate options, row facts, node facts, category facts, and supplier facts with query-level sentinel limits; large chart projects load selected/default estimates instead of every estimate; the XLSX route passes export-only node/row limits into `getProjectEstimateTreeByEstimate` and returns HTTP 413 before `buildProposalExportModel` or ExcelJS workbook allocation when a sentinel limit is exceeded.
  - Verification: red/green focused export/chart/auth suite passed 4 files / 29 tests; broader export/chart/tree suite passed 9 files / 51 tests; estimate-action regression suite passed 3 files / 53 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `bun run build`, `git diff --check`, code-review graph checks, and GitNexus staged detect-changes high risk from expected shared-loader fan-out all ran. Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/chart-xlsx-load-bounds-2026-06-04.json`.
  - Hosted smoke: production deploy `dpl_3zUJ5kvqkT9QUA75boNcGA75Ref8` is Ready and aliased to `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, and `POST /api/ai/ask` still returned the closed-beta disabled HTTP 404.
  - Proof gap: no hosted authenticated oversized XLSX export or chart page smoke with real beta data was run; dashboard status remains pending Codex Security rescan/closure.
- Finding: `Direct RLS grants bypass component price audit`.
  - Linked Supabase fix applied in exact migration `20260603234326_harden_component_price_audit_grants.sql`: direct authenticated access to `cost_library_item_price_options` and `cost_library_item_price_history` is now SELECT-only, the old all-action price-option policy and price-history insert policy are gone, select-only member policies remain, and authenticated execute on `public.upsert_cost_library_component_price_option(uuid, uuid, jsonb)` is preserved so price mutations still append audit history through the security-definer RPC.
  - Linked proof: `supabase db query --linked --file supabase/migrations/20260603234326_harden_component_price_audit_grants.sql` succeeded; `supabase migration repair 20260603234326 --status applied --linked --yes` succeeded; readback verified authenticated table grants are only `SELECT` on both tables, the only policies on those tables are `members can view component price history` and `members can view component price options`, anon cannot execute the RPC, authenticated can execute the RPC, and remote migration history records `20260603234326`.
  - Verification: red/green focused component-library schema contract first failed on the missing migration and then passed `bunx vitest run tests/vitest/component-library-versioning-schema.test.ts --maxWorkers=1` with 1 file / 9 tests. Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/component-price-audit-grants-2026-06-04.json`.
  - Proof gap: no Vercel deployment was required because app writes already use the RPC; no hosted manual component price edit smoke was run after the grant hardening; dashboard status remains pending Codex Security rescan/closure.
- Finding: `Viewer members can mutate library folders`.
  - Repo and linked Supabase fix applied through `20260603235355_harden_library_folder_editor_access.sql`: component-library folder create, rename, delete, and reorder server actions now call `public.is_workspace_editor` before any folder table access or reorder write; the old all-action member policy is replaced with member SELECT plus editor-only insert/update/delete policies; `public.reorder_library_folders(uuid,jsonb)` now rejects non-editors before validation/write work; authenticated table grants are reduced to SELECT/INSERT/UPDATE/DELETE and rely on RLS for editor-only writes.
  - Linked proof: `supabase db query --linked --file supabase/migrations/20260603235355_harden_library_folder_editor_access.sql` succeeded; `supabase migration repair 20260603235355 --status applied --linked --yes` succeeded; after adding an explicit authenticated revoke-before-grant, exact-file reapply succeeded. Readback verified authenticated table grants are only SELECT/INSERT/UPDATE/DELETE, policies are member SELECT plus editor INSERT/UPDATE/DELETE, the reorder RPC uses the editor check and no member-only check, anon cannot execute the RPC, authenticated can execute it, and remote migration history records `20260603235355`.
  - Verification: red/green focused tests first failed on viewer actions reaching table access and the missing hardening migration, then passed `bunx vitest run tests/vitest/component-library-folder-actions.test.ts tests/vitest/security-findings-contracts.test.ts --maxWorkers=1` with 2 files / 16 tests; broader folder/security suite passed 5 files / 40 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --check`, and `bun run build` passed. Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/library-folder-editor-access-2026-06-04.json`.
  - Hosted smoke: production deploy `dpl_4HyXChaBFaaYa2EBTDzKMwneFkya` is Ready and aliased to `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, `/login` returned HTTP 200, and signed-out `/workshop` returned HTTP 307 to `/login?next=%2Fworkshop`.
  - Proof gap: no hosted manual viewer-account folder mutation smoke was run after the hardening; dashboard status remains pending Codex Security rescan/closure.
- Finding: `CSV export allows spreadsheet formula injection`.
  - Repo fix deployed in `6121d68` / production `dpl_5VF7nLnJYsyvKZexWQwzmH6unAC9`: component-library CSV cell serialization now prefixes text cells that would be interpreted as spreadsheet formulas with an apostrophe before CSV quote escaping. The guard covers leading spaces, tabs, CR, and LF before `=`, `+`, `-`, or `@`, while preserving the existing comma/quote/CR/LF escaping path.
  - Verification: red/green focused helper regression first failed on raw formula-leading cells, then passed `bunx vitest run tests/vitest/component-library-helpers.test.ts --maxWorkers=1` with 1 file / 14 tests; broader helper/UI suite passed 2 files / 37 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --check`, `bun run build`, code-review graph checks, and GitNexus staged detect-changes LOW risk with 0 affected processes all ran. Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/csv-formula-escape-2026-06-04.json`.
  - Hosted smoke: production deploy `dpl_5VF7nLnJYsyvKZexWQwzmH6unAC9` is Ready and aliased to `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, `/login` returned HTTP 200, and signed-out `/workshop` returned HTTP 307 to `/login?next=%2Fworkshop`.
  - Proof gap: no hosted authenticated CSV export/download was opened in Excel or Google Sheets after the fix; dashboard status remains pending Codex Security rescan/closure.
- Finding: `Unpinned MCP tooling auto-executes external packages`.
  - Repo fix committed in `d351daa`: `.mcp.json`, `.cursor/mcp.json`, and `.codex/config.toml` now launch `uvx` with `code-review-graph==2.3.5` instead of the floating `code-review-graph` package spec. `tests/vitest/security-findings-contracts.test.ts` now fails if either JSON MCP config or the Codex TOML config regresses to the floating package arg.
  - Verification: red/green focused security contract first failed on the old args `[\"code-review-graph\", \"serve\"]`, then passed after pinning; `uvx code-review-graph==2.3.5 --version` returned `code-review-graph 2.3.5`; `uvx code-review-graph==999.999.999 --version` failed closed; full security findings contract suite passed 1 file / 16 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --cached --check`, and GitNexus staged detect-changes LOW risk with 0 affected processes all ran. Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/mcp-tooling-pinned-2026-06-04.json`.
  - Deployment note: no Vercel deployment was required because this finding is repo-local MCP/tooling configuration, not production app runtime code.
  - Proof gap: Codex/Cursor MCP clients were not restarted through their full UI startup paths after the config pin; dashboard status remains pending Codex Security rescan/closure.
- Finding: `Proposal pages now expose internal unit-rate details`.
  - Repo fix deployed in `984124b` / production `dpl_Dh8xPgZ3NQwN4CwxZQXh6d8vypcn`: public publication snapshot rows no longer include `unitCost`, `miscCost`, or `contingencyPercentage`; `sanitizeProjectPublicationSnapshotForPublicRead` strips those fields from legacy stored snapshots while preserving row totals; and `/api/share/[token]` applies the sanitizer again before returning public JSON.
  - Verification: red/green snapshot and route tests first failed on future rows and dirty resolver output containing internal rate fields, then passed; focused publication snapshot/route/page suite passed 3 files / 38 tests; broader adjacent publication/security/share GET suite passed 5 files / 56 tests; `bun run type-check`, `bun run lint` with 12 existing warnings / 0 errors, `git diff --check`, `bun run build`, and GitNexus staged detect-changes LOW risk with 0 affected processes all ran. Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/proposal-public-rates-stripped-2026-06-04.json`.
  - Hosted smoke: production deploy `dpl_Dh8xPgZ3NQwN4CwxZQXh6d8vypcn` is Ready and aliased to `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`; `https://www.archestimator.com/api/health` returned HTTP 200, apex `/api/health` redirected to `www`, `/login` returned HTTP 200, and signed-out `/workshop` returned HTTP 307 to `/login?next=%2Fworkshop`.
  - Proof gap: no hosted real published share token JSON was inspected after deployment; dashboard status remains pending Codex Security rescan/closure.
- Finding: `Confidential client proposal committed to repository`.
  - Repo/docs fix: the current tree no longer retains the raw generated proposal workbook or its rendered Quick Look PNG preview. The remaining readback was renamed to `proposal-workbook-exceljs-summary-sanitized-2026-06-02.json` and stripped of the raw workbook path plus exact cached totals.
  - Documentation fix: launch evidence now says future proof must use fresh authorized exports or sanitized readback evidence rather than committed raw proposal workbooks/previews.
  - Verification target: `tests/vitest/security-findings-contracts.test.ts` and `tests/vitest/closed-beta-readiness-docs.test.ts` guard the raw artifact absence and sanitized replacement artifact. Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/confidential-proposal-artifact-withdrawal-2026-06-04.json`.
  - Proof gap: prior git history was not rewritten or force-pushed; that would be a separate destructive owner-approved operation. Dashboard status remains pending Codex Security rescan/closure.
- Finding: `Role demotion migration is blocked by its own trigger`.
  - Repo fix committed in `e5b17dc`: `20260602090000_harden_beta_allowlist_admin.sql` now disables `profiles_prevent_role_self_update` only around its controlled demotion repair and re-enables it immediately afterward. This already-applied historical migration was not re-run on linked Supabase during the follow-up pass.
  - Verification: `tests/vitest/security-findings-contracts.test.ts` passed after adding the trigger-order contract; refreshed again on 2026-06-04T03:40Z with `bunx vitest run tests/vitest/security-findings-contracts.test.ts --maxWorkers=1 --reporter=dot` (1 file / 17 tests).
- Dashboard status: all entries in this section still require Codex cloud rescan/closure before they can be treated as closed.

## Immediate Triage Order

1. Fix or disable unscoped Speed Insights on sensitive routes before beta traffic.
2. Triage findings involving committed secrets/tokens/session cookies/artifacts.
3. Triage public share/invite/auth/RLS findings before inviting any external tester beyond the owner account.
4. Separate informational workflow/config findings from runtime security blockers after the medium findings are handled.

## Proof Boundary

- This is a dashboard snapshot, not independent code-level validation of every finding.
- No signed validation-artifact URLs or credential values are copied into this repo note.
- Source of truth for current status remains the live Codex Security dashboard plus repo-local fix evidence.
