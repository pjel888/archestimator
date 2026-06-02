# MVP Closed Beta Manual Proof Packet - 2026-06-02

Status: consolidated packet from current artifacts; external closed beta remains **NO-GO**.

This packet follows `48-manual-proof-packet-template.md` as the dated folder README shape. It consolidates current local, read-only provider, DNS, and blocked/manual proof artifacts already stored in this folder. It does not add new hosted/provider/manual proof, does not mutate production state, and does not approve launch.

## Run Metadata

| Field | Value |
| --- | --- |
| Date | 2026-06-02 |
| Environment | Local repo evidence plus read-only Vercel/Supabase/DNS checks |
| App URL | Local app plus protected Vercel preview evidence where listed |
| Commit tested | Local validation/build anchor `353dd48`; latest read-only Vercel/Supabase provider anchor `4fdf0de`; latest full local E2E refresh anchor `bb9006d` |
| Operator | Codex |
| Test accounts | Sanitized local/dev-auth and temporary fixture accounts only where artifact says so |
| Related deployment | `dpl_Fj4vLSMVm9iUqUFxcYe7fjsYmT4G`; custom domains still point at older production deployment `archestimator-3ser9ty2w-philipjonlewis-projects.vercel.app` |
| Cleanup owner | Philip / operator of future hosted proof run |

## Summary Decision

| Decision | Value |
| --- | --- |
| External closed beta recommendation | NO-GO |
| Remaining blockers | Supabase backup/PITR, linked migrations/RLS/storage/RPC, hosted auth, Vercel env/custom-domain/rollback, Resend proof, spreadsheet-app compatibility, legal sign-off, monitored support/alerts, hosted/manual E2E |
| Follow-up owner | Philip / launch operator |

## P0 Evidence Results

