# Manual Proof Matrix

Status: Required before external closed beta.

This matrix converts the remaining hosted/provider/manual gates into concrete evidence slots. It does not replace the local validation/build baseline and does not approve launch. Closed beta stays **NO-GO** until each P0 row below has a dated artifact, owner, and pass/fail note linked from `14-evidence-index.md`.

Use `48-manual-proof-packet-template.md` as the `README.md` inside the dated artifact folder when collecting this evidence.

## Evidence Rules

- Use a throwaway beta tester or demo account where possible.
- Do not paste secrets, raw tokens, magic links, service-role keys, cookies, or provider dashboard credentials into `.ai`.
- Store screenshots, sanitized command output, exported workbooks, and smoke notes under `.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/`.
- Start from `48-manual-proof-packet-template.md` so every proof row has a result, artifact link, notes, and cleanup entry.
- Record exact dates, environment, account role, command or browser path, pass/fail result, and cleanup/residue note.
- If a check cannot run, record it as `blocked`, name the blocker, and keep the launch gate **NO-GO**.

## P0 Proof Rows

| Gate | Required artifact | Acceptance criteria | Current status |
| --- | --- | --- | --- |
| Supabase backup/PITR | Dashboard screenshot or CLI/provider note plus restore-drill log | Backup/PITR status is known before linked migrations; dry-run restore target and owner are documented. | Provider CLI evidence captured in `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-read-only-cli-2026-06-02.md`: PITR is disabled and no backups were listed; restore drill missing; NO-GO. |
| Linked/staging Supabase migrations | Migration history output plus direct SQL/RLS allow/deny notes | Closed-beta allowlist migration and required launch migrations are applied or intentionally deferred; anon cannot enumerate private tables; authenticated access matches role. | Negative/blocked: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-linked-schema-parity-2026-06-02.md` records successful read-only linked SQL parity proof, and `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/provider-state-refresh-2026-06-02.md` confirms `supabase migration list --linked` still shows `20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items` as local-only. `closed_beta_allowed_emails`, `check_closed_beta_access`, and `unlink_estimate_row_item_from_library_with_history` are absent. RLS/storage allow/deny proof still missing. |
| Storage/RPC security | Bucket policy and RPC grant proof | Public buckets are intentionally public only where needed; private buckets deny anon; critical RPCs have expected grants only. | Security advisor evidence captured with WARN findings, including public bucket listing, anon/authenticated executable `SECURITY DEFINER` functions, mutable function search paths, and leaked password protection disabled; NO-GO pending triage. |
| Hosted auth allowlist | Browser smoke screenshots/logs for allowed, denied, revoked, logout/session expiry | Allowed Google user reaches `/workshop`; denied/revoked users reach `/beta/access-required`; logout/session expiry returns to login/access flow without loop. | Blocked: Vercel env list is currently empty in `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-read-only-cli-2026-06-02.md`; hosted auth smoke not run. |
| First-run workspace | Browser smoke notes for a whitelisted fresh user | Fresh allowed user lands in `/workshop`, sees clear empty/project-start state, and can create/open first project path. | Partial/local: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/first-run-workshop-local-surface-2026-06-02.md` records local fallback workspace reuse/creation coverage plus empty Workshop homebase action links. Hosted whitelisted account proof still missing. |
| Vercel deploy/env/health | Vercel deployment URL, env checklist, `/api/health` response, rollback note | Preview or production deploy is green; env values are present without leaking secrets; `/api/health` returns 200; rollback path is demonstrated or rehearsed. | Partial/blocked: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/provider-state-refresh-2026-06-02.md` records latest preview `archestimator-j29iumqi0-philipjonlewis-projects.vercel.app` as Ready and protected `/api/health` passing through `vercel curl`, but Vercel env list is still empty. `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-custom-domain-readiness-blocked-2026-06-02.md` records custom domains attached to an older Ready coming-soon production deployment where `/api/health` returns 404. Current production/custom-domain app health and rollback rehearsal remain missing. |
| Resend/email if visible | Domain DNS/provider screenshot, sent email proof, webhook event proof | Any visible invite/share email flow has delivery proof and webhook reconciliation; if email is manual-only, document that visible app email flows are disabled. | Negative/blocked: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-email-readiness-blocked-2026-06-02.md` records Vercel env list empty and local `RESEND_FROM` / `RESEND_REPLY_TO` / `RESEND_WEBHOOK_SECRET` missing or empty. Local code disables shared-link recipient entry/send/resend while server email readiness is false and fails closed instead of fake-succeeding unconfigured production-like sends. DNS/domain, sent-email, webhook-event proof, and any decision to re-enable visible email workflows remain missing. |
| Spreadsheet compatibility | Exported workbook plus Excel and one secondary spreadsheet screenshot/notes | Workbook opens, formulas recalc, no blank line total cells, print preview is usable, and bid/BOQ tabs retain structure. | Partial/blocked: local workbook artifact and ExcelJS/ZIP/no-blank-total proof captured in `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/spreadsheet-artifact-local-2026-06-02.md`; Quick Look preview evidence captured in `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/spreadsheet-quicklook-preview-2026-06-02.md`. Excel/secondary-app open, formula recalculation, and print proof still missing because no spreadsheet app is installed locally. |
| Project-specific unlink manual smoke | Browser notes/screenshots plus library unchanged proof | Detach linked row, edit detached values, verify library/source component remains unchanged and export uses detached values. | Blocked/negative linked smoke: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/project-specific-unlink-linked-smoke-blocked-2026-06-02.md` records that local UI reached the confirmation path, but linked Supabase returned `PGRST202` because `unlink_estimate_row_item_from_library_with_history` is absent from the schema cache. Fixture cleanup returned zero residue. Linked migration/backup proof remains required before rerun. |
| Component/template demo smoke | Browser screenshots/notes | Component search/trust fields and template preview/insert path are understandable for a beta/demo user. | Partial/local pass: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/library-demo-smoke-local-2026-06-02.md` records local Playwright screenshots/JSON for component search/trust fields and template preview; `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/template-insert-local-smoke-2026-06-02.md` records local template insertion into a throwaway estimate with zero residue. Hosted/manual smoke still required. |
| Legal/owner review | Dated owner/counsel sign-off note or explicit pending-review acceptance | Terms/privacy/beta disclaimers are approved for closed beta or launch remains blocked. | Missing |
| Support/monitoring | Support inbox/form proof and alert/uptime owner note | Feedback link reaches a monitored destination; uptime/error alert owner and escalation path are documented. | Partial/local+DNS: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-feedback-local-surface-2026-06-02.md` records that `/contact`, workshop `Send beta feedback`, terms, and privacy point to `support@archestimator.com`; `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-2026-06-02.md` records MX/SPF DNS evidence and no DMARC answer. Monitored inbox/form proof, alert ownership, and incident escalation remain missing. |
| Demo rehearsal | Screenshots, exported workbook, fallback script, rehearsal note | Demo can be shown without Ask Flip, payments, raw debug data, or provider dashboards; fallback artifacts are ready. | Partial/local fallback: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/demo-rehearsal-fallback-pack-2026-06-02.md` assembles seed anchors, component/template screenshots, template insertion proof, workbook artifact, and a fallback script. Live rehearsal, hosted account, spreadsheet-app workbook proof, target-environment screenshots, and owner demo sign-off remain missing. |
| Current manual E2E smoke | Browser smoke log across login, project, estimate, library, template, unlink, export, logout | Core closed-beta journey works in target hosted environment with no local-only assumptions. | Partial/local: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-local-e2e-smoke-2026-06-02.md` records signed-out auth plus local dev-auth library/template/template-insert smoke with artifacts. Hosted login, allowlist, unlink/export, logout/session expiry, and target-environment journey remain missing. |

## Minimum Evidence Packet

Before changing the launch decision, add a subsection to `14-evidence-index.md` with:

1. Artifact folder path under `.ai/09_archive/store/...`.
2. Exact environment and commit tested.
3. One row per P0 proof row above, with `pass`, `fail`, or `blocked`.
4. Links or filenames for screenshots, workbooks, provider notes, SQL output, and smoke logs.
5. Cleanup and residue notes for any temporary users/workspaces/projects.
6. Remaining no-go rows, if any.

## Stop Conditions

Keep closed beta **NO-GO** if any of these occur:

- Any required provider proof is missing, inaccessible, or unsanitized.
- A denied or revoked user can access protected `/workshop` routes.
- A local-only env flag or dev-auth bypass is needed for the hosted smoke.
- Spreadsheet apps show broken formulas, blank line totals, or unusable print layout.
- Legal/owner review is absent.
- Support inbox/form or alert ownership cannot be verified.
- Temporary test data cannot be cleaned up or residue cannot be checked.
