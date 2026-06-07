import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LandingHeader } from "@/components/landing/LandingHeader";
import {
  CACHE_SAFETY_SCENARIOS,
  PUBLIC_MARKETING_ROUTES,
  buildPublicCacheSafetyReport,
  evaluatePublicCacheSafety,
  runPublicCacheSafetyProbe,
} from "../../scripts/check-public-cache-safety";

describe("public cache-safety proof harness", () => {
  it("covers every public marketing route named by the PR-0B implementation packet", () => {
    expect(PUBLIC_MARKETING_ROUTES).toEqual([
      "/",
      "/about",
      "/features",
      "/pricing",
      "/contact",
      "/privacy",
      "/terms",
    ]);
  });

  it("models anonymous, logged-in-assumption, consent, A/B, and mobile variants", () => {
    expect(CACHE_SAFETY_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "anonymous-desktop",
      "synthetic-logged-in-cookie",
      "consent-rejected",
      "consent-accepted-ab-a",
      "consent-accepted-ab-b",
      "anonymous-mobile",
    ]);

    expect(CACHE_SAFETY_SCENARIOS.find((scenario) => scenario.id === "consent-rejected")?.headers.cookie).toContain(
      "archestimator_cookie_consent=",
    );
    expect(CACHE_SAFETY_SCENARIOS.find((scenario) => scenario.id === "consent-accepted-ab-a")?.headers.cookie).toContain(
      "ab_test=",
    );
    expect(CACHE_SAFETY_SCENARIOS.find((scenario) => scenario.id === "consent-accepted-ab-b")?.headers.cookie).toContain(
      "hero-cta-copy",
    );
    expect(CACHE_SAFETY_SCENARIOS.find((scenario) => scenario.id === "anonymous-mobile")?.headers["user-agent"]).toContain(
      "Mobile",
    );
  });

  it("classifies Set-Cookie, private cache headers, Vary, x-vercel-cache, and body variance by route", async () => {
    const fakeFetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      const route = new URL(href).pathname;
      const cookie = String(init?.headers instanceof Headers ? init.headers.get("cookie") : (init?.headers as Record<string, string> | undefined)?.cookie ?? "");
      const variantB = cookie.includes("%22B%22");

      return new Response(`<html><body>${route}:${variantB ? "variant-b" : "variant-a"}</body></html>`, {
        headers: {
          "Cache-Control": "private, no-cache, max-age=0, must-revalidate",
          "Set-Cookie": variantB ? "ab_test=redacted; Path=/; SameSite=Lax" : "",
          Vary: "rsc, next-router-state-tree",
          "x-vercel-cache": "MISS",
        },
      });
    });

    const results = await runPublicCacheSafetyProbe({
      origin: "https://example.test",
      fetchImpl: fakeFetch,
      routes: ["/"],
      scenarios: CACHE_SAFETY_SCENARIOS,
    });
    const [summary] = evaluatePublicCacheSafety(results);

    expect(summary.route).toBe("/");
    expect(summary.compatibleWithSharedHtmlCache).toBe(false);
    expect(summary.cacheControl).toContain("private, no-cache");
    expect(summary.vary).toContain("rsc");
    expect(summary.xVercelCache).toBe("MISS");
    expect(summary.hasSetCookie).toBe(true);
    expect(summary.bodyVaries).toBe(true);
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Set-Cookie"),
        expect.stringContaining("private/no-store/no-cache"),
        expect.stringContaining("HTML body differs"),
      ]),
    );
  });

  it("renders different auth CTA markup when landing auth state is true", () => {
    const { rerender } = render(<LandingHeader isLoggedIn={false} />);

    expect(screen.getByRole("link", { name: "Request access" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.getByRole("link", { name: "Log In" })).toHaveAttribute("href", "/login?next=/workshop/projects");
    expect(screen.queryByRole("link", { name: "Open workspace" })).not.toBeInTheDocument();

    rerender(<LandingHeader isLoggedIn={true} />);

    expect(screen.getByRole("link", { name: "Open workspace" })).toHaveAttribute("href", "/workshop");
    expect(screen.queryByRole("link", { name: "Request access" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log In" })).not.toBeInTheDocument();
  });

  it("builds a conservative report with the required completion language", async () => {
    const fakeFetch = vi.fn(async (url: string | URL) => {
      const route = new URL(String(url)).pathname;
      return new Response(`<html><body>${route}</body></html>`, {
        headers: {
          "Cache-Control": "private, no-cache, max-age=0, must-revalidate",
          Vary: "rsc, next-router-state-tree",
          "x-vercel-cache": "MISS",
        },
      });
    });

    const probes = await runPublicCacheSafetyProbe({
      origin: "https://example.test",
      fetchImpl: fakeFetch,
      routes: ["/", "/about"],
      scenarios: CACHE_SAFETY_SCENARIOS.slice(0, 2),
    });

    const report = buildPublicCacheSafetyReport({
      generatedAt: "2026-06-06T00:00:00.000Z",
      origin: "https://example.test",
      summaries: evaluatePublicCacheSafety(probes),
    });

    expect(report).toContain("IMPLEMENTATION PACKET COMPLETE / OPTIMIZATION NOT YET SHIPPED");
    expect(report).toContain("| `/` | no |");
    expect(report).toContain("| `/about` | no |");
    expect(report).toContain("Logged-in proof note");
  });
});
