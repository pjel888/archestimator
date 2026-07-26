import { spawnSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

import {
  getProtectedRouteE2eAuth,
  installLocalDevAuthBypass,
  isLocalDevAuthBypassReady,
  isProtectedRouteE2eAuthReady,
} from "./support/local-dev-auth";

const FIXTURE_EMAIL = "onboarding-e2e@local.test";
const FIXTURE_USER_ID = "usr_onboarding_e2e_0001";
const FIXTURE_WORKSPACE_ID = "w_onboarding_e2e_0001";
const auth = getProtectedRouteE2eAuth();
const enabled =
  isProtectedRouteE2eAuthReady(auth) &&
  process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL?.trim().toLowerCase() === FIXTURE_EMAIL;

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
    {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 45_000,
    },
  );
  if (result.status !== 0 || result.error || result.signal) {
    throw new Error(
      `Local onboarding fixture command failed: ${result.error?.message ?? result.signal ?? result.stderr}`,
    );
  }
}

function clearOnboardingState() {
  executeLocalD1(`
    DELETE FROM beta_onboarding_flow_events
    WHERE user_id = '${FIXTURE_USER_ID}'
      AND workspace_id = '${FIXTURE_WORKSPACE_ID}';
    DELETE FROM beta_onboarding_flow_states
    WHERE user_id = '${FIXTURE_USER_ID}'
      AND workspace_id = '${FIXTURE_WORKSPACE_ID}';
    DELETE FROM beta_activation_progress
    WHERE user_id = '${FIXTURE_USER_ID}'
      AND workspace_id = '${FIXTURE_WORKSPACE_ID}';
  `);
}

function seedFixture() {
  executeLocalD1(`
    INSERT INTO workspaces (
      id, name, slug, created_by, created_at, updated_at
    ) VALUES (
      '${FIXTURE_WORKSPACE_ID}',
      'Onboarding E2E',
      'onboarding-e2e',
      '${FIXTURE_USER_ID}',
      '2026-07-24T00:00:00.000Z',
      '2026-07-24T00:00:00.000Z'
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      slug = excluded.slug,
      closed_at = NULL,
      closed_reason = NULL,
      closed_by_user_id = NULL,
      deletion_id = NULL,
      updated_at = excluded.updated_at;

    INSERT INTO profiles (
      id, email, display_name, role, default_workspace_id, created_at, updated_at
    ) VALUES (
      '${FIXTURE_USER_ID}',
      '${FIXTURE_EMAIL}',
      'Onboarding E2E',
      'member',
      '${FIXTURE_WORKSPACE_ID}',
      '2026-07-24T00:00:00.000Z',
      '2026-07-24T00:00:00.000Z'
    )
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      role = excluded.role,
      default_workspace_id = excluded.default_workspace_id,
      account_status = 'active',
      deleted_at = NULL,
      deletion_id = NULL,
      updated_at = excluded.updated_at;

    INSERT INTO workspace_members (
      workspace_id, user_id, role, created_at, updated_at
    ) VALUES (
      '${FIXTURE_WORKSPACE_ID}',
      '${FIXTURE_USER_ID}',
      'owner',
      '2026-07-24T00:00:00.000Z',
      '2026-07-24T00:00:00.000Z'
    )
    ON CONFLICT(workspace_id, user_id) DO UPDATE SET
      role = excluded.role,
      updated_at = excluded.updated_at;
  `);
  clearOnboardingState();
}

function seedInProgressCoreOrientation() {
  clearOnboardingState();
  executeLocalD1(`
    INSERT INTO beta_onboarding_flow_states (
      user_id, workspace_id, flow_key, flow_version, generation, status,
      current_step_key, revision, reset_count, started_at, created_at, updated_at
    ) VALUES (
      '${FIXTURE_USER_ID}',
      '${FIXTURE_WORKSPACE_ID}',
      'core_orientation',
      1,
      1,
      'in_progress',
      'workspace_map',
      1,
      0,
      '2026-07-24T00:00:00.000Z',
      '2026-07-24T00:00:00.000Z',
      '2026-07-24T00:00:01.000Z'
    );

    INSERT INTO beta_onboarding_flow_events (
      id, user_id, workspace_id, flow_key, flow_version, generation,
      run_id, launch_mode, step_key, event_type, source,
      idempotency_key, request_fingerprint, state_revision,
      occurred_at, ingested_at
    ) VALUES (
      'evt_onboarding_e2e_core_started',
      '${FIXTURE_USER_ID}',
      '${FIXTURE_WORKSPACE_ID}',
      'core_orientation',
      1,
      1,
      'run_onboarding_e2e_core_0001',
      'auto',
      'welcome',
      'flow_started',
      'user_command',
      'onboarding-e2e-core-started',
      'onboarding-e2e-core-started',
      0,
      '2026-07-24T00:00:00.000Z',
      '2026-07-24T00:00:00.000Z'
    ), (
      'evt_onboarding_e2e_core_advanced',
      '${FIXTURE_USER_ID}',
      '${FIXTURE_WORKSPACE_ID}',
      'core_orientation',
      1,
      1,
      'run_onboarding_e2e_core_0001',
      'auto',
      'welcome',
      'step_completed',
      'joyride_runtime',
      'onboarding-e2e-core-advanced',
      'onboarding-e2e-core-advanced',
      1,
      '2026-07-24T00:00:01.000Z',
      '2026-07-24T00:00:01.000Z'
    );
  `);
}

