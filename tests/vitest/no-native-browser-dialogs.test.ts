import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const sourceRoot = join(repoRoot, "src");
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const nativeDialogNames = new Set(["prompt", "confirm", "alert"]);
const nativeDialogOwners = new Set(["window", "globalThis", "self"]);

function extensionOf(filePath: string) {
  const match = filePath.match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

function listSourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return listSourceFiles(path);
    if (!stats.isFile() || !sourceExtensions.has(extensionOf(path))) return [];
    return [path];
  });
}

function scriptKindFor(filePath: string) {
  switch (extensionOf(filePath)) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".js":
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function describeForbiddenNativeDialogCall(call: ts.CallExpression): string | null {
  const expression = unwrapExpression(call.expression);
  if (ts.isIdentifier(expression) && nativeDialogNames.has(expression.text)) {
    return `${expression.text}()`;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    const owner = unwrapExpression(expression.expression);
    if (ts.isIdentifier(owner) && nativeDialogOwners.has(owner.text) && nativeDialogNames.has(expression.name.text)) {
      return `${owner.text}.${expression.name.text}()`;
    }
  }
  if (ts.isElementAccessExpression(expression)) {
    const owner = unwrapExpression(expression.expression);
    const property = expression.argumentExpression;
    if (
      ts.isIdentifier(owner) &&
      nativeDialogOwners.has(owner.text) &&
      ts.isStringLiteralLike(property) &&
      nativeDialogNames.has(property.text)
    ) {
      return `${owner.text}[${JSON.stringify(property.text)}]()`;
    }
  }
  return null;
}

function findForbiddenNativeDialogCalls(filePath: string): string[] {
  const source = ts.createSourceFile(filePath, readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true, scriptKindFor(filePath));
  const offenders: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const call = describeForbiddenNativeDialogCall(node);
      if (call) {
        const position = source.getLineAndCharacterOfPosition(node.getStart(source));
        offenders.push(`${relative(repoRoot, filePath)}:${position.line + 1}: ${call}`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return offenders;
}

describe("native browser dialog contract", () => {
  it("keeps app source free of window prompt/confirm/alert APIs", () => {
    const offenders = listSourceFiles(sourceRoot).flatMap(findForbiddenNativeDialogCalls);

    expect(offenders).toEqual([]);
  });
});
