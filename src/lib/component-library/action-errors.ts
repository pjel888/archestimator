import { logAppError } from "@/lib/observability/logger";

// Library Optimization Plan P3 T20 (F25): server actions previously interpolated raw
// database `error.message` into thrown errors, which can surface DB internals
// to the client. This helper logs the real cause server-side and throws a generic,
// user-safe message instead. Returns `never` so call sites read `throwActionError(...)`
// (not `throw throwActionError(...)`).
export function throwActionError(userMessage: string, cause?: unknown): never {
  // Server-side only; keeps the detail for debugging without exposing it to clients.
  logAppError(cause ?? new Error(userMessage), {
    event: "component_library_action_error",
    action: "throw_action_error",
    context: {
      user_message: userMessage,
    },
  });
  throw new Error(userMessage);
}
