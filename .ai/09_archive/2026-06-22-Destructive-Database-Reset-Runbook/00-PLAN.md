# 00 Plan

## Request

Create a new planning goal and plan pack for a future reset of Archestimator app data in Supabase. The owner wants projects, estimates, component/library data, and similar app data cleared so the app can be tested from scratch. Supabase Auth must not be deleted.

This pack is the deliverable. It does not perform the reset.

## Target Result

A future executor can safely perform an app-data reset only after:

- the exact reset variant is chosen;
- linked Supabase project `ebxxqidacheyapmmzavr` is confirmed;
- a logical database backup and separate Storage object export are proven;
- backup and Storage restore rehearsal are proven;
- the destructive table/object manifest has been generated from live metadata;
- a transaction dry run proves expected counts and no managed/Auth schema impact;
- a fresh owner instruction explicitly authorizes the destructive step under [10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md](10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md).

## Recommended Reset Variant

Use **Variant A: Auth-preserving content reset**.

Variant A preserves identity and access scaffolding while removing content the owner named as reset targets. This is the safest "test from scratch" path because existing Auth users can still sign in, the app can recreate or select a workspace through current flows, and compliance/security records are not silently erased.

Preserve by default:

- Supabase-managed schemas and metadata: `auth`, `storage`, `realtime`, `supabase_migrations`, extensions, grants, policies, functions, triggers, and bucket definitions.
- Auth users and sessions provider state.
- Identity/access scaffolding in `public`: `profiles`, `closed_beta_allowed_emails`, `legal_terms_acceptances`, `account_security_events`, `profile_role_hardening_audit`, `security_rate_limit_events`.
- Audit rows that prove prior destructive operations unless the owner explicitly chooses to clear them after export.

Reset by default:

- workspace-owned content;
- projects, project metadata, project groups, locations, favorites, members;
- estimates, tabs, nodes, row items, sheet activity, sheet access, sheet members, dormant sheet-version rows;
- library folders, component taxonomy, suppliers, brands, cost-library items, price options, versions, history, variant costs, attachments;
- estimate templates and their nodes/row items;
- publications, shared links, recipients, comments, responses, events, digest logs;
- collaboration invitations and tokens;
- AI package/action/tool/data-access rows tied to workspaces;
- app Storage objects in `component-images`, `project-images`, and `component-attachments`, after export.

Decision-required state defaults to preserve until the future owner resolves it:

- `collaboration_audit_events`;
- `notification_definitions` and `notification_deliveries`;
- `beta_feedback_submissions`;
- `user_onboarding_profiles`;
- any other legal, security, access, audit, or product-feedback rows not proven to be workspace/project content.

Variant A post-condition: existing users can log in, their profile rows still exist, `profiles.default_workspace_id` is null or points only to a newly created workspace, and all reset content tables have zero rows unless explicitly reseeded later.

## Other Variants

Variant B: content-only reset.

- Preserve `workspaces`, `workspace_members`, and workspace/account settings.
- Reset only project, estimate, publication, and library content.
- Use only if the owner wants existing workspace membership to remain intact.
- Not recommended for this request because it is less "from scratch".

Variant C: Auth-only reset.

- Preserve only Supabase Auth and managed schemas, then clear `profiles`, onboarding, beta allowlist, legal acceptance, and security app tables too.
- This is a materially broader app-identity reset. It risks losing CEO/admin role scaffolding, beta access, legal evidence, and account/security audit continuity.
- Do not run Variant C without a separate fresh owner decision and a profile/allowlist reseed plan.

## Non-Goals

- Do not delete Supabase Auth users.
- Do not delete or recreate the Supabase project.
- Do not attempt to change the Supabase project ref `ebxxqidacheyapmmzavr` in place.
- Do not reset the whole database.
- Do not disable RLS.
- Do not drop schemas, policies, grants, functions, triggers, enums, indexes, buckets, or migrations.
- Do not run `supabase db push --linked` as part of the data reset.
- Do not enable PITR unless the owner separately reapproves the cost.
- Do not commit backups, raw provider output with secrets, Storage exports, tokens, `.env*`, or service-role credentials.
- Do not write app code in this planning pass.

## Provider Naming Add-On

The owner also wants the Supabase project to have a better name. Current live
evidence already shows the display name is `Archestimator`; the ugly value
`ebxxqidacheyapmmzavr` is the project ref/id and remains the safety identifier.

Optional add-on:

- normalize the Supabase display name to `archestimator` if explicitly
  authorized later;
- keep `ebxxqidacheyapmmzavr` as the project ref for every project-boundary,
  CLI, API, backup, and verification check;
- do not treat display-name rename as a substitute for custom domain or vanity
  subdomain work.

See [15-SUPABASE-PROJECT-NAMING-PLAN.md](15-SUPABASE-PROJECT-NAMING-PLAN.md).

## Success Criteria

Planning success, completed by this pack:

- Scope and guardrails are explicit.
- Live provider facts are recorded.
- Exact current public row counts and Storage counts are captured.
- Auth and managed-schema boundaries are explicit.
- Backup/restore path is defined.
- Canonical two-gate authorization contract is defined.
- Manifest, dry-run, and UX acceptance templates are defined.
- Optional Supabase display-name normalization is scoped separately from the destructive reset.
- Future destructive execution has binary go/no-go gates.
- App workflow verification is mapped.

Future reset success, not performed by this pack:

- `auth.users` row count is unchanged.
- `profiles` row count is unchanged for Variant A.
- preserved compliance/access tables match expected counts or approved exported state.
- reset content tables are zero rows or match the chosen seed posture.
- target Storage buckets contain zero app objects or only explicitly preserved objects.
- existing users can log in.
- app creates fresh workspace/project/estimate/library/publication data after reset.
- post-reset RLS, grants, Storage policies, and critical `SECURITY DEFINER` functions still pass read-only proof.

## Stop Condition

Stop before destructive execution if any of these are true:

- linked project id/ref is not exactly `ebxxqidacheyapmmzavr`;
- fresh owner instruction is missing;
- logical backup proof is missing;
- Storage export proof is missing;
- any destructive/reset action row includes `auth.*`, `storage.buckets`, `supabase_migrations.*`, or any managed schema object;
- reset manifest has unresolved `decision-required` rows;
- dry run count deltas do not match the manifest;
- branch/clone/dry-run reality differs from this pack's assumptions;
- pending schema drift is mixed into the reset task;
- provider tooling returns ambiguous project, auth, branch, or backup state.

## Planning Readiness Definition

This pack can reach 100% planning quality only by making future proof
requirements explicit. It does not mean the reset has been approved or executed.
The future executor still needs fresh provider facts, backup/export hashes,
restore rehearsal, live manifests, dry-run deltas, and app smoke proof.
