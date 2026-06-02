import { describe, expect, it, vi } from "vitest";

import {
  checkSupportEmailDns,
  flattenTxt,
  normalizeDomain,
} from "@/../scripts/check-support-email-dns";

describe("support email DNS checker", () => {
  it("normalizes supported DNS domains and rejects invalid input", () => {
    expect(normalizeDomain(" ArchEstimator.COM. ")).toBe("archestimator.com");
    expect(() => normalizeDomain("localhost")).toThrow(/valid DNS domain/);
    expect(() => normalizeDomain("bad domain.com")).toThrow(/valid DNS domain/);
  });

  it("flattens split TXT records", () => {
    expect(flattenTxt([["v=spf1 ", "include:example.com ", "~all"]])).toEqual([
      "v=spf1 include:example.com ~all",
    ]);
  });

  it("passes only when MX, SPF, and DMARC are all present", async () => {
    const result = await checkSupportEmailDns("example.com", {
      resolveMx: vi.fn(async () => [
        { exchange: "mx2.example.com", priority: 20 },
        { exchange: "mx1.example.com", priority: 10 },
      ]),
      resolveTxt: vi.fn(async (domain: string) => (
        domain.startsWith("_dmarc")
          ? [["v=DMARC1; p=none; rua=mailto:postmaster@example.com"]]
          : [["v=spf1 include:example.com ~all"]]
      )),
      resolve4: vi.fn(async () => ["192.0.2.2", "192.0.2.1"]),
    });

    expect(result.mxHosts).toEqual(["10 mx1.example.com", "20 mx2.example.com"]);
    expect(result.spfRecords).toEqual(["v=spf1 include:example.com ~all"]);
    expect(result.dmarcRecords).toEqual(["v=DMARC1; p=none; rua=mailto:postmaster@example.com"]);
    expect(result.aRecords).toEqual(["192.0.2.1", "192.0.2.2"]);
    expect(result.dnsReady).toBe(true);
    expect(result.note).toContain("does not prove inbox monitoring");
  });

  it("fails DNS readiness when DMARC is missing", async () => {
    const result = await checkSupportEmailDns("example.com", {
      resolveMx: vi.fn(async () => [{ exchange: "mx.example.com", priority: 10 }]),
      resolveTxt: vi.fn(async (domain: string) => (
        domain.startsWith("_dmarc") ? [] : [["v=spf1 include:example.com ~all"]]
      )),
      resolve4: vi.fn(async () => []),
    });

    expect(result.hasMx).toBe(true);
    expect(result.hasSpf).toBe(true);
    expect(result.hasDmarc).toBe(false);
    expect(result.dnsReady).toBe(false);
  });
});
