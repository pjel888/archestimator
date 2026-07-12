# Cloudflare Provider Exit Pack

Status: **OPEN / NOT READY**

Generated: `2026-07-05T05:07:29.224Z`

App runtime exit prerequisites: **PASS**

Provider exit ready: **OPEN**

Operator evidence record: **PRESENT**

Default operator record path: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.json`

Operator record template path: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.template.json`

## Gates

| Gate | Result | Evidence | Blocker |
| --- | --- | --- | --- |
| Cloudflare release gates green | PASS | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-release-gates.json |  |
| Cloudflare provider resources readable | PASS | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-provider-resource-readback.json |  |
| Cloudflare Email ready | PASS | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-email-readiness.json |  |
| Hosted auth matrix ready | PASS | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-cloudflare-hosted-auth-synthetic-cookie-matrix.json |  |
| No active Supabase/Vercel/Resend runtime dependency in scanned source | PASS | source scan |  |
| Latest deploy source smoke ready | PASS | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.json |  |
| Provider exports or accepted-retention/accepted-loss decision recorded | OPEN | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.json | No repository evidence proves final exports are stored outside the repo or that accepted-retention/accepted-loss is recorded. |
| Resend account/API-key/domain status recorded | PASS | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.json |  |
| Obsolete provider secret removal/rotation recorded | PASS | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.json |  |
| Post-exit Cloudflare smoke recorded | OPEN | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.json | No post-exit smoke exists after provider export/retention/secret decisions. |
| Real non-owner Google proof or accepted deferral recorded | OPEN | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.json | No real non-owner Google account journey evidence or accepted deferral is recorded. |
| Real recipient mailbox proof or accepted deferral recorded | OPEN | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.json | No real recipient mailbox receipt proof or accepted deferral is recorded. |

## Operator Record Diagnostics

This section names missing sanitized fields only. It does not echo operator
values from the provider-exit record.

| Gate Key | Result | Section | Status | Accepted Deferral | Missing Fields |
| --- | --- | --- | --- | --- | --- |
| exports-or-retention-decision-recorded | OPEN | finalExportsOrRetentionDecision | missing | no | finalExportsOrRetentionDecision.status=recorded, finalExportsOrRetentionDecision.decision(exported\|accepted-retention\|accepted-loss), finalExportsOrRetentionDecision.acceptedBy, finalExportsOrRetentionDecision.evidenceSource, finalExportsOrRetentionDecision.rollbackDecision |
| resend-account-status-recorded | PASS | resendStatus | recorded | no | none |
| obsolete-secret-rotation-recorded | PASS | obsoleteSecretRotation | recorded | no | none |
| post-exit-smoke-recorded | OPEN | postExitSmoke | missing | no | postExitSmoke.status=recorded, postExitSmoke.cloudflareSmokePassed=true, postExitSmoke.runAt, postExitSmoke.commands[], postExitSmoke.evidenceSource |
| non-owner-google-proof-recorded | OPEN | nonOwnerGoogleProof | missing | no | nonOwnerGoogleProof.status=recorded\|accepted-deferral, nonOwnerGoogleProof.policyOutcome, nonOwnerGoogleProof.evidenceSource, nonOwnerGoogleProof.noCredentialsOrCookiesRecorded=true |
| recipient-mailbox-proof-or-deferral-recorded | OPEN | recipientMailboxProofOrDeferral | missing | no | recipientMailboxProofOrDeferral.status=recorded\|accepted-deferral, recipientMailboxProofOrDeferral.mailboxReceiptObserved=true, recipientMailboxProofOrDeferral.recipientScopedActionObserved=true, recipientMailboxProofOrDeferral.noPrivateEmailContentRecorded=true, recipientMailboxProofOrDeferral.evidenceSource |

## Active Legacy Provider Runtime Scan

Scanned paths: `src`, `worker.ts`, `package.json`, `bun.lock`, `wrangler.jsonc`, `cloudflare-env.d.ts`, `next.config.ts`, `open-next.config.ts`, `src/middleware.ts`

Blocker references: 0

Informational Resend lexical references: 99

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
- Post-exit Cloudflare smoke recorded: No post-exit smoke exists after provider export/retention/secret decisions.
- Real non-owner Google proof or accepted deferral recorded: No real non-owner Google account journey evidence or accepted deferral is recorded.
- Real recipient mailbox proof or accepted deferral recorded: No real recipient mailbox receipt proof or accepted deferral is recorded.

## Boundary

Non-destructive provider-exit evidence pack. This script reads current source and sanitized evidence artifacts only. It does not read .env files, print secrets, create exports, deploy, rotate secrets, cancel providers, delete data, change DNS, or prove real mailbox/persona access.
