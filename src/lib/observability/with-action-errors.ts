import { actionFailure, actionOk } from "./action-result";
import { normalizeAppError } from "./app-error";
import { logAppError, type AppLogger } from "./logger";
import type { ActionFailure, ActionResult } from "./types";

type WithActionErrorsOptions = {
  logger?: AppLogger;
  successMode?: "action-result" | "passthrough";
  failureMode?: "action-result" | "passthrough-message";
};

type PassthroughFailure = ActionFailure & {
  message: string;
};

function shouldRethrowFrameworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const digestValue = (error as unknown as { digest?: unknown }).digest;
  const digest = typeof digestValue === "string" ? digestValue : "";
  return error.message.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND";
}

export function withActionErrors<Args extends unknown[], T>(
  actionName: string,
  action: (...args: Args) => Promise<T>,
  options: WithActionErrorsOptions & { successMode: "passthrough"; failureMode: "passthrough-message" },
): (...args: Args) => Promise<T | PassthroughFailure>;

export function withActionErrors<Args extends unknown[], T>(
  actionName: string,
  action: (...args: Args) => Promise<T>,
  options?: WithActionErrorsOptions,
): (...args: Args) => Promise<ActionResult<T>>;

export function withActionErrors<Args extends unknown[], T>(
  actionName: string,
  action: (...args: Args) => Promise<T>,
  options: WithActionErrorsOptions = {},
) {
  return async (...args: Args) => {
    try {
      const result = await action(...args);
      if (options.successMode === "passthrough") return result;
      return actionOk(result);
    } catch (error) {
      if (shouldRethrowFrameworkError(error)) throw error;

      const appError = normalizeAppError(error);
      logAppError(error, {
        logger: options.logger,
        event: "action_error",
        action: actionName,
      });
      const failure = actionFailure(appError);
      if (options.failureMode === "passthrough-message") {
        return { ...failure, message: appError.message };
      }
      return failure;
    }
  };
}
