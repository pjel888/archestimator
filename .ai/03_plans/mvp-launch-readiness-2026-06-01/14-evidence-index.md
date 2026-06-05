# Evidence Index

## Project-Specific Unlink Owner-Session Browser Smoke - 2026-06-05 01:25Z

- Primary artifact directory: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/project-specific-unlink-smoke-2026-06-05T0125Z/`.
- Command: `ARCHESTIMATOR_E2E_UNLINK_SMOKE=1 ARCHESTIMATOR_UNLINK_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/project-specific-unlink-smoke-2026-06-05T0125Z PLAYWRIGHT_PORT=3023 bun run test:e2e -- --project=chromium e2e/workshop-project-specific-unlink-smoke.spec.ts`.
- Method: Playwright Chromium ran local Next.js on `127.0.0.1:3023` against linked Supabase using a real owner Supabase session minted from an admin-generated one-time magic-link token. The smoke seeds a throwaway estimate row linked to the porcelain-tile library item, seeds sheet-member access for the owner session, then deletes the throwaway estimate in `finally`.
- Result: `1 passed` in Playwright. The row detached from library (`source_library_item_id: null`, `link_state: "detached"`), edited quantity from `4` to `7`, recorded one `row_unlinked` event, preserved the source library item before/after, and the XLSX export contained both the material and edited quantity.
- Cleanup proof: pre-run and post-run linked residue checks returned `0` for `estimates`, `estimate_nodes`, `estimate_row_items`, `estimate_sheet_events`, and `estimate_sheet_members`.
- Boundary: no cookies, access tokens, refresh tokens, raw magic links, service-role keys, or provider secrets were recorded. This is linked/local owner-session browser proof; it is not a separate hosted production unlink smoke.

## Hosted Expired Synthetic Stale-Cookie Smoke - 2026-06-04 19:20Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-expired-stale-cookie-smoke-2026-06-04T1920Z.json`.
- Method: Codex generated a synthetic Supabase SSR auth cookie shape for project
  `ebxxqidacheyapmmzavr` using placeholder `expired.synthetic.*` token strings,
  `expires_at: 1`, `expires_in: 0`, and `user: null`. The cookie value was used
  only in request headers and was not recorded.
- Production route proof: `HEAD https://www.archestimator.com/workshop` with
  the synthetic stale cookie returned HTTP `307` to `/login?next=%2Fworkshop`
  with zero body bytes. `GET https://www.archestimator.com/workshop` with the
  same synthetic stale cookie returned HTTP `307` to `/login?next=%2Fworkshop`
  with a 15 byte redirect body.
- Boundary: no live Supabase auth cookies, raw OAuth callback URLs, auth codes,
  access tokens, refresh tokens, service-role keys, provider secrets, or raw
  cookie values were stored. This does not prove a harvested real browser
  session expiration timestamp or Google Cloud dashboard configuration.
- Result: production `/workshop` fails closed to the login gate when
  stale/expired-shaped Supabase SSR auth material is present. Hosted
  expired-session route proof is closed for the owner-only beta by synthetic
  stale-cookie evidence.

## Hosted Google Denied/Revoked Browser Smoke - 2026-06-04 18:51Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-google-denied-revoked-browser-smoke-2026-06-04T1851Z.json`.
- Denied proof: Computer Use signed out the owner browser session through
  `/workshop/settings`, opened `/login?next=/workshop`, selected the alternate
  Google account `RECIPIENT_EMAIL_PLACEHOLDER`, and observed
  `/beta/access-required` with the closed-beta not-enabled copy while linked
  Supabase readback showed that alternate email had no allowlist row.
- Revoked proof: Codex created a temporary `revoked` allowlist row for the same
  alternate account, repeated the Google account chooser flow, and observed
  `/beta/access-required?status=revoked` with paused-access copy.
- Cleanup proof: the temporary revoked row was deleted. Linked Supabase readback
  then showed owner active, no alternate allowlist row, one enabled beta email,
  and one total allowlist row. The browser was restored to the owner account at
  `/workshop`.
- Boundary: no cookies, raw OAuth callback URLs, auth codes, provider secrets,
  database UUIDs, or paid provider changes were recorded. A Supabase Auth user
  exists for the alternate account because real hosted OAuth occurred; it is not
  an allowlisted beta tester.
- Result: hosted denied and revoked Google OAuth proof is closed for the
  owner-only closed beta. The later 19:20Z synthetic stale-cookie artifact closes
  expired-session fail-closed route proof without storing live auth material.

## Resend Signed Delivered Webhook Reconciliation - 2026-06-04 18:09Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-signed-delivered-webhook-reconciliation-2026-06-04T1809Z.json`.
- Provider proof: Resend dashboard showed
  `https://www.archestimator.com/api/webhooks/resend` enabled and signed
  `email.sent` / `email.delivered` events attempting against it. The selected
  pre-fix delivered event returned HTTP 400 `Invalid webhook`; after the secret
  correction and replay/retry, the delivered event showed `Success`, HTTP 200,
  and response body shape `{ ok: true, matched: true, deliveryStatus: "sent" }`.
- Vercel proof: the existing masked Resend signing secret was copied without
  showing or recording the value, updated into Vercel Production and Preview(main)
  `RESEND_WEBHOOK_SECRET` from stdin, and the clipboard was cleared. Forced
  production redeploy `DEPLOYMENT_ID_PLACEHOLDER` reached Ready and was
  aliased to `www.archestimator.com`, `archestimator.com`, and
  `archestimator.vercel.app`; `www` health returned HTTP 200.
- Supabase proof: linked read-only SQL for the alternate recipient shows
  `resend_last_event_type: "email.delivered"`, non-null Resend message/event-id
  presence, and delivery metadata `event_type: "email.delivered"`.
- Boundary: no raw email href, public share URL, recipient token, token hash,
  cookie, API key, webhook secret, raw email body, full Resend id, full event id,
  full recipient id, or full database UUID was recorded. Bounce/complaint events
  were not manufactured for this owner-only beta proof.
- Result: signed delivered-event webhook reconciliation is closed for the real
  hosted shared-link email.

## Hosted Shared-Link Recipient Clickthrough/Open - 2026-06-04 17:31Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-shared-link-recipient-clickthrough-open-2026-06-04T1731Z.json`.
- Deployment proof: commit `14e0a61` was deployed as production deployment
  `DEPLOYMENT_ID_PLACEHOLDER`, `www.archestimator.com` health returned
  HTTP 200, and apex redirected to `www`.
- Bug proof: the earlier Gmail invite CTA used a relative `share/...` href that
  Gmail rewrote to an invalid `http:///share/...` redirect notice. The fix now
  emits absolute recipient CTA and unsubscribe URLs from the configured app
  origin.
- Browser proof: a fresh resend to `RECIPIENT_EMAIL_PLACEHOLDER` displayed
  an `archestimator.com/share/[redacted]` CTA in Gmail and opened the hosted
  proposal review page with the expected recipient review banner.
- Supabase proof: the alternate recipient row is now `opened` with
  `last_opened_at`, and a redacted `shared_link_events` row records
  `event_type: "open"`.
- Result: recipient clickthrough/open tracking is closed. The later 18:09Z
  artifact closes signed delivered-event webhook reconciliation for the same real
  hosted shared-link email.

## Resend Alternate-Recipient Lifecycle Blocker Refresh - 2026-06-04 16:22Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-alternate-recipient-lifecycle-blocked-2026-06-04T1622Z.json`.
- Supabase proof: the alternate recipient row remains `sent`, but
  `last_opened_at`, `resend_last_event_type`, `resend_last_event_at`, and
  `resend_last_event_id` are still null/absent. The Resend message id is recorded
  only in redacted form.
- Resend API proof: using the currently available local `RESEND_API_KEY` to
  retrieve the message lifecycle returned `restricted_api_key` because the key is
  send-only. No broader API key was created or requested.
- Vercel logs proof: branch-scoped and no-branch production log searches for the
  Resend webhook route did not yield usable route/status/request evidence that a
  signed provider event reached and updated the app.
- Chrome recovery proof: Google Chrome was running and the Codex extension plus
  native-host checks passed, but the extension backend was unavailable after
  the required lightweight retry. The later 17:31Z artifact closed recipient
  clickthrough/open through Computer Use.
- Result: this does not close the signed provider lifecycle. It narrows the
  remaining blocker to delivered/bounce/complaint webhook reconciliation, with
  current API/log proof insufficient.

## Hosted Shared-Link Recipient Inbox Receipt - 2026-06-04 15:55Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-shared-link-recipient-inbox-receipt-2026-06-04T1555Z.json`.
- Browser proof: Chrome extension control opened a targeted Gmail exact-subject
  search in `RECIPIENT_EMAIL_PLACEHOLDER`; the result count was `1-1 of 1`
  with sender `Archestimator` and subject `Project Estimate: OWNER_BETA_PROJECT_PLACEHOLDER
  shared by OWNER_NAME_PLACEHOLDER`.
- Email proof: opening the email body showed the expected view-only invitation
  copy and `View Project Estimate` CTA. The raw href/link, share URL, recipient
  token, token hash, cookies, API keys, and webhook secrets were not recorded.
- Boundary: this artifact did not prove recipient clickthrough/open at 15:55Z;
  the later 17:31Z artifact closes that app-level path.
- Result: alternate-recipient inbox receipt is proven; the later 17:31Z artifact
  closes recipient clickthrough/open and the later 18:09Z artifact closes signed
  delivered-event webhook reconciliation.

## Hosted Shared-Link Email Self-Invite Guard - 2026-06-04 15:32Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-shared-link-recipient-email-self-invite-guard-2026-06-04T1532Z.json`.
- Deployment proof: Vercel production deployment
  `DEPLOYMENT_ID_PLACEHOLDER` was Ready and aliased to
  `www.archestimator.com`, `archestimator.com`, and `archestimator.vercel.app`
  after commit `19c6b90`; `https://www.archestimator.com/api/health` returned
  HTTP 200.
- Browser proof: Chrome extension control against the owner session opened the
  hosted `OWNER_BETA_PROJECT_PLACEHOLDER` shared-link modal. Attempting to add the signed-in
  owner email `OWNER_EMAIL_PLACEHOLDER` showed `You cannot invite your own
  sign-in email to this shared link.` and kept `Send to 0 recipients` disabled.
- Send proof: the same hosted modal accepted `RECIPIENT_EMAIL_PLACEHOLDER`,
  changed `Send to 1 recipient` to a completed `sent` row, and displayed
  `Added 1 recipient(s). 1 email(s) dispatched (failures are non-fatal).`
  Supabase read-only SQL confirmed a `sent` recipient row with a redacted Resend
  message id; token/hash/encrypted-token columns were intentionally excluded.
- Boundary: this proves the self-invite guard and app-level shared-link email
  dispatch. The 15:55Z artifact proves inbox receipt for
  `RECIPIENT_EMAIL_PLACEHOLDER`; the 17:31Z artifact proves
  recipient clickthrough/open. Resend delivered/bounce/complaint webhook
  reconciliation remains open.
- Result: the self-invite defect is closed and the hosted shared-link send smoke
  is a partial pass. The full automatic email lifecycle still needs signed
  delivered/bounce/complaint webhook evidence before it can be called fully
  green.

## Hosted Logout Session Proof - 2026-06-04 14:36Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-logout-session-proof-2026-06-04T1436Z.json`.
- Deployment proof: Vercel production deployment
  `DEPLOYMENT_ID_PLACEHOLDER` was Ready and aliased to
  `www.archestimator.com`, `archestimator.com`, and `archestimator.vercel.app`
  after commit `535b68c`; `https://www.archestimator.com/api/health` returned
  HTTP 200.
- Browser proof: Computer Use against the owner Chrome profile observed
  `https://www.archestimator.com/workshop/settings` with a visible `Sign out`
  heading and button, clicked the button, observed `/login` with `Continue with
  Google`, `EMAIL LINK`, and `Send sign-in link`, then probed
  `https://www.archestimator.com/workshop/projects` and saw the login
  experience remain gated.
- Boundary: this closes logout proof only. It does not prove denied Google
  account behavior, revoked allowlist behavior, expired hosted session behavior,
  second-account OAuth callback behavior, spreadsheet-app open/recalc/print, or
  hosted shared-link/invite email workflow delivery.
- Result: owner logout and protected-route gating after logout are proven on the
  current production deployment.

## Synthetic Google Sheets Workbook Compatibility Proof - 2026-06-04 19:51Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/synthetic-google-sheets-workbook-compatibility-2026-06-04T1951Z.json`.
- Workbook proof: a synthetic 25-row proposal workbook was generated from
  `makeBenchmarkModel(25)` and `createProposalWorkbookBuffer()` with synthetic
  project/estimate metadata only. The generated XLSX was 17,853 bytes with
  SHA-256
  `7bff7517da5e443c3beb96929efd0ceda48e423248b159fa393714e7805a84de`; the
  local ExcelJS readback loaded `Bid Form`, `Summary`, `Commercial Terms`, and
  `Source Breakdown`, found frozen `A18`, print-title row `17:17`, landscape
  fit-to-width setup, sample line-total result `700`, sample subtotal result
  `20960`, and Summary grand-total formula/result `B27+B28+B29` / `149798`.
- Browser proof: Computer Use uploaded only the synthetic workbook through the
  owner Google Sheets session for `OWNER_EMAIL_PLACEHOLDER`, observed the
  imported document titled `archestimator-synthetic-25-row-proposal` saved
  privately to Drive, confirmed all four workbook tabs were visible, and
  inspected the Summary sheet with visible section totals and `Grand Total`
  `149,798`.
- Print proof: Google Sheets print settings opened for the current sheet and
  showed `Total: 1 page`, A4 paper, landscape orientation, fit-to-width scale,
  and custom margins of 0.5 / 0.25 / 0.5 / 0.25 inches. The flow was canceled;
  no print job was submitted.
- Boundary: no raw workbook bytes, screenshot, Google document id, client data,
  proposal data, cookie, token, or secret was committed. The temporary Downloads
  copy was removed. A private synthetic Google Sheets import may remain in the
  owner Drive because cloud deletion requires explicit action-time confirmation.
- Result: secondary Google Sheets import/open/recalc/print-preview proof is now
  captured for a synthetic Archestimator workbook. Native Microsoft Excel,
  Apple Numbers, and LibreOffice workbook app proof remains unproven; real downloaded structural/Quick Look proof is captured.

## Hosted Owner Beta Journey Smoke - 2026-06-04 13:28Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-owner-beta-journey-smoke-2026-06-04T1328Z.json`.
- Browser proof: Computer Use against the authenticated owner Chrome profile
  opened production `https://archestimator.com/workshop`, entered the existing
  `OWNER_BETA_PROJECT_PLACEHOLDER` project, created the first hosted estimate sheet
  `ESTIMATE_SHEET_PLACEHOLDER`, opened the estimate workspace at
  `/workshop/projects/PROJECT_ID_PLACEHOLDER/estimates/ESTIMATE_ID_PLACEHOLDER`,
  and opened `Preview Excel Export`.
- Visible production markers included project navigation, `Shared link`,
  `Teamspaces`, `1 project collaborators`, the estimate tree, `Project Scope`,
  `General Requirements`, `Site Works`, `Ground Floor`, `Project-wide`, library
  templates (`Roof Deck Lounge`, `Condo Fit-Out Starter`, `Powder Room Basic`),
  sheet running totals, `Read-only Excel preview`, and `Download editable XLSX`.
- Boundary: the run used the existing owner session and deliberately created a
  small owner beta smoke sheet in production. It does not record secrets,
  cookies, OAuth tokens, service-role keys, or webhook secrets, and it does not
  prove expired sessions, spreadsheet-app
  open/recalc/print, or hosted shared-link/invite email workflow delivery.
- Result: owner-only hosted beta journey proof is now captured for the current
  single-tester beta. External closed beta remains evidence-gated by the narrower
  expired-session, spreadsheet-app, and optional automatic-email
  workflow proof gaps.

## Codex Security History-Risk Owner Acceptance - 2026-06-04 14:14Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-history-risk-owner-acceptance-2026-06-04T1414Z.json`.
- Decision: the owner's owner signoff accepts the two remaining Codex Security
  source-control/history-exposure findings only for the current single-owner beta.
- Boundary: this does not mark `Committed public share token and user project
  data` or `Confidential client proposal committed to repository` fixed, does not
  make the Codex Security dashboard fully green, and does not approve widened beta
  or public launch without a later rescan closure, history purge, or renewed owner
  decision.
- Result: residual Codex Security history-risk is no longer a blocker for the
  single-owner beta path, but remains a public/widened-beta security boundary.

## Resend Owner Inbox Receipt - 2026-06-04 13:48Z

- Primary artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-owner-inbox-receipt-2026-06-04T1348Z.json`.
- Owner-reported receipt: OWNER_NAME_PLACEHOLDER reported that `OWNER_EMAIL_PLACEHOLDER`
  received the message with subject
  `Archestimator Resend verified smoke 2026-06-04T12:28:05.608Z` and body
  `Archestimator closed-beta Resend verified smoke test. If you received this,
  the sending domain is verified and delivery is working.`
- Linked proof: this receipt complements
  `resend-domain-verified-email-enabled-2026-06-04T1235Z.json`, which already
  records Resend domain `Verified`, production-env HTTP 200 send success,
  webhook endpoint enablement, and live webhook signature-verification
  reachability.
- Result: Resend is now proven at provider-send plus owner-inbox-receipt level.
  The remaining email proof gap is the app-level hosted shared-link/invite email
  workflow smoke before relying on automatic email UX.

## Owner Signoff And Email Default-Off Refresh - 2026-06-04 11:40Z

- Resend send-test blocker artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-send-test-domain-unverified-2026-06-04T1151Z.json`.
  A real production-env Resend send probe to `OWNER_EMAIL_PLACEHOLDER` failed
  with HTTP 403 because `contact.archestimator.com` is not verified. Resend
  dashboard proof shows DKIM verified, but `send.contact` MX
  `feedback-smtp.ap-northeast-1.amazonses.com` priority 10 and `send.contact`
  TXT `v=spf1 include:amazonses.com ~all` are missing/failed in Namecheap DNS.
  `archestimator.com` uses Namecheap registrar nameservers, so Vercel DNS cannot
  repair this record set.
- Legal/owner signoff artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/legal-owner-signoff-2026-06-04T1138Z.json`.
  It records owner-provided beta signoff from OWNER_NAME_PLACEHOLDER on 2026-06-04 with
  `legalOwnerReady: true`. It remains a closed-beta owner signoff artifact, not
  legal advice or public-launch counsel proof.
- Support/monitoring artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-monitoring-owner-signoff-2026-06-04T1138Z.json`.
  It records owner-confirmed inbox, feedback review, uptime/error alert, and
  escalation responsibility with OWNER_NAME_PLACEHOLDER as support/alert/review owner and
  `supportMonitoringReady: true`. The helper records operator-confirmed flags
  and owner labels; it does not independently verify alert dashboards.
- Resend/email artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-email-flag-default-off-2026-06-04T1140Z.json`.
  Vercel Production has encrypted `RESEND_API_KEY`, `RESEND_FROM`,
  `RESEND_REPLY_TO`, and `RESEND_WEBHOOK_SECRET` names, but it does not have
  `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`. Code now requires that explicit flag
  before non-test email delivery is considered configured, and Teamspaces/shared
  link email controls remain disabled/manual while it is absent. Result:
  `resendReady: false` by design; Resend domain/MX/delivery/webhook proof is
  deferred until email workflows are intentionally re-enabled.
- Hosted signed-out auth artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-auth-signed-out-refresh-2026-06-04T1138Z.json`.
  `https://www.archestimator.com/workshop` signed out returns HTTP 307 to
  `/login?next=%2Fworkshop`; allowed/denied/revoked/expired real-session cases
  remain missing because no hosted session cookies were provided.
- Current remaining launch blockers after the later 14:36Z hosted logout proof:
  hosted Google OAuth denied/revoked/expired real-session smoke, spreadsheet-app
  open/print proof if required for beta, and hosted shared-link/invite email
  workflow proof before relying on automatic email UX. Resend provider setup
  itself is no longer blocked, residual Codex Security history-risk is
  owner-accepted for the owner-only beta by the later 14:14Z artifact, and owner
  logout is closed by the 14:36Z artifact.

## Vercel Rollback Drill - 2026-06-04 11:12Z

- Rollback artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-rollback-drill-2026-06-04T1112Z.json`.
- Green production-readiness artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-production-readiness-rollback-drill-2026-06-04T1112Z.json`.
- Preflight: `vercel rollback status archestimator --scope VERCEL_SCOPE_PLACEHOLDER`
  reported no rollback in progress. `vercel curl` confirmed the immediate
  previous production deployment `archestimator-bssps9fmb...` returned app
  health JSON and rendered `/login`; current deployment `archestimator-br665yc8u...`
  also returned app health JSON.
- Drill: `vercel rollback https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER --scope VERCEL_SCOPE_PLACEHOLDER --yes --timeout 3m`
  succeeded and rolled production back to deployment
  `DEPLOYMENT_ID_PLACEHOLDER`. While rolled back,
  `https://www.archestimator.com/api/health` returned HTTP 200 app health JSON,
  and Vercel aliases mapped `archestimator.com`, `www.archestimator.com`, and
  `archestimator.vercel.app` to the rollback target.
- Restore: `vercel promote https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER --scope VERCEL_SCOPE_PLACEHOLDER --yes --timeout 3m`
  succeeded and restored production to deployment
  `DEPLOYMENT_ID_PLACEHOLDER`. After restore,
  `https://www.archestimator.com/api/health` again returned HTTP 200 app health
  JSON, and Vercel aliases mapped the custom domains back to
  `archestimator-br665yc8u...`.
- Result: `bun run launch:check-vercel-production` with
  `VERCEL_ROLLBACK_DRILL_STATUS=passed` reports `deploymentReady: true`,
  `customDomainsReady: true`, `rollbackCandidateAvailable: true`,
  `rollbackDrillPassed: true`, `missing: []`, and `vercelProductionReady:
  true`. No DNS, Vercel env, Supabase, paid provider, or repo source setting was
  changed.

## Cheap Backup and Vercel Readiness Refresh - 2026-06-04 10:47Z

- Official source artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/provider-cost-and-dns-source-refresh-2026-06-04T1049Z.json`.
- Supabase artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-backup-readiness-daily-mode-closed-beta-2026-06-04T1047Z.json`.
- Vercel artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-production-readiness-no-spend-refresh-2026-06-04T1043Z.json`.
- Code change proof: `scripts/check-supabase-backup-readiness.ts` now accepts
  `SUPABASE_BACKUP_READINESS_MODE=daily-backup` for the cheaper closed-beta path
  while keeping strict PITR as the default. `scripts/check-vercel-production-readiness.ts`
  now counts redirected `vercel ls` URL-only output as rollback-candidate proof
  instead of falsely reporting zero candidates.
- Supabase proof: `bun run launch:check-supabase-backup` with
  `SUPABASE_BACKUP_READINESS_MODE=daily-backup` passes from a fresh
  `supabase backups list --project-ref ebxxqidacheyapmmzavr --output json`
  transcript: 9 backups listed, `walgEnabled: true`, `pitrEnabled: false`,
  `restoreDrillStatus: blocked`, `restoreDrillAcceptedRisk: true`, `missing: []`.
- Vercel proof: production deployment `DEPLOYMENT_ID_PLACEHOLDER` is
  `READY`, `archestimator.com` and `www.archestimator.com` both alias to
  `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`, and 19 ready
  rollback candidates are available. This was later closed by the 11:12Z
  rollback drill above.
- Official source basis: Supabase pricing/backups docs checked 2026-06-04
  support the cheaper posture by distinguishing Pro daily backups from paid
  PITR. PITR remains a later public-launch or higher-risk beta upgrade, not an
  owner-only pre-launch blocker.

## Live Closed-Beta Refresh - 2026-06-04 10:06Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/live-closed-beta-refresh-2026-06-04T1006Z.json`.
- Browser proof: Computer Use observed the owner Chrome session on
  `archestimator.com/workshop/settings/profile` rendering the closed-beta app
  shell and Profile settings for `OWNER_NAME_PLACEHOLDER`; this proves the production
  custom domain is no longer showing only the orange teaser for the owner
  session.
- Vercel proof: production deployment `DEPLOYMENT_ID_PLACEHOLDER` is
  `READY`; `archestimator.com`, `www.archestimator.com`, and
  `archestimator.vercel.app` all alias to
  `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`. The old teaser
  deployment remains isolated to its branch alias.
