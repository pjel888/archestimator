# 09 Implementation Handoff

## For The Future Executor

You are not authorized by this file to reset Supabase data. You must get a fresh explicit owner instruction matching [10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md](10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md) before preparation or destructive execution.

When Gate 1 is authorized, your job is preparation only: inspect, back up, export, restore-rehearse, manifest, and dry run with rollback. When Gate 2 is authorized after that evidence exists, your job is to execute an auth-preserving app-data reset in linked Supabase project `ebxxqidacheyapmmzavr`, following this pack and recording evidence.

## Required First Reads

Read in order:

1. `AGENTS.md`
2. `.ai/10_state/current-state.md` FAST PATH block only
3. this plan pack's `README.md`
4. `00-PLAN.md`
5. `02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md`
6. `03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md`
7. `04-RESET-RUNBOOK.md`
8. `07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md`
9. `08-BLAST-RADIUS-RISKS-AND-GO-NO-GO.md`
10. `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md`
11. `11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md`
12. `12-POST-RESET-UX-CONTRACT.md`
13. `13-ADVERSARIAL-QA-SCENARIO-MATRIX.md`
14. `14-PLAN-QUALITY-SCORECARD.md`
15. `15-SUPABASE-PROJECT-NAMING-PLAN.md`
16. `16-CODEBASE-AI-IMPLEMENTATION-PLAN.md`

Pull deeper docs only as needed.

## Work Boundaries

Allowed after Gate 1 preparation authorization:

- read-only provider inspection;
- backup/export creation;
- manifest generation;
- transaction dry run with rollback.

Allowed only after Gate 2 destructive execution authorization:

- destructive data reset against approved app tables only;
- Storage object cleanup after export and DB commit;
- verification and evidence recording.

Not allowed without separate approval:

- deleting Auth users;
- deleting Supabase project;
- trying to rename or replace project ref `ebxxqidacheyapmmzavr`;
- enabling PITR;
- creating paid branches/clones;
- running broad linked schema push;
- applying pending-review migrations;
- changing app code;
- changing schema/migrations;
- committing secrets or backups.

## Recommended Agent Lanes

If using subagents, split lanes like this:

- Provider verifier: project/ref, row counts, RLS/function/storage policy inventory.
- Backup operator: logical dump, Storage export, restore rehearsal, hash metadata.
- Manifest reviewer: table/object preserve-reset-decision manifest and dry-run delta review.
- App verifier: post-reset login/workspace/project/estimate/library/publication smoke.
- Security reviewer: Auth boundary, grants, `SECURITY DEFINER`, Storage policies, secrets hygiene.

Keep destructive execution centralized in one owner lane to avoid concurrent writes or conflicting resets.

## Future Evidence Location

Use a new execution evidence folder based on the canonical correlation id from
`10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md`, for example:

- `<this-folder>/evidence/reset-<YYYYMMDD>-<short-owner-or-agent-id>/`

Do not put raw dumps or object exports there. Store only sanitized metadata and hashes.

## Suggested Execution Checklist

1. Confirm fresh owner instruction matches the canonical authorization contract.
2. Confirm project `ebxxqidacheyapmmzavr`.
3. Confirm reset variant.
4. Capture pre-counts.
5. Capture Auth count.
6. Capture Storage counts and bytes.
7. Create logical backup.
8. Export Storage objects.
9. Hash backup/export files.
10. Restore backup into local or throwaway target.
11. Restore Storage samples.
12. Generate table/object/function/policy manifests.
13. Resolve every decision-required row/object.
14. Dry run SQL in transaction with rollback.
15. Review deltas.
16. Confirm Gate 2 authority using the Phase 4B gate in `04-RESET-RUNBOOK.md`.
17. Execute DB reset.
18. Execute Storage cleanup.
19. Verify counts, functions, RLS, grants, and Storage policies.
20. Run app smoke and stale-link proof.
21. Record evidence.
22. Report gaps.

## Report Shape

Use concise final reporting:

- variant executed;
- project ref;
- project display name, if changed;
- backups/exports verified;
- restore rehearsal verified;
- Auth users before/after;
- reset table count summary;
- Storage cleanup summary;
- RLS/function/storage proof;
- app smoke proof;
- known gaps.

Do not claim provider or manual proof from local-only tests.

## If Blocked

Stop and return to planning if:

- backup/export cannot be proven;
- backup/Storage restore rehearsal cannot be proven;
- provider target is ambiguous;
- display-name changes are confused with project-ref or URL changes;
- dry run deltas do not match manifest;
- any decision-required row/object is unresolved;
- reset requires app/schema changes;
- Auth/profile/beta/legal preservation conflicts with the chosen variant;
- Storage export or cleanup tooling cannot safely identify object paths;
- restore path cannot be validated.
