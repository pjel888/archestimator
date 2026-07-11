import { expect, test } from "@playwright/test";

import {
  getProtectedRouteE2eAuth,
  installLocalDevAuthBypass,
  isLocalDevAuthBypassReady,
  isProtectedRouteE2eAuthReady,
} from "./support/local-dev-auth";

const projectId = process.env.ARCHESTIMATOR_E2E_TEAM_PROJECT_ID?.trim() ?? "";
const auth = getProtectedRouteE2eAuth();
const teamRouteEnabled = isProtectedRouteE2eAuthReady(auth) && Boolean(projectId);

test.describe("project Team access route", () => {
  test.skip(
    !teamRouteEnabled,
    "Requires PLAYWRIGHT_STORAGE_STATE or ready local dev auth plus ARCHESTIMATOR_E2E_TEAM_PROJECT_ID.",
  );

  test.beforeEach(async ({ page }) => {
    test.skip(
      !isLocalDevAuthBypassReady(auth),
      "Local dev auth bypass is not ready for the configured D1 identity.",
    );
    await installLocalDevAuthBypass(page.context(), auth);
  });

  test("navigates an authenticated project user to the scoped Team access surface", async ({
    page,
  }) => {
    await page.goto(`/workshop/projects/${projectId}`, { waitUntil: "domcontentloaded" });

    const teamAccessLink = page.locator(
      '[data-project-team-access-link="true"]',
    );
    await expect(teamAccessLink).toBeVisible();
    await teamAccessLink.click();

    await expect(page).toHaveURL(new RegExp(`/workshop/projects/${projectId}/team$`));
    await expect(
      page.getByRole("main", { name: "Project team access" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Team access" }),
    ).toBeVisible();
  });
});
