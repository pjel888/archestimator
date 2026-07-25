import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { RiskMap } from "../../../scripts/quality/classifier-core";
import {
  changedExecutableFiles,
  highRiskTargets,
  isMutationTarget,
  parseCompileDiagnostics,
  selectMutationTargets,
  summarizeMutationReport,
  type MutationChangeInventory,
  type MutationRegistry,
} from "../../../scripts/quality/mutation-core";

const root = resolve(import.meta.dirname, "../../..");
const riskMap: RiskMap = {
  schema_version: 1,
  prose_extensions: [".md"],
  executable_extensions: [".ts", ".tsx"],
  release_flags: [],
  rules: [
    {
      id: "AUTH",
      profile: "Q2_CRITICAL_CHANGE_GATE",
      patterns: ["src/**/auth/**"],
      reason: "Authentication boundary",
    },
  ],
};

const registry: MutationRegistry = {
  schema_version: 1,
  entries: [
    {
      id: "CALC",
      targets: ["src/lib/calculator.ts"],
      tests: ["tests/vitest/calculator.test.ts"],
      reason: "Critical calculation",
    },
  ],
};

const inventory: MutationChangeInventory = {
  committed: ["src/lib/committed.ts"],
  staged: ["src/lib/staged.ts"],
  unstaged: ["src/lib/unstaged.ts", "docs/readme.md"],
  untracked: [
    "scripts/quality/new-gate.ts",
    "src/lib/untracked.tsx",
    "tests/vitest/new.test.ts",
  ],
};

describe("mutation target selection", () => {
  it("includes every changed-state source and excludes tests and prose", () => {
    expect(changedExecutableFiles(inventory)).toEqual([
      "scripts/quality/new-gate.ts",
      "src/lib/committed.ts",
      "src/lib/staged.ts",
      "src/lib/unstaged.ts",
      "src/lib/untracked.tsx",
    ]);
    expect(isMutationTarget("src/lib/value.test.ts")).toBe(false);
    expect(isMutationTarget("scripts/quality/gate.ts")).toBe(true);
    expect(isMutationTarget("scripts/other-tool.ts")).toBe(false);
  });

  it("extracts machine-readable TypeScript checker failures", () => {
    expect(
      parseCompileDiagnostics(
        [
          "src/a.ts(1,1): error TS2322: Type mismatch",
          "noise",
          "src/a.ts(1,1): error TS2322: Type mismatch",
        ].join("\n"),
      ),
    ).toEqual(["src/a.ts(1,1): error TS2322: Type mismatch"]);
  });

  it("selects risk-mapped and registered modules for critical mode", () => {
    const selected = selectMutationTargets(
      "critical",
      [
        "src/app/auth/session.ts",
        "src/lib/calculator.ts",
        "src/lib/ordinary.ts",
      ],
      inventory,
      riskMap,
      registry,
    );

    expect(selected.targets).toEqual([
      "src/app/auth/session.ts",
      "src/lib/calculator.ts",
    ]);
    expect(selected.requiredTests).toEqual(["tests/vitest/calculator.test.ts"]);
    expect(selected.targetReasons["src/lib/calculator.ts"]).toContain(
      "registry:CALC: Critical calculation",
    );
  });

  it("uses every mutation executable for full mode", () => {
    expect(
      selectMutationTargets(
        "full",
        ["src/lib/a.ts", "src/lib/b.tsx", "tests/unit/a.test.ts"],
        inventory,
        riskMap,
        registry,
      ).targets,
    ).toEqual(["src/lib/a.ts", "src/lib/b.tsx"]);
  });

  it("marks registry and risk-map targets as high risk", () => {
    expect(
      [...highRiskTargets(
        ["src/app/auth/session.ts", "src/lib/calculator.ts", "src/lib/ordinary.ts"],
        riskMap,
        registry,
      )].sort(),
    ).toEqual(["src/app/auth/session.ts", "src/lib/calculator.ts"]);
  });
});

describe("mutation report metrics", () => {
  it("reports Stryker's valid-mutant score and detailed failure states", () => {
    const metrics = summarizeMutationReport(
      {
        files: {
          "src/lib/calculator.ts": {
            mutants: [
              { id: "1", mutatorName: "ArithmeticOperator", status: "Killed" },
              { id: "2", mutatorName: "BooleanLiteral", status: "Survived" },
              { id: "3", mutatorName: "StringLiteral", status: "CompileError" },
            ],
          },
          "src/lib/ordinary.ts": {
            mutants: [
              { id: "4", mutatorName: "EqualityOperator", status: "NoCoverage" },
            ],
          },
        },
      },
      new Set(["src/lib/calculator.ts"]),
    );

    expect(metrics.score).toBeCloseTo(100 / 3);
    expect(metrics.compile_errors).toHaveLength(1);
    expect(metrics.high_risk_survivors).toHaveLength(1);
    expect(metrics.high_risk_no_coverage).toHaveLength(0);
  });
});

describe("mutation runner configuration", () => {
  it("keeps changed, critical, full, and representative commands distinct", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["test:mutation:changed"]).toContain("--scope changed");
    expect(packageJson.scripts["test:mutation:critical"]).toContain("--scope critical");
    expect(packageJson.scripts["test:mutation:full"]).toContain("--scope full");
    expect(packageJson.scripts["test:mutation:representative"]).toContain(
      "--scope representative",
    );
  });

  it("wires selected targets, source/test sandboxes, and the preserved threshold", () => {
    const stryker = readFileSync(resolve(root, "stryker.config.mjs"), "utf8");
    const vitest = readFileSync(resolve(root, "vitest.mutation.config.ts"), "utf8");

    expect(stryker).toContain("mutate: mutationTargets");
    expect(stryker).toContain('"!scripts/quality/**"');
    expect(stryker).toContain('"!src/**"');
    expect(stryker).toContain("break: 80");
    expect(vitest).toContain('"tests/vitest/**/*.test.{ts,tsx}"');
    expect(vitest).toContain("...requiredTests");
  });
});
