---
title: Provider Exit And Final Proof Runbook
plan_id: 2026-06-29-cloudflare-migration-codex
document: 35
last_updated: 2026-07-03
---

# Provider Exit And Final Proof Runbook

## Purpose

Use this runbook before downgrading, cancelling, deleting, or removing secrets
for legacy Vercel, Supabase, or Resend resources. The app is now served from
Cloudflare, with active runtime proof for Workers/OpenNext, D1, R2, Durable
Objects, Better Auth, Cloudflare Email, and hosted workflow coverage. Provider
exit is still an operations step, not a code migration shortcut.

## Current Provider Posture

| Provider | Current role after Cloudflare migration | Exit posture |
| --- | --- | --- |
| Vercel | Historical hosting/build reference only; active runtime should not depend on it. | Owner reports subscription cancellation is already done; still preserve export/rollback-window, DNS, and post-exit smoke evidence before full provider-exit closure. |
| Supabase | Historical Postgres/Auth/Storage source and migration archaeology; active app/runtime source should use D1/R2/Better Auth. | Owner reports subscription cancellation is already done; still preserve final logical export or accepted-retention/accepted-loss decision before full provider-exit closure. Do not delete data before export verification or an explicit owner risk decision. |
| Resend | Historical email provider; Cloudflare Email proof covers current outbound auth/proof email path. | Safe to downgrade/cancel after confirming no active API key use, preserving delivery/audit records needed for support. |

2026-07-03 ledger note: the follow-up QA ledger records owner confirmation
that Vercel and Supabase subscriptions have already been cancelled. This
reduces billing cleanup risk, but it is not by itself a complete provider-exit
evidence pack: repository evidence still needs to preserve the export/backup
posture, rollback/data-retention decision, Resend status, obsolete-secret
handling, and post-exit Cloudflare smoke before the full migration goal is
closed.

2026-07-03 non-destructive provider-exit pack:
`evidence/2026-07-03-cloudflare-provider-exit-pack.*` now records that app
runtime exit prerequisites are not yet ready for strict completion because the
latest deploy/source-smoke gate is open. Release gates, Cloudflare provider
resource readback, Cloudflare Email readiness, hosted auth matrix, and active
legacy-provider runtime scan all pass, but the latest deploy evidence does not
record the deployed git commit and predates current `HEAD`. Proof-tooling-only
`package.json` script additions are filtered from runtime dirtiness; `bun.lock`
and package dependency/build/runtime changes still block. It intentionally keeps full
provider exit `OPEN / NOT READY` because latest deploy/source smoke, final
exports or accepted-retention/loss decision, Resend account/API-key/domain
status, obsolete-secret removal/rotation, post-exit Cloudflare smoke,
non-owner Google proof, and real recipient mailbox proof or accepted deferral
remain unproven.

The latest pack was regenerated at `2026-07-03T14:46:59.752Z` after refreshing
the latest deploy/source-smoke artifact at `2026-07-03T14:46:55.585Z`,
tightening the operator template's sanitized evidence-source requirements,
hardening proof-artifact JSON parse handling, ignoring proof-tooling-only
`package.json` script additions as runtime dirtiness, and widening the active
legacy-provider runtime scan to deploy-relevant source/config files including
`bun.lock` and `src/middleware.ts`. No real
operator record is present yet, so provider exit remains open. This refresh
also consumes the current `2026-07-01` provider-resource readback artifact and
labels non-owner Google closure as real proof or accepted deferral.
Credential-free hosted performance and release gates remain blocker-free for
app runtime; strict public p95 stayed a watch item, not a provider-exit blocker.

## Sanitized Operator Record

`bun run cf:provider-exit-pack` now optionally reads
`PROVIDER_EXIT_OPERATOR_RECORD_FILE`, or this default path when the environment
variable is unset:

`evidence/2026-07-03-cloudflare-provider-exit-operator-record.json`

Run `bun run cf:provider-exit-operator-template` to refresh the provider-exit
pack and write the sanitized starter template at:

`evidence/2026-07-03-cloudflare-provider-exit-operator-record.template.json`

The generated pack also includes an "Operator Record Diagnostics" table that
names missing fields only. It does not echo operator-record values.

This record is the repo-safe bridge between external provider/persona evidence
and the provider-exit ledger. It must contain only sanitized booleans,
timestamps, decision labels, redacted provider-status summaries, and pointers
to evidence stored outside the repo. Do not commit raw exports, SQL dumps,
secret values, cookies, mailbox content, provider tokens, or private screenshots.

The pack will close external gates only when the matching sanitized sections
are present:

