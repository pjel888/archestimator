import { describe, expect, it } from "vitest";

import {
  createPrivateImageEntityTag,
  matchesIfNoneMatch,
} from "@/lib/uploads/private-image-revalidation";

describe("private image revalidation", () => {
  it("matches strong, weak, listed, and wildcard validators", () => {
    const entityTag = createPrivateImageEntityTag({ etag: "asset-version-1" });
    expect(entityTag).toBeTruthy();
    expect(matchesIfNoneMatch(entityTag, entityTag!)).toBe(true);
    expect(matchesIfNoneMatch(`W/${entityTag}`, entityTag!)).toBe(true);
    expect(matchesIfNoneMatch(`"other", W/${entityTag}`, entityTag!)).toBe(true);
    expect(matchesIfNoneMatch("*", entityTag!)).toBe(true);
  });

  it("does not match changed or missing validators", () => {
    const firstTag = createPrivateImageEntityTag({ etag: "asset-version-1" });
    const nextTag = createPrivateImageEntityTag({ etag: "asset-version-2" });
    expect(firstTag).toBeTruthy();
    expect(nextTag).toBeTruthy();
    expect(matchesIfNoneMatch(firstTag, nextTag!)).toBe(false);
    expect(matchesIfNoneMatch(null, nextTag!)).toBe(false);
  });

  it("falls back to body identity and declines metadata-free head responses", () => {
    expect(createPrivateImageEntityTag({})).toBeNull();
    expect(
      createPrivateImageEntityTag({}, new TextEncoder().encode("image-body").buffer),
    ).toMatch(/^"[A-Za-z0-9_-]+"$/);
  });
});
