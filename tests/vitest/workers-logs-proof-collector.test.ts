import { describe, expect, it } from "vitest";

import {
  buildWorkersLogsProofArtifact,
  parseWranglerTailJsonLines,
} from "@/../scripts/collect-workers-logs-proof";

const NOW = new Date("2026-07-08T12:00:00.000Z");

describe("Workers Logs proof collector", () => {
  it("parses wrangler tail JSON lines after prelude text", () => {
    const records = parseWranglerTailJsonLines(`
Connected to archestimator-proof, waiting for logs...
{"outcome":"ok","logs":[{"message":["request req_local-123 /workshop/projects"]}]}
not json
prefix {"outcome":"error","logs":[{"message":["request req_local-456 /api/health"]}]}
`);

    expect(records).toHaveLength(2);
    expect(JSON.stringify(records[0])).toContain("req_local-123");
    expect(JSON.stringify(records[1])).toContain("/api/health");
  });

  it("builds a passing redacted Workers Logs proof from matching hosted records", () => {
    const artifact = buildWorkersLogsProofArtifact({
      requestId: "req_internal-123",
      route: "/workshop/projects",
      worker: "archestimator-proof",
      now: NOW,
      durationSeconds: 60,
      records: [
        {
          outcome: "ok",
          event: { request: { url: "https://archestimator.com/workshop/projects" } },
          logs: [{ message: ["request_id=req_internal-123 route=/workshop/projects error=[redacted]"] }],
        },
      ],
      command: {
        attempted: false,
        exitCode: 0,
        signal: null,
        timedOut: false,
        stderrBytes: 0,
      },
    });

    expect(artifact.passed).toBe(true);
    expect(artifact.query.matchedEvents).toBe(1);
    expect(artifact.evidence.matchedRecordHashes).toHaveLength(1);
    expect(JSON.stringify(artifact)).not.toContain("https://archestimator.com/workshop/projects");
  });

  it("builds a passing proof-marker artifact without a pre-known request id", () => {
    const artifact = buildWorkersLogsProofArtifact({
      proofId: "proof_12345678",
      route: "/__cloudflare/observability-proof",
      worker: "archestimator-proof",
      now: NOW,
      durationSeconds: 60,
      records: [
        {
          outcome: "ok",
          logs: [{
            message: [
              JSON.stringify({
                event: "workers_logs_proof_marker",
                request_id: "req_00000000-0000-4000-8000-000000000000",
                context: {
                  proof_id: "proof_12345678",
                  route: "/__cloudflare/observability-proof",
                },
              }),
            ],
          }],
        },
      ],
      command: {
        attempted: true,
        exitCode: 0,
        signal: null,
        timedOut: false,
        stderrBytes: 0,
        trigger: {
          attempted: true,
          ok: true,
          status: 200,
          responseBytes: 200,
          responseRequestId: "req_00000000-0000-4000-8000-000000000000",
          errorName: null,
        },
      },
    });

    expect(artifact.passed).toBe(true);
    expect(artifact.query.requestId).toBeNull();
    expect(artifact.query.proofId).toBe("proof_12345678");
    expect(artifact.evidence.internalRequestIdObserved).toBe(true);
    expect(artifact.evidence.proofIdObserved).toBe(true);
    expect(artifact.trigger).toMatchObject({ attempted: true, ok: true, status: 200 });
  });

  it("fails when the route is not observed", () => {
    const artifact = buildWorkersLogsProofArtifact({
      requestId: "req_internal-123",
      route: "/workshop/projects",
      now: NOW,
      records: [
        {
          outcome: "ok",
          logs: [{ message: ["request_id=req_internal-123 route=/api/health"] }],
        },
      ],
    });

    expect(artifact.passed).toBe(false);
    expect(artifact.evidence.internalRequestIdObserved).toBe(true);
    expect(artifact.evidence.routeObserved).toBe(false);
  });

  it("fails and omits raw records when matched tail output contains secrets", () => {
    const artifact = buildWorkersLogsProofArtifact({
      requestId: "req_internal-123",
      route: "/workshop/projects",
      now: NOW,
      records: [
        {
          outcome: "error",
          logs: [{ message: ["request_id=req_internal-123 route=/workshop/projects Bearer abcdefghijklmnop"] }],
        },
      ],
    });

    expect(artifact.passed).toBe(false);
    expect(artifact.evidence.noRawSecrets).toBe(false);
    expect(JSON.stringify(artifact)).not.toContain("Bearer abcdefghijklmnop");
  });
});
