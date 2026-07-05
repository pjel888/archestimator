import { describe, expect, it } from "vitest";

import { deriveClientIdentity } from "@/lib/observability/client-identity";

function makeRequest(headers: Record<string, string> = {}, url = "https://archestimator.com/api/share/abc"): Request {
  return new Request(url, { headers: new Headers(headers) });
}

describe("deriveClientIdentity", () => {
  it("uses CF-Connecting-IP when present (IPv4)", () => {
    const request = makeRequest({ "CF-Connecting-IP": "1.2.3.4" });
    const identity = deriveClientIdentity(request, { DEV_AUTH_BYPASS: undefined });

    expect(identity).not.toBeNull();
    expect(identity?.ip).toBe("1.2.3.4");
    expect(identity?.ipPrefix).toBe("1.2.3.0/24");
    expect(identity?.source).toBe("cf-connecting-ip");
    expect(identity?.isDev).toBe(false);
    expect(identity?.isPreview).toBe(false);
  });

  it("ignores spoofed X-Forwarded-For when CF-Connecting-IP present", () => {
    const request = makeRequest({
      "CF-Connecting-IP": "1.2.3.4",
      "X-Forwarded-For": "9.9.9.9",
    });
    const identity = deriveClientIdentity(request, { DEV_AUTH_BYPASS: undefined });

    expect(identity?.ip).toBe("1.2.3.4");
    expect(identity?.ip).not.toBe("9.9.9.9");
  });

  it("returns null in production when CF-Connecting-IP absent (fail-closed)", () => {
    const request = makeRequest({});
    const identity = deriveClientIdentity(request, { DEV_AUTH_BYPASS: undefined });

    expect(identity).toBeNull();
  });

  it("aggregates IPv6 to /48 prefix", () => {
    const request = makeRequest({ "CF-Connecting-IP": "2001:db8:abcd:ef01::1" });
    const identity = deriveClientIdentity(request, { DEV_AUTH_BYPASS: undefined });

    expect(identity?.ip).toBe("2001:db8:abcd:ef01::1");
    expect(identity?.ipPrefix).toBe("2001:db8:abcd::/48");
  });

  it("aggregates short IPv6 to /48 prefix", () => {
    const request = makeRequest({ "CF-Connecting-IP": "2001:db8::1" });
    const identity = deriveClientIdentity(request, { DEV_AUTH_BYPASS: undefined });

    expect(identity?.ipPrefix).toBe("2001:db8::/48");
  });

  it("returns dev identity for localhost when DEV_AUTH_BYPASS=1", () => {
    const request = new Request("http://localhost:3000/api/test", {
      headers: new Headers(),
    });
    const identity = deriveClientIdentity(request, { DEV_AUTH_BYPASS: "1" });

    expect(identity).not.toBeNull();
    expect(identity?.isDev).toBe(true);
    expect(identity?.source).toBe("dev-localhost");
    expect(identity?.ip).toBe("127.0.0.1");
  });

  it("does NOT return dev identity for localhost when DEV_AUTH_BYPASS not set", () => {
    const request = new Request("http://localhost:3000/api/test", {
      headers: new Headers(),
    });
    const identity = deriveClientIdentity(request, { DEV_AUTH_BYPASS: undefined });

    expect(identity).toBeNull();
  });

  it("returns preview identity for *.workers.dev host", () => {
    const request = new Request("https://archestimator-proof.workers.dev/api/test", {
      headers: new Headers(),
    });
    const identity = deriveClientIdentity(request, { DEV_AUTH_BYPASS: undefined });

    expect(identity).not.toBeNull();
    expect(identity?.isPreview).toBe(true);
    expect(identity?.source).toBe("preview-internal");
  });

  it("treats invalid CF-Connecting-IP as fail-closed (malformed IP)", () => {
    const request = makeRequest({ "CF-Connecting-IP": "not-an-ip" });
    const identity = deriveClientIdentity(request, { DEV_AUTH_BYPASS: undefined });

    expect(identity).toBeNull();
  });

  it("treats empty CF-Connecting-IP as absent (fail-closed in production)", () => {
    const request = makeRequest({ "CF-Connecting-IP": "" });
    const identity = deriveClientIdentity(request, { DEV_AUTH_BYPASS: undefined });

    expect(identity).toBeNull();
  });
});
