import { describe, expect, it, vi } from "vitest";

import { InternalError, ValidationError } from "@/lib/observability/app-error";
import type { AppLogger, LogRecord } from "@/lib/observability/logger";
import { withRequestIdContext } from "@/lib/observability/request-id";
import { withActionErrorLogging, withActionErrors } from "@/lib/observability/with-action-errors";

function createTestLogger() {
  const records: LogRecord[] = [];
  const logger: AppLogger = {
    log: vi.fn((record) => {
      records.push(record);
    }),
  };
  return { logger, records };
}

describe("withActionErrors", () => {
  it("returns ok false with safe AppError JSON when a wrapped action throws", async () => {
    const { logger, records } = createTestLogger();
    const action = withActionErrors("saveEstimate", async () => {
      throw new ValidationError("Enter a project name.");
    }, { logger });

    await expect(action()).resolves.toEqual({
      ok: false,
      error: {
        kind: "validation",
        code: "VALIDATION_FAILED",
        message: "Enter a project name.",
      },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      level: "info",
      event: "action_error",
      action: "saveEstimate",
      error: {
        class: "ValidationError",
        code: "VALIDATION_FAILED",
        message: "Enter a project name.",
      },
    });
  });

  it("logs generic thrown errors without exposing raw details to the client", async () => {
    const { logger, records } = createTestLogger();
    const action = withActionErrors("publishProject", async () => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY=secret database constraint failed");
    }, { logger });

    const result = await action();

    expect(result).toEqual({
      ok: false,
      error: new InternalError().toClientJSON(),
    });
    expect(JSON.stringify(result)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(records[0]?.error?.cause).toBeDefined();
    expect(JSON.stringify(records[0])).not.toContain("secret");
  });

  it("logs and rethrows for custom-contract actions without changing return shape", async () => {
    const { logger, records } = createTestLogger();
    const action = withActionErrorLogging("customAction", async () => {
      throw new ValidationError("Custom action failed.");
    }, { logger });

    await expect(action()).rejects.toBeInstanceOf(ValidationError);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      level: "info",
      event: "action_error",
      action: "customAction",
      error: {
        code: "VALIDATION_FAILED",
      },
    });
  });

  it("adds the current request id to server action error logs", async () => {
    const { logger, records } = createTestLogger();
    const action = withActionErrors("saveEstimate", async () => {
      throw new ValidationError("Enter a project name.");
    }, { logger });

    await withRequestIdContext(
      {
        echoId: "client.req-123456",
        internalId: "req_00000000-0000-4000-8000-000000000002",
        source: "inbound",
      },
      async () => action(),
    );

    expect(records[0]).toMatchObject({
      action: "saveEstimate",
      request_id: "req_00000000-0000-4000-8000-000000000002",
    });
  });
});
