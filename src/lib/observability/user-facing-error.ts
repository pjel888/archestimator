import { isAppError, InternalError } from "./app-error";
import {
  isUnsafeInfrastructureErrorMessage,
  USER_FACING_INTERNAL_ERROR_MESSAGE,
} from "./infra-error-message";
import { logAppError } from "./logger";

export {
  isUnsafeInfrastructureErrorMessage,
  USER_FACING_INTERNAL_ERROR_MESSAGE,
} from "./infra-error-message";

export function toUserFacingErrorMessage(
  error: unknown,
  fallback: string = USER_FACING_INTERNAL_ERROR_MESSAGE,
): string {
  if (isAppError(error)) {
    return error.toClientJSON().message;
  }
  if (error instanceof Error) {
    const message = error.message.trim();
    if (!message) return fallback;
    if (isUnsafeInfrastructureErrorMessage(message)) return fallback;
    return message;
  }
  return fallback;
}

type ThrowUserFacingErrorOptions = {
  action?: string;
  event?: string;
};

/**
 * Log the real cause server-side, then throw only a user-safe message.
 * Preferred boundary helper for `"use server"` catch blocks.
 */
export function throwUserFacingError(
  userMessage: string,
  cause?: unknown,
  options: ThrowUserFacingErrorOptions = {},
): never {
  const safeMessage =
    userMessage.trim() && !isUnsafeInfrastructureErrorMessage(userMessage)
      ? userMessage.trim()
      : USER_FACING_INTERNAL_ERROR_MESSAGE;

  logAppError(cause ?? new Error(safeMessage), {
    event: options.event ?? "user_facing_action_error",
    action: options.action ?? "throw_user_facing_error",
    context: {
      user_message: safeMessage,
    },
  });
  throw new Error(safeMessage);
}

/**
 * Remap an unknown thrown value into a client-safe Error while preserving the
 * original as `cause` for logging callers that still need the raw failure.
 */
export function remapErrorForClientBoundary(error: unknown): Error {
  if (isAppError(error)) {
    const client = error.toClientJSON();
    const remapped = new Error(client.message);
    remapped.name = "UserFacingError";
    (remapped as Error & { cause?: unknown }).cause = error;
    return remapped;
  }
  if (error instanceof Error) {
    if (!isUnsafeInfrastructureErrorMessage(error.message)) return error;
    return new InternalError(undefined, { cause: error });
  }
  return new InternalError(undefined, { cause: error });
}
