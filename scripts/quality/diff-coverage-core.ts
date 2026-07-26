import type { QualityFinding } from "./common";

export interface FileCoverage {
  lines: Map<number, number>;
  branches: Map<number, { covered: number; total: number }>;
  functions: Map<number, number>;
  functionNames: Map<string, number>;
}

const EXECUTABLE_PATH = /\.(?:[cm]?[jt]sx?)$/u;

function createFileCoverage(): FileCoverage {
  return {
    lines: new Map(),
    branches: new Map(),
    functions: new Map(),
    functionNames: new Map(),
  };
}

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

function addLineCoverage(coverage: FileCoverage, line: string): void {
  const [lineNumber, hits] = line.slice(3).split(",", 2).map(Number);
  if (Number.isInteger(lineNumber) && Number.isFinite(hits)) {
    coverage.lines.set(lineNumber, hits);
  }
}

function addBranchCoverage(coverage: FileCoverage, line: string): void {
  const [lineNumberText, , , takenText] = line.slice(5).split(",", 4);
  const lineNumber = Number(lineNumberText);
  const entry = coverage.branches.get(lineNumber) ?? { covered: 0, total: 0 };
  entry.total += 1;
  if (takenText !== "-" && Number(takenText) > 0) entry.covered += 1;
  coverage.branches.set(lineNumber, entry);
}

function addFunctionHits(coverage: FileCoverage, line: string): void {
  const [hitsText, name] = line.slice(5).split(",", 2);
  const functionLine = coverage.functionNames.get(name);
  if (functionLine !== undefined) coverage.functions.set(functionLine, Number(hitsText));
}

function addFunctionDefinition(coverage: FileCoverage, line: string): void {
  const [lineNumberText, name] = line.slice(3).split(",", 2);
  const lineNumber = Number(lineNumberText);
  if (Number.isInteger(lineNumber) && name) {
    coverage.functions.set(lineNumber, 0);
    coverage.functionNames.set(name, lineNumber);
  }
}

function addCoverageEntry(coverage: FileCoverage, line: string): void {
  if (line.startsWith("DA:")) addLineCoverage(coverage, line);
  else if (line.startsWith("BRDA:")) addBranchCoverage(coverage, line);
  else if (line.startsWith("FNDA:")) addFunctionHits(coverage, line);
  else if (line.startsWith("FN:")) addFunctionDefinition(coverage, line);
}

function finishCoverageRecord(
  files: Map<string, FileCoverage>,
  path: string | undefined,
  coverage: FileCoverage | undefined,
): void {
  if (!path || !coverage) return;
  const existing = files.get(path);
  if (existing) mergeCoverage(existing, coverage);
  else files.set(path, coverage);
}

export function parseLcov(text: string): Map<string, FileCoverage> {
  const files = new Map<string, FileCoverage>();
  let current: FileCoverage | undefined;
  let currentPath: string | undefined;
  for (const line of text.split(/\r?\n/u)) {
    if (line.startsWith("SF:")) {
      currentPath = normalizeCoveragePath(line.slice(3));
      current = createFileCoverage();
      continue;
    }
    if (line === "end_of_record") {
      finishCoverageRecord(files, currentPath, current);
      current = undefined;
      currentPath = undefined;
      continue;
    }
    if (current) addCoverageEntry(current, line);
  }
  return files;
}

type Quote = "'" | "\"" | "`";

interface SourceScanState {
  inBlockComment: boolean;
  quote: Quote | undefined;
}

interface DiffParseState {
  file: string | undefined;
  lineNumber: number;
  source: SourceScanState;
}

function resetSourceScan(state: SourceScanState): void {
  state.inBlockComment = false;
  state.quote = undefined;
}

function scanQuotedContent(source: string, index: number, state: SourceScanState): number {
  let escaped = false;
  while (index < source.length) {
    const character = source[index]!;
    if (escaped) escaped = false;
    else if (character === "\\") escaped = true;
    else if (character === state.quote) {
      state.quote = undefined;
      return index + 1;
    }
    index += 1;
  }
  return index;
}

