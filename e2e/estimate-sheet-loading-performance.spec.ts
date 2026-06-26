import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

const TEST_PROJECT_ID = process.env.ESTIMATE_SHEET_E2E_PROJECT_ID ?? "0139e1e5-951d-4f2f-9081-6c953d288d8a";
const TEST_NODE_ID =
  process.env.ESTIMATE_SHEET_E2E_NODE_ID ??
  process.env.ESTIMATE_SHEET_E2E_ESTIMATE_ID ??
  "8080f04c-fe18-4314-a1d8-9222e62d1eed";
const INVALID_PROJECT_ID = "00000000-0000-4000-8000-000000000000";
const INVALID_NODE_ID = "11111111-1111-4111-8111-111111111111";
const ESTIMATES_LIST_URL = `/workshop/projects/${TEST_PROJECT_ID}/estimates`;
const ESTIMATE_URL = `/workshop/projects/${TEST_PROJECT_ID}/estimates/${TEST_NODE_ID}`;
const INVALID_PROJECT_URL = `/workshop/projects/${INVALID_PROJECT_ID}/estimates/${TEST_NODE_ID}`;
const INVALID_NODE_URL = `/workshop/projects/${TEST_PROJECT_ID}/estimates/${INVALID_NODE_ID}`;
const AUTH_COOKIE_CHUNK_SIZE = 3_180;
const ownerAuthEmail = process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL?.trim().toLowerCase();
const devAuthSecret = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET?.trim();
const hasStorageStateAuth = Boolean(process.env.PLAYWRIGHT_STORAGE_STATE);
const hasDevAuthBypass = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1" && Boolean(devAuthSecret);
const hasStaticAuth = hasStorageStateAuth || hasDevAuthBypass;
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

