import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shareApiRoutes = [
  "src/app/api/share/[token]/route.ts",
  "src/app/api/share/[token]/activity/route.ts",
  "src/app/api/share/[token]/comment/route.ts",
  "src/app/api/share/[token]/decision/route.ts",
  "src/app/api/share/[token]/events/route.ts",
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
});
