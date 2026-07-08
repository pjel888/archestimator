# 08 — Security, Privacy, and Threat Model

This pack **does not change** authz, credential crypto, or rate limits. It improves owner-side **surfacing** of existing security-relevant behavior (resend limits, rotate/revoke consequences, delivery honesty) and adds a mobile recovery affordance (copy URL). The threat model below audits the in-scope changes for new risk.

---

## Trust boundaries & actors
- **Owner/sender (manager, rank ≥ 30):** authenticated via Better Auth; can generate/copy/email/resend/revoke/rotate.
- **Read-only viewer:** `canReadPublisherRosterProject` but not manage; `clientLinkPath` redacted.
- **Recipient (downstream):** unauthenticated against Better Auth on public routes; authorized by token hash + recipient session cookie. Owned by share/recipient packs.
- **Platform ceo/admin:** bypass membership (existing).

## Threat model for in-scope changes

| Threat | Applicability | Current control | This pack's impact | Residual risk |
|---|---|---|---|---|
| Owner copies link, leaks it | applies | rotate/revoke exist; confirm-gated | **improves**: confirm dialogs now explicitly state consequences (rotate invalidates recipients; revoke blocks access) → fewer accidental leaks | low |
| Resend abuse (spam recipient) | applies | 1/5min rate limit per user+pub+recipient (`actions.ts:1243,261-262`) | **improves**: rate-limit surfaced as specific "try in N min" (today generic error risk) | low |
| Email enumeration via add | applies | dedup + bounded concurrency + self-invite block | unchanged | low |
| Unauthorized manager action (Server Action direct POST) | applies | `assertProjectPublicationManager` every action | unchanged (audit confirms) | low |
| Mobile "copy URL" leaks token in shared clipboard/shoulder-surf | **NEW (this pack)** | n/a | mitigations: copy URL only on owner action (not auto); URL is the publisher page URL (not the raw share token); the raw share link copy already exists today with the same exposure | low (no new raw-token exposure) |
| Read-only viewer sees raw link | applies | `drawer-actions.ts:27-37` redaction | unchanged | low |
| `delivery_status` misleads owner (false "opened") | applies | ASSUMP-4 (no webhook) | **improves**: honest labels (consumes workflow pack) | low |
| CSRF on owner actions | n/a for Server Actions (Next handles); applies to public POST | public CSRF exists | unchanged | low |
| XSS via recipient email / status | applies | email chip rendering | unchanged (no new HTML injection) | low |
| Secret exposure in client bundle | applies | `encrypted_token` server-only | unchanged | low |
| Logging of sensitive data | applies | `observability/redact` | **improves**: audit/proof design must redact raw tokens/emails in any new structured logs (REQ-OPS) | low |

## New-risk analysis: "copy current URL" (Option B mobile recovery)
- **What is copied:** the **publisher page URL** (`/workshop/publisher?status=...&drawer=<projectId>&tab=recipients`), **not** the raw `/share/<token>`. The `drawer`/`tab` params are project IDs + tab names, not credentials.
- **Exposure:** identical to the owner already navigating to that URL on desktop. No new credential material is placed on the clipboard beyond what `handleCopyLink` already copies (the share link).
- **Verdict:** no new secret exposure. Safe.

## Privacy / data minimization
- Owner-side activity surfacing uses `project_publication_events` which already stores peppered `ip_hash`/`user_agent_hash` (not raw PII). This pack surfaces those events to the owner; no new PII is collected.
- Recipient emails are already stored (`shared_link_recipients.email`); this pack does not add new recipient data.
- Any new structured log (REQ-OPS) must redact: raw tokens, full emails (use hash/prefix), IP (use existing peppered hash). See `09`.

## Abuse resistance
- Resend rate limit (existing) is the primary abuse throttle for the sender surface; this pack makes it **visible**, not weaker.
- No new unauthenticated endpoint. No new public surface.
- Revoke/rotate confirm-gates reduce accidental mass-invalidation.

## Security testing expectations
- Denial tests: read-only viewer cannot copy (`clientLinkPath` redacted); non-manager Server Action call → `assertProjectPublicationManager` throws (existing `publisher-rbac.test.ts`).
- Resend rate-limit denial test (extend `project-publication-rotate-resend.test.ts`): second resend within 5min → denied with window message.
- No new auth-bypass surface introduced.

## Incident-response implications
- Rotate/revoke are the owner's incident tools for a leaked link. This pack improves their discoverability and confirmation clarity → positive IR impact.
- No new alerting required for planning; `09` defines optional structured-log events.
