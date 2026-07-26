import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  getProtectedRouteE2eAuth,
  installLocalDevAuthBypass,
  isLocalDevAuthBypassReady,
  isProtectedRouteE2eAuthReady,
} from "./support/local-dev-auth";

const FIXTURE_EMAIL = "onboarding-first-value-e2e@local.test";
const FIXTURE_USER_ID = "usr_onboarding_first_value_e2e_0001";
const FIXTURE_WORKSPACE_ID = "w_onboarding_first_value_e2e_0001";
const FIXTURE_PROJECT_ID = "f1000000-0000-4000-8000-000000000001";
const FIXTURE_ESTIMATE_ID = "f1000000-0000-4000-8000-000000000002";
const FIXTURE_TAB_ID = "f1000000-0000-4000-8000-000000000003";
const FIXTURE_NODE_ID = "f1000000-0000-4000-8000-000000000004";
const FIXTURE_TIMESTAMP = "2026-07-26T00:00:00.000Z";
const auth = getProtectedRouteE2eAuth();
const enabled =
  isProtectedRouteE2eAuthReady(auth) &&
  process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL?.trim().toLowerCase() === FIXTURE_EMAIL;

function executeLocalD1(sql: string) {
  const persistPath = process.env.ARCHESTIMATOR_E2E_WRANGLER_PERSIST_PATH?.trim();
  const sqlPath = join(
    process.cwd(),
    "artifacts",
    "quality",
    `.onboarding-first-value-${process.pid}.sql`,
  );
  writeFileSync(sqlPath, sql, "utf8");
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
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
          "--file",
          sqlPath,
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          timeout: 45_000,
        },
      );
      if (result.status === 0 && !result.error && !result.signal) return;
      const failure = result.error?.message ?? String(result.signal ?? result.stderr);
      const databaseBusy = /SQLITE_BUSY|database is locked/iu.test(failure);
      if (!databaseBusy || attempt === 4) {
        throw new Error(`Local onboarding first-value fixture command failed: ${failure}`);
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250 * (attempt + 1));
    }
  } finally {
    rmSync(sqlPath, { force: true });
  }
}

function clearOnboardingState() {
  executeLocalD1(`
    DELETE FROM beta_starter_mutation_leases
    WHERE workspace_id = '${FIXTURE_WORKSPACE_ID}';
    DELETE FROM beta_onboarding_flow_events
    WHERE user_id = '${FIXTURE_USER_ID}'
      AND workspace_id = '${FIXTURE_WORKSPACE_ID}';
    DELETE FROM beta_onboarding_flow_states
    WHERE user_id = '${FIXTURE_USER_ID}'
      AND workspace_id = '${FIXTURE_WORKSPACE_ID}';
    DELETE FROM beta_activation_events
    WHERE user_id = '${FIXTURE_USER_ID}'
      AND workspace_id = '${FIXTURE_WORKSPACE_ID}';
    DELETE FROM beta_activation_progress
    WHERE user_id = '${FIXTURE_USER_ID}'
      AND workspace_id = '${FIXTURE_WORKSPACE_ID}';
  `);
}

function seedCoreViewedState() {
  clearOnboardingState();
  executeLocalD1(`
    INSERT INTO beta_onboarding_flow_states (
      user_id, workspace_id, flow_key, flow_version, generation, status,
      current_step_key, revision, reset_count, started_at, completed_at,
      created_at, updated_at
    ) VALUES (
      '${FIXTURE_USER_ID}',
      '${FIXTURE_WORKSPACE_ID}',
      'core_orientation',
      1,
      1,
      'completed',
      NULL,
      3,
      0,
      '${FIXTURE_TIMESTAMP}',
      '2026-07-26T00:00:03.000Z',
      '${FIXTURE_TIMESTAMP}',
      '2026-07-26T00:00:03.000Z'
    );
  `);
}

function seedCompletedStatusSemantics() {
  seedCoreViewedState();
  executeLocalD1(`
    INSERT INTO beta_onboarding_flow_states (
      user_id, workspace_id, flow_key, flow_version, generation, status,
      current_step_key, revision, reset_count, started_at, completed_at,
      created_at, updated_at
    ) VALUES (
      '${FIXTURE_USER_ID}',
      '${FIXTURE_WORKSPACE_ID}',
      'first_estimate_value',
      1,
      1,
      'completed',
      NULL,
      5,
      0,
      '${FIXTURE_TIMESTAMP}',
      '2026-07-26T00:00:05.000Z',
      '${FIXTURE_TIMESTAMP}',
      '2026-07-26T00:00:05.000Z'
    );
  `);
}

