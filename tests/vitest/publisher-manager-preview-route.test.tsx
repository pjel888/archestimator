import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/workshop/publisher/preview/[projectId]/page.tsx", "utf8");
const workspace = readFileSync("src/components/share/ShareReviewWorkspace.tsx", "utf8");

describe("publisher manager preview route", () => {
  it("requires authenticated manager access and avoids public credentials", () => {
    expect(route).toContain("await requireAuth()");
    expect(route).toContain("await assertProjectPublicationManager(projectId)");
    expect(route).toContain("summary.canManagePublication");
    expect(route).toContain("getProjectPublicationSummary(projectId)");
    expect(route).toContain("getPublicationSnapshotById(summary.publicationId)");
    expect(route).toContain("sanitizeProjectPublicationSnapshotForPublicRead");
    expect(route).not.toContain("resolveProjectPublicationSnapshotByToken");
    expect(route).not.toContain("cookies(");
    expect(route).not.toContain("recipient=");
  });

  it("renders recipient presentation in manager-read-only mode", () => {
    expect(route).toContain('previewMode="manager-read-only"');
    expect(workspace).toContain('previewMode?: "manager-read-only"');
    expect(workspace).toContain("Recipient comments and response controls are disabled in manager preview.");
  });
});
