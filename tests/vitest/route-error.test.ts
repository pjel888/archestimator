import { describe, expect, it, vi } from "vitest";

import { AuthPermissionDeniedError } from "@/lib/observability/app-error";
import type { AppLogger, LogRecord } from "@/lib/observability/logger";
import { errorResponse } from "@/lib/observability/route-error";

function createTestLogger() {
  const records: LogRecord[] = [];
  const logger: AppLogger = {
    log: vi.fn((record) => {
      records.push(record);
    }),
  };
  return { logger, records };
}

describe("errorResponse", () => {
  it("returns safe JSON and status code for AppError", async () => {
    const { logger, records } = createTestLogger();
    const response = errorResponse(new AuthPermissionDeniedError(), { logger, traceId: "trace-test" });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      trace_id: "trace-test",
      error: {
        kind: "auth",
        code: "AUTH_PERMISSION_DENIED",
        message: "You do not have permission to do that.",
      },
    });
    expect(records[0]).toMatchObject({
      level: "warn",
      event: "route_error",
      request_id: "trace-test",
      error: {
        class: "AuthPermissionDeniedError",
        code: "AUTH_PERMISSION_DENIED",
      },
    });
  });

  it("returns generic 500 JSON for unknown errors", async () => {
    const { logger, records } = createTestLogger();
    const response = errorResponse(new Error("database password leaked"), { logger, traceId: "trace-unknown" });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      trace_id: "trace-unknown",
      error: {
        kind: "internal",
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Try again in a moment.",
      },
    });
    expect(JSON.stringify(records[0])).not.toContain("password leaked");
  });
});
