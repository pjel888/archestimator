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
