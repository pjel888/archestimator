import { expect, test } from "@playwright/test";

const devAuthEnabled = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";

test.describe("corporate accounts admin journey", () => {
  test.skip(!devAuthEnabled, "Requires the local development auth bypass.");
  test.describe.configure({ mode: "serial", retries: 0 });

  test.beforeEach(async ({ page }) => {
    const bypassSecret = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET;
    if (!bypassSecret) return;

    await page.context().addCookies([
      {
        name: "archestimator-dev-auth-bypass",
        value: bypassSecret,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: false,
        sameSite: "Lax",
      },
    ]);
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
    expect(await workspaceSelect.locator("option").count()).toBeGreaterThan(1);
    await workspaceSelect.selectOption({ index: 1 });
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
