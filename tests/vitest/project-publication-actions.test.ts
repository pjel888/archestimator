import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/publication/actions.ts", "utf8");
const header = readFileSync("src/components/workshop/ProjectPublicationHeader.tsx", "utf8");

describe("project publication manager actions", () => {
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
    expect(header).toContain("Generate public link");
    expect(header).toContain("Update public page");
    expect(header).toContain("New link");
    expect(header).toContain("Turn off link");
    expect(header).toContain("Require password");
  });
});
