import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Next proxy file convention", () => {
  it("uses the proxy entrypoint instead of deprecated middleware", () => {
    expect(existsSync("src/proxy.ts")).toBe(true);
    expect(existsSync("src/middleware.ts")).toBe(false);
    expect(readFileSync("src/proxy.ts", "utf8")).toContain(
      'export { config, proxy } from "@/lib/auth/request-proxy";',
    );
  });
});
