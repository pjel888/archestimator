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
  await page.waitForTimeout(1000);

  await page.getByRole('tab', { name: 'proposal' }).click();
  await expect(page.getByRole('heading', { name: 'Proposal terms builder' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('textbox', { name: 'Subject' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Issue immutable proposal snapshot' })).toBeVisible();
});

test('estimate grid spike renders spreadsheet, space tree, and library tray', async ({ page }) => {
  await page.goto('/spikes/estimate-grid', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  await expect(page.getByRole('heading', { name: 'Estimate grid + library drag/drop' })).toBeVisible();
  await expect(page.getByText('Space-organized estimate sheet')).toBeVisible();
  await expect(page.getByText('Material library drag tray')).toBeVisible();
  await expect(page.getByTestId('space-tree')).toBeVisible();
  await expect(page.getByTestId('estimate-grid-spike')).toBeVisible();
  await expect(page.getByTestId('library-drag-tray')).toBeVisible();
});