function scanBlockComment(source: string, index: number, state: SourceScanState): number {
  const closing = source.indexOf("*/", index);
  if (closing === -1) return source.length;
  state.inBlockComment = false;
  return closing + 2;
}

function isQuote(character: string): character is Quote {
  return character === "'" || character === "\"" || character === "`";
}

function hasExecutableContent(source: string, state: SourceScanState): boolean {
  let index = 0;
  let executable = false;
  while (index < source.length) {
    if (state.inBlockComment) index = scanBlockComment(source, index, state);
    else if (state.quote) {
      executable = true;
      index = scanQuotedContent(source, index, state);
    } else if (/\s/u.test(source[index]!)) index += 1;
    else if (source.startsWith("//", index)) return executable;
    else if (source.startsWith("/*", index)) {
      state.inBlockComment = true;
      index += 2;
    } else {
      executable = true;
      if (isQuote(source[index]!)) state.quote = source[index] as Quote;
      index += 1;
    }
  }
  return executable;
}

function beginChangedFile(
  line: string,
  state: DiffParseState,
  changed: Map<string, Set<number>>,
): boolean {
  if (!line.startsWith("+++ ")) return false;
  const path = line.slice(4).trim();
  state.file = path === "/dev/null" ? undefined : path.replace(/^b\//u, "");
  resetSourceScan(state.source);
  if (state.file && !changed.has(state.file)) changed.set(state.file, new Set());
  return true;
}

function beginHunk(line: string, state: DiffParseState): boolean {
  const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/u);
  if (!hunk) return false;
  state.lineNumber = Number(hunk[1]);
  resetSourceScan(state.source);
  return true;
}

function parseDiffLine(
  line: string,
  state: DiffParseState,
  changed: Map<string, Set<number>>,
): void {
  if (beginChangedFile(line, state, changed) || beginHunk(line, state)) return;
  if (!state.file || line.startsWith("--- ")) return;
  if (line.startsWith("+")) {
    if (hasExecutableContent(line.slice(1), state.source)) {
      changed.get(state.file)!.add(state.lineNumber);
    }
    state.lineNumber += 1;
    return;
  }
  if (line.startsWith("-")) return;
  if (line.startsWith(" ")) hasExecutableContent(line.slice(1), state.source);
  state.lineNumber += 1;
}

export function parseAddedLines(diff: string): Map<string, Set<number>> {
  const changed = new Map<string, Set<number>>();
  const state: DiffParseState = {
    file: undefined,
    lineNumber: 0,
    source: { inBlockComment: false, quote: undefined },
  };
  for (const line of diff.split(/\r?\n/u)) parseDiffLine(line, state, changed);
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
  const merged = createFileCoverage();
  matches.forEach((value) => mergeCoverage(merged, value));
  return merged;
}

export function isExecutableCoveragePath(path: string): boolean {
  return EXECUTABLE_PATH.test(normalizeCoveragePath(path));
}

interface DiffCoverageCounts {
  changedLines: number;
  coveredLines: number;
  changedBranches: number;
  coveredBranches: number;
  changedFunctions: number;
  coveredFunctions: number;
}

type DiffCoverageThresholds = {
  statements: number;
  lines: number;
  functions: number;
  branches: number;
};

function findContainingFunction(coverage: FileCoverage | undefined, line: number): number | undefined {
  return [...(coverage?.functions.keys() ?? [])]
    .filter((functionLine) => functionLine <= line)
    .sort((left, right) => right - left)[0];
}

function evaluateChangedLine(
  line: number,
  coverage: FileCoverage | undefined,
  affectedFunctionLines: Set<number>,
  missingLines: number[],
  counts: DiffCoverageCounts,
): void {
  const hits = coverage?.lines.get(line);
  counts.changedLines += 1;
  if (hits === undefined) {
    missingLines.push(line);
    return;
  }
  if (hits > 0) counts.coveredLines += 1;
  const branch = coverage?.branches.get(line);
  if (branch) {
    counts.changedBranches += branch.total;
    counts.coveredBranches += branch.covered;
  }
  const containingFunction = findContainingFunction(coverage, line);
  if (containingFunction !== undefined) affectedFunctionLines.add(containingFunction);
}

