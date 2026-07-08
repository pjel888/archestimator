import { describe, expect, it } from "vitest";

import {
  buildErrorHandlingContractReport,
  findSilentCatchViolations,
  parseErrorHandlingContractArgs,
} from "@/../scripts/check-error-handling-contract";

describe("error handling contract checker", () => {
  it("flags empty catch blocks and empty Promise catch handlers", () => {
    const violations = findSilentCatchViolations([
      {
        path: "src/app/api/example/route.ts",
        content: `
          try {
            await risky();
          } catch {}

          await notify().catch(() => {});
          await notify().catch(function () {});
        `,
      },
    ]);

    expect(violations).toHaveLength(3);
    expect(violations.map((violation) => violation.pattern)).toEqual([
      "catch-empty-block",
      "promise-catch-empty-arrow",
      "promise-catch-empty-function",
    ]);
  });

  it("passes handled catches and intentional value fallbacks", () => {
    const report = buildErrorHandlingContractReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      files: [
        {
          path: "src/app/api/example/route.ts",
          content: `
            try {
              await risky();
            } catch (error) {
              logAppError(error, { event: "route_error" });
            }

            const body = await request.json().catch(() => ({}));
            await notify().catch((error) => {
              logAppError(error, { event: "notification_failed" });
            });
          `,
        },
      ],
    });

    expect(report.passed).toBe(true);
    expect(report.failedChecks).toEqual([]);
    expect(report.violations).toEqual([]);
  });

  it("fails closed with static evidence when a sensitive scanned file swallows errors", () => {
    const report = buildErrorHandlingContractReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      targets: ["src/app/api"],
      files: [
        {
          path: "src/app/api/example/route.ts",
          content: "after(async () => { try { await analytics(); } catch { /* ignored */ } });",
        },
      ],
    });

    expect(report.passed).toBe(false);
    expect(report.failedChecks).toEqual(["silent-catch-handling"]);
    expect(report.scannedTargets).toEqual(["src/app/api"]);
    expect(report.violations[0]).toMatchObject({
      file: "src/app/api/example/route.ts",
      pattern: "catch-empty-block",
    });
  });

  it("fails closed when runtime user or operator code bypasses the structured logger", () => {
    const report = buildErrorHandlingContractReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      targets: ["src/app/share", "src/lib/email", "src/lib/uploads/operations-dashboard.ts"],
      files: [
        {
          path: "src/app/share/[token]/page.tsx",
          content: "export function log(error: unknown) { console.error(error); }",
        },
        {
          path: "src/lib/email/example.ts",
          content: "export function log(error: unknown) { console.error(error); }",
        },
        {
          path: "src/lib/uploads/operations-dashboard.ts",
          content: "export function log(error: unknown) { console.error(error); }",
        },
        {
          path: "scripts/example.ts",
          content: "console.error('CLI failure');",
        },
      ],
    });

    expect(report.passed).toBe(false);
    expect(report.failedChecks).toEqual(["structured-error-logging"]);
    expect(report.violations).toHaveLength(3);
    expect(report.violations.map((violation) => violation.file)).toEqual([
      "src/app/share/[token]/page.tsx",
      "src/lib/email/example.ts",
      "src/lib/uploads/operations-dashboard.ts",
    ]);
    expect(report.violations[0]).toMatchObject({
      pattern: "runtime-console-error",
    });
  });

  it("supports a custom output path and scan targets", () => {
    const parsed = parseErrorHandlingContractArgs(
      ["--output", ".ai/99_scratch/report.json", "--target", "src/app/api", "--target", "worker.ts"],
      {},
    );

    expect(parsed).toEqual({
      output: ".ai/99_scratch/report.json",
      targets: ["src/app/api", "worker.ts"],
      writeReport: true,
    });
  });

  it("supports read-only validation mode", () => {
    const parsed = parseErrorHandlingContractArgs(["--no-write", "--target", "src/lib/observability"], {});

    expect(parsed).toEqual({
      output: ".ai/03_plans/2026-07-08-agentic-error-observability-hardening/evidence/error-handling-contract-check.json",
      targets: ["src/lib/observability"],
      writeReport: false,
    });
  });

  it("supports env-gated read-only validation mode", () => {
    const parsed = parseErrorHandlingContractArgs([], {
      ERROR_HANDLING_CONTRACT_NO_WRITE: "1",
      ERROR_HANDLING_CONTRACT_OUTPUT_FILE: ".ai/99_scratch/read-only.json",
    });

    expect(parsed).toMatchObject({
      output: ".ai/99_scratch/read-only.json",
      writeReport: false,
    });
  });
});
