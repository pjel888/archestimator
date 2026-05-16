import { expect, test } from '@playwright/test';

test('home page presents project dashboard', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.getByText('Local-first project dashboard')).toBeVisible();
  await expect(page.getByRole('link').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create draft project' })).toBeVisible();
});

test('project page presents editable estimate workspace', async ({ page }) => {
  await page.goto('/projects/project_grand_hyatt_sample', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /interactive estimate workspace/i })).toBeVisible();
  await expect(page.getByText('Draft total')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cost library' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'proposal' })).toBeVisible();
});

test('project page shows proposal terms builder', async ({ page }) => {
  await page.goto('/projects/project_grand_hyatt_sample', { waitUntil: 'domcontentloaded' });

  await page.getByRole('tab', { name: 'proposal' }).click();
  await expect(page.getByRole('heading', { name: 'Proposal terms builder' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Subject' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Issue immutable proposal snapshot' })).toBeVisible();
});