- Hosted HTTP proof: `www` `/api/health` returns HTTP 200 app health JSON,
  `/login` returns HTTP 200 with Google sign-in and closed-beta copy, and
  signed-out `/workshop` redirects to login.
- Vercel env proof: `bun run launch:check-vercel-env` passes from a sanitized
  `vercel env ls production` transcript with all closed-beta runtime,
  Supabase, publication, Resend, invite, and AI-off env names present.
- Supabase proof: linked project `ebxxqidacheyapmmzavr` is named
  `Archestimator`; linked readback shows exactly one active allowlist tester,
  `OWNER_EMAIL_PLACEHOLDER`.
- Historical blocker snapshot: at this point Codex Security still had two
  residual history-exposure findings; Resend sender-domain DNS still lacked
  `send.contact` MX; legal/owner signoff, support/monitoring proof,
  denied/revoked/expired hosted auth smoke, and full hosted beta journey proof
  remained open. Later same-day artifacts close Resend provider proof, owner
  signoff/support monitoring, the owner hosted beta journey, and owner-scoped
  security history-risk acceptance.

## Codex Security Cheap-Path Closures - 2026-06-04 09:34Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-cheap-path-closures-2026-06-04T0934Z.json`.
- Dashboard proof: authenticated Codex Security closure work reduced the
  repo-filtered actionable view to `1-2 of 2`; the same-day count path recorded
  `1-20 of 20` down to `1-2 of 2`, with the final current batch moving
  `1-9 of 9` through `1-2 of 2`.
- Closed findings: already-fixed submissions covered the stale/remediated
  project-image cleanup, Speed Insights, share GET rate-limit, mass-deletion
  audit, beta allowlist demotion, hosted-auth-smoke URL validation, beta
  feedback RLS, denied/revoked session clearing, Lighthouse cookie artifact,
  unauthenticated digest, revoked invite metadata, share-tree bounds, comment
  UUID circuit-breaker, component price audit grants, library folder editor
  access, CSV formula injection, pinned MCP tooling, and public unit-rate
  exposure findings.
- Residual dashboard blockers: `Committed public share token and user project
  data` and `Confidential client proposal committed to repository` remain open
  because current-tree cleanup is not a git-history purge. The later
  `codex-security-history-risk-owner-acceptance-2026-06-04T1414Z.json` records
  owner acceptance for the current single-owner beta only; close the dashboard
  findings as fixed only after rescan closure or an explicit destructive
  history-purge workflow.
- Boundary: no paid provider add-on, Supabase PITR, compute upgrade, DNS
  mutation, Vercel env mutation, broad `supabase db push`, Codex Security rescan
  purchase, or git-history rewrite occurred.
- Result: the cheap security path is substantially narrowed. It is not fully
  dashboard-green, but the later owner-acceptance artifact resolves the
  history-risk question for the single-owner beta without enabling the roughly
  $100/month PITR-plus-Small-compute path.

## Codex Security Cheap-Path Refresh - 2026-06-04 08:44Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-cheap-path-refresh-2026-06-04T0844Z.json`.
- Browser proof: authenticated Codex Security scan detail for
  `pjel888/archestimator` remains stale/conflicting, with status `Waiting for new
  commits`, last scanned commit `8957e194`, and scan-summary badges of `4`
  critical / `6` high / `31` medium / `6` low.
- Repo-filtered findings proof: the open findings list shows `1-20 of 35`, the
  first visible finding is `Project deletion no longer cleans project image
  objects` at old commit `ea4aa95`, the `critical` filter shows `0-0 of 0`, and
  the `high` filter shows `0-0 of 0`.
- Boundary: no new scan was started, no finding was closed, and no paid provider
  add-on, Supabase PITR/compute, DNS, Vercel env, or Supabase data setting
  changed.
- Result: current filtered dashboard proof does not justify the expensive
  PITR-plus-Small-compute path for owner-only pre-launch beta. Security still
  remains not fully green until the 35 visible open findings are rescanned,
  closed, or explicitly accepted.

## Hosted Authenticated Export Browser Proof - 2026-06-04 08:07Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-export-browser-proof-2026-06-04T0807Z.json`.
- Browser proof: Computer Use against the active owner Chrome session reached
  production
  `/workshop/projects/PROJECT_ID_PLACEHOLDER/estimates/ESTIMATE_ID_PLACEHOLDER`,
  rendered the `DEMO_PROJECT_PLACEHOLDER` estimate workspace, opened `Preview Excel
  Export`, observed `55 consolidated BOQ rows` and grand total
  `PHP 4,078,914.00`, and downloaded `DEMO_PROJECT_CODE_PLACEHOLDER-ESTIMATE_CODE_PLACEHOLDER-proposal.xlsx`.
- Supabase readback: a narrow read-only selected-node mapping query resolves
  `ESTIMATE_ID_PLACEHOLDER` to estimate
  `PROJECT_ID_PLACEHOLDER`, sheet code `ESTIMATE_CODE_PLACEHOLDER`, project
  `PROJECT_ID_PLACEHOLDER`.
- Signed-out control: unauthenticated curl to the corrected export route returns
  HTTP 307 to `/login`; the successful XLSX download required the authenticated
  browser session.
- Workbook validation: the downloaded file is 28,189 bytes, `file` reports
  `Microsoft Excel 2007+`, first bytes are `PK`, `unzip -t` reports no errors,
  SHA-256 is
  `b1545086ebad54ffcd89d8e2f3e7b92e433eeeeff4fd06f3d28dabcd09b5db0d`, ExcelJS
  loads creator `Archestimator` / subject `Industry-standard proposal workbook`,
  and sheets are `Bid Form`, `Summary`, `Commercial Terms`, and
  `Source Breakdown`.
- Boundary: raw workbook bytes were not copied into the repository or proof
  packet. No paid provider add-on, DNS, Vercel env, Supabase data mutation,
  PITR, compute, migration history, or broad Supabase push changed.
- Result: hosted authenticated export proof is closed. The later 19:51Z
  synthetic Google Sheets artifact closes secondary app open/recalc/print-preview
  proof for a synthetic workbook; native Excel/Numbers/LibreOffice spreadsheet-app proof remains open; real downloaded workbook structural/Quick Look proof is captured. The later 13:28Z artifact closes the owner hosted
  beta journey path for the single-tester beta.

## Hosted Feedback Admin Surface Proof - 2026-06-04 07:50Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-feedback-admin-proof-2026-06-04T0750Z.json`.
- Authenticated browser proof: Computer Use observed production
  `https://www.archestimator.com/workshop/settings/feedback` rendering `Beta
  feedback`, breadcrumb `Settings / Beta feedback`, review copy, status filter,
  `Filter` control, `Showing 0 latest beta feedback submissions`, empty-state
  text, and `Send beta feedback` link.
- Signed-out protection proof: `/workshop/settings/feedback` and
  `/workshop/feedback` both return HTTP 307 to login with the expected `next`
  target.
- Boundary: no feedback submission, status update, Vercel env, Supabase data,
  DNS, or provider setting changed. A local screenshot is not counted because
  macOS `screencapture` captured a stale profile route while Computer Use showed
  the feedback route.
- Result: hosted feedback review surface is proven reachable by the owner
  session. Support inbox monitoring, feedback queue review cadence, and alert
  ownership proof remain open.

## Cheap Beta Launch Audit - 2026-06-04 07:35Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/cheap-beta-launch-audit-2026-06-04T0735Z.json`.
- Cost posture: Supabase stays on `MICRO`, PITR stays disabled by decision, no
  Small-compute bump for PITR, no new paid provider add-ons, no DNS/env/provider
  mutation, no production rollback/promote action, no broad Supabase `db push`,
  and no Codex Security dashboard close submission occurred during this audit.
- Vercel proof: production deployment `DEPLOYMENT_ID_PLACEHOLDER` remains
  aliased to `www.archestimator.com`, `archestimator.com`, and
  `archestimator.vercel.app`; `www` `/api/health` returns HTTP 200 with
  Archestimator health JSON, apex `/api/health` redirects to `www`, `/login`
  returns the app title, and signed-out `/workshop` redirects to login.
- Vercel env proof: Production env names are present for app URLs/origins,
  Supabase public/server keys, closed-beta flags, publication secrets, Resend,
  and AI-off flags. Secret values are intentionally not recorded.
- Supabase proof: CLI lists project `ebxxqidacheyapmmzavr` as `Archestimator`,
  `ACTIVE_HEALTHY`, Postgres `17.6.1.121`, region `ap-southeast-2`. Existing
  cheap-path artifacts remain the canonical linked migration/readiness,
  allowlist, physical backup, and off-repo logical dump proof; the project ref is
  treated as immutable and not a launch blocker.
- Resend/DNS proof: webhook endpoint/secret proof remains available, but public
  DNS still has no `send.contact.archestimator.com` MX. The remaining no-cost DNS
  action is Namecheap `MX` host `send.contact`, value
  `feedback-smtp.ap-northeast-1.amazonses.com`, priority `10`, without changing
  apex forwarding MX for `SUPPORT_INBOX_PLACEHOLDER`.
- GitHub/Codex Security proof: GitHub has no open issues or PRs. A later
  authenticated Codex Security refresh shows no visible open critical/high
  findings in severity-filtered views, but the repo-filtered list still shows
  `1-20 of 35`; those findings still need closure/rescan/owner acceptance.
- Still open after later proof refreshes: hosted denied/revoked/expired
  beta-auth smoke, residual security history-risk acceptance/remediation,
  secondary spreadsheet-app export open/print proof, logout/session-expiry proof,
  and Resend delivered/bounce webhook lifecycle proof before relying on
  automatic email UX. Resend provider proof, legal/owner/support
  signoff, Vercel rollback, hosted export, the owner hosted beta journey,
  shared-link self-invite/send, alternate-recipient inbox receipt, and
  recipient clickthrough/open are now
  closed by later 2026-06-04 artifacts.

## Supplemental Hosted Owner Profile Smoke - 2026-06-04 07:22Z

- Proof folder: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-owner-smoke-2026-06-04T0719Z/`.
- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-owner-smoke-2026-06-04T0719Z/hosted-owner-smoke.json`.
- Browser proof: active Chrome session reached
  `https://www.archestimator.com/workshop/settings/profile` and rendered
  authenticated Profile settings with display name `OWNER_NAME_PLACEHOLDER`, user category
  `Architect`, country/region `Philippines`, and a visible `Save profile`
  control.
- Screenshot: `profile-settings.png`, SHA-256
  `4873ed41b3b7ebef722d5bd99b5148c04536b64441c932609819072c1d986b5a`.
- Signed-out route proof: `/workshop/settings/profile` and
  `/workshop/settings/feedback` both return HTTP 307 to login with the expected
  `next` target.
- Boundary: this does not by itself visibly prove the Google email; it
  supplements earlier hosted owner allowed-smoke artifacts that recorded
  `OWNER_EMAIL_PLACEHOLDER`. Feedback-admin monitoring visual proof was
  inconclusive because the browser-reported URL and rendered screenshot did not
  line up cleanly, so support/feedback monitoring remains open.
- Cost posture: no paid add-on, DNS, Vercel env, Supabase mutation, or form
  submission occurred.

## No-Spend Live Closed-Beta Launch Refresh - 2026-06-04 07:06Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/no-spend-live-launch-refresh-2026-06-04T0706Z.json`.
- Cost posture: no Supabase PITR add-on, no compute increase for PITR, no DNS or
  provider mutation, no Vercel env mutation, no production rollback/promote
  action, and no broad Supabase `db push` occurred during this refresh.
- Vercel proof: production deployment `DEPLOYMENT_ID_PLACEHOLDER` is
  `Ready` and aliased to `www.archestimator.com`, `archestimator.com`, and
  `archestimator.vercel.app`. Live HTTP probes show `www` `/api/health` HTTP 200
  with Archestimator health JSON, `/login` HTTP 200 with the app title,
  signed-out `/workshop` HTTP 307 to `/login?next=%2Fworkshop`, and apex
  `/api/health` HTTP 307 to `www`.
- Vercel env proof: Production env names are present for app URLs/origins,
  Supabase public/server keys, closed-beta flags, publication secrets, Resend
  vars, and AI-off flags. Secret values are not recorded.
- Supabase proof: Management API lists linked project `ebxxqidacheyapmmzavr` as
  `Archestimator`, `ACTIVE_HEALTHY`, Postgres 17, region `ap-southeast-2`;
  Supabase ref renaming was not attempted because the human project name is
  already correct and refs are immutable identifiers. Existing cheap-path
  artifacts still prove 9 physical backups, `walgEnabled=true`, PITR off,
  off-repo logical dump bundle, linked readiness, and owner allowlist proof.
- Supabase SQL refresh gap: this pass did not re-prove linked SQL because the
  Supabase CLI temp-role pooler returned `ECIRCUITBREAKER`; the hung retry was
  stopped and no broad `db push` was attempted.
- Resend/DNS proof: production webhook endpoint/secret proof remains from the
  prior dashboard artifact, apex support forwarding MX and DMARC are present,
  but public DNS still has no `send.contact.archestimator.com` MX. Add only the
  no-cost Namecheap MX `send.contact` ->
  `feedback-smtp.ap-northeast-1.amazonses.com`, priority `10`, without changing
  apex support forwarding MX.
- Codex Security proof: Direct RLS finding
  `1991e62ea7488191a1e48bbf1446b133` is still visible/open with `1-20 of 35`
  and a `Close` control. The linked fix proof artifact exists, but live
  dashboard closure submission remains pending action-time confirmation.
- Later 2026-06-04 artifacts close Resend provider proof, legal/owner/support
  signoff, hosted authenticated export, the owner hosted beta journey, hosted
  Google OAuth denied/revoked proof, logout/session-expiry proof, synthetic
  stale-cookie proof, hosted shared-link/invite email proof, and synthetic
  Google Sheets workbook proof. Still open: residual Codex Security history-risk
  acceptance/remediation, project-specific unlink proof if required before
  widening, native Excel/Numbers/LibreOffice workbook app proof if required beyond the
  owner-only beta, and optional negative email lifecycle proof before relying on
  incident-path email UX.

## Codex Security Chart/XLSX Finding Closure - 2026-06-04 06:49Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-chart-xlsx-finding-close-2026-06-04T0649Z.json`.
- Dashboard action: authenticated Codex Security finding
  `Unbounded chart and XLSX export loading can exhaust server resources` was
  closed as `Already fixed` / `Reason: Fixed`; revisiting the original finding
  shows a `Reopen` control. The open-list first page no longer includes the
  chart/XLSX finding, now shows `1-20 of 35`, and pulled
  `Confidential client proposal committed to repository` into the visible page.
- Repo proof: current `main` head
  `bc19695b8b830cb10c94d9e04e01074913352d76` keeps chart repository reads
  bounded with query-level sentinel limits, keeps large-project chart loading to
  selected/default estimates instead of every estimate, and returns HTTP 413
  from the XLSX route before proposal model or ExcelJS workbook allocation when
  export-only node/row limits are exceeded. The closed finding was against old
  commit `87c2ffa`; the fix was already deployed and recorded under commit
  `0e5dfff`.
- Hosted/proof artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/chart-xlsx-load-bounds-2026-06-04.json`
  records production deployment `DEPLOYMENT_ID_PLACEHOLDER`,
  production `/api/health` HTTP 200, apex redirect, and AI-off regression proof.
- Fresh verification:
  `bunx vitest run tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/project-charts-aggregation.test.ts tests/vitest/project-charts-ui.test.tsx tests/vitest/workspace-repository-estimate-tree.test.ts --maxWorkers=1 --reporter=dot`
  passed 6 files / 31 tests; `bun run type-check` passed.
- GitHub queue check: no open issues or open PRs were found.
- Cost posture: no new paid provider add-on or provider setting was changed;
  this stays on the cheaper Micro/PITR-off closed-beta path.
- Still open: remaining Codex Security findings still need closure/rescan/owner
  acceptance; hosted denied/revoked/expired beta-auth smoke, Resend domain/
  delivery proof, rollback risk proof, legal/owner signoff, and support/alert
  monitoring proof remain open before a fully green closed beta.

## Codex Security AI Ask Finding Closure - 2026-06-04 06:38Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-ai-ask-finding-close-2026-06-04T0638Z.json`.
- Dashboard action: authenticated Codex Security finding
  `AI Ask endpoint lacks quota and fails open on audit` was closed as
  `Already fixed` / `Reason: Fixed`; revisiting the original finding shows a
  `Reopen` control. The open-list first page no longer includes the AI Ask
  finding and pulled
  `Proposal pages now expose internal unit-rate details` into the visible page;
  no numeric count-drop claim is made because this DOM view did not expose the
  count line.
- Repo proof: current `main` head
  `fbd6d382289d07595df2332a5aa166be0747e83d` keeps `/api/ai/ask` disabled by
  default for closed beta, checks durable quota before enabled-mode context
  reads or provider calls, fails closed on quota/audit storage unavailability,
  and requires started/completed/failed audit persistence around provider
  boundaries. The closed finding was against old commit `385c08c`; the fix was
  already deployed and recorded under commit `e48eb0f`.
- Hosted/proof artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/ai-ask-quota-audit-fail-closed-2026-06-04.json`
  records production `/api/health` HTTP 200 and signed-out
  `POST /api/ai/ask` HTTP 404 with `{"error":"AI is disabled for closed beta."}`.
- Fresh verification:
  `bunx vitest run tests/vitest/ai-ask-route.test.ts tests/vitest/ai-audit-flow.test.ts tests/vitest/ai-audit-schema.test.ts tests/vitest/ai-auth-guard.test.ts tests/vitest/ai-package-builder-route.test.ts --maxWorkers=1 --reporter=dot`
  passed 5 files / 66 tests.
- GitHub queue check: no open issues or open PRs were found.
- Still open: remaining Codex Security findings still need closure/rescan/owner
  acceptance; hosted denied/revoked/expired beta-auth smoke, Resend domain/
  delivery proof, rollback risk proof, legal/owner signoff, and support/alert
  monitoring proof remain open before a fully green closed beta.

## Codex Security Project-Images Finding Closure - 2026-06-04 06:32Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-project-images-finding-close-2026-06-04T0632Z.json`.
- Dashboard action: authenticated Codex Security finding
  `Project images are uploaded to a public listable bucket` was closed as
  `Already fixed` / `Reason: Fixed`; revisiting the original finding shows a
  `Reopen` control. The open-list first page no longer includes the
  project-images finding and pulled
  `Unpinned MCP tooling auto-executes external packages` into the visible page;
  no numeric count-drop claim is made because this DOM view did not expose the
  count line.
- Repo proof: current `main` head
  `8378f4dbb170e9cc7c906987bb7d6a94abafae38` keeps project cover uploads on
  private `project-images` storage, requires `requireCurrentUserContext()` before
  serving `/api/projects/images`, strips `/project-images/` from public share
  image URLs, and keeps `next.config.ts` remote image patterns limited to public
  `component-images`. The closed finding was against old commit `2df73a8`; the
  fix was already deployed and recorded under commit `ea4aa95`.
- Linked/provider proof:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/project-images-private-storage-2026-06-04.json`
  records `project-images.public=false`, `0` remaining public component-bucket
  project-image objects, direct public project-image URL denial, and signed-out
  same-origin image route redirecting to `/login`.
- Fresh verification:
  `bunx vitest run tests/vitest/security-findings-contracts.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/project-publication-snapshot.test.ts --maxWorkers=1 --reporter=dot`
  passed 3 files / 34 tests.
- GitHub queue check: no open issues or open PRs were found.
- Still open: remaining Codex Security findings still need closure/rescan/owner
  acceptance; hosted denied/revoked/expired beta-auth smoke, Resend domain/
  delivery proof, rollback risk proof, legal/owner signoff, and support/alert
  monitoring proof remain open before a fully green closed beta.

## Codex Security Republish-Scope Finding Closure - 2026-06-04 06:17Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-republish-scope-finding-close-2026-06-04T0617Z.json`.
- Dashboard action: authenticated Codex Security finding
  `Republish can widen shared links to all estimate sheets` was closed as
  `Already fixed` / `Reason: Fixed`; revisiting the original finding shows
  `Closed by OWNER_EMAIL_PLACEHOLDER`, a `Reopen` control, and the Findings
  page count dropped from `1-20 of 39` to `1-20 of 38`.
- Repo proof: current `main` head
  `668f79cb3f41c5d731f47de22219807974dd3665` keeps persisted
  `selected_estimate_ids` in the publication summary and defaults
  `ProjectPublicationHeader` published-link sheet selection from that persisted
  subset instead of every project sheet. The closed finding was against old
  commit `95b2142`; the fix was already deployed and recorded under commit
  `84f12e3`.
- Fresh verification:
  `bunx vitest run tests/vitest/project-publication-header.test.tsx tests/vitest/project-publication-summary.test.ts tests/vitest/project-publication-actions.test.ts --maxWorkers=1 --reporter=dot`
  passed 3 files / 47 tests.
- GitHub queue check: no open issues or open PRs were found; historical Codex
  PR comments exist, but no active open GitHub queue was found for this closure.
- Still open: remaining Codex Security findings still need closure/rescan/owner
  acceptance; hosted denied/revoked/expired beta-auth smoke, Resend domain/
  delivery proof, rollback risk proof, legal/owner signoff, and support/alert
  monitoring proof remain open before a fully green closed beta.

## Codex Security Password-Metadata Finding Closure - 2026-06-04 06:10Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-password-metadata-finding-close-2026-06-04T0610Z.json`.
- Dashboard action: authenticated Codex Security finding
  `Password-protected share metadata leaks project details` was closed as
  `Already fixed` / `Reason: Fixed`; revisiting the original finding shows
  `Closed by OWNER_EMAIL_PLACEHOLDER`, a `Reopen` control, and the Findings
  page count dropped from `1-20 of 40` to `1-20 of 39`.
- Repo proof: current `main` head
  `8af2af8fcd088a564cf6af4a0e703039042fc349` returns generic locked
  proposal metadata from `/share/[token]` `generateMetadata` when
  `access.passwordRequired` is true, before
  `resolveProjectPublicationSnapshotByToken(token)` can read project/client/
  estimate summary data. The closed finding was against old commit `56dbd00`;
  the fix was already deployed and recorded under commit `25025d3`.
- Fresh verification:
  `bunx vitest run tests/vitest/project-publication-page.test.tsx tests/vitest/security-findings-contracts.test.ts --maxWorkers=1 --reporter=dot`
  passed 2 files / 42 tests.
- GitHub queue check: no open issues or open PRs were found; historical Codex
  PR comments exist, but no active open GitHub queue was found for this closure.
- Still open: remaining Codex Security findings still need closure/rescan/owner
  acceptance; hosted denied/revoked/expired beta-auth smoke, Resend domain/
  delivery proof, rollback risk proof, legal/owner signoff, and support/alert
  monitoring proof remain open before a fully green closed beta.

## Codex Security Stale-Comment Finding Closure - 2026-06-04 05:55Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-stale-comment-finding-close-2026-06-04T0555Z.json`.
- Dashboard action: authenticated Codex Security finding
  `Stale recipient sessions can post share comments` was closed as
  `Already fixed` / `Reason: Fixed`; revisiting the original finding shows
  `Closed by OWNER_EMAIL_PLACEHOLDER` and a `Reopen` control. The open-list
  count after closure was not cleanly rehydrated, so the direct closed finding
  page is the provider proof for this closure.
- Repo proof: current `main` head
  `a9fb0f39bdb47712ca8b0f6bc4c011a226615032` verifies recipient comment
  sessions against the DB-current publication snapshot, passes
  `expectedSnapshotVersion` through `insertSharedLinkComment`, and the
  `insert_client_comment` RPC rejects null or mismatched expected snapshot
  versions before inserting `shared_link_comments`. The closed finding was
  against old commit `938c801`; the fix was already deployed and recorded
  under commit `d4b5733`.
- Fresh verification:
  `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-public-repository.test.ts tests/vitest/security-findings-contracts.test.ts --maxWorkers=1 --reporter=dot`
  passed 3 files / 47 tests.
- GitHub queue check: no open issues or open PRs were found; historical Codex
  PR comments exist, but no active open GitHub queue was found for this closure.
- Still open: remaining Codex Security findings still need closure/rescan/owner
  acceptance; hosted denied/revoked/expired beta-auth smoke, Resend domain/
  delivery proof, rollback risk proof, legal/owner signoff, and support/alert
  monitoring proof remain open before a fully green closed beta.

