# Manual Proof Packet Template

Use this as the `README.md` inside a dated artifact folder such as:

`.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/`

Do not record secrets, raw cookies, raw invite tokens, magic links, service-role keys, or provider dashboard credentials.

## Run Metadata

| Field | Value |
| --- | --- |
| Date | TBD |
| Environment | TBD |
| App URL | TBD |
| Commit tested | TBD |
| Repo-local freeze baseline | `6ab5b38` unless a later app/runtime commit is intentionally tested |
| Docs/status handoff baseline | `f2ed23c` |
| Operator | TBD |
| Test accounts | TBD, sanitized |
| Related deployment | TBD |
| Cleanup owner | TBD |

## Summary Decision

| Decision | Value |
| --- | --- |
| External closed beta recommendation | NO-GO until all P0 rows below pass |
| Remaining blockers | TBD |
| Follow-up owner | TBD |

## P0 Evidence Results

| Gate | Result | Artifact filenames / links | Notes |
| --- | --- | --- | --- |
| Supabase backup/PITR | pending | TBD | Include backup/PITR status and restore-drill note. |
| Linked/staging Supabase migrations | pending | TBD | Include migration history and direct SQL/RLS allow/deny notes. |
| Storage/RPC security | pending | TBD | Include bucket policy and RPC grant proof. |
| Hosted auth allowlist | pending | TBD | Include allowed, denied, revoked, logout, and session-expiry smoke. |
| First-run workspace | pending | TBD | Include fresh whitelisted user path and first project notes. |
| Vercel deploy/env/health | pending | TBD | Include deployment URL, env checklist, health response, rollback note. |
| Resend/email if visible | pending | TBD | Include DNS/provider, sent email, and webhook proof or disabled-email note. |
| Spreadsheet compatibility | pending | TBD | Include exported workbook, Excel proof, secondary app proof, print preview. |
| Project-specific unlink manual smoke | pending | TBD | Include detach/edit/library unchanged/export proof. |
| Component/template demo smoke | pending | TBD | Include screenshots/notes for component search/trust and template preview/insert. |
| Legal/owner review | pending | TBD | Include dated owner/counsel sign-off or keep launch blocked. |
| Support/monitoring | pending | TBD | Include monitored inbox/table review and alert/uptime owner proof. |
| Demo rehearsal | pending | TBD | Include screenshots, exported workbook, fallback script, rehearsal note. |
| Current manual E2E smoke | pending | TBD | Include hosted journey across login, project, estimate, library, template, unlink, export, logout. |

## Cleanup And Residue

| Temporary object | Cleanup result |
| --- | --- |
| Test auth users | TBD |
| Test workspace/project/estimate | TBD |
| Test allowlist rows | TBD |
| Test invite/share/publication rows | TBD |
| Storage objects | TBD |
| Provider test events | TBD |

## Required Evidence Index Update

After the packet is filled, add a subsection to `14-evidence-index.md` with:

1. This artifact folder path.
2. Environment and commit tested.
3. Pass/fail/blocked result for each P0 row.
4. Artifact filenames for screenshots, workbooks, provider notes, SQL outputs, and smoke logs.
5. Cleanup/residue notes.
6. Remaining no-go rows.

Do not change the launch decision until `47-goal-completion-audit.md` is rerun against the completed packet.
