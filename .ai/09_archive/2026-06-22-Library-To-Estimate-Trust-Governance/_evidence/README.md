# Evidence Ledger

This folder is pre-created so implementation agents do not invent evidence
format later. It is a ledger, not a dump folder.

## Privacy Rules

Do not commit raw source URLs, signed URLs, storage paths, filenames, customer or
project names, provider tokens, SQL row dumps, review notes, lock reasons, or
confidence prose. Use redacted examples, booleans, counts, safe enums, and
placeholder IDs.

## Required Fields Per Evidence File

- Date/time.
- Unit and QA/ADV IDs.
- Claim being proven.
- Command or proof method.
- Result.
- Files under test.
- Local/browser/provider/manual category.
- Residual risk or `SKIP-WITH-RISK` reason.
- Owner lane.
- Evidence privacy check result.

## Phase 0 Artifacts

- `phase-0/baseline-reconciliation.md`
- `phase-0/db-preflight.md`
- `phase-0/file-lock-bootstrap.md` if implementation starts with multiple
  agents.

## Release Audit

Before final completion, add an evidence privacy audit result proving this folder
does not contain raw private URLs, storage paths, signed URL values, secrets,
SQL row dumps, or private review prose.

