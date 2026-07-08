# 08 — Security, Privacy, and Threat Model

Feedback content is **personal data** under consent + legitimate interest (`.ai/10_state/compliance/privacy-notice-draft.md:33`). The loop adds new egress paths (email, webhook) and new cron-processed reads — each is a potential exfiltration/abuse surface.

## Trust boundaries

| Boundary | Crossing | Control |
|---|---|---|
| Reporter → Server Action | untrusted FormData over authed session | `requireAuth()` + `parseBetaFeedbackSubmission` (length/type/severity/UUID checks) |
| Server Action → D1 | trusted (app code) | repository layer; no raw user SQL |
| Server Action → Email (`EMAIL` binding) | app → Cloudflare | `sendEmail` (no user-controlled `to`/`from`; operator `to` is config-driven) |
| Server Action → Reporter email | app → external mailbox | `to` = row's `user_email`; subject/text app-controlled; **reply-to** = support address |
| Sweep → Webhook | app → operator HTTPS endpoint | `sendFeedbackAlert`; URL from env (must `https:`); bearer token |
| Sweep cron → D1 read | trusted Worker context | in-process; no inbound route |

## Threat model

| ID | Threat | Actor | Surface | Mitigation |
|---|---|---|---|---|
| T-01 | Prompt/HTML injection via `message` reaching operator email/reporter email | reporter | email body | email bodies are built from app-controlled templates; user `message` is inserted as **plain text** (or HTML-escaped). No raw-HTML interpolation of `message`. Verify in notify module. |
| T-02 | Mailto fallback leaks payload into client-accessible logs | reporter + logs | fallback path | build mailto server-side; do not log the full message; `redactForLog` the message field. (SEC-DATA-02) |
| T-03 | Operator email enumeration via timing/error differences | attacker | submit action | submit success/failure is uniform; notify is fire-and-forget; no error reflects operator config. |
| T-04 | SSRF via webhook URL | mis-configured env | sweep | webhook URL from server env only; must be `https:`; never user-controlled. Mirror the `operational-telemetry.ts:118-126` `alertWebhookUrl` `https:` guard. |
| T-05 | Privilege escalation to operator actions | non-admin user | review actions | `isPlatformAdminRole` server-side on every operator action; denial tests (SEC-AUTHZ-01). |
| T-06 | Direct POST to a Server Action by a non-admin | attacker | action endpoints | Server Actions are directly-reachable POST endpoints — each re-validates auth + authz. No action assumes UI gating. |
| T-07 | Cross-workspace feedback read in queue | operator | queue query | queue is platform-admin-only (global view by design — operators triage all feedback). Not a cross-tenant leak: feedback is not workspace-scoped for triage. Document this as intentional. |
| T-08 | Log of PII (message content) | operator/logs | notify/sla logging | `SEC-DATA-01`: redact `message`; log only length/type/severity/status/user_id/page_path. |
| T-09 | Abuse: spam submit flooding queue/email | reporter | submit action | (existing) HTML `required` + length bounds; add a simple per-user rate consideration — at beta, accept; flag for P2 (Cloudflare WAF/rate-limit). |
| T-10 | Sweep reads all rows → amplification if webhook is slow | mis-configured/slow operator endpoint | sweep | sweep is bounded; **`sendFeedbackAlert` MUST add `AbortSignal.timeout(5000)`** to its `fetch` — the clone template `operational-telemetry.ts:168-176` has NO timeout (`fetchImpl(url,{...})` with no `signal`), so copying it verbatim ships without one. A hung operator webhook would otherwise hang each sweep row. Add the signal explicitly; on `TimeoutError`, treat as a non-fatal alert failure (log + continue, do not set `alerted_at` so the next run retries). |
| T-11 | Retention purge deletes an active row | n/a | retention | purge `WHERE status='archived'` only; non-archived never purged. (DATA-02) |
| T-12 | Reporter follow-up emailed to a wrong/stale address | n/a | follow-up | `to` = row's `user_email` at time of resolve; email is best-effort; bounce handling is via Cloudflare Email (out of scope to instrument at beta). |
| T-13 | `user_email` as email-header injection / reflection vector | malformed `user_email` reaching `SendEmailInput.to` | follow-up | `SendEmailInput.to` is `string \| string[]` (`transactional-email-client.ts:12`); a `user_email` containing newlines/`<>`/display-name syntax could break SMTP or reflect into a header. **Mitigation:** before `sendEmail`, run `user_email` through an RFC-5322 sanity check (e.g. `/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/` + strip-to-addr); on failure, skip the follow-up + log `code:"INVALID_RECIPIENT"` (non-fatal). The `user_email` is server-attached from the auth session today, but session emails can still be malformed/changed; validate at send time, not just at session creation. |

