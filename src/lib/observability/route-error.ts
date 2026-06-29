import { NextResponse } from "next/server";

import { getCurrentPerfTraceSnapshot } from "@/lib/perf/server-timing";
import { normalizeAppError } from "./app-error";
import { logAppError, type AppLogger } from "./logger";

type ErrorResponseOptions = {
  context?: unknown;
  logger?: AppLogger;
  traceId?: string;
};

function makeTraceId() {
  return `err_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function readTraceId(override?: string) {
  return override ?? getCurrentPerfTraceSnapshot()?.requestId ?? makeTraceId();
}

export function errorResponse(error: unknown, options: ErrorResponseOptions = {}) {
  const traceId = readTraceId(options.traceId);
  const appError = normalizeAppError(error);
  logAppError(error, {
    logger: options.logger,
    event: "route_error",
    requestId: traceId,
    context: options.context,
  });

  return NextResponse.json(
    {
      ok: false,
      trace_id: traceId,
      error: appError.toClientJSON(),
    },
    { status: appError.statusCode },
  );
}
