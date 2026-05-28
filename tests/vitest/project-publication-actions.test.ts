import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/publication/actions.ts", "utf8");
const header = readFileSync("src/components/workshop/ProjectPublicationHeader.tsx", "utf8");

describe("project publication manager actions (Shared Link Overhaul V2)", () => {
  it("creates, republishes, and revokes client links behind server-side manager checks", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain("createProjectPublication");
    expect(actions).toContain("republishProjectPublication");
    expect(actions).toContain("rotateProjectPublicationLink");
    expect(actions).toContain("revokeProjectPublication");
    expect(actions).toContain("assertProjectPublicationManager");
    expect(actions).toContain("Only project owners and admins can publish client links.");
    expect(actions).toContain("createPublicationToken");
    expect(actions).toContain("hashPublicationToken");
    expect(actions).toContain("encryptPublicationToken");
    expect(actions).toContain("hashPublicationPassword");
    expect(actions).toContain("buildProjectPublicationSnapshot");
    expect(actions).toContain("project_publications");
    expect(actions).toContain("selected_estimate_ids");
    expect(actions).toContain('status: "revoked"');
    expect(actions).toContain("revalidatePublicationRoutes");
  });

  it("wires the publication modal controls to server actions", () => {
    expect(header).toContain("createProjectPublication");
    expect(header).toContain("republishProjectPublication");
    expect(header).toContain("rotateProjectPublicationLink");
    expect(header).toContain("revokeProjectPublication");
    expect(header).toContain("runPublicationAction");
    // RED TEST (P0): expects new "Shared link" terminology (will fail until P1 renames JSX strings in ProjectPublicationHeader)
    expect(header).toContain("Generate shared link");
    expect(header).toContain("Update shared page");
    expect(header).toContain("New shared link");
    expect(header).toContain("Turn off shared link");
    expect(header).toContain("Require password");
  });

  // RED TEST (P0): Sheet selection filter support already exists in action; test will pass for backend but UI wiring is red until P1
  it("createProjectPublication accepts selectedEstimateIds array and normalizes for snapshot filtering", () => {
    expect(actions).toContain("selectedEstimateIds");
    expect(actions).toContain("normalizeSelectedEstimateIds");
    expect(actions).toContain("buildSnapshotForProject(context, estimateIds)");
    // Explicit filter path present (red until P1 threads from SheetPickerList)
    expect(actions).toMatch(/if \(selectedEstimateIds\.length\)|\.in\("id", selectedEstimateIds\)/);
  });

  // RED TEST (P0): Tab rendering for receiver (will fail until P2 implements SharePageTabs + ARIA tablist in share page)
  it("receiver surface will expose tablist for sheet navigation (tabbed estimates)", () => {
    // Placeholder structural expectation; actual tablist role + keyboard nav arrives in P2
    // Current vertical stack render means this source-level or integration assertion starts red
    expect(true).toBe(false); // intentional red until SharePageTabs + tab roles implemented
  });
});
