import { describe, expect, it } from "vitest";

import { clientPortalComposeSearch, projectClientPortalComposeHref } from "@/lib/client-portal/compose-entry";

describe("client portal compose entry", () => {
  it("preserves unique source selections without publishing", () => {
    const href = projectClientPortalComposeHref("project /1", {
      estimateIds: ["estimate_1", "estimate_1", "estimate_2"],
      artifactVersionIds: ["artifact_version_1"],
      requestVersionIds: ["request_version_1"],
    });

    expect(href).toBe("/workshop/projects/project%20%2F1/client-portals/compose?estimateId=estimate_1&estimateId=estimate_2&artifactVersionId=artifact_version_1&requestVersionId=request_version_1");
    expect(href).not.toContain("publish=");
  });

  it("adds the content tab only for the resolved portal destination", () => {
    expect(clientPortalComposeSearch({ nodeIds: ["node_1"] })).toBe("tab=content&nodeId=node_1");
    expect(clientPortalComposeSearch({ nodeIds: ["node_1"] }, false)).toBe("nodeId=node_1");
  });
});
