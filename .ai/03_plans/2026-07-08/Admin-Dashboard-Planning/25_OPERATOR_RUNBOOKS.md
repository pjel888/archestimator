# 25 — Operator Runbooks

**Created:** 2026-07-09 (Asia/Manila)
**Purpose:** Step-by-step workflows for common operator scenarios. Closes
GAP-5 from `20`. Pairs with `13` (rollout/rollback) and `08` (security).

This is planning-only. Runbooks that reference `wrangler d1 execute` write
commands or provider mutations are flagged `owner-gated runtime action` —
they require fresh owner approval at execution time per the standing
Cloudflare-resource mandate; planning does not authorize them.

---

## 25.1 How to use this doc

Each runbook is a numbered checklist. The operator (Philip) can follow it
linearly. Each step has:
- **What:** the action.
- **Where:** the surface (admin UI, command line, provider console).
- **Verify:** how to confirm the step succeeded.
- **Rollback:** how to undo if needed (where reversible).

Some runbooks have a "post-MVP" label — they describe flows that depend on
features not in MVP (e.g., DSAR queue viewer in admin).

---

## 25.2 Runbook: locked out of admin

**Scenario:** Philip cannot reach `/admin` (redirects to `/access-required`
or `/login`).

### Diagnosis

1. **Check identity:** Visit `/workshop/settings/profile`. Confirm the
   signed-in email is `philipjonlewis@gmail.com` (or whichever is in
   `PLATFORM_ADMIN_EMAILS`).
2. **Check role:** Profile page shows role. If `member`, the role row in
   D1 is wrong.
3. **Check env:** Locally — `.dev.vars` has `PLATFORM_ADMIN_EMAILS` and
   `ADMIN_DASHBOARD_ENABLED=true`. Hosted — `wrangler secret list` to
   confirm secrets are present.

### Resolution paths

**Path A — env var misconfigured (local dev):**

1. Edit `.dev.vars` (NOT `.dev.vars.example`).
2. Set `PLATFORM_ADMIN_EMAILS=philipjonlewis@gmail.com`.
3. Set `ADMIN_DASHBOARD_ENABLED=true`.
4. Restart `bun run dev`.
5. **Verify:** Visit `/admin` → loads.

**Path B — env var missing on hosted Worker:**

1. `wrangler secret put PLATFORM_ADMIN_EMAILS` → enter email.
2. `wrangler secret put ADMIN_DASHBOARD_ENABLED` → enter `true`.
3. **Verify:** `wrangler secret list` shows both.
4. Visit `https://archestimator.com/admin` → loads.

**Path C — role row missing or wrong in D1 (owner-gated runtime action):**

1. Confirm profile exists: `wrangler d1 execute ARCH_DB --command "SELECT
   id, email, role FROM profiles WHERE email='philipjonlewis@gmail.com'"`
2. If missing: `wrangler d1 execute ARCH_DB --command "INSERT INTO
   profiles (id, email, role, created_at, updated_at) VALUES
   (lower(hex(randomblob(8))), 'philipjonlewis@gmail.com', 'ceo',
   datetime('now'), datetime('now'))"`
3. If wrong role: `wrangler d1 execute ARCH_DB --command "UPDATE profiles
   SET role='ceo' WHERE email='philipjonlewis@gmail.com'"`
4. **Verify:** Re-run the SELECT; role is `ceo`. Visit `/admin` → loads.
5. **Audit:** This is a direct DB write; record in `admin_audit_events`
   manually or note in incident log if used during a sev1.

**Path D — dev bypass (last resort, local only):**

1. Set `ARCHESTIMATOR_DEV_AUTH_EMAIL=philipjonlewis@gmail.com` in `.dev.vars`.
2. Restart dev.
3. **Verify:** `/admin` loads bypassing email check (dev only).

### Prevention

- Document `PLATFORM_ADMIN_EMAILS` in onboarding runbook for any new admin.
- Add a unit test asserting `isPlatformAdminEmail('philipjonlewis@gmail.com')`
  returns true with the default env.

---

## 25.3 Runbook: declare an operational incident

**Scenario:** Something is broken in production; Philip needs to record an
incident and optionally alert.

### Steps

1. Run: `bun run ops:incident -- --dry-run --json` first to preview the
   redacted record.
