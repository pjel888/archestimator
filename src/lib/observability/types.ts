export const appErrorKinds = [
  "auth",
  "validation",
  "not_found",
  "conflict",
  "database",
  "upstream",
  "rate_limit",
  "network",
  "internal",
] as const;

export type AppErrorKind = (typeof appErrorKinds)[number];

export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_PERMISSION_DENIED"
  | "AUTH_RATE_LIMITED"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DATABASE_ERROR"
  | "UPSTREAM_ERROR"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR";

export type AppLogLevel = "info" | "warn" | "error";

export type AppErrorClientJSON = {
  kind: AppErrorKind;
  code: AppErrorCode;
  message: string;
};

export type ActionSuccess<T> = {
  ok: true;
  data: T;
};

export type ActionFailure = {
  ok: false;
  error: AppErrorClientJSON;
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;
