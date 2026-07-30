import { spawnSync } from "node:child_process";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  getProtectedRouteE2eAuth,
  installLocalDevAuthBypass,
  isProtectedRouteE2eAuthReady,
} from "./support/local-dev-auth";

const FIXTURE_EMAIL = "workshop-readability-e2e@local.test";
const FIXTURE_USER_ID = "usr_workshop_readability_e2e_0001";
const FIXTURE_WORKSPACE_ID = "w_workshop_readability_e2e_0001";
const auth = getProtectedRouteE2eAuth();

function executeLocalD1(sql: string) {
  const persistPath = process.env.ARCHESTIMATOR_E2E_WRANGLER_PERSIST_PATH?.trim();
  const result = spawnSync(
    "bun",
    [
      "x",
      "wrangler",
      "d1",
      "execute",
      "ARCH_DB",
      "--local",
      ...(persistPath ? ["--persist-to", persistPath] : []),
      "--command",
      sql,
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 45_000 },
  );
  if (result.status !== 0 || result.error || result.signal) {
    throw new Error(`Local Workshop readability fixture command failed: ${result.error?.message ?? String(result.signal ?? result.stderr)}`);
  }
}

function seedLocalFixture() {
  if (!auth.usesDevAuthBypass) return;
  expect(process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL?.trim().toLowerCase()).toBe(FIXTURE_EMAIL);
  executeLocalD1(`
    INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at)
    VALUES ('${FIXTURE_WORKSPACE_ID}', 'Workshop Readability E2E', 'workshop-readability-e2e', '${FIXTURE_USER_ID}', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z')
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, slug = excluded.slug, closed_at = NULL, closed_reason = NULL, closed_by_user_id = NULL, deletion_id = NULL, updated_at = excluded.updated_at;

    INSERT INTO profiles (id, email, display_name, role, default_workspace_id, created_at, updated_at)
    VALUES ('${FIXTURE_USER_ID}', '${FIXTURE_EMAIL}', 'Workshop Readability E2E', 'member', '${FIXTURE_WORKSPACE_ID}', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z')
    ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name, role = excluded.role, default_workspace_id = excluded.default_workspace_id, account_status = 'active', deleted_at = NULL, deletion_id = NULL, updated_at = excluded.updated_at;

    INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
    VALUES ('${FIXTURE_WORKSPACE_ID}', '${FIXTURE_USER_ID}', 'owner', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z')
    ON CONFLICT(workspace_id, user_id) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at;
  `);
}

async function openWorkshop(page: Page) {
  const response = await page.goto("/workshop", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBe(true);
  expect(new URL(page.url()).pathname).toBe("/workshop");
  await expect(page.locator("[data-workshop-page-shell-root]")).toBeVisible();
}

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
}

async function expectNoPageHorizontalOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    body: { clientWidth: document.body.clientWidth, scrollWidth: document.body.scrollWidth },
    document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
  }));
  expect(geometry.body.scrollWidth).toBeLessThanOrEqual(geometry.body.clientWidth);
  expect(geometry.document.scrollWidth).toBeLessThanOrEqual(geometry.document.clientWidth);
}

test.describe("authenticated Workshop readability and accessibility", () => {
  test.describe.configure({ mode: "serial", retries: 0 });
  test.setTimeout(90_000);

  test.beforeAll(() => {
    expect(isProtectedRouteE2eAuthReady(auth), "Authenticated Workshop evidence requires PLAYWRIGHT_STORAGE_STATE or a configured local dev-auth bypass.").toBe(true);
    seedLocalFixture();
  });

  test.beforeEach(async ({ context }) => {
    await installLocalDevAuthBypass(context, auth);
  });

  test("matches the native role scale and preserves keyboard focus through a portal dialog", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openWorkshop(page);

    const shell = page.locator("[data-workshop-page-shell-root]");
    const settings = page.getByRole("button", { name: "Open settings" }).first();
    await expect(settings).toBeVisible();

    const nativeMetrics = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-workshop-page-shell-root]");
      if (!root) throw new Error("Workshop root was not rendered.");
      const styles = getComputedStyle(root);
      return {
        bodyTransform: getComputedStyle(document.body).transform,
        bodyZoom: getComputedStyle(document.body).zoom,
        htmlFontSize: getComputedStyle(document.documentElement).fontSize,
        htmlTransform: getComputedStyle(document.documentElement).transform,
        htmlZoom: getComputedStyle(document.documentElement).zoom,
        metadata: styles.getPropertyValue("--workshop-text-metadata").trim(),
        primary: styles.getPropertyValue("--workshop-text-primary").trim(),
        supporting: styles.getPropertyValue("--workshop-text-supporting").trim(),
        title: styles.getPropertyValue("--workshop-text-title").trim(),
      };
    });
    expect(nativeMetrics).toEqual({
      bodyTransform: "none",
      bodyZoom: "1",
      htmlFontSize: "16px",
      htmlTransform: "none",
      htmlZoom: "1",
      metadata: "9px",
      primary: "11px",
      supporting: "10px",
      title: "12px",
    });

    await expect(settings).toHaveCSS("font-size", "11px");
    const settingsBox = await settings.boundingBox();
    expect(settingsBox).not.toBeNull();
    expect(settingsBox?.width).toBeGreaterThanOrEqual(24);
    expect(settingsBox?.height).toBeGreaterThanOrEqual(24);

    await settings.focus();
    await expect(settings).toBeFocused();
    expect(await settings.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe("2px");

    await settings.click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("font-size", "11px");
    await expect(dialog.getByRole("heading", { name: "Settings" })).toHaveCSS("font-size", "12px");

    await dialog.focus();
    await expect(dialog).toBeFocused();
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(settings).toBeFocused();

    await expectNoSeriousAxeViolations(page);
    await expectNoPageHorizontalOverflow(page);
    await testInfo.attach("workshop-native-readability.png", {
      body: await shell.screenshot(),
      contentType: "image/png",
    });
  });

  test("reflows at the 640 CSS-pixel equivalent of 200% zoom with text spacing", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await openWorkshop(page);
    await page.addStyleTag({
      content: "[data-workshop-page-shell-root], [role='dialog'] { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }",
    });

    const settings = page.getByRole("button", { name: "Open settings" }).first();
    await expect(settings).toBeVisible();
    await expect(settings).toHaveCSS("font-size", "11px");
    await expectNoPageHorizontalOverflow(page);

    await settings.click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox?.x).toBeGreaterThanOrEqual(0);
    expect((dialogBox?.x ?? 0) + (dialogBox?.width ?? 0)).toBeLessThanOrEqual(640);
    await expectNoPageHorizontalOverflow(page);
    await testInfo.attach("workshop-200-percent-reflow.png", {
      body: await page.screenshot({ fullPage: false }),
      contentType: "image/png",
    });
  });

  test("expands frequently used controls for coarse pointers", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkshop(page);

    const settings = page.getByRole("button", { name: "Open settings" }).first();
    await expect(settings).toBeVisible();
    const coarsePointer = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
    const targetFloor = coarsePointer ? 32 : 24;
    const settingsBox = await settings.boundingBox();
    expect(settingsBox).not.toBeNull();
    expect(settingsBox?.width).toBeGreaterThanOrEqual(targetFloor);
    expect(settingsBox?.height).toBeGreaterThanOrEqual(targetFloor);
  });
});
