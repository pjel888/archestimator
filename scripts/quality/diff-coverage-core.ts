import type { QualityFinding } from "./common";

export interface FileCoverage {
  lines: Map<number, number>;
  branches: Map<number, { covered: number; total: number }>;
  functions: Map<number, number>;
  functionNames: Map<string, number>;
}

const EXECUTABLE_PATH = /\.(?:[cm]?[jt]sx?)$/u;

function normalizeCoveragePath(path: string): string {
  return path
    .replace(/^file:\/\//u, "")
    .replaceAll("\\", "/")
    .replace(/^\.\//u, "");
}

function mergeCoverage(
  target: FileCoverage,
  source: FileCoverage,
): void {
  for (const [line, hits] of source.lines) {
    target.lines.set(line, Math.max(target.lines.get(line) ?? 0, hits));
  }
  for (const [line, branch] of source.branches) {
    const prior = target.branches.get(line);
    target.branches.set(
      line,
      prior
        ? {
            covered: Math.max(prior.covered, branch.covered),
            total: Math.max(prior.total, branch.total),
          }
        : branch,
    );
  }
  for (const [line, hits] of source.functions) {
    target.functions.set(line, Math.max(target.functions.get(line) ?? 0, hits));
  }
  for (const [name, line] of source.functionNames) {
    if (!target.functionNames.has(name)) target.functionNames.set(name, line);
  }
}

export function parseLcov(text: string): Map<string, FileCoverage> {
  const files = new Map<string, FileCoverage>();
  let current: FileCoverage | undefined;
  let currentPath: string | undefined;
  for (const line of text.split(/\r?\n/u)) {
    if (line.startsWith("SF:")) {
      currentPath = normalizeCoveragePath(line.slice(3));
      current = {
        lines: new Map(),
        branches: new Map(),
        functions: new Map(),
        functionNames: new Map(),
      };
    } else if (current && line.startsWith("DA:")) {
      const [lineNumber, hits] = line.slice(3).split(",", 2).map(Number);
      if (Number.isInteger(lineNumber) && Number.isFinite(hits)) {
        current.lines.set(lineNumber, hits);
      }
    } else if (current && line.startsWith("BRDA:")) {
      const [lineNumberText, , , takenText] = line.slice(5).split(",", 4);
      const lineNumber = Number(lineNumberText);
      const entry = current.branches.get(lineNumber) ?? { covered: 0, total: 0 };
      entry.total += 1;
      if (takenText !== "-" && Number(takenText) > 0) entry.covered += 1;
      current.branches.set(lineNumber, entry);
    } else if (current && line.startsWith("FNDA:")) {
      const [hitsText, name] = line.slice(5).split(",", 2);
      const hits = Number(hitsText);
      const functionLine = current.functionNames.get(name);
      if (functionLine !== undefined) current.functions.set(functionLine, hits);
    } else if (current && line.startsWith("FN:")) {
      const [lineNumberText, name] = line.slice(3).split(",", 2);
      const lineNumber = Number(lineNumberText);
      if (Number.isInteger(lineNumber) && name) {
        current.functions.set(lineNumber, 0);
        current.functionNames.set(name, lineNumber);
      }
    } else if (line === "end_of_record") {
      if (current && currentPath) {
        const existing = files.get(currentPath);
        if (existing) mergeCoverage(existing, current);
        else files.set(currentPath, current);
      }
      current = undefined;
      currentPath = undefined;
    }
  }
  return files;
}

export function parseAddedLines(diff: string): Map<string, Set<number>> {
  const changed = new Map<string, Set<number>>();
  let file: string | undefined;
  let lineNumber = 0;
  let inBlockComment = false;
  let quote: "'" | "\"" | "`" | undefined;

  const hasExecutableContent = (source: string): boolean => {
    let index = 0;
    let executable = false;
    let escaped = false;
    while (index < source.length) {
      if (inBlockComment) {
        const closing = source.indexOf("*/", index);
        if (closing === -1) return executable;
        inBlockComment = false;
        index = closing + 2;
        continue;
      }
      if (quote) {
        executable = true;
        const character = source[index]!;
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === quote) {
          quote = undefined;
        }
        index += 1;
        continue;
      }
      if (/\s/u.test(source[index]!)) {
        index += 1;
        continue;
      }
      if (source.startsWith("//", index)) return executable;
      if (source.startsWith("/*", index)) {
        inBlockComment = true;
        index += 2;
        continue;
      }
      const character = source[index]!;
      executable = true;
      if (character === "'" || character === "\"" || character === "`") {
        quote = character;
      }
      index += 1;
    }
    return executable;
  };

  for (const line of diff.split(/\r?\n/u)) {
    if (line.startsWith("+++ ")) {
      const path = line.slice(4).trim();
      file = path === "/dev/null" ? undefined : path.replace(/^b\//u, "");
      inBlockComment = false;
      quote = undefined;
      if (file && !changed.has(file)) changed.set(file, new Set());
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/u);
    if (hunk) {
      lineNumber = Number(hunk[1]);
      inBlockComment = false;
      quote = undefined;
      continue;
    }
    if (!file || line.startsWith("--- ")) continue;
    if (line.startsWith("+")) {
      if (hasExecutableContent(line.slice(1))) changed.get(file)!.add(lineNumber);
      lineNumber += 1;
    } else if (!line.startsWith("-")) {
      if (line.startsWith(" ")) hasExecutableContent(line.slice(1));
      lineNumber += 1;
    }
  }
  return changed;
}

function matchingCoverage(
  coverage: Map<string, FileCoverage>,
  path: string,
): FileCoverage | undefined {
  const normalizedPath = normalizeCoveragePath(path);
  const matches = [...coverage.entries()]
    .filter(([candidate]) =>
      candidate === normalizedPath ||
      candidate.endsWith(`/${normalizedPath}`) ||
      normalizedPath.endsWith(`/${candidate}`)
    )
    .map(([, value]) => value);
  if (matches.length === 0) return undefined;
  const merged: FileCoverage = {
    lines: new Map(),
    branches: new Map(),
    functions: new Map(),
    functionNames: new Map(),
  };
  matches.forEach((value) => mergeCoverage(merged, value));
  return merged;
}

export function isExecutableCoveragePath(path: string): boolean {
  return EXECUTABLE_PATH.test(normalizeCoveragePath(path));
}

export function evaluateDiffCoverage(
  coverage: Map<string, FileCoverage>,
  changed: Map<string, Set<number>>,
  thresholds: { statements: number; lines: number; functions: number; branches: number },
): {
  findings: QualityFinding[];
  metrics: {
    changed_lines: number;
    covered_lines: number;
    line_percent: number;
    changed_branches: number;
    covered_branches: number;
    branch_percent: number;
    changed_functions: number;
    covered_functions: number;
    function_percent: number;
    statement_percent: number;
  };
} {
  const findings: QualityFinding[] = [];
  let changedLines = 0;
  let coveredLines = 0;
  let changedBranches = 0;
  let coveredBranches = 0;
  let changedFunctions = 0;
  let coveredFunctions = 0;
  for (const [path, lines] of changed) {
    if (!isExecutableCoveragePath(path) || lines.size === 0) continue;
    const fileCoverage = matchingCoverage(coverage, path);
    if (!fileCoverage) {
      findings.push({
        code: "CHANGED_FILE_COVERAGE_MISSING",
        message: `Changed executable file ${path} is absent from LCOV`,
        path,
      });
    }
    const affectedFunctionLines = new Set<number>();
    const missingLines: number[] = [];
    for (const line of lines) {
      const hits = fileCoverage?.lines.get(line);
      changedLines += 1;
      if (hits === undefined) {
        missingLines.push(line);
        continue;
      }
      if (hits > 0) coveredLines += 1;
      const branch = fileCoverage?.branches.get(line);
      if (branch) {
        changedBranches += branch.total;
        coveredBranches += branch.covered;
      }
      const containingFunction = [...(fileCoverage?.functions.keys() ?? [])]
        .filter((functionLine) => functionLine <= line)
        .sort((left, right) => right - left)[0];
      if (containingFunction !== undefined) affectedFunctionLines.add(containingFunction);
    }
    if (fileCoverage && missingLines.length > 0) {
      findings.push({
        code: "CHANGED_LINE_COVERAGE_MISSING",
        message: `${path} has ${missingLines.length} changed line(s) absent from LCOV`,
        path,
        detail: { lines: missingLines },
      });
    }
    for (const functionLine of affectedFunctionLines) {
      changedFunctions += 1;
      if ((fileCoverage?.functions.get(functionLine) ?? 0) > 0) coveredFunctions += 1;
    }
  }
  const linePercent = changedLines === 0 ? 100 : (coveredLines / changedLines) * 100;
  const branchPercent =
    changedBranches === 0 ? (changedLines === 0 ? 100 : 0) : (coveredBranches / changedBranches) * 100;
  const functionPercent =
    changedFunctions === 0 ? (changedLines === 0 ? 100 : 0) : (coveredFunctions / changedFunctions) * 100;
  const statementPercent = linePercent;
  if (linePercent < thresholds.lines) {
    findings.push({
      code: "CHANGED_LINE_COVERAGE",
      message: `Changed line coverage ${linePercent.toFixed(2)}% is below ${thresholds.lines}%`,
    });
  }
  if (branchPercent < thresholds.branches) {
    findings.push({
      code: "CHANGED_BRANCH_COVERAGE",
      message: `Changed branch coverage ${branchPercent.toFixed(2)}% is below ${thresholds.branches}%`,
    });
  }
  if (statementPercent < thresholds.statements) {
    findings.push({
      code: "CHANGED_STATEMENT_COVERAGE",
      message: `Changed statement coverage ${statementPercent.toFixed(2)}% is below ${thresholds.statements}%`,
    });
  }
  if (functionPercent < thresholds.functions) {
    findings.push({
      code: "CHANGED_FUNCTION_COVERAGE",
      message: `Changed function coverage ${functionPercent.toFixed(2)}% is below ${thresholds.functions}%`,
    });
  }
  return {
    findings,
    metrics: {
      changed_lines: changedLines,
      covered_lines: coveredLines,
      line_percent: linePercent,
      changed_branches: changedBranches,
      covered_branches: coveredBranches,
      branch_percent: branchPercent,
      changed_functions: changedFunctions,
      covered_functions: coveredFunctions,
      function_percent: functionPercent,
      statement_percent: statementPercent,
    },
  };
}

export type CoveragePercentages = Record<
  "statements" | "lines" | "functions" | "branches",
  number
>;

function coveragePercentage(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object") return undefined;
  const pct = (value as { pct?: unknown }).pct;
  return typeof pct === "number" && Number.isFinite(pct) ? pct : undefined;
}

export function extractCoveragePercentages(input: unknown): CoveragePercentages | undefined {
  if (!input || typeof input !== "object") return undefined;
  const root = input as Record<string, unknown>;
  const candidates = [
    root,
    root.total,
    (root.coverage as Record<string, unknown> | undefined)?.total,
    ((root.data as Record<string, unknown> | undefined)?.coverage as
      | Record<string, unknown>
      | undefined)?.total,
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const percentages = {
      statements: coveragePercentage(record.statements),
      lines: coveragePercentage(record.lines),
      functions: coveragePercentage(record.functions),
      branches: coveragePercentage(record.branches),
    };
    if (Object.values(percentages).every((value) => value !== undefined)) {
      return percentages as CoveragePercentages;
    }
  }
  return undefined;
}

export function compareGlobalCoverageRatchet(
  baselineInput: unknown,
  currentInput: unknown,
): QualityFinding[] {
  const baseline = extractCoveragePercentages(baselineInput);
  const current = extractCoveragePercentages(currentInput);
  if (!baseline || !current) {
    return [{
      code: "RATCHET_MALFORMED",
      message: "Global coverage baseline or current Vitest summary is malformed",
    }];
  }
  const findings: QualityFinding[] = [];
  for (const metric of ["lines", "branches", "functions", "statements"] as const) {
    if (current[metric] < baseline[metric]) {
      findings.push({
        code: "GLOBAL_COVERAGE_REGRESSION",
        message: `${metric} coverage regressed from ${baseline[metric]} to ${current[metric]}`,
      });
    }
  }
  return findings;
}
