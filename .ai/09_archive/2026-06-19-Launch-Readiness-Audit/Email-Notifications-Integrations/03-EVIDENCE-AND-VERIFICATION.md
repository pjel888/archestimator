# Evidence & Verification — Email, Notifications & Integrations (Domain 13)

Adversarial verification of `01-AUDIT-FINDINGS.md`. Every finding was checked by
re-opening the cited file at the cited region this pass. Read-only on source.

## Verification verdicts

### EMAIL-01 — CONFIRMED (high, not a launch blocker)
- Opened `src/lib/publication/actions.ts:989-1148`. `addSharedLinkRecipients` guards
  only `inputs.length === 0` (`:998`); it then normalizes and loops
  `for (const r of allowedRecipients)` at `:1068`, calling
  `sendSharedLinkRecipientInvitationEmail` (`:1103`) per recipient. There is **no**
  length cap and **no** `check*RateLimit` call anywhere in the function.
- Contrast confirmed: `resendSharedLinkRecipientEmail` IS rate-limited via
  `checkSharedLinkRecipientResendRateLimit` (`:1165`). So the limiter pattern exists
  and is trivially reusable — the audit's recommendation is sound.
- UI check: `src/components/workshop/publication/RecipientEmailComposer.tsx` has no
  client-side chip-count cap (grep for `max|cap|limit|50|100` found only unrelated
  CSS `max-w-*` and backspace handling). So the server is the only gate, and it has
  none. Claim holds.
- Severity: high is fair for an abuse surface, but **not** a launch blocker in a
  closed beta with trusted managers (no external accounts). Kept high / blocker=false.
- existing_plan_overlap: **none — confirmed.** OWASP-09 (rate-limiting) only flags the
  AI routes (`src/app/api/ai/ask`, `package-builder`), not `addSharedLinkRecipients`
  (grep of `09-rate-limiting-and-dos-resilience.md` for `addSharedLink`/recipient
  cap/bulk = no hit). Not previously planned.

### EMAIL-02 — CONFIRMED (medium)
- `resend-webhooks.ts:42-52`: `recipientDeliveryStatusByEvent` maps
  `email.bounced`/`email.complained`/`email.failed`/`email.suppressed` → `"bounced"`,
  and `recordResendEmailWebhookEvent` writes `delivery_status` (`:201`). So `bounced`
  is genuinely persisted.
- `resendSharedLinkRecipientEmail` select is `"id, email, display_name,
  email_unsubscribed_at"` (`:1176`) — it does **not** fetch or check
  `delivery_status`. The only suppression guard is `email_unsubscribed_at` (`:1185`).
  So a hard-bounced row can be resent. Claim holds.
- Nuance for `addSharedLinkRecipients`: a bounced address is a *duplicate* row (unique
  pub+lower(email) index, `:1090`) so a re-add becomes status `duplicate` and is NOT
  re-sent — so the *add* path already avoids the resend. The real, confirmed gap is
  the explicit *resend* button path. Severity medium upheld.
- existing_plan_overlap: **none — confirmed.**

### EMAIL-03 — CONFIRMED but ADJUSTED medium -> low
- `unsubscribe/route.ts:70` calls `assertSameOrigin(request)`.
  `security.ts:346-356`: `assertSameOrigin` returns `{ ok: true }` immediately when
  `request.headers.get("origin")` is falsy (`:347-348`). The stricter sibling
  `assertSameOriginPublicPost` (`:358-372`) requires Origin present AND a CSRF
  double-submit (`x-archestimator-csrf` header == `csrfCookieName` cookie). So the
  missing-Origin bypass is real.
- BUT the mutation requires a valid `recipient_token` (a secret; the public-repo
  lookup hashes it) and only sets `email_unsubscribed_at`. The GET path is a
  read-only interstitial (`:54-64`) that never mutates. The action is self-harm-only
  (unsubscribe yourself) and secret-gated. This is pure defense-in-depth on a
  low-value action → **low**, not medium. Adjusted down. blocker=false (was already).
- existing_plan_overlap: **none — confirmed.**

