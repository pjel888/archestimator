import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function getHandlerSource(path: string) {
  const source = readFileSync(path, "utf8");
  return source.slice(source.indexOf("export async function GET"), source.indexOf("export async function POST"));
}

describe("publication password-required read routes", () => {
  it("uses 423 Locked consistently for comments and decisions", () => {
    for (const path of [
      "src/app/api/share/[token]/comment/route.ts",
      "src/app/api/share/[token]/decision/route.ts",
    ]) {
      const getHandler = getHandlerSource(path);
      expect(getHandler).toContain('error: "password_required"');
      expect(getHandler).toContain("status: 423");
    }
  });
});
