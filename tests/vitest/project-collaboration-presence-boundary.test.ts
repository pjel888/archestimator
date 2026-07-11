import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const repository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("project collaboration presence boundary", () => {
  it("keeps the authorization summary offline until the realtime overlay reports presence", () => {
    const summary = repository.match(/export async function getProjectCollaborationSummary[\s\S]*?\n}\n\nexport const getProjectPublicationSummary/)?.[0] ?? "";

    expect(summary).toContain("Presence is a realtime overlay");
    expect(summary).toContain("online: false");
    expect(summary).not.toContain("online: userId === profile.id");
    expect(summary).not.toContain("online: member.user_id === profile.id");
  });
});
