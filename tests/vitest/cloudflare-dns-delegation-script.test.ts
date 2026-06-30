import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkCloudflareDnsDelegation,
  normalizeNameserver,
  writeMarkdown,
} from "../../scripts/check-cloudflare-dns-delegation";

const CURRENT_SANITIZED_EVIDENCE = {
  zone: {
    name: "archestimator.com",
    assignedNameservers: ["carl.ns.cloudflare.com", "ziggy.ns.cloudflare.com"],
    registrarNameservers: ["dns1.registrar-servers.com", "dns2.registrar-servers.com"],
  },
};

describe("Cloudflare DNS delegation checker", () => {
  it("normalizes nameservers with case and trailing dots", () => {
    expect(normalizeNameserver("ZIGGY.NS.CLOUDFLARE.COM.")).toBe("ziggy.ns.cloudflare.com");
  });

  it("passes when public DNS includes all Cloudflare-assigned nameservers", async () => {
    const report = await checkCloudflareDnsDelegation(CURRENT_SANITIZED_EVIDENCE, {
      source: "source.json",
      resolveNsImpl: async () => ["ZIGGY.NS.CLOUDFLARE.COM.", "carl.ns.cloudflare.com."],
    });

    expect(report.publicDnsChecked).toBe(true);
    expect(report.publicDnsBacked).toBe(true);
    expect(report.providerApiBacked).toBe(false);
    expect(report.nameserversActive).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.publicDnsNameservers).toEqual(["carl.ns.cloudflare.com", "ziggy.ns.cloudflare.com"]);
  });

  it("keeps delegation blocked when public DNS still points elsewhere", async () => {
    const report = await checkCloudflareDnsDelegation(CURRENT_SANITIZED_EVIDENCE, {
      source: "source.json",
      resolveNsImpl: async () => ["dns1.registrar-servers.com", "dns2.registrar-servers.com"],
    });

    expect(report.publicDnsChecked).toBe(true);
    expect(report.nameserversActive).toBe(false);
    expect(report.blockers).toContain("Public DNS nameservers do not include all Cloudflare-assigned nameservers.");
  });

  it("captures public record signals for cutover preflight without provider mutation", async () => {
    const report = await checkCloudflareDnsDelegation(CURRENT_SANITIZED_EVIDENCE, {
      source: "source.json",
      includePublicRecordSnapshot: true,
      resolveNsImpl: async () => ["dns1.registrar-servers.com", "dns2.registrar-servers.com"],
      resolveRecordImpl: async (hostname, type) => {
        if (hostname === "archestimator.com" && type === "A") return ["216.150.1.1"];
        if (hostname === "archestimator.com" && type === "MX") return ["10 eforward1.registrar-servers.com"];
        if (hostname === "archestimator.com" && type === "TXT") return ["v=spf1 include:spf.efwd.registrar-servers.com ~all"];
        if (hostname === "www.archestimator.com" && type === "CNAME") return ["bb7ab57cfa50fcad.vercel-dns-017.com"];
        return [];
      },
    });

    expect(report.publicDnsRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hostname: "archestimator.com", type: "A", values: ["216.150.1.1"] }),
        expect.objectContaining({ hostname: "www.archestimator.com", type: "CNAME", values: ["bb7ab57cfa50fcad.vercel-dns-017.com"] }),
      ]),
    );
    expect(report.publicDnsProviderSignals).toEqual([
      "Public MX still uses Namecheap email forwarding.",
      "Public SPF still references Namecheap email forwarding.",
      "Public apex A still resolves to the current registrar-hosted address.",
      "Public www DNS still resolves through Vercel.",
    ]);
    expect(report.blockers).toContain(
      "Cloudflare DNS record-list evidence is not captured; verify imported apex, www, MX, TXT, and email-auth records before registrar nameserver cutover.",
    );
  });

  it("records resolver failures without leaking unrelated evidence fields", async () => {
    const report = await checkCloudflareDnsDelegation(
      {
        ...CURRENT_SANITIZED_EVIDENCE,
        tokenValue: "do-not-leak-this-token",
      } as typeof CURRENT_SANITIZED_EVIDENCE,
      {
        source: "source.json",
        resolveNsImpl: async () => {
          throw new Error("resolver unavailable");
        },
      },
    );
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-dns-delegation-"));
    try {
      const file = join(dir, "delegation.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(report.publicDnsChecked).toBe(false);
      expect(markdown).toContain("Cloudflare DNS Delegation");
      expect(markdown).toContain("resolver unavailable");
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
