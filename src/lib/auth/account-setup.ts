import "server-only";

import { sanitizeProtectedReturnPath } from "@/lib/auth/redirects";

export function resolvePostAuthDestination(requestedNext: string) {
  return sanitizeProtectedReturnPath(requestedNext);
}
