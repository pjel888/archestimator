export const LANDING_CONSENT_COOKIE_NAME = "archestimator_cookie_consent";
export const LANDING_CONSENT_VERSION = 1;
export const LANDING_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
export const LANDING_CONSENT_OPEN_SETTINGS_EVENT = "archestimator:landing-consent-open-settings";

/**
 * Asks the floating consent banner to open its settings panel. Used by the
 * footer "Cookie settings" link; a no-op on the server.
 */
export function requestLandingCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LANDING_CONSENT_OPEN_SETTINGS_EVENT));
}

export interface LandingConsentState {
  version: typeof LANDING_CONSENT_VERSION;
  analytics: boolean;
  updatedAt: string;
}

export function createLandingConsentState(analytics: boolean, updatedAt = new Date().toISOString()): LandingConsentState {
  return {
    version: LANDING_CONSENT_VERSION,
    analytics,
    updatedAt,
  };
}

export function serializeLandingConsentState(consent: LandingConsentState) {
  return encodeURIComponent(JSON.stringify(consent));
}

export function parseLandingConsentValue(value: string | null | undefined): LandingConsentState | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<LandingConsentState>;

    if (
      parsed.version !== LANDING_CONSENT_VERSION ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return {
      version: LANDING_CONSENT_VERSION,
      analytics: parsed.analytics,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function getCookieValue(cookieHeader: string, name: string) {
  const prefix = `${name}=`;
  return (
    cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

export function getLandingConsentFromCookieHeader(cookieHeader: string) {
  return parseLandingConsentValue(getCookieValue(cookieHeader, LANDING_CONSENT_COOKIE_NAME));
}

export function hasLandingAnalyticsConsent(cookieHeader: string) {
  return getLandingConsentFromCookieHeader(cookieHeader)?.analytics === true;
}
