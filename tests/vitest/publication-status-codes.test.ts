import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("publication password-required read routes", () => {
  it("uses 423 Locked consistently for comments and decisions", () => {
    for (const path of [
      "src/app/api/share/[token]/comment/route.ts",
      "src/app/api/share/[token]/decision/route.ts",
    ]) {
      const source = readFileSync(path, "utf8");
      const passwordRequiredIndex = source.indexOf('error: "password_required"');
      const postHandlerIndex = source.indexOf("export async function POST");
      const passwordRequiredResponse = source.slice(passwordRequiredIndex, passwordRequiredIndex + 160);

      expect(passwordRequiredIndex).toBeGreaterThanOrEqual(0);
      expect(postHandlerIndex).toBeGreaterThan(passwordRequiredIndex);
      expect(passwordRequiredResponse).toContain("status: 423");
    }
  });
});
