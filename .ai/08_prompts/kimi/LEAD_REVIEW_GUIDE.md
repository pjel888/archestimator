# Lead Review Guide

Use this when Kimi returns a worked task folder.

## Fast review

1. Confirm the folder name matches `<ordinal>-Pass-<Completed|Blocked|Failed>__<base-folder>`.
2. Open `PASS_STATUS.md` and confirm pass number, result, proof boundary, reports updated, and final verification.
3. Open `PASS_HISTORY.md` and confirm the latest pass was appended without deleting prior pass entries.
4. Open `REPORT.md` and confirm the narrative status matches the folder prefix.
5. Open `EVIDENCE.md` and confirm commands, exit codes, skipped checks, and proof boundary are specific.
6. Open `CHECKLIST.md` and confirm acceptance, `PASS_STATUS.md`, `PASS_HISTORY.md`, and rename items are checked or explicitly blocked.
7. Open `PATCH_NOTES.md` if files changed.
8. Require `BLOCKERS.md` if the pass result is `Blocked`; reject `BLOCKERS.md` for a clean completed pass unless it records resolved historical blockers.

## Provider review

Provider proof or apply claims require all of:

- Launch `/goal` or latest coordinator message included `provider-apply` for apply work.
- Project identity is `ebxxqidacheyapmmzavr`.
- Preflight output is captured.
- Post-check output is captured if anything was applied.
- Recovery or rollback notes exist.
- No secrets are printed.

If any item is missing, downgrade the proof boundary and require a follow-up pass.

## Reject conditions

Reject the returned folder if:

- `PASS_STATUS.md` and folder prefix disagree.
- `PASS_HISTORY.md` is missing or overwritten.
- A completed pass has unchecked acceptance items without a blocker.
- The evidence claims provider/browser proof from local-only checks.
- The task touched files outside its scope without a recorded reason.
- The task reverted unrelated dirty work.
