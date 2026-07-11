import { expect, test } from "@playwright/test";

import {
  getProtectedRouteE2eAuth,
  installLocalDevAuthBypass,
  isLocalDevAuthBypassReady,
  isProtectedRouteE2eAuthReady,
} from "./support/local-dev-auth";

const workspaceId = process.env.ARCHESTIMATOR_E2E_CORPORATE_WORKSPACE_ID?.trim() ?? "";
const auth = getProtectedRouteE2eAuth();
const corporateJourneyEnabled = isProtectedRouteE2eAuthReady(auth) && Boolean(workspaceId);

test.describe("corporate accounts admin journey", () => {
  test.skip(
    !corporateJourneyEnabled,
    "Requires PLAYWRIGHT_STORAGE_STATE or ready local dev auth plus ARCHESTIMATOR_E2E_CORPORATE_WORKSPACE_ID.",
  );
  test.describe.configure({ mode: "serial", retries: 0 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !isLocalDevAuthBypassReady(auth),
      "Local dev auth bypass is not ready for the configured D1 identity.",
    );
    await installLocalDevAuthBypass(page.context(), auth);
  });

  test("creates, links, unlinks, archives, and restores a local corporate account", async ({
    page,
  }, testInfo) => {
    const accountName = `Corporate browser proof ${testInfo.workerIndex}-${Date.now()}`;

    await page.goto("/admin/accounts", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Corporate Accounts" }),
    ).toBeVisible();

    await page.getByLabel("Name").fill(accountName);
    await page
      .getByLabel("Description (optional)")
      .fill("Local browser proof fixture");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(
      page.getByText(`Account "${accountName}" created.`),
    ).toBeVisible();

    const accountLink = page.getByRole("link", { name: accountName });
    await expect(accountLink).toBeVisible();
    await accountLink.click();
    await expect(
      page.getByRole("heading", { name: accountName }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Members/ })).toContainText(
      "1 member",
    );
    await expect(
      page.getByRole("heading", { name: /Linked workspaces/ }),
    ).toBeVisible();

    const workspaceForm = page
      .getByRole("button", { name: "Link workspace" })
      .locator("xpath=ancestor::form");
    const workspaceSelect = workspaceForm.locator("select");
    await expect(workspaceSelect.locator(`option[value="${workspaceId}"]`)).toHaveCount(1);
    await workspaceSelect.selectOption(workspaceId);
    await page.getByRole("button", { name: "Link workspace" }).click();
    await expect(page.getByText("Workspace linked.")).toBeVisible();

    const unlinkButton = page.getByRole("button", { name: /^Unlink / });
    await expect(unlinkButton).toBeVisible();
    await unlinkButton.click();
    await expect(page.getByText("Workspace unlinked.")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();

    await page.goto("/admin/accounts?status=archived", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: "Archived Corporate Accounts" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: accountName })).toBeVisible();

    await page.getByRole("link", { name: accountName }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByRole("button", { name: "Suspend" })).toBeVisible();
  });
});
