import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("/access-required page contract", () => {
  it("gives denied beta users a clear non-looping path", () => {
    const source = readFileSync(join(process.cwd(), "src/app/access-required/page.tsx"), "utf8");

    expect(source).toMatch(/Access unavailable/i);
    expect(source).toMatch(/Access is granted manually/i);
    expect(source).toMatch(/support@archestimator\.com/);
    expect(source).not.toMatch(/philipjonlewis@gmail\.com/);
    expect(source).toMatch(/href=["']\/login["']/);
    expect(source).not.toMatch(/\/workshop/);
  });

  it("keeps retired beta access URLs as non-permanent redirects to the canonical page", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: "/beta/access-required", destination: "/access-required", permanent: false },
        { source: "/beta", destination: "/access-required", permanent: false },
      ]),
    );
  });
});
