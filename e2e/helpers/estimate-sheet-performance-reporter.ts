import type { FullConfig, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";

/**
 * Small conditional reporter for the evaluator. Playwright attachments remain
 * the source of truth; this reporter only emits redacted summary lines so a
 * failed run cannot leak URLs, cookies, or arbitrary stdout into a receipt.
 */
export class EstimateSheetPerformanceReporter implements Reporter {
  private enabled = process.env.ESTIMATE_PERF_TEST_OUTPUT_ROLE === "e2e-tests";

  onBegin(_config: FullConfig, _suite: Suite): void {
    if (this.enabled) process.stdout.write("estimate-sheet-e2e-reporter:start\n");
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!this.enabled) return;
    const status = result.status === "passed" ? "PASS" : result.status === "skipped" ? "SKIPPED" : "FAIL";
    process.stdout.write(`estimate-sheet-e2e-reporter:${status}:${test.title}\n`);
  }

  onEnd(): void {
    if (this.enabled) process.stdout.write("estimate-sheet-e2e-reporter:end\n");
  }
}

export default EstimateSheetPerformanceReporter;

