import { expect, test } from "@playwright/test";

import {
  authenticateNotificationE2EPage,
  cleanupNotificationE2EFixture,
  createNotificationE2EFixture,
  notificationE2ESkipReason,
  type NotificationE2EFixture,
} from "./notifications-e2e-helpers";

test.describe("notification release modal", () => {
  test.skip(Boolean(notificationE2ESkipReason()), notificationE2ESkipReason() ?? "Notification E2E enabled.");

  test("shows a seeded release announcement once per user", async ({ page, baseURL }) => {
    let fixture: NotificationE2EFixture | null = null;

    try {
      fixture = await createNotificationE2EFixture();
      await authenticateNotificationE2EPage(page, baseURL ?? "http://127.0.0.1:3020", fixture.session);

      await page.goto("/workshop", { waitUntil: "domcontentloaded" });
      const dialog = page.getByRole("dialog", { name: "New release" });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText("0.1.0-notification-e2e");

      await dialog.getByRole("link", { name: "View workshop" }).click();
      await expect(dialog).toBeHidden();

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("dialog", { name: "New release" })).toHaveCount(0);

      await page.getByRole("button", { name: /notifications/i }).click();
      await expect(page.getByRole("region", { name: "Notifications" })).toContainText("New release");
    } finally {
      await cleanupNotificationE2EFixture(fixture);
    }
  });
});
