# Gate Criteria Traceability Matrix

Date: 2026-06-20. Scope: pass/fail criteria, evidence, and traceability for launch gates.

## Gate close criteria

| Gate | Pass criteria | Fail criteria | Evidence artifact |
|---|---|---|---|
| B1 | CI workflow enabled, current hard gate passes, required-check posture recorded. | Workflow disabled, no recent run, or required check not tied to branch/merge path. | GitHub run URL + provider readback. |
| B2 | `bun run validate` exits 0 or scripts/CI explicitly split hard/advisory checks with owner approval. | Any hard gate red, DOM phase hangs, or advisory split not recorded. | Command output + script diff + `14` decision record. |
| B3 | Root/global/not-found states render branded recovery across target routes. | Raw framework error, inaccessible recovery action, or leaked provider detail. | Build/test + forced-error/source proof + UX checklist. |
| B4 | Durable sink/log drain exists, PII policy documented, test event visible. | Console-only short-retention logs or no watcher. | Provider readback + test event + runbook. |
| B5 | Prod env value proven and fail-loud assert prevents unset/typo from fail-opening. | Local env only, missing Vercel proof, or fail-open default remains. | Vercel env readback + signed-out/allowed/denied proof. |
| B6 | Live DB and migration tree reconcile; scratch reset preserves affected objects; advisors reviewed. | Unexplained diff, ledger mismatch, or no rollback/recovery record. | B6 plan closeout + scratch/live diff + advisor output. |
| B7 | Alerts route to named owner and support monitor flags reflect real systems. | Flags set without monitors or no incident owner. | Ops runbook + alert test + launch check output. |
| B8 | Erasure/export dry run covers PII inventory; execution path is service-role/admin-only. | Missing table category, broad execute grant, no dry run, or unsafe export delivery. | Dry-run manifest + transaction rehearsal + grant proof. |
| B9 | Public/settings copy exactly matches manual or self-serve DSAR capability. | Placeholder copy, false SLA, or self-serve promise without implementation. | Copy diff + owner/legal decision record. |
| V1 | Supabase realtime limit values read or set for project and accepted. | Assumed default or no project/account proof. | Supabase dashboard/API read artifact. |
| V2 | Path A network proof shows no analytics before consent, or Path B owner/legal record and copy proof exist. | Tracker behavior contradicts banner/privacy copy. | Network capture or owner/legal record + deployed copy proof. |
| C1 | Package-builder quota is tested and AI env remains off until quota lands. | AI enabled with no package-builder quota. | Targeted tests + env/deploy proof. |
| H1 | Public route header sample meets chosen policy. | `/login`, `/invite`, `/share`, `/privacy`, or `/terms` missing required headers without accept-risk. | Header sample artifact. |
| H2 | Recipient add/send cap and bounced/rate-limited UX proven. | Unbounded sends or unhandled bounce/resend states. | Tests + Resend/domain proof. |
| H3 | Storage quota or spend monitor exists with owner threshold. | External uploads can grow unbounded with no alert. | Quota/monitor evidence. |
| H4 | Readiness endpoint has TTL/cache, timeout, generic response, and low-rate monitor. | Public DB probe leaks details, hammers Supabase, or lacks timeout. | Source/test proof + monitor config. |

## Traceability fields

Every implementation PR or plan closeout must include:

- Gate id.
- User-facing surface.
- Source files or provider settings touched.
- Data class affected: none, account, workspace, project/estimate, recipient, logs, storage, legal/privacy.
- Blast-radius score from `19`.
- Evidence artifact path.
- Residual uncertainty row from `21` if confidence is below high.

## Criteria for "100% certain enough"

Use this phrase only when all are true:

1. The pass criteria above are met.
2. The evidence artifact exists.
3. The blast-radius controls for the gate's score are complete.
4. Residual uncertainty is either eliminated or accepted by the named authority.
5. No contradictory pack-local status remains unresolved.
