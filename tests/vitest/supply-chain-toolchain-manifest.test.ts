import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  packageManager?: string;
};

describe("supply-chain toolchain manifest", () => {
  it("pins the Bun package manager version used by local validation", () => {
    expect(packageJson.packageManager).toBe("bun@1.3.14");
    expect(packageJson.packageManager).toMatch(/^bun@\d+\.\d+\.\d+$/);
    expect(packageJson.packageManager).not.toContain("latest");
  });
});
