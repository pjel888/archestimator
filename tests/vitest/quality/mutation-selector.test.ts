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

  it("selects only changed Q2 quality cores plus unchanged registry targets", () => {
    const criticalRiskMap: RiskMap = {
      ...riskMap,
      rules: [
        ...riskMap.rules,
        {
          id: "QUALITY",
          profile: "Q2_CRITICAL_CHANGE_GATE",
          patterns: ["scripts/quality/**"],
          reason: "Quality-system core",
        },
      ],
    };
    const selected = selectMutationTargets(
      "critical",
      [
        "src/app/auth/session.ts",
        "src/lib/calculator.ts",
        "scripts/quality/classifier-core.ts",
        "scripts/quality/ordinary-core.ts",
        "scripts/quality/run-mutation.ts",
      ],
      {
        committed: [
          "src/app/auth/session.ts",
          "scripts/quality/run-mutation.ts",
          "scripts/quality/ordinary-core.ts",
        ],
        staged: [],
        unstaged: ["scripts/quality/classifier-core.ts"],
        untracked: [],
      },
      criticalRiskMap,
      registry,
    );

    expect(selected.targets).toEqual([
      "scripts/quality/classifier-core.ts",
      "scripts/quality/ordinary-core.ts",
      "src/lib/calculator.ts",
    ]);
    expect(selected.requiredTests).toEqual(["tests/vitest/calculator.test.ts"]);
    expect(selected.targetReasons["src/lib/calculator.ts"]).toContain(
      "registry:CALC: Critical calculation",
    );
    expect(selected.targets).not.toContain("scripts/quality/run-mutation.ts");
    expect(selected.targets).not.toContain("src/app/auth/session.ts");
  });

  it("accepts an explicit base-derived inventory and keeps a nonempty changed scope", () => {
    const criticalCoreRiskMap: RiskMap = {
      ...riskMap,
      rules: [
        ...riskMap.rules,
        {
          id: "QUALITY",
          profile: "Q2_CRITICAL_CHANGE_GATE",
          patterns: ["scripts/quality/**"],
          reason: "Quality-system core",
        },
      ],
    };
    const selected = selectMutationTargets(
      "changed",
      ["scripts/quality/classifier-core.ts", "scripts/quality/mutation-core.ts"],
      {
        committed: ["scripts/quality/classifier-core.ts"],
        staged: [],
        unstaged: ["scripts/quality/mutation-core.ts"],
        untracked: [],
      },
      criticalCoreRiskMap,
      registry,
    );

    expect(selected.targets).toEqual([
      "scripts/quality/classifier-core.ts",
      "scripts/quality/mutation-core.ts",
    ]);
    expect(selected.targetReasons).toEqual({
      "scripts/quality/classifier-core.ts": [
        "risk-map:QUALITY: scripts/quality/classifier-core.ts: Quality-system core",
        "worktree: changed executable file",
      ],
      "scripts/quality/mutation-core.ts": [
        "risk-map:QUALITY: scripts/quality/mutation-core.ts: Quality-system core",
        "worktree: changed executable file",
      ],
    });
  });

  it("returns an empty critical selection for the runner to fail closed", () => {
    const selected = selectMutationTargets(
      "critical",
      ["src/lib/ordinary.ts"],
      inventory,
      riskMap,
      registry,
    );

    expect(selected).toEqual({ targets: [], requiredTests: [], targetReasons: {} });
    expect(
      readFileSync(resolve(root, "scripts/quality/run-mutation.ts"), "utf8"),
    ).toContain('code: "EMPTY_MUTATION_TARGETS"');
  });

  it("selects the representative numeric registry target with its required tests", () => {
    const numericRegistry: MutationRegistry = {
      schema_version: 1,
      entries: [
        {
          id: "NUMERIC",
          targets: ["src/lib/results-calculator.ts"],
          tests: ["tests/vitest/results-calculator.test.ts"],
          reason: "Representative numeric decisions",
        },
      ],
    };
    const selected = selectMutationTargets(
      "representative",
      ["src/lib/results-calculator.ts", "src/lib/ordinary.ts"],
      inventory,
      riskMap,
      numericRegistry,
    );

    expect(selected.targets).toEqual(["src/lib/results-calculator.ts"]);
    expect(selected.requiredTests).toEqual(["tests/vitest/results-calculator.test.ts"]);
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

  it("handles malformed mutant fields without inflating the score denominator", () => {
    const metrics = summarizeMutationReport(
      { files: { "src/lib/malformed.ts": { mutants: [{}] } } },
      new Set(["src/lib/malformed.ts"]),
    );

    expect(metrics).toMatchObject({
      score: null,
      counts: { Unknown: 1 },
      valid_mutants: 0,
      detected_mutants: 0,
      high_risk_survivors: [],
      high_risk_no_coverage: [],
    });
  });

  it("separates high-risk survivors and no-coverage mutants", () => {
    const metrics = summarizeMutationReport(
      {
        files: {
          "src/lib/calculator.ts": {
            mutants: [
              { id: "1", status: "Survived" },
              { id: "2", status: "NoCoverage" },
            ],
          },
        },
      },
      new Set(["src/lib/calculator.ts"]),
    );

    expect(metrics.high_risk_survivors.map((mutant) => mutant.id)).toEqual(["1"]);
    expect(metrics.high_risk_no_coverage.map((mutant) => mutant.id)).toEqual(["2"]);
  });

  it("keeps plan reasons and report summaries deterministic", () => {
    const criticalRiskMap: RiskMap = {
      ...riskMap,
      rules: [
        ...riskMap.rules,
        {
          id: "QUALITY",
          profile: "Q2_CRITICAL_CHANGE_GATE",
          patterns: ["scripts/quality/**"],
          reason: "Quality-system core",
        },
      ],
    };
    const selection = selectMutationTargets(
      "critical",
      [
        "src/lib/calculator.ts",
        "scripts/quality/mutation-core.ts",
        "scripts/quality/classifier-core.ts",
      ],
      {
        committed: ["scripts/quality/mutation-core.ts"],
        staged: [],
        unstaged: [],
        untracked: ["scripts/quality/classifier-core.ts"],
      },
      criticalRiskMap,
      registry,
    );
    const report = {
      files: {
        "src/lib/z.ts": {
          mutants: [{ id: "2", mutatorName: "BooleanLiteral", status: "Survived" }],
        },
        "src/lib/a.ts": {
          mutants: [{ id: "1", mutatorName: "ArithmeticOperator", status: "Killed" }],
        },
      },
    };

    expect(selection.targets).toEqual([
      "scripts/quality/classifier-core.ts",
      "scripts/quality/mutation-core.ts",
      "src/lib/calculator.ts",
    ]);
    expect(selection.targetReasons["src/lib/calculator.ts"]).toEqual([
      "registry:CALC: Critical calculation",
      "risk-map:EXECUTABLE: src/lib/calculator.ts: ordinary executable change",
    ]);
    const summary = summarizeMutationReport(report, new Set());
    expect(Object.keys(summary.counts)).toEqual(["Killed", "Survived"]);
    expect(summary.survivors).toEqual([
      {
        file: "src/lib/z.ts",
        id: "2",
        mutator: "BooleanLiteral",
        status: "Survived",
        status_reason: null,
        location: null,
      },
    ]);
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
    expect(vitest).toContain("ARCHESTIMATOR_MUTATION_EXACT_TESTS");
    expect(vitest).toContain("exactTests.length > 0");
    expect(vitest).toContain("requiredTests.length > 0");
  });
});
