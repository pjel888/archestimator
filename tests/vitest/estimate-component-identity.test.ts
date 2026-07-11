import { describe, expect, it } from "vitest";

import {
  getProjectComponentIdentity,
  withExpressComponentMetadata,
  withProjectComponentProjectionMetadata,
} from "@/lib/estimates/express-components";

describe("estimate component identity", () => {
  it("prefers a project-component snapshot identity over copied metadata", () => {
    const metadata = withExpressComponentMetadata({}, { id: "stale-express-id" });
    expect(getProjectComponentIdentity(metadata, "row-2", {
      sourceType: "project_component",
      sourceComponentId: "shared-component-1",
    })).toBe("shared-component-1");
  });

  it("uses projection identity before express metadata and row fallback", () => {
    const metadata = withProjectComponentProjectionMetadata(
      withExpressComponentMetadata({}, { id: "express-id" }),
      { projectId: "project-1", classification: "express", componentId: "projection-id" },
    );
    expect(getProjectComponentIdentity(metadata, "row-1")).toBe("projection-id");
  });

  it("uses the stable row identifier only when no component provenance exists", () => {
    expect(getProjectComponentIdentity({}, "row-fallback", null)).toBe("row-fallback");
    expect(getProjectComponentIdentity({}, null, null)).toBeNull();
  });
});
