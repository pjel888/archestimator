import { readFileSync } from "node:fs";

describe("proxy sensitive-route cache headers", () => {
  const proxySource = readFileSync("src/lib/auth/request-proxy.ts", "utf8");

  it("keeps protected/auth redirect responses private and no-store", () => {
    expect(proxySource).toContain(
      'const SENSITIVE_ROUTE_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate";',
    );
    expect(proxySource).toContain('response.headers.set("Cache-Control", SENSITIVE_ROUTE_CACHE_CONTROL);');
    expect(proxySource).toContain("function redirectWithSensitiveRouteCacheControl(url: URL)");
    expect(proxySource).toContain("return withSensitiveRouteCacheControl(NextResponse.redirect(url));");
  });

  it("does not leave bare proxy redirects without the sensitive cache wrapper", () => {
    const bareRedirectReturns = proxySource
      .split("\n")
      .filter((line) => line.includes("return NextResponse.redirect"));

    expect(bareRedirectReturns).toEqual([]);
  });
});
