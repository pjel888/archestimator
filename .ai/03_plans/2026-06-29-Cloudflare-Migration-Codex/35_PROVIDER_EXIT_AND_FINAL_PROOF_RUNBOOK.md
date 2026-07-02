---
title: Provider Exit And Final Proof Runbook
plan_id: 2026-06-29-cloudflare-migration-codex
document: 35
last_updated: 2026-07-02
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
| Vercel | Historical hosting/build reference only; active runtime should not depend on it. | Safe to downgrade/cancel only after export, rollback-window decision, DNS check, and post-downgrade smoke. |
| Supabase | Historical Postgres/Auth/Storage source and migration archaeology; active app/runtime source should use D1/R2/Better Auth. | Keep until final logical export and rollback-retention decision are complete. Do not delete data before export verification. |
| Resend | Historical email provider; Cloudflare Email proof covers current outbound auth/proof email path. | Safe to downgrade/cancel after confirming no active API key use, preserving delivery/audit records needed for support. |

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
- Final exports are created and stored outside the repo.
- Owner accepts the rollback window and data-retention posture.
- Post-downgrade Cloudflare smoke passes.

Until then, the correct status is: Cloudflare app migration is effectively
complete for closed-beta runtime, while legacy provider account exit is
pending backup/export and billing cleanup execution.
