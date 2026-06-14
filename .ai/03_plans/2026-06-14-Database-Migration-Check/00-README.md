# Database Migration Check

Date: 2026-06-14  
Scope: planning and audit only. No application code, migrations, or Supabase provider state were changed.

## Verdict

The linked Archestimator Supabase project is healthy and running Postgres 17, but the repository is not migration-history clean against the linked provider. The mismatch is not just cosmetic: several local migrations and generated TypeScript types describe objects that are missing in the linked database, while several applied remote migrations exist under different timestamps than the repository files.

Do not run a blind `supabase db push` from this worktree until the migration ledger is reconciled.

## Artifacts

- `01-executive-summary.md`: ranked findings and current risk.
- `02-migration-parity-audit.md`: local vs remote migration ledger analysis.
- `03-provider-schema-rls-security-audit.md`: live provider schema, RLS, grants, function, and storage posture.
- `04-codebase-database-surface-audit.md`: codebase database usage map and app-facing schema dependencies.
- `05-generated-types-and-runtime-drift.md`: generated type drift and runtime mismatch findings.
- `06-pending-review-and-outdated-items.md`: pending-review SQL, stale docs, and deferred database work.
- `07-remediation-plan.md`: recommended repair sequence and validation gates.
- `evidence/commands-and-evidence.md`: command/tool evidence, subagent lanes, and validation gaps.

## Stop Condition For This Audit

This audit is complete when the documents above exist in this folder and record:

1. Linked Supabase project identity and provider health.
2. Local migration inventory and remote migration history status.
3. Unapplied, remote-only, and timestamp-drift migration risks.
4. App code and generated type references to missing remote objects.
5. RLS, grant, function, storage, extension, and pending-review posture.
6. A non-mutating remediation plan with clear gates before any future database change.
