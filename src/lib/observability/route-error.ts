import { NextResponse } from "next/server";

import { getCurrentPerfTraceSnapshot } from "@/lib/perf/server-timing";
import { getCurrentRequestId, REQUEST_ID_HEADER } from "./request-id";
import { normalizeAppError, type AppErrorCode } from "./app-error";
import { logAppError, type AppLogger } from "./logger";

type ErrorResponseOptions = {
  context?: unknown;
  logger?: AppLogger;
  traceId?: string;
};

type ProblemDetailsFieldError = {
  field: string;
  code: string;
  message: string;
};

type ProblemDetailsOptions = {
  logger?: AppLogger;
  requestId?: string;
  correlationId?: string;
  retryAfter?: number;
  instance?: string;
  fieldErrors?: ProblemDetailsFieldError[];
};

function makeTraceId() {
  return `err_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function readTraceId(override?: string) {
  return override ?? getCurrentRequestId() ?? getCurrentPerfTraceSnapshot()?.requestId ?? makeTraceId();
}

function problemTitleForCode(code: AppErrorCode): string {
  switch (code) {
    case "AUTH_REQUIRED":
    case "AUTH_SESSION_EXPIRED":
      return "Authentication required";
    case "AUTH_PERMISSION_DENIED":
      return "Permission denied";
    case "AUTH_RATE_LIMITED":
    case "RATE_LIMITED":
      return "Too many requests";
    case "VALIDATION_FAILED":
      return "Invalid request";
    case "NOT_FOUND":
      return "Not found";
    case "CONFLICT":
      return "Conflict";
    case "NETWORK_ERROR":
      return "Network unavailable";
    case "DATABASE_ERROR":
    case "UPSTREAM_ERROR":
    case "INTERNAL_ERROR":
    default:
      return "Request failed";
  }
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
    {
      status: appError.statusCode,
      headers: { [REQUEST_ID_HEADER]: traceId },
    },
  );
}

// RFC 9457 Problem Details; errorResponse() kept for backward compat. See evidence/error-cache-trace-contract.md.
export function problemDetailsResponse(error: unknown, options: ProblemDetailsOptions = {}) {
  const requestId = readTraceId(options.requestId);
  const appError = normalizeAppError(error);
  const clientError = appError.toClientJSON();

  logAppError(error, {
    logger: options.logger,
    event: "route_problem_details",
    requestId,
  });

  const body: Record<string, unknown> = {
    type: `urn:archestimator:problem:${clientError.code}`,
    title: problemTitleForCode(clientError.code),
    status: appError.statusCode,
    detail: clientError.message,
    code: clientError.code,
    requestId,
  };
  if (options.instance !== undefined) body.instance = options.instance;
  if (options.correlationId !== undefined) body.correlationId = options.correlationId;
  if (options.retryAfter !== undefined) body.retryAfter = options.retryAfter;
  if (options.fieldErrors !== undefined) body.fieldErrors = options.fieldErrors;

  const headers: Record<string, string> = {
    "Content-Type": "application/problem+json",
    "Cache-Control": "no-store, private",
    [REQUEST_ID_HEADER]: requestId,
  };
  if (options.retryAfter !== undefined) {
    headers["Retry-After"] = String(options.retryAfter);
  }

  return new NextResponse(JSON.stringify(body), {
    status: appError.statusCode,
    headers,
  });
}
