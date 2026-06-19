# Drop-In Handoff For Kimi

This folder is intended to be handed to Kimi as a whole. Start here when acting as the coordinator.

## Coordinator flow

1. Read `README.md`, `COMMON_KIMI_OPERATING_PROTOCOL.md`, `PASS_COMPLETION_PROTOCOL.md`, `PROOF_BOUNDARIES.md`, and `COORDINATION_MATRIX.md`.
2. Choose a task lane from `COORDINATION_MATRIX.md`.
3. Open one task folder and paste its `PROMPT.md` into Kimi.
4. If the folder already has a pass prefix, keep using it. Each prompt tells Kimi to derive the current folder from the base folder rather than assuming the unprefixed name.
5. Do not allow provider apply unless the launch `/goal` explicitly includes `provider-apply` and confirms project `ebxxqidacheyapmmzavr`.
6. Require all reports to stay in the current task folder.
7. After Kimi returns, run `QUALITY_GATE.md` and `LEAD_REVIEW_GUIDE.md` checks before launching dependent work.

## Required pass result

Every Kimi pass must leave:

- `REPORT.md`
- `EVIDENCE.md`
- `CHECKLIST.md`
- `PATCH_NOTES.md` if source, tests, scripts, migrations, or docs changed
- `BLOCKERS.md` only if blocked
- `PASS_STATUS.md`
- `PASS_HISTORY.md`
- Folder renamed to `<ordinal>-Pass-<Completed|Blocked|Failed>__<base-folder>`, unless safe rename is blocked and documented

## Drop-in safety defaults

- Local edits and local verification are allowed.
- Provider apply is off by default.
- Paid provider settings are off limits.
- Production writes are off limits.
- Secrets must not be printed.
- Same-file conflicts stop the task and produce `BLOCKERS.md`.
