# Security Primitive And RLS Binding

Date: 2026-06-22

## 1. Purpose And Relationship To Doc 05

`05-security-data-and-provider-blast-radius.md` keeps the **template + authority rule**: it defines the matrix *shape* (Surface | Route/action/RPC/table/bucket | Actor | Scope key | Required role/token | RLS/policy proof | Fail-closed behavior | Test/proof) and the authority rule (product persona is not authority; authority comes from the access path plus workspace membership, project collaboration role, admin/operator entitlement, share token, recipient session/password state, or public route policy).

What doc 05 did **not** do: it left the matrix as a single unfilled "Template row" and never bound any of the real, already-existing security primitives to the 16 high-risk blast-radius surfaces its checklist gates. This document holds the **filled matrix** (Section 2) and the **primitive bindings** (Sections 3-6) that doc 05's stop condition requires. Doc 05 should be read as the rule; this doc is read as the evidence that the rule has been applied per surface.

Honesty note (this is planning, not execution proof): every `file:symbol` reference in this document was grepped and confirmed to exist on 2026-06-22. The cited test files exist in `tests/vitest`. **No test was run this pass, and no hosted/browser/provider behavior was observed.** Residuals are named in Section 7. Where a cell cannot be filled from verified information, it says `TODO-verify` rather than inventing a migration ID, policy name, or column that was not confirmed.

## 2. Filled Authz/RLS Matrix

Columns follow doc 05's template exactly. Actor names use `10-access-path-and-persona-taxonomy.md` (canonical access paths, not personas).

