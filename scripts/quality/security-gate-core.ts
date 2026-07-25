import type { QualityFinding } from "./common";
import { evaluateBunAudit } from "./security-audit-core";
import { evaluateSarif } from "./security-sarif-core";
import { scanSecretText } from "./security-secret-core";
import { scanWorkflow } from "./workflow-security-core";

export interface SecurityTextInput {
  path: string;
  text: string;
}

export interface SecuritySarifInput {
  path: string;
  report: unknown;
}

export interface SecurityGateInput {
  auditReport: unknown;
  secretFiles: SecurityTextInput[];
  sarifReports: SecuritySarifInput[];
  workflows: SecurityTextInput[];
}

export function evaluateSecurityGate(input: SecurityGateInput): {
  findings: QualityFinding[];
  data: {
    audit: ReturnType<typeof evaluateBunAudit>;
    secrets: { scanned_files: number; findings: number };
    workflows: { scanned_workflows: number; findings: number };
    sarif: {
      status: "NOT_SUPPLIED" | "PASS" | "FAIL";
      reports: ReturnType<typeof evaluateSarif>[];
    };
    external: { github_code_scanning: "EXTERNAL_PENDING" };
  };
} {
  const audit = evaluateBunAudit(input.auditReport);
  const secretFindings = input.secretFiles.flatMap(({ path, text }) =>
    scanSecretText(path, text),
  );
  const workflowFindings = input.workflows.flatMap(({ path, text }) =>
    scanWorkflow(path, text),
  );
  if (input.workflows.length === 0) {
    workflowFindings.push({
      code: "NO_WORKFLOWS",
      message: "No active workflows were found",
    });
  }
  const sarifReports = input.sarifReports.map(({ path, report }) =>
    evaluateSarif(report, path),
  );
  const sarifFindings = sarifReports.flatMap((report) => report.findings);
  const findings = [
    ...audit.findings,
    ...secretFindings,
    ...workflowFindings,
    ...sarifFindings,
  ];
  return {
    findings,
    data: {
      audit,
      secrets: {
        scanned_files: input.secretFiles.length,
        findings: secretFindings.length,
      },
      workflows: {
        scanned_workflows: input.workflows.length,
        findings: workflowFindings.length,
      },
      sarif: {
        status:
          input.sarifReports.length === 0
            ? "NOT_SUPPLIED"
            : sarifFindings.length === 0
              ? "PASS"
              : "FAIL",
        reports: sarifReports,
      },
      external: { github_code_scanning: "EXTERNAL_PENDING" },
    },
  };
}