## Credential material taxonomy

The feedback loop introduces **no new secrets/credentials**. The materials in play are existing:

| Material | Marker | Stored | Read by | Client-visible? | Used for URL/cookie/session? | Rotation | Proof |
|---|---|---|---|---|---|---|---|
| Operator email address | public-ish config | Wrangler secret/`process.env` (`FEEDBACK_OPERATOR_EMAIL` or reuse `CLOUDFLARE_EMAIL_REPLY_TO`) | notify module | no | no | `wrangler secret put` | readiness check |
| Alert webhook URL | secret | `process.env` `FEEDBACK_ALERT_WEBHOOK_URL` | alert module | no | no | `wrangler secret put` | delivery proof script |
| Alert bearer token | secret | `process.env` `FEEDBACK_ALERT_WEBHOOK_TOKEN` | alert module | no | no | `wrangler secret put` | delivery proof script |
| `EMAIL` binding | binding | `wrangler.jsonc` | cloudflare-email-client | no | no | Cloudflare dashboard | existing |
| Cron secrets (`CRON_SECRET` etc.) | secret | `process.env` | (not used by feedback sweep — in-process) | n/a | n/a | n/a | n/a |

**No raw bearer token, session cookie, OAuth state, magic link, password, or share token is involved in the feedback loop.** The `feedback.id` is a non-secret UUID (not a bearer) — knowing an `id` does not grant read (operator authz is role-based, not capability-based). No public route accepts a raw feedback `id` as a bearer.

## Privacy / data minimization

- **Collected**: type, severity, message (10–4000), optional project UUID, page_path, server-attached user identity. No new PII collected by the loop.
- **Derived/stored by loop**: SLA timestamps (`first_response_at`, `responded_at`, `alerted_at`) — operational metadata, not new PII content.
- **Logged**: redacted context (no raw message).
- **Egressed to email**: reporter `user_email` (recipient) + app-controlled subject/text containing the `message` (to the operator for triage; to the reporter as follow-up). Both are within the support-purpose consent basis.
- **Egressed to webhook**: type/severity/status/timestamps/page_path/user_id — **not the raw message** (webhook payloads are summary-only to minimize PII egress to a third-party endpoint). This is stricter than the email path because the webhook is a less-trusted sink.
- **Retention**: 365-day TTL, archived-only purge (DATA-02).
- **DSAR**: feedback rows must be reachable by erasure/export (couples to privacy-request pack P3).

## CSP / frame / referrer

No new public pages. The feedback page is auth-gated and inherits the app's existing CSP/referrer policy. The mailto fallback is a `mailto:` link (allowed). No new `target="_blank"` without `rel`.

## Security testing

- **Denial tests** (SEC-AUTHZ-01): extend `beta-admin-action-boundaries.test.ts` — non-admin cannot trigger notify/follow-up/sweep-touching actions.
- **Redaction tests** (SEC-DATA-01): assert logs from notify/sweep do not contain `message` cleartext.
- **HTML-injection test** (T-01): submit a `message` with `<script>`/HTML; assert the email body template escapes it.
- **Webhook SSRF guard** (T-04): assert `sendFeedbackAlert` rejects non-`https` URLs (unit test).

## Open security items

- Per-user rate limiting on submit (T-09): accept at beta; P2 follow-up (Cloudflare WAF/rate-limit rule).
- Bounce/complaint handling on reporter follow-up: out of scope for beta; Cloudflare Email metrics are the later proof surface.
