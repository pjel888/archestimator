import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SHARED_LINK_UNAVAILABLE_COPY } from "@/lib/publication/share-copy";

const shareApiRoutes = [
  "src/app/api/share/[token]/route.ts",
  "src/app/api/share/[token]/activity/route.ts",
  "src/app/api/share/[token]/comment/route.ts",
  "src/app/api/share/[token]/decision/route.ts",
  "src/app/api/share/[token]/password/route.ts",
  "src/app/api/share/[token]/session/route.ts",
  "src/app/api/share/[token]/unsubscribe/route.ts",
] as const;

describe("share/publication no-store invariants", () => {
  it.each(shareApiRoutes)("keeps %s dynamic and no-store", (routePath) => {
    const source = readFileSync(routePath, "utf8");

    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain('"Cache-Control": "no-store"');
    expect(source).not.toMatch(/revalidate\s*=\s*\d+/);
    expect(source).not.toContain('Cache-Control": "public');
    expect(source).not.toContain('Cache-Control": "s-maxage');
  });

  it("keeps the tokenized share page dynamic", () => {
    const source = readFileSync("src/app/share/[token]/page.tsx", "utf8");

    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).not.toMatch(/revalidate\s*=\s*\d+/);
    expect(source).not.toContain("unstable_cache");
  });

  it("keeps the tokenized share route from blanking during dynamic resolution", () => {
    const source = readFileSync("src/app/share/[token]/loading.tsx", "utf8");

    expect(source).toContain('aria-label="Loading proposal review"');
    expect(source).toContain('role="status"');
    expect(source).toContain("ShareContainer");
  });

  it("keeps unavailable share links branded without exposing project details", () => {
    const source = readFileSync("src/app/share/[token]/not-found.tsx", "utf8");

    expect(source).toContain('aria-label="Shared proposal unavailable"');
    expect(source).toContain("SHARED_LINK_UNAVAILABLE_COPY.title");
    expect(source).toContain("SHARED_LINK_UNAVAILABLE_COPY.body");
    expect(SHARED_LINK_UNAVAILABLE_COPY.title).toBe("This shared proposal is unavailable");
    expect(SHARED_LINK_UNAVAILABLE_COPY.body).toContain("fresh link");
    expect(source).not.toContain("projectCode");
    expect(source).not.toContain("clientName");
    expect(source).not.toContain("snapshot");
  });
});
