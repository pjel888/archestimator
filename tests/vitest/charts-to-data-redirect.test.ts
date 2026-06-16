import { readFileSync } from "node:fs";
import nextConfig from "../../next.config";

import { describe, expect, it } from "vitest";

const nextConfigSource = readFileSync("next.config.ts", "utf8");

describe("charts route compatibility redirect", () => {
  it("permanently redirects the retired charts URL to the Data route", () => {
    expect(nextConfigSource).toContain("async redirects()");
    expect(nextConfigSource).toContain('source: "/workshop/projects/:projectId/charts"');
    expect(nextConfigSource).toContain('destination: "/workshop/projects/:projectId/data"');
    expect(nextConfigSource).toContain("permanent: true");
  });

  it("exposes a real permanent redirect config that preserves incoming query strings by path-only destination", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/workshop/projects/:projectId/charts",
          destination: "/workshop/projects/:projectId/data",
          permanent: true,
        }),
      ]),
    );
    expect(redirects?.find((redirect) => redirect.source === "/workshop/projects/:projectId/charts")?.destination).not.toContain("?");
  });
});