2. Inspect the dry-run output. Confirm no raw secrets/PII leaked.
3. Run for real: `bun run ops:incident -- --declare --severity sev2 --title
   "DB latency spike" --description "..."` (replace args).
4. **Verify:** `bun run ops:incident -- --list` shows the new incident.
5. Optional alert: if `OPERATIONAL_INCIDENT_ALERTS_ENABLED=1` and webhook
   URL/token set, the alert fires automatically. If not and you want to
   alert:
   - `wrangler secret put OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL`
   - `wrangler secret put OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN`
   - `wrangler secret put OPERATIONAL_INCIDENT_ALERTS_ENABLED` → `true`
   - Re-run the declare command (or use `ops:incident -- --note` on the
     existing incident to re-fire).
6. Surface in admin: the Overview incident strip will show the open
   incident within the next page load.

### Update / close

- Status update: `bun run ops:incident -- --note --id <id> --status
  monitoring --note "latency back to normal, monitoring"`
- Close: `bun run ops:incident -- --close --id <id> --resolution "..."`

---

## 25.4 Runbook: support conversation (user reports issue)

**Scenario:** A user reports a problem via the in-app support widget.

### Steps

1. Open `/admin/support` — conversation appears at top of list with `●`
   unread indicator.
2. Click the conversation to open the thread.
3. Read the user's message. WS pushes new inbound messages live.
4. Type reply in the composer (Cmd/Ctrl+Enter to send).
5. **Verify:** Reply appears in thread with `sent` status; user receives
   email at their registered address.
6. If email send fails (toast `Couldn't send reply. Email delivery
   failed. Your draft is saved.`):
   - Draft is preserved in the textarea.
   - The failed message row in thread has a retry button.
   - Investigate: `wrangler tail` to see EMAIL binding errors.
   - Once resolved, click retry or re-send.

### Set status

- After resolving: change status from `open` to `resolved` via the status
  dropdown. Conversation moves out of default view.
- If waiting on user input: set to `pending`.
- Archive (P2): after 30d resolved, archive to declutter.

### Escalation

- If the user reports a sev1 bug: declare an incident (runbook 25.3) and
  cross-link the conversation ID in the incident description.
- If the user requests data export/deletion: see DSAR runbook (25.5).

---

## 25.5 Runbook: DSAR (data subject access request) — post-MVP

**Scenario:** A user emails `privacy@archestimator.com` requesting data
export or deletion.

### Mint a DSAR row

1. In admin: `/admin/audit` → DSAR queue tab → "New request" (post-MVP).
   Or directly via D1 (MVP):
   `wrangler d1 execute ARCH_DB --command "INSERT INTO privacy_requests
   (id, user_email, request_type, status, requested_at, sla_deadline)
   VALUES (...)"` (use the existing schema from migration `0033`).
2. Acknowledge to the user via support conversation or email.

### Export path

1. Query all user-owned data: estimates, support conversations, audit
   events referencing them, etc.
2. For MVP: `wrangler d1 execute ARCH_DB --command "SELECT * FROM
   support_conversations WHERE user_id=?"` etc. — collect into a JSON or
   CSV bundle.
3. Post-MVP: the admin DSAR viewer has an "Export" action that produces
   the bundle automatically.
4. Deliver via email (EMAIL binding) or secure share link.

### Deletion path

1. Verify the user really wants deletion (confirmation email).
2. Check for active publications / shares that reference their data.
3. Delete in dependency order (or use `ON DELETE CASCADE` if migrations
   set it — most user-owned tables do).
4. Mark DSAR row `complete`.
5. Audit: the deletion should write a `user.delete` audit event before
   the cascade (post-deletion audit impossible since the user row is gone).

### SLA

- Privacy laws vary; default internal SLA is 30 days.
- The DSAR queue viewer (post-MVP) shows the SLA countdown.

---

## 25.6 Runbook: rotate a provider credential

**Scenario:** GA4 / Clarity / CF Analytics / EMAIL / OAuth secret needs
rotation.

### Steps

1. **Identify the secret name** (e.g., `CF_ANALYTICS_API_TOKEN`).
2. **Issue new credential at the provider:**
   - GA4: Google Cloud Console → Service Accounts → JSON key.
   - Clarity: Clarity dashboard → Settings → API token.
   - CF Analytics: Cloudflare dashboard → My Profile → API Tokens →
     Create Token (Analytics - Read).
   - EMAIL: not a secret per se; EMAIL binding uses Cloudflare account
     trust. For OAuth client secret: Google Cloud → Credentials.