function seedFirstValueHandoffState() {
  seedCoreViewedState();
  executeLocalD1(`
    INSERT INTO beta_onboarding_flow_states (
      user_id, workspace_id, flow_key, flow_version, generation, status,
      current_step_key, revision, reset_count, started_at, created_at, updated_at
    ) VALUES (
      '${FIXTURE_USER_ID}',
      '${FIXTURE_WORKSPACE_ID}',
      'first_estimate_value',
      1,
      1,
      'in_progress',
      'add_priced_row',
      1,
      0,
      '${FIXTURE_TIMESTAMP}',
      '${FIXTURE_TIMESTAMP}',
      '2026-07-26T00:00:01.000Z'
    );

    INSERT INTO beta_onboarding_flow_events (
      id, user_id, workspace_id, flow_key, flow_version, generation,
      run_id, launch_mode, step_key, event_type, source,
      idempotency_key, request_fingerprint, state_revision,
      occurred_at, ingested_at
    ) VALUES (
      'evt_onboarding_first_value_e2e_started',
      '${FIXTURE_USER_ID}',
      '${FIXTURE_WORKSPACE_ID}',
      'first_estimate_value',
      1,
      1,
      'run_onboarding_first_value_e2e_0001',
      'start',
      'hierarchy',
      'flow_started',
      'user_command',
      'onboarding-first-value-e2e-started',
      'onboarding-first-value-e2e-started',
      0,
      '${FIXTURE_TIMESTAMP}',
      '${FIXTURE_TIMESTAMP}'
    ), (
      'evt_onboarding_first_value_e2e_hierarchy',
      '${FIXTURE_USER_ID}',
      '${FIXTURE_WORKSPACE_ID}',
      'first_estimate_value',
      1,
      1,
      'run_onboarding_first_value_e2e_0001',
      'start',
      'hierarchy',
      'step_completed',
      'joyride_runtime',
      'onboarding-first-value-e2e-hierarchy',
      'onboarding-first-value-e2e-hierarchy',
      1,
      '2026-07-26T00:00:01.000Z',
      '2026-07-26T00:00:01.000Z'
    );
  `);
}

function seedFixture() {
  executeLocalD1(`
    INSERT INTO workspaces (
      id, name, slug, created_by, created_at, updated_at
    ) VALUES (
      '${FIXTURE_WORKSPACE_ID}',
      'Onboarding First Value E2E Workspace',
      'onboarding-first-value-e2e',
      '${FIXTURE_USER_ID}',
      '${FIXTURE_TIMESTAMP}',
      '${FIXTURE_TIMESTAMP}'
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      slug = excluded.slug,
      created_by = excluded.created_by,
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
      'Onboarding First Value E2E User',
      'member',
      '${FIXTURE_WORKSPACE_ID}',
      '${FIXTURE_TIMESTAMP}',
      '${FIXTURE_TIMESTAMP}'
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
      '${FIXTURE_TIMESTAMP}',
      '${FIXTURE_TIMESTAMP}'
    )
    ON CONFLICT(workspace_id, user_id) DO UPDATE SET
      role = excluded.role,
      updated_at = excluded.updated_at;

    DELETE FROM projects WHERE id = '${FIXTURE_PROJECT_ID}';

    INSERT INTO projects (
      id, workspace_id, name, project_code, created_by, currency_code,
      metadata, status, created_at, updated_at
    ) VALUES (
      '${FIXTURE_PROJECT_ID}',
      '${FIXTURE_WORKSPACE_ID}',
      'Onboarding First Value E2E Project',
      'OFV-E2E-001',
      '${FIXTURE_USER_ID}',
      'PHP',
      '{}',
      'ongoing',
      '${FIXTURE_TIMESTAMP}',
      '${FIXTURE_TIMESTAMP}'
    );

    INSERT INTO estimates (
      id, project_id, name, sheet_code, created_by, currency_code,
      metadata, created_at, updated_at
    ) VALUES (
      '${FIXTURE_ESTIMATE_ID}',
      '${FIXTURE_PROJECT_ID}',
      'Onboarding First Value E2E Estimate',
      'OFV-E2E-S01',
      '${FIXTURE_USER_ID}',
      'PHP',
      '{}',
      '${FIXTURE_TIMESTAMP}',
      '${FIXTURE_TIMESTAMP}'
    );

    INSERT INTO estimate_tabs (
      id, estimate_id, name, sort_order, is_default, created_at, updated_at
    ) VALUES (
      '${FIXTURE_TAB_ID}',
      '${FIXTURE_ESTIMATE_ID}',
      'Onboarding First Value E2E Tab',
      0,
      1,
      '${FIXTURE_TIMESTAMP}',
      '${FIXTURE_TIMESTAMP}'
    );

    INSERT INTO estimate_nodes (
      id, estimate_id, estimate_tab_id, name, kind, parent_id,
      sort_order, created_at, updated_at
    ) VALUES (
      '${FIXTURE_NODE_ID}',
      '${FIXTURE_ESTIMATE_ID}',
      '${FIXTURE_TAB_ID}',
      'Onboarding First Value E2E Area',
      'area',
      NULL,
      0,
      '${FIXTURE_TIMESTAMP}',
      '${FIXTURE_TIMESTAMP}'
    );
  `);
  seedCoreViewedState();
}

function deactivateFixture() {
  clearOnboardingState();
  executeLocalD1(`
    UPDATE workspaces
    SET
      closed_at = '2026-07-26T23:59:59.999Z',
      closed_reason = 'admin_closed',
      closed_by_user_id = '${FIXTURE_USER_ID}',
      updated_at = '2026-07-26T23:59:59.999Z'
    WHERE id = '${FIXTURE_WORKSPACE_ID}';
  `);
}