## Supabase Cheaper-Path Cost Controls - 2026-06-04 05:46Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-cheaper-path-cost-controls-2026-06-04T0546Z.json`.
- Supabase connector proof: project ref `ebxxqidacheyapmmzavr` is already named
  `Archestimator`, is `ACTIVE_HEALTHY`, and is in `ap-southeast-2`.
- Authenticated dashboard proof: Add-ons shows Point in time recovery, Dedicated
  IPv4, and Custom domain all `Disabled`; Compute and Disk shows `Micro`
  selected at `$0.01344 / hour`, while `Small` is visible but not selected at
  `$0.0206 / hour`; `Nano` is visible but locked.
- Cost decision: no provider write was submitted because the cheaper selectable
  compute size is already active and PITR is already disabled. The no-new-spend
  closed-beta path keeps PITR off and treats rollback safety as either a manual
  backup/restore-drill proof or an explicit owner-accepted risk, not a $100/mo
  PITR add-on.
- Still open: this proves cost controls only. It does not prove a restore drill,
  remaining Codex Security closures, hosted denied/revoked/expired auth smoke,
  Resend delivery proof, or owner/legal/support monitoring signoff.

## Codex Security Stale-Decision Finding Closure - 2026-06-04 05:37Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-stale-decision-finding-close-2026-06-04T0537Z.json`.
- Dashboard action: authenticated Codex Security finding
  `Stale share sessions can approve newer publication snapshots` was closed as
  `Already fixed` / `Reason: Fixed`; revisiting the original finding shows
  `Closed by OWNER_EMAIL_PLACEHOLDER`, a `Reopen` control, and the Findings
  page count dropped from `1-20 of 42` to `1-20 of 41`.
- Repo proof: current `main` head `4c2b30f` verifies recipient decision
  sessions against the DB-current publication snapshot, passes
  `expectedSnapshotVersion` through the decision repository helper, and the
  `submit_client_response` RPC rejects null or mismatched expected snapshot
  versions before recording a response. The closed finding was against old
  commit `45673c8`; the fix was already deployed and recorded under commit
  `e28a8d6`.
- Fresh verification:
  `bunx vitest run tests/vitest/project-publication-decision.test.tsx tests/vitest/project-publication-public-repository.test.ts tests/vitest/security-findings-contracts.test.ts --maxWorkers=1 --reporter=dot`
  passed 3 files / 39 tests.
- Still open: remaining Codex Security findings still need closure/rescan/owner
  acceptance; hosted denied/revoked/expired beta-auth smoke, Resend domain/
  delivery proof, rollback risk proof, legal/owner signoff, and support/alert
  monitoring proof remain open before a fully green closed beta.

## Codex Security Share-Image Finding Closure - 2026-06-04 05:26Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/codex-security-share-image-url-finding-close-2026-06-04T0526Z.json`.
- Dashboard action: authenticated Codex Security finding
  `Unvalidated share image URLs enable client tracking` was closed as
  `Already fixed` / `Reason: Fixed`; revisiting the original finding shows
  `Closed by OWNER_EMAIL_PLACEHOLDER`, a `Reopen` control, and the Findings
  page count dropped from `1-20 of 43` to `1-20 of 42`.
- Repo proof: current `main` head `5931c1d` keeps the publication image URL
  allowlist/sanitization path in `src/lib/publication/image-url.ts`,
  `src/lib/publication/snapshot.ts`, and the public share render components.
  The closed finding was against old commit `4c7c406`; the fix was already
  deployed and recorded under commit `dc0aff1`.
- Fresh verification:
  `bunx vitest run tests/vitest/project-publication-snapshot.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/security-findings-contracts.test.ts --maxWorkers=1 --reporter=dot`
  passed 3 files / 45 tests.
- Still open: remaining Codex Security findings still need closure/rescan/owner
  acceptance; hosted denied/revoked/expired beta-auth smoke, Resend domain/
  delivery proof, rollback risk proof, legal/owner signoff, and support/alert
  monitoring proof remain open before a fully green closed beta.

## Resend Webhook Body Limit Deploy Proof - 2026-06-04 05:07Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-webhook-body-limit-2026-06-04T0507Z.json`.
- Cost decision: keep the lower-cost closed-beta path. Supabase PITR was not
  enabled because current Supabase docs list 7-day PITR at about `$100/month`
  and not covered by spend cap; Pro daily backups/physical backups remain the
  accepted owner-only pre-launch posture until paid PITR is explicitly accepted.
- Vercel: production deployment `DEPLOYMENT_ID_PLACEHOLDER` is `READY`
  from `main` commit `c6aa6dd`, with aliases for `www.archestimator.com`,
  `archestimator.com`, and `archestimator.vercel.app`. `.vercelignore` now
  excludes `.omx` so Vercel CLI deploys do not package transient local runtime
  lock files.
- Webhook hardening: `src/app/api/webhooks/resend/route.ts` now rejects bodies
  above 262,144 bytes before signature parsing and rechecks actual raw-body byte
  size after read. Hosted smoke proves `/api/health` HTTP 200, oversized webhook
  POST HTTP 413 `Webhook payload is too large.`, and normal-sized unsigned POST
  HTTP 400 `Invalid webhook`.
- Codex Security: `codex-security-dashboard-refresh-2026-06-04T0511Z.json`
  shows the authenticated Scans page caught up to last scanned commit
  `c6aa6dd3` with 578 scanned commits, but not latest repo head `6840512`; scan
  badges remain 4 critical, 6 high, 31 medium, and 6 low.
- Still open: Namecheap `send.contact` MX record, Resend domain restart/
  verified status, delivery/webhook event proof, Codex Security rescan or owner
  acceptance, hosted denied/revoked/expired auth smoke, rollback/export/full
  journey proof, legal signoff, and support/alert monitoring proof.

## Live Low-Cost Closed-Beta Launch Refresh - 2026-06-04 04:29Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/live-closed-beta-launch-refresh-2026-06-04T0429Z.json`.
- Decision: continue the low-cost closed-beta path. No new paid provider add-ons
  were enabled; Supabase remains on the cheaper Micro/PITR-off posture for
  pre-launch MVP, and PITR/restore-drill proof is not required to spend money
  before the first closed-beta user.
- Vercel: `vercel-env-readiness-live-refresh-2026-06-04T0424Z.json` reports
  required production env names present without recording secret values;
  `vercel-health-readiness-live-refresh-2026-06-04T0427Z.json` reports HTTP 200
  from both `www.archestimator.com/api/health` and
  `archestimator.vercel.app/api/health`; and
  `vercel-production-readiness-live-refresh-2026-06-04T0424Z.json` shows
  `archestimator.com`, `www.archestimator.com`, and `archestimator.vercel.app`
  mapped to current production deployment `DEPLOYMENT_ID_PLACEHOLDER`.
- Hosted auth: `hosted-google-allowed-browser-smoke-2026-06-04T0419Z.json`
  proves the owner Google session reaches production
  `/workshop/settings/profile` as `OWNER_EMAIL_PLACEHOLDER` and sees profile
  settings without login or beta-access-required controls. Denied, revoked, and
  expired-session hosted browser smoke remains open.
- Supabase: `supabase-backup-readiness-live-refresh-2026-06-04T0428Z.json`
  reports project `ebxxqidacheyapmmzavr` / `Archestimator` healthy with 9
  completed physical backups, `pitrEnabled: false`, and `walgEnabled: true`.
  `supabase-linked-readiness-live-refresh-2026-06-04T0428Z.json` reports linked
  SQL readiness green. The migration-list CLI path was blocked by a temporary
  linked login-role auth/circuit-breaker failure, so migration-row proof is
  carried by linked SQL readiness rather than a broad `db push`.
- Security/GitHub: `codex-security-dashboard-refresh-2026-06-04T0421Z.json`
  shows the authenticated Scans page last scanned `2c7ffb97`, not current repo
  head `b9051f2`, with scan-count badges of 4 critical, 6 high, 31 medium, and 6
  low. GitHub still has no open PRs/issues and no status contexts/check-runs on
  latest `main`.
- Support/legal: `support-email-dns-readiness-live-refresh-2026-06-04T0424Z.json`
  proves support-domain MX/SPF/DMARC. `legal-owner-readiness-live-refresh-2026-06-04T0424Z.json`
  and `support-monitoring-readiness-live-refresh-2026-06-04T0424Z.json` remain
  red because owner/legal labels, support inbox monitoring, feedback review,
  alert ownership, and incident-escalation proof are not yet recorded.
- Later 2026-06-04 artifacts close rollback, legal/owner/support signoff, Resend
  provider delivery/webhook proof, hosted authenticated export, the owner hosted
  beta journey, logout, denied/revoked Google OAuth, synthetic stale-cookie
  expired-session routing, shared-link self-invite/send, recipient
  inbox/clickthrough/open, signed delivered-event webhook reconciliation, and
  synthetic Google Sheets workbook proof. Still open before a fully green widened
  closed beta: residual Codex Security history-risk acceptance/remediation,
  project-specific unlink proof if required before widening, native Excel/Numbers/LibreOffice
  workbook app proof if required beyond the owner-only beta, and
  optional negative email lifecycle proof before relying on incident-path email
  UX.

## Resend Dashboard DNS/Webhook Refresh - 2026-06-04 04:46Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-dashboard-dns-webhook-refresh-2026-06-04T0446Z.json`.
- Official docs checked: Resend API uses `https://api.resend.com` with bearer
  API keys; `GET /domains` lists domains, and the Webhooks docs cover registered
  webhook endpoints. The local key is send-only, so the dashboard is the current
  provider source for domain/webhook state.
- Resend dashboard: account `OWNER_EMAIL_PLACEHOLDER`; domain
  `contact.archestimator.com`; status `Failed`; provider `Namecheap`; region
  `Tokyo (ap-northeast-1)`. Domain events show `Domain added` and then
  `Missing records`.
- Domain DNS: DKIM host `resend._domainkey.contact` is verified. Public DNS
  confirms that DKIM TXT exists, `send.contact` SPF TXT exists as
  `v=spf1 include:amazonses.com ~all`, and apex DMARC exists as
  `v=DMARC1; p=none;`. Public DNS does **not** have an MX record for
  `send.contact.archestimator.com`.
- Required no-cost DNS fix: add Namecheap `MX` host `send.contact`, value
  `feedback-smtp.ap-northeast-1.amazonses.com`, priority `10`, TTL automatic,
  then restart verification in Resend.
- Webhook proof: Resend dashboard lists
  `https://www.archestimator.com/api/webhooks/resend` as `Enabled`. A production
  unsigned POST to that endpoint returns HTTP 400 `Invalid webhook`; this proves
  `RESEND_WEBHOOK_SECRET` is configured because the route returns HTTP 503 before
  signature verification when that secret is missing.
- Still open: Namecheap MX add, Resend restart/verified status, delivery proof,
  webhook event proof, and a decision to keep visible email workflows disabled
  until those proofs are green.

## Cheap Closed-Beta Provider Status Refresh - 2026-06-04 03:48Z

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/cheap-launch-refresh-2026-06-04.json`.
- Vercel: production deployment `DEPLOYMENT_ID_PLACEHOLDER` is `READY`; `www.archestimator.com/api/health` returns HTTP 200; apex `/login` redirects to `www`; production env-name readiness is green for the required closed-beta/Supabase/publication/AI-off/invite/Resend names without recording secret values.
- Supabase: project `ebxxqidacheyapmmzavr` stays on the cheaper Micro/PITR-off path; fresh linked migration-list parsing shows required launch migrations present remotely, and linked SQL readiness reports 14 parsed rows / 0 failures. No broad `db push` was used. Strict backup readiness is intentionally red because PITR and restore-drill proof are not part of the no-new-paid-add-ons path; physical backup listing still shows 9 backups and `walgEnabled: true`.
- Closed beta allowlist: direct table readback shows exactly `OWNER_EMAIL_PLACEHOLDER` with status `active`; unauthenticated `check_closed_beta_access` returns `missing` by design because it requires a matching caller JWT email.
- DNS/Resend: support-domain MX/SPF/DMARC is green; Vercel has all Resend env names including `RESEND_WEBHOOK_SECRET`; observed sender DNS includes `send.contact` SPF and one Resend DKIM TXT record. A local read-only Resend provider API probe returned HTTP 401 for both `/domains` and `/webhooks`, so Resend dashboard/API domain/webhook/delivery proof remains open.
- Hosted auth: `hosted-google-allowed-browser-smoke-2026-06-04T0355Z.json`
  proves the allowed owner session in Chrome can reach production
  `/workshop/settings/profile`, render `Profile settings`, and visibly show
  `OWNER_EMAIL_PLACEHOLDER` without login or beta-access-required controls. This
  does not inspect cookies/local storage and does not prove denied, revoked, or
  expired-session behavior.
- Codex Security/GitHub: `codex-security-dashboard-refresh-2026-06-04T0405Z.json`
  records the authenticated dashboard still at `1-20 of 43` findings; the Scans
  page is `Waiting for new commits` and last scanned `28601375`, behind latest
  observed pushed `main` head `6297cec` at refresh time. This proof was then
  recorded in commit `2c7ffb9`. GitHub has no open PRs, no open issues, no new
  comments since June 4, and no status contexts/check-runs on the observed
  latest `main`.
- Later 2026-06-04 artifacts close Vercel rollback, Resend provider proof,
  legal/owner/support signoff, hosted authenticated export, the owner hosted
  beta journey, hosted Google OAuth denied/revoked proof, logout/session-expiry
  proof, synthetic stale-cookie expired-session routing, hosted shared-link/
  invite email proof, and synthetic Google Sheets workbook proof. Still open
  before fully green widened beta: residual Codex Security history-risk
  acceptance/remediation, project-specific unlink proof if required before
  widening, native Excel/Numbers/LibreOffice workbook app proof if required beyond the
  owner-only beta, and optional negative email lifecycle proof before relying on
  incident-path email UX.

## Mass Deletion Cleanup RPC Lock - 2026-06-04

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/mass-deletion-cleanup-rpc-lock-2026-06-04.json`.
- Finding: `Mass deletion audit records are caller-tamperable`; this follow-up closes
  the cleanup-result RPC branch left after actor derivation was hardened.
- Migration: `supabase/migrations/20260604031000_lock_mass_deletion_cleanup_result_rpc.sql`
  recreates `public.record_mass_deletion_storage_cleanup_result(uuid,jsonb)` with a
  service-role guard, project-target guard, and pending-status guard, then revokes
  execution from `public`, `anon`, and `authenticated` and grants only
  `service_role`.
- Linked apply/repair: exact-file `supabase db query --linked --file` succeeded,
  followed by targeted `supabase migration repair 20260604031000 --status applied
  --linked --yes`. No broad `db push` was used.
- Live readback: pre-apply proof showed `authenticated_execute=true`; post-apply
  proof shows one cleanup RPC signature, `anon_execute=false`,
  `authenticated_execute=false`, `service_role_execute=true`, all guard clauses
  present, and remote migration history row `20260604031000`.
- Repo verification: focused mass-deletion/storage/security suite passed 5 files /
  31 tests, type-check passed, lint passed with existing warnings only, diff check
  passed, and GitNexus reported low risk with 0 affected processes.
- Production deployment proof: clean `main` commit `9fed643` was deployed with
  `vercel deploy --prod --yes`; deployment `DEPLOYMENT_ID_PLACEHOLDER`
  is `READY`, aliases include `archestimator.com` and
  `www.archestimator.com`, `https://www.archestimator.com/api/health`
  returned HTTP 200, and apex `/login` redirects to `www`.
- Still open: Codex Security dashboard rescan/closure and hosted manual
  destructive-cleanup smoke against a disposable project.

## Project Image Cleanup Targets Security Fix - 2026-06-04

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/project-image-cleanup-targets-2026-06-04.json`.
- Codex Security refresh showed `1-20 of 43` findings and selected the new
  medium finding `Project deletion no longer cleans project image objects`
  against commit `ea4aa95`.
- Migration: `supabase/migrations/20260604023101_harden_project_image_cleanup_targets.sql`
  recreates `public.preview_bulk_delete_projects` so project deletion cleanup
  targets use private bucket `project-images` and no longer emit public
  `component-images` targets for project images.
- Linked apply/repair: `supabase db query --linked --file` succeeded with
  `supabase/migrations/20260604023101_harden_project_image_cleanup_targets.sql`,
  followed by a targeted repair of version `20260604023101` as applied. Remote
  migration history readback returned version `20260604023101`.
- Live readback: Supabase connector SQL reports `emitsComponentImages=false`,
  `emitsProjectImages=true`, `filtersWebp=true`, `rejectsDotDot=true`, and
  `rejectsDoubleSlash=true` for the live
  `public.preview_bulk_delete_projects(uuid[], uuid)` function.
- Still open: Codex Security dashboard rescan/closure and hosted manual
  project-deletion image cleanup smoke.

## Cheap Closed-Beta Launch Refresh - 2026-06-04

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/cheap-launch-refresh-2026-06-04.json`.
- Decision: keep the lower-cost closed-beta provider path. Supabase project
  `ebxxqidacheyapmmzavr` / `Archestimator` remains on Micro compute, PITR stays
  disabled, and the accepted pre-launch DR posture is Supabase physical backups
  plus the off-repo logical dump bundle; no new paid add-ons were enabled.
- Supabase backup proof: `supabase-backup-readiness-cheap-refresh-2026-06-04T0344Z.json`
  lists 9 completed physical backups with `pitrEnabled: false` and
  `walgEnabled: true`; the strict checker remains incomplete because PITR and a
  restore drill are intentionally absent from the cheap path.
- Supabase migration/object proof:
  `supabase-migration-readiness-cheap-refresh-2026-06-04T0342Z.json` reports required
  launch migrations present remotely, and
  `supabase-linked-readiness-cheap-refresh-2026-06-04T0348Z.json` reports 14 linked
  SQL readiness checks passing. The linked readiness probe now treats public
  `component-images` as the approved component-thumbnail bucket and private
  `project-images` as the required client/project-image bucket.
- Vercel proof: `vercel-env-readiness-cheap-refresh-2026-06-04T0348Z.json` reports
  core closed-beta, Resend, and invite env names present; `vercel-health-readiness-cheap-refresh-2026-06-04T0342Z.json`
  returns HTTP 200 from `https://www.archestimator.com/api/health`; and
  `vercel-production-readiness-cheap-refresh-2026-06-04T0347Z.json` shows
  `archestimator.com` / `www.archestimator.com` mapped to current production
  deployment `DEPLOYMENT_ID_PLACEHOLDER` with 19 rollback candidates but
  no rollback drill.
- Resend/support proof: `resend-readiness-cheap-refresh-2026-06-04T0342Z.json`
  confirms all Resend env names are present in Vercel production but local
  runtime env remains incomplete; `support-email-dns-readiness-cheap-refresh-2026-06-04T0348Z.json`
  confirms support-domain MX/SPF/DMARC. Neither artifact proves Resend dashboard
  domain verification, webhook registration, delivery events, inbox monitoring,
  or alert ownership.
- Resend provider API proof:
  `resend-provider-api-readiness-2026-06-04T0359Z.json` used the local
  `RESEND_API_KEY` for read-only `GET /domains` and `GET /webhooks`; both
  returned HTTP 401. This does not prove Vercel's production key value is
  invalid, but it blocks local API proof of Resend domain/webhook readiness.
- Hosted auth proof:
  `hosted-google-allowed-browser-smoke-2026-06-04T0355Z.json` confirms the
  allowed owner Google session can access production profile settings as
  `OWNER_EMAIL_PLACEHOLDER`; `hosted-google-denied-revoked-browser-smoke-2026-06-04T1851Z.json`
  later closes real alternate-account denied and revoked browser smoke, and
  `hosted-expired-stale-cookie-smoke-2026-06-04T1920Z.json` closes synthetic
  stale-cookie expired-session fail-closed route proof.
- Codex Security proof:
  `codex-security-dashboard-refresh-2026-06-04T0405Z.json` confirms the
  authenticated dashboard still lists `1-20 of 43` findings, while the Scans page
  is `Waiting for new commits` with last scanned commit `28601375`, behind
  latest observed pushed `main` head `6297cec` at refresh time. This proof was
  then recorded in commit `2c7ffb9`. GitHub has no open PRs/issues/comments and
  no status contexts/check-runs for the observed latest commit.
- Later 2026-06-04 artifacts close Resend provider delivery/webhook proof,
  legal/owner/support signoff, hosted authenticated export, and the owner hosted
  beta journey. Still open before closed beta is fully green: residual Codex
  Security history-risk acceptance/remediation, spreadsheet-app open/print proof
  if required for beta, and project-specific unlink browser/manual proof if
  required before widening.

## Cheaper-Path Provider Launch Update - 2026-06-03

