import type { RefCallback } from "react";

export const ONBOARDING_PORTAL_ID = "archestimator-onboarding-portal";

export function OnboardingPortal({
  portalRef,
}: {
  portalRef: RefCallback<HTMLDivElement>;
}) {
  return (
    <div
      ref={portalRef}
      id={ONBOARDING_PORTAL_ID}
      className="pointer-events-none fixed inset-0 z-[900]"
      aria-live="off"
    />
  );
}
