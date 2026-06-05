import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildExportRoute,
  buildHeaders,
  hasXlsxZipMagic,
  parseInputsFromEnv,
  summarizeResponse,
  verifyHostedExportRoute,
} from "@/../scripts/verify-hosted-export-route";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("hosted export route smoke script", () => {
  it("requires a hosted URL, ids, and either cookie or auth header", () => {
    process.env = {};

    expect(() => parseInputsFromEnv()).toThrow(/HOSTED_EXPORT_BASE_URL/);
    expect(() => parseInputsFromEnv()).toThrow(/HOSTED_EXPORT_AUTH_COOKIE or HOSTED_EXPORT_AUTH_HEADER/);
  });

  it("builds an encoded proposal export route", () => {
    expect(buildExportRoute("project/one", "estimate two")).toBe(
      "/api/projects/project%2Fone/estimates/estimate%20two/export/proposal.xlsx",
    );
  });

  it("uses auth material only as request headers and never in the report", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6]), {
      status: 200,
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="Customer-Residence-EST-42-proposal.xlsx"',
        "cache-control": "private, no-store",
      },
    }));

    const result = await verifyHostedExportRoute(
      {
        baseUrl: "https://preview.example",
        projectId: "project-1",
        estimateId: "estimate-1",
        authCookie: "sb-access-token=secret-cookie",
        minBytes: 4,
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://preview.example/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx",
      expect.objectContaining({
        headers: { Cookie: "sb-access-token=secret-cookie" },
        redirect: "manual",
      }),
    );
    expect(result.passed).toBe(true);
    expect(JSON.stringify(result)).not.toContain("secret-cookie");
    expect(JSON.stringify(result)).not.toContain("Customer-Residence");
    expect(JSON.stringify(result)).not.toContain("EST-42");
    expect(result.contentDisposition).toBe('attachment; filename="HOSTED_EXPORT_FILENAME_REDACTED.xlsx"');
  });

  it("fails the proof when the hosted route returns a non-workbook response", () => {
    const result = summarizeResponse({
      inputs: {
        baseUrl: "https://preview.example",
        projectId: "project-1",
        estimateId: "estimate-1",
        authHeader: "Bearer secret",
        minBytes: 100,
      },
      route: "/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx",
      response: new Response("<html>not found</html>", {
        status: 404,
        headers: { "content-type": "text/html" },
      }),
      bytes: new TextEncoder().encode("<html>not found</html>"),
      durationMs: 25.4,
    });

    expect(result.passed).toBe(false);
    expect(result.status).toBe(404);
    expect(result.xlsxZipMagic).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret");
  });


  it("captures multiple sanitized duration samples for benchmark mode", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6]), {
      status: 200,
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="Customer-Residence-EST-42-proposal.xlsx"',
        "cache-control": "private, no-store",
      },
    }));

    const result = await verifyHostedExportRoute(
      {
        baseUrl: "https://preview.example",
        projectId: "project-1",
        estimateId: "estimate-1",
        authHeader: "Bearer secret-token",
        minBytes: 4,
        runs: 3,
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.runs).toBe(3);
    expect(result.samples).toHaveLength(3);
    expect(result.averageDurationMs).toBeGreaterThanOrEqual(0);
    expect(result.passed).toBe(true);
    expect(JSON.stringify(result)).not.toContain("secret-token");
    expect(JSON.stringify(result)).not.toContain("Customer-Residence");
  });

  it("parses benchmark run count and markdown output env", () => {
    const dir = mkdtempSync(join(tmpdir(), "hosted-export-proof-"));
    process.env = {
      HOSTED_EXPORT_BASE_URL: "https://preview.example/",
      HOSTED_EXPORT_PROJECT_ID: "project-1",
      HOSTED_EXPORT_ESTIMATE_ID: "estimate-1",
      HOSTED_EXPORT_AUTH_HEADER: "Bearer secret",
      HOSTED_EXPORT_RUNS: "3",
      MARKDOWN_FILE: join(dir, "proof.md"),
    };

    const inputs = parseInputsFromEnv();

    expect(inputs.baseUrl).toBe("https://preview.example");
    expect(inputs.runs).toBe(3);
    expect(inputs.markdownFile).toMatch(/proof\.md$/);
    expect(() => readFileSync(inputs.markdownFile!, "utf8")).toThrow();
  });

  it("recognizes XLSX ZIP magic and builds request headers", () => {
    expect(hasXlsxZipMagic(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(hasXlsxZipMagic(new Uint8Array([0x50, 0x4b]))).toBe(false);
    expect(buildHeaders({ authCookie: "cookie", authHeader: "Bearer token" })).toEqual({
      Cookie: "cookie",
      Authorization: "Bearer token",
    });
  });
});
