# MVP Closed Beta Manual Proof Packet - 2026-06-02

Status: consolidated packet from current artifacts; external closed beta remains **NO-GO**.

2026-06-04 09:34Z security closure batch:
`codex-security-cheap-path-closures-2026-06-04T0934Z.json` records the
authenticated Codex Security cheap-path closure pass. The actionable
repo-filtered dashboard view is now `1-2 of 2`; the two remaining findings are
the source-control/history-exposure items `Committed public share token and user
project data` and `Confidential client proposal committed to repository`. They
remain open because current-tree cleanup is not a history purge, and closing
them requires owner risk acceptance or an explicit destructive history-purge
decision. The pass changed no paid provider setting, Supabase PITR/compute, DNS,
Vercel env, broad Supabase migration state, Codex scan state, or git history.

2026-06-04 cheap-path refresh: `cheap-launch-refresh-2026-06-04.json`
supersedes the older expensive-provider assumptions without relabeling this
packet as complete. The low-cost path keeps Supabase PITR disabled, uses
Supabase physical backups plus the off-repo logical dump bundle, records
`supabase-backup-readiness-cheap-refresh-2026-06-04.json` as intentionally
strict/blocked on PITR and restore-drill proof, and records
`supabase-migration-readiness-cheap-refresh-2026-06-04.json` plus
`supabase-linked-readiness-cheap-refresh-2026-06-04.json` as current linked
migration/RLS/grant/function/storage proof. Vercel env-name and health proof
are current in `vercel-env-readiness-cheap-refresh-2026-06-04.json` and
`vercel-health-readiness-cheap-refresh-2026-06-04.json`; custom domains point to
current deployment `dpl_Dh8xPgZ3NQwN4CwxZQXh6d8vypcn`, but
`vercel-production-readiness-cheap-refresh-2026-06-04.json` remains incomplete
because rollback drill proof is still blocked. No secret values are recorded.

2026-06-04 08:44Z security refresh:
`codex-security-cheap-path-refresh-2026-06-04T0844Z.json` records authenticated
Codex Security proof that repo-filtered open findings show `1-20 of 35`, while
`critical` and `high` filters both show `0-0 of 0`. The scan summary remains
stale/conflicting against old commit `8957e194`, so the packet stays **NO-GO**
until the remaining visible findings are rescanned, closed, or explicitly
accepted. This refresh changed no paid provider setting and did not start a new
scan or close findings.

This packet follows `48-manual-proof-packet-template.md` as the dated folder README shape. It consolidates current local, read-only provider, DNS, and blocked/manual proof artifacts already stored in this folder. It does not add new hosted/provider/manual proof, does not mutate production state, and does not approve launch.

Current handoff artifact: `repo-local-freeze-external-proof-handoff-2026-06-02.md` records `6ab5b38` as the repo-local implementation freeze, `f2ed23c` as the docs/status freeze, and `c32540e` as the external proof handoff.

## Run Metadata

| Field | Value |
| --- | --- |
| Date | 2026-06-02 |
| Environment | Local repo evidence plus read-only Vercel/Supabase/DNS checks |
| App URL | Local app plus protected Vercel preview evidence where listed |
| Commit tested | Local validation/build anchor `353dd48`; repo-local implementation freeze `6ab5b38`; docs/status freeze `f2ed23c`; external proof handoff `c32540e`; latest read-only Vercel/Supabase provider anchor `4fdf0de`; latest hosted fail-closed bug anchor before fix `6cc9f03`; fail-closed server-session fix committed at `c8e25e2` but initial redeploy was blocked; latest proxy fail-closed postdeploy recheck anchor `b2a0a03`; latest full local E2E refresh anchor `bb9006d` |
| Operator | Codex |
| Test accounts | Sanitized local/dev-auth and temporary fixture accounts only where artifact says so |
| Related deployment | `dpl_Fj4vLSMVm9iUqUFxcYe7fjsYmT4G`; later observed pre-fix preview `dpl_3T35FnYXNspPUP3QL43tCASC4CMF`; proxy-fix postdeploy preview `archestimator-opxqsyo4t-philipjonlewis-projects.vercel.app`; custom domains still point at older production deployment `archestimator-3ser9ty2w-philipjonlewis-projects.vercel.app` |
| Cleanup owner | Philip / operator of future hosted proof run |

## Summary Decision