- Primary artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/provider-ops-mutation-pass-2cddb0e-2026-06-03.md`.
- Supabase PITR was not enabled after the dashboard showed the 7-day add-on at `$100.00 / month`; the accepted pre-launch-MVP safety path is daily physical backup proof plus a fresh off-repo logical dump. Proof: `supabase-cheaper-backup-readiness-2cddb0e-2026-06-03.json`.
- Linked Supabase migrations `20260601145000` through `20260603160000` were applied exactly and recorded in remote migration history without broad `db push`. Proof: `supabase-linked-migrations-applied-cheaper-path-2cddb0e-2026-06-03.json`.
- Closed-beta allowlist now contains exactly `OWNER_EMAIL_PLACEHOLDER` as the one active/invited email; allowed, missing, and transaction-local revoked RPC checks passed. Proof: `supabase-closed-beta-allowlist-2cddb0e-2026-06-03.json`.
- Production deployment `DEPLOYMENT_ID_PLACEHOLDER` is `READY`; `archestimator.com` and `www.archestimator.com` alias to it; `www` serves the beta app instead of the teaser; `/api/health` returns app health JSON; signed-out `/workshop` redirects to login. Proof: `vercel-hosted-http-smoke-cheaper-path-2cddb0e-2026-06-03.json`, `vercel-health-readiness-cheaper-path-2cddb0e-2026-06-03.json`, and `vercel-production-readiness-cheaper-path-2cddb0e-2026-06-03.json`.
- Latest production redeploy proof on 2026-06-04T13:11Z records deployment `DEPLOYMENT_ID_PLACEHOLDER` Ready on both custom domains, live Resend webhook signature-verification reachability, signed-out `/workshop/projects` redirect proof, login Google/email-link entry, and owner Chrome allowed-session access to hosted `/workshop`. Proof: `vercel-production-resend-enabled-hosted-auth-2026-06-04T1311Z.json`.
- Latest owner journey proof on 2026-06-04T13:28Z records the owner hosted path through project entry, estimate creation, estimate workspace render, and export preview. Proof: `hosted-owner-beta-journey-smoke-2026-06-04T1328Z.json`.
- Still open before calling the proof packet fully green: native Excel/Numbers/LibreOffice workbook app proof if required beyond the owner-only beta, and bounce/complaint webhook reconciliation if the owner-only beta requires synthetic negative-email events. Project-specific unlink now has linked/local owner-session browser proof, but not separate hosted production unlink proof. Real downloaded workbook structural/Quick Look proof is captured in `real-downloaded-workbook-quicklook-2026-06-05T0150Z.json`. Fresh 2026-06-05 linked-readiness proof is current-pass via `supabase-linked-readiness-pass-2026-06-05T0033Z.json`, and fresh public-domain smoke is recorded in `production-public-smoke-2026-06-05T0025Z.json`. Real browser Google OAuth denied/revoked hosted smoke is closed by `hosted-google-denied-revoked-browser-smoke-2026-06-04T1851Z.json`; synthetic stale-cookie expired-session fail-closed proof is closed by `hosted-expired-stale-cookie-smoke-2026-06-04T1920Z.json`; synthetic secondary Google Sheets workbook compatibility proof is closed and real downloaded workbook structural/Quick Look proof is captured by `synthetic-google-sheets-workbook-compatibility-2026-06-04T1951Z.json`. Vercel rollback proof is closed by the 11:12Z rollback/promote drill; Resend provider delivery/webhook route proof is closed; owner hosted beta journey proof is closed; residual Codex Security history-risk is owner-accepted for the owner-only beta by the 14:14Z artifact; owner logout is closed by the 14:36Z artifact; shared-link self-invite/send/inbox proof is closed by the 15:32Z and 15:55Z artifacts; the 17:31Z artifact closes recipient clickthrough/open; and the 18:09Z artifact closes signed delivered-event webhook reconciliation for the real shared-link email.

## Fourth-Pass Closed Beta Evidence - 2026-06-02

### Local Project Create Modal Validation Slice

- Implementation commits: `779f806` baseline plus follow-on local create-modal validation slice.
- Scope: `NewProjectForm` now stops empty or whitespace-only project names locally before calling project creation, focuses and marks the Project name field invalid, announces a field-scoped error, and clears the scoped error once the user types again.
- Guardrail evidence: `bunx vitest run tests/vitest/new-project-form-validation.test.tsx tests/vitest/project-creation-ui.test.ts --maxWorkers=1` passed 2 files / 12 tests.
- Launch meaning: this closes the local validation/error-copy gap for the create-project modal only. It does not prove hosted create/open/delete behavior, RLS denial handling, Supabase availability, or manual production smoke; those gates remain **NO-GO**.

### Local Access-Required Support Contact Slice

- Scope: `/beta/access-required` now routes denied or revoked beta users to `SUPPORT_INBOX_PLACEHOLDER` instead of a personal inbox, keeping the auth/onboarding support surface aligned with the public contact, legal, and Settings support copy.
- Guardrail evidence: `bunx vitest run tests/vitest/beta-access-required-page.test.ts tests/vitest/auth-callback-route.test.ts tests/vitest/auth-entry-ui-contract.test.ts --maxWorkers=1` passed 3 files / 9 tests.
- Launch meaning: this closes a local support-copy mismatch only. It does not prove hosted OAuth callbacks, allowlist behavior, email monitoring, or expired-link manual QA; those gates remain **NO-GO**.

### Local Login Legal Label Slice

- Scope: `/login` now labels legal links as `closed beta terms` and `privacy notice` instead of status-oriented placeholder labels.
- Guardrail evidence: `bunx vitest run tests/vitest/auth-entry-ui-contract.test.ts tests/vitest/auth-callback-route.test.ts tests/vitest/beta-access-required-page.test.ts --maxWorkers=1` passed 3 files / 9 tests.
- Launch meaning: this closes the local legal-link label mismatch only. It does not prove hosted Google OAuth, magic-link delivery, callback configuration, or manual auth journey proof; those gates remain **NO-GO**.

### Local Legal Page Placeholder Removal Slice

- Scope: `/terms` and `/privacy` no longer show owner-facing counsel-review placeholder instructions to beta users; both pages now keep user-facing closed-beta limits and dated review copy.
- Guardrail evidence: `bunx vitest run tests/vitest/support-contact-readiness.test.ts tests/vitest/auth-entry-ui-contract.test.ts --maxWorkers=1` passed 2 files / 8 tests.
- Launch meaning: this closes the visible placeholder-copy gap only. It does not provide legal advice, counsel review, owner approval, screenshots, or public-launch approval; legal/owner proof remains **NO-GO**.

### Local Landing Hero Claims Slice

- Scope: landing hero A/B copy no longer uses unsupported competitor-pressure or smart-user framing; both variants now describe closed-beta quote/proposal workflow value in product-grounded terms.
- Guardrail evidence: `bunx vitest run tests/vitest/landing-interactivity.test.tsx tests/vitest/landing-company-proof.test.ts --maxWorkers=1` passed 2 files / 12 tests.
- Launch meaning: this closes the local hero-copy risk only. It does not provide desktop/mobile screenshot evidence, owner/counsel legal review, or proof for every public landing claim; those gates remain **NO-GO**.

### Local Shared-Link Responsive Modal Slice

- Scope: the project shared-link modal now uses a single-column shell on small screens and keeps the existing two-column layout at large breakpoints, preventing the owner workflow from forcing desktop columns on mobile-width viewports.
- Guardrail evidence: `bunx vitest run tests/vitest/project-publication-header.test.tsx --maxWorkers=1` passed 1 file / 30 tests.
- Launch meaning: this closes one concrete responsive-layout risk only. It does not provide browser screenshot evidence, hosted share smoke, recipient email proof, or a full responsive sweep; those gates remain **NO-GO**.

### Local Row Details Library Sync State Slice

- Scope: the estimate row details modal now distinguishes synced library rows, customized library rows, project-specific detached rows, source-changed rows, unlinked/manual rows, and fallback library-source rows instead of collapsing linked rows into generic source copy.
- Guardrail evidence: `bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1` passed 1 file / 13 tests; `bun run type-check` passed.
- Launch meaning: this closes the local row-details source/link-state clarity gap only. It does not prove linked Supabase project-specific unlink, hosted/manual detach QA, route-performance proof, AI provider behavior, or proposal/spreadsheet export proof; those gates remain **NO-GO**.

### Repo-Local Implementation Freeze

- Implementation freeze commit: `6ab5b38`.
- Handoff artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/repo-local-freeze-external-proof-handoff-2026-06-02.md`, with docs/status freeze `f2ed23c` and external proof handoff `c32540e`.
- Source-contract guard: `3279048` locks the freeze handoff into `tests/vitest/closed-beta-readiness-docs.test.ts` so later launch-readiness passes cannot claim external/provider/manual gates from local-only evidence.
- Scope: repo-local implementation for the deferred-provider launch scope is complete. Remaining work should be evidence/doc orchestration and external/provider/manual proof, not additional local code, unless a new repo-local defect is found.
- Focused final proof refresh: `bunx vitest run tests/vitest/workshop-reset.test.tsx tests/vitest/template-library-manager-ui.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1` passed 4 files / 52 tests.
- Launch meaning: this does **not** approve closed beta launch. Hosted auth, linked Supabase migrations/RLS/storage/RPC/backup/PITR, Vercel env/custom-domain/rollback, Resend delivery/webhook proof, spreadsheet-app open/print, legal/owner signoff, support/alert monitoring, and hosted/manual E2E remain **NO-GO** until proven in a later pass.

### Final Codex Implementation Report Evidence

- Final report artifact: `final-codex-implementation-report.md`.
- Manual proof matrix artifact: `46-manual-proof-matrix.md`.
- Consolidated manual proof packet: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/README.md`.
- Goal completion audit artifact: `47-goal-completion-audit.md`.
- Manual proof packet template: `48-manual-proof-packet-template.md`.
- Stable implementation baseline summarized by the report: `8084908`.
- Report publication/correction commits: `80f806d`, `579cef0`.
- Current report recommendation: **NO-GO for external closed beta launch** until hosted/provider/manual proof gates are complete.
- Local baseline recorded in the report: typecheck pass, lint pass with 14 existing warnings, design lint pass, unit pass, full DOM pass at 131 files / 1021 tests / 2 skipped, build pass, graph/GitNexus checks clean.
- Current local validation refresh at `353dd48`: `bun run validate` passed; validation covered typecheck, lint with 14 warnings and 0 errors, design lint, unit tests (4 tests / 129 expectations), and DOM tests (151 files / 1119 passed / 2 skipped). This refresh does not change the **NO-GO** recommendation.
- Current local app build refresh at `353dd48`: `bun run build` passed under Next.js 16.2.6 / Turbopack, generated 32 static pages, and listed `/api/health`, `/api/ai/ask`, `/api/ai/package-builder`, `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`, `/api/webhooks/resend`, `/beta/access-required`, share routes, invite routes, settings routes, feedback routes, and protected workshop routes. This refresh does not change the **NO-GO** recommendation.
- Remaining proof gates recorded in the report: linked Supabase backup/RLS/storage/migration proof, hosted auth smoke, Vercel deploy/health/rollback proof, Resend proof before email workflows are re-enabled, spreadsheet open/print proof, legal review, monitored support proof, demo artifacts, and current manual/E2E smoke.

### Consolidated Manual Proof Packet

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/README.md`.
- Environment: local repo evidence plus read-only Vercel/Supabase/DNS checks.
- Anchors: local validation/build `353dd48`, latest read-only Vercel/Supabase provider proof `4fdf0de`, latest full local E2E refresh `bb9006d`.
- Result: **NO-GO** packet. Later artifacts close many rows, including current read-only linked Supabase readiness by `supabase-linked-readiness-pass-2026-06-05T0033Z.json`, but the packet remains conservative for external/widened beta.
- Remaining blocked/open rows now narrow to strict PITR/restore for public or higher-risk beta, native Excel/Numbers/LibreOffice spreadsheet-app open/recalc/print beyond synthetic Google Sheets and the real downloaded Quick Look proof, residual Codex Security history-risk unless closed/waived for the relevant launch scope, demo sign-off, and any hosted/manual E2E paths not explicitly covered by owner-only artifacts. Project-specific unlink now has linked/local owner-session browser proof, but not separate hosted production unlink proof. Real downloaded workbook structural/Quick Look proof is captured in `real-downloaded-workbook-quicklook-2026-06-05T0150Z.json`.
- Launch meaning: this improves artifact organization and future proof collection only. It does not add hosted/provider/manual proof and does not change the **NO-GO** recommendation.

### Provider State Refresh at b33f56d

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/provider-state-refresh-b33f56d-2026-06-02.md`.
- Vercel: latest `main` preview `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`, deployment `DEPLOYMENT_ID_PLACEHOLDER`, commit `b33f56df19cc3d74540fb71369c3da1461ffb61b`, status Ready.
- Health: `vercel curl` returns `{"ok":true,"service":"archestimator"}` for the latest preview and branch alias `/api/health`; plain public preview health still returns HTTP `401`.
- Env/custom domains: `vercel env ls --non-interactive` still returns no env vars; `www.archestimator.com/api/health` and redirected `archestimator.com/api/health` still return HTTP `404`.
- Supabase: `supabase migration list --linked` now succeeds and still shows launch migrations `20260601182522`, `20260601184343`, `20260602005649`, `20260602083000`, and `20260602084500` absent remotely.
- Launch meaning: this refresh removes the earlier migration-list read blocker but confirms the linked schema is still missing required launch migrations. Vercel env/public/custom-domain/rollback and hosted auth proof remain **NO-GO**.

### Provider State Refresh at d78686f

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/provider-state-refresh-d78686f-2026-06-02.md`.
- Vercel: latest `main` preview `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`, deployment `DEPLOYMENT_ID_PLACEHOLDER`, commit `d78686f259b07349220aefd9eb64f5a86c752456`, status Ready.
- Health: `vercel curl` returns `{"ok":true,"service":"archestimator"}` for the latest preview and branch alias `/api/health`; plain public preview and branch-alias health still return HTTP `401`.
- Env/custom domains: `vercel env ls --non-interactive` still returns no env vars; `www.archestimator.com/api/health` and redirected `archestimator.com/api/health` still return HTTP `404`.
- Supabase: CLI `2.98.2` is linked to project `Archestimator` / `ebxxqidacheyapmmzavr`; `supabase migration list --linked` succeeds and still shows launch migrations `20260601182522`, `20260601184343`, `20260602005649`, `20260602083000`, and `20260602084500` absent remotely.
- Launch meaning: this refresh confirms the latest pushed `main` evidence commit has a Ready protected preview, but it does not close Vercel env/public/custom-domain/rollback, hosted auth, linked Supabase migration/RLS/RPC/storage, Resend, spreadsheet-app, legal, support, or hosted/manual E2E gates.

### Provider State Refresh at 0b4628d

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/provider-state-refresh-0b4628d-2026-06-02.md`.
- Vercel: latest `main` preview `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`, deployment `DEPLOYMENT_ID_PLACEHOLDER`, commit `0b4628d413e0c17725e7a092af2fdec17de5ee84`, status Ready.
- Health: `vercel curl` returns `{"ok":true,"service":"archestimator"}` for the latest preview and branch alias `/api/health`; plain public preview and branch-alias health still return HTTP `401`.
- Env/custom domains: `vercel env ls --non-interactive` still returns no env vars; `www.archestimator.com/api/health`, redirected `archestimator.com/api/health`, and `archestimator.vercel.app/api/health` still return HTTP `404` on production deployment `DEPLOYMENT_ID_PLACEHOLDER`.
- Supabase: CLI `2.98.2` is linked to project `Archestimator` / `ebxxqidacheyapmmzavr`; `supabase migration list --linked` succeeds and still shows launch migrations `20260601182522`, `20260601184343`, `20260602005649`, `20260602083000`, and `20260602084500` absent remotely; `bun run launch:supabase-readiness` fails on the linked temp-role pooler `ECIRCUITBREAKER` / `SUPABASE_DB_PASSWORD` path.
- Launch meaning: this refresh confirms the latest pushed `main` commit has a Ready protected preview, but it does not close Vercel env/public/custom-domain/rollback, hosted auth, linked Supabase migration/RLS/RPC/storage, Resend, spreadsheet-app, legal, support, or hosted/manual E2E gates.

### Provider State Refresh at 4fdf0de

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/provider-state-refresh-4fdf0de-2026-06-02.md`.
- Vercel: latest `main` preview `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`, deployment `DEPLOYMENT_ID_PLACEHOLDER`, status `READY`.
- Health: `vercel curl` returns app health JSON for the latest preview and branch alias `/api/health`; plain public preview and branch-alias health still return HTTP `401`.
- Env/custom domains: `vercel env ls --non-interactive` still returns no env vars; custom-domain `/api/health` still returns HTTP `404` for `www` and `archestimator.vercel.app`, with apex redirecting `307` to `www`; custom domains still alias to `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- Supabase: `supabase migration list --linked` succeeds, the repeatable migration parser reads 71 rows, and all five launch migrations remain local-only / missing remotely. A later Supabase MCP read-only execution of `scripts/sql/linked-supabase-launch-readiness.sql` parsed all readiness categories and reported `linkedSupabaseLaunchReady: false` with 13 total checks / 13 failed rows.
- Launch meaning: this refresh confirms current `HEAD` has a Ready protected preview, but it does not close Vercel env/public/custom-domain/rollback, hosted auth, linked Supabase migration/RLS/RPC/storage, Resend, spreadsheet-app, legal, support, or hosted/manual E2E gates.

### Vercel Env Readiness Helper

- Script: `scripts/check-vercel-env-readiness.ts`.
- Package command: `bun run launch:check-vercel-env`.
- Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-env-readiness-4fdf0de-2026-06-02.json`.
- Scope: parses a sanitized `vercel env ls --non-interactive` transcript for variable names only and reports core closed-beta runtime, email delivery, and invite delivery env-name coverage.
- Guardrail evidence: `bunx vitest run tests/vitest/vercel-env-readiness-script.test.ts --maxWorkers=1` passed 4 tests covering env-name extraction, empty-list fail-closed behavior, core runtime pass behavior, and separate email/invite readiness groups.
- Current refreshes: `VERCEL_ENV_LIST_TEXT="$(vercel env ls --non-interactive 2>&1)" OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-env-readiness-4fdf0de-2026-06-02.json bun run launch:check-vercel-env`, later `VERCEL_ENV_LIST_TEXT="$(vercel env ls --non-interactive 2>&1)" OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-env-readiness-6aaa0b7-2026-06-02.json bun run launch:check-vercel-env`, later `VERCEL_ENV_LIST_TEXT="$(vercel env ls --non-interactive 2>&1)" OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-env-readiness-9cbf6c3-2026-06-02.json bun run launch:check-vercel-env`, later `VERCEL_ENV_LIST_TEXT="$(vercel env ls --non-interactive 2>&1)" OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-env-readiness-4b89b72-2026-06-02.json bun run launch:check-vercel-env`, later `VERCEL_ENV_LIST_TEXT="$(vercel env ls --non-interactive 2>&1)" OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-env-readiness-d1c4335-2026-06-02.json bun run launch:check-vercel-env`, and latest `VERCEL_ENV_LIST_FILE=/tmp/arch-provider-refresh-19345be/vercel-env-list.txt OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-env-readiness-19345be-2026-06-02.json bun run launch:check-vercel-env` wrote sanitized JSON and exited `1` because no env names were discovered.
- Launch meaning: this makes Vercel env-name proof repeatable, but it does not prove secret values, callback URL correctness, provider dashboard configuration, delivery, rollback, or hosted auth behavior. Vercel env readiness remains **NO-GO**.

### Vercel Public Health Readiness Helper

- Script: `scripts/check-vercel-health-readiness.ts`.
- Package command: `bun run launch:check-vercel-health`.
- Proof artifacts: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-health-readiness-4fdf0de-2026-06-02.json`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-health-readiness-02f3a9c-2026-06-02.json`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-health-readiness-b6873b4-2026-06-02.json`, and `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-health-readiness-6685d78-2026-06-02.json`.
- Scope: probes configured `/api/health` URLs and passes only when every URL returns HTTP `200` with JSON `{ "ok": true, "service": "archestimator" }`. Optional auth header/cookie inputs are request-only and never written to the report.
- Current refreshes: `VERCEL_HEALTH_URLS='https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health,https://www.archestimator.com/api/health,https://archestimator.com/api/health,https://archestimator.vercel.app/api/health' OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-health-readiness-4fdf0de-2026-06-02.json bun run launch:check-vercel-health`, later `VERCEL_HEALTH_URLS='https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health,https://www.archestimator.com/api/health,https://archestimator.com/api/health,https://archestimator.vercel.app/api/health' OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-health-readiness-02f3a9c-2026-06-02.json bun run launch:check-vercel-health`, later `VERCEL_HEALTH_URLS='https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health,https://www.archestimator.com/api/health,https://archestimator.com/api/health,https://archestimator.vercel.app/api/health' OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-health-readiness-b6873b4-2026-06-02.json bun run launch:check-vercel-health`, and latest `VERCEL_HEALTH_URLS='https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health,https://www.archestimator.com/api/health,https://archestimator.com/api/health,https://archestimator.vercel.app/api/health' OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-health-readiness-6685d78-2026-06-02.json bun run launch:check-vercel-health` wrote sanitized JSON and exited `1`.
- Result: repeatable public health refreshes report branch-alias public health HTTP `401`; `www.archestimator.com/api/health` and `archestimator.vercel.app/api/health` HTTP `404`; apex `archestimator.com/api/health` HTTP `307` to `www`; no URL returned the app health JSON; `vercelHealthReady: false`. The latest `6685d78` refresh again has zero ready URLs.
- Launch meaning: this makes public/custom-domain health proof repeatable, but it does not prove Vercel env values, protected preview health through `vercel curl`, production promotion, rollback, hosted auth, or app behavior behind deployment protection. Public/custom-domain health remains **NO-GO**.

### Vercel Production Alias/Rollback Readiness Helper

- Script: `scripts/check-vercel-production-readiness.ts`.
- Package command: `bun run launch:check-vercel-production`.
- Proof artifacts: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-production-readiness-4fdf0de-2026-06-02.json`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-production-readiness-9e253e7-2026-06-02.json`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-production-readiness-79ecf99-2026-06-02.json`, and `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-production-readiness-a537ae3-2026-06-02.json`.
- Scope: parses sanitized `vercel inspect --format=json`, `vercel alias ls`, and optional `vercel ls` transcripts to check current deployment readiness, whether custom domains alias to that deployment, ready rollback-candidate availability, and explicit rollback-drill status.
- Current refreshes: `VERCEL_INSPECT_TEXT="$(vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --format=json --non-interactive 2>&1)" VERCEL_ALIAS_LIST_TEXT="$(vercel alias ls --non-interactive 2>&1)" VERCEL_DEPLOYMENT_LIST_TEXT="$(vercel ls --non-interactive 2>&1)" VERCEL_EXPECTED_CUSTOM_DOMAINS='archestimator.com,www.archestimator.com,archestimator.vercel.app' OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-production-readiness-4fdf0de-2026-06-02.json bun run launch:check-vercel-production`, later `VERCEL_INSPECT_TEXT="$(vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --format=json --non-interactive 2>&1)" VERCEL_ALIAS_LIST_TEXT="$(vercel alias ls --non-interactive 2>&1)" VERCEL_DEPLOYMENT_LIST_TEXT="$(vercel ls --non-interactive 2>&1)" VERCEL_EXPECTED_CUSTOM_DOMAINS='archestimator.com,www.archestimator.com,archestimator.vercel.app' OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-production-readiness-9e253e7-2026-06-02.json bun run launch:check-vercel-production`, later `CURRENT_DEPLOYMENT="$(vercel ls --scope VERCEL_SCOPE_PLACEHOLDER 2>/dev/null | grep -m1 -o 'https://[^ ]*vercel.app')" VERCEL_INSPECT_TEXT="$(vercel inspect "$CURRENT_DEPLOYMENT" --scope VERCEL_SCOPE_PLACEHOLDER --json 2>&1)" VERCEL_ALIAS_LIST_TEXT="$(vercel alias ls --scope VERCEL_SCOPE_PLACEHOLDER 2>&1)" VERCEL_DEPLOYMENT_LIST_TEXT="$(vercel ls --scope VERCEL_SCOPE_PLACEHOLDER 2>&1)" VERCEL_EXPECTED_CUSTOM_DOMAINS='archestimator.com,www.archestimator.com,archestimator.vercel.app' OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-production-readiness-79ecf99-2026-06-02.json bun run launch:check-vercel-production`, and latest `CURRENT_DEPLOYMENT="$(vercel ls --scope VERCEL_SCOPE_PLACEHOLDER 2>/dev/null | grep -m1 -o 'https://[^ ]*vercel.app')" VERCEL_INSPECT_TEXT="$(vercel inspect "$CURRENT_DEPLOYMENT" --scope VERCEL_SCOPE_PLACEHOLDER --json 2>&1)" VERCEL_ALIAS_LIST_TEXT="$(vercel alias ls --scope VERCEL_SCOPE_PLACEHOLDER 2>&1)" VERCEL_DEPLOYMENT_LIST_TEXT="$(vercel ls --scope VERCEL_SCOPE_PLACEHOLDER 2>&1)" VERCEL_EXPECTED_CUSTOM_DOMAINS='archestimator.com,www.archestimator.com,archestimator.vercel.app' OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-production-readiness-a537ae3-2026-06-02.json bun run launch:check-vercel-production` wrote sanitized JSON and exited `1`.
- Result: latest preview deployment `DEPLOYMENT_ID_PLACEHOLDER` at `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` is `READY`; `archestimator.com`, `www.archestimator.com`, and `archestimator.vercel.app` still alias to `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`; 19 ready rollback candidates were found; rollback drill was not provided; `vercelProductionReady: false`.
- Historical launch meaning: this made custom-domain/rollback proof repeatable at the time, but it did not promote deployments, change aliases, run health checks, verify env values, exercise hosted auth, or perform a rollback. This older helper result is superseded for Vercel rollback by the 2026-06-04 11:12Z drill and green production-readiness artifact.

### Supabase Backup/PITR Readiness Helper

- Script: `scripts/check-supabase-backup-readiness.ts`.
- Package command: `bun run launch:check-supabase-backup`.
- Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-backup-readiness-b77245a-2026-06-02.json`.
- Scope: parses sanitized `supabase backups list --project-ref <ref> -o json` or Management API backup-list JSON and records backup count, PITR status, WAL status, region, restore-drill status, and missing proof rows without storing provider tokens or credentials.
- Current refresh: `supabase backups list --project-ref ebxxqidacheyapmmzavr -o json` returned sanitized JSON with no listed backups and PITR disabled; `SUPABASE_BACKUP_LIST_JSON='{"backups":[],"physical_backup_data":{},"pitr_enabled":false,"region":"ap-southeast-2","walg_enabled":true}' SUPABASE_BACKUP_PROJECT_REF=ebxxqidacheyapmmzavr OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-backup-readiness-b77245a-2026-06-02.json bun run launch:check-supabase-backup` wrote sanitized JSON and exited `1`.
- Result: region `ap-southeast-2`; zero listed backups; `pitrEnabled: false`; `walgEnabled: true`; `restoreDrillStatus: not-provided`; missing `listed backups`, `PITR enabled`, and `restore drill passed`; `supabaseBackupReady: false`.
- Launch meaning: this makes backup/PITR proof repeatable, but it does not enable PITR, create/list a backup, perform a restore, or prove linked migration safety. Supabase backup/PITR and restore-drill readiness remains **NO-GO**.

### Supabase Migration List Readiness Helper

- Script: `scripts/check-supabase-migration-readiness.ts`.
- Package command: `bun run launch:check-supabase-migrations`.
- Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-migration-readiness-28f7a2a-2026-06-02.json`.
- Scope: parses sanitized `supabase migration list --linked` text and checks that launch migrations `20260601182522`, `20260601184343`, `20260602005649`, `20260602083000`, and `20260602084500` appear in remote migration history.
- Current refresh: `SUPABASE_MIGRATION_LIST_FILE=/tmp/arch-provider-refresh-28f7a2a/supabase-migration-list.txt SUPABASE_MIGRATION_PROJECT_REF=ebxxqidacheyapmmzavr OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-migration-readiness-28f7a2a-2026-06-02.json bun run launch:check-supabase-migrations` wrote sanitized JSON and exited `1`.
- Result: 71 migration rows parsed from the successful linked migration-list transcript; all five required launch migrations are present locally but missing remotely; `linkedMigrationsReady: false`.
- Launch meaning: this makes migration-list parity proof repeatable, but it does not prove RLS, grants, storage posture, object existence, backup/PITR, restore safety, or the deeper SQL readiness query. Linked Supabase remains **NO-GO**.