async function openAuthenticatedRoute(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(500);
  await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/u);
}

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    content: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
}

async function expectNoAxeViolations(page: Page) {
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
}

test.describe("onboarding first-value journey", () => {
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
    seedCoreViewedState();
    await installLocalDevAuthBypass(context, auth);
  });

  test.afterEach(async ({ page }) => {
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    await page.close();
  });

  test("shows only two immediate start choices and keeps examples behind disclosure on desktop @a11y", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openAuthenticatedRoute(page, "/workshop/getting-started");

    await expect(
      page.getByRole("heading", { name: "Getting Started", exact: true }),
    ).toBeVisible();
    const primaryChoices = page.locator('[data-primary-start-path="true"]');
    await expect(primaryChoices).toHaveCount(2);
    await expect(primaryChoices).toContainText([
      "Guided practice",
      "Blank project",
    ]);

    const examples = page.locator("details").filter({
      has: page.getByText("Explore finished examples and templates", { exact: true }),
    });
    await expect(examples).not.toHaveAttribute("open", "");
    await expect(examples.locator('[data-start-path="starter_reference"]')).toBeHidden();
    await examples.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(examples).toHaveAttribute("open", "");
    await expect(examples.locator('[data-start-path="starter_reference"]')).toBeVisible();
    await expect(examples.locator('[data-start-path="workspace_template"]')).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
    await page.screenshot({
      path: `artifacts/quality/onboarding-getting-started-desktop-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });

  test("keeps the mobile getting-started page usable with reduced motion @a11y", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openAuthenticatedRoute(page, "/workshop/getting-started");

    expect(
      await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
    ).toBe(true);
    await expect(page.locator('[data-primary-start-path="true"]')).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "Start guided practice", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start from scratch", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() =>
        document.getAnimations().filter((animation) => animation.playState === "running").length
      ),
    ).toBe(0);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
    await page.screenshot({
      path: `artifacts/quality/onboarding-getting-started-mobile-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });

  test("reflows without horizontal scrolling at the 640 CSS-pixel viewport equivalent of 200% zoom", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await openAuthenticatedRoute(page, "/workshop/getting-started");

    await expect(
      page.getByRole("heading", { name: "Choose how to start", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start guided practice", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start from scratch", exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `artifacts/quality/onboarding-getting-started-200-percent-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });

  test("labels a completed passive guide Viewed and a completed domain-task guide Completed", async ({
    page,
  }) => {
    seedCompletedStatusSemantics();
    await openAuthenticatedRoute(page, "/workshop/settings");
    await page
      .getByRole("button", { name: "Show Guidance & tours settings" })
      .click();

    const coreOrientation = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Core orientation", exact: true }),
    });
    const firstEstimate = page.locator("article").filter({
      has: page.getByRole("heading", { name: "First estimate", exact: true }),
    });
    await expect(coreOrientation).toContainText("Viewed");
    await expect(coreOrientation).not.toContainText("Completed");
    await expect(firstEstimate).toContainText("Completed");
    await expect(firstEstimate).not.toContainText("Viewed");
  });

  test("hands keyboard control to the real task target, with desktop pointer creation", async ({
    page,
  }, testInfo) => {
    seedFirstValueHandoffState();
    await page.waitForTimeout(1_000);
    await openAuthenticatedRoute(
      page,
      `/workshop/projects/${FIXTURE_PROJECT_ID}/estimates/${FIXTURE_NODE_ID}?tour=first_estimate_value&mode=resume`,
    );

    const tryItNow = page.getByRole("button", { name: "Try it now", exact: true });
    const realTarget = page.locator(
      '[data-onboarding-target="estimate.add_row"]',
    );
    await expect(realTarget).toBeVisible({ timeout: 30_000 });
    await expect(tryItNow).toBeVisible({ timeout: 15_000 });
    await expect(realTarget).toHaveJSProperty("tagName", "BUTTON");

    await tryItNow.focus();
    await page.keyboard.press("Enter");
    await expect(realTarget).toBeFocused();
    const returnToGuide = page.getByRole("button", {
      name: "Return to guide",
      exact: true,
    });
    await expect(returnToGuide).toBeVisible();

    await returnToGuide.focus();
    await page.keyboard.press("Enter");
    await expect(tryItNow).toBeVisible();
    await expect(returnToGuide).toHaveCount(0);

    await tryItNow.focus();
    await page.keyboard.press("Enter");
    await expect(realTarget).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(tryItNow).toBeVisible();
    await expect(returnToGuide).toHaveCount(0);

    if (!["chromium", "firefox", "webkit"].includes(testInfo.project.name)) return;

    await tryItNow.click();
    await expect(realTarget).toBeFocused();
    const rows = page.locator("tr[data-estimate-row-id]");
    const rowCountBefore = await rows.count();
    await realTarget.click();
    await expect(rows).toHaveCount(rowCountBefore + 1, { timeout: 15_000 });
  });
});