3. **Set the new secret:**
   `wrangler secret put CF_ANALYTICS_API_TOKEN` → paste new value.
4. **Verify:** `wrangler secret list` shows the secret exists (value not
   shown). Trigger a cache refresh in admin: `/admin/analytics` →
   "Refresh all" → tile loads new data within TTL.
5. **Revoke the old credential** at the provider.
6. **Audit:** Optional — note rotation in incident log if it was
   incident-driven.

### If rotation breaks something

- Roll back: re-set the previous secret value via `wrangler secret put`.
- Investigate via `wrangler tail` for binding errors.

---

## 25.7 Runbook: toggle maintenance mode

**Scenario:** Philip needs to deploy a migration or fix and wants to
block user writes temporarily.

### Steps

1. `/admin/observability` → Maintenance mode section.
2. Toggle the `admin_maintenance_mode` switch ON.
3. Confirmation dialog appears: "Maintenance mode will block all writes
   to /workshop. Users will see a 'back soon' message. Continue?"
4. Confirm.
5. **Verify:** Visit `/workshop` in another browser/incognito as a normal
   user; writes (e.g., creating an estimate) return 503 with the
   maintenance page.
6. Read-only surfaces (viewing existing estimates, shared links) should
   still work.

### After maintenance

1. Toggle OFF in the same UI.
2. **Verify:** Normal writes work again.
3. Audit: the toggle writes an audit event automatically.

### Implementation note

- `proxy.ts` reads the flag (cached short-TTL) and short-circuits
  `/workshop/*` mutations to a 503 maintenance page.
- The admin surface itself is unaffected (Philip can still operate).

---

## 25.8 Runbook: cron job failed

**Scenario:** The cron health strip in `/admin/observability` shows a red
indicator for one of the 3 crons.

### Steps

1. Note which cron failed (upload-cleanup, upload-scan, or retention).
2. Check `wrangler tail` for the failure (filter by `cron_event` or the
   internal route like `/api/internal/upload-cleanup`).
3. Check `logs/dev.ndjson` if running locally (though cron failure is
   typically hosted).
4. Identify root cause:
   - D1 deadlock / timeout → likely a slow query; check the affected
     table indexes.
   - R2 error → check `ARCH_UPLOADS_R2` bucket state.
   - Email error → check EMAIL binding.
5. Fix forward (preferred) or roll back the offending change.
6. Manually trigger the cron to verify the fix:
   `curl -X POST https://archestimator.com/api/internal/<job> -H
   "X-Cron-Secret: $CRON_SECRET"` (the secret-gated internal route).
7. **Verify:** The cron health strip turns green within the next scheduled
   run, or immediately after manual trigger.

### If the cron is consistently failing

- Declare an incident (runbook 25.3) at sev2 or sev3 depending on user
  impact.
- Disable the cron temporarily by removing it from `wrangler.jsonc`
  (requires redeploy).

---

## 25.9 Runbook: queue DLQ has messages

**Scenario:** `/admin/observability` queue health shows DLQ depth > 0.

### Steps

1. Open the DLQ viewer (post-MVP) or use wrangler CLI (MVP):
   `wrangler queues queue list` → identify the DLQ for
   `archestimator-upload-jobs`.
2. Inspect a message:
   `wrangler queues queue info archestimator-upload-jobs-dlq --consumer`
3. Decide:
   - **Replay** (retry): if the failure was transient (e.g., temporary R2
     outage).
   - **Discard**: if the message is malformed or the referenced upload
     was deleted.
4. For replay: post-MVP UI has a "Replay" button per message. MVP: write
   a small script using the Wrangler queues API to move the message back
   to the main queue.
5. **Verify:** DLQ depth returns to 0; main queue depth briefly increases;
   job succeeds.
6. If the same message fails again after replay: investigate root cause;
   don't loop replay indefinitely.

---

## 25.10 Runbook: client error spike

**Scenario:** `/admin/observability` client-error tile shows a sudden
increase in errors.

### Steps

1. Open the client-errors view (post-MVP) or `logs/dev.ndjson` /
   Cloudflare Workers Logs (MVP).
2. Identify the top error message and the route where it occurs.
3. Check if a recent deploy introduced it (correlate with git history).
4. If yes: hotfix forward or roll back the deploy.
5. If no obvious cause: capture the stack trace and reproduce locally.
6. Optional: declare an incident if user-visible impact.

