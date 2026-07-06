import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Next proxy file convention", () => {
  it("uses the proxy entrypoint instead of deprecated middleware", () => {
    const proxySource = readFileSync("src/proxy.ts", "utf8");

    expect(existsSync("src/proxy.ts")).toBe(true);
    expect(existsSync("src/middleware.ts")).toBe(false);
    expect(proxySource).not.toContain("export { config");
    expect(proxySource).toContain('import { proxy as requestProxy } from "@/lib/auth/request-proxy";');
    expect(proxySource).toContain("export const config = {");
    expect(proxySource).toContain('matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],');
  });
});