### Supabase Linked Readiness Parser Helper

- Script: `scripts/check-supabase-linked-readiness.ts`.
- Package command: `bun run launch:check-supabase-linked-readiness`.
- Proof artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-linked-readiness-f56838d-2026-06-02.json`.
- Scope: parses sanitized JSON output from the read-only `scripts/sql/linked-supabase-launch-readiness.sql` query and records migration, table/RLS, anon grant, function, storage, and summary pass/fail counts.
- Current refresh: `supabase db query --linked --file scripts/sql/linked-supabase-launch-readiness.sql --output json` returned sanitized read-only JSON; `SUPABASE_LINKED_READINESS_FILE=/tmp/arch-provider-refresh-f56838d/supabase-linked-readiness.json SUPABASE_LINKED_PROJECT_REF=ebxxqidacheyapmmzavr OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-linked-readiness-f56838d-2026-06-02.json bun run launch:check-supabase-linked-readiness` wrote sanitized JSON and exited `1`.
- Result: all required categories parsed; 13 total checks / 13 failed rows; five launch migrations missing, two required tables missing, two private-table grant checks at `table_missing`, two required functions missing, `storage.buckets.component-images:public`, `summaryPassed: false`, and `linkedSupabaseLaunchReady: false`.
- Launch meaning: this makes the deeper linked Supabase SQL readiness proof repeatable, but it does not apply migrations, repair migration history, mutate storage, perform RLS/browser allow-deny checks, prove backup/PITR, or run a restore. Linked Supabase remains **NO-GO**.

### Supabase Linked Readiness MCP Refresh at bc798a9

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-linked-readiness-mcp-bc798a9-2026-06-02.json`.
- Scope: read-only Supabase MCP `execute_sql` run of `scripts/sql/linked-supabase-launch-readiness.sql` against project `ebxxqidacheyapmmzavr` / `Archestimator`, status `ACTIVE_HEALTHY`, region `ap-southeast-2`, database version `17.6.1.121`.
- Result: JSON parsed successfully; `blockedReason` is `null`; `missingCategories` is empty; `linkedSupabaseLaunchReady` is `false`.
- Failed checks: 13 total / 13 failed. Five launch migrations are missing, `public.closed_beta_allowed_emails` and `public.beta_feedback_submissions` are missing, both private-table anon-select grant checks are `table_missing`, `public.check_closed_beta_access` and `public.unlink_estimate_row_item_from_library_with_history` are missing, and `storage.buckets.component-images:public` is `public`.
- Launch meaning: this removes the earlier linked SQL parser uncertainty caused by CLI SASL auth failure and replaces it with concrete read-only database evidence. It still does not apply migrations, change grants, mutate storage, prove RLS/browser allow-deny behavior, prove backup/PITR, or run a restore. Linked Supabase remains **NO-GO**.

### Hosted Auth Route Proof Helper

- Script: `scripts/verify-hosted-auth-routes.ts`.
- Package command: `bun run launch:verify-hosted-auth`.
- Required operator inputs for a complete pass: `HOSTED_AUTH_BASE_URL`, `HOSTED_AUTH_ALLOWED_COOKIE`, `HOSTED_AUTH_DENIED_COOKIE`, `HOSTED_AUTH_REVOKED_COOKIE`, and `HOSTED_AUTH_EXPIRED_COOKIE`, with optional `HOSTED_AUTH_PLATFORM_COOKIE` / `HOSTED_AUTH_PLATFORM_AUTH_HEADER` for deployment-protection bypass. Store only sanitized JSON via `OUTPUT_FILE`.
- Scope: probes `/workshop` for signed-out, allowed, denied, revoked, and expired-session cases. Expected results are signed-out/expired redirecting to `/login?next=%2Fworkshop`, allowed reaching the protected workshop, denied redirecting to `/beta/access-required`, and revoked redirecting to `/beta/access-required?status=revoked`.
- Guardrail evidence: `bunx vitest run tests/vitest/hosted-auth-route-smoke-script.test.ts --maxWorkers=1` covers base URL refusal, request-only cookie/header handling, redirect classification, missing-session fail-closed behavior, and proof-report redaction.
- Launch meaning: this makes complete hosted auth route proof operator-ready and sanitized. Separate real browser proof now covers hosted owner allowed, denied, revoked, and logout paths, while the 19:20Z synthetic stale-cookie artifact proves expired-session fail-closed routing without storing live auth material. This helper row still does not prove Google Cloud dashboard callback configuration, first-run workspace behavior, or a harvested real browser session expiration timestamp.

### Hosted Auth Env Fail-Closed Fix at 6cc9f03

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-auth-env-fail-closed-fix-6cc9f03-2026-06-02.md`.
- Hosted finding: latest observed preview `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` / deployment `DEPLOYMENT_ID_PLACEHOLDER` was `READY` and `/api/health` passed through `vercel curl`, but protected `/workshop` returned HTTP `500`.
- Root cause: `getCurrentUserContext()` created the Supabase server client before determining signed-out state; missing Vercel Supabase env caused `createSupabaseServerClient()` to throw.
- Local fix: `src/lib/auth/session.ts` now checks for required Supabase server env before constructing the server client and returns `null` so `requireCurrentUserContext()` redirects to `/login` instead of surfacing a 500.
- Verification: graph impact flagged high auth-session blast radius; `bunx vitest run tests/vitest/auth-session-closed-beta.test.ts tests/vitest/auth-callback-route.test.ts tests/vitest/auth-proxy.test.ts --maxWorkers=1` passed 3 files / 25 tests; `bun run type-check` passed; focused ESLint passed.
- Launch meaning: this is local fail-closed proof only until committed, pushed, deployed, and rechecked on Vercel. It does not prove allowed/denied/revoked/expired hosted sessions, callback URLs, linked allowlist data, Vercel env values, or first-run workspace behavior.

### Vercel Preview Deploy Blocked at c8e25e2

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-preview-deploy-blocked-c8e25e2-2026-06-02.md`.
- Scope: commit `c8e25e2ce63dd3004db8085480432ba847900e10` was pushed to `origin/main`, but `vercel ls --non-interactive` still showed the pre-fix `DEPLOYMENT_ID_PLACEHOLDER` preview as newest/branch-alias target during the polling window.
- Clean deploy attempt: a detached clean worktree at `c8e25e2` was used to avoid unrelated dirty checkout files. The first CLI preview deploy hit Vercel's upload file-size limit; after a temporary deploy-only `.vercelignore` excluded non-runtime evidence/deck folders, the retry failed before deployment with `api-deployments-free-per-day`.
- Launch meaning: the fail-closed auth fix is committed and pushed, but hosted `/workshop` proof remains blocked until Vercel can create a fresh `c8e25e2` or later deployment and `vercel curl <deployment>/workshop -I` proves it no longer returns HTTP `500`.

### Vercel CLI Upload Scope Mitigation at 6a26759

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-cli-upload-scope-mitigation-6a26759-2026-06-02.md`.
- Change: added repo-level `.vercelignore` so CLI deployments skip non-runtime evidence/planning/deck/test/report folders, local generated state, logs, and `.env*` files while keeping app runtime source/assets/config and `.env.example`.
- Reason: the prior clean preview deploy attempt showed non-runtime folders in the upload path, with `archestimator_pitch deck` around 98 MiB and `.ai` around 25 MiB in the detached worktree.
- Launch meaning: this removes a known CLI-upload obstacle for future preview retries, but hosted proof remains blocked until a fresh deployment is actually created and checked.

### Hosted Auth Proxy Env Fail-Closed Fix at 8e11d36

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-auth-proxy-env-fail-closed-fix-8e11d36-2026-06-02.md`.
- Hosted finding: preview `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` / deployment `DEPLOYMENT_ID_PLACEHOLDER` was `READY` and `/api/health` passed through `vercel curl`, but both `HEAD /workshop` and `GET /workshop` returned HTTP `500`.
- Root cause: `src/proxy.ts` constructed the Supabase SSR client with non-null asserted env values before it could redirect signed-out protected routes.
- Local fix: proxy now checks for required Supabase env before calling `createServerClient()`; missing env redirects protected `/workshop` routes to `/login?next=...` and leaves `/login` renderable without constructing the Supabase client.
- Verification: GitNexus impact for `Function:src/proxy.ts:proxy` reported low risk / zero upstream affected processes; focused auth proxy/session tests passed 2 files / 23 tests; `bun run type-check` and `bun run build` passed.
- Launch meaning: this was local fail-closed proof before the `b2a0a03` postdeploy recheck. It does not prove hosted allowed/denied/revoked/expired sessions, callback URLs, linked allowlist data, Vercel env values, custom-domain health, or rollback.

### Hosted Auth Proxy Env Postdeploy Recheck at b2a0a03

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-auth-proxy-env-postdeploy-b2a0a03-2026-06-02.md`.
- Vercel: preview `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` reached `READY` after commit `b2a0a03`.
- Health: `vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health` returned app health JSON with `"ok": true` and `"service": "archestimator"`.
- Protected-route result: `vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/workshop -I` returned HTTP `307` with `location: /login?next=%2Fworkshop`.
- Launch meaning: this closes only the signed-out missing-env protected-route recheck that previously returned HTTP `500`. It does not prove hosted Google OAuth, allowed/denied/revoked/expired hosted sessions, callback URLs, linked allowlist data, Vercel env values, custom-domain health, rollback, first-run workspace, or hosted manual E2E.

### Hosted Export Route Auth-Blocked Probe at 231c27e

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-export-route-auth-blocked-231c27e-2026-06-02.md`.
- Vercel: preview `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`, deployment `DEPLOYMENT_ID_PLACEHOLDER`, commit `231c27e2b95291b8c9770e327344ba3809f03f9d`, status Ready.
- Health: protected `/api/health` returned `{"ok":true,"service":"archestimator"}` through `vercel curl`.
- Route map: the XLSX export route calls `getProjectEstimateTreeByEstimate(...)`, which resolves workspace context through `requireCurrentUserContext()`; `/api` is bypassed by proxy, so the auth boundary is inside the route's repository chain.
- Probe result: anonymous/fake-ID `vercel curl` did not produce XLSX bytes. One raw probe surfaced a Next.js 404 not-found page, and a clean rerun returned zero captured response bytes after roughly 3 seconds.
- Launch meaning: this is not hosted workbook timing/memory proof. It narrows the blocker to the exact prerequisite: a logged-in hosted app session plus real authorized project/estimate IDs are required before the export route can be measured on Vercel.

### Hosted Export Proof Helper

- Script: `scripts/verify-hosted-export-route.ts`.
- Package command: `bun run launch:verify-hosted-export`.
- Required inputs: `HOSTED_EXPORT_BASE_URL`, `HOSTED_EXPORT_PROJECT_ID`, `HOSTED_EXPORT_ESTIMATE_ID`, and either `HOSTED_EXPORT_AUTH_COOKIE` or `HOSTED_EXPORT_AUTH_HEADER`.
- Sanitization: the helper uses auth material only as request headers and never writes cookies or authorization headers to the JSON proof report.
- Guardrail evidence: `bun run launch:verify-hosted-export` without required inputs fails closed and names the missing variables; `bunx vitest run tests/vitest/hosted-export-route-smoke-script.test.ts --maxWorkers=1` passed 5 tests covering missing-input refusal, encoded route generation, sanitized auth handling, non-workbook failure, XLSX ZIP magic, and request header construction.
- Launch meaning: this makes the authenticated hosted export smoke operator-ready, but it does not complete the proof row until a real hosted session and authorized estimate produce a passing JSON artifact.

### Legal/Owner Readiness Helper

- Script: `scripts/check-legal-owner-readiness.ts`.
- Package command: `bun run launch:check-legal-owner`.
- Scope: parses operator-confirmed terms, privacy, closed-beta copy, data-retention wording, support-communications wording, product owner, legal reviewer, approval date, and approval reference proof into sanitized JSON.
- Guardrail evidence: `bunx vitest run tests/vitest/legal-owner-readiness-script.test.ts --maxWorkers=1` passed 5 tests covering proof-flag parsing, label sanitization, real `YYYY-MM-DD` approval-date validation, missing-proof fail-closed behavior, and all-proof pass behavior.
- Current legal refreshes: `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/legal-owner-readiness-ede0f32-2026-06-02.json bun run launch:check-legal-owner`, later `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/legal-owner-readiness-5fa0ac1-2026-06-02.json bun run launch:check-legal-owner`, later `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/legal-owner-readiness-b74baea-2026-06-02.json bun run launch:check-legal-owner`, later `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/legal-owner-readiness-6556584-2026-06-02.json bun run launch:check-legal-owner`, and latest `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/legal-owner-readiness-874e645-2026-06-02.json bun run launch:check-legal-owner` wrote sanitized JSON and exited `1`; the latest reports all five proof flags false, product owner / legal reviewer / approval date / approval reference missing, 9 missing checks, and `legalOwnerReady: false`.
- Launch meaning: this makes legal/owner proof repeatable and sanitized, but it does not provide legal advice, verify counsel review, inspect contracts, or approve public launch by itself. Legal/owner review remains **NO-GO** until the operator supplies real approval proof and the helper passes.

### Support Email DNS Proof Helper

- Script: `scripts/check-support-email-dns.ts`.
- Package command: `bun run launch:check-support-dns`.
- Scope: public DNS lookup for support email readiness, including MX hosts, apex SPF TXT records, `_dmarc` TXT records, and A records.
- Guardrail evidence: `bunx vitest run tests/vitest/support-email-dns-script.test.ts --maxWorkers=1` passed 4 tests covering domain normalization, split TXT flattening, positive MX/SPF/DMARC readiness, and missing-DMARC failure.
- Current DNS refreshes: `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-refresh-792076e-2026-06-02.json bun run launch:check-support-dns`, later `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-refresh-ec31121-2026-06-02.json bun run launch:check-support-dns`, later `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-refresh-04e3b28-2026-06-02.json bun run launch:check-support-dns`, later `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-refresh-c72f9fb-2026-06-02.json bun run launch:check-support-dns`, and latest `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-refresh-9a2f8ca-2026-06-02.json bun run launch:check-support-dns` wrote sanitized JSON and exited `1` because MX/SPF/A records exist but DMARC is missing.
- Launch meaning: this makes DNS proof collection repeatable and sanitized, but DNS readiness is not support monitoring proof. Closed beta remains blocked until inbox/table monitoring, alert owner, and incident escalation proof are captured.

### Support Monitoring Readiness Helper

- Script: `scripts/check-support-monitoring-readiness.ts`.
- Package command: `bun run launch:check-support-monitoring`.
- Scope: parses operator-confirmed support inbox monitoring, feedback review, uptime alert, error alert, incident escalation, and owner-label proof flags into sanitized JSON.
- Guardrail evidence: `bunx vitest run tests/vitest/support-monitoring-readiness-script.test.ts --maxWorkers=1` passed 4 tests covering proof-flag parsing, owner-label sanitization, missing-proof fail-closed behavior, and all-proof pass behavior.
- Current monitoring refreshes: `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-monitoring-readiness-c9c1141-2026-06-02.json bun run launch:check-support-monitoring`, later `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-monitoring-readiness-5fa0ac1-2026-06-02.json bun run launch:check-support-monitoring`, later `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-monitoring-readiness-453ac68-2026-06-02.json bun run launch:check-support-monitoring`, later `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-monitoring-readiness-8f9b11d-2026-06-02.json bun run launch:check-support-monitoring`, and latest `OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-monitoring-readiness-0acf1d1-2026-06-02.json bun run launch:check-support-monitoring` wrote sanitized JSON and exited `1`; the latest reports all five proof flags false, all owner labels missing, 9 missing checks, and `supportMonitoringReady: false`.
- Launch meaning: this makes support/alert ownership proof repeatable and sanitized, but it does not verify inbox access, alert dashboards, linked feedback rows, hosted auth, or incident delivery by itself. Support/monitoring remains **NO-GO** until the operator supplies real proof and the helper passes.

### AUTH-E2E Local Signed-Out Smoke Evidence

- Local command: `PLAYWRIGHT_PORT=3037 bun run test:e2e -- e2e/auth.spec.ts --project=chromium`.
- Result: pass, 2 Playwright tests in 9.9s.
- Covered behavior: signed-out `/workshop/projects` redirects to `/login?next=%2Fworkshop%2Fprojects`, and `/login?next=/workshop/projects` renders the compact email-link sign-in controls.
- Scope limit: this is local signed-out route/login UI proof only. Hosted Google auth, allowed/denied/revoked allowlist smoke, first-run workspace entry, and session expiry/logout proof remain external/manual gates.

