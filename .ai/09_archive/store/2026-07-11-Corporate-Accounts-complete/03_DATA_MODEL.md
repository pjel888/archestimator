# 03 — Data Model

## Migration: `0052_corporate_accounts.sql`

### `corporate_accounts` table

```sql
CREATE TABLE IF NOT EXISTS corporate_accounts (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(trim(name)) <= 200),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_corporate_accounts_status ON corporate_accounts(status);
CREATE INDEX idx_corporate_accounts_created ON corporate_accounts(created_at DESC);
```

### `corporate_account_members` table

```sql
CREATE TABLE IF NOT EXISTS corporate_account_members (
  corporate_account_id TEXT NOT NULL
    REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'team_leader', 'member', 'viewer')),
  job_title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (corporate_account_id, user_id)
);

CREATE INDEX idx_corp_members_user ON corporate_account_members(user_id);
CREATE INDEX idx_corp_members_account_role ON corporate_account_members(corporate_account_id, role);
```

### `workspaces.corporate_account_id` column

```sql
ALTER TABLE workspaces ADD COLUMN corporate_account_id TEXT
  REFERENCES corporate_accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_workspaces_corporate_account ON workspaces(corporate_account_id);
```

This is additive — existing workspaces get `NULL` (unlinked). Solo workspaces
remain fully functional without a corporate account.

## Org-level roles

| Role | Permissions |
|---|---|
| `owner` | Full control: manage members, link/unlink workspaces, edit account |
| `team_leader` | View all members and workspaces in the account; assign members (no delete) |
| `member` | Belongs to the account; standard workspace access |
| `viewer` | Read-only view of the account's members/workspaces |

These are **org-level** roles, separate from workspace roles (owner/admin/member/viewer) and platform roles (ceo/admin/member). A user's effective permissions are the union of all three role systems.

## Repository API (`src/lib/admin/corporate-account-repository.ts`)

```typescript
// Queries
listCorporateAccounts(): Promise<AdminRepositoryResult<CorporateAccountRow[]>>
getCorporateAccount(accountId): Promise<AdminRepositoryResult<CorporateAccountRow | null>>
listCorporateAccountMembers(accountId): Promise<AdminRepositoryResult<CorporateAccountMemberRow[]>>
listCorporateAccountWorkspaces(accountId): Promise<AdminRepositoryResult<WorkspaceSummaryRow[]>>
listUserCorporateAccounts(userId): Promise<AdminRepositoryResult<(CorporateAccountRow & { role: string })[]>>

// Mutations
createCorporateAccount(name, description, createdBy): Promise<AdminRepositoryResult<CorporateAccountRow>>
addCorporateAccountMember(accountId, userId, role, jobTitle?): Promise<AdminRepositoryResult<{ ok: boolean }>>
removeCorporateAccountMember(accountId, userId): Promise<AdminRepositoryResult<{ ok: boolean }>>
updateCorporateAccountMemberRole(accountId, userId, role): Promise<AdminRepositoryResult<{ ok: boolean }>>
linkWorkspaceToCorporateAccount(workspaceId, accountId): Promise<AdminRepositoryResult<{ ok: boolean }>>
unlinkWorkspaceFromCorporateAccount(workspaceId): Promise<AdminRepositoryResult<{ ok: boolean }>>
```

## Server actions (`src/lib/admin/corporate-account-actions.ts`)

All gated by `requireAdminContext()`, all write audit events via `writeAdminAuditEvent`:
- `createCorporateAccountAction({ name, description })`
- `assignUserToCorporateAccount({ accountId, userId, role, jobTitle })`
- `removeUserFromCorporateAccount({ accountId, userId })`
- `updateCorporateAccountMemberRole({ accountId, userId, role })`
- `linkWorkspaceAction({ workspaceId, accountId })`
- `unlinkWorkspaceAction({ workspaceId })`
