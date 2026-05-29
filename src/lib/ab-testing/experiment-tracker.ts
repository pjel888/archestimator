declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

/**
 * Reads a variant for a specific experiment from the client-side cookies.
 */
export function getVariantFromCookie(experimentId: string): string {
  if (typeof document === "undefined") return "A";
  const cookiesList = document.cookie.split(";").map((c) => c.trim());
  const prefix = "ab_test=";
  const cookie = cookiesList.find((c) => c.startsWith(prefix));
  if (!cookie) return "A";
  try {
    const val = decodeURIComponent(cookie.slice(prefix.length));
    const parsed = JSON.parse(val);
    return parsed[experimentId] || "A";
  } catch {
    return "A";
  }
}

/**
 * Tracks when a user views an experiment variant.
 */
export function trackExperimentView(experimentId: string) {
  const variant = getVariantFromCookie(experimentId);

  // GA4: custom event with experiment/variant dimensions
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "experiment_view", {
      experiment_id: experimentId,
      variant,
    });
  }

  // Clarity: custom tags + event for session replay filtering
  if (typeof window !== "undefined" && window.clarity) {
    window.clarity("set", "experiment_id", experimentId);
    window.clarity("set", "variant", variant);
    window.clarity("event", "experiment_view");
  }
}

/**
 * Tracks when a user performs a conversion action (e.g. CTA click, signup completion).
 */
export function trackConversion(
  experimentId: string,
  eventName: string,
  metadata?: Record<string, string | number | boolean>
) {
  const variant = getVariantFromCookie(experimentId);

  // GA4 conversion event
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, {
      experiment_id: experimentId,
      variant,
      ...metadata,
    });
  }

  // Clarity custom event
  if (typeof window !== "undefined" && window.clarity) {
    window.clarity("set", "experiment_id", experimentId);
    window.clarity("set", "variant", variant);
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        window.clarity?.("set", key, String(value));
      });
    }
    window.clarity("event", eventName);
  }
}
