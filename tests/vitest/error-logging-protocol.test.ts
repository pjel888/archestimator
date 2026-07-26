import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("error logging and agent debugging protocol", () => {
  it("keeps local log debugging visible from the top-level agent entry point", () => {
    const agents = readFileSync("AGENTS.md", "utf8");

    expect(agents).toContain("bun run ops:agent-debug-snapshot");
    expect(agents).toContain("bun run logs:debug");
    expect(agents).toContain("logs:tail");
    expect(agents).toContain("logs:explain");
  });

  it("documents the production split between Workers Logs and D1 incidents", () => {
    const protocol = readFileSync(".ai/00_system/ERROR_LOGGING_AND_AGENTIC_DEBUGGING_PROTOCOL.md", "utf8");

    expect(protocol).toContain("logs/dev.ndjson");
    expect(protocol).toContain("do not store raw application error logs in D1");
    expect(protocol).toContain("D1 `operational_incidents`");
    expect(protocol).toContain("Cloudflare Workers Logs");
    expect(protocol).toContain("bun run logs:tail");
    expect(protocol).toContain("bun run ops:check-error-handling");
    expect(protocol).toContain("operational-incident alert payload");
    expect(protocol).toContain("operational_alert_failed");
    expect(protocol).toContain("OPERATIONAL_INCIDENT_ALERTS_ENABLED");
    expect(protocol).toContain("untrusted diagnostic data");
    expect(protocol).toContain("Local logs are not hosted proof");
  });
});
