import { expect, test } from '@playwright/test';

test('home page presents local-first estimate workspace', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /contractor-first estimates/i })).toBeVisible();
  await expect(page.getByText('Draft estimate total')).toBeVisible();
  await expect(page.getByText('Cost library')).toBeVisible();
  await expect(page.getByText('Proposal package target')).toBeVisible();
});