### Full Local E2E Refresh at bb9006d

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/full-local-e2e-refresh-bb9006d-2026-06-02.md`.
- Command: `PLAYWRIGHT_PORT=3020 bun run test:e2e -- --project=chromium`.
- Result: pass, 9 Playwright tests passed and 24 env-gated/live-provider specs skipped in 1.2m.
- Covered ungated behavior: signed-out auth redirect/login UI, landing audit, public route-transition budgets, Slow 3G public budgets, public link-transition medians, public back-forward restore, and protected redirect budget.
- Launch meaning: this retires the stale full-suite local blocker that cited a port-3000 webServer conflict, but it is still local Playwright proof only. Hosted auth, linked Supabase/RLS/storage/RPC, production Vercel env/custom-domain/rollback, project-specific unlink, spreadsheet-app, legal, support monitoring, and current hosted/manual E2E remain **NO-GO**.

### SUPPORT-001 Honest Contact Handoff Evidence

- `src/components/landing/ContactForm.tsx` opens a structured `mailto:SUPPORT_INBOX_PLACEHOLDER` draft containing name, email, organization, inquiry type, and message instead of simulating backend receipt.
- The confirmation state says the support email draft was prepared and includes fallback instructions if the user's email app does not open.
- `src/components/workshop/WorkshopPageShell.tsx` keeps the authenticated workshop footer one click from `SUPPORT_INBOX_PLACEHOLDER` beta feedback.
- Focused verification: `bunx vitest run tests/vitest/contact-form-mailto.test.tsx tests/vitest/support-contact-readiness.test.ts tests/vitest/closed-beta-readiness-docs.test.ts --maxWorkers=1` passed 3 files / 15 tests.
- Scope limit: this proves an honest local support handoff only. It does not prove inbox monitoring, form delivery, alert owner, or incident response.

### Command Evidence

| Evidence | Result |
| --- | --- |
| Full local implementation baseline | `c5ca065` after demo seed row repair |
| Final report baseline | `8084908` after canonical state/decision/roadmap truth sync |
| Final report indexed in launch docs | `3e8d7a0` |
| Current local validation refresh | `353dd48`, `bun run validate` pass |
| Current local app build refresh | `353dd48`, `bun run build` pass |
| `bun install --frozen-lockfile` | Pass |
| `bun run type-check` | Pass |
| `bun run lint` | Pass with 14 warnings |
| `bun run lint:design-system` | Pass |
| `bun run test` | Pass: 4 unit tests / 129 expectations |
| `bun run test:dom` | Historical baseline pass: 131 files / 1021 tests / 2 skipped; current validation refresh pass: 151 files / 1119 passed / 2 skipped |
| `bun run build` | Historical baseline pass; current build refresh pass at `353dd48`, Next.js 16.2.6 / Turbopack, 32 static pages |

### AI-001 Local Implementation Evidence

- `src/lib/ai/feature-flags.ts` now defaults `ARCHESTIMATOR_AI_ENABLED=false` and `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false`.
- `src/app/api/ai/ask/route.ts` and `src/app/api/ai/package-builder/route.ts` return `404` `{ error: "AI is disabled for closed beta." }` before dynamically importing their handlers unless `ARCHESTIMATOR_AI_ENABLED=true`.
- `src/components/workshop/WorkshopPageShell.tsx` renders `AskFlipFooterAssistant` only when `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=true`.
- `.env.example` documents the closed-beta access flag plus AI route/UI flags with false defaults.
- Focused red/green evidence: `bunx vitest run tests/vitest/ai-ask-route.test.ts tests/vitest/ai-package-builder-route.test.ts tests/vitest/workshop-reset.test.tsx tests/vitest/ai-package-builder-security-contract.test.ts tests/vitest/project-publication-actions.test.ts --maxWorkers=1` passed 5 files / 77 tests.
- `bun run type-check` passed after the AI gate.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests.
- `bun run test:dom` passed 122 files / 989 tests with 2 skips.
- `bun run build` passed after the route/UI gate.
- `git diff --check` passed.
- Post-edit code-review-graph found 0 affected flows for the 21 changed files; minimal review context still reports high risk because `WorkshopPageShell` is a shared shell.
- Post-edit GitNexus `detect-changes --repo archestimator` reports critical risk through `WorkshopPageShell` and 23 affected processes; this is expected for a shell mount gate and is mitigated by focused shell tests plus full DOM/build evidence.

### BETA-AUTH-001/004 Local Implementation Evidence

- Supabase CLI generated migration `supabase/migrations/20260601182522_closed_beta_allowed_emails.sql` with the current `supabase migration new closed_beta_allowed_emails` command.
- Migration creates `public.closed_beta_allowed_emails`, enables RLS, revokes anon/authenticated table grants, and grants authenticated execute only on `public.check_closed_beta_access(raw_email text)`.
- RPC uses `security definer`, `set search_path = ''`, fully qualified table references, and checks the requested normalized email against `auth.jwt() ->> 'email'` so authenticated users cannot enumerate arbitrary allowlist emails through the RPC.
- `src/lib/auth/closed-beta-access.ts` centralizes email normalization, default-disabled env behavior, fail-closed RPC errors, and revoked access path building.
- `src/proxy.ts`, `src/app/auth/callback/route.ts`, and `src/lib/auth/session.ts` now enforce missing/revoked access while preserving public `/share`, `/invite`, `/beta`, legal, and marketing routes.
- `src/app/beta/access-required/page.tsx` provides the public invite-only beta UX and deliberately avoids linking to `/workshop`.
- Focused red/green evidence: `bun run test:dom tests/vitest/closed-beta-access.test.ts tests/vitest/closed-beta-access-migration.test.ts tests/vitest/beta-access-required-page.test.ts tests/vitest/auth-proxy.test.ts tests/vitest/auth-callback-route.test.ts tests/vitest/auth-session-closed-beta.test.ts` passed 6 files / 32 tests.
- `bun run type-check` passed after the closed-beta gate.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed after keeping the access-required page within the 12px app/workshop cap.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 126 files / 1002 tests with 2 skips.
- `bun run build` passed and lists `/beta/access-required` as a dynamic app route.
- `git diff --check` passed.
- Post-edit code-review-graph reported 0 affected flows for the 19 staged changed files, with review gaps on `GET`, `BetaAccessRequiredPage`, helper functions, and `mockUser` despite focused source/route/helper tests.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reports critical risk through `getCurrentUserContext` and 29 affected processes; this is expected for a session-boundary gate and is mitigated by default-disabled behavior, focused session/proxy/callback tests, full DOM, and build evidence.
- Remote linked Supabase migration apply is not done in this slice; backup/PITR proof remains required before applying launch/beta migrations.

### NONPAY-001 Local Pricing Copy Evidence

- `/pricing` is reframed as invite-only closed beta access with "No payment is required" and "Pricing will be announced after beta" copy.
- Landing pricing and FAQ sections no longer show `₱0`, "free access", or active paid-tier language.
- Primary pricing CTA is request access/contact; already-invited users are directed to sign in with their invited Google account.
- Focused red/green evidence: `bun run test:dom tests/vitest/closed-beta-pricing-copy.test.ts` passed 1 file / 2 tests.
- Adjacent focused route/copy evidence: `bun run test:dom tests/vitest/closed-beta-pricing-copy.test.ts tests/vitest/landing-company-proof.test.ts tests/vitest/auth-proxy.test.ts` passed 3 files / 28 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors after fixing a JSX apostrophe escape in the landing FAQ copy.
- `bun run lint:design-system` passed.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph reported 0 affected flows for the 10 staged changed files, with source-contract coverage gaps on the three edited page/section components.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reports high risk with 8 affected `PricingPage` flows; this is expected for public pricing copy and is mitigated by source-contract tests plus focused landing/proxy tests.
- Remote/payment evidence is not needed for this slice because Stripe/checkout/subscriptions remain intentionally unimplemented.

### UNLINK-001 RPC/Action Contract Evidence

- Supabase migration `supabase/migrations/20260601184343_unlink_estimate_row_items.sql` defines `public.unlink_estimate_row_item_from_library_with_history(...)` for project-specific row detach.
- The RPC resolves workspace access with `public.resolve_estimate_workspace`, locks the estimate and row, enforces `expected_row_revision`, rejects already-unlinked rows, preserves `source_snapshot`, sets `source_library_item_id = null`, sets `link_state = 'detached'`, increments `row_revision`, and inserts a `row_unlinked` history event with `detachedFromSourceLibraryItemId` metadata.
- `src/lib/estimates/actions.ts` exports `detachEstimateRowItemFromLibrary(...)`, passes acting user and mutation correlation id, uses the current row revision by default, returns the canonical history row result, and revalidates the affected estimate node path.
- `src/lib/supabase/types.ts` includes the new RPC Args/Returns surface.
- Focused red/green evidence: `bun run test:dom tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-schema.test.ts` passed 2 files / 31 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1006 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 7 staged changed files, 6 changed functions/classes, 0 affected flows, 2 source-level test gaps, and overall risk score 0.35.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 7 changed files, 1 changed symbol, 0 affected processes, and low risk.
- UI/hook wiring is now implemented for the first visible make-project-specific flow:
  - `buildEstimateTree()` preserves `linkState` as `linkState` so persisted detached rows can render correctly.
  - `useEstimateRowMutations()` exposes `detachRow` with mutation ids, cached row revisions, optimistic `sourceLibraryItemId = null`, `linkState = "detached"`, rollback, and query invalidation.
  - `EstimateSheetContent` renders a `Make project-specific` action for linked rows, confirms the operation, calls `detachEstimateRowItemFromLibrary`, and shows `Project-specific` for detached rows without blanking row values.
- Focused UI/projection evidence: `bun run test:dom tests/vitest/workspace-repository-estimate-tree.test.ts tests/vitest/estimate-sheet-library-insert.test.tsx` passed 2 files / 16 tests.
- Adjacent row-history/patch evidence: `bun run test:dom tests/vitest/estimate-row-tree-patch.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-schema.test.ts` passed 3 files / 36 tests.
- Post-UI wiring `bun run type-check` passed.
- Post-UI wiring `bun run lint` passed with the existing 14 warnings and 0 errors.
- Post-UI wiring `bun run lint:design-system` passed.
- Post-UI wiring `bun run test` passed 4 unit tests / 129 expectations.
- Post-UI wiring `bun run test:dom` passed 127 files / 1008 tests with 2 skips.
- Post-UI wiring `bun run build` passed.
- Post-UI wiring `git diff --check` passed.
- Post-UI wiring code-review-graph `detect_changes` against `HEAD` analyzed 9 changed files, 20 changed functions/classes, 0 affected flows, 15 source-level test gaps, and overall risk score 0.50.
- Post-UI wiring GitNexus `detect-changes --repo archestimator --scope staged` reported 9 changed files, 43 changed symbols, 1 affected process (`GET` export route through `toUiRow`), and medium risk. This is expected from persisted row projection and is mitigated by repository projection tests, export coverage inside full `test:dom`, production build, and focused UI tests.
- Linked Supabase migration apply and direct SQL verification are not done in this slice; backup/PITR proof remains required before applying launch/beta migrations.

### LIB-001 Component Library Polish Evidence

- Design direction: compact estimator catalogue, optimized for scanning trust signals rather than marketing-style cards. Signature differentiator: each card now carries pricing provenance (`Source`, `Checked`, optional `Confidence`) directly under unit cost.
- Next.js version check for UI-design skill gate: installed `next` is `16.2.6`, which is above the patched `16.0.7` threshold for the referenced CVE.
- `ComponentLibraryManager` sheet search now includes `pricingSource`, `pricingDate`, and `confidence`.
- 2026-06-02 local parity refresh: component tree search now also matches component `brand`, `pricingSource`, `pricingDate`, and `confidence`, and shared supplier/brand tree filtering now searches the same component trust fields.
- 2026-06-02 focused UI coverage now asserts both the component tree search and component sheet search find a component by `quote ledger` pricing source and `database brand` brand text while hiding non-matching component rows.
- 2026-06-02 local seed-quality refresh: `supabase/seed.sql` replaces placeholder component-library supplier/pricing trust text with concrete demo supplier labels and dated supplier-canvas pricing sources for the DEMO_PROJECT_PLACEHOLDER seed.
- 2026-06-02 local seed-quality refresh: `tests/vitest/demo-seed-readiness.test.ts` now rejects `Supplier quote required`, `editable allowance`, and `requires-quote-verification` in local seed trust fields.
- Component sheet tabs now show a visible result count such as `3 of 3 components` or `1 of 3 components`.
- Catalogue cards now show compact pricing trust fields without adding dependencies or changing the folder/tree model.
- 2026-06-02 local refresh: `bunx vitest run tests/vitest/component-library-manager-ui.test.tsx --maxWorkers=1` passed 1 file / 16 tests.
- 2026-06-02 local refresh: `bunx vitest run tests/vitest/workshop-route-error-boundaries.test.tsx --maxWorkers=1` passed 1 file / 4 tests.
- 2026-06-02 local refresh: `bun run type-check` passed after the additive search-helper change.
- 2026-06-02 local seed-quality refresh: `bunx vitest run tests/vitest/demo-seed-readiness.test.ts tests/vitest/supabase-seed-migrations.test.ts --maxWorkers=1` passed 2 files / 8 tests.
- Focused red/green evidence: `bun run test:dom tests/vitest/component-library-manager-ui.test.tsx` passed 1 file / 16 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1009 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 4 changed files, 7 changed functions/classes, 0 affected flows, 5 source-level test gaps, and overall risk score 0.55.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 4 changed files, 13 changed symbols, 3 affected `ComponentLibraryManager` flows, and medium risk. This is expected for visible sheet/card/search changes and is mitigated by focused manager UI coverage plus full DOM/build.

### TPL-001 Template Library Polish Evidence

- Design direction: compact template browser, optimized for quickly understanding reusable estimate structure before insertion. Signature differentiator: each template row now previews category, top-level structure, and sample row quantities directly in the sheet.
- `TemplateLibraryManager` sheet tabs now show readable result counts such as `3 of 3 templates` and `1 of 1 template`.
- Template sheet rows now expose a labeled preview region with `Structure`, category, representative group/area labels, `Sample rows`, and compact quantity/unit signals.
- 2026-06-02 local route-state refresh: `/workshop/templates/error.tsx` now uses `WorkshopRouteErrorState` with the route label `Templates`, matching the Library, Project charts, and Estimate workspace route retry boundary.
- 2026-06-02 local route-state refresh: `workshop-route-error-boundaries.test.tsx` now proves Templates route failures render sanitized retry UI and do not expose SQL/token/path/digest details.
- 2026-06-02 local empty-state refresh: `TemplateLibraryManager` now uses shared `EmptyState` for the template sheet workspace-empty/no-match copy and tree no-match copy.
- 2026-06-02 local empty-state refresh: `template-library-manager-ui.test.tsx` now covers empty-template workspace copy, sheet no-match copy, tree no-match copy, and rejects the old `No templates in this folder yet.` placeholder.
- 2026-06-02 local empty-state refresh: `bunx vitest run tests/vitest/template-library-manager-ui.test.tsx --maxWorkers=1` passed 1 file / 3 tests.
- Focused red/green evidence: `bun run test:dom tests/vitest/template-library-manager-ui.test.tsx` first failed on the old `3 / 3` result-count copy, then passed 1 file / 1 test after the preview implementation.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1009 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 4 changed files, 7 changed functions/classes, 0 affected flows, 5 source-level test gaps, and overall risk score 0.40. The reported helper gaps are covered through `template-library-manager-ui.test.tsx` component rendering assertions.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 4 changed files, 11 changed symbols, 0 affected processes, and low risk.

### EXP-001 Professional Workbook Evidence

- Design direction: professional construction bid/BOQ workbook, not a raw estimate dump. Signature differentiator: the export now opens with a `Bid Form` sheet containing the header block, general notes, scope labels, formulas, and section subtotals expected in contractor bid forms.
- Context7 official ExcelJS documentation was checked for current APIs covering formula cells with cached results, merged cells, frozen panes, print titles, page setup, styling, and `writeBuffer()`.
- `createProposalWorkbook()` now emits `Bid Form`, `Summary`, `Commercial Terms`, and `Source Breakdown` sheets.
- `Bid Form` includes project/location/owner/bidder/date header rows, required general notes, the `ITEM / PARTICULARS / UNIT / QTY / MATERIAL / LABOR / COST TOTAL / LINE TOTAL / SCOPE / NOTES` table, frozen header row 17, landscape fit-to-width print setup, and repeated print header row `17:17`.
- Detail rows now use ExcelJS formula objects for `COST TOTAL` and `LINE TOTAL`; line totals are nonblank and include misc/other cost as a formula addend while preserving a visible `Misc / other` note.
- `Summary` uses formula references back to `Bid Form` section subtotal rows and formula-backed direct cost/grand total cells.
- `Commercial Terms` includes exclusions, qualifications, payment terms, validity, warranty, and signature/conforme blocks.
- Focused red/green evidence: `bun run test:dom tests/vitest/proposal-workbook.test.ts` first failed on the old `Proposal Summary` / `Detailed Estimate` / `Area Breakdown` sheets, then passed 1 file / 4 tests after the workbook rewrite.
- Export parity evidence: `bun run test:dom tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-preview.test.tsx tests/vitest/proposal-workbook.test.ts` passed 4 files / 15 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1009 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 4 changed files, 15 changed functions/classes, 0 affected flows, 10 source-level test gaps, and overall risk score 0.40. The reported helper gaps are covered through `proposal-workbook.test.ts` workbook-level ExcelJS assertions.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 4 changed files, 19 changed symbols, 0 affected processes, and low risk.
- Manual cross-app workbook QA in Excel, Numbers/LibreOffice, and Google Sheets is not done in this local slice and remains required before launch.

### BETA-FEEDBACK-001 In-App Feedback Link Evidence

- `WorkshopPageShell` footer now shows a quiet `Send beta feedback` mailto link to `SUPPORT_INBOX_PLACEHOLDER` for authenticated workshop users.
- The link is intentionally lightweight and external-email based, matching the closed-beta plan recommendation to avoid building a custom feedback system before launch.
- Focused red/green evidence: `bun run test:dom tests/vitest/workshop-reset.test.tsx` first failed on the missing `Send beta feedback` link, then passed 1 file / 3 tests after the shell footer update.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1009 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 4 changed files, 3 changed functions/classes, 0 affected flows, 1 source-level test gap, and overall risk score 0.40. The reported shell gap is covered through `workshop-reset.test.tsx` plus full DOM/build.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 4 changed files, 2 changed symbols, 23 affected workshop execution flows, and critical risk. This is expected because `WorkshopPageShell` is shared by all protected workshop routes; the implementation is mitigated by being a footer-only `mailto:` link with focused shell DOM coverage, full DOM, and build evidence.
- External feedback form selection remains open; the current local slice provides the minimum support email path only.

### LEGAL-001 Closed Beta Terms / Privacy Copy Evidence

- `/terms` now presents closed beta terms for invited users instead of only a pending-review placeholder.
- `/terms` explicitly covers invite-only access, no payment or subscription contract, beta defects/data responsibility, construction estimate accuracy, feedback/acceptable use, and support/deletion contact.
- `/privacy` now presents a closed beta privacy notice covering account email, project and estimate data, feedback/support messages, telemetry, providers/processors, beta data handling, and deletion requests.
- Both pages retain a legal-review caveat before external tester invitations or production legal use.
- Focused red/green evidence: `bun run test:dom tests/vitest/auth-entry-ui-contract.test.ts` first failed on the missing closed-beta legal copy, then passed 1 file / 4 tests after the page updates.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1009 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 5 changed files, 4 changed functions/classes, 0 affected flows, 2 source-level test gaps, and overall risk score 0.50. The reported page gaps are covered through `auth-entry-ui-contract.test.ts` plus full DOM/build.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 5 changed files, 2 changed symbols, 16 affected public legal/landing execution flows, and critical risk. This is expected because the route pages participate in landing/auth-state rendering; the implementation is copy-only and covered by source-contract, full DOM, and build evidence.
- Counsel/owner review is still required before treating the pages as final external legal sign-off.

### INFRA-001 Env Manifest / Runbook Evidence

- `.env.example` now documents the closed-beta launch runtime set: app/site origins, allowed app origins, Supabase public/server vars, closed-beta access flag, invite flags, publication secrets, Resend vars, AI-off flags, optional analytics IDs, release smoke toggles, Supabase integration toggle, and `DATABASE_URL`.
- Conservative defaults are preserved locally: `CLOSED_BETA_ACCESS_ENABLED=false`, `PROJECT_INVITE_ENTRY_ENABLED=false`, `ARCHESTIMATOR_AI_ENABLED=false`, and `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false`.
- `22-infrastructure-vercel-supabase-resend-plan.md` now treats `.env.example` as locally complete for manifest coverage while still blocking launch on real Vercel/provider values and proof.
- `40-closed-beta-operations-runbook.md` now includes production env posture: set `CLOSED_BETA_ACCESS_ENABLED=true`, keep AI disabled, keep invite entry disabled until proof, and defer Resend for manual beta invites while requiring it for visible email workflows.
- Teamspaces invite delivery UI now follows the same default-off posture: project invite, estimate-sheet invite, pending resend, and pending invite-link copy controls disable when authenticated invite delivery readiness is false, with manual beta invite copy. This is proven locally by `teamspace-collaboration-header` + `project-collaboration-actions` focused tests and does not replace provider/dashboard invite proof.
- The full goal prompt was persisted to `codex-autopilot-goal.md` in this plan folder for compaction-resilient continuation.
- Focused red/green evidence: `bun run test:dom tests/vitest/closed-beta-env-manifest.test.ts` first failed on missing env/docs entries, then passed 1 file / 3 tests after the manifest/runbook update.
- Adjacent focused evidence: `bun run test:dom tests/vitest/closed-beta-env-manifest.test.ts tests/vitest/auth-magic-link.test.ts tests/vitest/project-invite-feature-flag.test.ts tests/vitest/auth-redirect-sanitizer.test.ts` passed 4 files / 45 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 128 files / 1012 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 7 changed files, 0 changed functions/classes, 0 affected flows, 0 test gaps, and overall risk score 0.00.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for the config/docs/test-only staged set.
- Real Vercel env values, Supabase provider screenshots, Resend DNS/webhook proof, deployment smoke, and rollback proof remain external launch gates.

### OBS-001 Health Endpoint Evidence

- `/api/health` now returns public `200` JSON with `ok: true`, `service: "archestimator"`, an ISO timestamp, and `Cache-Control: no-store`.
- The payload deliberately avoids auth, Supabase, Resend, database, secret, key, token, or environment-specific details so uptime monitors can call it without leaking runtime configuration.
- `27-observability-monitoring-support-plan.md` now names `/api/health` as the uptime monitor target.
- `40-closed-beta-operations-runbook.md` now includes `/api/health` in monitor usage and the first 24-hour checklist.
- Focused red/green evidence: `bun run test:dom tests/vitest/health-route.test.ts` first failed on the missing route, then passed 1 file / 2 tests after implementation and doc alignment.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 131 files / 1021 tests with 2 skips.
- `bun run build` passed and lists `/api/health` as a dynamic app route.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 6 staged changed files, 4 changed functions/classes, 0 affected flows, 1 source-level test gap (`GET`), and overall risk score 0.35. The reported `GET` gap is covered by `health-route.test.ts` importing and invoking the route handler directly.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no changes detected for this new-route/docs/test staged set.
- Production uptime monitor setup and deployed endpoint proof remain external launch gates.

### QA-002 Local Readiness Truth-Sync Evidence

- `09-release-readiness-checklist.md` now reflects the current local command baseline: `test:dom` is pass, while hosted/provider/manual P0 gates remain no-go.
- `19-test-strategy-and-fixtures.md` now distinguishes the historical third-pass red DOM state from the current green local Vitest DOM baseline.
- `33-main-feature-zero-defect-test-matrix.md` now states the local type/lint/unit/DOM/build baseline is green and keeps launch status no-go pending hosted auth/RLS/provider, manual smoke, backup/restore, spreadsheet open, and deployment/rollback evidence.
- `closed-beta-readiness-docs.test.ts` locks the current QA docs against stale `test:dom` failure wording while preserving conservative no-go launch language.
- Focused evidence: `bun run test:dom tests/vitest/closed-beta-readiness-docs.test.ts` passed 1 file / 2 tests.
- Adjacent focused evidence: `bun run test:dom tests/vitest/closed-beta-readiness-docs.test.ts tests/vitest/health-route.test.ts` passed 2 files / 4 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 6 staged changed files, 3 changed functions/classes from the source-contract test, 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for this docs/test-only staged set.

### DATA-001 / BETA-OPS Local Runbook Evidence

- `20-launch-runbook.md` now reflects the current local command baseline and expands migration procedure with pre-migration inventory, backup/PITR status, restore owner, staging proof, and post-migration evidence requirements.
- `30-data-backup-disaster-recovery-plan.md` now includes a pre-migration backup evidence template and dry-run restore checklist.
- `43-closed-beta-readiness-scorecard.md` now reflects local implementation progress for access control, legal copy, feedback, component/template polish, unlink, export, observability, and backup checklist readiness while keeping all external proof gates below launch threshold.
- `closed-beta-readiness-docs.test.ts` now locks the runbook/scorecard against stale DOM failure wording and stale "not implemented" scorecard claims while requiring provider-proof gaps to remain explicit.
- Focused evidence: `bun run test:dom tests/vitest/closed-beta-readiness-docs.test.ts` passed 1 file / 3 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 6 staged changed files, 3 changed functions/classes from the source-contract test, 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for this docs/test-only staged set.
- Supabase backup/PITR proof, restore drill, production deploy rollback, and provider dashboard artifacts remain external launch gates.

### FINAL-GATE Local Truth-Sync Evidence

- `12-final-mvp-launch-gate.md` now reflects the current local command baseline and marks AI, unlink, export, legal, support, observability, and backup as local-pass or checklist-ready where evidence exists, while preserving no-go decisions for external proof gaps.
- `36-final-executive-launch-brief.md` now names the next proof lane: linked Supabase backup/migration/RLS, hosted auth smoke, Vercel deploy/rollback, spreadsheet-open QA, Resend proof if email is visible, and owner/counsel review.
- `10-technical-risk-register.md` now treats DOM, AI, export, unlink, legal, support, and backup risks as locally mitigated where applicable, while keeping them P0 until hosted/manual/provider proof is collected.
- `closed-beta-readiness-docs.test.ts` now locks the final gate, executive brief, and technical risk register against stale pre-implementation claims.
- Focused evidence: `bun run test:dom tests/vitest/closed-beta-readiness-docs.test.ts` passed 1 file / 4 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 6 staged changed files, 4 changed functions/classes from the source-contract test, 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for this docs/test-only staged set.

### DEMO-001 Local Demo Seed Evidence

- `supabase/seed.sql` now seeds five estimate row items for the local `Archestimator Demo Workspace` / `DEMO_PROJECT_PLACEHOLDER` / `DEMO_PROJECT_PLACEHOLDER Baseline Estimate`.
- Seed rows include manual `unlinked` rows, one `linked-clean` tile row tied to the demo library item, and one `detached` project-specific paint row with preserved `source_snapshot`.
- `28-investor-incubator-demo-readiness-plan.md` now names exact local seed anchors, the linked row, the detached row, and a rehearsal checklist that keeps Ask Flip, billing, provider dashboards, and real customer data out of the demo.
- `12-final-mvp-launch-gate.md`, `36-final-executive-launch-brief.md`, and `43-closed-beta-readiness-scorecard.md` now credit demo seed anchors while preserving no-go status until live rehearsal, screenshots, and fresh authorized workbook proof exist.
- Focused evidence: `bun run test:dom tests/vitest/demo-seed-readiness.test.ts` passed 1 file / 3 tests.
- Adjacent docs evidence: `bun run test:dom tests/vitest/demo-seed-readiness.test.ts tests/vitest/closed-beta-readiness-docs.test.ts` passed 2 files / 7 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 8 staged changed files, 4 changed functions/classes from the source-contract tests, 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for this seed/docs/test staged set.
- Live demo account, allowlist entry, hosted auth smoke, screenshots, and validated fresh workbook export remain external/manual gates.

### BASELINE-REFRESH After DEMO-001 Seed Evidence

- Full DOM initially caught a stale seed-source contract in `supabase-seed-migrations.test.ts`: the migration must remain tree-only, but the local development seed now intentionally includes demo row items.
- `supabase-seed-migrations.test.ts` now preserves the tree-only migration assertion while allowing local seed row items and requiring linked/detached demo rows.
- Focused repair evidence: `bun run test:dom tests/vitest/supabase-seed-migrations.test.ts tests/vitest/demo-seed-readiness.test.ts` passed 2 files / 7 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 131 files / 1021 tests with 2 skips.
- `bun run build` passed and lists `/api/health` as a dynamic app route.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 9 staged changed files, 4 changed functions/classes from the source-contract tests, 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for this docs/test staged set.

### CURRENT-HEAD Local Validation Refresh Evidence

- Superseded artifacts: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-head-local-validation-build-bc1c715-2026-06-02.md`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-head-local-validation-build-1a6dcc5-2026-06-02.md`.
- Current artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-head-local-validation-build-353dd48-2026-06-02.md`.
- Current validation anchor: `353dd48` on `main`.
- Command: `bun run validate`.
- Result: pass.
- Covered subcommands: `bun run type-check`; `bun run lint` with the existing 14 warnings; `bun run lint:design-system`; `bun run test` passing 4 unit tests / 129 expectations; `bun run test:dom` passing 151 files / 1119 passed / 2 skipped.
- Working tree caveat: unrelated skill/config churn and untracked `.ai/08_prompts/mvp-launch-goal.md` were present; no launch evidence files were staged before the commands.
- Scope limit: this refresh proves the current local command suite only. Hosted/provider/manual launch gates remain open, and closed beta remains **NO-GO**.

### CURRENT-HEAD Local Build Refresh Evidence

