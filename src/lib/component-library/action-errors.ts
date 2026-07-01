// Library Optimization Plan P3 T20 (F25): server actions previously interpolated raw
// database `error.message` into thrown errors, which can surface DB internals
// to the client. This helper logs the real cause server-side and throws a generic,
// user-safe message instead. Returns `never` so call sites read `throwActionError(...)`
// (not `throw throwActionError(...)`).
export function throwActionError(userMessage: string, cause?: unknown): never {
  // Server-side only (these modules are "use server"); keeps the detail for debugging.
  console.error(`[library action] ${userMessage}`, cause);
  throw new Error(userMessage);
}
