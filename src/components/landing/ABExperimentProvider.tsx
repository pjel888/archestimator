"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLandingCookieConsent } from "@/lib/landing/useLandingCookieConsent";
import { trackExperimentView } from "@/lib/ab-testing/experiment-tracker";

interface ABExperimentProviderProps {
  experimentId: string;
  variant: string;
  children: ReactNode;
}

export function ABExperimentProvider({
  experimentId,
  variant,
  children,
}: ABExperimentProviderProps) {
  const { consent } = useLandingCookieConsent();
  const tracked = useRef(false);

  useEffect(() => {
    if (consent.analytics && !tracked.current) {
      trackExperimentView(experimentId);
      tracked.current = true;
    }
  }, [consent.analytics, experimentId, variant]); // keep variant in deps in case it changes, but call trackExperimentView(experimentId)

  return <>{children}</>;
}
