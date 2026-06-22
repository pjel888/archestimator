# 06 App Surface Impact Map

## Purpose

This file maps app surfaces that must survive an empty-data state after the future reset.

The detailed user-facing contract is in [12-POST-RESET-UX-CONTRACT.md](12-POST-RESET-UX-CONTRACT.md). This file maps affected surfaces and test anchors.

## Identity And Account

Surfaces:

- Supabase Auth callback and session refresh.
- `src/lib/auth/session.ts`.
- closed-beta access checks.
- profile bootstrap and `ensure_current_user_profile`.
- account setup and onboarding.
- settings profile/workspace forms.

Expected Variant A behavior:

- existing users still authenticate;
- `profiles` rows still exist;
- `profiles.default_workspace_id` may be null;
- app auto-provisions or selects a fresh workspace through the existing `ensureDefaultWorkspace` path;
- `user_onboarding_profiles` is preserved by default unless the owner explicitly wants re-onboarding;
- beta allowlist remains intact;
- legal acceptance evidence remains intact unless separate legal decision says otherwise.

Focused test anchors:

- `tests/vitest/auth-onboarding-guard.test.ts`
- `tests/vitest/auth-account-data-schema.test.ts`
- `tests/vitest/closed-beta-allowlist-admin.test.ts`
- `tests/vitest/legal-terms-acceptance-migration.test.ts`

## Workshop Home And Projects

Surfaces:

- `/workshop`
- `/workshop/projects`
- project create/edit/delete actions
- favorites and project groups
- project dashboard/data/charts

Expected Variant A behavior:

- empty projects state renders;
- old project IDs fail closed with not-found or redirect behavior and no reset data exposure;
- project groups/favorites are empty;
- creating a project works after workspace recreation;
- project image upload/remove works after Storage cleanup;
- project delete scoped RPCs still work for newly created rows.

Focused anchors:

- `src/lib/repositories/workspace-repository.ts`
- `src/lib/projects/actions.ts`
- `src/lib/repositories/project-data-repository.ts`
- `tests/vitest/project-deletion-active-publication-contract.test.ts`
- `tests/vitest/mass-deletion-action-contract.test.ts`

## Estimate Sheets

Surfaces:

- project estimates list;
- estimate editor;
- estimate tree;
- estimate tabs;
- row item editing;
- sheet activity;
- sheet access/collaboration.

Expected Variant A behavior:

- no stale demo estimate is required;
- newly created project can create a new estimate;
- old estimate IDs fail closed with not-found or project-scoped missing behavior;
- node/row/tabs/history RPCs work with fresh data;
- old sheet activity is gone if reset manifest includes it;
- dormant sheet versions do not leak into app UI.

Focused anchors:

- `src/lib/repositories/estimate-repository.ts`
- `src/lib/repositories/project-estimate-sheets-repository.ts`
- `tests/vitest/project-estimate-sheets-repository.test.ts`
- `tests/vitest/estimate-node-reorder-action.test.ts`

## Library, Components, And Templates

Surfaces:

- `/workshop/library`
- component library actions;
- library folders;
- taxonomy/category tree;
- suppliers/brands;
- cost library item create/archive/update;
- estimate template insert;
- estimate right sidebar source insertion.

Expected Variant A behavior:

- library empty state renders;
- no deterministic demo library items are assumed;
- create folder/component/price option works from empty;
- archive/delete scoped RPCs still work for new rows;
- estimate insertion handles empty library and newly created components.

Focused anchors:

- `src/lib/repositories/component-library-repository.ts`
- `src/lib/component-library/actions.ts`
- `tests/vitest/component-library-templates-repository.test.ts`
- `tests/vitest/demo-seed-readiness.test.ts`
- `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/`

## Publications And Shared Links

Surfaces:

- project public link controls;
- `/share/[token]`;
- recipient comments/responses;
- publication event/digest logs;
- active link revoke/rotate/update.

Expected Variant A behavior:

- no active publications remain;
- public share routes for old tokens render expired/not-found behavior and no reset data;
- newly created publication works after reset;
- comments/responses/events begin from zero for new links.

Focused anchors:

- `src/lib/publication/actions.ts`
- `tests/vitest/project-publication-actions.test.ts`
- `tests/vitest/security-findings-publication-contracts.test.ts`
- pending-review shared-link files must remain separate from reset.

## Collaboration

Surfaces:

- teamspaces modal;
- project/sheet members;
- pending invitations and tokens;
- invite route;
- collaboration audit.

Expected Variant A behavior:

- old project/sheet invitations are gone with project/estimate reset;
- collaboration audit is preserved by default; any FK nulling or clearing requires explicit manifest resolution;
- old invite tokens render expired/not-found behavior and no token details leak;
- newly created invitation flow works if provider/email flags are configured.

Focused anchors:

- collaboration migrations under `supabase/migrations/20260527*`;
- `tests/vitest/security-findings-auth-contracts.test.ts`;
- shared invite-related tests if future executor changes this path.

## Notifications, AI Logs, And Support Tables

Surfaces:

- notification delivery surfaces;
- AI package/action audit surfaces;
- security rate limits;
- account/security audit;
- beta feedback.

Expected Variant A behavior:

- AI workspace-scoped rows are reset;
- notification rows are preserved unless the owner explicitly chooses empty notification state;
- account/security/legal evidence remains unless explicitly cleared;
- preserved audit surfaces render approved nulled-reference states with no generic server error.

Focused anchors:

- `tests/vitest/linked-supabase-readiness-sql.test.ts`
- `tests/vitest/supabase-linked-readiness-script.test.ts`
- `tests/vitest/security-findings-auth-contracts.test.ts`

## Storage

Surfaces:

- project image upload/remove;
- component image upload/read;
- component attachment upload/read/delete;
- public component thumbnails;
- private project images and attachments.

Expected Variant A behavior:

- old objects exported then deleted if Storage cleanup is chosen;
- bucket definitions and policies remain;
- newly uploaded project/component media works;
- public/private policy expectations still match `scripts/sql/linked-supabase-launch-readiness.sql`.

Focused anchors:

- `src/lib/mass-deletion/storage-cleanup.ts`
- mass-deletion archive storage strategy:
  - `.ai/09_archive/2026-06-03-mass-deletion-projects-estimate-sheets-library-components/13_storage_cleanup_and_audit_outbox_strategy.md`

## Route Smoke Matrix

Minimum manual or automated route checks after future reset:

| Route/surface | Expected result |
|---|---|
| `/login` and callback | existing Auth login works |
| `/workshop` | no crash; empty/default workspace flow works |
| `/workshop/projects` | empty state then new project appears |
| old project detail/dashboard URL | not-found or redirect; no old data exposure |
| new project detail/dashboard | new project loads |
| project estimates | empty state then new estimate appears |
| old estimate editor URL | not-found or project-scoped missing state |
| new estimate editor | new tabs/tree/rows work |
| `/workshop/library` | empty state then new folder/component/price option appears |
| old share route | expired/not-found; no old data exposure |
| new share route | new link works and can be revoked/rotated |
| old invite route | expired/not-found; no token metadata leak |
| settings/profile | profile still available |
| settings/workspace | newly created workspace state renders or setup recovery is explicit |
