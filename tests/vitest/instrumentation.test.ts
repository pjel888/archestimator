import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loggerMock = vi.hoisted(() => ({
  logAppError: vi.fn(),
}));

vi.mock("@/lib/observability/logger", () => loggerMock);

async function loadInstrumentation() {
  vi.resetModules();
  return import("@/instrumentation");
}

const originalRuntime = process.env.NEXT_RUNTIME;

describe("Next instrumentation local error logging", () => {
  beforeEach(() => {
    loggerMock.logAppError.mockReset();
    delete process.env.NEXT_RUNTIME;
  });

  afterEach(() => {
    if (originalRuntime === undefined) {
      delete process.env.NEXT_RUNTIME;
    } else {
      process.env.NEXT_RUNTIME = originalRuntime;
    }
    vi.restoreAllMocks();
  });

  it("logs App Router request errors to the local observability logger", async () => {
    const { onRequestError } = await loadInstrumentation();
    const error = new Error("database password leaked");

    await onRequestError(error, { path: "/api/test", method: "POST", headers: {} }, {
      routerKind: "App Router",
      routePath: "/api/test",
      routeType: "route",
      revalidateReason: undefined,
    });

    expect(loggerMock.logAppError).toHaveBeenCalledWith(error, {
      event: "next_request_error",
      context: expect.objectContaining({
        method: "POST",
        path: "/api/test",
        route: "/api/test",
        route_handler: "POST /api/test",
        route_type: "route",
        router_kind: "App Router",
      }),
    });
  });

  it("does not import the node file logger for edge runtime request errors", async () => {
    process.env.NEXT_RUNTIME = "edge";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { onRequestError } = await loadInstrumentation();

    await onRequestError(new Error("edge boom"), { path: "/proxy", method: "GET", headers: {} }, {
      routerKind: "App Router",
      routePath: "/proxy",
      routeType: "proxy",
      revalidateReason: undefined,
    });

    expect(loggerMock.logAppError).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(String(consoleError.mock.calls[0]?.[0])).toContain("next_request_error");
  });
});
