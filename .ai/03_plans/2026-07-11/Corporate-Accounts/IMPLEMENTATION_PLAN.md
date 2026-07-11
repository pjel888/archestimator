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

---

## Improvement-Stage Fix Units (from adversarial review)

## UNIT-007: Server-side workspace re-parent guard + audit (REQ-010, DEC-AUTO-007)

**Goal:** `linkWorkspaceToCorporateAccount` detects when the workspace is already
linked to a different account and records an audit of the old account before
the move.
**Paths:** `src/lib/admin/corporate-account-repository.ts` (modified),
`src/lib/admin/corporate-account-actions.ts` (modified).
**Test:** type-check.

## UNIT-008: Client-side router.refresh() after mutations (REQ-011, DEC-AUTO-008)

**Goal:** All three client components call `router.refresh()` after a successful
server action so the server-rendered lists update.
**Paths:** `src/components/admin/AdminCreateAccountForm.tsx` (modified),
`src/components/admin/AdminAccountMembers.tsx` (modified),
`src/components/admin/AdminAccountWorkspaces.tsx` (modified).
**Test:** browser.

## UNIT-009: Suspend/archive/restore corporate account (REQ-008)

**Goal:** Add `updateCorporateAccountStatus` repository function,
`updateCorporateAccountStatusAction` server action, and UI controls on the
account detail page.
**Paths:** `src/lib/admin/corporate-account-repository.ts` (modified),
`src/lib/admin/corporate-account-actions.ts` (modified),
`src/app/admin/accounts/[accountId]/page.tsx` (modified),
new `AdminAccountStatusControls.tsx` component.
**Test:** type-check + browser.

## UNIT-010: Efficient member-count GROUP BY query (REQ-012, DEC-AUTO-009)

**Goal:** Replace the N+1 per-account member-count loop with a single
`listCorporateAccountsWithCounts()` function using `LEFT JOIN ... GROUP BY`.
**Paths:** `src/lib/admin/corporate-account-repository.ts` (modified),
`src/app/admin/accounts/page.tsx` (modified),
`src/components/admin/AdminAccountsList.tsx` (modified).
**Test:** type-check.

## UNIT-011: Last-owner guard (REQ-009)

**Goal:** `removeCorporateAccountMember` and `updateCorporateAccountMemberRole`
reject if the user is the last owner.
**Paths:** `src/lib/admin/corporate-account-repository.ts` (modified).
**Test:** type-check.

## Final Closure Addendum (2026-07-11)

All units in this execution DAG are now VERIFIED. The implementation includes
the source-local fixes discovered during the audit (including stable Better
Auth profile identifiers in admin actions), the local D1 integration receipt,
and the two passing Corporate Accounts browser proofs. The authoritative
closeout is [`evidence/CORPORATE-FINAL-INTEGRATION-v1.md`](evidence/CORPORATE-FINAL-INTEGRATION-v1.md).

The pack is complete and archived. Release readiness is intentionally separate:
`release_status=NOT_EVALUATED` while Workers Logs and alert-delivery gates are
absent from the current shell.
