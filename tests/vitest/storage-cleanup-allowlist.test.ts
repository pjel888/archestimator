import { describe, expect, it } from "vitest";

import {
  isAllowedComponentAttachmentCleanupTarget,
  isAllowedComponentImageCleanupTarget,
  isAllowedProjectImageCleanupTarget,
  splitAllowedStorageCleanupTargets,
} from "@/lib/mass-deletion/storage-cleanup";

describe("mass deletion storage cleanup allowlist", () => {
  it("only allows project image cleanup for DB-derived WebP project-image paths", () => {
    expect(isAllowedProjectImageCleanupTarget({ bucket: "project-images", path: "workspace-1/project-images/project-1.webp" })).toBe(true);
    expect(isAllowedProjectImageCleanupTarget({ bucket: "project-images", path: "workspace-1/project-images/project-1-thumb.webp" })).toBe(true);
    expect(isAllowedProjectImageCleanupTarget({ bucket: "project-images", path: "workspace-1/project-images/../secret.webp" })).toBe(false);
    expect(isAllowedProjectImageCleanupTarget({ bucket: "component-attachments", path: "workspace-1/project-images/project-1.webp" })).toBe(false);
    expect(isAllowedProjectImageCleanupTarget({ bucket: "component-images", path: "workspace-1/project-images/project-1.webp" })).toBe(false);
    expect(isAllowedProjectImageCleanupTarget({ bucket: "project-images", path: "workspace-1/project-images/project-1.png" })).toBe(false);
  });

  it("scopes component image and attachment cleanup to the owning workspace prefix", () => {
    expect(isAllowedComponentImageCleanupTarget({ bucket: "component-images", path: "workspace-1/components/item.webp" }, "workspace-1")).toBe(true);
    expect(isAllowedComponentImageCleanupTarget({ bucket: "component-images", path: "workspace-2/components/item.webp" }, "workspace-1")).toBe(false);
    expect(isAllowedComponentAttachmentCleanupTarget({ bucket: "component-attachments", path: "workspace-1/attachments/spec.pdf" }, "workspace-1")).toBe(true);
    expect(isAllowedComponentAttachmentCleanupTarget({ bucket: "component-attachments", path: "workspace-1//attachments/spec.pdf" }, "workspace-1")).toBe(false);
  });

  it("deduplicates accepted targets and reports rejected cleanup attempts", () => {
    const result = splitAllowedStorageCleanupTargets(
      [
        { bucket: "project-images", path: "workspace-1/project-images/project-1.webp" },
        { bucket: "project-images", path: "workspace-1/project-images/project-1.webp" },
        { bucket: "project-images", path: "workspace-1/project-images/project-1.png" },
      ],
      { kind: "project" },
    );

    expect(result.allowed).toEqual([{ bucket: "project-images", path: "workspace-1/project-images/project-1.webp" }]);
    expect(result.rejected).toHaveLength(1);
  });
});
