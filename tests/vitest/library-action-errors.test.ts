import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { throwActionError } from "@/lib/component-library/action-errors";

describe("throwActionError (P3 T20 / F25)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("throws a generic user-safe message and never leaks the raw cause", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const dbError = new Error('duplicate key value violates unique constraint "cost_library_items_pkey"');
    expect(() => throwActionError("Could not create component.", dbError)).toThrow("Could not create component.");
    try {
      throwActionError("Could not create component.", dbError);
    } catch (thrown) {
      const message = thrown instanceof Error ? thrown.message : String(thrown);
      expect(message).toBe("Could not create component.");
      expect(message).not.toContain("duplicate key");
      expect(message).not.toContain("constraint");
    }
    // The real cause is still logged server-side for debugging.
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("library server actions no longer interpolate raw error.message into thrown errors", () => {
    const root = process.cwd();
    for (const rel of [
      "src/lib/component-library/actions.ts",
      "src/lib/component-library/template-editor-actions.ts",
    ]) {
      const source = readFileSync(join(root, rel), "utf8");
      // No `new Error(`...${<anything>.message...}`)` should remain.
      expect(source).not.toMatch(/new Error\(`[^`]*\$\{[^`]*\.message/);
    }
  });
});
