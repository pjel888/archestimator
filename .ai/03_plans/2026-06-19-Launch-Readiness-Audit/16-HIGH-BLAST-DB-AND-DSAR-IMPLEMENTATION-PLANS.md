# High-Blast DB And DSAR Implementation Plans

Date: 2026-06-20. Scope: planning handoff for B6 and B8.

These are not DDL files. They define the implementation loop required before any high-blast DB or
erasure work is attempted.

## B6 migration reconciliation plan

### Starting assumption

The 2026-06-19 drift list is a snapshot, not a durable truth. The first implementation step is a
fresh re-audit against live Supabase project `ebxxqidacheyapmmzavr`, because later migrations and
other agents may have changed the surface.

### Required loop

1. Freeze scope: record branch, live project, current migration file count, and current ledger rows.
2. Read live schema, policies, grants, functions, indexes, triggers, and `schema_migrations`.
3. Compare against `supabase/migrations/` and `supabase/migrations-pending-review/`.
4. Identify objects that are live-but-not-reproducible and migrations that are file-present-but-not-ledgered.
5. Author byte-faithful reconciliation migrations or ledger repair commands.
6. Prove on scratch/branch DB with `db reset` or equivalent.
7. Diff scratch vs live for the affected objects.
8. Run advisors and targeted RLS/policy tests.
9. Record rollback/recovery. For ledger repair, record exact inverse repair steps.
10. Reviewer signs off before any production mutation.

### Stop conditions

Stop before mutation if any object diff is not understood, if a migration would drop live data/policy
without rollback, if the project id is not `ebxxqidacheyapmmzavr`, or if unrelated provider state would
be touched.

## B8 erasure/export plan

### Decisions needed first

| Decision | Why it matters |
|---|---|
| Manual owner-run vs self-serve | Determines whether UI/server actions are required for beta. |
| Sole-owned workspace delete vs anonymize | Controls data loss and collaborator impact. |
| Third-party recipient PII handling | Recipient/comment/invite rows are not tied to `auth.users`. |
| Retention exceptions | Legal/accounting/security logs may not be erased immediately. |
| Export delivery path | Email attachment, secure link, or manual transfer affects security posture. |

### RPC/runbook contract

The erasure tool must support:

- `p_dry_run=true` count-only manifest.
- Subject identity and requester proof.
- Per-table action: delete, anonymize, retain with reason, or export.
- Explicit handling for workspaces, projects, estimates, cost libraries, share recipients, comments,
  collaboration invitations, closed-beta allowlist, feedback, and audit/security tables.
- No broad execute grants to `public`, `anon`, or `authenticated`.
- Service-role/admin-only execution path.
- Optional transaction rehearsal: `BEGIN`, mutating path, row-count proof, `ROLLBACK`.
- Temp export artifact deletion and audit record.

### Export runbook minimum

1. Verify requester identity with minimal data.
2. Create manifest of tables/fields included and excluded.
3. Generate export from a controlled query/script.
4. Review for third-party data leakage.
5. Deliver through owner-approved secure channel.
6. Delete temp artifacts.
7. Record completion, retention exceptions, and user confirmation copy.

### Stop conditions

Stop if dry-run counts do not match the PII inventory, if recipient/third-party PII is unclassified,
if the export contains another user's workspace data, if rollback/rehearsal is unavailable, or if the
copy in B9 still overpromises capability.