### Prevention

- The client-error trend tile should catch regressions early.
- Consider adding a Slack alert (post-MVP) when error rate exceeds 1% of
  traffic.

---

## 25.11 Runbook: free-tier consumption > 85%

**Scenario:** `/admin/observability` free-tier gauge shows red on one of
the resources (Workers requests, D1 rows read, R2 storage, Queue ops).

### Workers requests (100K/day free)

- Identify top routes via Cloudflare Workers Observability.
- Add caching where possible (`use cache` for static admin routes — but
  admin is mostly `force-dynamic`; user-facing routes are the lever).
- Consider enabling Workers Paid ($5/month) if sustained.

### D1 rows read (5M/day free)

- Identify slow queries via `perf:dashboard-query-count`.
- Add indexes for hot query patterns.
- Consider D1 Paid if sustained (requires owner approval).

### R2 storage (10GB free)

- Identify large objects: most likely uploads in `ARCH_UPLOADS_R2`.
- Run the upload-cleanup cron manually if it has been failing.
- Consider lifecycle policies for old/abandoned uploads.

### Queue ops (10M/month free)

- Unlikely to hit at solo-dev scale; investigate if it happens.

---

## 25.12 Runbook: backup verification

**Scenario:** Philip wants to verify the latest backup is restorable.

### Steps

1. `/admin/observability` shows "Last backup verified" timestamp.
2. To re-run the rehearsal:
   `bun run cf:d1-restore-rehearsal`
3. Inspect output for success/failure.
4. If failed: investigate D1 backup status in Cloudflare dashboard.
5. Daily backups are automatic on D1 free tier; rehearsal is a sanity
   check, not a restore-from-backup operation.

### Actual restore (last resort, owner-gated)

- Contact Cloudflare support or use D1 time-travel if available.
- This is an owner-gated runtime action; not authorized by this planning
  doc.

---

## 25.13 Runbook: add a second admin

**Scenario:** Philip hires a second operator.

### Steps

1. Confirm the person's Google account email.
2. Add to `PLATFORM_ADMIN_EMAILS`:
   `wrangler secret put PLATFORM_ADMIN_EMAILS` →
   `philipjonlewis@gmail.com,newadmin@example.com`
3. Set their profile role:
   `wrangler d1 execute ARCH_DB --command "UPDATE profiles SET role='admin'
   WHERE email='newadmin@example.com'"` (owner-gated runtime action).
   - If they don't have a profile yet, ask them to sign in once with
     Google OAuth first (creates the row), then run the UPDATE.
4. Have the new admin visit `/admin` and confirm access.
5. Audit: the role update should write an audit event (post-MVP feature;
   for MVP, document in incident log).
6. (Post-MVP) Enable Cloudflare Access OTP for both admins (OPEN-4).

---

## 25.14 Runbook: feature flag drift investigation

**Scenario:** A user reports behavior inconsistent with what the flags
show in admin.

### Steps

1. `/admin/flags` — note current state of all flags.
2. Check the flag cache TTL (planned 60s).
3. If flag was recently toggled, wait for TTL expiry and re-check user
   behavior.
4. If still inconsistent: check if the user is hitting a different
   Worker version (deploy skew).
5. Force-refresh the cache: toggle the flag off and back on (writes a
   new audit row).
6. If still inconsistent: investigate the code path; the flag may be
   read in a context that bypasses the cache.

---

## 25.15 Runbook: investigate audit event

**Scenario:** Philip sees a suspicious action in the audit log.

### Steps

1. `/admin/audit` → filter by action, actor, or date.
2. Click the event row to expand details (summary, target, request_id).
3. Cross-reference `request_id` in `logs/dev.ndjson` or Workers Logs to
   see the full request context.
4. If unauthorized: declare an incident (runbook 25.3); rotate any
   potentially compromised credentials (runbook 25.6).
5. If the action was legitimate but unexpected: add a clarification to
   the audit summary in code (future actions only; past events are
   immutable).

---

## 25.16 Runbook: deploy / rollback

**Scenario:** Philip is about to deploy admin dashboard changes or needs
to roll back.

### Pre-deploy checklist