function createSupabaseAuthCookies(sessionPayload: unknown, baseURL: string) {
  const encoded = `base64-${base64Url(JSON.stringify(sessionPayload))}`;
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

function createAuthCookies(session: Session, baseURL: string) {
  return createSupabaseAuthCookies(session, baseURL);
}

function createInvalidAuthCookies(baseURL: string) {
  return createSupabaseAuthCookies(
    {
      access_token: "invalid-e2e-access-token",
      refresh_token: "invalid-e2e-refresh-token",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      token_type: "bearer",
      user: {
        id: "22222222-2222-4222-8222-222222222222",
        aud: "authenticated",
        role: "authenticated",
        email: "unauthorized-e2e@example.invalid",
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: {},
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    },
    baseURL,
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

function readAppURL(testInfo: TestInfo, path: string) {
  return new URL(path, readBaseURL(testInfo)).toString();
}

async function installDevAuthCookie(page: Page, testInfo: TestInfo) {
  if (!hasDevAuthBypass || !devAuthSecret) return;
  await page.context().addCookies(
    getCookieUrls(readBaseURL(testInfo)).map((url) => ({
      name: "archestimator-dev-auth-bypass",
      value: devAuthSecret,
      url,
      httpOnly: true,
      sameSite: "Lax" as const,
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    })),
  );
}

async function installAuthenticatedSession(page: Page, testInfo: TestInfo) {
  let usedGeneratedSession = false;
  if (hasDevAuthBypass) {
    await installDevAuthCookie(page, testInfo);
  } else if (!hasStorageStateAuth) {
    const session = await createOwnerSession();
    await page.context().addCookies(createAuthCookies(session, readBaseURL(testInfo)));
    usedGeneratedSession = true;
  }
  return { usedGeneratedSession };
}

async function continueIfAuthenticated(page: Page, usedGeneratedSession: boolean, authSurface: string) {
  if (!/\/login(?:[/?#]|$)/.test(page.url())) return true;
  if (usedGeneratedSession) {
    throw new Error(`Generated Supabase owner session redirected to /login during ${authSurface}.`);
  }
  test.skip(true, "Storage state or dev-auth bypass is not authenticated for the workshop.");
  return false;
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

async function expectNoEstimateSheetContent(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => undefined);
  await page.waitForTimeout(100);
  await expect(page.locator("[data-estimate-center-column='sheet']")).toHaveCount(0);
  await expect(page.locator("[data-workshop-layout='project-estimate-metadata-row']")).toHaveCount(0);
  await expect(page.getByTestId("estimate-sheet-route-skeleton")).toHaveCount(0);
  await expect(page.getByTestId("project-estimates-list-skeleton")).toHaveCount(0);
}

function expectNoProtectedEstimatePayload(body: string) {
  for (const marker of [
    "data-estimate-center-column",
    "data-workshop-layout",
    "project-estimate-metadata-row",
    "ProjectEstimateMetadataPublisher",
    "EstimateWorkspaceClient",
    "estimate-sheet-route-skeleton",
  ]) {
    expect(body).not.toContain(marker);
  }
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
  test("uses the sheet route fallback instead of the parent estimates-list fallback", async ({ page }, testInfo) => {
    test.skip(!hasAuth, "Requires storage state, dev-auth bypass, or Supabase owner-session env.");
    const { usedGeneratedSession } = await installAuthenticatedSession(page, testInfo);

    await page.goto(ESTIMATES_LIST_URL, { waitUntil: "domcontentloaded" });
    if (!(await continueIfAuthenticated(page, usedGeneratedSession, "estimate list setup"))) return;

    await expect(page.locator("[data-workshop-page-shell-root]").last()).toBeVisible({ timeout: 8000 });
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

  test("fails closed for unauthenticated direct target loads", async ({ browser }, testInfo) => {
    const baseURL = readBaseURL(testInfo);
    const context = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    try {
      await page.goto(ESTIMATE_URL, { waitUntil: "domcontentloaded" });
      await expectNoEstimateSheetContent(page);
      await expect(page).toHaveURL(/\/login(?:\?|$)/);
    } finally {
      await context.close();
    }
  });

  test("fails closed for invalid project and estimate routes", async ({ page }, testInfo) => {
    test.skip(!hasAuth, "Requires storage state, dev-auth bypass, or Supabase owner-session env.");
    const { usedGeneratedSession } = await installAuthenticatedSession(page, testInfo);

    await page.goto(INVALID_PROJECT_URL, { waitUntil: "domcontentloaded" });
    if (!(await continueIfAuthenticated(page, usedGeneratedSession, "invalid project route"))) return;
    await expectNoEstimateSheetContent(page);

    await page.goto(INVALID_NODE_URL, { waitUntil: "domcontentloaded" });
    if (!(await continueIfAuthenticated(page, usedGeneratedSession, "invalid estimate route"))) return;
    await expectNoEstimateSheetContent(page);
  });

  test("fails closed for invalid storage-state direct target loads", async ({ browser }, testInfo) => {
    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Requires NEXT_PUBLIC_SUPABASE_URL to derive auth cookie names.");

    const baseURL = readBaseURL(testInfo);
    const context = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    await context.addCookies(createInvalidAuthCookies(baseURL));
    const page = await context.newPage();
    try {
      await page.goto(ESTIMATE_URL, { waitUntil: "domcontentloaded" });
      await expectNoEstimateSheetContent(page);
      await expect(page).toHaveURL(/\/login(?:\?|$)/);
    } finally {
      await context.close();
    }
  });

  test("fails closed for invalid storage-state prefetch-style route data requests", async ({ browser }, testInfo) => {
    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Requires NEXT_PUBLIC_SUPABASE_URL to derive auth cookie names.");

    const baseURL = readBaseURL(testInfo);
    const context = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    await context.addCookies(createInvalidAuthCookies(baseURL));
    const page = await context.newPage();
    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async (targetURL) => {
        const response = await fetch(targetURL, {
          headers: {
            RSC: "1",
            "Next-Router-Prefetch": "1",
          },
          credentials: "include",
          redirect: "follow",
        });
        return {
          body: await response.text(),
          status: response.status,
          url: response.url,
        };
      }, `${readAppURL(testInfo, ESTIMATE_URL)}?_rsc=invalid-storage-prefetch-proof`);

      expect(result.status).toBeGreaterThanOrEqual(200);
      expectNoProtectedEstimatePayload(result.body);
    } finally {
      await context.close();
    }
  });
});
