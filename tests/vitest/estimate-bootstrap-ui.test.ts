import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const estimatesPage = readFileSync("src/app/workshop/projects/[projectId]/estimates/page.tsx", "utf8");
const newEstimateForm = readFileSync("src/components/workshop/NewEstimateForm.tsx", "utf8");
const estimateListCard = readFileSync("src/components/workshop/EstimateListCard.tsx", "utf8");
const projectDashboardPage = readFileSync("src/app/workshop/projects/[projectId]/page.tsx", "utf8");

describe("estimate bootstrap UI governance", () => {
  it("uses shared primitives for estimate creation controls", () => {
    expect(newEstimateForm).toContain('from "@/components/ui/button"');
    expect(newEstimateForm).toContain('from "@/components/ui/control-input"');
    expect(newEstimateForm).not.toContain("<button");
    expect(newEstimateForm).not.toContain("<input");
  });

  it("renders live Supabase estimate cards and project estimate navigation", () => {
    expect(estimatesPage).toContain("NewEstimateForm");
    expect(estimatesPage).toContain("EstimateListCard");
    expect(estimateListCard).toContain('estimate: Tables<"estimates">');
    expect(projectDashboardPage).toContain("ButtonLink");
  });
});
