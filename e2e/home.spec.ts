import { expect, test } from '@playwright/test';

test('home page presents local-first estimate workspace', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /interactive estimate workspace/i })).toBeVisible();
  await expect(page.getByText('Draft total')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cost library' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'proposal' })).toBeVisible();
});
