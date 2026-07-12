# Codex App Live Cutover Handoff — 2026-07-12

## Objective

Complete the one remaining archive gate for the Client Portal and Publisher
packs through the deployed, authenticated manager workflow. Do not bypass Better
Auth, fabricate a session, or write Client Portal migration records directly
with SQL.

## Current verified state

- Worker `archestimator-proof` version
  `d7b080d9-a013-4e53-9e68-65b0116b1b61` is deployed at 100%.
- Remote D1 migrations `0067` through `0073` are applied; no migrations are
  pending.
- One active legacy publication exists and has no existing Client Portal
  mapping:
  - legacy publication ID: `337f1427-2dd1-4ff4-b89f-5e518aecb66e`
  - project ID: `bd9a8e68-4e24-49d8-aeed-e4651b7cab0b`
- `client_portal_legacy_migration` and
  `client_portal_legacy_write_freeze` are both currently `0`.
- The Publisher route is deployed and the protected migration/rollback controls
  are implemented in `PublisherDrawer`.
- Local source validation is current: `bun run cf:build`, targeted ESLint,
  `bun run type-check`, focused Publisher tests (22/22), and both plan-pack
  validators passed.

## Codex App execution route

Use the Codex App browser surface where Philip is already signed in as a
publication manager. This is the required authorization boundary that the prior
CLI session could not satisfy.

1. Confirm the target project and legacy publication above are Philip's
   internal dogfood cohort. Do not expand the cohort.
2. Enable the two remote D1 feature flags for the controlled window:

   ```sh
   bunx wrangler d1 execute ARCH_DB --remote --command "UPDATE feature_flags SET enabled = 1, updated_at = datetime('now') WHERE key IN ('client_portal_legacy_migration', 'client_portal_legacy_write_freeze'); SELECT key, enabled FROM feature_flags WHERE key IN ('client_portal_legacy_migration', 'client_portal_legacy_write_freeze') ORDER BY key;"
   ```

3. In the signed-in App browser, open:

   ```text
   https://archestimator.com/workshop/publisher?drawer=bd9a8e68-4e24-49d8-aeed-e4651b7cab0b
   ```

4. Confirm the drawer shows the expected legacy client link and select
   **Migrate to Client Portal**. Confirm the manager dialog.
5. Capture the returned migration report only with safe metadata: status,
   portal ID, issue ID, imported/unresolved counts, and snapshot hash. Never
   record tokens, recipient emails, passwords, or snapshot payloads.
6. Verify in the Publisher drawer that **Open Client Portal** is available.
   Open it as the manager and verify the mapped issue loads.
7. Query remote D1 for safe readback:

   ```sh
   bunx wrangler d1 execute ARCH_DB --remote --command "SELECT legacy_publication_id, portal_id, issue_id, migration_status, imported_at, verified_at FROM client_portal_legacy_mappings WHERE legacy_publication_id = '337f1427-2dd1-4ff4-b89f-5e518aecb66e'; SELECT event_type, occurred_at FROM client_portal_audit_events WHERE event_type IN ('legacy_migration_imported', 'legacy_migration_verified', 'legacy_migration_rolled_back') ORDER BY occurred_at DESC LIMIT 10;"
   ```

8. Rehearse rollback through the same authenticated drawer: select **Roll back
   Portal migration**, confirm it, then verify the mapping is `rejected`, the
   legacy link is again the active manager surface, and imported Client Portal
   records were preserved.
9. Disable both flags immediately after the rehearsal:

   ```sh
   bunx wrangler d1 execute ARCH_DB --remote --command "UPDATE feature_flags SET enabled = 0, updated_at = datetime('now') WHERE key IN ('client_portal_legacy_migration', 'client_portal_legacy_write_freeze'); SELECT key, enabled FROM feature_flags WHERE key IN ('client_portal_legacy_migration', 'client_portal_legacy_write_freeze') ORDER BY key;"
   ```

## Required completion evidence

- Mapping reaches `verified` after migration, then `rejected` after rollback.
- Owner audit includes `legacy_migration_imported`, `legacy_migration_verified`,
  and `legacy_migration_rolled_back`.
- Legacy routing is restored after rollback without deleting imported portal,
  issue, recipient, discussion, or decision records.
- Both flags read back as `0` after the window.
- Hosted denial/header probes are captured against the deployed Worker.
- Add a sanitized ledger entry to `LOOP_LEDGER.md`, refresh the plan-pack
  manifest hash, validate both packs, and archive only after every archive-gate
  item is genuinely satisfied.

## Recovery

- If migration reports unresolved ambiguity, stop before rollback/fix-forward;
  retain the legacy route and record the sanitized report.
- If the manager session expires, disable both flags before ending the attempt.
- Never force a mapping status, portal issue, audit event, or authentication
  state through direct SQL merely to satisfy the archive gate.
