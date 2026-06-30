import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkCloudflareEmailReadiness,
  extractCloudflareSecretNames,
  parseWranglerEmailSendingList,
  writeMarkdown,
} from "../../scripts/check-cloudflare-email-readiness";

const COMPLETE_WRANGLER = JSON.stringify({
  send_email: [{ name: "EMAIL" }],
});

const COMPLETE_ENV_EXAMPLE = `
ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=
ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email
CLOUDFLARE_EMAIL_FROM=
CLOUDFLARE_EMAIL_REPLY_TO=support@archestimator.com
`;

const COMPLETE_DEV_VARS_EXAMPLE = `
ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false
ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email
CLOUDFLARE_EMAIL_FROM=
CLOUDFLARE_EMAIL_REPLY_TO=support@archestimator.com
`;

const COMPLETE_SECRET_LIST = JSON.stringify([
  { name: "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED" },
  { name: "ARCHESTIMATOR_EMAIL_PROVIDER" },
  { name: "CLOUDFLARE_EMAIL_FROM" },
  { name: "CLOUDFLARE_EMAIL_REPLY_TO" },
]);

describe("Cloudflare Email readiness checker", () => {
  it("parses no-domain Wrangler output as not ready", () => {
    const parsed = parseWranglerEmailSendingList("No sending subdomains found in this account.", "archestimator.com");

    expect(parsed.noSendingDomainsMessagePresent).toBe(true);
    expect(parsed.targetDomainPresent).toBe(false);
    expect(parsed.discoveredTargetDomains).toEqual([]);
  });

  it("extracts Worker secret names without values", () => {
    expect(extractCloudflareSecretNames(COMPLETE_SECRET_LIST)).toEqual([
      "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
      "ARCHESTIMATOR_EMAIL_PROVIDER",
      "CLOUDFLARE_EMAIL_FROM",
      "CLOUDFLARE_EMAIL_REPLY_TO",
    ]);
  });

  it("passes only when binding, secrets, examples, and sending domain are present", () => {
    const result = checkCloudflareEmailReadiness({
      wranglerConfigText: COMPLETE_WRANGLER,
      envExampleText: COMPLETE_ENV_EXAMPLE,
      devVarsExampleText: COMPLETE_DEV_VARS_EXAMPLE,
      workerSecretListOutput: COMPLETE_SECRET_LIST,
      emailSendingListOutput: "archestimator.com active",
    });

    expect(result.productionEmailReady).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("fails closed for the current Cloudflare no-sending-domain state", () => {
    const result = checkCloudflareEmailReadiness({
      wranglerConfigText: COMPLETE_WRANGLER,
      envExampleText: COMPLETE_ENV_EXAMPLE,
      devVarsExampleText: COMPLETE_DEV_VARS_EXAMPLE,
      workerSecretListOutput: JSON.stringify([{ name: "ARCHESTIMATOR_EMAIL_PROVIDER" }]),
      emailSendingListOutput: "No sending subdomains found in this account.",
    });

    expect(result.productionEmailReady).toBe(false);
    expect(result.blockers.join(" ")).toContain("missing email secrets");
    expect(result.blockers.join(" ")).toContain("no Email Sending domains");
  });

  it("writes markdown evidence", () => {
    const dir = mkdtempSync(join(tmpdir(), "cf-email-readiness-"));
    const output = join(dir, "report.md");
    try {
      const result = checkCloudflareEmailReadiness({
        wranglerConfigText: COMPLETE_WRANGLER,
        envExampleText: COMPLETE_ENV_EXAMPLE,
        devVarsExampleText: COMPLETE_DEV_VARS_EXAMPLE,
        workerSecretListOutput: COMPLETE_SECRET_LIST,
        emailSendingListOutput: "archestimator.com active",
      });

      writeMarkdown(result, output);

      expect(readFileSync(output, "utf8")).toContain("Cloudflare Email Readiness");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
