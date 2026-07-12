import { describe, expect, it } from "vitest";

import { buildReleaseBoundaryPackets, classifyHostedEndpointStatus, sanitizeGitHubDiscovery } from "../../scripts/lib/release-hosted-discovery";

const input = {
  endpointId: "github-rulesets",
  command: "gh api --method GET /repos/{owner}/{repo}/rulesets",
  exitCode: 0,
  httpStatus: 200,
  collectedAt: "2029-01-01T00:00:00.000Z",
  paginationComplete: true,
  summary: { repositoryVisibility: "private" as const, defaultBranch: "main", rulesetCount: 1, bypassActorCount: 0, requiredCheckCount: 1, mergeQueueEnabled: false, environmentCount: 1, workflowRunCount: 2, artifactExpiryObserved: true, codeqlStatus: "pass" as const, dependabotStatus: "unknown" as const, secretScanningStatus: "unknown" as const, secretScanningHideSecretApplied: true },
};

describe("release hosted discovery", () => {
  it("sanitizes before digesting and treats an observed paginated GET as observed", () => {
    const discovery = sanitizeGitHubDiscovery({ ...input, rawResponse: { token: "secret-value", html_url: "https://example.test/private" } });
    expect(discovery.status).toBe("OBSERVED");
    expect(JSON.stringify(discovery)).not.toContain("secret-value");
    expect(JSON.stringify(discovery)).not.toContain("example.test");
    expect(discovery.responseDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    [{ ...input, exitCode: 1 }, "exit failure"],
    [{ ...input, httpStatus: 401 }, "unauthenticated"],
    [{ ...input, httpStatus: 403 }, "forbidden"],
    [{ ...input, httpStatus: 404 }, "missing"],
    [{ ...input, httpStatus: 429 }, "rate limited"],
    [{ ...input, httpStatus: 503 }, "unavailable"],
    [{ ...input, paginationComplete: false }, "partial pagination"],
    [{ ...input, unavailableReason: "unsupported-feature" as const }, "unsupported feature"],
  ])("fails closed as UNKNOWN for %s", (endpoint, _label) => {
    expect(classifyHostedEndpointStatus(endpoint)).toBe("UNKNOWN");
  });

  it("rejects secret-bearing command identities before they reach a digest", () => {
    expect(() => sanitizeGitHubDiscovery({ ...input, command: "gh api --header Authorization:Bearer secret" })).toThrow("secret-bearing");
  });

  it("builds three separate expiring non-authorizing packets", () => {
    const packets = buildReleaseBoundaryPackets({ releaseId: "release-20260712-a1b2c3d4", candidateSha: "b".repeat(40), now: new Date("2029-01-01T00:00:00.000Z"), expiresAt: "2029-01-02T00:00:00.000Z" });
    expect(packets.map((packet) => packet.boundary)).toEqual(["AUTH-001", "AUTH-002", "AUTH-003"]);
    expect(packets.every((packet) => packet.authorizationRequired && packet.costPosture === "free-tier-only")).toBe(true);
    expect(JSON.stringify(packets)).not.toContain("token=");
    expect(JSON.stringify(packets)).not.toContain("https://");
  });
});
