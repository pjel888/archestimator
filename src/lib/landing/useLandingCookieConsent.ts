"use client";

import { useSyncExternalStore } from "react";
import {
  getLandingConsentFromCookieHeader,
  type LandingConsentState,
} from "./consent";

const consentChangeEvent = "archestimator:landing-consent-change";
let lastCookieHeader: string | null = null;
let lastConsentSnapshot: LandingConsentState | null = null;

function readStoredConsent(): LandingConsentState | null {
  if (typeof document === "undefined") return null;

  if (document.cookie === lastCookieHeader) {
    return lastConsentSnapshot;
  }

  lastCookieHeader = document.cookie;
  lastConsentSnapshot = getLandingConsentFromCookieHeader(document.cookie);
  return lastConsentSnapshot;
}

function subscribeToConsentChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(consentChangeEvent, onStoreChange);
  return () => window.removeEventListener(consentChangeEvent, onStoreChange);
}

export function useLandingCookieConsent() {
  const consent = useSyncExternalStore(
    subscribeToConsentChanges,
    readStoredConsent,
    () => null
  );

  return {
    consent: consent ?? { version: 1, analytics: false, updatedAt: "" },
    isInitialized: consent !== null,
  };
}
