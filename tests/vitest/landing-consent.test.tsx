import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";

import { CookieConsentBanner } from "@/components/landing/CookieConsentBanner";
import {
  createLandingConsentState,
  getCookieValue,
  getLandingConsentFromCookieHeader,
  hasLandingAnalyticsConsent,
  LANDING_CONSENT_COOKIE_NAME,
  parseLandingConsentValue,
  serializeLandingConsentState,
} from "@/lib/landing/consent";

function clearCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0`;
}

describe("landing cookie consent", () => {
  beforeEach(() => {
    clearCookie(LANDING_CONSENT_COOKIE_NAME);
    clearCookie("ab_test");
  });

  it("parses only the current consent cookie shape", () => {
    const consent = createLandingConsentState(true, "2026-05-27T00:00:00.000Z");
    const serialized = serializeLandingConsentState(consent);

    expect(parseLandingConsentValue(serialized)).toEqual(consent);
    expect(getLandingConsentFromCookieHeader(`${LANDING_CONSENT_COOKIE_NAME}=${serialized}`)).toEqual(consent);
    expect(hasLandingAnalyticsConsent(`${LANDING_CONSENT_COOKIE_NAME}=${serialized}`)).toBe(true);
    expect(parseLandingConsentValue(encodeURIComponent(JSON.stringify({ version: 0, analytics: true })))).toBeNull();
    expect(parseLandingConsentValue("%7Bbroken")).toBeNull();
  });

  it("stores an essential-only consent cookie without analytics or experiment cookies", async () => {
    const user = userEvent.setup();

    render(<CookieConsentBanner />);

    await user.click(await screen.findByRole("button", { name: "Essential only" }));

    await waitFor(() => {
      expect(screen.queryByRole("region", { name: "Cookie choices" })).not.toBeInTheDocument();
    });

    const consentValue = getCookieValue(document.cookie, LANDING_CONSENT_COOKIE_NAME);
    expect(consentValue).not.toBeNull();
    expect(parseLandingConsentValue(consentValue)?.analytics).toBe(false);
    expect(document.cookie).not.toContain("ab_test=");
  });

  it("records analytics opt-in only after explicit acceptance", async () => {
    const user = userEvent.setup();

    render(<CookieConsentBanner />);

    expect(document.cookie).not.toContain("ab_test=");

    await user.click(await screen.findByRole("button", { name: "Accept analytics" }));

    const consentValue = getCookieValue(document.cookie, LANDING_CONSENT_COOKIE_NAME);
    expect(parseLandingConsentValue(consentValue)?.analytics).toBe(true);
    expect(document.cookie).not.toContain("ab_test=");
    expect(screen.getByRole("button", { name: "Open cookie choices" })).toBeInTheDocument();
  });

  it("lets users reopen choices after a prior decision", async () => {
    const user = userEvent.setup();
    document.cookie = `${LANDING_CONSENT_COOKIE_NAME}=${serializeLandingConsentState(createLandingConsentState(false))}; Path=/`;

    render(<CookieConsentBanner />);

    await user.click(await screen.findByRole("button", { name: "Open cookie choices" }));

    expect(screen.getByRole("region", { name: "Cookie choices" })).toBeInTheDocument();
  });
});
