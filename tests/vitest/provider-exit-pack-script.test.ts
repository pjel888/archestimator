import { describe, expect, it } from "vitest";

import {
  buildOperatorRecordTemplate,
  buildProviderExitPackReport,
  renderMarkdown,
  type LegacyProviderReference,
} from "@/../scripts/generate-cloudflare-provider-exit-pack";

function artifact(value: Record<string, unknown>) {
  return {
    path: "/tmp/evidence.json",
    present: true,
    generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : null,
    value,
  };
}

function missingArtifact(path = "/tmp/missing-evidence.json") {
  return {
    path,
    present: false,
    generatedAt: null,
    value: null,
  };
}

function greenAppRuntimeArtifacts(operatorRecord = missingArtifact("/tmp/provider-exit-operator-record.json")) {
  return {
    releaseGates: artifact({
      generatedAt: "2026-07-03T00:00:00.000Z",
      readiness: { productionCutoverReady: true },
      blockers: [],
    }),
    providerResources: artifact({
      generatedAt: "2026-07-03T00:00:00.000Z",
      readiness: { providerResourceReadbackReady: true },
      blockers: [],
    }),
    emailReadiness: artifact({
      generatedAt: "2026-07-03T00:00:00.000Z",
      productionEmailReady: true,
      blockers: [],
    }),
    hostedAuthMatrix: artifact({
      generatedAt: "2026-07-03T00:00:00.000Z",
      passed: true,
      cleanupPassed: true,
      authResult: {
        cases: ["signedOut", "allowed", "denied", "revoked", "expired", "malformed"]
          .map((name) => ({ name })),
      },
    }),
    operatorRecord,
  };
}

function completeOperatorRecord() {
  return artifact({
    generatedAt: "2026-07-03T00:00:00.000Z",
    privateEvidenceNote: "private-sentinel-operator-record-value",
    finalExportsOrRetentionDecision: {
      status: "recorded",
      decision: "exported",
      acceptedBy: "owner",
      rollbackDecision: "legacy providers will not be relied on for rollback",
      backupLocationDescription: "external secure storage; no raw path or secret recorded",
    },
    resendStatus: {
      status: "recorded",
      accountPlanStatus: "free account retained for audit-only access",
      apiKeyStatus: "all app runtime keys revoked",
      sendingDomainStatus: "no active sending-domain dependency remains",
      domainEvidenceSource: "sanitized provider console screenshot stored outside repo",
    },
    obsoleteSecretRotation: {
      status: "recorded",
      cloudflareSecretNamesReviewed: true,
      obsoleteProviderSecretsRemovedOrRotated: true,
      secretValuesNotRecorded: true,
    },
    postExitSmoke: {
      status: "recorded",
      runAt: "2026-07-03T00:00:00.000Z",
      cloudflareSmokePassed: true,
      commands: ["bun run cf:release-gates", "bun run cf:check-email"],
    },
    nonOwnerGoogleProof: {
      status: "recorded",
      policyOutcome: "/access-required",
      evidenceSource: "sanitized tester evidence stored outside repo",
      noCredentialsOrCookiesRecorded: true,
    },
    recipientMailboxProofOrDeferral: {
      status: "recorded",
      mailboxReceiptObserved: true,
      recipientScopedActionObserved: true,
      noPrivateEmailContentRecorded: true,
    },
  });
}