| Surface | Route/action/RPC/table/bucket | Actor | Scope key | Required role/token | RLS/policy proof | Fail-closed behavior | Test/proof |
|---|---|---|---|---|---|---|---|
| Share password unlock | `src/app/api/share/[token]/password/route.ts`; scrypt `passwordHashPrefix` in `src/lib/publication/security.ts` | Shared-Link Recipient (password-locked link) | share token + recipient token | Valid share token + correct password | `passwordHashPrefix` (scrypt) compares stored prefix; on success issues publication-access session | Wrong/missing password does not unlock; no enumeration signal | `tests/vitest/project-publication-security-hardening.test.ts`; `TV-SHARE-RECIPIENT` |
| Share session establish/refresh | `src/app/api/share/[token]/session/route.ts`; publication-access cookie set via `src/lib/publication/security.ts` | Shared-Link Recipient | share token + recipient token | Valid (token, recipient) pair + session/password state | Session bound to publication-access cookie; `share-no-store-invariants` asserts cache headers | Revoked/expired/no-session state fails closed; no-store persists | `tests/vitest/share-no-store-invariants.test.ts`; `TV-SHARE-RECIPIENT` |
| Share comment (recipient) | `src/app/api/share/[token]/comment/route.ts` -> `submit_client_response` RPC | Shared-Link Recipient | share `token_hash` + `recipient_token_hash` | Valid recipient session + CSRF | `submit_client_response` RPC (migration `20260621120000`) validates BOTH `token_hash` AND `recipient_token_hash`; RPC granted only to `service_role` (revoked from `public`/`anon`/`authenticated`) | Invalid/revoked recipient -> RPC rejects; no write | `tests/vitest/project-publication-security-hardening.test.ts`; `TV-SHARE-RECIPIENT` |
| Share decision (accept/decline) | `src/app/api/share/[token]/decision/route.ts` -> `submit_client_response` RPC | Shared-Link Recipient | `token_hash` + `recipient_token_hash` | Valid recipient session + CSRF | Same RPC (`submit_client_response`, migration `20260621120000`) authorizes the recipient action server-side | Cross-recipient or revoked token -> rejected; conflict copy `TODO-verify` (idempotency semantics not run) | `tests/vitest/share/share-page-decision-anonymous.test.tsx`; `TV-SHARE-RECIPIENT` |
| Share unsubscribe | `src/app/api/share/[token]/unsubscribe/route.ts` | Shared-Link Recipient | share token + recipient token | Valid recipient token + same-origin POST + CSRF | GET returns an interstitial only (email-client prefetch/scanner cannot silently mutate); mutation requires explicit POST | Invalid/expired token -> 400/404 text, no account leakage | `tests/vitest/share-unsubscribe-interstitial.test.ts`; `TV-SHARE-RECIPIENT` |
| Share events / open-count pixels | `src/app/api/share/[token]/events/route.ts` | Shared-Link Recipient (and email-client scanner) | share token | Valid share token | No-store headers; privacy-safe event design asserted by abuse case (doc 05) | Leaky event payload (recipient email/IP) `TODO-verify` against real handler | `tests/vitest/share-snapshot-redaction.test.tsx`; `TV-SHARE-RECIPIENT` |
| AI ask | `src/app/api/ai/ask/route.ts`; `checkAiAskQuota` + `AiRequestUserContext` in `src/lib/ai/rate-limit.ts` | Primary App User (authenticated) | user id / workspace | Authenticated session + `AiRequestUserContext` | `checkAiAskQuota` (10/min, 60/hr) writes/reads `security_rate_limit_events` (migration `20260601003000`) | Over-quota / unauthenticated / disabled-provider -> fail closed | `tests/vitest/ai-auth-guard.test.ts`; `tests/vitest/ai-package-builder-security-contract.test.ts`; `TV-AI` |
| AI package builder | `src/app/api/ai/package-builder/route.ts` | Primary App User | project/estimate context | Authenticated session | Drafts require human review before apply (doc 05 AI row); rate-limit posture `TODO-verify` (route exists; whether it shares the ask quota bucket is not confirmed) | Disabled/quota/provider error -> safe draft/empty state | `tests/vitest/ai-package-builder-security-contract.test.ts`; `tests/vitest/ai-package-builder-draft.test.ts`; `TV-AI` |
| Project images upload | `src/app/api/projects/images/route.ts` (+ storage bucket) | Primary App User | workspace/project | Authenticated + workspace membership | Bucket scoping by workspace; MIME/size validation asserted by doc 05 asset abuse case | Invalid MIME/size or cross-workspace -> rejected; failed asset -> recipient-safe copy | `tests/vitest/storage-cleanup-allowlist.test.ts`; `tests/vitest/estimate-image-url.test.ts`; `TV-ASSET-API` |
| Component-library images | `src/app/api/component-library/images/route.ts` | Primary App User (Cost Library Manager) | library/workspace | Authenticated | Bucket scoping; signed-URL lifetime asserted by doc 05 | Invalid MIME/size rejected; failed asset fallback | `tests/vitest/storage-cleanup-allowlist.test.ts`; `TV-ASSET-API`; `TV-LIBRARY-SOURCING` |
| Component-library attachments | `src/app/api/component-library/attachments/route.ts` | Primary App User (Cost Library Manager / Curator) | library/workspace | Authenticated | Attachment governance is `DEC-UX-034-ATTACHMENT-APPROVAL` (lightweight first step); `current`/reviewed metadata before approve/reject | Unreviewed attachment not promoted to `current` | `TV-LIBRARY-SOURCING` (attachment tests `TODO-verify` when built) |
| Resend webhook ingress | `src/app/api/webhooks/resend/route.ts` | Resend (external provider) | webhook route | `RESEND_WEBHOOK_SECRET` + valid svix signature | `verifyResendWebhookPayload` verifies svix headers; 413 size cap rejects oversized payloads | Forged/oversized/unsigned delivery -> rejected, no state mutation | `tests/vitest/project-publication-security-hardening.test.ts` (webhook assertion `TODO-verify` by name); `TV-OPS-SUPPORT` |
| Beta allowlist admin | `src/app/workshop/settings/beta-users/page.tsx` (+ admin server actions) | Support/Admin Operator | admin entitlement | Admin/operator entitlement (least privilege) | Operator-only surface; doc 05 admin boundary: no raw DB spelunking as normal UX; audit trail required | Non-operator cannot read or mutate allowlist | `tests/vitest/closed-beta-allowlist-admin-ui.test.tsx`; `TV-WORKSHOP-ADMIN` |
| Invite accept | `src/app/invite/[token]/accept/route.ts` | Project Collaborator | invite token | Valid invite token + correct account | Invite token state validation; wrong-account flow fails closed | Expired/revoked/wrong-account -> repair copy, no silent accept | `tests/vitest/project-invite-entry-route.test.ts`; `tests/vitest/pending-invite-cookie.test.ts`; `TV-INVITE` |
| Invite continue | `src/app/invite/[token]/continue/route.ts` | Project Collaborator | invite token | Validated invite + accepted session | Continuation bound to validated invite state | Unvalidated invite cannot continue | `tests/vitest/pending-invite-cookie.test.ts`; `TV-INVITE` |
| Invite sign-out (wrong-account repair) | `src/app/invite/[token]/sign-out/route.ts` | Project Collaborator | invite token | Invite token + wrong-account state | Wrong-account repair path; no cross-account session bleed | Wrong account -> sign-out + recovery copy | `tests/vitest/project-invite-entry-schema.test.ts`; `TV-INVITE` |

