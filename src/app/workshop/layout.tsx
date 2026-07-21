import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DevRemoteBindingsBanner } from "@/components/workshop/DevRemoteBindingsBanner";
import { WorkshopShell } from "@/components/workshop/WorkshopShell";
import { AUTH_REQUEST_PATH_HEADER } from "@/lib/auth/redirects";
import { isProtectedRouteGateSatisfied } from "@/lib/auth/protected-route-gate";
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

function withWorkshopChrome(children: ReactNode) {
  return (
    <>
      <DevRemoteBindingsBanner />
      <WorkshopShell>{children}</WorkshopShell>
    </>
  );
}

/**
 * Auth/terms gate is the sole production verifier for /workshop/* (see
 * `.ai/03_plans/2026-07-09/Workshop-Pages/08_SECURITY_PRIVACY_THREAT_MODEL.md`
 * SEC-T1/T2). These uncached `headers()` / session / terms reads MUST stay
 * synchronous-first — never Suspense-wrap or defer them before rendering
 * WorkshopShell or page content. Blocking here is intentional security, not a
 * performance bug.
 */
export default async function WorkshopLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const requestPath = headerList.get(AUTH_REQUEST_PATH_HEADER) ?? TERMS_GATE_FALLBACK_NEXT;
  const termsGateBypassed = shouldBypassTermsAcceptanceGate(requestPath);

  if (isProtectedRouteGateSatisfied(headerList, { termsRequired: !termsGateBypassed })) {
    return withWorkshopChrome(children);
  }

  // Terms acceptance route: authenticated but must not mount workshop chrome.
  if (termsGateBypassed) {
    return children;
  }

  const currentUser = await getCurrentUserContext();
  if (!currentUser) redirect("/login");

  const acceptanceStatus = await getCurrentUserTermsAcceptanceStatus(currentUser.userId);
  if (acceptanceStatus.requiresAcceptance) {
    redirect(buildTermsAcceptanceRedirectPath(requestPath));
  }

  return withWorkshopChrome(children);
}
