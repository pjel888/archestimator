import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getVariant } from "@/lib/ab-testing/variant-assigner";
import { isBot } from "@/lib/ab-testing/bot-patterns";
import { calculateResults } from "@/lib/ab-testing/results-calculator";
import { getVariantFromCookie } from "@/lib/ab-testing/experiment-tracker";
import { ABExperimentProvider } from "@/components/landing/ABExperimentProvider";
import { useLandingCookieConsent } from "@/lib/landing/useLandingCookieConsent";

// Mock next/headers
const mockCookiesSet = vi.fn();
const mockCookiesGet = vi.fn();
const mockUserAgent = vi.fn(() => "Mozilla/5.0");

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookiesGet,
    set: mockCookiesSet,
  })),
  headers: vi.fn(async () => ({
    get: mockUserAgent,
  })),
}));

// Mock useLandingCookieConsent
vi.mock("@/lib/landing/useLandingCookieConsent", () => ({
  useLandingCookieConsent: vi.fn(),
}));

function clearCookie(name: string) {
  if (typeof document !== "undefined") {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

describe("A/B Testing Infrastructure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookiesSet.mockReset();
    mockCookiesGet.mockReset();
    mockUserAgent.mockReturnValue("Mozilla/5.0");
    clearCookie("ab_test");
  });

  describe("bot-patterns", () => {
    it("matches standard bots and crawlers", () => {
      expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
      expect(isBot("Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)")).toBe(true);
      expect(isBot("SemrushBot")).toBe(true);
      expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12F70 Safari/600.1.4 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    });

    it("does not match normal browsers", () => {
      expect(isBot("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")).toBe(false);
      expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1")).toBe(false);
    });
  });

  describe("variant-assigner", () => {
    it("always defaults to Control variant A and sets no cookie when consent is false", async () => {
      const variant = await getVariant("hero-cta-copy", { analyticsConsent: false });
      expect(variant).toBe("A");
      expect(mockCookiesSet).not.toHaveBeenCalled();
    });

    it("always defaults to Control variant A and sets no cookie for bots, even with consent", async () => {
      mockUserAgent.mockReturnValue("Googlebot");
      const variant = await getVariant("hero-cta-copy", { analyticsConsent: true });
      expect(variant).toBe("A");
      expect(mockCookiesSet).not.toHaveBeenCalled();
    });

    it("returns existing variant from cookie if present", async () => {
      mockCookiesGet.mockReturnValue({ value: JSON.stringify({ "hero-cta-copy": "B" }) });
      const variant = await getVariant("hero-cta-copy", { analyticsConsent: true });
      expect(variant).toBe("B");
      expect(mockCookiesSet).not.toHaveBeenCalled();
    });

    it("generates a new variant (A or B) and saves it to cookie if no cookie exists", async () => {
      mockCookiesGet.mockReturnValue(undefined);
      const variant = await getVariant("hero-cta-copy", { analyticsConsent: true });
      expect(["A", "B"]).toContain(variant);
      expect(mockCookiesSet).toHaveBeenCalledWith(
        "ab_test",
        expect.stringContaining("hero-cta-copy"),
        expect.any(Object)
      );
    });
  });

  describe("results-calculator", () => {
    it("computes simple rates and relative uplift correctly", () => {
      const results = calculateResults(
        { views: 1000, conversions: 100 }, // rate: 10%
        { views: 1000, conversions: 120 }  // rate: 12%
      );
      expect(results.variantA.rate).toBe(0.1);
      expect(results.variantB.rate).toBe(0.12);
      expect(results.uplift).toBe(20); // 20% increase
    });

    it("correctly handles significant results", () => {
      // Large sample size with clear difference
      const results = calculateResults(
        { views: 10000, conversions: 1000 },
        { views: 10000, conversions: 1200 }
      );
      expect(results.significant).toBe(true);
      expect(results.recommendation).toBe("B");
      expect(results.pValue).toBeLessThan(0.05);
    });

    it("correctly identifies non-significant results", () => {
      // Small sample size or negligible difference
      const results = calculateResults(
        { views: 100, conversions: 10 },
        { views: 100, conversions: 11 }
      );
      expect(results.significant).toBe(false);
      expect(results.recommendation).toBe("inconclusive");
    });
  });

  describe("experiment-tracker client-side cookies utility", () => {
    it("reads variant assignments correctly from document.cookie", () => {
      if (typeof document !== "undefined") {
        document.cookie = `ab_test=${encodeURIComponent(JSON.stringify({ "hero-cta-copy": "B" }))}; Path=/`;
        expect(getVariantFromCookie("hero-cta-copy")).toBe("B");
        expect(getVariantFromCookie("non-existent-experiment")).toBe("A");
      }
    });
  });

  describe("ABExperimentProvider component", () => {
    it("fires trackExperimentView only when analytics consent is granted", () => {
      const mockTrack = vi.fn();
      vi.stubGlobal("gtag", mockTrack);
      vi.stubGlobal("clarity", mockTrack);

      // Set cookie value for client mock
      if (typeof document !== "undefined") {
        document.cookie = `ab_test=${encodeURIComponent(JSON.stringify({ "hero-cta-copy": "B" }))}; Path=/`;
      }

      // Consent is false
      vi.mocked(useLandingCookieConsent).mockReturnValue({
        consent: { version: 1, analytics: false, updatedAt: "" },
        isInitialized: true,
      });

      const { rerender } = render(
        <ABExperimentProvider experimentId="hero-cta-copy" variant="B">
          <div>Test Page</div>
        </ABExperimentProvider>
      );

      expect(mockTrack).not.toHaveBeenCalled();

      // Consent changes to true
      vi.mocked(useLandingCookieConsent).mockReturnValue({
        consent: { version: 1, analytics: true, updatedAt: "" },
        isInitialized: true,
      });

      rerender(
        <ABExperimentProvider experimentId="hero-cta-copy" variant="B">
          <div>Test Page</div>
        </ABExperimentProvider>
      );

      // Should track view
      expect(mockTrack).toHaveBeenCalled();
    });
  });
});
