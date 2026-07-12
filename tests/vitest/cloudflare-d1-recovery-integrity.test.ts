import { describe, expect, it } from "vitest";

import {
  validateCloudflareD1RecoveryIntegrity,
  type RecoveryIntegritySnapshot,
} from "../../scripts/lib/cloudflare-d1-recovery-integrity";

const ownershipTriggers = [
  "trg_corporate_accounts_require_creator_on_insert",
  "trg_corporate_accounts_require_creator_on_update",
  "trg_corporate_accounts_creator_is_owner",
  "trg_corporate_account_members_preserve_owner_on_delete",
  "trg_corporate_account_members_preserve_owner_on_role_change",
];

function fixture(): RecoveryIntegritySnapshot {
  return {
    targetId: "disposable-target-id",
    exportDigest: "export-digest",
    migrationLedger: ["0052", "0053", "0069"],
    schema: {
      tables: ["corporate_accounts", "corporate_account_members", "workspaces"],
      indexes: ["idx_corp_members_account_role", "idx_workspaces_corporate_account"],
      triggers: ownershipTriggers,
    },
    rowCounts: { corporate_accounts: 1, corporate_account_members: 1, workspaces: 1 },
    checksums: { corporate_accounts: "accounts-checksum", corporate_account_members: "members-checksum" },
    foreignKeyViolations: [],
    orphanLabels: [],
    corporateAccounts: [{ id: "corporate-1", createdBy: "creator-1", status: "active" }],
    corporateMembers: [{ corporateAccountId: "corporate-1", userId: "creator-1", role: "owner" }],
    workspaceLinks: [{ workspaceId: "workspace-1", corporateAccountId: "corporate-1" }],
    membershipDeleteAction: "CASCADE",
    workspaceLinkDeleteAction: "SET NULL",
    lastOwnerDeleteAbort: true,
    lastOwnerRoleChangeAbort: true,
    precisionSentinels: { largeInteger: "9007199254740991", timestamp: "2026-07-12T00:00:00.000Z" },
  };
}

describe("Cloudflare D1 recovery integrity", () => {
  it("accepts a matching snapshot and reports digests without raw target identity", () => {
    const expected = fixture();
    const report = validateCloudflareD1RecoveryIntegrity(expected, fixture());

    expect(report.overallReady).toBe(true);
    expect(report.failedLabels).toEqual([]);
    expect(report.targetIdentityDigest).not.toContain(expected.targetId);
    expect(report.checks.every((item) => item.ready)).toBe(true);
  });

  it.each([
    ["missing migration", (value: RecoveryIntegritySnapshot) => ({ ...value, migrationLedger: ["0052", "0069"] }), "migration-ledger"],
    ["reordered migration", (value: RecoveryIntegritySnapshot) => ({ ...value, migrationLedger: ["0053", "0052", "0069"] }), "migration-ledger"],
    ["missing ownership trigger", (value: RecoveryIntegritySnapshot) => ({ ...value, schema: { ...value.schema, triggers: ownershipTriggers.slice(0, -1) } }), "schema-triggers"],
    ["row mutation", (value: RecoveryIntegritySnapshot) => ({ ...value, rowCounts: { ...value.rowCounts, corporate_accounts: 2 } }), "row-counts"],
    ["checksum drift", (value: RecoveryIntegritySnapshot) => ({ ...value, checksums: { ...value.checksums, corporate_accounts: "changed" } }), "checksums"],
    ["foreign key violation", (value: RecoveryIntegritySnapshot) => ({ ...value, foreignKeyViolations: ["workspace-link"] }), "foreign-keys"],
    ["ownerless account", (value: RecoveryIntegritySnapshot) => ({ ...value, corporateMembers: [] }), "corporate-owners"],
    ["blank creator", (value: RecoveryIntegritySnapshot) => ({ ...value, corporateAccounts: [{ ...value.corporateAccounts[0]!, createdBy: " " }] }), "corporate-creator"],
    ["last owner guard drift", (value: RecoveryIntegritySnapshot) => ({ ...value, lastOwnerDeleteAbort: false }), "last-owner-delete-guard"],
    ["precision drift", (value: RecoveryIntegritySnapshot) => ({ ...value, precisionSentinels: { ...value.precisionSentinels, largeInteger: "9007199254740990" } }), "precision-sentinels"],
  ])("reports stable %s labels", (_name, mutate, expectedLabel) => {
    const expected = fixture();
    const report = validateCloudflareD1RecoveryIntegrity(expected, mutate(fixture()));

    expect(report.overallReady).toBe(false);
    expect(report.failedLabels).toContain(expectedLabel);
  });

  it("fails a mismatched export digest even when all other checks match", () => {
    const expected = fixture();
    const restored = { ...fixture(), exportDigest: "other-export-digest" };
    const report = validateCloudflareD1RecoveryIntegrity(expected, restored);

    expect(report.overallReady).toBe(false);
    expect(report.failedLabels).toContain("export-digest");
  });
});
