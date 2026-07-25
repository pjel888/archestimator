import ts from "typescript";
import type { QualityFinding } from "./common";

export interface StaticThresholds {
  maximum_new_source_debt: number;
  critical_changed_function_complexity: number;
  duplicate_block_minimum_lines: number;
  duplicate_block_minimum_characters: number;
  oversized_function_lines: number;
  oversized_module_lines: number;
}

export interface ChangedSource {
  path: string;
  text: string;
  added_lines: Set<number>;
  critical: boolean;
}

interface NormalizedLine {
  line: number;
  text: string;
}

function sourceLine(text: string, line: number): string {
  return text.split(/\r?\n/u)[line - 1] ?? "";
}

function sourceDebtFinding(
  source: ChangedSource,
  line: number,
  code: string,
  label: string,
): QualityFinding {
  return {
    code,
    message: `${source.path}:${line} adds ${label}`,
    path: source.path,
    detail: { line, source: sourceLine(source.text, line).trim() },
  };
}

function scanExplicitAny(source: ChangedSource): QualityFinding[] {
  const sourceFile = ts.createSourceFile(
    source.path,
    source.text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.path),
  );
  const lines = new Set<number>();
  const visit = (node: ts.Node): void => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      if (source.added_lines.has(line)) lines.add(line);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...lines].map((line) =>
    sourceDebtFinding(source, line, "NEW_EXPLICIT_ANY", "explicit any"),
  );
}

function scanCommentDebt(source: ChangedSource): QualityFinding[] {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    source.path.endsWith("x") ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard,
    source.text,
  );
  const findings: QualityFinding[] = [];
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      const line =
        source.text
          .slice(0, Math.max(0, scanner.getTokenPos()))
          .split(/\r?\n/u).length;
      const comment = scanner.getTokenText();
      if (source.added_lines.has(line)) {
        if (/@ts-(?:ignore|nocheck|expect-error)\b/u.test(comment)) {
          findings.push(
            sourceDebtFinding(source, line, "NEW_TS_SUPPRESSION", "TypeScript suppression"),
          );
        }
        if (/\beslint-disable(?:-next-line|-line)?\b/u.test(comment)) {
          findings.push(
            sourceDebtFinding(source, line, "NEW_ESLINT_SUPPRESSION", "ESLint suppression"),
          );
        }
        if (/\b(?:TODO|FIXME)\b/u.test(comment)) {
          findings.push(
            sourceDebtFinding(source, line, "NEW_TODO_FIXME", "TODO/FIXME debt"),
          );
        }
      }
    }
    token = scanner.scan();
  }
  return findings;
}

