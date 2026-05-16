import { expect, test } from '@playwright/test';

test('home page presents project dashboard', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.getByText('Local-first project dashboard')).toBeVisible();
  await expect(page.getByRole('link').first()).toBeVisible();
});

test('project page presents editable estimate workspace', async ({ page }) => {
  await page.goto('/projects/project_grand_hyatt_sample', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /interactive estimate workspace/i })).toBeVisible();
  await expect(page.getByText('Draft total')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cost library' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'proposal' })).toBeVisible();
});
