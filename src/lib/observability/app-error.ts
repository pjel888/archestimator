import {
  appErrorKinds,
  type AppErrorClientJSON,
  type AppErrorCode,
  type AppErrorKind,
  type AppLogLevel,
} from "./types";
import {
  isUnsafeInfrastructureErrorMessage,
  USER_FACING_INTERNAL_ERROR_MESSAGE,
} from "./infra-error-message";

type AppErrorOptions = {
  cause?: unknown;
  details?: Record<string, unknown>;
};

type AppErrorInput = AppErrorOptions & {
  code: AppErrorCode;
  kind: AppErrorKind;
  message: string;
  statusCode: number;
};

type SerializedCause = {
  name: string;
  message: string;
  code?: string;
  kind?: string;
  cause?: SerializedCause;
};

function readDefaultLevel(code: AppErrorCode): AppLogLevel {
  if (
    code === "AUTH_REQUIRED" ||
    code === "AUTH_SESSION_EXPIRED" ||
    code === "VALIDATION_FAILED" ||
    code === "NOT_FOUND"
  ) {
    return "info";
  }
  if (
    code === "AUTH_PERMISSION_DENIED" ||
    code === "AUTH_RATE_LIMITED" ||
    code === "CONFLICT" ||
    code === "RATE_LIMITED" ||
    code === "NETWORK_ERROR"
  ) {
    return "warn";
  }
  return "error";
}

export class AppError extends Error {
  readonly cause?: unknown;
  readonly code: AppErrorCode;
  readonly details?: Record<string, unknown>;
  readonly kind: AppErrorKind;
  readonly statusCode: number;

  constructor({ cause, code, details, kind, message, statusCode }: AppErrorInput) {
    super(message);
    this.name = new.target.name;
    this.cause = cause;
    this.code = code;
    this.details = details;
    this.kind = kind;
    this.statusCode = statusCode;
  }

  toClientJSON(): AppErrorClientJSON {
    // Keep database/upstream kinds for server logs, but never ship provider or
    // storage implementation vocabulary to browsers.
    const clientKind = this.kind === "database" || this.kind === "upstream" ? "internal" : this.kind;
    const clientCode =
      this.code === "DATABASE_ERROR" || this.code === "UPSTREAM_ERROR" ? "INTERNAL_ERROR" : this.code;
    const message = isUnsafeInfrastructureErrorMessage(this.message)
      ? USER_FACING_INTERNAL_ERROR_MESSAGE
      : this.message;
    return {
      kind: clientKind,
      code: clientCode,
      message,
    };
  }

  toLogLevel(): AppLogLevel {
    return readDefaultLevel(this.code);
  }
}

export class AuthRequiredError extends AppError {
  constructor(message = "Sign in to continue.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "auth", code: "AUTH_REQUIRED", message, statusCode: 401 });
  }
}

export class AuthSessionExpiredError extends AppError {
  constructor(message = "Your session expired. Sign in again.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "auth", code: "AUTH_SESSION_EXPIRED", message, statusCode: 401 });
  }
}

export class AuthPermissionDeniedError extends AppError {
  constructor(message = "You do not have permission to do that.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "auth", code: "AUTH_PERMISSION_DENIED", message, statusCode: 403 });
  }
}

export class AuthRateLimitedError extends AppError {
  constructor(message = "Too many sign-in attempts. Try again soon.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "auth", code: "AUTH_RATE_LIMITED", message, statusCode: 429 });
  }
}

export class ValidationError extends AppError {
  constructor(message = "Check the highlighted fields.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "validation", code: "VALIDATION_FAILED", message, statusCode: 400 });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested record was not found.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "not_found", code: "NOT_FOUND", message, statusCode: 404 });
  }
}

export class ConflictError extends AppError {
  constructor(message = "This record changed. Refresh and try again.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "conflict", code: "CONFLICT", message, statusCode: 409 });
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Something went wrong. Try again in a moment.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "database", code: "DATABASE_ERROR", message, statusCode: 500 });
  }
}

export class UpstreamError extends AppError {
  constructor(message = "Something went wrong. Try again in a moment.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "upstream", code: "UPSTREAM_ERROR", message, statusCode: 502 });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many attempts. Try again soon.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "rate_limit", code: "RATE_LIMITED", message, statusCode: 429 });
  }
}

export class NetworkError extends AppError {
  constructor(message = "Network unavailable. Check your connection and try again.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "network", code: "NETWORK_ERROR", message, statusCode: 503 });
  }
}

export class InternalError extends AppError {
  constructor(message = "Something went wrong. Try again in a moment.", options: AppErrorOptions = {}) {
    super({ ...options, kind: "internal", code: "INTERNAL_ERROR", message, statusCode: 500 });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function normalizeAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  return new InternalError(undefined, { cause: error });
}

export function serializeErrorCauseForLog(cause: unknown, depth = 0): SerializedCause {
  if (depth > 2) {
    return { name: "Error", message: "Nested cause depth exceeded." };
  }
  if (cause instanceof AppError) {
    return {
      name: cause.name,
      kind: cause.kind,
      code: cause.code,
      message: cause.message,
      cause: cause.cause === undefined ? undefined : serializeErrorCauseForLog(cause.cause, depth + 1),
    };
  }
  if (cause instanceof Error) {
    const diagnosticError = cause as Error & { cause?: unknown; code?: unknown };
    const serialized: SerializedCause = {
      name: cause.name,
      message: cause.message,
    };
    if (typeof diagnosticError.code === "string" || typeof diagnosticError.code === "number") {
      serialized.code = String(diagnosticError.code);
    }
    if (diagnosticError.cause !== undefined) {
      serialized.cause = serializeErrorCauseForLog(diagnosticError.cause, depth + 1);
    }
    return serialized;
  }
  if (typeof cause === "string") return { name: "NonError", message: cause };
  if (cause === null) return { name: "Null", message: "null" };
  if (cause === undefined) return { name: "Undefined", message: "undefined" };
  return { name: typeof cause, message: String(cause) };
}

export { appErrorKinds };
export type { AppErrorClientJSON, AppErrorCode, AppErrorKind, AppLogLevel };
