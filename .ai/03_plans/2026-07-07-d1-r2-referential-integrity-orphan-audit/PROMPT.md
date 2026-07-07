# GLM5.2 Plan Pack Prompt: D1/R2 Referential Integrity Orphan Audit

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-d1-r2-referential-integrity-orphan-audit`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for proving there are no silent data or object orphans across D1 records, R2 upload objects, projects, estimates, shares, comments, proposals, and audit-like tables.

## Evidence To Start From

- D1 migrations define cascades and `SET NULL` relationships across many entities in `migrations/`.
- Upload metadata and R2 object handling live in `src/lib/uploads/`, `src/lib/cloudflare/`, and upload API routes.
- Existing validation focuses on migration or upload proof, not a repo-wide D1/R2 orphan audit.
- Public sharing, proposal publication, and retention flows create cross-entity lifecycle risks.

## Required Plan Pack

List every ownership relationship, expected deletion/retention behavior, orphan SQL/object checks, repair policy, safe reporting format, CI/operator cadence, and interaction with retention/DSAR workflows.

## Constraints

No destructive cleanup should be planned without a dry-run, evidence output, and owner-review gate. Keep secrets and object contents out of evidence files.

## Stop Condition

The pack gives an executor a precise audit and remediation path for cross-store referential integrity before production use.
