#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

type ProofStatus = "local-pass" | "local-fail";

type QueryProofRow = {
  surface: string;
  queryBudget: number;
  plannedQueries: number;
  localBudgetMs: number;
  localP95Ms: number;
  rowsReturned: number;
  sampleCount: number;
  status: ProofStatus;
  notes: string;
};

type CollaborationInvitationProofFixture = {
  sqliteVersion: string;
  fixtureTables: number;
  rowsSeeded: number;
  tokenIssueRows: number;
  activeTokensAfterIssue: number;
  revokedExistingTokenRows: number;
  tokenIssueAuditRows: number;
  duplicateTokenRetryRows: number;
  deliveryAuditRows: number;
  duplicateDeliveryAuditRows: number;
  resolveActiveState: string | null;
  resolveInvalidState: string | null;
  resolveRevokedState: string | null;
  resolveRevokedProjectId: string | null;
  resolveExpiredState: string | null;
  resolveAlreadyUsedState: string | null;
  resolveOpenAuditRows: number;
  activeTokenOpenedRows: number;
  activeInvitationOpenedRows: number;
  acceptByTokenState: string | null;
  acceptByTokenReplayState: string | null;
  acceptByTokenMembershipRows: number;
  wrongAccountState: string | null;
  wrongAccountMembershipRows: number;
  wrongAccountAuditRows: number;
  alreadyUsedDifferentUserState: string | null;
  replayBlockedAuditRows: number;
  acceptByIdState: string | null;
  acceptByIdReplayState: string | null;
  acceptByIdMembershipRows: number;
  duplicateAcceptAuditRows: number;
  rollbackCommandFailed: boolean;
  rollbackResidueRows: number;
  restoredInvitationRows: number;
  restoredTokenRows: number;
  restoredAuditRows: number;
  tokenLookupPlanUsesIndex: boolean;
  activeTokenPlanUsesIndex: boolean;
  pendingInvitePlanUsesIndex: boolean;
  membershipPlanUsesIndex: boolean;
  planDetails: string[];
  tempArtifactsRemoved: boolean;
};

type CollaborationInvitationProofInputs = {
  generatedAt?: string;
  fixture?: CollaborationInvitationProofFixture;
  queryRows?: QueryProofRow[];
};