describe("provider exit pack script", () => {
  it("keeps provider exit open even when app runtime prerequisites are green", () => {
    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 1,
        blockers: [],
        informational: [{
          provider: "resend",
          severity: "informational",
          file: "src/lib/project-invites/actions.ts",
          line: 10,
          snippet: "export async function resendProjectInviteEmail() {}",
        }],
      },
      artifacts: greenAppRuntimeArtifacts(),
    });

    expect(report.readiness.appRuntimeExitPrerequisitesReady).toBe(true);
    expect(report.readiness.providerExitReady).toBe(false);
    expect(report.blockers).toHaveLength(6);
    expect(report.operatorRecordDiagnostics.present).toBe(false);
    expect(report.operatorRecordDiagnostics.diagnostics).toHaveLength(6);
    expect(report.operatorRecordDiagnostics.diagnostics.every((item) => (
      item.ready === false && item.missingFields.includes("operator record file")
    ))).toBe(true);
    expect(report.gates
      .filter((gate) => gate.evidence === "sanitized provider-exit operator record required")
      .map((gate) => gate.key))
      .toEqual([
        "exports-or-retention-decision-recorded",
        "resend-account-status-recorded",
        "obsolete-secret-rotation-recorded",
        "post-exit-smoke-recorded",
        "non-owner-google-proof-recorded",
        "recipient-mailbox-proof-or-deferral-recorded",
      ]);
    expect(report.blockers).toContainEqual(expect.stringContaining("Provider exports or accepted-retention"));
    expect(renderMarkdown(report)).toContain("Provider exit ready: **OPEN**");
    expect(renderMarkdown(report)).toContain("## Operator Record Diagnostics");
  });

  it("treats active legacy service imports as blocker-level references", () => {
    const blocker: LegacyProviderReference = {
      provider: "resend",
      severity: "blocker",
      file: "src/lib/email/legacy.ts",
      line: 1,
      snippet: "import { Resend } from \"resend\";",
    };
    const report = buildProviderExitPackReport({
      scan: {
        scannedPaths: ["src"],
        blockerCount: 1,
        informationalCount: 0,
        blockers: [blocker],
        informational: [],
      },
      artifacts: greenAppRuntimeArtifacts(),
    });

    expect(report.readiness.appRuntimeExitPrerequisitesReady).toBe(false);
    expect(report.gates.find((gate) => gate.key === "no-active-legacy-provider-runtime")?.ready).toBe(false);
    expect(renderMarkdown(report)).toContain("src/lib/email/legacy.ts:1");
  });

  it("marks provider exit ready when sanitized operator evidence closes the external gates", () => {
    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
      artifacts: greenAppRuntimeArtifacts(completeOperatorRecord()),
    });

    expect(report.readiness.appRuntimeExitPrerequisitesReady).toBe(true);
    expect(report.readiness.providerExitReady).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.gates.find((gate) => gate.key === "post-exit-smoke-recorded")?.evidence).toBe("/tmp/evidence.json");
    expect(report.operatorRecordDiagnostics.diagnostics.every((item) => item.ready)).toBe(true);

    const serializedReport = JSON.stringify(report);
    const markdown = renderMarkdown(report);
    expect(serializedReport).not.toContain("private-sentinel-operator-record-value");
    expect(markdown).not.toContain("private-sentinel-operator-record-value");
    expect(markdown).not.toContain("external secure storage");
  });

  it("reports missing operator fields without echoing private operator values", () => {
    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
      artifacts: greenAppRuntimeArtifacts(artifact({
        generatedAt: "2026-07-03T00:00:00.000Z",
        finalExportsOrRetentionDecision: {
          status: "recorded",
          decision: "exported",
          acceptedBy: "private-owner-name-sentinel",
          rollbackDecision: "private rollback note sentinel",
        },
        resendStatus: {
          status: "recorded",
        },
      })),
    });

    const exportsDiagnostic = report.operatorRecordDiagnostics.diagnostics
      .find((item) => item.gateKey === "exports-or-retention-decision-recorded");
    const resendDiagnostic = report.operatorRecordDiagnostics.diagnostics
      .find((item) => item.gateKey === "resend-account-status-recorded");
    const nonOwnerDiagnostic = report.operatorRecordDiagnostics.diagnostics
      .find((item) => item.gateKey === "non-owner-google-proof-recorded");

    expect(report.readiness.providerExitReady).toBe(false);
    expect(exportsDiagnostic?.missingFields).toEqual([
      "finalExportsOrRetentionDecision.backupLocationDescription",
    ]);
    expect(resendDiagnostic?.missingFields).toEqual([
      "resendStatus.accountPlanStatus",
      "resendStatus.apiKeyStatus",
      "resendStatus.sendingDomainStatus",
      "resendStatus.domainEvidenceSource",
    ]);
    expect(nonOwnerDiagnostic?.missingFields).toEqual([
      "nonOwnerGoogleProof.status=recorded|accepted-deferral",
      "nonOwnerGoogleProof.policyOutcome",
      "nonOwnerGoogleProof.evidenceSource",
      "nonOwnerGoogleProof.noCredentialsOrCookiesRecorded=true",
    ]);

    const markdown = renderMarkdown(report);
    expect(markdown).toContain("finalExportsOrRetentionDecision.backupLocationDescription");
    expect(markdown).toContain("nonOwnerGoogleProof.status=recorded\\|accepted-deferral");
    expect(JSON.stringify(report)).not.toContain("private-owner-name-sentinel");
    expect(markdown).not.toContain("private rollback note sentinel");
  });

  it("generates a sanitized operator record template that does not close provider-exit gates", () => {
    const template = buildOperatorRecordTemplate("2026-07-03T00:00:00.000Z");
    const serializedTemplate = JSON.stringify(template);

    expect(template.mode).toBe("cloudflare-provider-exit-operator-record");
    expect(serializedTemplate).toContain("finalExportsOrRetentionDecision");
    expect(serializedTemplate).toContain("secretValuesNotRecorded");
    expect(serializedTemplate).not.toContain("private-sentinel-operator-record-value");

    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
      artifacts: greenAppRuntimeArtifacts(artifact(template)),
    });

    expect(report.readiness.appRuntimeExitPrerequisitesReady).toBe(true);
    expect(report.readiness.providerExitReady).toBe(false);
    expect(report.operatorRecordDiagnostics.present).toBe(true);
    expect(report.operatorRecordDiagnostics.diagnostics.every((item) => !item.ready)).toBe(true);
  });

  it("does not close obsolete secret rotation when the operator record admits secret values were recorded", () => {
    const operatorRecord = completeOperatorRecord();
    (operatorRecord.value?.obsoleteSecretRotation as Record<string, unknown>).secretValuesNotRecorded = false;

    const report = buildProviderExitPackReport({
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
      artifacts: greenAppRuntimeArtifacts(operatorRecord),
    });

    expect(report.readiness.providerExitReady).toBe(false);
    expect(report.gates.find((gate) => gate.key === "obsolete-secret-rotation-recorded")?.ready).toBe(false);
    expect(report.blockers).toContainEqual(expect.stringContaining("Obsolete provider secret removal"));
  });
});
