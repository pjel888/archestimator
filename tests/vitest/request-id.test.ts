import { describe, expect, it } from "vitest";

import {
  REQUEST_ID_HEADER,
  getCurrentRequestId,
  getCurrentRequestIdContext,
  isValidInboundRequestId,
  resolveRequestId,
  responseWithRequestId,
  withRequestIdContext,
} from "@/lib/observability/request-id";
import { normalizePathForLog } from "@/lib/observability/safe-path";

describe("request id context", () => {
  it("validates inbound request ids narrowly", () => {
    expect(isValidInboundRequestId("req_1234567890")).toBe(true);
    expect(isValidInboundRequestId("cf-ray:abcDEF123456")).toBe(true);
    expect(isValidInboundRequestId("short")).toBe(false);
    expect(isValidInboundRequestId("Bearer raw-token")).toBe(false);
    expect(isValidInboundRequestId("/share/raw-token")).toBe(false);
  });

  it("uses valid inbound ids only for response echo, not internal persistence", () => {
    const headers = new Headers({ [REQUEST_ID_HEADER]: "client.req-123456" });
    const resolved = resolveRequestId(headers);

    expect(resolved).toMatchObject({
      echoId: "client.req-123456",
      source: "inbound",
    });
    expect(resolved.internalId).toMatch(/^req_[0-9a-f-]{36}$/i);
    expect(resolved.internalId).not.toBe(resolved.echoId);
  });

  it("generates a fresh echo id when inbound id is missing or invalid", () => {
    const missing = resolveRequestId(new Headers());
    const invalid = resolveRequestId(new Headers({ [REQUEST_ID_HEADER]: "Bearer raw-token" }));

    expect(missing.source).toBe("generated");
    expect(missing.echoId).toBe(missing.internalId);
    expect(invalid.source).toBe("invalid-inbound");
    expect(invalid.echoId).toBe(invalid.internalId);
  });

  it("keeps the request id available through async context and response headers", async () => {
    const resolved = {
      echoId: "client.req-123456",
      internalId: "req_00000000-0000-4000-8000-000000000000",
      source: "inbound" as const,
    };

    const result = await withRequestIdContext(resolved, async () => {
      await Promise.resolve();
      const response = responseWithRequestId(new Response("ok"));
      return {
        context: getCurrentRequestIdContext(),
        current: getCurrentRequestId(),
        header: response.headers.get(REQUEST_ID_HEADER),
      };
    });

    expect(result).toEqual({
      context: resolved,
      current: resolved.internalId,
      header: resolved.echoId,
    });
  });

  it("redacts tokenized route segments and queries for edge-safe path logs", () => {
    expect(normalizePathForLog("https://archestimator.test/share/raw-share-token?recipient=raw-recipient")).toBe(
      "/share/[REDACTED_TOKEN]?[REDACTED_QUERY]",
    );
    expect(normalizePathForLog("/api/share/raw-share-token/session")).toBe(
      "/api/share/[REDACTED_TOKEN]/session",
    );
    expect(normalizePathForLog("/invite/raw-invite-token")).toBe("/invite/[REDACTED_TOKEN]");
  });
});

