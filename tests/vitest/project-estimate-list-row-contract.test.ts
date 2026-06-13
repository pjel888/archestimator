import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildProjectEstimateListRow,
  PROJECT_ESTIMATE_LIST_ROW_FIELDS,
  type ProjectEstimateListRow,
} from "@/lib/estimates/project-estimate-list-row";

const DTO_SOURCE_PATH = path.resolve(__dirname, "../../src/lib/estimates/project-estimate-list-row.ts");

const REQUIRED_FIELDS = [
  "id",
  "project_id",
  "name",
  "sheet_code",
  "currency_code",
  "notes",
  "project_budget",
  "created_at",
  "updated_at",
  "firstNodeId",
  "nodeCount",
  "rowItemCount",
  "totalProjectCost",
] as const;

const FORBIDDEN_FIELDS = ["metadata", "created_by", "workspace_id", "assumptions"] as const;

// Compile-time guards (validated by `bun run type-check`): the DTO must expose
// every required field and none of the sensitive ones.
type RequiredField = (typeof REQUIRED_FIELDS)[number];
type ForbiddenField = (typeof FORBIDDEN_FIELDS)[number];
type _RequiredPresent = RequiredField extends keyof ProjectEstimateListRow ? true : false;
type _ForbiddenAbsent = Extract<keyof ProjectEstimateListRow, ForbiddenField> extends never ? true : false;
const _requiredPresent: _RequiredPresent = true;
const _forbiddenAbsent: _ForbiddenAbsent = true;
void _requiredPresent;
void _forbiddenAbsent;

describe("ProjectEstimateListRow contract", () => {
  it("does not import the Supabase DB types into the client list row", () => {
    const source = readFileSync(DTO_SOURCE_PATH, "utf8");
    expect(source).not.toContain("@/lib/supabase/types");
    expect(source).not.toContain('Tables<"estimates">');
    expect(source).not.toContain("Tables<");
  });

  it("exposes exactly the canonical reconciliation fields", () => {
    expect([...PROJECT_ESTIMATE_LIST_ROW_FIELDS].sort()).toEqual([...REQUIRED_FIELDS].sort());
  });

  it("strips sensitive columns even when the source record carries them", () => {
    const row = buildProjectEstimateListRow(
      {
        id: "estimate-1",
        project_id: "project-1",
        name: "Ground Floor",
        sheet_code: "EST-001",
        currency_code: "PHP",
        notes: null,
        project_budget: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        // Sensitive fields a normalized estimate record would carry — must be dropped.
        metadata: { secret: true },
        created_by: "user-1",
        workspace_id: "workspace-1",
      } as never,
      { firstNodeId: "node-1", nodeCount: 3, rowItemCount: 2, totalProjectCost: 1250 },
    );

    const keys = Object.keys(row);
    for (const forbidden of FORBIDDEN_FIELDS) {
      expect(keys).not.toContain(forbidden);
    }
    for (const required of REQUIRED_FIELDS) {
      expect(keys).toContain(required);
    }
    expect(row.firstNodeId).toBe("node-1");
    expect(row.totalProjectCost).toBe(1250);
  });
});