function addMissingFileFinding(findings: QualityFinding[], path: string): void {
  findings.push({
    code: "CHANGED_FILE_COVERAGE_MISSING",
    message: `Changed executable file ${path} is absent from LCOV`,
    path,
  });
}

function addMissingLineFinding(
  findings: QualityFinding[],
  path: string,
  missingLines: number[],
): void {
  findings.push({
    code: "CHANGED_LINE_COVERAGE_MISSING",
    message: `${path} has ${missingLines.length} changed line(s) absent from LCOV`,
    path,
    detail: { lines: missingLines },
  });
}

function evaluateChangedFile(
  path: string,
  lines: Set<number>,
  coverage: Map<string, FileCoverage>,
  findings: QualityFinding[],
  counts: DiffCoverageCounts,
): void {
  const fileCoverage = matchingCoverage(coverage, path);
  if (!fileCoverage) addMissingFileFinding(findings, path);
  const affectedFunctionLines = new Set<number>();
  const missingLines: number[] = [];
  for (const line of lines) {
    evaluateChangedLine(line, fileCoverage, affectedFunctionLines, missingLines, counts);
  }
  if (fileCoverage && missingLines.length > 0) {
    addMissingLineFinding(findings, path, missingLines);
  }
  for (const functionLine of affectedFunctionLines) {
    counts.changedFunctions += 1;
    if ((fileCoverage?.functions.get(functionLine) ?? 0) > 0) counts.coveredFunctions += 1;
  }
}

function coveragePercent(covered: number, total: number, changedLines: number): number {
  if (total > 0) return (covered / total) * 100;
  return changedLines === 0 ? 100 : 0;
}

function addThresholdFinding(
  findings: QualityFinding[],
  code: string,
  label: string,
  percent: number,
  threshold: number,
): void {
  if (percent >= threshold) return;
  findings.push({
    code,
    message: `Changed ${label} coverage ${percent.toFixed(2)}% is below ${threshold}%`,
  });
}

export function evaluateDiffCoverage(
  coverage: Map<string, FileCoverage>,
  changed: Map<string, Set<number>>,
  thresholds: DiffCoverageThresholds,
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
  const counts: DiffCoverageCounts = {
    changedLines: 0,
    coveredLines: 0,
    changedBranches: 0,
    coveredBranches: 0,
    changedFunctions: 0,
    coveredFunctions: 0,
  };
  for (const [path, lines] of changed) {
    if (!isExecutableCoveragePath(path) || lines.size === 0) continue;
    evaluateChangedFile(path, lines, coverage, findings, counts);
  }
  const linePercent = coveragePercent(counts.coveredLines, counts.changedLines, 0);
  const branchPercent = coveragePercent(
    counts.coveredBranches,
    counts.changedBranches,
    counts.changedLines,
  );
  const functionPercent = coveragePercent(
    counts.coveredFunctions,
    counts.changedFunctions,
    counts.changedLines,
  );
  const statementPercent = linePercent;
  addThresholdFinding(findings, "CHANGED_LINE_COVERAGE", "line", linePercent, thresholds.lines);
  addThresholdFinding(
    findings,
    "CHANGED_BRANCH_COVERAGE",
    "branch",
    branchPercent,
    thresholds.branches,
  );
  addThresholdFinding(
    findings,
    "CHANGED_STATEMENT_COVERAGE",
    "statement",
    statementPercent,
    thresholds.statements,
  );
  addThresholdFinding(
    findings,
    "CHANGED_FUNCTION_COVERAGE",
    "function",
    functionPercent,
    thresholds.functions,
  );
  return {
    findings,
    metrics: {
      changed_lines: counts.changedLines,
      covered_lines: counts.coveredLines,
      line_percent: linePercent,
      changed_branches: counts.changedBranches,
      covered_branches: counts.coveredBranches,
      branch_percent: branchPercent,
      changed_functions: counts.changedFunctions,
      covered_functions: counts.coveredFunctions,
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