| Gate | Result | Artifact filenames / links | Notes |
| --- | --- | --- | --- |
| Supabase backup/PITR | blocked | `supabase-read-only-cli-2026-06-02.md`, `supabase-backup-readiness-26bc6e3-2026-06-02.json` | Repeatable backup checker reports region `ap-southeast-2`, zero listed backups, `pitrEnabled: false`, `walgEnabled: true`, restore drill not provided, and `supabaseBackupReady: false`; restore drill missing. |
| Linked/staging Supabase migrations | blocked | `supabase-linked-schema-parity-2026-06-02.md`, `supabase-linked-readiness-refresh-2026-06-02.md`, `provider-state-refresh-b33f56d-2026-06-02.md`, `provider-state-refresh-d78686f-2026-06-02.md`, `provider-state-refresh-0b4628d-2026-06-02.md`, `provider-state-refresh-4fdf0de-2026-06-02.md`, `supabase-migration-readiness-4fdf0de-2026-06-02.json`, `supabase-linked-readiness-4fdf0de-2026-06-02.json` | Five launch migrations and allowlist/feedback/unlink objects are absent; repeatable migration-list checker parsed 71 rows from a successful linked migration-list transcript and reports `linkedMigrationsReady: false`; repeatable linked SQL parser found no JSON because linked database SASL auth failed and reports `linkedSupabaseLaunchReady: false`; RLS allow/deny proof missing. |
| Storage/RPC security | blocked | `supabase-linked-readiness-refresh-2026-06-02.md`, `supabase-linked-readiness-4fdf0de-2026-06-02.json` | Security advisor WARN findings, missing launch RPCs, and public `component-images` bucket remain unresolved. |
| Hosted auth allowlist | blocked | `vercel-read-only-cli-2026-06-02.md`, `provider-state-refresh-b33f56d-2026-06-02.md`, `provider-state-refresh-d78686f-2026-06-02.md`, `provider-state-refresh-0b4628d-2026-06-02.md`, `vercel-env-readiness-4fdf0de-2026-06-02.json` | Vercel env list is empty and the repeatable env checker finds no core closed-beta runtime names; hosted allowed/denied/revoked/logout/session-expiry smoke not run. `bun run launch:verify-hosted-auth` is available for future sanitized route proof once real hosted sessions exist, but no pass artifact is present. |
| First-run workspace | partial-local | `first-run-workshop-local-surface-2026-06-02.md` | Local fallback workspace and empty Workshop homebase coverage exists; hosted whitelisted fresh-user proof missing. |
| Vercel deploy/env/health | partial-blocked | `provider-state-refresh-b33f56d-2026-06-02.md`, `provider-state-refresh-d78686f-2026-06-02.md`, `provider-state-refresh-0b4628d-2026-06-02.md`, `provider-state-refresh-4fdf0de-2026-06-02.md`, `vercel-env-readiness-4fdf0de-2026-06-02.json`, `vercel-health-readiness-4fdf0de-2026-06-02.json`, `vercel-production-readiness-4fdf0de-2026-06-02.json`, `vercel-protection-read-only-2026-06-02.md`, `vercel-custom-domain-readiness-blocked-2026-06-02.md` | Latest `4fdf0de` preview is Ready and protected `/api/health` works through `vercel curl`; env vars absent, public branch-alias health is 401, custom-domain health is 404/redirect on the old coming-soon deployment, repeatable public-health checker reports `vercelHealthReady: false`, repeatable production checker reports custom domains still alias to `archestimator-3ser9ty2w-philipjonlewis-projects.vercel.app` and `vercelProductionReady: false`, rollback drill missing. |
| Resend/email if visible | blocked | `resend-email-readiness-blocked-2026-06-02.md`, `resend-readiness-b0e04f4-2026-06-02.json`, `vercel-env-readiness-4fdf0de-2026-06-02.json` | Vercel env and local Resend env are absent; the repeatable Resend checker reports only `RESEND_API_KEY` present locally, missing sender/reply-to/webhook secret, zero Vercel Resend env names, and `resendReady: false`; app email controls fail/disable closed; delivery/webhook proof missing. |
| Spreadsheet compatibility | partial-local | `spreadsheet-artifact-local-2026-06-02.md`, `spreadsheet-quicklook-preview-2026-06-02.md`, `spreadsheet-app-availability-refresh-2026-06-02.md`, `proposal-workbook-large-fixture-benchmark-2026-06-02.md`, `proposal-export-route-workbook-local-2026-06-02.md`, `proposal-workbook-benchmark-regression-coverage-2026-06-02.md`, `hosted-export-route-auth-blocked-231c27e-2026-06-02.md`, `current-head-local-validation-build-353dd48-2026-06-02.md` | Local workbook, ZIP/ExcelJS/no-blank-total, Quick Look, route-handler, benchmark, fixture-regression, validation, and build proof exist. Hosted export route probe at `231c27e` confirms an anonymous/fake-ID `vercel curl` does not produce XLSX bytes and that meaningful hosted timing/memory proof requires a logged-in app session plus real authorized project/estimate IDs. Excel/secondary-app open/recalc/print and authenticated hosted route timing remain missing. |
| Project-specific unlink manual smoke | blocked | `project-specific-unlink-linked-smoke-blocked-2026-06-02.md` | Linked RPC is absent from schema cache; UI reached confirmation but linked smoke cannot pass until migration/RPC proof is resolved. |
| Component/template demo smoke | partial-local | `library-demo-smoke-local-2026-06-02.md`, `component-library-demo-smoke-2026-06-02.png`, `template-library-demo-smoke-2026-06-02.png`, `template-insert-local-smoke-2026-06-02.md` | Local screenshots and insertion proof exist; hosted/manual smoke missing. |
| Legal/owner review | blocked | `legal-owner-readiness-ede0f32-2026-06-02.json` | Repeatable legal/owner helper reports `legalOwnerReady: false`, all proof flags false, product owner / legal reviewer / approval date / approval reference missing, and 9 missing checks; owner/counsel sign-off missing. |
| Support/monitoring | partial-local | `support-feedback-local-surface-2026-06-02.md`, `beta-feedback-in-app-local-2026-06-02.md`, `beta-feedback-review-queue-local-2026-06-02.md`, `support-email-dns-readiness-2026-06-02.md`, `support-email-dns-readiness-refresh-792076e-2026-06-02.json`, `support-monitoring-readiness-c9c1141-2026-06-02.json`, `beta-ops-runbook-readiness-2026-06-02.md` | Local feedback/contact/review path and DNS MX/SPF evidence exist; repeatable DNS helper refresh still shows missing DMARC; repeatable support monitoring helper reports `supportMonitoringReady: false`, all proof flags false, all owner labels missing, and 9 missing checks; linked migration, hosted smoke, monitored inbox/table ownership, alert owner, and escalation proof missing. |
| Demo rehearsal | partial-local | `demo-rehearsal-fallback-pack-2026-06-02.md`, `lewis-residence-demo-proposal-2026-06-02.xlsx`, component/template screenshots, `template-insert-local-smoke-2026-06-02.png` | Local fallback pack exists; live hosted rehearsal, target-environment screenshots, spreadsheet-app workbook proof, and owner sign-off missing. |
| Current manual E2E smoke | partial-local | `current-local-e2e-smoke-2026-06-02.md`, `full-local-e2e-refresh-bb9006d-2026-06-02.md` | Local signed-out auth plus dev-auth library/template/template-insert smoke passed; full local E2E command now passes 9 ungated checks with 24 env-gated/live-provider specs skipped; hosted login/allowlist/unlink/export/logout/session-expiry journey missing. |

## Cleanup And Residue

| Temporary object | Cleanup result |
| --- | --- |
| Test auth users | Local/linked artifacts that created temp users report cleanup or no hosted user creation; hosted auth proof not run. |
| Test workspace/project/estimate | Template insertion and unlink-smoke artifacts report throwaway cleanup/zero residue where applicable. |
| Test allowlist rows | Hosted/linked allowlist proof not run; no current packet cleanup evidence. |
| Test invite/share/publication rows | Email/share visible-flow proof not run; app controls remain disabled when readiness is false. |
| Storage objects | Storage policy proof blocked; no new storage objects created by this packet. |
| Provider test events | Read-only provider checks only; Resend delivery/webhook proof not run. |

## Required Evidence Index Update

This packet is linked from `14-evidence-index.md` as the consolidated proof packet for the current artifact folder. It remains a **NO-GO** packet because blocked rows are still present.

Do not change the launch decision until `47-goal-completion-audit.md` is rerun against a completed packet where every P0 row is `pass` or explicitly accepted by the owner for closed beta.
