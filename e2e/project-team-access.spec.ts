import { expect, test } from "@playwright/test";

const bypassSecret = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET?.trim() ?? "";
const projectId = process.env.ARCHESTIMATOR_E2E_TEAM_PROJECT_ID?.trim() ?? "";
const devAuthEnabled = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1" && bypassSecret.length >= 32;
const teamRouteEnabled = devAuthEnabled && Boolean(projectId);

test.describe("project Team access route", () => {
  test.skip(
    !teamRouteEnabled,
    "Requires valid dev auth plus ARCHESTIMATOR_E2E_TEAM_PROJECT_ID for an accessible seeded project.",
  );

  test.beforeEach(async ({ page }) => {
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
