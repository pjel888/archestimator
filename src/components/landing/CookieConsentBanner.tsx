"use client";

import { useState, useSyncExternalStore } from "react";

import {
  createLandingConsentState,
  getLandingConsentFromCookieHeader,
  LANDING_CONSENT_COOKIE_NAME,
  LANDING_CONSENT_MAX_AGE_SECONDS,
  type LandingConsentState,
  serializeLandingConsentState,
} from "@/lib/landing/consent";

const consentChangeEvent = "archestimator:landing-consent-change";
let lastCookieHeader: string | null = null;
let lastConsentSnapshot: LandingConsentState | null = null;

function readStoredConsent() {
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

function writeStoredConsent(consent: LandingConsentState) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANDING_CONSENT_COOKIE_NAME}=${serializeLandingConsentState(consent)}; Path=/; Max-Age=${LANDING_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(consentChangeEvent, { detail: consent }));
}

export function CookieConsentBanner() {
  const [isEditing, setIsEditing] = useState(false);
  const consent = useSyncExternalStore(
    subscribeToConsentChanges,
    readStoredConsent,
    () => undefined,
  );

  function saveConsent(analytics: boolean) {
    const nextConsent = createLandingConsentState(analytics);
    writeStoredConsent(nextConsent);
    setIsEditing(false);
  }

  if (consent === undefined) return null;

  if (consent && !isEditing) {
    return (
      <button
        type="button"
        aria-label="Open cookie choices"
        className="fixed bottom-3 left-3 z-[60] rounded-[5px] border border-[#d8d6cf] bg-[#eeeeec]/95 px-3 py-2 text-[11px] font-semibold text-[#34342f] shadow-sm backdrop-blur-md transition hover:border-[#b9b5aa] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
        onClick={() => setIsEditing(true)}
      >
        Cookie settings
      </button>
    );
  }

  return (
    <section
      role="region"
      aria-label="Cookie choices"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[760px] rounded-[6px] border border-[#d8d6cf] bg-[#eeeeec]/96 p-4 text-[#111111] shadow-[0_18px_45px_rgba(17,17,17,0.18)] backdrop-blur-xl sm:inset-x-6 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[500px]">
          <p className="text-[13px] font-semibold">Cookie choices</p>
          <p className="mt-1 text-[12px] leading-5 text-[#55534d]">
            Essential cookies keep the workspace and preferences working. Analytics and experiment cookies stay off unless you accept them.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="min-h-9 rounded-[5px] border border-[#c9c6bd] px-3 text-[11px] font-semibold text-[#34342f] transition hover:border-[#aaa59a] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
            onClick={() => saveConsent(false)}
          >
            Essential only
          </button>
          <button
            type="button"
            className="min-h-9 rounded-[5px] bg-[#17181c] px-3 text-[11px] font-semibold text-white transition hover:bg-[#2a2b30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
            onClick={() => saveConsent(true)}
          >
            Accept analytics
          </button>
        </div>
      </div>
    </section>
  );
}
