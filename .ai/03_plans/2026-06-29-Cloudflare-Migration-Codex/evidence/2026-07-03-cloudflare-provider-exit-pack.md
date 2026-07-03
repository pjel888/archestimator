# Cloudflare Provider Exit Pack

Status: **OPEN / NOT READY**

Generated: `2026-07-03T10:41:40.108Z`

App runtime exit prerequisites: **PASS**

Provider exit ready: **OPEN**

Operator evidence record: **MISSING**

Default operator record path: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.json`

Operator record template path: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.template.json`

## Gates

| Gate | Result | Evidence | Blocker |
| --- | --- | --- | --- |
| Cloudflare release gates green | PASS | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-release-gates.json |  |
| Cloudflare provider resources readable | PASS | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-provider-resource-readback.json |  |
| Cloudflare Email ready | PASS | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-email-readiness.json |  |
| Hosted auth matrix ready | PASS | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-cloudflare-hosted-auth-synthetic-cookie-matrix.json |  |
| No active Supabase/Vercel/Resend runtime dependency in scanned source | PASS | source scan |  |
| Provider exports or accepted-retention/accepted-loss decision recorded | OPEN | sanitized provider-exit operator record required | No repository evidence proves final exports are stored outside the repo or that accepted-retention/accepted-loss is recorded. |
| Resend account/API-key/domain status recorded | OPEN | sanitized provider-exit operator record required | Cloudflare Email is ready, but Resend account/API-key/sending-domain status is not recorded. |
| Obsolete provider secret removal/rotation recorded | OPEN | sanitized provider-exit operator record required | No evidence shows obsolete provider secrets were removed or rotated after exit decisions. |
| Post-exit Cloudflare smoke recorded | OPEN | sanitized provider-exit operator record required | No post-exit smoke exists after provider export/retention/secret decisions. |
| Real non-owner Google proof recorded | OPEN | sanitized provider-exit operator record required | No real non-owner Google account journey evidence is recorded. |
| Real recipient mailbox proof or accepted deferral recorded | OPEN | sanitized provider-exit operator record required | No real recipient mailbox receipt proof or accepted deferral is recorded. |

## Operator Record Diagnostics

This section names missing sanitized fields only. It does not echo operator
values from the provider-exit record.

| Gate Key | Result | Section | Status | Accepted Deferral | Missing Fields |
| --- | --- | --- | --- | --- | --- |
| exports-or-retention-decision-recorded | OPEN | finalExportsOrRetentionDecision | missing | no | operator record file |
| resend-account-status-recorded | OPEN | resendStatus | missing | no | operator record file |
| obsolete-secret-rotation-recorded | OPEN | obsoleteSecretRotation | missing | no | operator record file |
| post-exit-smoke-recorded | OPEN | postExitSmoke | missing | no | operator record file |
| non-owner-google-proof-recorded | OPEN | nonOwnerGoogleProof | missing | no | operator record file |
| recipient-mailbox-proof-or-deferral-recorded | OPEN | recipientMailboxProofOrDeferral | missing | no | operator record file |

## Active Legacy Provider Runtime Scan

Scanned paths: `src`, `worker.ts`, `package.json`, `wrangler.jsonc`

Blocker references: 0

Informational Resend lexical references: 117

| Provider | Location | Snippet |
| --- | --- | --- |
| none | n/a | n/a |

Informational references are retained because names such as invite resend actions
or legacy `resend_*` data columns are not Resend-service API usage by
themselves.

| Provider | Location | Snippet |
| --- | --- | --- |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:13 | resendSharedLinkRecipientEmail, |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:69 | resendingRecipientId: string \| null; |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:71 | pendingResend: LocalRecipient \| null; |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:90 | \| { type: "recipientResendApplied"; recipientId: string; ok: boolean; message: string } |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:93 | \| { type: "resendingRecipientChanged"; recipientId: string \| null } |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:95 | \| { type: "pendingResendChanged"; recipient: LocalRecipient \| null }; |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:103 | resendingRecipientId: null, |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:105 | pendingResend: null, |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:186 | case "recipientResendApplied": |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:214 | case "resendingRecipientChanged": |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:217 | resendingRecipientId: action.recipientId, |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:224 | case "pendingResendChanged": |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:227 | pendingResend: action.recipient, |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:243 | // when their token rotates on resend, so only those require a confirm. pending/sent resend directly. |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:244 | function resendNeedsConfirm(rec: LocalRecipient) { |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:301 | resendingRecipientId, |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:303 | pendingResend, |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:308 | // resending rotates it and downgrades their status. Gate those resends behind a confirm so the |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:309 | // owner doesn't silently invalidate an engaged recipient's link. pending/sent resend directly. |
| resend | src/components/workshop/publication/RecipientEmailComposer.tsx:426 | // and adopt `match.id` so a just-added chip immediately supports resend/remove (both require |

## Open Blockers

- Provider exports or accepted-retention/accepted-loss decision recorded: No repository evidence proves final exports are stored outside the repo or that accepted-retention/accepted-loss is recorded.
- Resend account/API-key/domain status recorded: Cloudflare Email is ready, but Resend account/API-key/sending-domain status is not recorded.
- Obsolete provider secret removal/rotation recorded: No evidence shows obsolete provider secrets were removed or rotated after exit decisions.
- Post-exit Cloudflare smoke recorded: No post-exit smoke exists after provider export/retention/secret decisions.
- Real non-owner Google proof recorded: No real non-owner Google account journey evidence is recorded.
- Real recipient mailbox proof or accepted deferral recorded: No real recipient mailbox receipt proof or accepted deferral is recorded.

## Boundary

Non-destructive provider-exit evidence pack. This script reads current source and sanitized evidence artifacts only. It does not read .env files, print secrets, create exports, deploy, rotate secrets, cancel providers, delete data, change DNS, or prove real mailbox/persona access.