Coverage note: rows cover the surfaces doc 05's "Blast-Radius Checklist" enumerates for `UX-019`/`UX-020`/`UX-021`/`UX-022`/`UX-024`/`UX-029`/`UX-031`/`UX-032`/`UX-033`/`UX-034`/`UX-036`/`UX-038`/`UX-039`/`UX-040`/`UX-043`. Cells marked `TODO-verify` are named residuals (Section 7), not invented facts.

## 3. Bound Security Primitives

| Primitive | file:symbol | Mitigates which abuse case |
|---|---|---|
| HMAC-SHA256 `hashPublicationToken` | `src/lib/publication/security.ts: hashPublicationToken` | Share/invite token integrity and brute-force resistance (high-entropy, unguessable link). |
| AES-256-GCM `encryptPublicationToken` | `src/lib/publication/security.ts: encryptPublicationToken` | Token confidentiality at rest (token material not stored in cleartext). |
| scrypt `passwordHashPrefix` | `src/lib/publication/security.ts: passwordHashPrefix` | Password lockout on password-protected share links (offline-guess resistance). |
| `timingSafeEqual` `constantTimeEqual` | `src/lib/publication/security.ts: constantTimeEqual` | Timing-attack resistance on token/password comparisons. |
| svix + `RESEND_WEBHOOK_SECRET` `verifyResendWebhookPayload` | `src/app/api/webhooks/resend/route.ts: verifyResendWebhookPayload` (+ 413 size cap) | Forged delivery webhook (Resend impersonation, replay). |
| `submit_client_response` `token_hash` + `recipient_token_hash` validation | supabase migration `20260621120000_shared_link_d1_d11_hardening.sql` (function `public.submit_client_response`, granted to `service_role` only) | Recipient action authorization (one recipient cannot act as another; revoked recipient cannot comment/decide). |
| `security_rate_limit_events` + `checkAiAskQuota` | `src/lib/ai/rate-limit.ts: checkAiAskQuota`; table from migration `20260601003000_security_rate_limit_events` | AI quota abuse (10/min, 60/hr per `AiRequestUserContext`). |
| Share/publication durable limiter scopes | `src/lib/publication/public-repository.ts` limiter helpers and share API routes | Share recipient session/comment/decision/read/unsubscribe abuse; current source includes broader durable limiter coverage than the older packet documented. |
| Invite/landing durable limiter scopes | `src/lib/collaboration/invite-entry.ts`; `src/lib/landing/rate-limit.ts` | Invite-entry and landing/beta request abuse using Postgres-native rate-limit events. |
| `hashAiAuditValue` | `src/lib/ai/audit.ts: hashAiAuditValue` | PII / prompt-content redaction in AI telemetry (the only concrete redaction primitive today). |

Primitive-scope honesty: these eight primitives exist and are cited exactly. They are not a complete security control set — they are the verified primitives the packet can cite without invention. Rate-limit and redaction gaps are named in Sections 4-6.

## 4. Rate-Limit Truth Table

