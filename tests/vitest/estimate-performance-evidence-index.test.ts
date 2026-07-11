import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  INDEX_SCHEMA,
  canonicalJson,
  sha256Hex,
} from "../../scripts/lib/estimate-sheet-performance-contract";

const scriptPath = resolve(process.cwd(), "scripts/update-estimate-sheet-performance-evidence-index.ts");
const describeIndex = describe.skipIf(!existsSync(scriptPath));

describeIndex("estimate-sheet performance evidence index", () => {
  it("uses the dedicated v1 index schema and immutable projection vocabulary", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toContain(INDEX_SCHEMA);
    expect(source).toMatch(/dependencySources/);
    expect(source).toMatch(/immutable/i);
    expect(source).toMatch(/sha256/i);
    expect(source).toMatch(/cleanup/i);
  });

  it("binds index identity to canonical bytes rather than object insertion order", () => {
    const first = { schema_version: INDEX_SCHEMA, evidence: [{ id: "EVID-001", sha256: sha256Hex("a") }] };
    const second = { evidence: [{ sha256: sha256Hex("a"), id: "EVID-001" }], schema_version: INDEX_SCHEMA };
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(sha256Hex(canonicalJson(first))).toBe(sha256Hex(canonicalJson(second)));
  });

  it("does not permit a projection to become its own immutable source", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toMatch(/source.*projection|projection.*source/i);
    expect(source).toMatch(/cyclic|cycle|self/i);
  });
});

