import { expect, test } from "@playwright/test";

import {
  authenticateNotificationE2EPage,
  cleanupNotificationE2EFixture,
  createNotificationE2EFixture,
  notificationE2ESkipReason,
  type NotificationE2EFixture,
} from "./notifications-e2e-helpers";

test.describe("notification center", () => {
  test.skip(Boolean(notificationE2ESkipReason()), notificationE2ESkipReason() ?? "Notification E2E enabled.");

  test("opens the center, marks an unread item read, and dismisses it", async ({ page, baseURL }) => {
    let fixture: NotificationE2EFixture | null = null;

    try {
      fixture = await createNotificationE2EFixture();
      await authenticateNotificationE2EPage(page, baseURL ?? "http://127.0.0.1:3020", fixture.session);

      await page.goto("/workshop", { waitUntil: "domcontentloaded" });
      const releaseDialog = page.getByRole("dialog", { name: "New release" });
      await expect(releaseDialog).toBeVisible();
      await releaseDialog.getByRole("button", { name: "Dismiss" }).click();
      await expect(releaseDialog).toBeHidden();

      await page.getByRole("button", { name: /notifications, 1 unread/i }).click();

      const region = page.getByRole("region", { name: "Notifications" });
      await expect(region).toBeVisible();
      await expect(region).toContainText("Review notification center");

      await region.getByRole("button", { name: "Mark read" }).first().click();
      await expect(page.getByRole("button", { name: /notifications, 0 unread/i })).toBeVisible();

      await region.getByRole("button", { name: "Dismiss" }).first().click();
      await expect(region).not.toContainText("Review notification center");
    } finally {
      await cleanupNotificationE2EFixture(fixture);
    }
  });
});