| Action | Rate-limited today? | Mechanism / decision |
|---|---|---|
| AI ask | YES | `checkAiAskQuota` 10/min, 60/hr via `security_rate_limit_events` (`src/lib/ai/rate-limit.ts`). |
| Share recipient comment | YES | Current source uses Postgres durable limiter scopes in `src/lib/publication/public-repository.ts`, called by `src/app/api/share/[token]/comment/route.ts`. `DEC-UX-RL-QUOTAS` Policy B says comments are first-class quota proof. |
| Share recipient decision (accept/decline) | YES | Current source uses Postgres durable limiter scopes in `src/lib/publication/public-repository.ts`, called by `src/app/api/share/[token]/decision/route.ts`. `DEC-UX-RL-QUOTAS` Policy B says decisions are first-class quota proof. |
| Share recipient comment/decision reads | YES | Current source has read limiter scopes for comment/decision reads. Preserve this broader coverage when adjusting quotas. |
| Share session establish/refresh | YES | Current source has share session limiter scope. Verify quotas before claiming hosted abuse proof. |
| Share recipient unsubscribe | YES | Current source has unsubscribe limiter scope. Verify quotas before claiming hosted abuse proof. |
| Share password unlock attempts | `TODO-verify` | scrypt `passwordHashPrefix` validates offline-resistance; confirm online attempt throttling/lockout against current route before claiming proof. |
| Landing/beta access request paths | YES / `TODO-verify coverage` | `src/lib/landing/rate-limit.ts` uses Postgres-native events. Confirm exact beta-access route coverage before claiming all request surfaces are quota-proven. |
| Invite accepts / invite entry | YES / `TODO-verify coverage` | `src/lib/collaboration/invite-entry.ts` records/checks Postgres rate-limit events. Confirm accept/continue route boundaries before claiming all invite paths are quota-proven. |
| Webhook ingress | NO per-source quota | `verifyResendWebhookPayload` + 413 size cap prevent forgery/oversize; no per-source request quota confirmed. |
| AI package-builder | `TODO-verify` | Route exists; whether it shares the ask quota bucket is not confirmed. |

Decision posture: `DEC-UX-RL-QUOTAS` is accepted as Policy B: share comments and decisions first. Current source already contains broader Postgres-native durable limiter coverage. Future quota changes must inspect and preserve that coverage rather than reverting to the stale "only AI ask is rate-limited" posture.

## 5. Data-Classification Enforcement Posture

Doc 05's 8-class taxonomy (Public, Account PII, Project commercial data, Location/address, Tokens/secrets, Files/assets, AI content, Support/legal) is currently **advisory, not enforced**.

- There is no enum, Zod schema, middleware, RLS policy, or runtime guard in `src/` that tags rows/requests with a data class and enforces the doc 05 handling rule per class.
- A grep for data-classification terms in `src/` returns no enforcement code (no classifier module, no tagged types).
- The only concrete redaction primitive today is `hashAiAuditValue` (`src/lib/ai/audit.ts`), and it is scoped to AI audit values, not a general classifier.

Do not present doc 05's classification table as an enforced control. It is a handling *intent* that implementations must wire explicitly. Promotion of any row that claims "PII/token/address redaction enforced" requires either a real classifier/guard or an explicit `DEC-UX-DATA-CLASSIFICATION` posture (`DEC-UX-DATA-CLASSIFICATION`: data classification is advisory until a redaction guard exists).

## 6. Redaction & Telemetry Surface

Doc 05's blast-radius question 5 names where tokens/emails/addresses/proposal contents could leak. This section binds that question to concrete telemetry surfaces and the gate required before promotion.

