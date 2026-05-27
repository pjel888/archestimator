import "server-only";

import { DEFAULT_AUTH_DESTINATION } from "@/lib/auth/redirects";

export function resolvePostAuthDestination(requestedNext: string) {
  void requestedNext;
  return DEFAULT_AUTH_DESTINATION;
}
