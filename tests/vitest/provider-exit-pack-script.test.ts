import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROVIDER_EXIT_SCAN_PATHS,
  buildOperatorRecordTemplate,
  buildProviderExitPackReport,
  renderMarkdown,
  scanLegacyProviderReferences,
  type LegacyProviderReference,
} from "@/../scripts/generate-cloudflare-provider-exit-pack";

function artifact(value: Record<string, unknown>) {
  return {
    path: "/tmp/evidence.json",
    present: true,
    generatedAt:
      typeof value.generatedAt === "string" ? value.generatedAt : null,
    value,
    parseError: null,
  };
}

function missingArtifact(path = "/tmp/missing-evidence.json") {
  return {
    path,
    present: false,
    generatedAt: null,
    value: null,
    parseError: null,
  };
}

function malformedArtifact(path = "/tmp/malformed-evidence.json") {
  return {
    path,
    present: true,
    generatedAt: null,
    value: null,
    parseError: "Unexpected token '<' while parsing JSON",
  };
}

function greenAppRuntimeArtifacts(
  operatorRecord = missingArtifact("/tmp/provider-exit-operator-record.json"),
) {
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
        cases: [
          "signedOut",
          "allowed",
          "denied",
          "revoked",
          "expired",
          "malformed",
        ].map((name) => ({ name })),
      },
    }),
    latestDeploySourceSmoke: artifact({
      generatedAt: "2026-07-03T00:00:00.000Z",
      readiness: { latestDeploySourceSmokeReady: true },
      blockers: [],
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
      evidenceSource: "sanitized export decision record stored outside repo",
      rollbackDecision: "legacy providers will not be relied on for rollback",
      backupLocationDescription:
        "external secure storage; no raw path or secret recorded",
    },
    resendStatus: {
      status: "recorded",
      accountPlanStatus: "free account retained for audit-only access",
      accountEvidenceSource:
        "sanitized account status record stored outside repo",
      apiKeyStatus: "all app runtime keys revoked",
      apiKeyEvidenceSource:
        "sanitized API-key status record stored outside repo",
      sendingDomainStatus: "no active sending-domain dependency remains",
      domainEvidenceSource:
        "sanitized provider console screenshot stored outside repo",
    },
    obsoleteSecretRotation: {
      status: "recorded",
      cloudflareSecretNamesReviewed: true,
      obsoleteProviderSecretsRemovedOrRotated: true,
      secretValuesNotRecorded: true,
      evidenceSource: "sanitized secret-name review stored outside repo",
    },
    postExitSmoke: {
      status: "recorded",
      runAt: "2026-07-03T00:00:00.000Z",
      cloudflareSmokePassed: true,
      commands: ["bun run cf:release-gates", "bun run cf:check-email"],
      evidenceSource:
        "sanitized post-exit smoke transcript stored outside repo",
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
      evidenceSource: "sanitized recipient mailbox proof stored outside repo",
    },
  });
}

function runProviderExitPackCli(env: NodeJS.ProcessEnv) {
  return spawnSync(
    "bun",
    ["run", "scripts/generate-cloudflare-provider-exit-pack.ts"],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: "utf8",
      timeout: 30_000,
    },
  );
}