### EMAIL-04 — CONFIRMED but ADJUSTED medium -> low
- Digest limiter: `actions.ts:1285` `const digestRateLimit = new Map<string,number>()`
  with the in-source caveat at `:1284` ("per-process, resets on restart; production
  would use DB row or Redis"); `shouldSendDigest` reads/writes it (`:1288-1295`).
- Circuit breaker: `resend-client.ts:78-80` module-level `emailAttemptTimes` /
  `emailFailTimes` / `emailCircuitOpenUntil`. Confirmed per-process.
- On Vercel each lambda instance has its own memory, so both are per-instance. Claim
  holds. BUT: both are best-effort guards on best-effort callers
  (`triggerOwnerDigestIfAllowed` returns `{ok:true, skipped}`; the circuit just
  fast-fails a degrade-gracefully send). Per-instance scope = *weaker* protection,
  never a correctness or security break. In closed beta with low fan-out the practical
  impact is near-zero → **low**. Adjusted down. Document-and-defer is correct.
- existing_plan_overlap: **none** for the serverless-state issue itself — confirmed.
  (The *alerting* aspect is OWASP-18; the *throttle correctness* is new.)

### EMAIL-05 — CONFIRMED (medium)
- `check-resend-readiness.ts`: checks only presence of 5 env var names (`:6-12`,
  `evaluatePresence`); `note` at `:120` explicitly says it "does not prove
  sender/domain verification, DNS, webhook registration, delivery, bounce, complaint,
  or open events". `resendReady` is purely env-presence (`:112`). Claim holds.
- `check-support-email-dns.ts:93`: `dnsReady = hasMx && hasSpf && hasDmarc` for the
  *support* domain — no DKIM selector, and not the Resend *sending* domain. Claim holds.
- No automated assertion that the Resend prod domain shows verified SPF/DKIM or that
  the webhook endpoint is registered. The 2026-06-04 live reconciliation proves one
  delivered event but is not a standing gate. Recommendation (ops checklist) is sound.
- existing_plan_overlap: **partial:2026-06-01-security-owasp-compliance-audit** —
  upheld. OWASP-18 R-60 plans webhook-verification-failure alerting; DNS/sender
  verification posture itself is NOT an OWASP finding (grep of 16/18 confirms). So
  "partial" is accurate.

### EMAIL-06 — CONFIRMED (low)
- `collaboration/actions.ts:366`: `sendSupabaseInviteEmail` calls
  `admin.auth.admin.inviteUserByEmail(email, { redirectTo, data })`. This is Supabase
  Auth's email pipeline (default Supabase SMTP unless custom SMTP configured), NOT
  Resend/`sendEmail`. Confirmed a second, independent sender surface that the Resend
  readiness/DNS gates do not cover. Operational surprise, not a vuln → low upheld.
- existing_plan_overlap: **none — confirmed.** OWASP-15 (collaboration-invite-surface)
  flags `resolve_collaboration_invitation` sender-contact RLS (F-INV-04), not the
  Supabase-SMTP deliverability/dual-sender posture.

### EMAIL-07 — CONFIRMED (info, no action)
- `route.ts:46` passes `req.headers.get("svix-id")` to `recordResendEmailWebhookEvent`;
  it is stored as `event_id` metadata (`resend-webhooks.ts:88-92`), no processed-event
  table. Idempotency rests on (a) standardwebhooks timestamp tolerance inside
  `verify()` and (b) the monotonic `resend_last_event_at` stale guard
  (`resend-webhooks.ts:193-198`). The update is idempotent (status + last-event
  fields), so duplicate/stale events are safe. Claim holds; no action for launch.
- existing_plan_overlap: covered-by OWASP A08 integrity — reasonable.

### EMAIL-08 — CONFIRMED (info, guardrail)
- `notifications/repository.ts:147-163`: `updateCurrentUserDeliveryState` does
  `.update(values).eq("id", deliveryId).eq("user_id", userId)`. The
  `.eq("user_id", userId)` (`:157`) is the load-bearing boundary because mutations run
  under the service-role client (UPDATE revoked from `authenticated`). `userId` comes
  from the authenticated context; `deliveryId` is UUID-validated upstream. Correct as
  written. Claim holds — a future edit dropping that filter would let one user mutate
  another's deliveries.
- existing_plan_overlap: covered-by archived notification-system pack — reasonable.

## Refutations
None. Every finding survived adversarial scrutiny. Two were severity-adjusted **down**
(EMAIL-03, EMAIL-04); none were refuted as non-real or already-handled. No
existing_plan_overlap claim was found to be wrong: the named overlaps (OWASP-09
AI-routes-only, OWASP-18 alerting, OWASP-15 invite RLS) genuinely do **not** cover the
specific email findings, so the "none"/"partial" labels are accurate.

---

## Proof gates per remediation item

Honest scope note: local checks can prove *code-level* behavior (caps, guards, scoping)
deterministically. They **cannot** prove real-world deliverability, DKIM/DMARC
alignment, Resend quota behavior, or that the webhook is registered — those require the
Resend dashboard / live DNS and are inherently out-of-band.

### EMAIL-01 (cap + rate-limit)
- **Proves locally:** add a targeted Vitest against `addSharedLinkRecipients` asserting
  (a) a 51-recipient input returns `ok:false` and performs **zero** inserts (mock the
  admin client / spy on `.insert`), and (b) the (N+1)th add within the window is
  blocked by the rate-limit helper (mock `security_rate_limit_events` read).
- **Cannot prove locally:** real Resend fan-out volume. N/A once the cap exists.
- Gate: `bun vitest run` on the new test + `bun run build` (server-action file —
  per MEMORY "use server exports only async", a build is the only thing that catches
  a bad export; run it).

### EMAIL-02 (bounce gate)
- **Proves locally:** Vitest that `resendSharedLinkRecipientEmail` returns `ok:false`
  with the bounced message when the mocked recipient row has
  `delivery_status === "bounced"`, and still succeeds for `sent`/`pending`.
- Gate: targeted Vitest + `bun run build`.

### EMAIL-03 (if done — missing-Origin reject / CSRF)
- **Proves locally:** Vitest/route test that a POST with no `Origin` header is rejected
  403, and that a same-origin POST with the CSRF pair (if switching to
  `assertSameOriginPublicPost`) still succeeds. **Must** also verify the interstitial
  form actually carries the CSRF cookie/header, or the legit unsubscribe breaks — add
  a test for the happy-path interstitial submit.
- Gate: targeted Vitest. Manual: click the unsubscribe interstitial in a browser to
  confirm it still works end-to-end (the secret control is what matters).

### EMAIL-04 (DB-backed throttle, if done)
- **Proves locally:** Vitest with a mocked `security_rate_limit_events` showing a
  second digest within 15 min is suppressed *across simulated instances* (call twice
  with the throttle state read from the mock store, not a module var). Verify the
  throttle read fails **open** on a simulated DB error (best-effort).
- **Cannot prove locally:** true multi-lambda concurrency on Vercel — only the DB-state
  contract. Honest limitation.
- Gate: targeted Vitest + migration apply check if a new table is added (`supabase`
  MCP `apply_migration` against project `ebxxqidacheyapmmzavr`, then `list_migrations`).

### EMAIL-05 / EMAIL-06 (ops checklist)
- **Cannot be a CI/local gate** by nature. Proof is manual:
  - Resend dashboard: sending domain shows verified SPF + DKIM; DMARC alignment.
  - Resend dashboard: `/api/webhooks/resend` registered + secret matches Vercel prod.
  - Decision recorded in `.ai/10_state/decisions.md` for the Supabase-SMTP sender.
- **Optional automated probe:** extend `check-support-email-dns.ts` to query a DKIM
  selector for the sending domain; run `bun run launch:check-support-dns` (or the
  script directly). This proves DNS records *exist*, not that Resend considers them
  verified — state that limitation in the runbook.

### EMAIL-08 (guardrail regression test)
- **Proves locally:** Vitest that the service-role mutation refuses a `deliveryId`
  owned by a different `userId` (i.e. `.eq("user_id", userId)` is enforced) — assert
  the result is `{ ok:false, code:"not_found" }` when the row's user differs.
- Gate: targeted Vitest.

### Domain-wide
- `bun run validate` is **known-red on main** (charts set-state-in-effect +
  ProposalExportPreviewDialog design-lint, both unrelated to this domain; `test:dom`
  all-phase can hang). Gate on the touched-area Vitest + `bun run build`, not the full
  suite. Confirm no NEW red is introduced by diffing failing test names before/after.
