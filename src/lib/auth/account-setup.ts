import "server-only";

import { DEFAULT_AUTH_DESTINATION } from "@/lib/auth/redirects";

const PENDING_INVITE_AUTH_DESTINATION = "/workshop/pending-invite";

export function resolvePostAuthDestination(requestedNext: string) {
  if (requestedNext === PENDING_INVITE_AUTH_DESTINATION) {
    return PENDING_INVITE_AUTH_DESTINATION;
  }

  return DEFAULT_AUTH_DESTINATION;
}
