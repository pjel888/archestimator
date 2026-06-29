import type { ActionFailure, ActionResult, ActionSuccess } from "./types";
import type { AppError } from "./app-error";

export function actionOk<T>(data: T): ActionSuccess<T> {
  return { ok: true, data };
}

export function actionFailure(error: AppError): ActionFailure {
  return { ok: false, error: error.toClientJSON() };
}

export function isActionFailure(result: unknown): result is ActionFailure {
  return (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    result.ok === false &&
    "error" in result &&
    typeof result.error === "object" &&
    result.error !== null
  );
}

export type { ActionFailure, ActionResult, ActionSuccess };
