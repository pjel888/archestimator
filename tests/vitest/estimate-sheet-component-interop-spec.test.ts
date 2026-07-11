import { readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const sourcePath = join(process.cwd(), "e2e/estimate-sheet-component-interop.spec.ts");
const source = readFileSync(sourcePath, "utf8");
const parsed = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const expectedScenarios = [
  ["CI-QA-01", "01-duplicate-name-create"],
  ["CI-QA-02", "02-insert-library-row"],
  ["CI-QA-03", "03-edit-library-row-linkstate"],
  ["CI-QA-04", "04-inline-variant-pill-library"],
  ["CI-QA-05", "05-edit-thumbnail-library-row"],
  ["CI-QA-05b", "05b-edit-component-drawer-library-master"],
  ["CI-QA-05c", "05c-detach-library-row"],
  ["CI-QA-06", "06-edit-project-component-fanout"],
  ["CI-QA-07", "07-identical-name-project"],
  ["CI-QA-08", "08-thumbnail-fanout-project"],
  ["CI-QA-09", "09-variant-persistence-project"],
  ["CI-QA-10", "10-inline-variant-pill-project"],
  ["CI-QA-11", "11-image-url-normalization"],
  ["CI-QA-12", "12-blank-row-express-init"],
  ["CI-QA-13", "13-promote-to-library"],
  ["CI-QA-14", "14-stress-fanout-5000-rows"],
  ["CI-QA-15", "15-stress-modal-open"],
  ["CI-QA-16", "16-stress-inline-edit"],
  ["CI-QA-17", "17-delete-row-restore"],
] as const;

function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression) || ts.isParenthesizedExpression(expression)) {
    return unwrapExpression(expression.expression);
  }
  return expression;
}

function scenarioArray(): ts.ArrayLiteralExpression {
  for (const statement of parsed.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "INTEROP_SCENARIOS" || !declaration.initializer) continue;
      const expression = unwrapExpression(declaration.initializer);
      if (ts.isArrayLiteralExpression(expression)) return expression;
    }
  }
  throw new Error("INTEROP_SCENARIOS array not found");
}

function propertyText(object: ts.ObjectLiteralExpression, name: string): string {
  const property = object.properties.find((candidate): candidate is ts.PropertyAssignment => {
    return ts.isPropertyAssignment(candidate) && ts.isIdentifier(candidate.name) && candidate.name.text === name;
  });
  if (!property) throw new Error(`${name} property not found`);
  const value = unwrapExpression(property.initializer);
  if (ts.isStringLiteral(value) || ts.isIdentifier(value)) return value.text;
  throw new Error(`${name} property has unexpected shape`);
}

describe("estimate-sheet component interoperability browser specification", () => {
  it("binds every canonical scenario ID and slug to one distinct handler", () => {
    const entries = scenarioArray().elements.map((element) => {
      const value = unwrapExpression(element);
      if (!ts.isObjectLiteralExpression(value)) throw new Error("scenario entry must be an object literal");
      return { id: propertyText(value, "id"), slug: propertyText(value, "slug"), run: propertyText(value, "run") };
    });

    expect(entries.map(({ id, slug }) => [id, slug])).toEqual(expectedScenarios);
    expect(new Set(entries.map(({ run }) => run)).size).toBe(expectedScenarios.length);
    for (const entry of entries) {
      const declaration = parsed.statements.find((statement): statement is ts.FunctionDeclaration => {
        return ts.isFunctionDeclaration(statement) && statement.name?.text === entry.run;
      });
      expect(declaration, entry.run).toBeDefined();
      const body = declaration!.body!.getText(parsed);
      expect(body, `${entry.run} action`).toMatch(
        /await (?:.+\.(?:click|fill|blur|goto|setInputFiles|press)\(|(?:chooseDifferentVariant|openComponentEditor|saveComponentEditor|waitForRowIdle)\()/u,
      );
      expect(body, `${entry.run} assertion`).toContain("expect(");
      expect(body, `${entry.run} evidence identity`).toContain(`scenarioEvidence(\"${entry.id}\", \"${entry.slug}\"`);
    }
  });

  it("keeps execution deterministic and emits reporter-consumable scenario evidence", () => {
    expect(source).toContain('test.describe.configure({ mode: "serial", retries: 0 })');
    expect(source).toContain("expect(testInfo.retry).toBe(0)");
    expect(source).toContain('schemaVersion: "estimate-sheet-interop-scenario.v1"');
    expect(source).toContain("`estimate-sheet-interop-${scenario.slug}.json`");
    expect(source).not.toMatch(/const scenarios\s*=\s*\[\s*"/u);
    expect(source).not.toContain("{ scenario, snapshot }");
  });
});
