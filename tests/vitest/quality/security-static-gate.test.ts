import { describe, expect, it } from "vitest";
import { evaluateBunAudit } from "../../../scripts/quality/security-audit-core";
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
