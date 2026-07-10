# IMPLEMENTATION_PLAN.md — Corporate Accounts

## Execution DAG

```
Layer 0 — Data model (migration)
  UNIT-001 migration (corporate_accounts + members + workspace link)

Layer 1 — Repository + Actions (depends on UNIT-001)
  UNIT-002 corporate-account-repository.ts (queries + mutations)
  UNIT-003 corporate-account-actions.ts (server actions with audit)

Layer 2 — Admin UI (depends on UNIT-002/003)
  UNIT-004 /admin/accounts list page + create form
  UNIT-005 /admin/accounts/[accountId] detail page (members + workspaces)
  UNIT-006 Sidebar nav + user-detail corporate membership section
```

## UNIT-001: Migration

**Goal:** Create `corporate_accounts`, `corporate_account_members`, and `workspaces.corporate_account_id`.
**Paths:** `migrations/0052_corporate_accounts.sql` (NEW).
**Test:** Local D1 apply + cascade test.

## UNIT-002: Repository

**Goal:** CRUD + membership queries/mutations.
**Paths:** `src/lib/admin/corporate-account-repository.ts` (NEW).
**Test:** Type-check (D1 queries are tested via integration).

## UNIT-003: Server actions

**Goal:** Admin-gated actions with audit trail.
**Paths:** `src/lib/admin/corporate-account-actions.ts` (NEW).
**Test:** Type-check + audit event verification.

## UNIT-004: Accounts list page

**Goal:** `/admin/accounts` with list + create form.
**Paths:** `src/app/admin/accounts/page.tsx` (NEW), `src/components/admin/AdminAccountsList.tsx` (NEW), `src/components/admin/AdminCreateAccountForm.tsx` (NEW).
**Test:** Browser.

## UNIT-005: Account detail page

**Goal:** `/admin/accounts/[accountId]` showing members (with roles) and linked workspaces.
**Paths:** `src/app/admin/accounts/[accountId]/page.tsx` (NEW), `src/components/admin/AdminAccountMembers.tsx` (NEW), `src/components/admin/AdminAccountWorkspaces.tsx` (NEW).
**Test:** Browser.

## UNIT-006: Integration

**Goal:** Sidebar entry + user-detail corporate-membership section.
**Paths:** `src/components/admin/AdminSidebar.tsx` (modified), `src/app/admin/users/[userId]/page.tsx` (modified).
**Test:** Browser + type-check.