- `finalExportsOrRetentionDecision`: `status: "recorded"`, decision
  `exported`, `accepted-retention`, or `accepted-loss`, an `acceptedBy` value,
  a sanitized `evidenceSource`, and a rollback decision. Exported decisions
  also need a non-secret backup location description.
- `resendStatus`: recorded account plan, account evidence source, API-key
  status, API-key evidence source, sending-domain status, and domain evidence
  source summaries.
- `obsoleteSecretRotation`: recorded Cloudflare secret-name review, obsolete
  secret removal/rotation, `secretValuesNotRecorded: true`, and a sanitized
  `evidenceSource`.
- `postExitSmoke`: recorded smoke timestamp, command list, and
  `cloudflareSmokePassed: true`, plus a sanitized `evidenceSource`.
- `nonOwnerGoogleProof`: recorded non-owner outcome and evidence source with
  no credentials/cookies recorded, or an explicitly accepted deferral.
- `recipientMailboxProofOrDeferral`: recorded mailbox receipt plus
  recipient-scoped action proof with no private mailbox content recorded and a
  sanitized `evidenceSource`, or an explicitly accepted deferral.

For the latest deploy/source-smoke gate, run
`bun run cf:latest-deploy-source-smoke-template` to write the starter template:

`evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.template.json`

This template is not proof. It records the current source commit and keeps the
production-version, hosted-route, and release-gate proof fields open until a
real current-source deploy or promote path and post-deploy smoke fills them.

## Hard Rules

- Do not delete or cancel a provider before creating an export/snapshot and a
  rollback decision record.
- Do not remove secrets from Cloudflare or local deployment config until the
  matching provider has no active runtime use and post-removal smoke passes.
- Do not commit provider exports, secrets, API keys, database dumps, or raw user
  data into the repository.
- Keep at least one rollback path until owner accepts the risk of irreversible
  provider deletion.

## Exit Sequence

1. Freeze app/provider changes for the exit window.
2. Record active Cloudflare evidence: release gates, hosted route proof,
   hosted auth proof, upload/R2 proof, D1 workflow proof, email proof, and
   provider-resource readback.
3. Export legacy provider data:
   - Supabase: schema, data, auth-related records still needed for audit,
     storage inventory, and any final logical dump.
   - Vercel: deployment metadata, environment-variable names, domain settings,
     and any rollback deployment reference.
   - Resend: API key inventory, sending-domain status, suppression/bounce logs
     if available, and recent delivery evidence needed for support.
4. Store exports outside the repo in the owner-approved secure backup location.
5. Run one final Cloudflare smoke pass on `https://archestimator.com`:
   - signed-out protected-route redirect,
   - owner Google sign-in,
   - magic-link request/receipt if mailbox is available,
   - project/estimate read route,
   - R2 upload-runtime probe,
   - public share route,
   - release gates.
6. Downgrade or cancel legacy paid plans in this order:
   - Resend after Cloudflare Email proof is current.
   - Vercel after DNS/custom-domain and deployment rollback choices are
     recorded.
   - Supabase after final export and rollback-retention choice are recorded.
7. Remove or rotate obsolete provider secrets after cancellation/downgrade, then
   rerun the Cloudflare smoke pass.
8. Append the final evidence and decision to the Cloudflare migration ledgers.

## Current Non-Destructive Final Proof Status

- Google OAuth client `4723547505-0keh5nqvk40b7rv2meror8opnpjm10s8.apps.googleusercontent.com`
  now includes production apex/`www` origins, localhost/127.0.0.1 dev origins
  for ports `3000` and `8787`, and matching `/api/auth/callback/google`
  redirect URIs.
- Google Auth Platform Audience is now `In production`, user type `External`.
  The prior Google-side non-owner test-user blocker is removed; app access still
  depends on the Cloudflare/D1 closed-beta gate after auth.
- A full real non-owner Google account completion remains an external-persona
  proof item because this run did not have a second human Google session/inbox.

Evidence: `evidence/2026-07-02-google-oauth-local-production-readback.*`.

## Exit Readiness Decision

Provider downgrade/cancellation is ready to schedule only when:

- Current Cloudflare release gates are green.
- Final exports are created and stored outside the repo, or the owner records
  an explicit accepted-retention/accepted-loss decision for already-cancelled
  historical providers.
- Owner accepts the rollback window and data-retention posture.
- Post-downgrade Cloudflare smoke passes.

Until then, the correct status is: Cloudflare app migration is effectively
complete for closed-beta runtime, while legacy provider account exit is
pending backup/export, Resend status, obsolete-secret, and post-exit-smoke
evidence closure.