- [ ] `bun run validate` green
- [ ] `bun run build` green
- [ ] `bun run cf:typegen` (if `wrangler.jsonc` changed) — verify no diff
- [ ] Migrations applied to local D1 and tested
- [ ] Shared-file leases acquired (per `00_AGENT_COORDINATION.md`)
- [ ] `git status --short --branch` clean or only intended files staged

### Deploy

1. `bun run cf:deploy`
2. **Verify:** Visit `https://archestimator.com/admin` (after a moment
   for the deploy to propagate).
3. Run smoke tests for the changed surfaces.

### Rollback

- For feature-flag-gated changes: toggle the flag off in admin.
- For migration issues: apply the reverse SQL (see `07` blueprints).
- For broken code: redeploy the previous commit (`git revert` + redeploy,
  or `wrangler deployments rollback` if available).

### Maintenance-mode deploy (optional)

For risky migrations:
1. Enable maintenance mode (runbook 25.7).
2. Deploy + apply migration.
3. Verify on a small set of test users.
4. Disable maintenance mode.

---

## 25.17 Runbook: investigate WS disconnect reports

**Scenario:** Users report the support widget or presence count isn't
updating.

### Steps

1. Check `/admin/observability` for any incident or degradation indicator.
2. `wrangler tail` filtered by `websocket` or `durable_object`.
3. Check the relevant DO:
   - `wrangler d1 execute ARCH_DB` for any DO-related state.
   - For `GlobalPresence`: the count should reflect active sockets.
4. If the DO is unreachable or erroring: declare an incident; fall back
   to polling (the hooks auto-fall-back to poll on WS failure).
5. Check Ed25519 token issuer: `REALTIME_IDENTITY_SIGNING_KEY` still set?
   `wrangler secret list` to confirm.

---

## 25.18 Runbook: enable Cloudflare Access (post-MVP, OPEN-4)

**Scenario:** Philip decides to enable the edge gate.

### Steps

1. Cloudflare Zero Trust dashboard → Access → Applications → Add
   Application → Self-hosted.
2. Application domain: `archestimator.com/admin`.
3. Identity provider: One-time PIN (email-based, free for ≤50 users).
4. Allow list: `philipjonlewis@gmail.com` (and any second admin).
5. Save.
6. Set `ADMIN_CLOUDFLARE_ACCESS_ENABLED=true` in `.dev.vars` (and via
   `wrangler secret put`).
7. Re-deploy.
8. **Verify:** Visit `/admin` in an incognito window → CF Access login
   page appears before reaching the app.
9. Audit: app still does its own gate check (defense in depth).

---

## 25.19 Runbook: investigate Clarity / GA4 data discrepancy

**Scenario:** Numbers in admin don't match what Clarity/GA4 dashboards show.

### Steps

1. Check the cached-at timestamp in the admin tile.
2. Refresh cache: `/admin/analytics` → "Refresh all".
3. If still off: compare definitions (e.g., Clarity "sessions" vs GA4
   "sessions" — they count differently).
4. If genuinely wrong: investigate the cache payload (D1 query against
   `admin_metric_cache`) vs the raw API response.
5. If the API response is wrong: provider issue; not actionable locally.

---

## 25.20 Runbook: incident postmortem template

After resolving a significant incident:

```
# Postmortem: <incident title>

**Severity:** sevN
**Duration:** <start> to <end> (<hours>h)
**Impact:** <users affected / data affected>

## Summary
<one-paragraph what-happened>

## Timeline
- <time>: detection
- <time>: escalation
- <time>: mitigation
- <time>: resolution

## Root cause
<technical explanation>

## Contributing factors
- <factor 1>
- <factor 2>

## What went well
- <thing 1>

## What went poorly
- <thing 1>

## Action items
- [ ] <action 1> (owner, due)
- [ ] <action 2> (owner, due)

## Lessons learned
<durable-note-for-future-you>
```

Store in `.ai/05_logs/incidents/<YYYY-MM-DD>-<slug>.md`.

---

## 25.21 What this doc does NOT do

- Authorize destructive runtime actions. Each such step is flagged.
- Replace the rollout/rollback table in `13` — this complements it.
- Cover every edge case — these are the common operator scenarios.
- Serve as a substitute for production judgment. Philip still owns
  decisions.

---

## 25.22 Confirmation

No application code, tests, migrations, schemas, `wrangler.jsonc`,
`package.json`, provider state, or runtime data were modified. All writes
are confined to `.ai/03_plans/2026-07-08/Admin-Dashboard-Planning/`.
