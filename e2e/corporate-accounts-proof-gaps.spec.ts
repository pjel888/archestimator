import { expect, test } from "@playwright/test";

import {
  getProtectedRouteE2eAuth,
  installLocalDevAuthBypass,
  isLocalDevAuthBypassReady,
  isProtectedRouteE2eAuthReady,
} from "./support/local-dev-auth";
import {
  ensureCorporateMemberBrowserFixture,
  resetCorporateBrowserFixture,
} from "./support/corporate-local-fixture";

const workspaceId = process.env.ARCHESTIMATOR_E2E_CORPORATE_WORKSPACE_ID?.trim() ?? "";
const auth = getProtectedRouteE2eAuth();
const corporateJourneyEnabled = isProtectedRouteE2eAuthReady(auth) && Boolean(workspaceId);
const corporateMemberFixtureLabel = "Corporate Browser Fixture (corporate.browser.fixture@example.test)";

function requireValue(value: string | null, description: string): string {
  if (!value) throw new Error(`Corporate browser fixture is missing ${description}.`);
  return value;
}

test.describe("corporate accounts local proof gaps", () => {
  test.skip(
    !corporateJourneyEnabled,
    "Requires PLAYWRIGHT_STORAGE_STATE or ready local dev auth plus ARCHESTIMATOR_E2E_CORPORATE_WORKSPACE_ID.",
  );
  test.describe.configure({ mode: "serial", retries: 0 });

  test.beforeAll(() => {
    resetCorporateBrowserFixture();
    ensureCorporateMemberBrowserFixture();
  });

  test.afterAll(() => {
    resetCorporateBrowserFixture();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !isLocalDevAuthBypassReady(auth),
      "Local dev auth bypass is not ready for the configured D1 identity.",
    );
    await installLocalDevAuthBypass(page.context(), auth);
  });

  test("proves sidebar, membership lifecycle, read-only access, user membership, and workspace move", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const accountName = `Corporate role proof ${testInfo.workerIndex}-${Date.now()}`;
    const secondAccountName = `${accountName} moved`;

    await page.goto("/admin/accounts", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Accounts" })).toBeVisible();

    await page.getByLabel("Name").fill(accountName);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText(`Account "${accountName}" created.`)).toBeVisible();
    await page.getByRole("link", { name: accountName }).click();
    await expect(page.getByRole("heading", { name: accountName })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Workspace", exact: true })).toHaveCount(1, { timeout: 20_000 });

    const currentRole = page.locator("select[aria-label^='Role for ']");
    await expect(currentRole).toHaveCount(1);
    const currentRoleLabel = requireValue(
      await currentRole.getAttribute("aria-label"),
      "the creator member role control",
    );

    const memberForm = page
      .getByRole("button", { name: "Add member" })
      .locator("xpath=ancestor::form");
    const userSelect = memberForm.locator("select").first();
    await userSelect.selectOption({ label: corporateMemberFixtureLabel });
    const candidateUserId = await userSelect.inputValue();
    const candidateEmail = requireValue(
      corporateMemberFixtureLabel.match(/\(([^()]+)\)\s*$/)?.[1] ?? null,
      "the second assignable user email",
    );

    await memberForm.locator("select").nth(1).selectOption("member");
    await memberForm.getByRole("button", { name: "Add member" }).click();
    await expect(page.getByLabel(`Role for ${candidateEmail}`)).toHaveValue("member");

    await page.getByLabel(`Role for ${candidateEmail}`).selectOption("team_leader");
    await expect(page.getByLabel(`Role for ${candidateEmail}`)).toHaveValue("team_leader");

    await page.goto(`/admin/users/${candidateUserId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Corporate membership", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: accountName })).toBeVisible();
    await expect(page.getByText("team_leader", { exact: true }).first()).toBeVisible();

    await page.getByRole("link", { name: accountName }).click();
    await page.getByRole("button", { name: `Remove ${candidateEmail}` }).click();
    await expect(page.getByText("Member removed.")).toBeVisible();
    await expect(page.getByLabel(`Role for ${candidateEmail}`)).toHaveCount(0);
    const refreshedMemberForm = page
      .getByRole("button", { name: "Add member" })
      .locator("xpath=ancestor::form");
    await refreshedMemberForm.locator("select").first().selectOption(candidateUserId);
    await refreshedMemberForm.locator("select").nth(1).selectOption("owner");
    await refreshedMemberForm.getByRole("button", { name: "Add member" }).click();
    await expect(page.getByLabel(`Role for ${candidateEmail}`)).toHaveValue("owner");

    const firstAccountWorkspaceSelect = page.getByRole("combobox", { name: "Workspace", exact: true });
    await expect(
      firstAccountWorkspaceSelect.locator(`option[value="${workspaceId}"]`),
    ).toContainText("No corporate account");
    await firstAccountWorkspaceSelect.selectOption(workspaceId);
    await page.getByRole("button", { name: "Link workspace" }).click();
    await expect(page.getByText("Workspace linked.")).toBeVisible();

    await page.getByLabel(currentRoleLabel).selectOption("team_leader");
    await expect(page.getByLabel(currentRoleLabel)).toHaveValue("team_leader");

    await page.goto("/workshop/settings/organization", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Organization access" })).toBeVisible();
    await expect(page.getByText(accountName, { exact: true })).toBeVisible();
    await expect(page.getByText("Team leader", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add member" })).toHaveCount(0);

    await page.goto("/admin/accounts", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Name").fill(secondAccountName);
    await page.getByRole("button", { name: "Create" }).click();
    await page.getByRole("link", { name: secondAccountName }).click();
    const workspaceSelect = page.getByRole("combobox", { name: "Workspace", exact: true });
    await expect(workspaceSelect.locator(`option[value="${workspaceId}"]`)).toContainText(
      `Move from ${accountName}`,
    );
    await workspaceSelect.selectOption(workspaceId);
    await page.getByRole("button", { name: "Link workspace" }).click();
    await expect(page.getByText("Workspace linked.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Unlink / })).toBeVisible();
  });
});