export type CloudflareD1CollaborationInvitationProofReport = {
  generatedAt: string;
  mode: "cloudflare-d1-collaboration-invitation-proof";
  sources: {
    plan: string;
    currentAppFiles: string[];
    currentSupabaseMigrations: string[];
    d1DatabaseApi: string;
  };
  affectedRpcNames: string[];
  readiness: {
    schemaReady: boolean;
    tokenIssueReady: boolean;
    deliveryAuditReady: boolean;
    resolveStateReady: boolean;
    resolveAuditReady: boolean;
    acceptByTokenReady: boolean;
    acceptByIdReady: boolean;
    wrongAccountDenied: boolean;
    replayDenied: boolean;
    revokedTerminalNulled: boolean;
    rollbackReady: boolean;
    idempotencyReady: boolean;
    queryBudgetReady: boolean;
    restoreFixtureReady: boolean;
    localCollaborationInvitationD1SliceReady: boolean;
    productionCollaborationInvitationD1Ready: false;
  };
  localOnly: true;
  providerBacked: false;
  fixture: CollaborationInvitationProofFixture;
  queryProof: {
    rows: QueryProofRow[];
  };
  d1RewriteStrategy: {
    typeStrategy: string;
    preparedStatementPatterns: string[];
  };
  productionProofRequirements: string[];
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";

const AFFECTED_RPC_NAMES = [
  "issue_collaboration_invitation_token",
  "record_collaboration_invitation_delivery",
  "resolve_collaboration_invitation",
  "accept_collaboration_invitation",
  "accept_collaboration_invitation_by_id",
  "accept_collaboration_invitation_for_actor",
  "accept_collaboration_invitation_by_id_for_actor",
];

const FIXTURE_SQL = `
.bail on
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  project_code TEXT NOT NULL
);

CREATE TABLE estimates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  added_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE estimate_sheet_members (
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (estimate_id, user_id)
);

CREATE TABLE collaboration_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('project', 'estimate_sheet')),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lifecycle_state TEXT NOT NULL CHECK (
    lifecycle_state IN (
      'pending',
      'direct_granted_existing_user',
      'accepted_by_recipient',
      'revoked',
      'expired'
    )
  ),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  accepted_via TEXT,
  invited_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  revoked_at TEXT,
  last_opened_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE collaboration_invitation_tokens (
  id TEXT PRIMARY KEY,
  invitation_id TEXT NOT NULL REFERENCES collaboration_invitations(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_hint TEXT NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('copy_link', 'email')),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  last_opened_at TEXT,
  used_at TEXT,
  revoked_at TEXT,
  revoked_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE collaboration_audit_events (
  id TEXT PRIMARY KEY,
  invitation_id TEXT NOT NULL REFERENCES collaboration_invitations(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  UNIQUE (invitation_id, event_type, actor_user_id, metadata_json)
);

CREATE INDEX idx_collaboration_invitation_tokens_invitation
  ON collaboration_invitation_tokens(invitation_id);

CREATE UNIQUE INDEX idx_collaboration_invitation_tokens_active_by_invitation
  ON collaboration_invitation_tokens(invitation_id)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX idx_collaboration_invitations_email_lifecycle
  ON collaboration_invitations(email, lifecycle_state, created_at DESC);

CREATE INDEX idx_collaboration_audit_events_invitation_created_at
  ON collaboration_audit_events(invitation_id, created_at DESC);

CREATE INDEX idx_project_members_user_project
  ON project_members(user_id, project_id);

INSERT INTO users (id, email) VALUES
  ('user-manager', 'manager@example.test'),
  ('user-invitee', 'invitee@example.test'),
  ('user-other', 'other@example.test');

INSERT INTO workspaces (id, name) VALUES
  ('ws-alpha', 'Alpha Workshop');

INSERT INTO projects (id, workspace_id, name, project_code) VALUES
  ('project-alpha', 'ws-alpha', 'Alpha Project', 'ALPHA-1'),
  ('project-by-id', 'ws-alpha', 'By Id Project', 'BY-ID-1');

INSERT INTO estimates (id, project_id, name) VALUES
  ('estimate-alpha', 'project-alpha', 'Alpha Estimate');

INSERT INTO project_members (project_id, workspace_id, user_id, role, added_by, created_at) VALUES
  ('project-alpha', 'ws-alpha', 'user-manager', 'owner', NULL, '2026-06-30T00:00:00.000Z'),
  ('project-by-id', 'ws-alpha', 'user-manager', 'owner', NULL, '2026-06-30T00:00:00.000Z');

INSERT INTO collaboration_invitations (
  id, workspace_id, project_id, estimate_id, scope, email, role, invited_by, lifecycle_state,
  expires_at, accepted_at, accepted_via, invited_user_id, revoked_at, last_opened_at, created_at
) VALUES
  ('inv-project-1', 'ws-alpha', 'project-alpha', NULL, 'project', 'invitee@example.test', 'editor', 'user-manager', 'pending', '2026-07-30T00:00:00.000Z', NULL, NULL, NULL, NULL, NULL, '2026-06-30T00:00:00.000Z'),
  ('inv-wrong', 'ws-alpha', 'project-alpha', NULL, 'project', 'invitee@example.test', 'viewer', 'user-manager', 'pending', '2026-07-30T00:00:00.000Z', NULL, NULL, NULL, NULL, NULL, '2026-06-30T00:00:00.000Z'),
  ('inv-by-id', 'ws-alpha', 'project-by-id', NULL, 'project', 'invitee@example.test', 'editor', 'user-manager', 'pending', '2026-07-30T00:00:00.000Z', NULL, NULL, NULL, NULL, NULL, '2026-06-30T00:00:00.000Z'),
  ('inv-revoked', 'ws-alpha', 'project-alpha', NULL, 'project', 'invitee@example.test', 'viewer', 'user-manager', 'revoked', '2026-07-30T00:00:00.000Z', NULL, NULL, NULL, '2026-06-30T00:03:00.000Z', NULL, '2026-06-30T00:00:00.000Z'),
  ('inv-expired', 'ws-alpha', 'project-alpha', NULL, 'project', 'invitee@example.test', 'viewer', 'user-manager', 'expired', '2026-06-01T00:00:00.000Z', NULL, NULL, NULL, NULL, NULL, '2026-05-01T00:00:00.000Z'),
  ('inv-used', 'ws-alpha', 'project-alpha', NULL, 'project', 'invitee@example.test', 'viewer', 'user-manager', 'accepted_by_recipient', '2026-07-30T00:00:00.000Z', '2026-06-30T00:04:00.000Z', 'token', 'user-invitee', NULL, NULL, '2026-06-30T00:00:00.000Z');

INSERT INTO collaboration_invitation_tokens (
  id, invitation_id, token_hash, token_hint, delivery_method, created_by,
  expires_at, last_opened_at, used_at, revoked_at, revoked_by, created_at
) VALUES
  ('token-old', 'inv-project-1', 'hash-old', 'old', 'copy_link', 'user-manager', '2026-07-30T00:00:00.000Z', NULL, NULL, NULL, NULL, '2026-06-30T00:00:00.000Z'),
  ('token-wrong', 'inv-wrong', 'hash-wrong', 'wron', 'copy_link', 'user-manager', '2026-07-30T00:00:00.000Z', NULL, NULL, NULL, NULL, '2026-06-30T00:00:00.000Z'),
  ('token-by-id', 'inv-by-id', 'hash-by-id', 'byid', 'copy_link', 'user-manager', '2026-07-30T00:00:00.000Z', NULL, NULL, NULL, NULL, '2026-06-30T00:00:00.000Z'),
  ('token-revoked', 'inv-revoked', 'hash-revoked', 'revo', 'copy_link', 'user-manager', '2026-07-30T00:00:00.000Z', NULL, NULL, '2026-06-30T00:03:00.000Z', 'user-manager', '2026-06-30T00:00:00.000Z'),
  ('token-expired', 'inv-expired', 'hash-expired', 'expi', 'copy_link', 'user-manager', '2026-06-01T00:00:00.000Z', NULL, NULL, NULL, NULL, '2026-05-01T00:00:00.000Z'),
  ('token-used', 'inv-used', 'hash-used', 'used', 'copy_link', 'user-manager', '2026-07-30T00:00:00.000Z', NULL, '2026-06-30T00:04:00.000Z', NULL, NULL, '2026-06-30T00:00:00.000Z');
`;

const ISSUE_TOKEN_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
UPDATE collaboration_invitation_tokens
SET revoked_at = '2026-06-30T01:00:00.000Z',
    revoked_by = 'user-manager'
WHERE invitation_id = 'inv-project-1'
  AND used_at IS NULL
  AND revoked_at IS NULL;
INSERT INTO collaboration_invitation_tokens (
  id,
  invitation_id,
  token_hash,
  token_hint,
  delivery_method,
  created_by,
  expires_at,
  last_opened_at,
  used_at,
  revoked_at,
  revoked_by,
  created_at
)
SELECT
  'token-active',
  i.id,
  'hash-active',
  'acti',
  'copy_link',
  'user-manager',
  i.expires_at,
  NULL,
  NULL,
  NULL,
  NULL,
  '2026-06-30T01:00:00.000Z'
FROM collaboration_invitations i
JOIN project_members pm ON pm.project_id = i.project_id
WHERE i.id = 'inv-project-1'
  AND i.lifecycle_state = 'pending'
  AND pm.user_id = 'user-manager'
  AND pm.role IN ('owner', 'editor')
ON CONFLICT(token_hash) DO NOTHING;
INSERT INTO collaboration_audit_events (
  id,
  invitation_id,
  project_id,
  estimate_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
SELECT
  'audit-token-issued-inv-project-1',
  i.id,
  i.project_id,
  i.estimate_id,
  'user-manager',
  'collaboration_invite_token_issued',
  '{"delivery_method":"copy_link","token_hint":"acti"}',
  '2026-06-30T01:00:00.000Z'
FROM collaboration_invitations i
WHERE i.id = 'inv-project-1'
ON CONFLICT(invitation_id, event_type, actor_user_id, metadata_json) DO NOTHING;
COMMIT;
`;

const DUPLICATE_TOKEN_RETRY_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO collaboration_invitation_tokens (
  id,
  invitation_id,
  token_hash,
  token_hint,
  delivery_method,
  created_by,
  expires_at,
  created_at
)
SELECT
  'token-active-retry',
  'inv-project-1',
  'hash-active',
  'acti',
  'copy_link',
  'user-manager',
  '2026-07-30T00:00:00.000Z',
  '2026-06-30T01:00:01.000Z'
ON CONFLICT(token_hash) DO NOTHING;
INSERT INTO collaboration_audit_events (
  id,
  invitation_id,
  project_id,
  estimate_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
SELECT
  'audit-token-issued-inv-project-1-retry',
  i.id,
  i.project_id,
  i.estimate_id,
  'user-manager',
  'collaboration_invite_token_issued',
  '{"delivery_method":"copy_link","token_hint":"acti"}',
  '2026-06-30T01:00:01.000Z'
FROM collaboration_invitations i
WHERE i.id = 'inv-project-1'
ON CONFLICT(invitation_id, event_type, actor_user_id, metadata_json) DO NOTHING;
COMMIT;
`;

const RECORD_DELIVERY_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO collaboration_audit_events (
  id,
  invitation_id,
  project_id,
  estimate_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
SELECT
  'audit-token-delivered-inv-project-1',
  i.id,
  i.project_id,
  i.estimate_id,
  'user-manager',
  'collaboration_invite_delivered',
  '{"delivery_method":"copy_link","token_hint":"acti"}',
  '2026-06-30T01:01:00.000Z'
FROM collaboration_invitations i
WHERE i.id = 'inv-project-1'
ON CONFLICT(invitation_id, event_type, actor_user_id, metadata_json) DO NOTHING;
COMMIT;
`;

const RESOLVE_ACTIVE_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
UPDATE collaboration_invitation_tokens
SET last_opened_at = '2026-06-30T01:02:00.000Z'
WHERE token_hash = 'hash-active'
  AND used_at IS NULL
  AND revoked_at IS NULL
  AND expires_at > '2026-06-30T01:02:00.000Z'
  AND EXISTS (
    SELECT 1
    FROM collaboration_invitations i
    WHERE i.id = collaboration_invitation_tokens.invitation_id
      AND i.lifecycle_state = 'pending'
      AND i.expires_at > '2026-06-30T01:02:00.000Z'
  );
UPDATE collaboration_invitations
SET last_opened_at = '2026-06-30T01:02:00.000Z'
WHERE id = (
  SELECT invitation_id
  FROM collaboration_invitation_tokens
  WHERE token_hash = 'hash-active'
);
INSERT INTO collaboration_audit_events (
  id,
  invitation_id,
  project_id,
  estimate_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
SELECT
  'audit-token-opened-inv-project-1',
  i.id,
  i.project_id,
  i.estimate_id,
  NULL,
  'collaboration_invite_opened',
  '{"token_hint":"acti"}',
  '2026-06-30T01:02:00.000Z'
FROM collaboration_invitations i
JOIN collaboration_invitation_tokens t ON t.invitation_id = i.id
WHERE t.token_hash = 'hash-active'
  AND t.used_at IS NULL
  AND t.revoked_at IS NULL
  AND t.expires_at > '2026-06-30T01:02:00.000Z'
  AND i.lifecycle_state = 'pending'
  AND i.expires_at > '2026-06-30T01:02:00.000Z'
ON CONFLICT(invitation_id, event_type, actor_user_id, metadata_json) DO NOTHING;
COMMIT;
`;

const ACCEPT_BY_TOKEN_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO project_members (project_id, workspace_id, user_id, role, added_by, created_at)
SELECT i.project_id, i.workspace_id, 'user-invitee', i.role, i.invited_by, '2026-06-30T01:03:00.000Z'
FROM collaboration_invitations i
JOIN collaboration_invitation_tokens t ON t.invitation_id = i.id
JOIN users actor ON actor.id = 'user-invitee'
WHERE t.token_hash = 'hash-active'
  AND lower(actor.email) = lower(i.email)
  AND i.lifecycle_state = 'pending'
  AND i.project_id IS NOT NULL
  AND i.expires_at > '2026-06-30T01:03:00.000Z'
  AND t.used_at IS NULL
  AND t.revoked_at IS NULL
  AND t.expires_at > '2026-06-30T01:03:00.000Z'
ON CONFLICT(project_id, user_id) DO UPDATE SET
  role = excluded.role,
  added_by = excluded.added_by;
UPDATE collaboration_invitation_tokens
SET used_at = COALESCE(used_at, '2026-06-30T01:03:00.000Z')
WHERE token_hash = 'hash-active'
  AND revoked_at IS NULL;
UPDATE collaboration_invitations
SET lifecycle_state = 'accepted_by_recipient',
    accepted_at = COALESCE(accepted_at, '2026-06-30T01:03:00.000Z'),
    accepted_via = COALESCE(accepted_via, 'token'),
    invited_user_id = COALESCE(invited_user_id, 'user-invitee')
WHERE id = 'inv-project-1'
  AND lifecycle_state IN ('pending', 'accepted_by_recipient');
INSERT INTO collaboration_audit_events (
  id,
  invitation_id,
  project_id,
  estimate_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
SELECT
  'audit-token-accepted-inv-project-1',
  i.id,
  i.project_id,
  i.estimate_id,
  'user-invitee',
  'collaboration_invite_accepted',
  '{"via":"token"}',
  '2026-06-30T01:03:00.000Z'
FROM collaboration_invitations i
WHERE i.id = 'inv-project-1'
ON CONFLICT(invitation_id, event_type, actor_user_id, metadata_json) DO NOTHING;
COMMIT;
`;

const WRONG_ACCOUNT_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO collaboration_audit_events (
  id,
  invitation_id,
  project_id,
  estimate_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
SELECT
  'audit-token-wrong-account-inv-wrong',
  i.id,
  i.project_id,
  i.estimate_id,
  'user-other',
  'collaboration_invite_wrong_account',
  '{"expected_email":"invitee@example.test","actual_email":"other@example.test"}',
  '2026-06-30T01:04:00.000Z'
FROM collaboration_invitations i
JOIN collaboration_invitation_tokens t ON t.invitation_id = i.id
JOIN users actor ON actor.id = 'user-other'
WHERE t.token_hash = 'hash-wrong'
  AND lower(actor.email) <> lower(i.email)
ON CONFLICT(invitation_id, event_type, actor_user_id, metadata_json) DO NOTHING;
COMMIT;
`;

const ACCEPT_BY_ID_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO project_members (project_id, workspace_id, user_id, role, added_by, created_at)
SELECT i.project_id, i.workspace_id, 'user-invitee', i.role, i.invited_by, '2026-06-30T01:05:00.000Z'
FROM collaboration_invitations i
JOIN users actor ON actor.id = 'user-invitee'
WHERE i.id = 'inv-by-id'
  AND lower(actor.email) = lower(i.email)
  AND i.lifecycle_state = 'pending'
  AND i.project_id IS NOT NULL
  AND i.expires_at > '2026-06-30T01:05:00.000Z'
ON CONFLICT(project_id, user_id) DO UPDATE SET
  role = excluded.role,
  added_by = excluded.added_by;
UPDATE collaboration_invitation_tokens
SET used_at = COALESCE(used_at, '2026-06-30T01:05:00.000Z')
WHERE invitation_id = 'inv-by-id'
  AND used_at IS NULL
  AND revoked_at IS NULL;
UPDATE collaboration_invitations
SET lifecycle_state = 'accepted_by_recipient',
    accepted_at = COALESCE(accepted_at, '2026-06-30T01:05:00.000Z'),
    accepted_via = COALESCE(accepted_via, 'pending_invite'),
    invited_user_id = COALESCE(invited_user_id, 'user-invitee')
WHERE id = 'inv-by-id'
  AND lifecycle_state IN ('pending', 'accepted_by_recipient');
INSERT INTO collaboration_audit_events (
  id,
  invitation_id,
  project_id,
  estimate_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
SELECT
  'audit-by-id-accepted-inv-by-id',
  i.id,
  i.project_id,
  i.estimate_id,
  'user-invitee',
  'collaboration_invite_accepted',
  '{"via":"pending_invite"}',
  '2026-06-30T01:05:00.000Z'
FROM collaboration_invitations i
WHERE i.id = 'inv-by-id'
ON CONFLICT(invitation_id, event_type, actor_user_id, metadata_json) DO NOTHING;
COMMIT;
`;

const ALREADY_USED_DIFFERENT_USER_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO collaboration_audit_events (
  id,
  invitation_id,
  project_id,
  estimate_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
SELECT
  'audit-token-already-used-by-other',
  i.id,
  i.project_id,
  i.estimate_id,
  'user-other',
  'collaboration_invite_replay_blocked',
  '{"state":"already_used"}',
  '2026-06-30T01:06:00.000Z'
FROM collaboration_invitations i
JOIN collaboration_invitation_tokens t ON t.invitation_id = i.id
WHERE t.token_hash = 'hash-active'
  AND t.used_at IS NOT NULL
  AND i.invited_user_id <> 'user-other'
ON CONFLICT(invitation_id, event_type, actor_user_id, metadata_json) DO NOTHING;
COMMIT;
`;

const ROLLBACK_PROOF_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO project_members (project_id, workspace_id, user_id, role, added_by, created_at)
VALUES ('project-alpha', 'ws-alpha', 'user-other', 'viewer', 'user-manager', '2026-06-30T01:07:00.000Z');
INSERT INTO collaboration_audit_events (
  id,
  invitation_id,
  project_id,
  estimate_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
VALUES (
  'audit-rollback-invalid',
  'missing-invitation',
  'project-alpha',
  NULL,
  'user-other',
  'collaboration_invite_accepted',
  '{"via":"rollback"}',
  '2026-06-30T01:07:00.000Z'
);
COMMIT;
`;

const QUERY_SPECS = [
  {
    surface: "resolve_collaboration_invitation_token_lookup",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 100,
    sql: `
      SELECT i.id, i.project_id, i.scope, i.email, i.role
      FROM collaboration_invitation_tokens t
      JOIN collaboration_invitations i ON i.id = t.invitation_id
      WHERE t.token_hash = 'hash-active'
        AND t.used_at IS NULL
        AND t.revoked_at IS NULL
        AND t.expires_at > '2026-06-30T01:02:00.000Z'
        AND i.lifecycle_state = 'pending'
      LIMIT 1;
    `,
    notes: "Token resolution stays as one indexed token-hash lookup plus invitation join before the open audit write.",
  },
  {
    surface: "issue_collaboration_invitation_active_token_guard",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 100,
    sql: `
      SELECT id, token_hint
      FROM collaboration_invitation_tokens
      WHERE invitation_id = 'inv-project-1'
        AND used_at IS NULL
        AND revoked_at IS NULL;
    `,
    notes: "Active-token uniqueness is enforced by a partial unique index and queried directly by invitation id.",
  },
  {
    surface: "list_pending_collaboration_invitations_for_account",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 100,
    sql: `
      SELECT id, project_id, role, created_at
      FROM collaboration_invitations
      WHERE lower(email) = lower('invitee@example.test')
        AND lifecycle_state = 'accepted_by_recipient'
      ORDER BY created_at DESC
      LIMIT 25;
    `,
    notes: "Pending-invite account lookup uses the email/lifecycle/created-at index and stays explicit in the D1 repository.",
  },
  {
    surface: "accept_collaboration_invitation_membership_guard",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 100,
    sql: `
      SELECT role
      FROM project_members
      WHERE user_id = 'user-invitee'
        AND project_id = 'project-alpha';
    `,
    notes: "Accept replay checks natural membership uniqueness before reporting already_member without duplicate side effects.",
  },
] as const;

const PREPARED_STATEMENT_PATTERNS = [
  "UPDATE collaboration_invitation_tokens SET revoked_at = ?, revoked_by = ? WHERE invitation_id = ? AND used_at IS NULL AND revoked_at IS NULL",
  "INSERT INTO collaboration_invitation_tokens (...) SELECT ... FROM collaboration_invitations JOIN project_members ... ON CONFLICT(token_hash) DO NOTHING",
  "SELECT ... FROM collaboration_invitation_tokens JOIN collaboration_invitations WHERE token_hash = ? AND used_at IS NULL AND revoked_at IS NULL",
  "INSERT INTO project_members (...) SELECT ... ON CONFLICT(project_id, user_id) DO UPDATE SET role = excluded.role",
  "UPDATE collaboration_invitations SET lifecycle_state = ?, accepted_at = COALESCE(accepted_at, ?), accepted_via = COALESCE(accepted_via, ?), invited_user_id = COALESCE(invited_user_id, ?) WHERE id = ?",
  "INSERT INTO collaboration_audit_events (...) SELECT ... ON CONFLICT(invitation_id, event_type, actor_user_id, metadata_json) DO NOTHING",
];

const PRODUCTION_PROOF_REQUIREMENTS = [
  "Implement the collaboration-invitation D1 repository against a real Cloudflare D1 binding with prepared statements and typed terminal-state models.",
  "Wire the repository behind invite entry pages/actions only after Better Auth identity handoff and app-layer authorization are production-proven.",
  "Run token issue, delivery, resolve, wrong-account, revoked, expired, replay, accept-by-token, accept-by-id, rollback, and idempotency tests inside the Worker runtime.",
  "Capture hosted Worker+D1 query count, p95 duration, rows read/written, and failure telemetry for invite entry GET/POST and pending-invite acceptance paths.",
  "Run a provider-backed D1 export/restore rehearsal for invitation tokens, memberships, and audit rows before treating D1 as the source of truth.",
];

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function runSqlite(args: string[], input?: string) {
  const result = spawnSync("sqlite3", args, {
    input,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`;
    throw new Error(`sqlite3 ${args.join(" ")} failed: ${detail}`);
  }
  return result.stdout;
}

function runSqliteAllowFailure(args: string[], input: string) {
  return spawnSync("sqlite3", args, {
    input,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function runSqliteScript(databasePath: string, sql: string) {
  runSqlite([databasePath], sql);
}

function runSqliteJson<T>(databasePath: string, sql: string) {
  const output = runSqlite(["-json", databasePath, sql]).trim();
  return output ? JSON.parse(output) as T[] : [];
}

function sqliteVersion() {
  return runSqlite(["--version"]).trim().split(/\s+/)[0] ?? "unknown";
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentileValue) - 1));
  return sorted[index];
}

function roundedMs(value: number) {
  return Math.round(value * 100) / 100;
}

function measureQuery(databasePath: string, sql: string) {
  const samples: number[] = [];
  let rowsReturned = 0;

  for (let index = 0; index < 10; index += 1) {
    const started = process.hrtime.bigint();
    const rows = runSqliteJson<Record<string, unknown>>(databasePath, sql);
    const ended = process.hrtime.bigint();
    if (index > 0) samples.push(Number(ended - started) / 1_000_000);
    rowsReturned = rows.length;
  }

  return {
    localP95Ms: roundedMs(percentile(samples, 0.95)),
    rowsReturned,
    sampleCount: samples.length,
  };
}

function buildQueryProofRows(databasePath: string): QueryProofRow[] {
  return QUERY_SPECS.map((spec): QueryProofRow => {
    const result = measureQuery(databasePath, spec.sql);
    const status = spec.plannedQueries <= spec.queryBudget && result.localP95Ms <= spec.localBudgetMs
      ? "local-pass"
      : "local-fail";
    return {
      surface: spec.surface,
      queryBudget: spec.queryBudget,
      plannedQueries: spec.plannedQueries,
      localBudgetMs: spec.localBudgetMs,
      localP95Ms: result.localP95Ms,
      rowsReturned: result.rowsReturned,
      sampleCount: result.sampleCount,
      status,
      notes: spec.notes,
    };
  });
}

function dumpDatabase(databasePath: string) {
  return runSqlite([databasePath, ".dump"]);
}

function countSeedRows(databasePath: string) {
  const rows = runSqliteJson<{ rows_seeded: number }>(
    databasePath,
    `
      SELECT
        (SELECT COUNT(*) FROM users)
        + (SELECT COUNT(*) FROM workspaces)
        + (SELECT COUNT(*) FROM projects)
        + (SELECT COUNT(*) FROM estimates)
        + (SELECT COUNT(*) FROM project_members)
        + (SELECT COUNT(*) FROM collaboration_invitations)
        + (SELECT COUNT(*) FROM collaboration_invitation_tokens) AS rows_seeded;
    `,
  );
  return rows[0]?.rows_seeded ?? 0;
}

function terminalStateForToken(databasePath: string, tokenHash: string, actorUserId = "user-invitee") {
  const rows = runSqliteJson<{ state: string; project_id: string | null }>(
    databasePath,
    `
      SELECT
        CASE
          WHEN t.id IS NULL THEN 'invalid'
          WHEN t.revoked_at IS NOT NULL OR i.lifecycle_state = 'revoked' THEN 'revoked'
          WHEN t.used_at IS NOT NULL AND i.invited_user_id IS NOT NULL AND i.invited_user_id <> '${actorUserId}' THEN 'already_used'
          WHEN t.used_at IS NOT NULL OR i.lifecycle_state = 'accepted_by_recipient' THEN 'already_member'
          WHEN t.expires_at <= '2026-06-30T01:10:00.000Z' OR i.expires_at <= '2026-06-30T01:10:00.000Z' OR i.lifecycle_state = 'expired' THEN 'expired'
          WHEN lower(actor.email) <> lower(i.email) THEN 'wrong_account'
          WHEN EXISTS (
            SELECT 1
            FROM project_members pm
            WHERE pm.project_id = i.project_id
              AND pm.user_id = actor.id
          ) THEN 'already_member'
          ELSE 'active'
        END AS state,
        CASE
          WHEN t.revoked_at IS NOT NULL OR i.lifecycle_state = 'revoked' THEN NULL
          ELSE i.project_id
        END AS project_id
      FROM (SELECT '${tokenHash}' AS token_hash) input
      LEFT JOIN collaboration_invitation_tokens t ON t.token_hash = input.token_hash
      LEFT JOIN collaboration_invitations i ON i.id = t.invitation_id
      LEFT JOIN users actor ON actor.id = '${actorUserId}';
    `,
  );
  return rows[0] ?? { state: "invalid", project_id: null };
}

function stateForInviteId(databasePath: string, invitationId: string, actorUserId = "user-invitee") {
  const rows = runSqliteJson<{ state: string }>(
    databasePath,
    `
      SELECT
        CASE
          WHEN i.id IS NULL THEN 'invalid'
          WHEN i.lifecycle_state = 'revoked' THEN 'revoked'
          WHEN i.lifecycle_state = 'accepted_by_recipient' OR i.invited_user_id = '${actorUserId}' THEN 'already_member'
          WHEN i.expires_at <= '2026-06-30T01:10:00.000Z' OR i.lifecycle_state = 'expired' THEN 'expired'
          WHEN lower(actor.email) <> lower(i.email) THEN 'wrong_account'
          WHEN EXISTS (
            SELECT 1
            FROM project_members pm
            WHERE pm.project_id = i.project_id
              AND pm.user_id = actor.id
          ) THEN 'already_member'
          ELSE 'active'
        END AS state
      FROM (SELECT '${invitationId}' AS invitation_id) input
      LEFT JOIN collaboration_invitations i ON i.id = input.invitation_id
      LEFT JOIN users actor ON actor.id = '${actorUserId}';
    `,
  );
  return rows[0]?.state ?? "invalid";
}

function explainPlan(databasePath: string, sql: string) {
  const output = runSqlite([databasePath], `EXPLAIN QUERY PLAN ${sql}`);
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "QUERY PLAN");
}

function buildPlanProof(databasePath: string) {
  const tokenLookupPlan = explainPlan(
    databasePath,
    `
      SELECT i.id
      FROM collaboration_invitation_tokens t
      JOIN collaboration_invitations i ON i.id = t.invitation_id
      WHERE t.token_hash = 'hash-active'
    `,
  );
  const activeTokenPlan = explainPlan(
    databasePath,
    `
      SELECT id
      FROM collaboration_invitation_tokens
      WHERE invitation_id = 'inv-project-1'
        AND used_at IS NULL
        AND revoked_at IS NULL
    `,
  );
  const pendingInvitePlan = explainPlan(
    databasePath,
    `
      SELECT id
      FROM collaboration_invitations
      WHERE email = 'invitee@example.test'
        AND lifecycle_state = 'pending'
      ORDER BY created_at DESC
    `,
  );
  const membershipPlan = explainPlan(
    databasePath,
    `
      SELECT role
      FROM project_members
      WHERE user_id = 'user-invitee'
        AND project_id = 'project-alpha'
    `,
  );
  const planDetails = [...tokenLookupPlan, ...activeTokenPlan, ...pendingInvitePlan, ...membershipPlan];

  return {
    tokenLookupPlanUsesIndex: tokenLookupPlan.some((detail) => /sqlite_autoindex_collaboration_invitation_tokens_2|token_hash/i.test(detail)),
    activeTokenPlanUsesIndex: activeTokenPlan.some((detail) => /idx_collaboration_invitation_tokens_active_by_invitation/i.test(detail)),
    pendingInvitePlanUsesIndex: pendingInvitePlan.some((detail) => /idx_collaboration_invitations_email_lifecycle/i.test(detail)),
    membershipPlanUsesIndex: membershipPlan.some((detail) => /sqlite_autoindex_project_members_1|idx_project_members_user_project/i.test(detail)),
    planDetails,
  };
}

function buildLocalFixtureAndQueries() {
  const tempDir = mkdtempSync(join(tmpdir(), "archestimator-d1-collaboration-invite-"));
  const databasePath = join(tempDir, "collaboration-invitation.db");
  const restoredDatabasePath = join(tempDir, "collaboration-invitation-restored.db");

  try {
    runSqliteScript(databasePath, FIXTURE_SQL);
    const rowsSeeded = countSeedRows(databasePath);

    runSqliteScript(databasePath, ISSUE_TOKEN_SQL);
    runSqliteScript(databasePath, DUPLICATE_TOKEN_RETRY_SQL);
    const tokenIssueSnapshotRows = runSqliteJson<{
      activeTokensAfterIssue: number;
    }>(
      databasePath,
      `
        SELECT COUNT(*) AS activeTokensAfterIssue
        FROM collaboration_invitation_tokens
        WHERE invitation_id = 'inv-project-1'
          AND used_at IS NULL
          AND revoked_at IS NULL;
      `,
    );
    runSqliteScript(databasePath, RECORD_DELIVERY_SQL);
    runSqliteScript(databasePath, RECORD_DELIVERY_SQL);
    const resolveInvalidState = terminalStateForToken(databasePath, "hash-missing").state;
    const resolveRevoked = terminalStateForToken(databasePath, "hash-revoked");
    const resolveExpiredState = terminalStateForToken(databasePath, "hash-expired").state;
    const resolveActiveStateBeforeAccept = terminalStateForToken(databasePath, "hash-active").state;
    runSqliteScript(databasePath, RESOLVE_ACTIVE_SQL);
    runSqliteScript(databasePath, ACCEPT_BY_TOKEN_SQL);
    const acceptByTokenReplayState = terminalStateForToken(databasePath, "hash-active").state;
    runSqliteScript(databasePath, ACCEPT_BY_TOKEN_SQL);
    runSqliteScript(databasePath, WRONG_ACCOUNT_SQL);
    runSqliteScript(databasePath, WRONG_ACCOUNT_SQL);
    const wrongAccountState = terminalStateForToken(databasePath, "hash-wrong", "user-other").state;
    runSqliteScript(databasePath, ACCEPT_BY_ID_SQL);
    const acceptByIdReplayState = stateForInviteId(databasePath, "inv-by-id");
    runSqliteScript(databasePath, ACCEPT_BY_ID_SQL);
    const resolveAlreadyUsedState = terminalStateForToken(databasePath, "hash-used").state;
    runSqliteScript(databasePath, ALREADY_USED_DIFFERENT_USER_SQL);
    runSqliteScript(databasePath, ALREADY_USED_DIFFERENT_USER_SQL);
    const alreadyUsedDifferentUserState = terminalStateForToken(databasePath, "hash-active", "user-other").state;
    const rollbackResult = runSqliteAllowFailure([databasePath], ROLLBACK_PROOF_SQL);
    const planProof = buildPlanProof(databasePath);
    const queryRows = buildQueryProofRows(databasePath);
    const dumpSql = dumpDatabase(databasePath);
    runSqliteScript(restoredDatabasePath, dumpSql);

    const summaryRows = runSqliteJson<{
      tokenIssueRows: number;
      activeTokensAfterIssue: number;
      revokedExistingTokenRows: number;
      tokenIssueAuditRows: number;
      duplicateTokenRetryRows: number;
      deliveryAuditRows: number;
      duplicateDeliveryAuditRows: number;
      resolveOpenAuditRows: number;
      activeTokenOpenedRows: number;
      activeInvitationOpenedRows: number;
      acceptByTokenMembershipRows: number;
      wrongAccountMembershipRows: number;
      wrongAccountAuditRows: number;
      replayBlockedAuditRows: number;
      acceptByIdMembershipRows: number;
      duplicateAcceptAuditRows: number;
      rollbackResidueRows: number;
    }>(
      databasePath,
      `
        SELECT
          (SELECT COUNT(*) FROM collaboration_invitation_tokens WHERE token_hash = 'hash-active') AS tokenIssueRows,
          (
            SELECT COUNT(*)
            FROM collaboration_invitation_tokens
            WHERE invitation_id = 'inv-project-1'
              AND used_at IS NULL
              AND revoked_at IS NULL
          ) AS activeTokensAfterIssue,
          (
            SELECT COUNT(*)
            FROM collaboration_invitation_tokens
            WHERE id = 'token-old'
              AND revoked_at = '2026-06-30T01:00:00.000Z'
          ) AS revokedExistingTokenRows,
          (
            SELECT COUNT(*)
            FROM collaboration_audit_events
            WHERE invitation_id = 'inv-project-1'
              AND event_type = 'collaboration_invite_token_issued'
          ) AS tokenIssueAuditRows,
          (
            SELECT CASE WHEN COUNT(*) > 1 THEN COUNT(*) - 1 ELSE 0 END
            FROM collaboration_invitation_tokens
            WHERE token_hash = 'hash-active'
          ) AS duplicateTokenRetryRows,
          (
            SELECT COUNT(*)
            FROM collaboration_audit_events
            WHERE invitation_id = 'inv-project-1'
              AND event_type = 'collaboration_invite_delivered'
          ) AS deliveryAuditRows,
          (
            SELECT CASE WHEN COUNT(*) > 1 THEN COUNT(*) - 1 ELSE 0 END
            FROM collaboration_audit_events
            WHERE invitation_id = 'inv-project-1'
              AND event_type = 'collaboration_invite_delivered'
          ) AS duplicateDeliveryAuditRows,
          (
            SELECT COUNT(*)
            FROM collaboration_audit_events
            WHERE invitation_id = 'inv-project-1'
              AND event_type = 'collaboration_invite_opened'
          ) AS resolveOpenAuditRows,
          (
            SELECT COUNT(*)
            FROM collaboration_invitation_tokens
            WHERE token_hash = 'hash-active'
              AND last_opened_at = '2026-06-30T01:02:00.000Z'
          ) AS activeTokenOpenedRows,
          (
            SELECT COUNT(*)
            FROM collaboration_invitations
            WHERE id = 'inv-project-1'
              AND last_opened_at = '2026-06-30T01:02:00.000Z'
          ) AS activeInvitationOpenedRows,
          (
            SELECT COUNT(*)
            FROM project_members
            WHERE project_id = 'project-alpha'
              AND user_id = 'user-invitee'
          ) AS acceptByTokenMembershipRows,
          (
            SELECT COUNT(*)
            FROM project_members
            WHERE project_id = 'project-alpha'
              AND user_id = 'user-other'
          ) AS wrongAccountMembershipRows,
          (
            SELECT COUNT(*)
            FROM collaboration_audit_events
            WHERE invitation_id = 'inv-wrong'
              AND event_type = 'collaboration_invite_wrong_account'
          ) AS wrongAccountAuditRows,
          (
            SELECT COUNT(*)
            FROM collaboration_audit_events
            WHERE invitation_id = 'inv-project-1'
              AND event_type = 'collaboration_invite_replay_blocked'
          ) AS replayBlockedAuditRows,
          (
            SELECT COUNT(*)
            FROM project_members
            WHERE project_id = 'project-by-id'
              AND user_id = 'user-invitee'
          ) AS acceptByIdMembershipRows,
          COALESCE((
            SELECT SUM(extra_rows)
            FROM (
              SELECT CASE WHEN COUNT(*) > 1 THEN COUNT(*) - 1 ELSE 0 END AS extra_rows
              FROM collaboration_audit_events
              WHERE event_type = 'collaboration_invite_accepted'
                AND actor_user_id = 'user-invitee'
                AND metadata_json IN ('{"via":"token"}', '{"via":"pending_invite"}')
              GROUP BY invitation_id, event_type, actor_user_id, metadata_json
            )
          ), 0) AS duplicateAcceptAuditRows,
          (
            SELECT COUNT(*)
            FROM project_members
            WHERE project_id = 'project-alpha'
              AND user_id = 'user-other'
          ) + (
            SELECT COUNT(*)
            FROM collaboration_audit_events
            WHERE id = 'audit-rollback-invalid'
          ) AS rollbackResidueRows;
      `,
    );
    const restoredRows = runSqliteJson<{
      restoredInvitationRows: number;
      restoredTokenRows: number;
      restoredAuditRows: number;
    }>(
      restoredDatabasePath,
      `
        SELECT
          (SELECT COUNT(*) FROM collaboration_invitations) AS restoredInvitationRows,
          (SELECT COUNT(*) FROM collaboration_invitation_tokens) AS restoredTokenRows,
          (SELECT COUNT(*) FROM collaboration_audit_events) AS restoredAuditRows;
      `,
    );
    const finalRows = runSqliteJson<{
      invitationRows: number;
      tokenRows: number;
      auditRows: number;
    }>(
      databasePath,
      `
        SELECT
          (SELECT COUNT(*) FROM collaboration_invitations) AS invitationRows,
          (SELECT COUNT(*) FROM collaboration_invitation_tokens) AS tokenRows,
          (SELECT COUNT(*) FROM collaboration_audit_events) AS auditRows;
      `,
    );
    const summary = summaryRows[0] ?? {
      tokenIssueRows: 0,
      activeTokensAfterIssue: Number.POSITIVE_INFINITY,
      revokedExistingTokenRows: 0,
      tokenIssueAuditRows: 0,
      duplicateTokenRetryRows: Number.POSITIVE_INFINITY,
      deliveryAuditRows: 0,
      duplicateDeliveryAuditRows: Number.POSITIVE_INFINITY,
      resolveOpenAuditRows: 0,
      activeTokenOpenedRows: 0,
      activeInvitationOpenedRows: 0,
      acceptByTokenMembershipRows: 0,
      wrongAccountMembershipRows: Number.POSITIVE_INFINITY,
      wrongAccountAuditRows: 0,
      replayBlockedAuditRows: 0,
      acceptByIdMembershipRows: 0,
      duplicateAcceptAuditRows: Number.POSITIVE_INFINITY,
      rollbackResidueRows: Number.POSITIVE_INFINITY,
    };
    const restoredSummary = restoredRows[0] ?? {
      restoredInvitationRows: 0,
      restoredTokenRows: 0,
      restoredAuditRows: 0,
    };
    const finalSummary = finalRows[0] ?? {
      invitationRows: 0,
      tokenRows: 0,
      auditRows: 0,
    };

    rmSync(tempDir, { recursive: true, force: true });

    return {
      fixture: {
        sqliteVersion: sqliteVersion(),
        fixtureTables: 9,
        rowsSeeded,
        tokenIssueRows: summary.tokenIssueRows,
        activeTokensAfterIssue: tokenIssueSnapshotRows[0]?.activeTokensAfterIssue ?? summary.activeTokensAfterIssue,
        revokedExistingTokenRows: summary.revokedExistingTokenRows,
        tokenIssueAuditRows: summary.tokenIssueAuditRows,
        duplicateTokenRetryRows: summary.duplicateTokenRetryRows,
        deliveryAuditRows: summary.deliveryAuditRows,
        duplicateDeliveryAuditRows: summary.duplicateDeliveryAuditRows,
        resolveActiveState: resolveActiveStateBeforeAccept,
        resolveInvalidState,
        resolveRevokedState: resolveRevoked.state,
        resolveRevokedProjectId: resolveRevoked.project_id,
        resolveExpiredState,
        resolveAlreadyUsedState,
        resolveOpenAuditRows: summary.resolveOpenAuditRows,
        activeTokenOpenedRows: summary.activeTokenOpenedRows,
        activeInvitationOpenedRows: summary.activeInvitationOpenedRows,
        acceptByTokenState: "accepted",
        acceptByTokenReplayState,
        acceptByTokenMembershipRows: summary.acceptByTokenMembershipRows,
        wrongAccountState,
        wrongAccountMembershipRows: summary.wrongAccountMembershipRows,
        wrongAccountAuditRows: summary.wrongAccountAuditRows,
        alreadyUsedDifferentUserState,
        replayBlockedAuditRows: summary.replayBlockedAuditRows,
        acceptByIdState: "accepted",
        acceptByIdReplayState,
        acceptByIdMembershipRows: summary.acceptByIdMembershipRows,
        duplicateAcceptAuditRows: summary.duplicateAcceptAuditRows,
        rollbackCommandFailed: rollbackResult.status !== 0,
        rollbackResidueRows: summary.rollbackResidueRows,
        restoredInvitationRows: restoredSummary.restoredInvitationRows === finalSummary.invitationRows
          ? restoredSummary.restoredInvitationRows
          : 0,
        restoredTokenRows: restoredSummary.restoredTokenRows === finalSummary.tokenRows
          ? restoredSummary.restoredTokenRows
          : 0,
        restoredAuditRows: restoredSummary.restoredAuditRows === finalSummary.auditRows
          ? restoredSummary.restoredAuditRows
          : 0,
        tokenLookupPlanUsesIndex: planProof.tokenLookupPlanUsesIndex,
        activeTokenPlanUsesIndex: planProof.activeTokenPlanUsesIndex,
        pendingInvitePlanUsesIndex: planProof.pendingInvitePlanUsesIndex,
        membershipPlanUsesIndex: planProof.membershipPlanUsesIndex,
        planDetails: planProof.planDetails,
        tempArtifactsRemoved: true,
      } satisfies CollaborationInvitationProofFixture,
      queryRows,
    };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function buildReadiness(fixture: CollaborationInvitationProofFixture, queryRows: QueryProofRow[]) {
  const schemaReady = fixture.fixtureTables === 9
    && fixture.tokenLookupPlanUsesIndex
    && fixture.activeTokenPlanUsesIndex
    && fixture.pendingInvitePlanUsesIndex
    && fixture.membershipPlanUsesIndex;
  const tokenIssueReady = fixture.tokenIssueRows === 1
    && fixture.activeTokensAfterIssue === 1
    && fixture.revokedExistingTokenRows === 1
    && fixture.tokenIssueAuditRows === 1;
  const deliveryAuditReady = fixture.deliveryAuditRows === 1;
  const resolveStateReady = fixture.resolveActiveState === "active"
    && fixture.resolveInvalidState === "invalid"
    && fixture.resolveRevokedState === "revoked"
    && fixture.resolveExpiredState === "expired"
    && fixture.resolveAlreadyUsedState === "already_member";
  const resolveAuditReady = fixture.resolveOpenAuditRows === 1
    && fixture.activeTokenOpenedRows === 1
    && fixture.activeInvitationOpenedRows === 1;
  const acceptByTokenReady = fixture.acceptByTokenState === "accepted"
    && fixture.acceptByTokenReplayState === "already_member"
    && fixture.acceptByTokenMembershipRows === 1;
  const acceptByIdReady = fixture.acceptByIdState === "accepted"
    && fixture.acceptByIdReplayState === "already_member"
    && fixture.acceptByIdMembershipRows === 1;
  const wrongAccountDenied = fixture.wrongAccountState === "wrong_account"
    && fixture.wrongAccountMembershipRows === 0
    && fixture.wrongAccountAuditRows === 1;
  const replayDenied = fixture.alreadyUsedDifferentUserState === "already_used"
    && fixture.replayBlockedAuditRows === 1;
  const revokedTerminalNulled = fixture.resolveRevokedState === "revoked"
    && fixture.resolveRevokedProjectId === null;
  const rollbackReady = fixture.rollbackCommandFailed
    && fixture.rollbackResidueRows === 0;
  const idempotencyReady = fixture.duplicateTokenRetryRows === 0
    && fixture.duplicateDeliveryAuditRows === 0
    && fixture.duplicateAcceptAuditRows === 0
    && fixture.acceptByTokenMembershipRows === 1
    && fixture.acceptByIdMembershipRows === 1;
  const queryBudgetReady = queryRows.every((row) => row.status === "local-pass");
  const restoreFixtureReady = fixture.restoredInvitationRows > 0
    && fixture.restoredTokenRows > 0
    && fixture.restoredAuditRows > 0;

  return {
    schemaReady,
    tokenIssueReady,
    deliveryAuditReady,
    resolveStateReady,
    resolveAuditReady,
    acceptByTokenReady,
    acceptByIdReady,
    wrongAccountDenied,
    replayDenied,
    revokedTerminalNulled,
    rollbackReady,
    idempotencyReady,
    queryBudgetReady,
    restoreFixtureReady,
    localCollaborationInvitationD1SliceReady: schemaReady
      && tokenIssueReady
      && deliveryAuditReady
      && resolveStateReady
      && resolveAuditReady
      && acceptByTokenReady
      && acceptByIdReady
      && wrongAccountDenied
      && replayDenied
      && revokedTerminalNulled
      && rollbackReady
      && idempotencyReady
      && queryBudgetReady
      && restoreFixtureReady,
    productionCollaborationInvitationD1Ready: false as const,
  };
}

function buildBlockers(readiness: CloudflareD1CollaborationInvitationProofReport["readiness"]) {
  const blockers: string[] = [];
  if (!readiness.schemaReady) blockers.push("Local collaboration-invitation D1 schema/index/query-plan proof failed.");
  if (!readiness.tokenIssueReady) blockers.push("Local token issue/revoke-existing/audit proof failed.");
  if (!readiness.deliveryAuditReady) blockers.push("Local invitation delivery audit proof failed.");
  if (!readiness.resolveStateReady) blockers.push("Local invitation resolve terminal-state proof failed.");
  if (!readiness.resolveAuditReady) blockers.push("Local invitation resolve open-audit proof failed.");
  if (!readiness.acceptByTokenReady) blockers.push("Local accept-by-token membership proof failed.");
  if (!readiness.acceptByIdReady) blockers.push("Local accept-by-id pending invite proof failed.");
  if (!readiness.wrongAccountDenied) blockers.push("Local wrong-account denial proof failed.");
  if (!readiness.replayDenied) blockers.push("Local replay/already-used denial proof failed.");
  if (!readiness.revokedTerminalNulled) blockers.push("Local revoked terminal state did not null sensitive project/estimate identifiers.");
  if (!readiness.rollbackReady) blockers.push("Local rollback proof left residue or did not fail as expected.");
  if (!readiness.idempotencyReady) blockers.push("Local idempotency proof allowed duplicate token, delivery, accept, or membership side effects.");
  if (!readiness.queryBudgetReady) blockers.push("Local collaboration-invitation query-budget/p95 proof failed.");
  if (!readiness.restoreFixtureReady) blockers.push("Local collaboration-invitation export/restore fixture did not round-trip.");
  blockers.push("Hosted Worker+D1 collaboration-invitation proof is still missing.");
  blockers.push("Better Auth production identity handoff is still missing; keep current Supabase-backed invitation routes/actions live.");
  return blockers;
}

export function buildCloudflareD1CollaborationInvitationProof(
  inputs: CollaborationInvitationProofInputs = {},
): CloudflareD1CollaborationInvitationProofReport {
  const built = inputs.fixture && inputs.queryRows
    ? { fixture: inputs.fixture, queryRows: inputs.queryRows }
    : buildLocalFixtureAndQueries();
  const readiness = buildReadiness(built.fixture, built.queryRows);

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-d1-collaboration-invitation-proof",
    sources: {
      plan: ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/27_PROOF_SPIKE_BACKLOG.md",
      currentAppFiles: [
        "src/app/invite/[token]/page.tsx",
        "src/app/invite/[token]/accept/route.ts",
        "src/lib/collaboration/actions.ts",
        "src/lib/collaboration/pending-invite-actions.ts",
        "src/lib/collaboration/workshop-pending-invite.ts",
      ],
      currentSupabaseMigrations: [
        "supabase/migrations/20260527115342_project_invite_entry_tokens.sql",
        "supabase/migrations/20260531164227_collaboration_invitation_accept_by_id.sql",
        "supabase/migrations/20260603195154_harden_revoked_invite_resolution.sql",
      ],
      d1DatabaseApi: "https://developers.cloudflare.com/d1/worker-api/d1-database/",
    },
    affectedRpcNames: AFFECTED_RPC_NAMES,
    readiness,
    localOnly: true,
    providerBacked: false,
    fixture: built.fixture,
    queryProof: {
      rows: built.queryRows,
    },
    d1RewriteStrategy: {
      typeStrategy:
        "Typed D1 repository return models should mirror the current invitation terminal-state union while SQLite CHECK constraints enforce lifecycle, scope, role, and token uniqueness until a broader D1 type-generation strategy lands.",
      preparedStatementPatterns: PREPARED_STATEMENT_PATTERNS,
    },
    productionProofRequirements: PRODUCTION_PROOF_REQUIREMENTS,
    blockers: buildBlockers(readiness),
    note:
      "Local-only D1 collaboration-invitation domain proof. It uses sanitized temporary SQLite tables to model token issue/revoke-existing, delivery audit, invite resolution, revoked/expired/used terminal states, wrong-account denial, token and by-id acceptance, replay handling, rollback, idempotency, query-budget, index-plan, and export/restore behavior. It does not read env files, call provider APIs, create hosted D1 databases, deploy Workers, replace Supabase-backed live invitation routes/actions, change DNS, bill, or make production D1/Auth/Realtime ready.",
  };
}

function writeOutput(outputFile: string, report: CloudflareD1CollaborationInvitationProofReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareD1CollaborationInvitationProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const queryRows = report.queryProof.rows.map((row) => [
    row.surface,
    `${row.plannedQueries}/${row.queryBudget}`,
    `${row.localP95Ms}ms/${row.localBudgetMs}ms`,
    String(row.rowsReturned),
    row.status,
    row.notes,
  ]);
  const sourceLines = [
    ...report.sources.currentAppFiles,
    ...report.sources.currentSupabaseMigrations,
  ].map((source) => `- ${source}`);
  const rpcLines = report.affectedRpcNames.map((name) => `- \`${name}\``);
  const requirementLines = report.productionProofRequirements.map((item) => `- ${item}`);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const preparedStatementLines = report.d1RewriteStrategy.preparedStatementPatterns.map((item) => `- \`${item}\``);
  const planLines = report.fixture.planDetails.length > 0
    ? report.fixture.planDetails.map((item) => `- ${item}`)
    : ["- (none)"];

  const lines = [
    "# Cloudflare D1 Collaboration Invitation Proof",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Schema ready | ${report.readiness.schemaReady ? "yes" : "no"} |`,
    `| Token issue ready | ${report.readiness.tokenIssueReady ? "yes" : "no"} |`,
    `| Delivery audit ready | ${report.readiness.deliveryAuditReady ? "yes" : "no"} |`,
    `| Resolve state ready | ${report.readiness.resolveStateReady ? "yes" : "no"} |`,
    `| Resolve audit ready | ${report.readiness.resolveAuditReady ? "yes" : "no"} |`,
    `| Accept by token ready | ${report.readiness.acceptByTokenReady ? "yes" : "no"} |`,
    `| Accept by id ready | ${report.readiness.acceptByIdReady ? "yes" : "no"} |`,
    `| Wrong account denied | ${report.readiness.wrongAccountDenied ? "yes" : "no"} |`,
    `| Replay denied | ${report.readiness.replayDenied ? "yes" : "no"} |`,
    `| Revoked terminal nulled | ${report.readiness.revokedTerminalNulled ? "yes" : "no"} |`,
    `| Rollback ready | ${report.readiness.rollbackReady ? "yes" : "no"} |`,
    `| Idempotency ready | ${report.readiness.idempotencyReady ? "yes" : "no"} |`,
    `| Query budget ready | ${report.readiness.queryBudgetReady ? "yes" : "no"} |`,
    `| Restore fixture ready | ${report.readiness.restoreFixtureReady ? "yes" : "no"} |`,
    `| Local collaboration-invitation D1 slice ready | ${report.readiness.localCollaborationInvitationD1SliceReady ? "yes" : "no"} |`,
    `| Production collaboration-invitation D1 ready | ${report.readiness.productionCollaborationInvitationD1Ready ? "yes" : "no"} |`,
    `| Local-only proof | ${report.localOnly ? "yes" : "no"} |`,
    `| Provider-backed D1 proof | ${report.providerBacked ? "yes" : "no"} |`,
    "",
    "## Affected RPCs",
    "",
    ...rpcLines,
    "",
    "## Local Fixture",
    "",
    "| Item | Value |",
    "| --- | ---: |",
    `| SQLite version | ${report.fixture.sqliteVersion} |`,
    `| Fixture tables | ${report.fixture.fixtureTables} |`,
    `| Seed rows | ${report.fixture.rowsSeeded} |`,
    `| Issued token rows | ${report.fixture.tokenIssueRows} |`,
    `| Active tokens after issue | ${report.fixture.activeTokensAfterIssue} |`,
    `| Revoked existing token rows | ${report.fixture.revokedExistingTokenRows} |`,
    `| Token issue audit rows | ${report.fixture.tokenIssueAuditRows} |`,
    `| Duplicate token retry rows | ${report.fixture.duplicateTokenRetryRows} |`,
    `| Delivery audit rows | ${report.fixture.deliveryAuditRows} |`,
    `| Duplicate delivery audit rows | ${report.fixture.duplicateDeliveryAuditRows} |`,
    `| Resolve active state | ${report.fixture.resolveActiveState ?? "(null)"} |`,
    `| Resolve invalid state | ${report.fixture.resolveInvalidState ?? "(null)"} |`,
    `| Resolve revoked state | ${report.fixture.resolveRevokedState ?? "(null)"} |`,
    `| Resolve revoked project id | ${report.fixture.resolveRevokedProjectId ?? "(null)"} |`,
    `| Resolve expired state | ${report.fixture.resolveExpiredState ?? "(null)"} |`,
    `| Resolve already-used state | ${report.fixture.resolveAlreadyUsedState ?? "(null)"} |`,
    `| Resolve open audit rows | ${report.fixture.resolveOpenAuditRows} |`,
    `| Active token opened rows | ${report.fixture.activeTokenOpenedRows} |`,
    `| Active invitation opened rows | ${report.fixture.activeInvitationOpenedRows} |`,
    `| Accept by token state | ${report.fixture.acceptByTokenState ?? "(null)"} |`,
    `| Accept by token replay state | ${report.fixture.acceptByTokenReplayState ?? "(null)"} |`,
    `| Accept by token membership rows | ${report.fixture.acceptByTokenMembershipRows} |`,
    `| Wrong account state | ${report.fixture.wrongAccountState ?? "(null)"} |`,
    `| Wrong account membership rows | ${report.fixture.wrongAccountMembershipRows} |`,
    `| Wrong account audit rows | ${report.fixture.wrongAccountAuditRows} |`,
    `| Already-used different-user state | ${report.fixture.alreadyUsedDifferentUserState ?? "(null)"} |`,
    `| Replay blocked audit rows | ${report.fixture.replayBlockedAuditRows} |`,
    `| Accept by id state | ${report.fixture.acceptByIdState ?? "(null)"} |`,
    `| Accept by id replay state | ${report.fixture.acceptByIdReplayState ?? "(null)"} |`,
    `| Accept by id membership rows | ${report.fixture.acceptByIdMembershipRows} |`,
    `| Duplicate accept audit rows | ${report.fixture.duplicateAcceptAuditRows} |`,
    `| Rollback command failed | ${report.fixture.rollbackCommandFailed ? "yes" : "no"} |`,
    `| Rollback residue rows | ${report.fixture.rollbackResidueRows} |`,
    `| Restored invitation rows | ${report.fixture.restoredInvitationRows} |`,
    `| Restored token rows | ${report.fixture.restoredTokenRows} |`,
    `| Restored audit rows | ${report.fixture.restoredAuditRows} |`,
    `| Temp artifacts removed | ${report.fixture.tempArtifactsRemoved ? "yes" : "no"} |`,
    "",
    "## Query Proof",
    "",
    "| Surface | Queries | Local p95 | Rows | Status | Notes |",
    "| --- | ---: | ---: | ---: | --- | --- |",
    ...markdownRows(queryRows),
    "",
    "## Index Plans",
    "",
    ...planLines,
    "",
    "## D1 Rewrite Strategy",
    "",
    report.d1RewriteStrategy.typeStrategy,
    "",
    ...preparedStatementLines,
    "",
    "## Sources",
    "",
    ...sourceLines,
    "",
    "## Production Proof Requirements",
    "",
    ...requirementLines,
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const report = buildCloudflareD1CollaborationInvitationProof();
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-collaboration-invitation-proof.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-collaboration-invitation-proof.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.localCollaborationInvitationD1SliceReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