describe("provider exit pack script", () => {
  it("keeps the default runtime scan aligned with deploy-relevant config files", () => {
    expect(DEFAULT_PROVIDER_EXIT_SCAN_PATHS).toEqual(
      expect.arrayContaining([
        "src",
        "worker.ts",
        "package.json",
        "bun.lock",
        "wrangler.jsonc",
        "cloudflare-env.d.ts",
        "next.config.ts",
        "open-next.config.ts",
        "src/middleware.ts",
      ]),
    );
    expect(DEFAULT_PROVIDER_EXIT_SCAN_PATHS).not.toContain("src/proxy.ts");
  });

  it("classifies legacy-provider references from a real filesystem scan", () => {
    const dir = mkdtempSync(join(tmpdir(), "provider-exit-scan-"));
    const ignoredDir = join(dir, "node_modules", "legacy-provider");
    mkdirSync(ignoredDir, { recursive: true });
    writeFileSync(
      join(dir, "runtime.ts"),
      [
        'import { createClient } from "@supabase/supabase-js";',
        'import { Resend } from "resend";',
        "const provider = process.env.VERCEL_ENV;",
        "// resend invite action label only",
      ].join("\n"),
    );
    writeFileSync(
      join(dir, "metadata.json"),
      JSON.stringify({
        note: "resend invite label only",
      }),
    );
    writeFileSync(join(dir, "notes.md"), 'import { Resend } from "resend";');
    writeFileSync(
      join(ignoredDir, "runtime.ts"),
      'import { createClient } from "@supabase/supabase-js";',
    );

    const scan = scanLegacyProviderReferences([dir]);
    const blockers = scan.blockers.map((item) => ({
      provider: item.provider,
      file: item.file,
      line: item.line,
      snippet: item.snippet,
    }));
    const informational = scan.informational.map((item) => ({
      provider: item.provider,
      file: item.file,
      line: item.line,
      snippet: item.snippet,
    }));

    expect(scan.scannedPaths).toEqual([dir]);
    expect(blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "supabase", line: 1 }),
        expect.objectContaining({ provider: "resend", line: 2 }),
        expect.objectContaining({ provider: "vercel", line: 3 }),
      ]),
    );
    expect(informational).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "resend", line: 4 }),
        expect.objectContaining({
          provider: "resend",
          snippet: expect.stringContaining("resend invite label only"),
        }),
      ]),
    );
    expect(scan.blockerCount).toBe(3);
    expect(scan.informationalCount).toBe(2);
    expect(JSON.stringify(scan)).not.toContain("notes.md");
    expect(JSON.stringify(scan)).not.toContain("node_modules");
  });

  it("scans bun.lock as deploy-relevant text for legacy-provider package markers", () => {
    const dir = mkdtempSync(join(tmpdir(), "provider-exit-lockfile-"));
    const lockFile = join(dir, "bun.lock");
    writeFileSync(
      lockFile,
      [
        '    "resend": ["resend@6.5.1", "", {}, "sha512-redacted"],',
        '    "unrelated": ["unrelated@1.0.0", "", {}, "sha512-redacted"],',
      ].join("\n"),
    );

    const scan = scanLegacyProviderReferences([lockFile]);

    expect(scan.scannedPaths).toEqual([lockFile]);
    expect(scan.blockers).toEqual([
      expect.objectContaining({
        provider: "resend",
        severity: "blocker",
        line: 1,
      }),
    ]);
    expect(scan.blockerCount).toBe(1);
  });

  it("keeps provider exit open even when app runtime prerequisites are green", () => {
    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 1,
        blockers: [],
        informational: [
          {
            provider: "resend",
            severity: "informational",
            file: "src/lib/project-invites/actions.ts",
            line: 10,
            snippet: "export async function resendProjectInviteEmail() {}",
          },
        ],
      },
      artifacts: greenAppRuntimeArtifacts(),
    });

    expect(report.readiness.appRuntimeExitPrerequisitesReady).toBe(true);
    expect(report.readiness.providerExitReady).toBe(false);
    expect(report.blockers).toHaveLength(6);
    expect(report.operatorRecordDiagnostics.present).toBe(false);
    expect(report.operatorRecordDiagnostics.diagnostics).toHaveLength(6);
    expect(
      report.operatorRecordDiagnostics.diagnostics.every(
        (item) =>
          item.ready === false &&
          item.missingFields.includes("operator record file"),
      ),
    ).toBe(true);
    expect(
      report.gates
        .filter(
          (gate) =>
            gate.evidence ===
            "sanitized provider-exit operator record required",
        )
        .map((gate) => gate.key),
    ).toEqual([
      "exports-or-retention-decision-recorded",
      "resend-account-status-recorded",
      "obsolete-secret-rotation-recorded",
      "post-exit-smoke-recorded",
      "non-owner-google-proof-recorded",
      "recipient-mailbox-proof-or-deferral-recorded",
    ]);
    expect(report.blockers).toContainEqual(
      expect.stringContaining("Provider exports or accepted-retention"),
    );
    expect(report.blockers).toContainEqual(
      expect.stringContaining(
        "No real non-owner Google account journey evidence or accepted deferral",
      ),
    );
    expect(renderMarkdown(report)).toContain("Provider exit ready: **OPEN**");
    expect(renderMarkdown(report)).toContain(
      "Real non-owner Google proof or accepted deferral recorded",
    );
    expect(renderMarkdown(report)).toContain("## Operator Record Diagnostics");
  });

  it("uses the current provider-resource readback artifact by default", () => {
    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
    });

    expect(
      report.gates.find((gate) => gate.key === "provider-resources-readable")
        ?.evidence,
    ).toBe(
      ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-provider-resource-readback.json",
    );
  });

  it("keeps default pack generation non-fatal but fails strict readiness mode on provider-exit blockers", () => {
    const dir = mkdtempSync(join(tmpdir(), "provider-exit-pack-strict-"));
    const defaultOutputFile = join(dir, "default.json");
    const defaultMarkdownFile = join(dir, "default.md");
    const strictOutputFile = join(dir, "strict.json");
    const strictMarkdownFile = join(dir, "strict.md");
    const missingOperatorRecord = join(dir, "missing-operator-record.json");

    const baseEnv = {
      FAIL_ON_BLOCKERS: "0",
      PROVIDER_EXIT_OPERATOR_RECORD_FILE: missingOperatorRecord,
      STRICT_READINESS_EXIT: "0",
    };

    const defaultRun = runProviderExitPackCli({
      ...baseEnv,
      OUTPUT_FILE: defaultOutputFile,
      MARKDOWN_FILE: defaultMarkdownFile,
    });

    expect(defaultRun.status).toBe(0);
    expect(defaultRun.stderr).toBe("");
    expect(
      JSON.parse(readFileSync(defaultOutputFile, "utf8")).readiness
        .providerExitReady,
    ).toBe(false);

    const strictRun = runProviderExitPackCli({
      ...baseEnv,
      OUTPUT_FILE: strictOutputFile,
      MARKDOWN_FILE: strictMarkdownFile,
      STRICT_READINESS_EXIT: "1",
    });

    expect(strictRun.status).toBe(1);
    expect(strictRun.stderr).toBe("");
    expect(
      JSON.parse(readFileSync(strictOutputFile, "utf8")).readiness
        .providerExitReady,
    ).toBe(false);
    expect(strictRun.stdout).toContain('"strictReadinessExit": true');
    expect(strictRun.stdout).toContain('"exitCode": 1');
  });

  it("treats active legacy service imports as blocker-level references", () => {
    const blocker: LegacyProviderReference = {
      provider: "resend",
      severity: "blocker",
      file: "src/lib/email/legacy.ts",
      line: 1,
      snippet: 'import { Resend } from "resend";',
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
    expect(
      report.gates.find(
        (gate) => gate.key === "no-active-legacy-provider-runtime",
      )?.ready,
    ).toBe(false);
    expect(renderMarkdown(report)).toContain("src/lib/email/legacy.ts:1");
  });

  it("keeps app runtime exit prerequisites open when latest deploy/source smoke is stale", () => {
    const artifacts = greenAppRuntimeArtifacts();
    artifacts.latestDeploySourceSmoke = artifact({
      generatedAt: "2026-07-03T00:00:00.000Z",
      readiness: { latestDeploySourceSmokeReady: false },
      blockers: [
        "Deploy evidence does not record the deployed git source commit.",
      ],
    });

    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
      artifacts,
    });

    expect(report.readiness.appRuntimeExitPrerequisitesReady).toBe(false);
    expect(report.readiness.providerExitReady).toBe(false);
    expect(
      report.gates.find(
        (gate) => gate.key === "latest-deploy-source-smoke-ready",
      )?.ready,
    ).toBe(false);
    expect(report.blockers).toContainEqual(
      expect.stringContaining("Latest deploy source smoke ready"),
    );
  });

  it("keeps app runtime exit prerequisites open when latest deploy/source smoke JSON is malformed", () => {
    const artifacts = greenAppRuntimeArtifacts();
    artifacts.latestDeploySourceSmoke = malformedArtifact(
      "/tmp/latest-deploy-source-smoke.json",
    );

    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
      artifacts,
    });

    expect(report.readiness.appRuntimeExitPrerequisitesReady).toBe(false);
    expect(report.artifacts.latestDeploySourceSmoke).toMatchObject({
      present: true,
      generatedAt: null,
      parseError: "Unexpected token '<' while parsing JSON",
    });
    expect(
      report.gates.find(
        (gate) => gate.key === "latest-deploy-source-smoke-ready",
      )?.blocker,
    ).toBe(
      "Latest deployed-source smoke proof is missing, malformed, stale, or blocked.",
    );
  });

  it("reports malformed operator records without treating parse failures as sanitized evidence", () => {
    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
      artifacts: greenAppRuntimeArtifacts(
        malformedArtifact("/tmp/provider-exit-operator-record.json"),
      ),
    });

    expect(report.readiness.providerExitReady).toBe(false);
    expect(report.artifacts.operatorRecord).toMatchObject({
      present: true,
      generatedAt: null,
      parseError: "Unexpected token '<' while parsing JSON",
    });
    expect(report.operatorRecordDiagnostics.present).toBe(true);
    expect(
      report.operatorRecordDiagnostics.diagnostics.every(
        (item) =>
          item.ready === false &&
          item.missingFields.includes("operator record JSON parse error"),
      ),
    ).toBe(true);
    expect(
      report.gates.find(
        (gate) => gate.key === "exports-or-retention-decision-recorded",
      )?.evidence,
    ).toBe("sanitized provider-exit operator record required");
    expect(renderMarkdown(report)).toContain(
      "operator record JSON parse error",
    );
    expect(JSON.stringify(report)).not.toContain(
      "private-operator-record-sentinel",
    );
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
    expect(
      report.gates.find((gate) => gate.key === "post-exit-smoke-recorded")
        ?.evidence,
    ).toBe("/tmp/evidence.json");
    expect(
      report.operatorRecordDiagnostics.diagnostics.every((item) => item.ready),
    ).toBe(true);

    const serializedReport = JSON.stringify(report);
    const markdown = renderMarkdown(report);
    expect(serializedReport).not.toContain(
      "private-sentinel-operator-record-value",
    );
    expect(markdown).not.toContain("private-sentinel-operator-record-value");
    expect(markdown).not.toContain("external secure storage");
  });

  it("marks accepted non-owner Google deferral ready only with acceptedBy and deferralRationale", () => {
    const operatorRecord = completeOperatorRecord();
    const value = operatorRecord.value as Record<
      string,
      Record<string, unknown>
    >;
    value.nonOwnerGoogleProof = {
      status: "accepted-deferral",
      acceptedBy: "owner",
      deferralRationale:
        "owner accepted separate non-owner Google proof as a post-launch follow-up",
    };

    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
      artifacts: greenAppRuntimeArtifacts(operatorRecord),
    });

    const gate = report.gates.find(
      (item) => item.key === "non-owner-google-proof-recorded",
    );
    const diagnostic = report.operatorRecordDiagnostics.diagnostics.find(
      (item) => item.gateKey === "non-owner-google-proof-recorded",
    );

    expect(report.readiness.providerExitReady).toBe(true);
    expect(gate?.ready).toBe(true);
    expect(gate?.label).toBe(
      "Real non-owner Google proof or accepted deferral recorded",
    );
    expect(diagnostic).toMatchObject({
      ready: true,
      status: "accepted-deferral",
      acceptedDeferral: true,
      missingFields: [],
    });
  });

  it("keeps recipient mailbox deferral open when acceptance metadata is missing", () => {
    const operatorRecord = completeOperatorRecord();
    const value = operatorRecord.value as Record<
      string,
      Record<string, unknown>
    >;
    value.recipientMailboxProofOrDeferral = {
      status: "accepted-deferral",
      acceptedBy: "",
      deferralRationale: "",
    };

    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
      artifacts: greenAppRuntimeArtifacts(operatorRecord),
    });

    const gate = report.gates.find(
      (item) => item.key === "recipient-mailbox-proof-or-deferral-recorded",
    );
    const diagnostic = report.operatorRecordDiagnostics.diagnostics.find(
      (item) => item.gateKey === "recipient-mailbox-proof-or-deferral-recorded",
    );

    expect(report.readiness.providerExitReady).toBe(false);
    expect(gate?.ready).toBe(false);
    expect(diagnostic).toMatchObject({
      ready: false,
      status: "accepted-deferral",
      acceptedDeferral: true,
      missingFields: [
        "recipientMailboxProofOrDeferral.acceptedBy",
        "recipientMailboxProofOrDeferral.deferralRationale",
      ],
    });
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
      artifacts: greenAppRuntimeArtifacts(
        artifact({
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
        }),
      ),
    });

    const exportsDiagnostic = report.operatorRecordDiagnostics.diagnostics.find(
      (item) => item.gateKey === "exports-or-retention-decision-recorded",
    );
    const resendDiagnostic = report.operatorRecordDiagnostics.diagnostics.find(
      (item) => item.gateKey === "resend-account-status-recorded",
    );
    const nonOwnerDiagnostic =
      report.operatorRecordDiagnostics.diagnostics.find(
        (item) => item.gateKey === "non-owner-google-proof-recorded",
      );

    expect(report.readiness.providerExitReady).toBe(false);
    expect(exportsDiagnostic?.missingFields).toEqual([
      "finalExportsOrRetentionDecision.evidenceSource",
      "finalExportsOrRetentionDecision.backupLocationDescription",
    ]);
    expect(resendDiagnostic?.missingFields).toEqual([
      "resendStatus.accountPlanStatus",
      "resendStatus.accountEvidenceSource",
      "resendStatus.apiKeyStatus",
      "resendStatus.apiKeyEvidenceSource",
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
    expect(markdown).toContain(
      "finalExportsOrRetentionDecision.backupLocationDescription",
    );
    expect(markdown).toContain(
      "nonOwnerGoogleProof.status=recorded\\|accepted-deferral",
    );
    expect(JSON.stringify(report)).not.toContain("private-owner-name-sentinel");
    expect(markdown).not.toContain("private rollback note sentinel");
  });

  it("does not echo unexpected operator status values into diagnostics", () => {
    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
      artifacts: greenAppRuntimeArtifacts(
        artifact({
          generatedAt: "2026-07-03T00:00:00.000Z",
          finalExportsOrRetentionDecision: {
            status: "private-status-sentinel",
            decision: "accepted-loss",
            acceptedBy: "owner",
            evidenceSource: "sanitized evidence pointer",
            rollbackDecision: "owner accepts no legacy rollback",
          },
        }),
      ),
    });

    const diagnostic = report.operatorRecordDiagnostics.diagnostics.find(
      (item) => item.gateKey === "exports-or-retention-decision-recorded",
    );
    const serializedReport = JSON.stringify(report);
    const markdown = renderMarkdown(report);

    expect(report.readiness.providerExitReady).toBe(false);
    expect(diagnostic?.status).toBe("invalid-or-unsupported");
    expect(diagnostic?.missingFields).toContain(
      "finalExportsOrRetentionDecision.status=recorded",
    );
    expect(serializedReport).not.toContain("private-status-sentinel");
    expect(markdown).not.toContain("private-status-sentinel");
  });

  it("generates a sanitized operator record template that does not close provider-exit gates", () => {
    const template = buildOperatorRecordTemplate("2026-07-03T00:00:00.000Z");
    const serializedTemplate = JSON.stringify(template);

    expect(template.mode).toBe("cloudflare-provider-exit-operator-record");
    expect(serializedTemplate).toContain("finalExportsOrRetentionDecision");
    expect(serializedTemplate).toContain("evidenceSource");
    expect(serializedTemplate).toContain("secretValuesNotRecorded");
    expect(serializedTemplate).not.toContain(
      "private-sentinel-operator-record-value",
    );

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
    expect(
      report.operatorRecordDiagnostics.diagnostics.every((item) => !item.ready),
    ).toBe(true);
  });

  it("does not close external provider gates with booleans but no sanitized evidence-source pointers", () => {
    const operatorRecord = completeOperatorRecord();
    const value = operatorRecord.value as Record<
      string,
      Record<string, unknown>
    >;
    delete value.finalExportsOrRetentionDecision.evidenceSource;
    delete value.resendStatus.accountEvidenceSource;
    delete value.resendStatus.apiKeyEvidenceSource;
    delete value.obsoleteSecretRotation.evidenceSource;
    delete value.postExitSmoke.evidenceSource;
    delete value.recipientMailboxProofOrDeferral.evidenceSource;

    const report = buildProviderExitPackReport({
      generatedAt: "2026-07-03T00:00:00.000Z",
      scan: {
        scannedPaths: ["src", "worker.ts"],
        blockerCount: 0,
        informationalCount: 0,
        blockers: [],
        informational: [],
      },
      artifacts: greenAppRuntimeArtifacts(operatorRecord),
    });

    const diagnostics = new Map(
      report.operatorRecordDiagnostics.diagnostics.map((item) => [
        item.gateKey,
        item.missingFields,
      ]),
    );

    expect(report.readiness.appRuntimeExitPrerequisitesReady).toBe(true);
    expect(report.readiness.providerExitReady).toBe(false);
    expect(diagnostics.get("exports-or-retention-decision-recorded")).toContain(
      "finalExportsOrRetentionDecision.evidenceSource",
    );
    expect(diagnostics.get("resend-account-status-recorded")).toEqual([
      "resendStatus.accountEvidenceSource",
      "resendStatus.apiKeyEvidenceSource",
    ]);
    expect(diagnostics.get("obsolete-secret-rotation-recorded")).toContain(
      "obsoleteSecretRotation.evidenceSource",
    );
    expect(diagnostics.get("post-exit-smoke-recorded")).toContain(
      "postExitSmoke.evidenceSource",
    );
    expect(
      diagnostics.get("recipient-mailbox-proof-or-deferral-recorded"),
    ).toContain("recipientMailboxProofOrDeferral.evidenceSource");
  });

  it("does not close obsolete secret rotation when the operator record admits secret values were recorded", () => {
    const operatorRecord = completeOperatorRecord();
    (
      operatorRecord.value?.obsoleteSecretRotation as Record<string, unknown>
    ).secretValuesNotRecorded = false;

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
    expect(
      report.gates.find(
        (gate) => gate.key === "obsolete-secret-rotation-recorded",
      )?.ready,
    ).toBe(false);
    expect(report.blockers).toContainEqual(
      expect.stringContaining("Obsolete provider secret removal"),
    );
  });
});
