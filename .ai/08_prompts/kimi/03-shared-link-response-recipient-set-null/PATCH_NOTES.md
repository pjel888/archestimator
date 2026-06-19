# Patch Notes: Shared-Link Response Recipient SET NULL

Create or update this file if Kimi changes source, tests, scripts, migrations, or docs.

## Changed files

- `path`: reason

## Behavior intended to remain unchanged

- Response decision rows are preserved by design.
- Recipient soft-delete is not implemented in this task.
- Provider SQL is not applied without confirmed target and preflight.

## Validation per changed area

Record command and result for each changed area.

## Conflict notes

Document pre-existing dirty files and any same-file conflict handling.