- Superseded artifacts: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-head-local-validation-build-bc1c715-2026-06-02.md`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-head-local-validation-build-1a6dcc5-2026-06-02.md`.
- Current artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-head-local-validation-build-353dd48-2026-06-02.md`.
- Current app build anchor: `353dd48` on `main`, before this docs-only evidence-sync commit.
- Command: `bun run build`.
- Result: pass.
- Build details: Next.js 16.2.6 / Turbopack compiled successfully, finished TypeScript in 8.2s, generated 32 static pages, and listed the app Proxy plus `/api/health`, `/api/ai/ask`, `/api/ai/package-builder`, `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`, `/api/share/[token]` routes, `/api/webhooks/resend`, `/beta/access-required`, `/invite/[token]`, `/login`, `/pricing`, `/share/[token]`, `/terms`, `/workshop/feedback`, `/workshop/settings`, `/workshop/settings/beta-users`, `/workshop/settings/feedback`, and protected `/workshop` routes.
- Scope limit: this is local production-build proof only. Vercel deploy/env/health/rollback proof remains an external launch gate, and closed beta remains **NO-GO**.

### Manual Proof Matrix Evidence

- `46-manual-proof-matrix.md` now defines the exact P0 evidence packet required before external closed beta can move from **NO-GO** to go/no-go review.
- `48-manual-proof-packet-template.md` provides the ready-to-fill `README.md` for the dated `.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/` artifact folder.
- It includes proof rows for Supabase backup/PITR, linked migrations/RLS/storage/RPCs, hosted auth allowlist, first-run workspace, Vercel deploy/env/health/rollback, Resend/email, spreadsheet compatibility, project-specific unlink, component/template demo smoke, legal/owner review, support/monitoring, demo rehearsal, and current manual E2E smoke.
- Current status: the component/template demo row now has local screenshot/JSON smoke evidence plus local template insertion proof, but all hosted/provider rows remain open. Closed beta remains **NO-GO** until all P0 rows are captured under `.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/` and linked back here.

### Goal Completion Audit Evidence

- `47-goal-completion-audit.md` maps every final criterion from `codex-autopilot-goal.md` to current evidence.
- Current result: local-safe implementation, validation, build, and docs are proven; hosted/provider/manual evidence remains missing.
- Completion decision in the audit: **COMPLETE FOR OWNER-ONLY SUBSTANTIAL COMPLETION** after the `46-manual-proof-matrix.md` evidence packet, linked/local owner-session unlink proof, and real downloaded workbook proof were captured and linked.

### Supabase Read-Only Provider Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-read-only-cli-2026-06-02.md`.
- Scope: linked Supabase project `ebxxqidacheyapmmzavr`, read-only CLI commands only.
- Backup command: `supabase backups list --project-ref ebxxqidacheyapmmzavr -o json` passed and returned no listed backups, `pitr_enabled=false`, region `ap-southeast-2`, and `walg_enabled=true`.
- Security advisor command: `supabase db advisors --linked --type security --level warn --fail-on none -o json` passed with WARN findings, including mutable function search paths, public `component-images` bucket listing, anon/authenticated executable `SECURITY DEFINER` functions, and leaked password protection disabled.
- Blocked commands: `supabase migration list --linked` and `supabase db advisors --linked --type performance --level warn --fail-on none -o json` failed after retries on the linked temp-role pooler circuit breaker / `SUPABASE_DB_PASSWORD` path.
- Launch meaning: this is negative/blocked provider evidence. Supabase backup/PITR, migration history, RLS/storage/RPC allow/deny, and security-advisor triage remain **NO-GO** rows.

### Supabase Linked Schema Parity Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-linked-schema-parity-2026-06-02.md`.
- Command path: `supabase db query --linked -o json` through the Supabase Management API SQL route.
- Result: pass for read-only parity queries.
- Migration parity: linked history contains `20260522091621`, `20260531164227`, `20260601003000`, and `20260601033000`; linked history is missing `20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items`.
- Object parity: `closed_beta_allowed_emails`, `check_closed_beta_access(text)`, and `unlink_estimate_row_item_from_library_with_history(...)` are absent on linked Supabase.
- Positive object evidence: template insertion RPCs and node history RPCs are present; the history RPCs have `anon` execute false and `authenticated` execute true.
- Storage/security evidence: `component-images` bucket is public with `image/webp` MIME restriction and 12 MiB size limit; this matches the security-advisor warning and remains a launch security triage item.
- Launch meaning: this narrows the linked Supabase blocker. Closed-beta allowlist and project-specific unlink cannot pass hosted/linked proof until the missing migrations are applied/repaired after backup/PITR/restore evidence.

### Vercel Read-Only Provider Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-read-only-cli-2026-06-02.md`.
- Scope: linked Vercel project `VERCEL_SCOPE_PLACEHOLDER/archestimator`, CLI/provider reads plus health requests only.
- Project/link proof: `.vercel/project.json` points to `archestimator`; `vercel whoami` authenticated as `OWNER_HANDLE_PLACEHOLDER`; `vercel project inspect archestimator --non-interactive` found a Next.js project with root `.` and Node.js `24.x`.
- Deployment proof: latest preview for commit `2e5b38d` reached `READY`; previous `db9b224` preview was also `READY`.
- Env proof: `vercel env ls --non-interactive` returned `No Environment Variables found for VERCEL_SCOPE_PLACEHOLDER/archestimator`.
- Health proof: plain curl to the branch alias and ready preview returned Vercel `401 Authentication Required`; authenticated `vercel curl` returned `{"ok":true,"service":"archestimator"}` on the latest preview and branch alias.
- Protection proof: Vercel reports SSO protection for `all_except_custom_domains`, Git fork protection enabled, and one env-var-backed automation bypass entry remaining after cleanup of the non-env bypass entry generated during this run.
- Launch meaning: this is partial/blocked Vercel evidence. Preview deploy and protected health route are proven, but env, production/custom-domain behavior, public monitoring path, hosted auth smoke, and rollback proof remain **NO-GO** rows.

### Vercel Protection Read-Only Refresh

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-protection-read-only-2026-06-02.md`.
- Command: `vercel project protection archestimator --format json --non-interactive`.
- Result: SSO protection remains `all_except_custom_domains`, Git fork protection is enabled, and one env-var-backed `automation-bypass` entry remains. Raw provider entry/user ids are redacted from the artifact.
- Launch meaning: owner review is still required to decide whether the remaining automation bypass is intentional and approved. This does not satisfy Vercel env, public uptime, production/custom-domain health, hosted auth, or rollback proof.

### Provider State Refresh Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/provider-state-refresh-2026-06-02.md`.
- Vercel refresh: `vercel env ls --non-interactive` still returned `No Environment Variables found`; latest preview `https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER` is `Ready`; `vercel inspect` reported deployment id `DEPLOYMENT_ID_PLACEHOLDER`; `vercel curl` to `/api/health` returned `{"ok":true,"service":"archestimator"}`; plain curl returned HTTP `401`.
- Supabase refresh: linked project remains `Archestimator` / `ebxxqidacheyapmmzavr`; this earlier refresh showed `20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items` as local-only. The later Supabase linked readiness refresh below supersedes this with a broader five-migration absence check.
- Local env refresh: current shell printed no matching `RESEND_`, closed-beta, AI, dev-auth, or Supabase env variables.
- Launch meaning: this refresh confirms the previous provider blockers are still current. Hosted auth, env-backed Supabase/Resend behavior, production/custom-domain health, rollback, backup/PITR, linked allowlist, and linked unlink proof remain **NO-GO** rows.

### Provider Ops Mutation Pass at 2cddb0e

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/provider-ops-mutation-pass-2cddb0e-2026-06-03.md`.
- Vercel env result: Production and Preview(`main`) now have the required core closed-beta runtime env names plus invite token env names. Latest sanitized helper artifact `vercel-env-readiness-2cddb0e-2026-06-03.json` reports `coreClosedBetaRuntime.ready=true`, `inviteDelivery.ready=true`, and `vercelEnvReady=true`. Email delivery remains incomplete because `RESEND_WEBHOOK_SECRET` is not set.
- Supabase Auth result: hosted Site URL and HTTPS redirect allowlist were repaired for `www`, apex, and the `git-main` Vercel branch alias. Google provider is enabled in Supabase, hosted denied/revoked Google OAuth smoke is now proven by `hosted-google-denied-revoked-browser-smoke-2026-06-04T1851Z.json`, and synthetic stale-cookie expired-session fail-closed proof is now proven by `hosted-expired-stale-cookie-smoke-2026-06-04T1920Z.json`; Google Cloud consent/callback proof remains open.
- Supabase backup/migration result: `supabase-backup-readiness-2cddb0e-2026-06-03.json` still reports zero listed backups, `pitrEnabled=false`, and no restore drill. `supabase db push --linked --dry-run` still refuses due remote migration versions missing locally, so no linked migrations were applied.
- Resend/DNS result: Resend domain `contact.archestimator.com` is pending; DKIM, `send.contact` SPF, and apex DMARC TXT records were confirmed. `resend-readiness-2cddb0e-2026-06-03.json` still reports `resendReady=false` because local runtime and Vercel are missing `RESEND_WEBHOOK_SECRET`; `support-email-dns-readiness-refresh-2cddb0e-2026-06-03.json` still reports `dnsReady=false` because the support DNS helper requires apex SPF.
- Custom-domain/deploy result: no production alias switch was performed. `archestimator.com` / `www.archestimator.com` remain **NO-GO** for beta-app promotion until backup/PITR, migration repair/apply, hosted auth, and rollback proof are complete.
- Launch meaning: this is a partial provider-ops improvement, not launch approval. External closed beta remains **NO-GO**.

### Supabase Linked Readiness Refresh Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-linked-readiness-refresh-2026-06-02.md`.
- Linked project proof: Supabase CLI `2.98.2` is linked to `Archestimator` / `ebxxqidacheyapmmzavr`.
- CLI-read blocker: `supabase migration list --linked` and `supabase db advisors --linked --type performance --output json` failed with temp-role pooler `ECIRCUITBREAKER` and `SUPABASE_DB_PASSWORD` guidance.
- Targeted SQL parity proof: linked read-only SQL returned `false` for migrations `20260601182522`, `20260601184343`, `20260602005649`, `20260602083000`, and `20260602084500`; `false` for `closed_beta_allowed_emails`, `beta_feedback_submissions`, `check_closed_beta_access`, and `unlink_estimate_row_item_from_library_with_history`; and `true` for `component-images` public bucket status.
- Current security advisor summary: 36 `anon_security_definer_function_executable`, 62 `authenticated_security_definer_function_executable`, 3 `function_search_path_mutable`, 1 `public_bucket_allows_listing`, and 1 `auth_leaked_password_protection` WARN findings.
- Launch meaning: linked Supabase remains **NO-GO**. Do not run hosted allowlist, feedback, or project-specific unlink pass candidates until backup/PITR proof exists and linked migrations/RPCs/tables are applied and directly verified.

### Linked Supabase Readiness SQL Helper

- SQL helper: `scripts/sql/linked-supabase-launch-readiness.sql`.
- Package command: `bun run launch:supabase-readiness`.
- Scope: read-only linked query for the five launch migrations, `closed_beta_allowed_emails`, `beta_feedback_submissions`, `check_closed_beta_access`, `unlink_estimate_row_item_from_library_with_history`, anon table/function exposure, table RLS posture, and `component-images` bucket public/private posture.
- Guardrail evidence: `bunx vitest run tests/vitest/linked-supabase-readiness-sql.test.ts --maxWorkers=1` passed 3 tests proving the SQL has no mutating statements and includes the launch-critical migration/object/storage checks.
- Launch meaning: this makes linked Supabase proof collection repeatable after backup/PITR evidence exists. It does not apply migrations, repair history, change grants, change storage, or close the linked Supabase **NO-GO** row by itself.

### Vercel Current-Head Read-Only Evidence

- Superseded artifacts: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-current-head-read-only-165e4a3-2026-06-02.md` and `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-current-head-read-only-567f3c5-2026-06-02.md`.
- Current artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-current-head-read-only-638f681-2026-06-02.md`.
- Runtime-proof policy: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/runtime-proof-anchor-policy-2026-06-02.md` records that later docs/evidence-only commits do not invalidate this app-runtime proof unless app/runtime inputs change.
- Latest app-runtime preview: `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`, commit `638f6813017fd3460c35fcf5917b3049ff7403cf`, deployment id `DEPLOYMENT_ID_PLACEHOLDER`, target `preview`, status `Ready`.
- Current branch alias: `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` maps to the current deployment and `vercel curl` returns `{"ok":true,"service":"archestimator"}` for `/api/health`.
- Env proof: `vercel env ls --non-interactive` still returned `No Environment Variables found for VERCEL_SCOPE_PLACEHOLDER/archestimator`.
- Public preview proof: plain `curl -I` to the preview and `git-main` health routes still returns HTTP `401` due to Vercel authentication.
- Custom-domain proof: `vercel alias ls --non-interactive` still maps `archestimator.com`, `www.archestimator.com`, and `archestimator.vercel.app` to older production deployment `DEPLOYMENT_ID_PLACEHOLDER`; `/api/health` on those domains returns `404`.
- Scope limit: this improves current-preview proof only. Hosted env/auth, production/custom-domain app health, rollback rehearsal, linked Supabase launch migrations, and hosted manual E2E remain **NO-GO**.

### Vercel Custom Domain Readiness Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-custom-domain-readiness-blocked-2026-06-02.md`.
- Domain proof: `vercel domains ls --non-interactive` found `archestimator.com`; DNS returns apex `A` `216.198.79.1` and `www` CNAME `bb7ab57cfa50fcad.vercel-dns-017.com`.
- Alias proof: `vercel alias ls --non-interactive` maps `archestimator.com`, `www.archestimator.com`, and `archestimator.vercel.app` to `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- Production deployment proof: `vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive` reported production deployment id `DEPLOYMENT_ID_PLACEHOLDER`, status `Ready`, created `Sat May 30 2026 21:09:26 GMT+0800`.
- Public route proof: `https://archestimator.com/api/health` redirects to `www`; `https://www.archestimator.com/api/health` and `https://archestimator.vercel.app/api/health` return HTTP `404`; `https://www.archestimator.com/` returns HTTP `200` with metadata `Archestimator — Coming Soon`.
- Launch meaning: custom domains are attached and resolving, but they serve the older coming-soon production deployment, not the current closed-beta app deployment with `/api/health`. Production/custom-domain health remains **NO-GO**.

### Resend Email Readiness Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-email-readiness-blocked-2026-06-02.md`.
- Repeatable readiness artifacts: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-b0e04f4-2026-06-02.json`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-eb0aef5-2026-06-02.json`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-ce7a4e5-2026-06-02.json`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-8b0929f-2026-06-02.json`, and `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-cdb9fdc-2026-06-02.json`.
- Script: `scripts/check-resend-readiness.ts`.
- Package command: `bun run launch:check-resend-readiness`.
- Vercel env proof: `vercel env ls --non-interactive` returned `No Environment Variables found`.
- Local key-presence proof: `.env.local` has `RESEND_API_KEY`, but `RESEND_FROM`, `RESEND_REPLY_TO`, and `RESEND_WEBHOOK_SECRET` are missing or empty. Values were not printed.
- Current helper refreshes: `VERCEL_ENV_LIST_TEXT="$(vercel env ls --non-interactive 2>&1)" OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-b0e04f4-2026-06-02.json bun run launch:check-resend-readiness`, later `VERCEL_ENV_LIST_TEXT="$(vercel env ls --non-interactive 2>&1)" OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-eb0aef5-2026-06-02.json bun run launch:check-resend-readiness`, later `VERCEL_ENV_LIST_TEXT="$(vercel env ls --non-interactive 2>&1)" OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-ce7a4e5-2026-06-02.json bun run launch:check-resend-readiness`, later `VERCEL_ENV_LIST_TEXT="$(vercel env ls --non-interactive 2>&1)" OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-8b0929f-2026-06-02.json bun run launch:check-resend-readiness`, and latest `VERCEL_ENV_LIST_FILE=/tmp/arch-provider-refresh-cdb9fdc/vercel-env-list.txt OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-cdb9fdc-2026-06-02.json bun run launch:check-resend-readiness` wrote sanitized JSON and exited `1`; the latest refresh reports local runtime `present: ["RESEND_API_KEY"]`, local missing `RESEND_FROM`, `RESEND_REPLY_TO`, and `RESEND_WEBHOOK_SECRET`, zero Vercel Resend env names discovered with `checked: true`, and `resendReady: false`.
- Source proof: `src/lib/email/resend-client.ts` uses `RESEND_API_KEY` outside tests and now fails closed with `EMAIL_NOT_CONFIGURED` when the key or sender is missing; mock success is restricted to tests. `src/app/api/webhooks/resend/route.ts` returns `503` when `RESEND_WEBHOOK_SECRET` is absent.
- Visible email-flow proof: shared-link recipient controls now disable recipient entry/send/resend while server email delivery readiness is false; shared-link digest and collaboration notification paths still call `sendEmail()` server-side.
- Existing local test proof: `tests/vitest/resend-webhook-delivery.test.ts` guards raw-body webhook verification, recipient tags, delivery columns, and event-to-recipient status mapping.
- Guardrail evidence: `bunx vitest run tests/vitest/resend-readiness-script.test.ts tests/vitest/resend-readiness-docs.test.ts --maxWorkers=1` passed 2 files / 9 tests covering dotenv presence parsing, Vercel env-name extraction, fail-closed readiness, local secret redaction, and existing Resend launch-doc constraints.
- Launch meaning: this is negative/blocked email-provider evidence. Manual beta invites may remain outside Resend with recipient email controls disabled, but in-app email workflows cannot be treated as launch-ready or re-enabled until Vercel env, verified sender/domain/DNS, webhook secret, and real delivery/webhook event proof exist. The helper checks env-name/value presence only and does not prove sender/domain verification, DNS, webhook registration, delivery, bounce, complaint, or open events.

### First-Run Workshop Local Surface Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/first-run-workshop-local-surface-2026-06-02.md`.
- Scope: local source and DOM proof only.
- Source proof: `tests/vitest/auth-onboarding-guard.test.ts` covers default workspace reuse/creation before fallback workspace creation for authenticated users.
- DOM proof: `tests/vitest/workshop-reset.test.tsx` covers an empty `WorkshopHomebaseClient` with no projects, no estimates, no pending invites, and no favorites while preserving `/workshop/projects`, `/workshop/library`, and `/workshop/templates` links plus empty favorite states.
- Command: `bun run test:dom tests/vitest/auth-onboarding-guard.test.ts tests/vitest/workshop-reset.test.tsx tests/vitest/closed-beta-readiness-docs.test.ts`.
- Result: pass, 3 files / 20 tests in 2.97s.
- Launch meaning: this is not hosted first-run proof. Hosted Google auth, allowlist, Vercel env, production cookies, session expiry/logout, and real fresh beta account evidence remain required.

### Current Local E2E Smoke Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-local-e2e-smoke-2026-06-02.md`.
- Artifact folder: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-local-e2e-smoke-2026-06-02/`.
- Signed-out auth command: `PLAYWRIGHT_PORT=3039 bun run test:e2e -- e2e/auth.spec.ts --project=chromium`.
- Signed-out auth result: pass, 2 tests in 5.0s.
- Local dev-auth command: `PLAYWRIGHT_PORT=3041 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_E2E_LIBRARY_DEMO_SMOKE=1 ARCHESTIMATOR_E2E_TEMPLATE_INSERT_SMOKE=1 ... bun run test:e2e -- e2e/workshop-library-demo-smoke.spec.ts e2e/workshop-template-insert-smoke.spec.ts --project=chromium`.
- Local dev-auth result: pass, 3 tests in 38.9s.
- Covered: signed-out protected-route redirect/login UI, component library search/trust fields, template preview, and template insertion into a throwaway linked Supabase estimate with 5 nodes / 8 rows / 1 `template_inserted` event and cleanup verification.
- Launch meaning: partial/local only. Hosted Google OAuth, allowlist allowed/denied/revoked, hosted first-run, project-specific unlink/export, spreadsheet-app open/print, logout/session expiry, and target hosted E2E remain required.

### Demo Rehearsal Fallback Pack

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/demo-rehearsal-fallback-pack-2026-06-02.md`.
- Scope: local fallback packet assembled from existing seed anchors, screenshots, template insertion proof, and sanitized workbook readback evidence.
- Assets referenced: `proposal-workbook-exceljs-summary-sanitized-2026-06-02.json`, `component-library-demo-smoke-2026-06-02.png`, `template-library-demo-smoke-2026-06-02.png`, and `template-insert-local-smoke-2026-06-02.png`.
- Script coverage: fallback narrative, component trust fields, template preview, template insertion proof, workbook readback, project-specific safety caveat, and closed-beta posture.
- Launch meaning: this improves the investor/incubator fallback packet, but it is not a live hosted rehearsal. Hosted reviewer account, allowlist proof, target-environment screenshots, spreadsheet-app open/print proof, and owner demo sign-off remain required.

### Spreadsheet Artifact Local Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/spreadsheet-artifact-local-2026-06-02.md`.
- Raw workbook artifact: withdrawn from git on 2026-06-04 because committed proposal workbooks can contain client-identifying estimate data.
- ExcelJS summary: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/proposal-workbook-exceljs-summary-sanitized-2026-06-02.json`.
- Quick Look preview artifact: historical note only at `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/spreadsheet-quicklook-preview-2026-06-02.md`; raw preview PNG withdrawn from git on 2026-06-04.
- App availability refresh: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/spreadsheet-app-availability-refresh-2026-06-02.md`.
- Large-fixture benchmark: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/proposal-workbook-large-fixture-benchmark-2026-06-02.md` plus `proposal-workbook-large-fixture-benchmark-2026-06-02.json`.
- Benchmark regression coverage: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/proposal-workbook-benchmark-regression-coverage-2026-06-02.md`.
- Local route-handler workbook proof: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/proposal-export-route-workbook-local-2026-06-02.md`.
- SHA-256: `1b7625fedbcc1855ace1e07add53aa4d90c2a9dd9ff3a1347f11cb0018ab7b48`.
- Generation path: `buildProposalExportModel()` plus `createProposalWorkbookBuffer()` using a local demo payload.
- Integrity checks: `file` reported `Microsoft Excel 2007+`; `unzip -t` found no compressed-data errors; ExcelJS loaded `Bid Form`, `Summary`, `Commercial Terms`, and `Source Breakdown`.
- Formula/blank-total checks: ExcelJS readback found `blankLineTotalRows: []` and summary grand total formula `B27+B28+B29`; exact cached totals were removed from the retained sanitized summary.
- Focused export tests: `bun run test:dom tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-preview.test.tsx` passed 4 files / 15 tests.
- Local route-handler proof: `bunx vitest run tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-workbook.test.ts --maxWorkers=1` passed 3 files / 9 tests; the new route test mocks only the repository and verifies the actual route returns loadable XLSX bytes with formulas and all four workbook sheets.
- Large-fixture benchmark result: synthetic 500 / 1,000 / 2,500 row proposal models generated buffers in 148.12ms / 165.56ms / 362.06ms, with the 2,500-row buffer at 402,284 bytes (0.38 MiB), local RSS at 270.56 MiB, and local heap used at 76.65 MiB.
- Benchmark regression coverage: `bunx vitest run tests/vitest/proposal-workbook-benchmark.test.ts tests/vitest/proposal-workbook.test.ts --maxWorkers=1` passed 2 files / 8 tests, covering row-count parsing, deterministic BOQ fixture rows, model summary/source/totals consistency, and a tiny real workbook-builder benchmark run.
- App availability blocker: no `libreoffice`, `soffice`, Microsoft Excel, Apple Numbers, or LibreOffice was found locally. `Google Sheets.app` is installed, but it is a Google Drive shortcut app (`com.google.drivefs.shortcuts.sheets`), not a native local spreadsheet engine; using it for proof would likely require sign-in and/or workbook upload/transmission to Google, which needs owner-approved manual QA.
- Quick Look result: `qlmanage -t -s 1200` produced a 1200 x 892 PNG thumbnail showing the bid form header, notes, line-item table, section rows, and subtotal bands.
- Launch meaning: this is partial local artifact, preview, route-handler, and synthetic performance proof. Spreadsheet compatibility and demo fallback rows improve, but Vercel export-route timing plus Excel secondary-app open/recalc/print screenshots remain **NO-GO** proof gaps.

### Route-Transition Benchmark Readiness Helper

- Script: `scripts/check-route-transition-readiness.ts`.
- Package command: `bun run perf:check-routes`.
- Scope: parses a JSON artifact produced by `scripts/measure-route-transitions.ts` / `bun run perf:measure-routes` and fails closed when benchmark scenario results are missing, successful run count is below threshold, failures are present, medians exceed route-transition budgets, or overlay visibility exceeds the configured maximum.
- Default thresholds: public median `15000ms`, Slow 3G public median `30000ms`, authenticated workshop median `10000ms`, minimum successful runs `3`, overlay visibility max `1`.
- Guardrail evidence: `bunx vitest run tests/vitest/route-transition-readiness-script.test.ts tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1` passed 2 files / 8 tests.
- Type evidence: `bun run type-check` passed after adding the checker.
- Launch meaning: this makes route-transition benchmark artifacts objectively checkable in repo-local or future hosted runs. It does not create hosted/manual browser proof, does not prove production navigation, and does not change the route-transition **NO-GO** proof gap by itself.

### Component/Template Demo Local Smoke Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/library-demo-smoke-local-2026-06-02.md`.
- Component screenshot/JSON: `component-library-demo-smoke-2026-06-02.png` and `component-library-demo-smoke-2026-06-02.json`.
- Template screenshot/JSON: `template-library-demo-smoke-2026-06-02.png` and `template-library-demo-smoke-2026-06-02.json`.
- Command: `ARCHESTIMATOR_E2E_LIBRARY_DEMO_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_LIBRARY_DEMO_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof PLAYWRIGHT_PORT=3038 bun run test:e2e e2e/workshop-library-demo-smoke.spec.ts --project=chromium`.
- Result: pass, 2 Playwright tests in 17.6s.
- Component coverage: `/workshop/library` rendered the Library page, Component library workspace, component sheet, component search, component tree search, component result count, component cards, and visible `Source` / `Checked` pricing trust fields.
- Template coverage: `/workshop/templates` rendered the Templates page, Template library workspace, template sheet, template search, template tree search, visible `All Templates` count text, `Structure`, and `Sample rows` preview content.
- Scope limit: this is local dev-auth proof on `127.0.0.1:3038`; it does not prove hosted auth, production Vercel, RLS allow/deny, or project-specific unlink. Closed beta remains **NO-GO**.