| Leak surface | What could leak | Current gate | Required before promotion |
|---|---|---|---|
| Server logs (`console.*`, Next server logs) | share/invite tokens, recipient email, project address, proposal contents | `hashAiAuditValue` covers AI audit only; no general log scrubber confirmed | Scrub plan that redacts tokens/emails/addresses before any log line ships; `TODO-verify` against real logger usage |
| Provider errors (Resend / Maps / AI / Supabase) bounced into responses or logs | raw email, address, prompt fragments, token in error string | `TODO-verify` (provider error surfacing not audited) | Provider-error sanitizer before user-visible or logged output |
| Support / feedback email payload (`mailto` / contact form) | PII overcollection, secrets pasted by user | `tests/vitest/contact-form-mailto.test.tsx` covers mailto shape, not payload redaction | Size limit + no-secret-in-payload guard (doc 05 feedback abuse case) |
| Analytics / telemetry (Vercel Web Analytics `<VercelWebAnalytics />` + Speed Insights `<SpeedInsights />` wired in `src/app/layout.tsx`; redaction seam `redactVercelAnalyticsEvent` in `src/components/analytics/VercelWebAnalytics.tsx`) | URL containing share token, address query, proposal slug | `TODO-verify` (the `beforeSend` seam exists; no confirmed full allowlist/denylist on analytics payload) | Redaction designed BEFORE metrics ship — cross-link to doc 13 instrumentation plan; analytics must strip tokens/emails/addresses before dispatch |
| Webhook logged payload | recipient email, delivery metadata | Resend route minimizes logged payload (doc 05 provider note); concrete scrub `TODO-verify` | Confirm only non-PII fields are logged |

Cross-link: doc 13 (planned) instrumentation plan must define the redaction allowlist/denylist so telemetry is redacted by construction, not retroactively. Until doc 13's redaction contract exists, no UX row may claim "telemetry is privacy-safe" as proven.

## 7. Residuals (Cannot Be Satisfied By A Planning Packet)

These are named honestly. None are fake-claimed as execution-proven.

- **Live hosted share-password behavior** not observed this pass: scrypt `passwordHashPrefix` exists and the route exists, but the unlock-against-hosted-DB path (correct/wrong/locked states on the real provider `ebxxqidacheyapmmzavr`) requires `TV-SHARE-RECIPIENT` browser/hosted proof, not run here.
- **Live hosted asset (project/component image, attachment) behavior** not observed: routes and storage tests exist; hosted signed-URL lifetime, MIME rejection, and failed-asset fallback require `TV-ASSET-API` storage/provider proof.
- **Live webhook verification** not observed: `verifyResendWebhookPayload` + `RESEND_WEBHOOK_SECRET` + 413 cap exist in source; a real signed Resend delivery (and a forged one) must be replayed against the hosted route for `TV-OPS-SUPPORT` to pass.
- **Cited security tests exist but were not run this pass**: `tests/vitest/project-publication-security-hardening.test.ts`, `tests/vitest/share-no-store-invariants.test.ts`, `tests/vitest/ai-package-builder-security-contract.test.ts`, `tests/vitest/share-unsubscribe-interstitial.test.ts`, `tests/vitest/share-snapshot-redaction.test.tsx`, `tests/vitest/ai-auth-guard.test.ts` all exist (grepped) — their passing status is a `TODO-verify` residual, not asserted here.
- **Rate-limit coverage proof** (Section 4) is accepted under `DEC-UX-RL-QUOTAS` Policy B for share comments and decisions, with broader current-source limiter coverage to preserve. Hosted quota behavior and any remaining beta/invite edge coverage still require targeted proof before promotion.
- **Data-classification enforcement** is advisory (Section 5) under `DEC-UX-DATA-CLASSIFICATION`; no classifier/guard exists in `src/`.
- **Redaction-in-telemetry contract** depends on doc 13 (planned); analytics is already wired (`src/app/layout.tsx`) so this is a live exposure until the redaction allowlist ships.
- **`submit_client_response` RPC** is confirmed in migration `20260621120000` (params `p_token_hash` + `p_recipient_token_hash`; `revoke ... from public, anon, authenticated`; `grant execute ... to service_role` only) and is invoked by its real name `"submit_client_response"` at `src/lib/publication/public-repository.ts:1289`, with args typed against the generated `Database["public"]["Functions"]["submit_client_response"]["Args"]` signature. No obfuscation. (Independently verified 2026-06-22 by grep of the migration and the call site.)
- **Share events/open-count privacy** (recipient email/IP leak via event pixels) is asserted by doc 05's abuse case but not verified against the real `events/route.ts` handler; `TODO-verify`.
