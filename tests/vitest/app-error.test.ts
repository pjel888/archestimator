import { describe, expect, it } from "vitest";

import {
  AppError,
  AuthPermissionDeniedError,
  AuthRateLimitedError,
  AuthRequiredError,
  AuthSessionExpiredError,
  ConflictError,
  DatabaseError,
  InternalError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  UpstreamError,
  ValidationError,
  appErrorKinds,
  serializeErrorCauseForLog,
} from "@/lib/observability/app-error";

describe("AppError", () => {
  it("serializes only the public error contract for clients", () => {
    const error = new DatabaseError("Could not load project data.", {
      cause: new Error("duplicate key value violates unique constraint users_email_key"),
    });

    expect(error.toClientJSON()).toEqual({
      kind: "database",
      code: "DATABASE_ERROR",
      message: "Could not load project data.",
    });
    expect(JSON.stringify(error.toClientJSON())).not.toMatch(/duplicate key|constraint|stack|cause/i);
  });

  it("keeps cause details available only for server log serialization", () => {
    const error = new InternalError("Something went wrong.", {
      cause: new TypeError("Cannot read properties of undefined"),
    });

    expect(error.toClientJSON()).not.toHaveProperty("cause");
    expect(serializeErrorCauseForLog(error.cause)).toEqual({
      name: "TypeError",
      message: "Cannot read properties of undefined",
    });
  });

  it("exposes the approved public kinds and concrete classes", () => {
    expect(appErrorKinds).toEqual([
      "auth",
      "validation",
      "not_found",
      "conflict",
      "database",
      "upstream",
      "rate_limit",
      "network",
      "internal",
    ]);

    const errors: AppError[] = [
      new AuthRequiredError(),
      new AuthSessionExpiredError(),
      new AuthPermissionDeniedError(),
      new AuthRateLimitedError(),
      new ValidationError("Check the highlighted fields."),
      new NotFoundError("That record was not found."),
      new ConflictError("That record changed. Refresh and try again."),
      new DatabaseError("Could not save changes."),
      new UpstreamError("The provider is unavailable."),
      new RateLimitError("Too many attempts."),
      new NetworkError("Network unavailable."),
      new InternalError("Something went wrong."),
    ];

    expect(errors.map((error) => error.toClientJSON().code)).toEqual([
      "AUTH_REQUIRED",
      "AUTH_SESSION_EXPIRED",
      "AUTH_PERMISSION_DENIED",
      "AUTH_RATE_LIMITED",
      "VALIDATION_FAILED",
      "NOT_FOUND",
      "CONFLICT",
      "DATABASE_ERROR",
      "UPSTREAM_ERROR",
      "RATE_LIMITED",
      "NETWORK_ERROR",
      "INTERNAL_ERROR",
    ]);
    expect(errors.map((error) => error.toLogLevel())).toEqual([
      "info",
      "info",
      "warn",
      "warn",
      "info",
      "info",
      "warn",
      "error",
      "error",
      "warn",
      "warn",
      "error",
    ]);
  });
});
