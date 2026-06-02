import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationText = readdirSync("supabase/migrations")
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join("supabase/migrations", file), "utf8"))
  .join("\n");

function extractLatestFunction(functionName: string) {
  const functionPattern = new RegExp(
    `create or replace function public\\.${functionName}\\([\\s\\S]*?\\n\\$\\$;`,
    "g",
  );
  const matches = migrationText.match(functionPattern) ?? [];
  return matches.at(-1) ?? "";
}

describe("project sheet collaboration RLS", () => {
  it("keeps sheet-only project visibility out of inherited estimate access", () => {
    const latestCanAccessEstimate = extractLatestFunction("can_access_estimate");

    expect(latestCanAccessEstimate).toContain("public.estimate_inherits_project_access(e.id)");
    expect(latestCanAccessEstimate).toContain("public.current_project_access_rank(e.project_id) > 0");
    expect(latestCanAccessEstimate).not.toContain("public.can_access_project(e.project_id)");
  });
});
