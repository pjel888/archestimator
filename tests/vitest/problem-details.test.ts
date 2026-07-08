import { describe, expect, it, vi } from "vitest";

import {
  AuthPermissionDeniedError,
  RateLimitError,
  ValidationError,
} from "@/lib/observability/app-error";
import type { AppLogger, LogRecord } from "@/lib/observability/logger";
import { REQUEST_ID_HEADER, withRequestIdContext } from "@/lib/observability/request-id";
import { problemDetailsResponse } from "@/lib/observability/route-error";

function createTestLogger() {
  const records: LogRecord[] = [];
  const logger: AppLogger = {
    log: vi.fn((record) => {
      records.push(record);
    }),
  };
  return { logger, records };
}

describe("problemDetailsResponse", () => {
  it("returns RFC 9457 Problem Details body with stable type/code/status", async () => {
    const { logger } = createTestLogger();
    const response = problemDetailsResponse(new AuthPermissionDeniedError(), {
      logger,
      requestId: "req-test-1",
    });

    expect(response.status).toBe(403);
    expect(response.headers.get("Content-Type")).toBe("application/problem+json");
    expect(await response.json()).toEqual({
      type: "urn:archestimator:problem:AUTH_PERMISSION_DENIED",
      title: "AuthPermissionDeniedError",
      status: 403,
      detail: "You do not have permission to do that.",
      code: "AUTH_PERMISSION_DENIED",
      instance: undefined,
      requestId: "req-test-1",
      correlationId: undefined,
      retryAfter: undefined,
      fieldErrors: undefined,
    });
  });

  it("sets Cache-Control: no-store, private on every response", () => {
    const { logger } = createTestLogger();
    const response = problemDetailsResponse(new ValidationError(), { logger });

    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
  });

  it("sets Retry-After header and body field when retryAfter provided (429)", async () => {
    const { logger } = createTestLogger();
    const response = problemDetailsResponse(new RateLimitError(), {
      logger,
      retryAfter: 30,
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    const body = (await response.json()) as { retryAfter?: number };
    expect(body.retryAfter).toBe(30);
  });

  it("omits Retry-After header when retryAfter not provided", () => {
    const { logger } = createTestLogger();
    const response = problemDetailsResponse(new ValidationError(), { logger });

    expect(response.headers.has("Retry-After")).toBe(false);
  });

  it("includes correlationId in body when provided", async () => {
    const { logger } = createTestLogger();
    const response = problemDetailsResponse(new ValidationError(), {
      logger,
      correlationId: "corr-abc",
    });

    const body = (await response.json()) as { correlationId?: string };
    expect(body.correlationId).toBe("corr-abc");
  });

  it("includes instance and fieldErrors when provided", async () => {
    const { logger } = createTestLogger();
    const response = problemDetailsResponse(new ValidationError("Invalid input"), {
      logger,
      instance: "/api/share/[token]/comment",
      fieldErrors: [{ field: "comment", code: "required", message: "Comment is required." }],
    });

    const body = (await response.json()) as {
      instance?: string;
      fieldErrors?: Array<{ field: string; code: string; message: string }>;
    };
    expect(body.instance).toBe("/api/share/[token]/comment");
    expect(body.fieldErrors).toEqual([
      { field: "comment", code: "required", message: "Comment is required." },
    ]);
  });

  it("does not leak internal error detail for unknown errors (500)", async () => {
    const { logger, records } = createTestLogger();
    const response = problemDetailsResponse(new Error("database password leaked"), { logger });

    expect(response.status).toBe(500);
    const body = (await response.json()) as { detail?: string; code?: string };
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.detail).not.toContain("password");
    expect(JSON.stringify(records[0])).not.toContain("password leaked");
  });

  it("uses AppError.message as detail when AppError passed", async () => {
    const { logger } = createTestLogger();
    const response = problemDetailsResponse(new AuthPermissionDeniedError("Custom message"), {
      logger,
    });

    const body = (await response.json()) as { detail?: string };
    expect(body.detail).toBe("Custom message");
  });

  it("uses the current request id context for body, header, and log records", async () => {
    const { logger, records } = createTestLogger();
    const response = await withRequestIdContext(
      {
        echoId: "client.req-123456",
        internalId: "req_00000000-0000-4000-8000-000000000001",
        source: "inbound",
      },
      async () => problemDetailsResponse(new ValidationError("Invalid input"), { logger }),
    );

    expect(response.headers.get(REQUEST_ID_HEADER)).toBe("req_00000000-0000-4000-8000-000000000001");
    const body = await response.json() as { requestId?: string };
    expect(body.requestId).toBe("req_00000000-0000-4000-8000-000000000001");
    expect(records[0]).toMatchObject({
      request_id: "req_00000000-0000-4000-8000-000000000001",
    });
  });
});
