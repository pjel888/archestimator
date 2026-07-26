import { describe, expect, it } from "vitest";
import {
  evaluateBunAudit,
  normalizeSecuritySeverity,
} from "../../../scripts/quality/security-audit-core";
import { evaluateSecurityGate } from "../../../scripts/quality/security-gate-core";
import { evaluateSarif } from "../../../scripts/quality/security-sarif-core";
import {
  isScannableSecurityPath,
  scanSecretText,
} from "../../../scripts/quality/security-secret-core";

describe("security static gate", () => {
  it("detects credentials without retaining the matched value", () => {
    const credential = `AKIA${"A".repeat(16)}`;
    const findings = scanSecretText("src/config.ts", `export const key = "${credential}";`);

    expect(findings.map((finding) => finding.code)).toContain(
      "SECRET_AWS_ACCESS_KEY",
    );
    expect(JSON.stringify(findings)).not.toContain(credential);
  });

  it("permits only explicitly marked synthetic fixtures in the fixture directory", () => {
    const credential = `AKIA${"B".repeat(16)}`;
    const findings = scanSecretText(
      "tests/fixtures/security/example.txt",
      `# quality-secret-scan: synthetic-fixture\n${credential}`,
    );

    expect(findings).toEqual([]);
    expect(
      scanSecretText("src/example.ts", `// quality-secret-scan: synthetic-fixture\n${credential}`),
    ).not.toEqual([]);
  });

  it("scans active source/config while excluding historical archives", () => {
    expect(isScannableSecurityPath("src/config.ts")).toBe(true);
    expect(isScannableSecurityPath(".github/workflows/quality.yml")).toBe(true);
    expect(
      isScannableSecurityPath(".ai/09_archive/store/old/generated.json"),
    ).toBe(false);
    expect(
      isScannableSecurityPath(".ai/03_plans/example/artifacts/inventory.csv"),
    ).toBe(false);
    const credential = `aB9_${"xY7/".repeat(7)}`;
    expect(
      scanSecretText("src/config.ts", `export const client_secret = "${credential}";`)
        .map((finding) => finding.code),
    ).toContain("SECRET_GENERIC_TOKEN");
  });

  it("scans Markdown credentials while leaving placeholders safe", () => {
    const credential = `AKIA${"C".repeat(16)}`;
    expect(isScannableSecurityPath("docs/security/runbook.md")).toBe(true);
    expect(
      scanSecretText(
        "docs/security/runbook.md",
        `Do not commit credentials.\nAWS_ACCESS_KEY_ID=${credential}`,
      ).map((finding) => finding.code),
    ).toContain("SECRET_AWS_ACCESS_KEY");
    expect(
      scanSecretText(
        "docs/security/example.md",
        "Set `AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID` before running.",
      ),
    ).toEqual([]);
  });

  it("normalizes Bun audit severity and fails high plus unwaived medium advisories", () => {
    const result = evaluateBunAudit({
      vulnerable: [
        {
          id: 101,
          severity: "high",
          title: "sensitive advisory detail",
          vulnerable_versions: "<1.2.3",
        },
        {
          id: 102,
          severity: "moderate",
          title: "another sensitive advisory detail",
          vulnerable_versions: "<2.0.0",
        },
      ],
    });

    expect(result.counts).toMatchObject({ high: 1, medium: 1 });
    expect(result.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["DEPENDENCY_HIGH", "DEPENDENCY_MEDIUM_UNWAIVED"]),
    );
    expect(JSON.stringify(result)).not.toContain("sensitive advisory detail");
  });

  it("normalizes numeric, alias, and unknown security severities", () => {
    expect([
      normalizeSecuritySeverity(9),
      normalizeSecuritySeverity("7.0"),
      normalizeSecuritySeverity("warning"),
      normalizeSecuritySeverity("note"),
      normalizeSecuritySeverity("none"),
      normalizeSecuritySeverity("unexpected"),
      normalizeSecuritySeverity(Number.NaN),
    ]).toEqual(["critical", "high", "medium", "low", "info", "unknown", "unknown"]);
  });

  it("fails malformed and unknown-severity audits without retaining unsafe labels", () => {
    expect(evaluateBunAudit(undefined).findings).toEqual([
      {
        code: "AUDIT_REPORT_MALFORMED",
        message: "Bun audit did not produce a JSON object",
      },
    ]);

    const result = evaluateBunAudit({
      vulnerable: [
        {
          id: "unsafe advisory text with spaces",
          package: "unsafe package text",
          severity: "unrated",
          title: "sensitive advisory detail",
        },
      ],
    });

    expect(result.findings.map((finding) => finding.code)).toEqual([
      "AUDIT_SEVERITY_UNKNOWN",
    ]);
    expect(result.advisories).toEqual([
      {
        identity: "advisory-1",
        package: "unknown-package",
        severity: "unknown",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("sensitive advisory detail");
    expect(JSON.stringify(result)).not.toContain("unsafe advisory text");
  });

  it("uses npm via severities and deduplicates advisories in first-seen order", () => {
    const result = evaluateBunAudit({
      vulnerabilities: {
        alpha: {
          severity: "critical",
          via: [
            { id: "ADV-1", severity: "low" },
            { id: "ADV-1", severity: "low" },
            { id: "ADV-2", severity: "moderate" },
          ],
        },
        beta: { id: "ADV-3", severity: "high", via: [] },
      },
    });

    expect(result.advisories).toEqual([
      { identity: "ADV-1", package: "alpha", severity: "low" },
      { identity: "ADV-2", package: "alpha", severity: "medium" },
      { identity: "ADV-3", package: "beta", severity: "high" },
    ]);
    expect(result.counts).toMatchObject({ critical: 0, high: 1, medium: 1, low: 1 });
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "DEPENDENCY_MEDIUM_UNWAIVED",
      "DEPENDENCY_HIGH",
    ]);
  });

  it("fails supplied high-severity SARIF without retaining messages or snippets", () => {
    const result = evaluateSarif(
      {
        version: "2.1.0",
        runs: [
          {
            tool: {
              driver: {
                name: "CodeQL",
                rules: [
                  {
                    id: "js/example",
                    properties: { "security-severity": "9.1" },
                  },
                ],
              },
            },
            results: [
              {
                ruleId: "js/example",
                message: { text: "sensitive result message" },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: "src/example.ts" },
                      region: { startLine: 12, snippet: { text: "raw source snippet" } },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      "artifacts/codeql/results.sarif",
    );

    expect(result.counts).toMatchObject({ critical: 1 });
    expect(result.findings.map((finding) => finding.code)).toContain("SARIF_CRITICAL");
    expect(JSON.stringify(result)).not.toContain("sensitive result message");
    expect(JSON.stringify(result)).not.toContain("raw source snippet");
  });

  it("resolves SARIF severity through a rule index", () => {
    const result = evaluateSarif(
      {
        version: "2.1.0",
        runs: [
          {
            tool: {
              driver: {
                name: "CodeQL",
                rules: [
                  {
                    id: "js/indexed",
                    properties: { "security-severity": "7.5" },
                  },
                ],
              },
            },
            results: [{ ruleIndex: 0 }],
          },
        ],
      },
      "artifacts/codeql/indexed.sarif",
    );

    expect(result.findings.map((finding) => finding.code)).toContain("SARIF_HIGH");
    expect(result.results[0]).toMatchObject({
      rule_id: "js/indexed",
      severity: "high",
    });
  });

  it("preserves SARIF severity-source precedence and fails unknown severity", () => {
    const result = evaluateSarif(
      {
        runs: [
          {
            tool: {
              driver: {
                rules: [
                  {
                    id: "rule/precedence",
                    properties: { "security-severity": "7.5", severity: "critical" },
                    defaultConfiguration: { level: "error" },
                  },
                ],
              },
            },
            results: [
              {
                ruleId: "rule/precedence",
                level: "error",
                properties: { "security-severity": "4.5", severity: "critical" },
              },
              { ruleIndex: 0, level: "warning" },
              { ruleId: "rule/unknown", level: "experimental" },
            ],
          },
        ],
      },
      "artifacts/codeql/precedence.sarif",
    );

    expect(result.results.map(({ rule_id, severity }) => ({ rule_id, severity }))).toEqual([
      { rule_id: "rule/precedence", severity: "medium" },
      { rule_id: "rule/precedence", severity: "high" },
      { rule_id: "rule/unknown", severity: "unknown" },
    ]);
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "SARIF_MEDIUM_UNWAIVED",
      "SARIF_HIGH",
      "SARIF_SEVERITY_UNKNOWN",
    ]);
  });

  it("sanitizes SARIF paths while retaining valid relative locations", () => {
    const result = evaluateSarif(
      {
        runs: [
          {
            results: [
              {
                ruleId: "valid/location",
                level: "error",
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: "src\\valid file.ts" },
                      region: { startLine: 8 },
                    },
                  },
                ],
              },
              {
                ruleId: "unsafe/location",
                level: "error",
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: "../../sensitive.ts" },
                      region: { startLine: "9" },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      "artifacts/codeql/locations.sarif",
    );

    expect(result.results).toEqual([
      {
        rule_id: "valid/location",
        severity: "high",
        path: "src/valid file.ts",
        line: 8,
      },
      {
        rule_id: "unsafe/location",
        severity: "high",
        path: undefined,
        line: undefined,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("sensitive.ts");
  });

  it("reports malformed SARIF elements in deterministic order", () => {
    const result = evaluateSarif(
      {
        runs: [
          null,
          {},
          {
            results: [null, { ruleId: "unknown/severity" }],
          },
        ],
      },
      "artifacts/codeql/malformed-elements.sarif",
    );

    expect(result.findings.map((finding) => finding.code)).toEqual([
      "SARIF_RUN_MALFORMED",
      "SARIF_RESULTS_MALFORMED",
      "SARIF_RESULT_MALFORMED",
      "SARIF_SEVERITY_UNKNOWN",
    ]);
    expect(result.counts.unknown).toBe(1);
  });

  it("preserves workflow failures and records absent hosted CodeQL as pending", () => {
    const result = evaluateSecurityGate({
      auditReport: {},
      secretFiles: [],
      sarifReports: [],
      workflows: [
        {
          path: ".github/workflows/bad.yml",
          text: [
            "jobs:",
            "  test:",
            "    continue-on-error: true",
            "    steps:",
            "      - uses: actions/checkout@v4",
            "      - run: bun test || true",
          ].join("\n"),
        },
      ],
    });

    expect(result.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "MUTABLE_ACTION",
        "CONTINUE_ON_ERROR",
        "SHELL_FAILURE_HIDDEN",
      ]),
    );
    expect(result.data.external.github_code_scanning).toBe("EXTERNAL_PENDING");
    expect(result.data.sarif.status).toBe("NOT_SUPPLIED");
  });

  it("fails closed when supplied SARIF is malformed", () => {
    const result = evaluateSecurityGate({
      auditReport: {},
      secretFiles: [],
      sarifReports: [{ path: "artifacts/codeql/malformed.sarif", report: undefined }],
      workflows: [{ path: ".github/workflows/quality.yml", text: "jobs: {}" }],
    });

    expect(result.data.sarif.status).toBe("FAIL");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "SARIF_REPORT_MALFORMED",
    );
  });
});
