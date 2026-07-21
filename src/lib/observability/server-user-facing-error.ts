import "server-only";

import { isUnsafeInfrastructureErrorMessage, USER_FACING_INTERNAL_ERROR_MESSAGE } from "./infra-error-message";
import { logAppError } from "./logger";

type ThrowUserFacingErrorOptions = {
  action?: string;
  event?: string;
};

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
