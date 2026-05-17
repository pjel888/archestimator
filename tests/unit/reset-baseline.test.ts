import { describe, expect, test } from "bun:test";

describe("reset baseline", () => {
  test("workshop page source is intentionally empty", async () => {
    const source = await Bun.file("src/app/workshop/page.tsx").text();
    expect(source).toContain("aria-label=\"Workshop\"");
    expect(source).not.toContain("createMutableLocalRepository");
    expect(source).not.toContain("WorkshopShell");
  });
});
