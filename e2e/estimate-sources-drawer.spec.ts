import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

const TEST_PROJECT_ID = process.env.ESTIMATE_SHEET_E2E_PROJECT_ID ?? "22222222-2222-4222-8222-222222222222";
const TEST_NODE_ID =
  process.env.ESTIMATE_SHEET_E2E_NODE_ID ??
  process.env.ESTIMATE_SHEET_E2E_ESTIMATE_ID ??
  "bf254cbd-13d4-4dbf-b21a-84b171cdd6db";
const ESTIMATE_URL = `/workshop/projects/${TEST_PROJECT_ID}/estimates/${TEST_NODE_ID}`;
const ESTIMATES_LIST_URL = `/workshop/projects/${TEST_PROJECT_ID}/estimates`;
const AUTH_COOKIE_CHUNK_SIZE = 3_180;
const hasExplicitEstimateTarget = Boolean(process.env.ESTIMATE_SHEET_E2E_NODE_ID ?? process.env.ESTIMATE_SHEET_E2E_ESTIMATE_ID);
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

async function ensureAuthenticated(page: Page, testInfo: TestInfo) {
  if (hasDevAuthBypass && devAuthSecret) {
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
    return;
  }
  if (hasStorageStateAuth) return;
  const session = await createOwnerSession();
  await page.context().addCookies(createAuthCookies(session, readBaseURL(testInfo)));
}

async function openEstimateSheet(page: Page) {
  if (hasExplicitEstimateTarget) {
    await page.goto(ESTIMATE_URL, { waitUntil: "domcontentloaded" });
    return;
  }

  await page.goto(ESTIMATES_LIST_URL, { waitUntil: "domcontentloaded" });
  const estimateRowLink = page
    .locator(`a[aria-label^="Open "][href^="/workshop/projects/"][href*="/estimates/"]`)
    .first();
  await expect(estimateRowLink).toBeVisible({ timeout: 15_000 });
  const estimateHref = await estimateRowLink.getAttribute("href");
  expect(estimateHref).not.toBeNull();
  if (!estimateHref) throw new Error("Estimate row link did not expose an href.");
  await page.goto(estimateHref, { waitUntil: "domcontentloaded" });
}

async function assertNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => ({
        bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
        rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      })),
    )
    .toEqual({ bodyOverflow: 0, rootOverflow: 0 });
}

async function proveSourcesDrawerAtViewport(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await expect.poll(() => page.evaluate(() => window.matchMedia("(max-width: 1023px)").matches)).toBe(true);
  await expect(page.locator("[data-archestimator-sheet-root]")).toHaveCount(0);

  const trigger = page.getByRole("button", { name: "Open Sources drawer" });
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await expect(trigger).toHaveAttribute("aria-controls", "estimate-sources-drawer");
  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();

  const drawer = page.getByRole("dialog", { name: "Sources" });
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAttribute("id", "estimate-sources-drawer");
  await expect(drawer).toHaveAttribute("aria-modal", "true");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-workshop-page-shell-root]")).toHaveAttribute("inert", "");
  await expect(drawer.locator("aside[aria-label='Sources']")).toHaveCount(1);
  await expect(drawer.getByRole("tablist", { name: "Estimate source sections" })).toBeVisible();
  await expect(drawer.getByRole("tab", { name: "Library" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Close Sources drawer" })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await assertNoHorizontalOverflow(page);

  await page.keyboard.press("/");
  const search = drawer.getByRole("searchbox", { name: "Search Library" });
  await expect(search).toBeFocused();
  await search.fill("joist");
  await page.keyboard.press("Escape");
  await expect(search).toHaveValue("");
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).toBeHidden();
  await expect(drawer).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await expect(page.locator("[data-archestimator-sheet-root]")).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
}

test.describe("estimate sheet Sources drawer", () => {
  test.skip(!hasAuth, "Requires storage state, dev-auth bypass, or Supabase owner-session env.");

  [
    { label: "tablet boundary", viewport: { width: 1023, height: 768 } },
    { label: "phone width", viewport: { width: 390, height: 844 } },
  ].forEach(({ label, viewport }) => {
    test(`opens below desktop at ${label} with focus, Escape, scroll-lock, and overflow proof`, async ({ page }, testInfo) => {
      await ensureAuthenticated(page, testInfo);
      await openEstimateSheet(page);
      if (/\/login/.test(page.url())) {
        if (hasStaticAuth) {
          test.skip(true, "Configured static auth did not authenticate for the workshop.");
          return;
        }
        throw new Error("Generated owner session redirected to /login.");
      }

      await expect(page.locator("[data-estimate-center-column='sheet']").first()).toBeVisible({ timeout: 20_000 });

      await proveSourcesDrawerAtViewport(page, viewport);
    });
  });
});
