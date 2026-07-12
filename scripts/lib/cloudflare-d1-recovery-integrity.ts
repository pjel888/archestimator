import { createHash } from "node:crypto";

const REQUIRED_CORPORATE_OWNERSHIP_TRIGGERS = [
  "trg_corporate_accounts_require_creator_on_insert",
  "trg_corporate_accounts_require_creator_on_update",
  "trg_corporate_accounts_creator_is_owner",
  "trg_corporate_account_members_preserve_owner_on_delete",
  "trg_corporate_account_members_preserve_owner_on_role_change",
] as const;

const CORPORATE_ROLES = new Set(["owner", "team_leader", "member", "viewer"]);
const CORPORATE_STATUSES = new Set(["active", "suspended", "archived"]);

export type RecoverySchemaInventory = {
  tables: string[];
  indexes: string[];
  triggers: string[];
};

export type RecoveryCorporateAccount = {
  id: string;
  createdBy: string | null;
  status: string;
};

export type RecoveryCorporateMember = {
  corporateAccountId: string;
  userId: string;
  role: string;
};

export type RecoveryWorkspaceLink = {
  workspaceId: string;
  corporateAccountId: string | null;
};

export type RecoveryIntegritySnapshot = {
  targetId: string;
  exportDigest: string;
  migrationLedger: string[];
  schema: RecoverySchemaInventory;
  rowCounts: Record<string, number>;
  checksums: Record<string, string>;
  foreignKeyViolations: string[];
  orphanLabels: string[];
  corporateAccounts: RecoveryCorporateAccount[];
  corporateMembers: RecoveryCorporateMember[];
  workspaceLinks: RecoveryWorkspaceLink[];
  membershipDeleteAction: string;
  workspaceLinkDeleteAction: string;
  lastOwnerDeleteAbort: boolean;
  lastOwnerRoleChangeAbort: boolean;
  precisionSentinels: Record<string, string>;
};

export type RecoveryIntegrityCheck = {
  label: string;
  ready: boolean;
  detail: string;
};

export type RecoveryIntegrityReport = {
  targetIdentityDigest: string;
  exportDigest: string;
  overallReady: boolean;
  checks: RecoveryIntegrityCheck[];
  failedLabels: string[];
};

function sortedUnique(values: string[]) {
  return [...new Set(values)].sort();
}

function recordsMatch(left: Record<string, string | number>, right: Record<string, string | number>) {
  const leftEntries = Object.entries(left).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
  const rightEntries = Object.entries(right).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
  return JSON.stringify(leftEntries) === JSON.stringify(rightEntries);
}

function setMatches(actual: string[], expected: string[]) {
  return JSON.stringify(sortedUnique(actual)) === JSON.stringify(sortedUnique(expected));
}

function sequenceMatches(actual: string[], expected: string[]) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function identityDigest(targetId: string) {
  return createHash("sha256").update(targetId).digest("hex");
}

function check(label: string, ready: boolean, detail: string): RecoveryIntegrityCheck {
  return { label, ready, detail };
}

export function validateCloudflareD1RecoveryIntegrity(
  expected: RecoveryIntegritySnapshot,
  restored: RecoveryIntegritySnapshot,
): RecoveryIntegrityReport {
  const restoredAccountIds = new Set(restored.corporateAccounts.map((account) => account.id));
  const membersByAccount = new Map<string, RecoveryCorporateMember[]>();
  for (const member of restored.corporateMembers) {
    const members = membersByAccount.get(member.corporateAccountId) ?? [];
    members.push(member);
    membersByAccount.set(member.corporateAccountId, members);
  }

  const ownerComplete = restored.corporateAccounts.every((account) =>
    (membersByAccount.get(account.id) ?? []).some((member) => member.role === "owner"),
  );
  const creatorComplete = restored.corporateAccounts.every((account) => Boolean(account.createdBy?.trim()));
  const corporateReferencesValid = restored.corporateMembers.every((member) => restoredAccountIds.has(member.corporateAccountId))
    && restored.workspaceLinks.every((link) => link.corporateAccountId === null || restoredAccountIds.has(link.corporateAccountId));
  const validRoles = restored.corporateMembers.every((member) => CORPORATE_ROLES.has(member.role));
  const validStatuses = restored.corporateAccounts.every((account) => CORPORATE_STATUSES.has(account.status));

  const checks = [
    check("migration-ledger", sequenceMatches(restored.migrationLedger, expected.migrationLedger), "Applied migration ledger must match the expected ordered revision set."),
    check("schema-tables", setMatches(restored.schema.tables, expected.schema.tables), "Table inventory must match the expected schema."),
    check("schema-indexes", setMatches(restored.schema.indexes, expected.schema.indexes), "Index inventory must match the expected schema."),
    check(
      "schema-triggers",
      setMatches(restored.schema.triggers, expected.schema.triggers)
        && REQUIRED_CORPORATE_OWNERSHIP_TRIGGERS.every((trigger) => restored.schema.triggers.includes(trigger)),
      "Trigger inventory must match and include all corporate ownership triggers.",
    ),
    check("row-counts", recordsMatch(restored.rowCounts, expected.rowCounts), "Critical row-count aggregates must match."),
    check("checksums", recordsMatch(restored.checksums, expected.checksums), "Deterministic keyed checksums must match."),
    check("foreign-keys", restored.foreignKeyViolations.length === 0, "Foreign-key validation must have no violations."),
    check("orphans", restored.orphanLabels.length === 0 && corporateReferencesValid, "Known orphan predicates and corporate references must be clean."),
    check("corporate-owners", ownerComplete, "Every corporate account must retain at least one owner."),
    check("corporate-creator", creatorComplete, "Every corporate account must retain a nonblank creator."),
    check("corporate-role-set", validRoles, "Corporate member roles must remain within the approved enum."),
    check("corporate-status-set", validStatuses, "Corporate account statuses must remain within the approved enum."),
    check("membership-delete-action", restored.membershipDeleteAction === "CASCADE", "Corporate membership foreign key must retain CASCADE deletion."),
    check("workspace-link-delete-action", restored.workspaceLinkDeleteAction === "SET NULL", "Workspace corporate link must retain SET NULL deletion."),
    check("last-owner-delete-guard", restored.lastOwnerDeleteAbort, "Last-owner member deletion must abort."),
    check("last-owner-role-change-guard", restored.lastOwnerRoleChangeAbort, "Last-owner role demotion must abort."),
    check("precision-sentinels", recordsMatch(restored.precisionSentinels, expected.precisionSentinels), "Large integer and timestamp sentinels must match exactly."),
  ];
  const failedLabels = checks.filter((item) => !item.ready).map((item) => item.label);

  return {
    targetIdentityDigest: identityDigest(restored.targetId),
    exportDigest: restored.exportDigest,
    overallReady: failedLabels.length === 0 && restored.exportDigest === expected.exportDigest,
    checks,
    failedLabels: restored.exportDigest === expected.exportDigest ? failedLabels : [...failedLabels, "export-digest"],
  };
}
