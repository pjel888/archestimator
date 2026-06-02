# MVP Closed Beta Manual Proof Packet - 2026-06-02

Status: consolidated packet from current artifacts; external closed beta remains **NO-GO**.

This packet follows `48-manual-proof-packet-template.md` as the dated folder README shape. It consolidates current local, read-only provider, DNS, and blocked/manual proof artifacts already stored in this folder. It does not add new hosted/provider/manual proof, does not mutate production state, and does not approve launch.

## Run Metadata

| Field | Value |
| --- | --- |
| Date | 2026-06-02 |
| Environment | Local repo evidence plus read-only Vercel/Supabase/DNS checks |
| App URL | Local app plus protected Vercel preview evidence where listed |
| Commit tested | Local validation/build anchor `b60f911`; latest read-only Vercel provider anchor `b33f56d`; latest packet sync `b60f911` |
| Operator | Codex |
| Test accounts | Sanitized local/dev-auth and temporary fixture accounts only where artifact says so |
| Related deployment | `dpl_6psx8VnKmAgcU17jHk9xVSpavTi4`; custom domains still point at older production deployment `dpl_FwfHexBsB1xSHDqHqFwHSYpCYTVH` |
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
| Supabase backup/PITR | blocked | `supabase-read-only-cli-2026-06-02.md` | PITR is disabled and no backups were listed; restore drill missing. |
| Linked/staging Supabase migrations | blocked | `supabase-linked-schema-parity-2026-06-02.md`, `supabase-linked-readiness-refresh-2026-06-02.md`, `provider-state-refresh-b33f56d-2026-06-02.md` | Five launch migrations and allowlist/feedback/unlink objects are absent; latest migration-list read succeeds but still shows the five launch migrations absent remotely; RLS allow/deny proof missing. |
| Storage/RPC security | blocked | `supabase-linked-readiness-refresh-2026-06-02.md` | Security advisor WARN findings and public `component-images` bucket remain unresolved. |
| Hosted auth allowlist | blocked | `vercel-read-only-cli-2026-06-02.md`, `provider-state-refresh-b33f56d-2026-06-02.md` | Vercel env list is empty; hosted allowed/denied/revoked/logout/session-expiry smoke not run. |
| First-run workspace | partial-local | `first-run-workshop-local-surface-2026-06-02.md` | Local fallback workspace and empty Workshop homebase coverage exists; hosted whitelisted fresh-user proof missing. |
| Vercel deploy/env/health | partial-blocked | `provider-state-refresh-b33f56d-2026-06-02.md`, `vercel-protection-read-only-2026-06-02.md`, `vercel-custom-domain-readiness-blocked-2026-06-02.md` | Latest `b33f56d` preview is Ready and protected `/api/health` works through `vercel curl`; env vars absent, public preview is 401, custom domains use old coming-soon deployment, rollback proof missing. |
| Resend/email if visible | blocked | `resend-email-readiness-blocked-2026-06-02.md` | Vercel env and local Resend env are absent; app email controls fail/disable closed; delivery/webhook proof missing. |
| Spreadsheet compatibility | partial-local | `spreadsheet-artifact-local-2026-06-02.md`, `spreadsheet-quicklook-preview-2026-06-02.md`, `spreadsheet-app-availability-refresh-2026-06-02.md`, `proposal-workbook-large-fixture-benchmark-2026-06-02.md`, `proposal-export-route-workbook-local-2026-06-02.md`, `proposal-workbook-benchmark-regression-coverage-2026-06-02.md`, `current-head-local-validation-build-b60f911-2026-06-02.md` | Local workbook, ZIP/ExcelJS/no-blank-total, Quick Look, route-handler, benchmark, fixture-regression, validation, and build proof exist; Excel/secondary-app open/recalc/print and hosted route timing missing. |
| Project-specific unlink manual smoke | blocked | `project-specific-unlink-linked-smoke-blocked-2026-06-02.md` | Linked RPC is absent from schema cache; UI reached confirmation but linked smoke cannot pass until migration/RPC proof is resolved. |
| Component/template demo smoke | partial-local | `library-demo-smoke-local-2026-06-02.md`, `component-library-demo-smoke-2026-06-02.png`, `template-library-demo-smoke-2026-06-02.png`, `template-insert-local-smoke-2026-06-02.md` | Local screenshots and insertion proof exist; hosted/manual smoke missing. |
| Legal/owner review | blocked | None | Owner/counsel sign-off missing. |
| Support/monitoring | partial-local | `support-feedback-local-surface-2026-06-02.md`, `beta-feedback-in-app-local-2026-06-02.md`, `beta-feedback-review-queue-local-2026-06-02.md`, `support-email-dns-readiness-2026-06-02.md`, `beta-ops-runbook-readiness-2026-06-02.md` | Local feedback/contact/review path and DNS MX/SPF evidence exist; linked migration, hosted smoke, monitored inbox/table ownership, alert owner, and escalation proof missing. |
| Demo rehearsal | partial-local | `demo-rehearsal-fallback-pack-2026-06-02.md`, `lewis-residence-demo-proposal-2026-06-02.xlsx`, component/template screenshots, `template-insert-local-smoke-2026-06-02.png` | Local fallback pack exists; live hosted rehearsal, target-environment screenshots, spreadsheet-app workbook proof, and owner sign-off missing. |
| Current manual E2E smoke | partial-local | `current-local-e2e-smoke-2026-06-02.md` | Local signed-out auth plus dev-auth library/template/template-insert smoke passed; hosted login/allowlist/unlink/export/logout/session-expiry journey missing. |

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
