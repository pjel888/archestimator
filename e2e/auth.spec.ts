import { expect, test } from "@playwright/test";

test("protected workshop projects redirects signed-out users to login", async ({ page }) => {
  await page.goto("/workshop/projects");

  await expect(page).toHaveURL(/\/login\?next=%2Fworkshop%2Fprojects/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("login page keeps compact shared-control UI visible", async ({ page }) => {
  await page.goto("/login?next=/workshop/projects");

  await expect(page.getByPlaceholder("name@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
});
