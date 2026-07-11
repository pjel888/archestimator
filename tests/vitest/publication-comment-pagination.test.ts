import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared-link comment pagination contract", () => {
  it("uses the established encrypted activity cursor and bounded D1 pages", () => {
    const repository = readFileSync("src/lib/publication/public-repository.ts", "utf8");
    expect(repository).toContain("listPublicActivityComments");
    expect(repository).toContain("limit: pageLimit + 1");
    expect(repository).toContain("isBeforeSharedLinkActivityCursor");
    expect(repository).toContain("encodeSharedLinkActivityCursor");
    expect(repository).not.toContain("listPublicComments(publicationId, 200)");
  });

  it("keeps the comment UI explicit and append-only", () => {
    const component = readFileSync("src/components/share/SharePageComments.tsx", "utf8");
    expect(component).toContain("Load more comments");
    expect(component).toContain("commentsMoreLoaded");
    expect(component).toContain("?cursor=${encodeURIComponent(cursor)}");
  });
});