function deactivateFixture() {
  clearOnboardingState();
  executeLocalD1(`
    UPDATE workspaces
    SET
      closed_at = '2026-07-24T23:59:59.999Z',
      closed_reason = 'admin_closed',
      closed_by_user_id = '${FIXTURE_USER_ID}',
      updated_at = '2026-07-24T23:59:59.999Z'
    WHERE id = '${FIXTURE_WORKSPACE_ID}';
  `);
}

async function openGuidanceSettings(page: Page) {
  await page.goto("/workshop/settings", { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/u);
  await page
    .getByRole("button", { name: "Show Guidance & tours settings" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Guidance & tours", exact: true }),
  ).toBeVisible();
}

test.describe("onboarding settings and runtime", () => {
  test.skip(
    !enabled,
    `Requires dev auth with ARCHESTIMATOR_DEV_AUTH_EMAIL=${FIXTURE_EMAIL}.`,
  );
  test.describe.configure({ retries: 0 });
  test.setTimeout(180_000);

  test.beforeAll(() => {
    seedFixture();
    expect(isLocalDevAuthBypassReady(auth)).toBe(true);
  });

  test.afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 750));
    deactivateFixture();
  });

  test.beforeEach(async ({ context }) => {
    await installLocalDevAuthBypass(context, auth);
  });

  test.afterEach(async ({ page }) => {
    await page.close();
  });

  test("does not let saved guide progress take over normal Projects navigation", async ({
    page,
  }) => {
    seedInProgressCoreOrientation();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    try {
      const response = await page.goto("/workshop/projects", {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBeLessThan(500);
      await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/u);
      await page.waitForTimeout(1_500);
      expect(new URL(page.url()).pathname).toBe("/workshop/projects");
      await expect(
        page.getByRole("heading", { name: "Guidance paused", exact: true }),
      ).toHaveCount(0);
      await expect(page.locator("#archestimator-onboarding-portal")).toHaveCount(0);

      await page.goto(
        "/workshop/projects?tour=core_orientation&mode=resume",
        { waitUntil: "domcontentloaded" },
      );
      const onboardingPortal = page.locator("#archestimator-onboarding-portal");
      await expect(
        onboardingPortal.getByRole("heading", { name: "Projects", exact: true }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(onboardingPortal).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        onboardingPortal.getByRole("heading", { name: "Projects", exact: true }),
      ).toHaveCount(0);
      expect(pageErrors).toEqual([]);
    } finally {
      clearOnboardingState();
    }
  });

  test("launches automatically and supports pause, deactivate, manual relaunch, reset, and reactivate", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto("/workshop", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/u);

    const welcome = page.getByRole("heading", {
      name: "Welcome to Archestimator",
      exact: true,
    });
    await expect(welcome).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await expect(
      page.getByRole("heading", { name: "Guidance paused", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(welcome).toHaveCount(0);
    await page.waitForTimeout(250);

    await openGuidanceSettings(page);
    const automaticGuidance = page.getByRole("switch", {
      name: "Show automatic guidance",
    });
    await expect(automaticGuidance).toHaveAttribute("aria-checked", "true");
    await automaticGuidance.click();
    await expect(automaticGuidance).toHaveAttribute("aria-checked", "false", {
      timeout: 60_000,
    });
    await expect(page.locator('p[role="status"]')).toContainText(
      "Automatic guidance is off.",
      { timeout: 60_000 },
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Show Guidance & tours settings" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Welcome to Archestimator",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("switch", { name: "Show automatic guidance" }),
    ).toHaveAttribute("aria-checked", "false");

    const coreOrientation = page
      .locator("article")
      .filter({ hasText: "Core orientation" });
    const manualLaunch = coreOrientation.getByRole("button", {
      name: /^(?:Start guide(?: again)?|Resume guide|View again)$/u,
    });
    await expect(manualLaunch).toBeVisible({ timeout: 15_000 });
    await manualLaunch.click();
    await expect(welcome).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(welcome).toHaveCount(0);

    await openGuidanceSettings(page);
    const enabledSwitch = page.getByRole("switch", {
      name: "Show automatic guidance",
    });
    await enabledSwitch.click();
    await expect(enabledSwitch).toHaveAttribute("aria-checked", "true", {
      timeout: 60_000,
    });
    await expect(page.locator('p[role="status"]')).toContainText(
      "Automatic guidance is on.",
      { timeout: 60_000 },
    );

    await page.getByRole("button", { name: "Reopen checklist" }).click();
    await expect(page.locator('p[role="status"]')).toContainText(
      "The checklist is visible again.",
      { timeout: 60_000 },
    );

    const restartSection = page
      .getByRole("heading", { name: "Restart all guides", exact: true })
      .locator("..");
    await restartSection
      .getByRole("button", { name: "Restart all guides" })
      .click();
    await restartSection
      .getByRole("button", { name: "Restart all guides" })
      .click();
    await expect(page.locator('p[role="status"]')).toContainText(
      "All guides were restarted.",
      { timeout: 60_000 },
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/workshop?tour=core_orientation&mode=start", {
      waitUntil: "domcontentloaded",
    });
    await expect(welcome).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#archestimator-onboarding-portal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(welcome).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test("keeps public and share routes free of the authenticated onboarding host", async ({
    page,
  }) => {
    const homeResponse = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(homeResponse?.status()).toBeLessThan(500);
    await expect(page.locator("#archestimator-onboarding-portal")).toHaveCount(0);

    const shareResponse = await page.goto("/share/not-a-real-onboarding-token", {
      waitUntil: "domcontentloaded",
    });
    expect(shareResponse?.status()).toBeLessThan(500);
    await expect(page.locator("#archestimator-onboarding-portal")).toHaveCount(0);
  });
});
