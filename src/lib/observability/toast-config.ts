import type { AppErrorClientJSON, AppErrorCode, AppErrorKind } from "./types";

export type AppErrorToastTone = "neutral" | "info" | "warning" | "error";

export type AppErrorToastConfig = {
  durationMs: number | null;
  tone: AppErrorToastTone;
};

const CODE_TOAST_CONFIG: Partial<Record<AppErrorCode, AppErrorToastConfig>> = {
  AUTH_REQUIRED: { tone: "info", durationMs: 5200 },
  AUTH_SESSION_EXPIRED: { tone: "info", durationMs: 5200 },
  AUTH_PERMISSION_DENIED: { tone: "warning", durationMs: 6400 },
  AUTH_RATE_LIMITED: { tone: "warning", durationMs: 6400 },
  VALIDATION_FAILED: { tone: "warning", durationMs: 5200 },
  NOT_FOUND: { tone: "info", durationMs: 5200 },
  CONFLICT: { tone: "warning", durationMs: 6400 },
  DATABASE_ERROR: { tone: "error", durationMs: 7200 },
  UPSTREAM_ERROR: { tone: "error", durationMs: 7200 },
  RATE_LIMITED: { tone: "warning", durationMs: 6400 },
  NETWORK_ERROR: { tone: "warning", durationMs: 6400 },
  INTERNAL_ERROR: { tone: "error", durationMs: 7200 },
};

const KIND_TOAST_CONFIG: Record<AppErrorKind, AppErrorToastConfig> = {
  auth: { tone: "info", durationMs: 5200 },
  validation: { tone: "warning", durationMs: 5200 },
  not_found: { tone: "info", durationMs: 5200 },
  conflict: { tone: "warning", durationMs: 6400 },
  database: { tone: "error", durationMs: 7200 },
  upstream: { tone: "error", durationMs: 7200 },
  rate_limit: { tone: "warning", durationMs: 6400 },
  network: { tone: "warning", durationMs: 6400 },
  internal: { tone: "error", durationMs: 7200 },
};

export function readAppErrorToastConfig(error: AppErrorClientJSON): AppErrorToastConfig {
  return CODE_TOAST_CONFIG[error.code] ?? KIND_TOAST_CONFIG[error.kind];
}