### Template Insert Local Smoke Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/template-insert-local-smoke-2026-06-02.md`.
- Screenshot/JSON: `template-insert-local-smoke-2026-06-02.png` and `template-insert-local-smoke-2026-06-02.json`.
- Command: `ARCHESTIMATOR_E2E_TEMPLATE_INSERT_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_TEMPLATE_INSERT_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof PLAYWRIGHT_PORT=3039 bun run test:e2e e2e/workshop-template-insert-smoke.spec.ts --project=chromium`.
- Result: pass, 1 Playwright test in 46.1s.
- Covered behavior: created a throwaway user-owned estimate under DEMO_PROJECT_PLACEHOLDER, opened the protected estimate workspace through local dev auth, selected the right-sidebar `Templates` tab, inserted `Condo Fit-Out Starter` into `Second Floor`, verified linked Supabase counts changed from 51 nodes / 0 rows to 56 nodes / 8 rows, verified one `template_inserted` event for the target group, then deleted the throwaway estimate.
- Cleanup proof: post-run residue check found no `E2E Template Insert%` estimates.
- Scope limit: this is local dev-auth plus linked-Supabase fixture proof. It does not prove hosted auth, production Vercel, RLS allow/deny, provider dashboards, or project-specific unlink. Closed beta remains **NO-GO**.

### Support/Feedback Local Surface Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-feedback-local-surface-2026-06-02.md`.
- Public contact route: `/contact` source renders `Direct Support`, `SUPPORT_INBOX_PLACEHOLDER`, and privacy copy for quote workflow support and access inquiries.
- Workshop feedback path: `WorkshopPageShell` renders `Send beta feedback`.
- Legal/deletion copy: `/terms` and `/privacy` both point support, access, beta feedback, and data deletion requests to `SUPPORT_INBOX_PLACEHOLDER`.
- Test coverage: `tests/vitest/support-contact-readiness.test.ts` guards those source contracts, and `tests/vitest/workshop-reset.test.tsx` already renders the workshop feedback link.
- Launch meaning: this proves a local visible support/feedback surface, not monitored inbox/table review, uptime/error alerts, or incident ownership. Support/monitoring remains a **NO-GO** row until manual/provider proof exists.

### Beta Feedback In-App Local Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/beta-feedback-in-app-local-2026-06-02.md`.
- Local schema/action/UI: `20260602083000_beta_feedback_submissions.sql` adds an insert-only authenticated feedback table, `/workshop/feedback` renders a protected feedback form, and `submitBetaFeedback()` persists validated type/severity/message/page/project context when the table exists.
- Fallback behavior: persistence failure does not fake success; the feedback page shows an email fallback to `SUPPORT_INBOX_PLACEHOLDER`.
- Focused evidence: `bunx vitest run tests/vitest/beta-feedback.test.ts tests/vitest/support-contact-readiness.test.ts tests/vitest/workshop-reset.test.tsx --maxWorkers=1` passed 3 files / 12 tests.
- Launch meaning: this proves local in-app feedback code and RLS intent only. Linked Supabase migration apply, hosted browser smoke, monitored review workflow, alert ownership, and incident escalation remain **NO-GO** evidence gaps.

### Beta Feedback Review Queue Local Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/beta-feedback-review-queue-local-2026-06-02.md`.
- Local schema/action/UI: `20260602084500_beta_feedback_review_queue.sql` opens platform-admin-only review of `beta_feedback_submissions` through `public.is_platform_admin()`, grants only `status` updates, and `/workshop/settings/feedback` renders the review/filter/status-update queue for platform admins.
- Status contract: review statuses are `new`, `reviewing`, `resolved`, and `archived`; non-admin users receive an unauthorized state instead of feedback rows.
- Focused evidence: `bunx vitest run tests/vitest/beta-feedback.test.ts --maxWorkers=1` passed 1 file / 6 tests; `bun run type-check` passed.
- Launch meaning: this adds a local app-owned review queue, but does not prove linked Supabase migration apply, hosted admin access, daily review cadence, monitored inbox/table ownership, alert ownership, or incident escalation. Support/monitoring remains a **NO-GO** row.

### Settings Hub Local Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/settings-hub-local-2026-06-02.md`.
- Local source proof: `/workshop/settings` is now a protected hub instead of an immediate profile redirect.
- Covered links: Profile, Workspace, Beta support/legal/data request paths, Beta users, and Beta feedback cards are discoverable from one Settings entry.
- 2026-06-02 local refresh: non-admin beta users now see Settings cards for `/workshop/feedback`, `/terms`, and `SUPPORT_INBOX_PLACEHOLDER` data request copy without needing platform-admin access.
- Focused evidence: `bunx vitest run tests/vitest/auth-settings-ui-contract.test.ts tests/vitest/beta-feedback.test.ts --maxWorkers=1` passed 2 files / 12 tests.
- Role boundary: platform-operation cards render only for `ceo` or `admin` roles.
- Launch meaning: this improves local support/legal discoverability only. Hosted platform-admin smoke, linked beta migrations, monitored feedback operations, inbox ownership, legal sign-off, and owner launch sign-off remain open.

### Support Email DNS Readiness Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-2026-06-02.md`.
- Helper refresh artifacts: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-refresh-792076e-2026-06-02.json`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-refresh-ec31121-2026-06-02.json`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-refresh-04e3b28-2026-06-02.json`, `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-refresh-c72f9fb-2026-06-02.json`, and `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-refresh-9a2f8ca-2026-06-02.json`.
- DNS proof: `dig +noall +answer MX archestimator.com` returned five `eforward*.registrar-servers.com` MX records.
- SPF proof: `dig +noall +answer TXT archestimator.com` returned `v=spf1 include:spf.efwd.registrar-servers.com ~all`.
- DMARC proof: `dig +noall +answer TXT _dmarc.archestimator.com` returned no answer; all repeatable helper refreshes also report `hasDmarc: false` and `dnsReady: false`. The latest `9a2f8ca` refresh still found five `eforward*.registrar-servers.com` MX hosts, SPF `v=spf1 include:spf.efwd.registrar-servers.com ~all`, A record `216.198.79.1`, and no DMARC record.
- Launch meaning: this proves DNS mail-routing evidence for the support domain, not inbox monitoring, form delivery, alert ownership, or incident escalation. Support/monitoring remains a **NO-GO** row.

### Beta Operations Runbook Readiness Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/beta-ops-runbook-readiness-2026-06-02.md`.
- Operator-doc proof: `40-closed-beta-operations-runbook.md` covers add beta user, revoke beta user, manual invite, access verification, feedback collection/review, bug triage, pause beta, rollback, production auth issues, email delivery issues, export failures, first 24-hour checks, first 72-hour checks, and weekly beta review.
- Beta-program proof: `29-beta-program-readiness-plan.md` defines target profiles, onboarding email requirements, invite flow, access control, support SLA, known limitations, success metrics, cohort rollout, backup before beta, weekly loop, feature-request triage, data-loss response, and beta data sunset/migration.
- Launch meaning: beta operations are no longer only conceptual, but this is documentation-only proof. Linked migrations, hosted admin/auth smoke, monitored inbox/table ownership, alert ownership, rollback rehearsal, legal sign-off, and live beta operation proof remain **NO-GO**.

### Project-Specific Unlink Linked Smoke Attempt

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/project-specific-unlink-linked-smoke-blocked-2026-06-02.md`.
- Command: `ARCHESTIMATOR_E2E_UNLINK_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_UNLINK_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof PLAYWRIGHT_PORT=3040 bun run test:e2e e2e/workshop-project-specific-unlink-smoke.spec.ts --project=chromium`.
- Result: blocked/fail at the linked detach step.
- Blocking error: linked Supabase returned `PGRST202` because `public.unlink_estimate_row_item_from_library_with_history(acting_user_id, correlation_id, expected_row_revision, reason, target_estimate_id, target_project_id, target_row_id)` is absent from the schema cache.
- Observed state: the throwaway row remained `linked-clean`, `row_revision=1`, and `source_library_item_id='UUID_PLACEHOLDER'`.
- Cleanup proof: post-run residue check found no `E2E Project Specific%` estimates.
- Scope limit: this is negative linked-provider evidence. The local unlink implementation remains code/test covered, but linked/manual unlink proof cannot pass until backup/PITR and linked migration/RPC proof are resolved. Closed beta remains **NO-GO**.

### Closed Beta Audit Evidence

- Auth/proxy: `src/proxy.ts`, `src/lib/auth/actions.ts`, `src/app/auth/callback/route.ts`, `src/lib/auth/account-setup.ts`, `src/lib/auth/session.ts`.
- Workspace first-run: `src/lib/repositories/workspace-repository.ts`.
- Pricing/payment: `src/app/pricing/page.tsx`, landing CTA/FAQ components, `package.json` dependency audit showing no Stripe dependency.
- Resend/email: `src/lib/email/resend-client.ts`, `src/lib/email/resend-webhooks.ts`, `src/app/api/webhooks/resend/route.ts`.
- Feedback/contact: `src/app/contact/page.tsx`, `src/components/landing/ContactForm.tsx`.
- Tests: auth proxy/callback/magic-link tests, Resend webhook tests, share/e2e flag docs.
- Graph: code-review-graph and GitNexus were used first; fallback static analysis was used where graph text search did not surface all closed-beta concepts.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`
Audit date: 2026-06-02
Scope: launch planning and readiness audit only.

### Beta Allowlist Admin Local Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/beta-allowlist-admin-local-2026-06-02.md`.
- Local schema/action/UI: `20260602005649_beta_allowlist_admin_queue.sql` opens platform-admin-only access to `closed_beta_allowed_emails` through `public.is_platform_admin()`, grants select plus insert/update on the narrow allowlist columns needed for beta operations, and `/workshop/settings/beta-users` renders add/filter/status/notes controls for platform admins.
- Status contract: allowlist statuses remain `invited`, `active`, and `revoked`; non-admin users receive an unauthorized state instead of allowlist rows, and the app does not grant delete access.
- Focused evidence: `bunx vitest run tests/vitest/closed-beta-allowlist-admin.test.ts --maxWorkers=1` passed 1 file / 4 tests; `bun run type-check` passed.
- Launch meaning: this removes the local need for direct Supabase Studio allowlist edits, but it does not prove linked Supabase migration apply, hosted platform-admin access, hosted Google auth allow/deny/revoke behavior, backup/PITR, or rollback readiness. Closed beta remains **NO-GO**.

## Command Outputs

| Command | Exact result summary | Launch meaning |
| --- | --- | --- |
| `git status --short` | Clean before edits. | Baseline had no unstaged product edits. |
| `git rev-parse HEAD` | `681c95e64864f283950a88dba304eaffe8f2f8b3`. | Current evidence anchor. |
| `bun install --frozen-lockfile` | Pass; Bun 1.3.10 checked 703 installs across 775 packages. | Dependency graph installable. |
| `bun run type-check` | Pass; `tsc --noEmit`. | No current TS errors. |
| `bun run lint` | Pass with warnings; 0 errors. | Not a lint blocker; warnings should be triaged before launch. |
| `bun run lint:design-system` | Pass. | Design-system static gate green. |
| `bun run test` | Pass; 4 tests, 129 expectations. | Bun unit smoke green. |
| `bun run test:dom` | Pass; 131 files / 1021 tests / 2 skipped after seed-contract repair. | DOM baseline blocker closed locally for this slice. |
| `bun run build` | Pass; Next.js 16.2.6 Turbopack production build. | Buildable locally. |
| `PLAYWRIGHT_PORT=3020 bun run test:e2e -- --project=chromium` | Pass; 9 Playwright tests passed and 24 env-gated/live-provider specs skipped in 1.2m. | Retires the stale local port-conflict blocker, but this is not hosted/manual E2E proof. |
| Export-focused subagent tests | Pass; read-only export lane reported 4 files / 15 tests passed. | Supports current export inventory, but does not prove launch-grade workbook. |

## `test:dom` Failure Repairs

| File | Failure | Required action |
| --- | --- | --- |
| `tests/vitest/ai-package-builder-security-contract.test.ts` | Source-string expectations looked for auth/security text in the route file, but route delegates to handler. | Repaired: assertions now cover the route AI-disabled gate and handler security contract separately. |
| `tests/vitest/project-publication-actions.test.ts` | Source-string expectation looked for `verifySharedLinkRecipientToken` in `share/[token]/page.tsx`; implementation moved to session initializer/API route. | Repaired: assertion now covers `SharePageRecipientSessionInitializer` on the page and token verification/session cookie setting in `/api/share/[token]/session`. |

## Files Inspected

Required baseline files:

- `AGENTS.md`, `DESIGN.md`, `README.md`, `package.json`, `bun.lock`, `.env.example`, `.github/workflows/ci.yml`.
- `.ai/README.md`, `.ai/00_system/ai-folder-canonical-map.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, `.ai/06_specs/*`.
- Existing launch plan docs `00` through `20`.

Code audit files:

- Routes: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/workshop/**`, `src/app/share/**`, `src/app/invite/**`, `src/app/api/**`.
- Components: `WorkshopPageShell`, `EstimateCopilotFloatingButton`, `EstimateSheetContent`, `EstimateSheetTree`, `ProposalExportPreviewDialog`, `LibraryPageClient`, `TemplatesPageClient`, component-library/sidebar/ui components.
- Core logic: `src/lib/auth/*`, `src/lib/supabase/*`, `src/lib/repositories/*`, `src/lib/projects/*`, `src/lib/estimates/*`, `src/lib/component-library/*`, `src/lib/proposal-export/*`, `src/lib/ai/*`, `src/lib/email/*`, `src/lib/publication/*`, `src/lib/collaboration/*`, `src/hooks/*`.
- Supabase: `supabase/migrations/*`, `src/lib/supabase/types.ts`.
- Tests: `tests/unit/*`, `tests/vitest/*`, `e2e/*`, Playwright config, CI workflow.

## Symbols Inspected

| Symbol / route | Evidence use |
| --- | --- |
| `WorkshopPageShell` | Confirms Ask Flip footer assistant is hidden by default behind `isAskFlipUiEnabled()`. |
| `AskFlipFooterAssistant` / `EstimateCopilotFloatingButton` | Confirms prompt, Apply, feedback POSTs to AI routes. |
| `handleAiAskRequest` | Confirms provider path remains inside handler and route entry is default-disabled before handler import. |
| `handlePackageBuilderRequest` | Confirms Draft/Apply/memory/audit branches remain in handler and route entry is default-disabled before handler import. |
| `getPackageBuilderFeatureFlags` | Confirms subflags default mostly on and no global MVP kill switch exists. |
| `EstimateSheetContent` | High-blast-radius editor and row details/history surface. |
| `useEstimateRowMutations` | Confirms no dedicated unlink mutation hook exists. |
| `insertEstimateRowItemFromLibrary`, `updateEstimateRowItem`, `replaceEstimateRowItemWithLibrary`, `deleteEstimateRowItem` | Confirms revision-aware row RPC action pattern. |
| `buildProposalExportModel` | Confirms current material/labor compatibility and all rows included. |
| `createProposalWorkbook` | Confirms static totals and current sheet layout. |
| Export route `GET` | Confirms Node runtime XLSX download route. |
| `sendEmail`, Resend webhook route | Confirms unconfigured email now fails closed outside tests and that webhook secret proof remains required. |

## Graph Analyses Performed

| Tool | Result |
| --- | --- |
| `get_minimal_context` | 3,633 nodes, 51,052 edges, 387 files; low risk for docs-only edit. |
| `get_architecture_overview` | 120 communities; major communities include workshop estimate, estimates, projects, component library. |
| `list_flows` | Critical flows include auth, project creation, estimate tree, estimate creation, route handlers. |
| `query_graph file_summary` | Used for `WorkshopPageShell`, `EstimateSheetContent`, `build-proposal-export-model`; workbook file required fallback static read. |
| `get_bridge_nodes` | `EstimateSheetContent`, `EstimateSheetTree`, `EstimateRightSidebar`, publication/invite/test surfaces are blast-radius hotspots. |
| `detect_changes` after doc edits | 21 tracked plan docs analyzed; 0 changed functions/classes, 0 affected flows, 0 test gaps, risk score 0.00. |
| Native explorers | Four read-only lanes covered AI/auth/share/email, unlink/schema/RPC, Excel export, and infra/performance/security/legal/observability. |

Graph limitation: some FTS semantic searches returned no matches and GitNexus staleness was reported by a read-only explorer. Fallback static analysis and code-review graph evidence are recorded rather than claiming complete graph coverage.

## Migrations / Generated Types Inspected

- `20260518090000_archestimator_core_schema.sql`
- `20260522025929_combine_misc_cost.sql`
- `20260522064018_component_library_taxonomy_source.sql`
- `20260524033151_estimate_sheet_version_control.sql`
- `20260524050746_add_estimate_row_contingency_percentage.sql`
- `20260527120000_project_client_publication.sql`
- `20260528220000_project_shared_link_overhaul.sql`
- `20260528184224_allow_estimate_row_discounts.sql`
- `20260601003000_security_rate_limit_events.sql`
- `src/lib/supabase/types.ts`

No linked Supabase query was run in this pass. Production/staging schema readiness remains unproven.

## Local DBIDX Repo Audit Slice - 2026-06-02

- Script: `scripts/audit-dbidx-repo.ts`.
- Package command: `bun run dbidx:audit-repo`.
- Artifact: `.ai/09_archive/store/2026-06-02-CODEX-P0-DBIDX-001/repo-only-query-index-audit.md`.
- Result: local-only CODEX-P0-DBIDX-001 repo audit generated 251 source query references and 99 migration-derived index statements. The artifact includes the required repo query map, migration index inventory, live-metrics section, and explicit live-metrics-unavailable note.
- Scope limit: this intentionally skips external/provider/manual gates while provider setup is pending. It does not run Supabase advisor, `pg_stat_statements`, live FK coverage, migration parity, or EXPLAIN, and it does not create/apply candidate indexes.
- Guardrail evidence: `bunx vitest run tests/vitest/dbidx-repo-audit.test.ts --maxWorkers=1` verifies the helper remains local-only/non-mutating and the artifact preserves the required DBIDX-001 sections without fabricating live metrics.

## ONB-001 First-Run Project List Local Evidence - 2026-06-02

- `/workshop/projects` first-run state now uses shared `EmptyState` copy with a visible `Create project` action and explicit sample-reference disclosure.
- Filtered live-project no-results now use shared no-result copy instead of the old `Try adjusting your search terms` placeholder.
- `projects-page-view-mode.test.tsx` covers empty project state, sample-reference disclosure, create-project modal launch, and filtered live-project no-results.
- Local proof: `bunx vitest run tests/vitest/projects-page-view-mode.test.tsx --maxWorkers=1` passed 1 file / 5 tests.
- Scope limit: this is local DOM proof only. Hosted Google auth, first-account creation, real workspace seeding, and new-account screenshots remain in the manual/provider proof queue.

## DEMO-001 Project Dashboard Local Evidence - 2026-06-02

- Project dashboard content area now shows a compact next-step panel instead of a blank project-detail route.
- The panel links directly to project estimates, project charts, and all projects while keeping editable project details in the left rail.
- `project-dashboard-client.test.tsx` covers live project detail values, sample fallback dashboards, and the route links for estimates/charts/projects.
- Local proof: `bunx vitest run tests/vitest/project-dashboard-client.test.tsx --maxWorkers=1` passed 1 file / 2 tests.
- Scope limit: this is local DOM proof only. Investor demo screenshots and hosted/manual route walkthroughs remain open.

## QA-002 Estimate List Local Evidence - 2026-06-02

- Project estimate lists now show a shared empty state with a visible first-estimate action when a project has no estimate sheets.
- Filtered estimate lists now show no-match copy that points users toward sheet code/name search or clearing filters, without duplicating create actions while estimates already exist.
- `project-estimates-client-create.test.tsx` covers guarded create submission, first-estimate empty-state copy/action, and filtered no-match copy.
- Local proof: `bunx vitest run tests/vitest/project-estimates-client-create.test.tsx --maxWorkers=1` passed 1 file / 3 tests.
- Scope limit: this is local DOM proof only. Full create/open/duplicate core smoke, hosted route behavior, and manual estimate-list screenshots remain open.

## Excel Reference Evidence Reviewed

The workbook plan incorporates provided bid/quotation patterns:

- Project/location/owner/bidder/date header block.
- General notes requiring line totals, included/excluded/by others marking, formula checks, OTHERS rows, and bidder remarks.
- Material/labor or supply/installation split columns, cost totals, line totals, subtotals.
- Scope labels: included, omitted, OSM, OFCI, by others, owner supplied, not applicable, excluded.
- Proposal summaries with section totals, running totals, contingency, VAT, grand total, exclusions, terms, validity/warranty, signature/conforme.
- Contractor bid tabulation treated as post-MVP unless trivial.

## Env / Provider Evidence

| Provider | Current evidence | Missing proof |
| --- | --- | --- |
| Vercel | Local build passes; Next config inspected. | Env values, deploy logs, custom domain/SSL, rollback. |
| Supabase | Local migrations/types inspected. | Linked/staging migrations, RLS/storage denial queries, auth callback URLs. |
| Resend | Client/webhook code inspected. | API key, sender domain, DKIM/SPF/DMARC, webhook delivery proof. |
| AI provider | AI handler inspected. | Deferred for MVP; route must fail closed before provider calls. |

## Resend Sender DNS Cheap-Path Evidence - 2026-06-04

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-sender-dns-cheap-path-2026-06-04T0826Z.json`.
- Production health proof: `curl -fsS -w '\nHTTP_STATUS:%{http_code}\n' https://www.archestimator.com/api/health` returned HTTP 200 with `ok: true`.
- Vercel env proof: `vercel env ls` shows encrypted Production and Preview `(main)` entries for Supabase public/server keys, site/app URLs, closed-beta and invite flags, publication secrets, AI-off flags, Resend API/from/reply-to, and `RESEND_WEBHOOK_SECRET`.
- Namecheap UI proof: Host Records show Vercel A/CNAME, apex forwarding SPF, apex `_dmarc`, Resend DKIM at `resend._domainkey.contact`, and Resend SPF at `send.contact`; Mail Settings remains `Email Forwarding`.
- DNS proof: `dig +short TXT send.contact.archestimator.com` returns `v=spf1 include:amazonses.com ~all`; `dig +short TXT resend._domainkey.contact.archestimator.com` returns the DKIM public key; `dig +short TXT _dmarc.archestimator.com` returns `v=DMARC1; p=none;`; `dig +short MX archestimator.com` returns the five registrar email-forwarding MX hosts.
- Resend blocker: `dig +short MX send.contact.archestimator.com` returns no MX answer. The missing MX was not added because the visible Namecheap Host Records picker did not expose MX/MXE while Mail Settings stayed on `Email Forwarding`, and switching Mail Settings to `Custom MX` would risk interrupting `SUPPORT_INBOX_PLACEHOLDER` forwarding.
- Cheap-path decision: leave support forwarding intact; do not buy add-ons or switch paid DNS/mail services without explicit approval. Safe next path is Namecheap support confirmation for subdomain MX, a deliberate DNS-provider migration, or a deliberate support-mail migration.

## Manual QA Still Required

- Hosted auth: Google, magic link, callback, logout/session expiry.
- First-run: new beta tester, returning tester, investor demo, invited user, public share user, failed login, empty workspace, no seeded components.
- Excel: Excel desktop plus Numbers/LibreOffice/Google Sheets open, formula recalc, print preview, no blank line totals.
- Security: RLS denial, storage denial, cross-workspace route denial, share/invite token edge cases.
- Email: invite/share send, delivery, bounce/complaint webhook.
- Deployment: Vercel preview/prod deploy, rollback, env separation.
- Support/observability: error alert, uptime alert, support inbox, incident response dry run.
