import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

const TEST_PROJECT_ID = process.env.ESTIMATE_SHEET_E2E_PROJECT_ID ?? "22222222-2222-4222-8222-222222222222";
const TEST_NODE_ID =
  process.env.ESTIMATE_SHEET_E2E_NODE_ID ??
  process.env.ESTIMATE_SHEET_E2E_ESTIMATE_ID ??
  "bf254cbd-13d4-4dbf-b21a-84b171cdd6db";
const ESTIMATES_LIST_URL = `/workshop/projects/${TEST_PROJECT_ID}/estimates`;
const ESTIMATE_URL = `/workshop/projects/${TEST_PROJECT_ID}/estimates/${TEST_NODE_ID}`;
const AUTH_COOKIE_CHUNK_SIZE = 3_180;
const ownerAuthEmail = process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL?.trim().toLowerCase();
const hasStaticAuth = Boolean(process.env.PLAYWRIGHT_STORAGE_STATE) || process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";
const hasSupabaseSessionAuth = Boolean(
  ownerAuthEmail &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const hasAuth = hasStaticAuth || hasSupabaseSessionAuth;

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin test client is not configured.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase anon test client is not configured.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function readAuthCookieName() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
  const host = new URL(url).hostname;
  const projectRef = host.split(".")[0];
  if (!projectRef) throw new Error("Could not derive Supabase project ref for auth cookies.");
  return `sb-${projectRef}-auth-token`;
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getCookieUrls(baseURL: string) {
  const urls = [baseURL];
  const parsed = new URL(baseURL);
  if (parsed.hostname === "127.0.0.1") {
    urls.push(`${parsed.protocol}//localhost${parsed.port ? `:${parsed.port}` : ""}`);
  }
  if (parsed.hostname === "localhost") {
    urls.push(`${parsed.protocol}//127.0.0.1${parsed.port ? `:${parsed.port}` : ""}`);
  }
  return Array.from(new Set(urls));
}

function createAuthCookies(session: Session, baseURL: string) {
  const encoded = `base64-${base64Url(JSON.stringify(session))}`;
  const cookieName = readAuthCookieName();
  const chunks =
    encoded.length <= AUTH_COOKIE_CHUNK_SIZE
      ? [{ name: cookieName, value: encoded }]
      : Array.from({ length: Math.ceil(encoded.length / AUTH_COOKIE_CHUNK_SIZE) }, (_, index) => ({
          name: `${cookieName}.${index}`,
          value: encoded.slice(index * AUTH_COOKIE_CHUNK_SIZE, (index + 1) * AUTH_COOKIE_CHUNK_SIZE),
        }));

  return getCookieUrls(baseURL).flatMap((url) =>
    chunks.map((cookie) => ({
      ...cookie,
      url,
      httpOnly: false,
      sameSite: "Lax" as const,
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    })),
  );
}

async function createOwnerSession(): Promise<Session> {
  if (!ownerAuthEmail) throw new Error("ARCHESTIMATOR_DEV_AUTH_EMAIL is required.");
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "magiclink",
    email: ownerAuthEmail,
  });
  if (error) throw error;

  const properties = data.properties ?? {};
  const emailToken = properties.email_otp;
  const hashedToken = properties.hashed_token;
  const anonClient = createAnonClient();
  const { data: verified, error: verifyError } = emailToken
    ? await anonClient.auth.verifyOtp({
        email: ownerAuthEmail,
        token: emailToken,
        type: "email",
      })
    : hashedToken
      ? await anonClient.auth.verifyOtp({
          token_hash: hashedToken,
          type: "magiclink",
        })
      : (() => {
          throw new Error("Supabase did not return a magic-link token for the owner session.");
        })();
  if (verifyError) throw verifyError;
  if (!verified.session) throw new Error("Supabase did not return an owner E2E session.");
  return verified.session;
}

function readBaseURL(testInfo: TestInfo) {
  const configuredBaseURL = testInfo.project.use.baseURL;
  if (typeof configuredBaseURL === "string") return configuredBaseURL;
  const port = process.env.PLAYWRIGHT_PORT ?? "3020";
  return `http://127.0.0.1:${port}`;
}

async function installLoadingProofObserver(page: Page) {
  await page.evaluate(() => {
    const proof = { sawSheetSkeleton: false, sawListSkeleton: false };
    window.__estimateSheetLoadingProof = proof;

    const mark = () => {
      if (document.querySelector("[data-testid='estimate-sheet-route-skeleton']")) {
        proof.sawSheetSkeleton = true;
      }
      if (document.querySelector("[data-testid='project-estimates-list-skeleton']")) {
        proof.sawListSkeleton = true;
      }
    };

    mark();
    const observer = new MutationObserver(mark);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const intervalId = window.setInterval(mark, 10);
    window.addEventListener(
      "beforeunload",
      () => {
        observer.disconnect();
        window.clearInterval(intervalId);
      },
      { once: true },
    );
  });
}

function isRouteDataRequest(url: string) {
  return url.includes("_rsc=") || url.includes("__nextDataReq");
}

declare global {
  interface Window {
    __estimateSheetLoadingProof?: {
      sawSheetSkeleton: boolean;
      sawListSkeleton: boolean;
    };
  }
}

test.describe("estimate sheet loading performance", () => {
  test.skip(!hasAuth, "Requires storage state, dev-auth bypass, or Supabase owner-session env.");

  test("uses the sheet route fallback instead of the parent estimates-list fallback", async ({ page }, testInfo) => {
    let usedGeneratedSession = false;
    if (!hasStaticAuth) {
      const session = await createOwnerSession();
      await page.context().addCookies(createAuthCookies(session, readBaseURL(testInfo)));
      usedGeneratedSession = true;
    }

    await page.goto(ESTIMATES_LIST_URL, { waitUntil: "domcontentloaded" });
    if (/\/login/.test(page.url())) {
      if (usedGeneratedSession) {
        throw new Error("Generated Supabase owner session redirected to /login.");
      }
      test.skip(true, "Storage state or dev-auth bypass is not authenticated for the workshop.");
      return;
    }

    await expect(page.locator("[data-workshop-page-shell-root]")).toBeVisible({ timeout: 8000 });
    const sheetLink = page.locator(`a[href="${ESTIMATE_URL}"], a[href$="${ESTIMATE_URL}"]`).first();
    await expect(sheetLink).toBeVisible({ timeout: 15_000 });

    let delayedSheetDataRequest = false;
    await page.route(`**${ESTIMATE_URL}**`, async (route) => {
      const requestUrl = route.request().url();
      if (!delayedSheetDataRequest && isRouteDataRequest(requestUrl)) {
        delayedSheetDataRequest = true;
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
      await route.continue();
    });

    await installLoadingProofObserver(page);
    await sheetLink.click();

    await expect(page.getByTestId("estimate-sheet-route-skeleton")).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("[data-estimate-center-column='sheet']").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("project-estimates-list-skeleton")).toHaveCount(0);

    const proof = await page.evaluate(() => window.__estimateSheetLoadingProof);
    expect(proof?.sawSheetSkeleton).toBe(true);
    expect(proof?.sawListSkeleton).toBe(false);
    expect(delayedSheetDataRequest).toBe(true);
  });
});
