import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addUntrackedFile,
  parseZeroContextDiff,
  toChangedFiles,
} from "../../../scripts/quality/static-diff-core";
import {
  compareKnipBaseline,
  normalizeKnipIssues,
  validateKnipBaseline,
  type KnipIssueIdentity,
} from "../../../scripts/quality/static-knip-core";
import {
  analyzeChangedFunctions,
  detectAddedDuplicateBusinessBlocks,
  scanAddedSourceDebt,
  type ChangedSource,
  type StaticThresholds,
} from "../../../scripts/quality/static-source-core";

const root = resolve(import.meta.dirname, "../../..");
const thresholds: StaticThresholds = {
  maximum_new_source_debt: 0,
  critical_changed_function_complexity: 10,
  duplicate_block_minimum_lines: 6,
  duplicate_block_minimum_characters: 120,
  oversized_function_lines: 80,
  oversized_module_lines: 500,
};

function changedSource(
  path: string,
  text: string,
  critical = false,
): ChangedSource {
  return {
    path,
    text,
    critical,
    added_lines: new Set(text.split(/\r?\n/u).map((_, index) => index + 1)),
  };
}

describe("static changed scope", () => {
  it("maps zero-context additions and complete untracked files", () => {
    const changed = parseZeroContextDiff(
      [
        "diff --git a/src/example.ts b/src/example.ts",
        "--- a/src/example.ts",
        "+++ b/src/example.ts",
        "@@ -2,0 +3,2 @@",
        "+const first = true;",
        "+const second = true;",
      ].join("\n"),
    );
    addUntrackedFile(changed, "src/new.ts", "one\ntwo\n");
    expect(toChangedFiles(changed, new Set(["src/new.ts"]))).toEqual([
      {
        path: "src/example.ts",
        added_lines: new Set([3, 4]),
        untracked: false,
      },
      {
        path: "src/new.ts",
        added_lines: new Set([1, 2, 3]),
        untracked: true,
      },
    ]);
  });
});

describe("static source debt", () => {
  it("fails every added unsafe annotation and maintenance marker", () => {
    const debt = [
      "const value: " + "any = input;",
      "// @ts-" + "ignore",
      "// eslint-" + "disable-next-line no-console",
      "// TO" + "DO: repair",
    ].join("\n");
    const disabledRule = '"complexity": "' + 'off"';
    expect(
      scanAddedSourceDebt(
        [
          changedSource("src/debt.ts", debt),
          changedSource("eslint.config.mjs", disabledRule),
        ],
        0,
      ).map((finding) => finding.code),
    ).toEqual([
      "NEW_EXPLICIT_ANY",
      "NEW_TS_SUPPRESSION",
      "NEW_ESLINT_SUPPRESSION",
      "NEW_TODO_FIXME",
      "NEW_DISABLED_RULE",
    ]);
  });

  it("fails critical changed functions above cyclomatic complexity ten", () => {
    const branches = Array.from(
      { length: 10 },
      (_, index) => `if (value === ${index}) return ${index};`,
    ).join("\n");
    const source = changedSource(
      "src/lib/auth/critical.ts",
      `export function critical(value: number) {\n${branches}\nreturn -1;\n}`,
      true,
    );
    const result = analyzeChangedFunctions([source], thresholds);
    expect(result.functions[0]).toMatchObject({ name: "critical", complexity: 11 });
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "CRITICAL_CHANGED_FUNCTION_COMPLEXITY",
    ]);
  });

  it("fails a newly duplicated business block without reporting unrelated legacy text", () => {
    const block = [
      "const normalizedSubtotal = subtotalAmount + allowanceAmount;",
      "const normalizedTax = normalizedSubtotal * applicableTaxRate;",
      "const normalizedFees = normalizedSubtotal * applicableFeeRate;",
      "const normalizedTotal = normalizedSubtotal + normalizedTax + normalizedFees;",
      "const roundedTotal = Math.round(normalizedTotal * 100) / 100;",
      "return { normalizedSubtotal, normalizedTax, normalizedFees, roundedTotal };",
    ].join("\n");
    const original = { path: "src/lib/original.ts", text: block };
    const copy = changedSource("src/lib/copy.ts", block);
    expect(
      detectAddedDuplicateBusinessBlocks([original, copy], [copy], thresholds).map(
        (finding) => finding.code,
      ),
    ).toContain("NEW_DUPLICATED_BUSINESS_BLOCK");
  });
});

describe("Knip exact identity ratchet", () => {
  const unusedExport: KnipIssueIdentity = {
    type: "exports",
    file: "src/example.ts",
    symbol: "unusedExample",
  };

  it("normalizes identities without unstable line positions", () => {
    expect(
      normalizeKnipIssues({
        issues: [
          {
            file: "src/example.ts",
            exports: [{ name: "unusedExample", line: 99, col: 1, pos: 500 }],
          },
        ],
      }),
    ).toEqual([unusedExport]);
  });

  it("passes measured legacy debt and fails new unused and cycle identities", () => {
    expect(compareKnipBaseline([unusedExport], [unusedExport], 0).findings).toEqual([]);
    const newCycle: KnipIssueIdentity = {
      type: "cycles",
      file: "src/a.ts",
      symbol: "src/a.ts -> src/b.ts",
    };
    const findings = compareKnipBaseline(
      [
        unusedExport,
        { type: "files", file: "src/dead.ts", symbol: "src/dead.ts" },
        newCycle,
      ],
      [unusedExport],
      0,
    ).findings;
    expect(findings.map((finding) => finding.code)).toEqual([
      "NEW_IMPORT_CYCLE",
      "NEW_KNIP_DEBT",
    ]);
  });

  it("requires the baseline to ratchet when legacy debt is resolved", () => {
    expect(compareKnipBaseline([], [unusedExport], 0).findings[0]?.code).toBe(
      "STATIC_BASELINE_RATCHET_REQUIRED",
    );
  });

  it("rejects duplicate and mismatched baseline identities", () => {
    expect(
      validateKnipBaseline({
        schema_version: 1,
        tool: "knip",
        identity_contract: "type-file-symbol-v1",
        measurement: { issue_count: 1 },
        measured_legacy_issues: [unusedExport, unusedExport],
      }).map((finding) => finding.code),
    ).toEqual(["STATIC_BASELINE_DUPLICATE", "STATIC_BASELINE_COUNT"]);
  });
});

describe("Stryker config import contract", () => {
  it("remains fail-closed without mutation selection and importable for static analysis", () => {
    const failClosedEnvironment = { ...process.env };
    delete failClosedEnvironment.ARCHESTIMATOR_MUTATION_TARGETS;
    delete failClosedEnvironment.ARCHESTIMATOR_MUTATION_TSCONFIG;
    const rejected = spawnSync(
      "bun",
      ["-e", "await import('./stryker.config.mjs')"],
      { cwd: root, encoding: "utf8", env: failClosedEnvironment },
    );
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain(
      "scripts/quality/run-mutation.ts must provide mutation targets",
    );

    const accepted = spawnSync(
      "bun",
      ["-e", "await import('./stryker.config.mjs')"],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...failClosedEnvironment,
          ARCHESTIMATOR_MUTATION_TARGETS: '["src/lib/utils.ts"]',
          ARCHESTIMATOR_MUTATION_TSCONFIG: "tsconfig.mutation.json",
        },
      },
    );
    expect(accepted.status).toBe(0);
  });
});