function scanDisabledRules(source: ChangedSource): QualityFinding[] {
  if (!/(?:^|\/)eslint\.config\.[cm]?[jt]s$|(?:^|\/)\.eslintrc/u.test(source.path)) {
    return [];
  }
  const pattern = /(?:["'][^"']+["']|[\w-]+)\s*:\s*(?:["']off["']|0(?:\D|$))/u;
  return [...source.added_lines]
    .filter((line) => pattern.test(sourceLine(source.text, line)))
    .map((line) =>
      sourceDebtFinding(source, line, "NEW_DISABLED_RULE", "disabled ESLint rule"),
    );
}

export function scanAddedSourceDebt(
  sources: ChangedSource[],
  maximumNewSourceDebt: number,
): QualityFinding[] {
  const findings = sources.flatMap((source) => [
    ...scanExplicitAny(source),
    ...scanCommentDebt(source),
    ...scanDisabledRules(source),
  ]);
  return findings.length > maximumNewSourceDebt ? findings : [];
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function isFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

function functionName(node: ts.FunctionLikeDeclaration): string {
  if ("name" in node && node.name) return node.name.getText();
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent)) return parent.name.getText();
  if (ts.isPropertyAssignment(parent)) return parent.name.getText();
  return "<anonymous>";
}

function cyclomaticComplexity(node: ts.FunctionLikeDeclaration): number {
  let complexity = 1;
  const branchKinds = new Set<ts.SyntaxKind>([
    ts.SyntaxKind.IfStatement,
    ts.SyntaxKind.ForStatement,
    ts.SyntaxKind.ForInStatement,
    ts.SyntaxKind.ForOfStatement,
    ts.SyntaxKind.WhileStatement,
    ts.SyntaxKind.DoStatement,
    ts.SyntaxKind.CatchClause,
    ts.SyntaxKind.ConditionalExpression,
  ]);
  const logicalKinds = new Set<ts.SyntaxKind>([
    ts.SyntaxKind.AmpersandAmpersandToken,
    ts.SyntaxKind.BarBarToken,
    ts.SyntaxKind.QuestionQuestionToken,
  ]);
  const visit = (child: ts.Node): void => {
    if (child !== node && isFunctionLike(child)) return;
    if (branchKinds.has(child.kind)) {
      complexity += 1;
    } else if (ts.isCaseClause(child) && child.statements.length > 0) {
      complexity += 1;
    } else if (ts.isBinaryExpression(child) && logicalKinds.has(child.operatorToken.kind)) {
      complexity += 1;
    }
    ts.forEachChild(child, visit);
  };
  if (node.body) visit(node.body);
  return complexity;
}

export function analyzeChangedFunctions(
  sources: ChangedSource[],
  thresholds: StaticThresholds,
): {
  findings: QualityFinding[];
  functions: Array<{
    path: string;
    name: string;
    start_line: number;
    end_line: number;
    complexity: number;
    lines: number;
    critical: boolean;
  }>;
  oversized_functions: Array<{
    path: string;
    name: string;
    start_line: number;
    end_line: number;
    complexity: number;
    lines: number;
    critical: boolean;
  }>;
  oversized_modules: Array<{ path: string; lines: number }>;
} {
  const findings: QualityFinding[] = [];
  const functions = [];
  const oversizedModules = [];

  for (const source of sources) {
    const sourceFile = ts.createSourceFile(
      source.path,
      source.text,
      ts.ScriptTarget.Latest,
      true,
      scriptKind(source.path),
    );
    const moduleLines = sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line + 1;
    if (moduleLines > thresholds.oversized_module_lines) {
      oversizedModules.push({ path: source.path, lines: moduleLines });
    }
    const visit = (node: ts.Node): void => {
      if (isFunctionLike(node) && node.body) {
        const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        const endLine = sourceFile.getLineAndCharacterOfPosition(node.end).line + 1;
        const changed = [...source.added_lines].some(
          (line) => line >= startLine && line <= endLine,
        );
        if (changed) {
          const measured = {
            path: source.path,
            name: functionName(node),
            start_line: startLine,
            end_line: endLine,
            complexity: cyclomaticComplexity(node),
            lines: endLine - startLine + 1,
            critical: source.critical,
          };
          functions.push(measured);
          if (
            source.critical &&
            measured.complexity > thresholds.critical_changed_function_complexity
          ) {
            findings.push({
              code: "CRITICAL_CHANGED_FUNCTION_COMPLEXITY",
              message:
                `${source.path}:${startLine} ${measured.name} complexity ` +
                `${measured.complexity} exceeds ${thresholds.critical_changed_function_complexity}`,
              path: source.path,
              detail: measured,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return {
    findings,
    functions,
    oversized_functions: functions.filter(
      (measured) => measured.lines > thresholds.oversized_function_lines,
    ),
    oversized_modules: oversizedModules,
  };
}

function normalizeBusinessLines(text: string): NormalizedLine[] {
  return text
    .split(/\r?\n/u)
    .map((line, index) => ({
      line: index + 1,
      text: line
        .replace(/\/\/.*$/u, "")
        .replace(/\s+/gu, " ")
        .trim(),
    }))
    .filter(({ text }) =>
      text.length > 0 &&
      !/^(?:[{}[\](),;]|import\b|export\s+type\b|type\b|interface\b)/u.test(text),
    );
}

export function detectAddedDuplicateBusinessBlocks(
  allBusinessSources: Array<{ path: string; text: string }>,
  changedSources: ChangedSource[],
  thresholds: StaticThresholds,
): QualityFinding[] {
  const occurrences = indexBusinessBlocks(allBusinessSources, thresholds);
  return changedSources.flatMap((source) =>
    duplicateFindingsForSource(source, occurrences, thresholds),
  );
}

function indexBusinessBlocks(
  allBusinessSources: Array<{ path: string; text: string }>,
  thresholds: StaticThresholds,
): Map<string, Array<{ path: string; start_line: number }>> {
  const occurrences = new Map<string, Array<{ path: string; start_line: number }>>();
  for (const source of allBusinessSources) {
    const lines = normalizeBusinessLines(source.text);
    for (
      let index = 0;
      index + thresholds.duplicate_block_minimum_lines <= lines.length;
      index += 1
    ) {
      const window = lines.slice(index, index + thresholds.duplicate_block_minimum_lines);
      const normalized = window.map((line) => line.text).join("\n");
      if (normalized.length < thresholds.duplicate_block_minimum_characters) continue;
      const locations = occurrences.get(normalized) ?? [];
      locations.push({ path: source.path, start_line: window[0].line });
      occurrences.set(normalized, locations);
    }
  }
  return occurrences;
}

function duplicateFindingsForSource(
  source: ChangedSource,
  occurrences: Map<string, Array<{ path: string; start_line: number }>>,
  thresholds: StaticThresholds,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const emitted = new Set<string>();
  const lines = normalizeBusinessLines(source.text);
  for (
    let index = 0;
    index + thresholds.duplicate_block_minimum_lines <= lines.length;
    index += 1
  ) {
    const window = lines.slice(index, index + thresholds.duplicate_block_minimum_lines);
    if (!window.every((line) => source.added_lines.has(line.line))) continue;
    const normalized = window.map((line) => line.text).join("\n");
    if (normalized.length < thresholds.duplicate_block_minimum_characters) continue;
    const other = (occurrences.get(normalized) ?? []).find(
      (location) => location.path !== source.path || location.start_line !== window[0].line,
    );
    if (!other) continue;
    const identity = [source.path, window[0].line, other.path, other.start_line].join(":");
    if (emitted.has(identity)) continue;
    emitted.add(identity);
    findings.push({
      code: "NEW_DUPLICATED_BUSINESS_BLOCK",
      message:
        `${source.path}:${window[0].line} duplicates ${other.path}:${other.start_line}`,
      path: source.path,
      detail: {
        lines: thresholds.duplicate_block_minimum_lines,
        duplicate_of: other,
      },
    });
  }
  return findings;
}
