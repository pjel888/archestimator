import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationFile = readdirSync("supabase/migrations").find((file) => file.endsWith("_populate_lewis_residence_estimate_tree.sql"));

if (!migrationFile) {
  throw new Error("Lewis Residence estimate tree migration was not found.");
}

const migration = readFileSync(join("supabase/migrations", migrationFile), "utf8");
const localSeed = readFileSync("supabase/seed.sql", "utf8");

type SeedNode = {
  id: string;
  kind: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
};

function sqlText(value: string) {
  return value.replaceAll("''", "'");
}

function extractEstimateNodes(sql: string): SeedNode[] {
  const nodePattern =
    /\('([0-9a-f-]+)',\s*(?:v_estimate_id|'33333333-3333-4333-8333-333333333333'),\s*(null|'[0-9a-f-]+'),\s*'([^']+)',\s*'((?:''|[^'])*)',\s*(\d+),/g;

  return [...sql.matchAll(nodePattern)].map((match) => ({
    id: match[1],
    parentId: match[2] === "null" ? null : match[2].slice(1, -1),
    kind: match[3],
    name: sqlText(match[4]),
    sortOrder: Number(match[5]),
  }));
}

const migrationNodes = extractEstimateNodes(migration);
const localSeedNodes = extractEstimateNodes(localSeed);

function childNames(parentName: string) {
  const parent = migrationNodes.find((node) => node.name === parentName);
  if (!parent) return [];
  return migrationNodes.filter((node) => node.parentId === parent.id).map((node) => node.name);
}

describe("Lewis Residence Supabase seed migration", () => {
  it("seeds the requested top-level estimate tree parents", () => {
    expect(migration).toContain("Lewis Residence");
    expect(migration).toContain("AE-LR-001");
    expect(localSeed).toContain("AE-LR-001");

    expect(migrationNodes.filter((node) => node.parentId === null)).toEqual([
      expect.objectContaining({ kind: "group", name: "General Requirements", sortOrder: 10 }),
      expect.objectContaining({ kind: "group", name: "Site Works", sortOrder: 20 }),
      expect.objectContaining({ kind: "group", name: "Lot", sortOrder: 30 }),
    ]);
  });

  it("uses Group Nodes for House and Services House below Lot", () => {
    expect(childNames("Lot")).toEqual(["House", "Services House"]);
    expect(migrationNodes).not.toContainEqual(expect.objectContaining({ kind: "structure", name: "Storage" }));
    expect(migrationNodes).toContainEqual(expect.objectContaining({ kind: "group", name: "House" }));
    expect(migrationNodes).toContainEqual(expect.objectContaining({ kind: "group", name: "Services House" }));
  });

  it("includes the requested house and services-house areas", () => {
    [
      "2-Car Parking",
      "Show Kitchen",
      "Dirty Kitchen",
      "Bedroom 1 / Guest Room",
      "Bedroom 2",
      "Bedroom 3",
      "Bedroom 4",
      "Maid's Room",
      "Driver's Room",
    ].forEach((label) => {
      expect(migrationNodes).toContainEqual(expect.objectContaining({ name: label }));
    });
  });

  it("keeps the migration tree-only while the local development seed mirrors nodes and adds demo rows", () => {
    expect(migrationNodes).toHaveLength(47);
    expect(new Set(migrationNodes.map((node) => node.id)).size).toBe(migrationNodes.length);
    expect(localSeedNodes).toEqual(migrationNodes);

    expect(migration).not.toContain("public.estimate_row_items");
    expect(migration).not.toMatch(/insert\s+into\s+public\.estimate_row_items/i);
    expect(localSeed).toMatch(/insert\s+into\s+public\.estimate_row_items/i);
    expect(localSeed).toContain("600x600 Porcelain Floor Tile");
    expect(localSeed).toContain("Master bedroom low-VOC paint system");
    expect(localSeed).toContain("'linked-clean'");
    expect(localSeed).toContain("'detached'");
    expect(localSeed).not.toContain("Demo Residential Fit-out");
    expect(localSeed).not.toContain("Lot Group A");
  });
});
