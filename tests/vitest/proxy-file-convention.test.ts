import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Cloudflare Edge middleware file convention", () => {
  it("uses middleware instead of Next proxy because OpenNext Cloudflare rejects Node.js proxy runtime", () => {
    const middlewareSource = readFileSync("src/middleware.ts", "utf8");

    expect(existsSync("src/middleware.ts")).toBe(true);
    expect(existsSync("src/proxy.ts")).toBe(false);
    expect(middlewareSource).not.toContain("export { config");
    expect(middlewareSource).toContain(
      'import { proxy as requestProxy } from "@/lib/auth/request-proxy";',
    );
    expect(middlewareSource).toContain("export function middleware");
    expect(middlewareSource).toContain("export const config = {");
    expect(middlewareSource).toContain(
      'matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],',
    );
  });
});
