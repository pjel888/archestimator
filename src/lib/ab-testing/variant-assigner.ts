import { cookies, headers } from "next/headers";
import { isBot } from "./bot-patterns";
import type { Variant } from "./types";

const COOKIE_NAME = "ab_test";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Helper — JSON.parse with try/catch, returns {} on failure */
function safeParseJson(value: string): Record<string, string> {
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Read the current variant from cookie only after analytics consent.
 * If no cookie exists and consent exists, randomly assign A or B (50/50) and set cookie.
 * If consent is missing or user is a bot, return control A and do not set a cookie.
 * Called from server component — never causes hydration mismatch.
 */
export async function getVariant(
  experimentId: string,
  options: { analyticsConsent: boolean }
): Promise<Variant> {
  // Bots always see variant A and never get cookies
  const headersList = await headers();
  const ua = headersList.get("user-agent");
  if (isBot(ua)) {
    return "A";
  }

  if (!options.analyticsConsent) {
    return "A";
  }

  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME);

  if (existing) {
    try {
      const parsed = safeParseJson(existing.value);
      if (parsed[experimentId] === "A" || parsed[experimentId] === "B") {
        return parsed[experimentId] as Variant;
      }
    } catch {
      // corrupted cookie — reassign
    }
  }

  // Assign new variant
  const variant: Variant = Math.random() < 0.5 ? "A" : "B";
  const allAssignments = existing ? safeParseJson(existing.value) : {};
  allAssignments[experimentId] = variant;

  try {
    cookieStore.set(COOKIE_NAME, JSON.stringify(allAssignments), {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false, // client needs to read it for GA4/Clarity
    });
  } catch {
    // cookies() set can fail if headers are already sent in some contexts, fallback gracefully
  }

  return variant;
}
