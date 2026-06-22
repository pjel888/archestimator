# 03 Data Recovery Backup And Rollback

## Recovery Principle

Do not run destructive app-data reset without both:

1. a logical database backup that can restore app rows; and
2. a separate Storage object export that can restore media files.

Supabase database backups do not include Storage objects. Daily physical backups and PITR are not a substitute for an operator-owned Storage export.

## Backup Posture

Current project decision:

- keep PITR disabled for the closed-beta cost posture unless the owner explicitly reapproves the added cost;
- rely on Supabase physical backups plus manual logical backups before provider-impacting work;
- record sanitized metadata/hashes in `.ai`;
- keep raw dumps and object exports outside the repo;
- encrypt or otherwise restrict raw backup/export access;
- record backup custodian, access scope, retention date, and deletion date.

## Pre-Reset Evidence Bundle

Before execution, create an off-repo evidence bundle with:

- logical database dump;
- optional schema-only dump;
- optional data-only dump for public app tables;
- table row counts before reset;
- Auth row count before reset;
- preserve-table row counts before reset;
- Storage object manifest;
- Storage object export archive;
- Supabase backup-list or dashboard backup evidence if available;
- reset manifest;
- dry-run transcript;
- restore rehearsal transcript;
- post-reset verification template.

Only commit sanitized metadata:

- timestamp;
- project ref;
- backup command shape with secrets redacted;
- file names without local secret paths if sensitive;
- SHA-256 hash of dump/export files;
- row-count summary;
- backup custodian;
- retention/deletion date;
- operator initials/agent id.

Never commit:

- SQL dumps;
- object export archives;
- raw provider tokens;
- service-role key;
- database password;
- `.env*`;
- raw Auth provider payloads;
- raw invite/publication tokens or password hashes.

## Logical Database Backup Plan

Future executor should verify the current Supabase CLI flags with `supabase db dump --help` before use.

Candidate backup approaches:

- Supabase CLI logical dump for linked database.
- `pg_dump` with a direct database URL in an operator shell.
- Supabase dashboard backup/restore metadata as a secondary evidence source.

Required properties:

- dump is taken from linked project `ebxxqidacheyapmmzavr`;
- dump covers the `public` app data needed for rollback;
- role/grant/schema backup exists if schema/provider posture is touched;
- Auth is not being restored or mutated unless a separate Auth recovery plan exists;
- dump file is stored outside the repository;
- dump restore is rehearsed against a local or throwaway target before destructive execution.

Supabase's CLI dump wrapper excludes managed schemas by default, which aligns with this reset's Auth-preserve requirement, but future executor must confirm flags before relying on that behavior.

## Storage Export Plan

For each reset bucket:

- `component-images`
- `project-images`
- `component-attachments`

Export:

- object manifest;
- all current objects selected for deletion;
- any bucket metadata needed for restore;
- counts by bucket;
- bytes by bucket;
- estimated export duration and free-space check;
- failed download list.

Storage restore must be tested at least on a small sample before destructive cleanup:

- choose one object from each non-empty bucket;
- verify export sample can be restored or re-uploaded into a non-production/local-equivalent target when practical;
- verify local file exists and has nonzero size;
- record hash or size metadata;
- do not commit the object file.

If any object selected for deletion is not exported, remove that object from deletion scope unless the owner separately accepts the waiver in the Gate 2 instruction.

## Dry-Run Recovery Drill

Minimum recovery proof before real reset:

- restore the database dump into a local or throwaway database and compare critical counts;
- verify at least one Storage object restore sample from each non-empty target bucket;
- verify row-count snapshot exists;
- verify no backup artifact is inside the repo.

Additional recovery proof when practical:

- restore a sample Storage object into a non-production bucket or local equivalent;
- run app smoke against restored data if practical.

## Restore Strategy

If reset is wrong immediately after execution:

1. stop app writes or keep maintenance mode active;
2. do not perform further schema migrations;
3. preserve post-failure counts and logs for diagnosis;
4. restore public app rows from logical dump into a throwaway environment first when possible;
5. restore linked provider only after confirming the restore path;
6. re-upload Storage objects from export;
7. re-run RLS/grant/function/storage checks;
8. run app smoke flows.

If only Storage cleanup partially fails:

- do not recreate deleted DB rows;
- use the Storage manifest and cleanup audit to retry allowed paths;
- treat rejected paths as manual investigation items.

If only app data deletion is too broad:

- prefer point-in-time logical restore into a new project or throwaway environment for extraction;
- avoid blind full restore over the linked project while Auth users remain active.

## Restore-To-New-Project Option

Supabase has a restore-to-new-project flow documented as a clone/restore option. It may require paid features and does not cover every project setting or Storage object. Use it only as a rehearsal or recovery option after confirming current cost and limitations with the owner.

Official docs:

- https://supabase.com/docs/guides/platform/clone-project
- https://supabase.com/docs/guides/platform/backups

## Branch Option

Supabase preview branches are isolated and data-less by default. They are useful for schema/seed rehearsals but not proof that production-like app data reset works unless the branch is populated with a representative dataset.

Do not create a branch from this plan pack. Branch creation can have cost implications and requires a current cost confirmation.

Official docs:

- https://supabase.com/docs/guides/deployment/branching
- https://supabase.com/docs/guides/deployment/branching/working-with-branches

## Rollback Stop Conditions

Stop and do not restore over linked provider if:

- dump file hash does not match recorded metadata;
- Storage export is incomplete for buckets selected for deletion;
- restore target is ambiguous;
- current provider project id differs from `ebxxqidacheyapmmzavr`;
- Auth restore would be required to recover app identity;
- restore would overwrite new user data created after the reset window.
