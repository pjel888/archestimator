import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectsPage = readFileSync("src/app/workshop/projects/page.tsx", "utf8");
const newProjectForm = readFileSync("src/components/workshop/NewProjectForm.tsx", "utf8");
const liveProjectCard = readFileSync("src/components/workshop/LiveProjectCard.tsx", "utf8");

describe("project creation UI governance", () => {
  it("uses shared Button and ControlInput primitives for the new project flow", () => {
    expect(newProjectForm).toContain('from "@/components/ui/button"');
    expect(newProjectForm).toContain('from "@/components/ui/control-input"');
    expect(newProjectForm).not.toContain("<button");
    expect(newProjectForm).not.toContain("<input");
  });

  it("renders live Supabase project cards separately from sample references", () => {
    expect(projectsPage).toContain("LiveProjectCard");
    expect(projectsPage).toContain("NewProjectForm");
    expect(liveProjectCard).toContain('project: Tables<"projects">');
  });
});
