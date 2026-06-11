import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_REQUEST_PATH_HEADER } from "@/lib/auth/redirects";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getCurrentUserTermsAcceptanceStatus } from "@/lib/legal/terms-acceptance";
import {
  buildTermsAcceptanceRedirectPath,
  shouldBypassTermsAcceptanceGate,
  TERMS_GATE_FALLBACK_NEXT,
} from "@/lib/legal/terms-gate";
// Workshop-scoped vendor CSS: react-complex-tree styling is only consumed by
// workshop trees, so public/marketing routes must not pay for it.
import "react-complex-tree/lib/style-modern.css";

export default async function WorkshopLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const requestPath = headerList.get(AUTH_REQUEST_PATH_HEADER) ?? TERMS_GATE_FALLBACK_NEXT;

  if (shouldBypassTermsAcceptanceGate(requestPath)) {
    return children;
  }

  const currentUser = await getCurrentUserContext();
  if (!currentUser) redirect("/login");

  const acceptanceStatus = await getCurrentUserTermsAcceptanceStatus(currentUser.userId);
  if (acceptanceStatus.requiresAcceptance) {
    redirect(buildTermsAcceptanceRedirectPath(requestPath));
  }

  return children;
}