| Decision | Value |
| --- | --- |
| External closed beta recommendation | NO-GO |
| Remaining blockers | PITR/restore-drill risk acceptance, hosted denied/revoked/expired auth, Vercel rollback, Resend sender-domain proof, remaining Codex Security medium/low findings, spreadsheet-app compatibility, legal sign-off, monitored support/alerts, hosted/manual E2E |
| Current cheap-path delta | Linked Supabase launch readiness, Vercel env names, custom-domain app health, and current-domain alias proof are no longer the same blockers as the 2026-06-02 baseline; strict PITR/restore-drill proof, hosted browser OAuth, rollback drill, Resend delivery/webhook, legal/owner, support/alerts, hosted export, and full hosted beta journey remain open. |
| Follow-up owner | Philip / launch operator |

## P0 Evidence Results

| Gate | Result | Artifact filenames / links | Notes |
| --- | --- | --- | --- |
| Supabase backup/PITR | blocked | `supabase-read-only-cli-2026-06-02.md`, `supabase-backup-readiness-b77245a-2026-06-02.json` | Repeatable backup checker reports region `ap-southeast-2`, zero listed backups, `pitrEnabled: false`, `walgEnabled: true`, restore drill not provided, and `supabaseBackupReady: false`; restore drill missing. |
| Linked/staging Supabase migrations | blocked | `supabase-linked-schema-parity-2026-06-02.md`, `supabase-linked-readiness-refresh-2026-06-02.md`, `provider-state-refresh-b33f56d-2026-06-02.md`, `provider-state-refresh-d78686f-2026-06-02.md`, `provider-state-refresh-0b4628d-2026-06-02.md`, `provider-state-refresh-4fdf0de-2026-06-02.md`, `supabase-migration-readiness-28f7a2a-2026-06-02.json`, `supabase-linked-readiness-f56838d-2026-06-02.json`, `supabase-linked-readiness-mcp-bc798a9-2026-06-02.json` | Five launch migrations and allowlist/feedback/unlink objects are absent; repeatable migration-list checker parsed 71 rows from a successful linked migration-list transcript and reports `linkedMigrationsReady: false`; the current direct linked SQL parser and the earlier MCP read-only refresh both parse all categories and report `linkedSupabaseLaunchReady: false` with 13 total checks / 13 failed rows; RLS allow/deny proof missing. |
| Storage/RPC/security findings | blocked | `supabase-linked-readiness-refresh-2026-06-02.md`, `supabase-linked-readiness-f56838d-2026-06-02.json`, `supabase-linked-readiness-mcp-bc798a9-2026-06-02.json`, `codex-security-cheap-path-refresh-2026-06-04T0844Z.json`, `codex-security-cheap-path-closures-2026-06-04T0934Z.json` | Historical Supabase readiness artifacts remain conservative, while latest Codex Security proof now shows `1-2 of 2` repo-filtered findings still open. The residual findings are history-exposure risks and require explicit owner acceptance or a deliberate history-purge workflow before a fully green security claim. |
| Hosted auth allowlist | blocked | `vercel-read-only-cli-2026-06-02.md`, `provider-state-refresh-b33f56d-2026-06-02.md`, `provider-state-refresh-d78686f-2026-06-02.md`, `provider-state-refresh-0b4628d-2026-06-02.md`, `vercel-env-readiness-4fdf0de-2026-06-02.json`, `vercel-env-readiness-6aaa0b7-2026-06-02.json`, `vercel-env-readiness-9cbf6c3-2026-06-02.json`, `vercel-env-readiness-4b89b72-2026-06-02.json`, `vercel-env-readiness-d1c4335-2026-06-02.json`, `vercel-env-readiness-19345be-2026-06-02.json`, `hosted-auth-env-fail-closed-fix-6cc9f03-2026-06-02.md`, `vercel-preview-deploy-blocked-c8e25e2-2026-06-02.md`, `hosted-auth-proxy-env-fail-closed-fix-8e11d36-2026-06-02.md`, `hosted-auth-proxy-env-postdeploy-b2a0a03-2026-06-02.md` | Vercel env list is still empty; the latest `19345be` repeatable env checker discovers zero env names and finds all core closed-beta runtime names missing; pre-fix hosted `/workshop` returned HTTP `500` when Supabase env was absent; the server-session fail-closed fix reached `c8e25e2`, but fresh preview `dpl_8kYE4UfAiGCwSXoWp7648buPX4YL` still returned HTTP `500` because proxy env handling also needed a fail-closed guard. The proxy guard was committed at `b2a0a03`; fresh protected preview `archestimator-opxqsyo4t-philipjonlewis-projects.vercel.app` returned app health JSON for `/api/health` and HTTP `307` to `/login?next=%2Fworkshop` for signed-out `HEAD /workshop`. Hosted allowed/denied/revoked/logout/session-expiry smoke not run. `bun run launch:verify-hosted-auth` is available for future sanitized route proof once real hosted sessions exist, but no real-session pass artifact is present. |
| First-run workspace | partial-local | `first-run-workshop-local-surface-2026-06-02.md` | Local fallback workspace and empty Workshop homebase coverage exists; hosted whitelisted fresh-user proof missing. |
| Vercel deploy/env/health | partial-blocked | `provider-state-refresh-b33f56d-2026-06-02.md`, `provider-state-refresh-d78686f-2026-06-02.md`, `provider-state-refresh-0b4628d-2026-06-02.md`, `provider-state-refresh-4fdf0de-2026-06-02.md`, `vercel-env-readiness-4fdf0de-2026-06-02.json`, `vercel-env-readiness-6aaa0b7-2026-06-02.json`, `vercel-env-readiness-9cbf6c3-2026-06-02.json`, `vercel-env-readiness-4b89b72-2026-06-02.json`, `vercel-env-readiness-d1c4335-2026-06-02.json`, `vercel-env-readiness-19345be-2026-06-02.json`, `vercel-health-readiness-4fdf0de-2026-06-02.json`, `vercel-health-readiness-02f3a9c-2026-06-02.json`, `vercel-health-readiness-b6873b4-2026-06-02.json`, `vercel-health-readiness-6685d78-2026-06-02.json`, `vercel-production-readiness-4fdf0de-2026-06-02.json`, `vercel-production-readiness-9e253e7-2026-06-02.json`, `vercel-production-readiness-79ecf99-2026-06-02.json`, `vercel-production-readiness-a537ae3-2026-06-02.json`, `vercel-protection-read-only-2026-06-02.md`, `vercel-custom-domain-readiness-blocked-2026-06-02.md`, `hosted-auth-env-fail-closed-fix-6cc9f03-2026-06-02.md`, `vercel-preview-deploy-blocked-c8e25e2-2026-06-02.md`, `vercel-cli-upload-scope-mitigation-6a26759-2026-06-02.md`, `hosted-auth-proxy-env-fail-closed-fix-8e11d36-2026-06-02.md`, `hosted-auth-proxy-env-postdeploy-b2a0a03-2026-06-02.md` | Latest `4fdf0de` provider-refresh preview is Ready and protected `/api/health` works through `vercel curl`; later pre-fix preview `dpl_3T35FnYXNspPUP3QL43tCASC4CMF` also passed `/api/health` but returned HTTP `500` for protected `/workshop` because Supabase env was absent. The server-session fix was committed/pushed and `.vercelignore` allowed a fresh preview, but `dpl_8kYE4UfAiGCwSXoWp7648buPX4YL` still returned HTTP `500` for `/workshop`; the proxy fix at `b2a0a03` now has protected preview proof with `/api/health` app JSON and signed-out `HEAD /workshop` HTTP `307` to `/login?next=%2Fworkshop`. Env vars remain absent, latest env checker artifact `vercel-env-readiness-19345be-2026-06-02.json` discovers zero env names and reports `vercelEnvReady: false`; latest public-health checker artifact `vercel-health-readiness-6685d78-2026-06-02.json` reports branch-alias health `401`, custom-domain health `404`/`307`, zero ready URLs, and `vercelHealthReady: false`; latest production checker artifact `vercel-production-readiness-a537ae3-2026-06-02.json` reports latest preview deployment `dpl_H3CBHKaBWCJqHVhiVe4e3cadQwyw` is Ready, all custom domains still alias to `archestimator-3ser9ty2w-philipjonlewis-projects.vercel.app`, 19 rollback candidates exist, rollback drill is missing, and `vercelProductionReady: false`. |
| Resend/email if visible | blocked | `resend-email-readiness-blocked-2026-06-02.md`, `resend-readiness-b0e04f4-2026-06-02.json`, `resend-readiness-eb0aef5-2026-06-02.json`, `resend-readiness-ce7a4e5-2026-06-02.json`, `resend-readiness-8b0929f-2026-06-02.json`, `resend-readiness-cdb9fdc-2026-06-02.json`, `vercel-env-readiness-4fdf0de-2026-06-02.json`, `vercel-env-readiness-6aaa0b7-2026-06-02.json`, `vercel-env-readiness-9cbf6c3-2026-06-02.json`, `vercel-env-readiness-4b89b72-2026-06-02.json`, `vercel-env-readiness-d1c4335-2026-06-02.json`, `vercel-env-readiness-19345be-2026-06-02.json` | Vercel env and local Resend env are absent; the latest Vercel env checker discovers zero env names, including zero Resend names; the latest repeatable Resend checker `resend-readiness-cdb9fdc-2026-06-02.json` still reports only `RESEND_API_KEY` present locally, missing sender/reply-to/webhook secret, zero Vercel Resend env names, and `resendReady: false`; app email controls fail/disable closed; delivery/webhook proof missing. |
| Spreadsheet compatibility | partial-local | `spreadsheet-artifact-local-2026-06-02.md`, `proposal-workbook-exceljs-summary-sanitized-2026-06-02.json`, `confidential-proposal-artifact-withdrawal-2026-06-04.json`, `spreadsheet-quicklook-preview-2026-06-02.md`, `spreadsheet-app-availability-refresh-2026-06-02.md`, `proposal-workbook-large-fixture-benchmark-2026-06-02.md`, `proposal-export-route-workbook-local-2026-06-02.md`, `proposal-workbook-benchmark-regression-coverage-2026-06-02.md`, `hosted-export-route-auth-blocked-231c27e-2026-06-02.md`, `current-head-local-validation-build-353dd48-2026-06-02.md` | Historical local workbook generation, ZIP/ExcelJS/no-blank-total, Quick Look, route-handler, benchmark, fixture-regression, validation, and build proof exist, but the raw workbook and raw Quick Look PNG were removed from git on 2026-06-04 because proposal artifacts can contain client-identifying estimate data. Hosted export route probe at `231c27e` confirms an anonymous/fake-ID `vercel curl` does not produce XLSX bytes and that meaningful hosted timing/memory proof requires a logged-in app session plus real authorized project/estimate IDs. Excel/secondary-app open/recalc/print and authenticated hosted route timing remain missing. |
| Project-specific unlink manual smoke | blocked | `project-specific-unlink-linked-smoke-blocked-2026-06-02.md` | Linked RPC is absent from schema cache; UI reached confirmation but linked smoke cannot pass until migration/RPC proof is resolved. |
| Component/template demo smoke | partial-local | `library-demo-smoke-local-2026-06-02.md`, `component-library-demo-smoke-2026-06-02.png`, `template-library-demo-smoke-2026-06-02.png`, `template-insert-local-smoke-2026-06-02.md` | Local screenshots and insertion proof exist; hosted/manual smoke missing. |
| Legal/owner review | blocked | `legal-owner-readiness-ede0f32-2026-06-02.json`, `legal-owner-readiness-5fa0ac1-2026-06-02.json`, `legal-owner-readiness-b74baea-2026-06-02.json`, `legal-owner-readiness-6556584-2026-06-02.json`, `legal-owner-readiness-874e645-2026-06-02.json` | Latest repeatable legal/owner helper reports `legalOwnerReady: false`, all proof flags false, product owner / legal reviewer / approval date / approval reference missing, and 9 missing checks; owner/counsel sign-off missing. |
| Support/monitoring | partial-local | `support-feedback-local-surface-2026-06-02.md`, `beta-feedback-in-app-local-2026-06-02.md`, `beta-feedback-review-queue-local-2026-06-02.md`, `support-email-dns-readiness-2026-06-02.md`, `support-email-dns-readiness-refresh-792076e-2026-06-02.json`, `support-email-dns-readiness-refresh-ec31121-2026-06-02.json`, `support-email-dns-readiness-refresh-04e3b28-2026-06-02.json`, `support-email-dns-readiness-refresh-c72f9fb-2026-06-02.json`, `support-email-dns-readiness-refresh-9a2f8ca-2026-06-02.json`, `support-monitoring-readiness-c9c1141-2026-06-02.json`, `support-monitoring-readiness-5fa0ac1-2026-06-02.json`, `support-monitoring-readiness-453ac68-2026-06-02.json`, `support-monitoring-readiness-8f9b11d-2026-06-02.json`, `support-monitoring-readiness-0acf1d1-2026-06-02.json`, `beta-ops-runbook-readiness-2026-06-02.md` | Local feedback/contact/review path and DNS MX/SPF evidence exist; repeatable DNS helper refresh still shows missing DMARC, including the latest `9a2f8ca` refresh with five MX hosts, SPF, A record `216.198.79.1`, no DMARC, and `dnsReady: false`; latest repeatable support monitoring helper `support-monitoring-readiness-0acf1d1-2026-06-02.json` reports `supportMonitoringReady: false`, all proof flags false, all owner labels missing, and 9 missing checks; linked migration, hosted smoke, monitored inbox/table ownership, alert owner, and escalation proof missing. |
| Demo rehearsal | partial-local | `demo-rehearsal-fallback-pack-2026-06-02.md`, `proposal-workbook-exceljs-summary-sanitized-2026-06-02.json`, component/template screenshots, `template-insert-local-smoke-2026-06-02.png` | Local fallback pack exists with sanitized workbook readback only; the raw workbook fallback artifact was withdrawn from git. Live hosted rehearsal, target-environment screenshots, spreadsheet-app workbook proof, and owner sign-off missing. |
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
