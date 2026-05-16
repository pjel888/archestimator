import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const dataDir = join(process.cwd(), 'data/local');

test.beforeEach(() => {
  copyFileSync(join(dataDir, 'seed.json'), join(dataDir, 'runtime.json'));
});

async function openProposalTab(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: 'proposal' }).click();
  await expect(page.getByRole('heading', { name: 'Proposal terms builder' })).toBeVisible({ timeout: 10000 });
}

test('home page presents project dashboard and project creation form', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.getByText('Local-first project dashboard')).toBeVisible();
  await expect(page.getByRole('link').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create draft project' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Client name' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Location' })).toBeVisible();
});

test('project page presents editable estimate workspace', async ({ page }) => {
  await page.goto('/projects/project_grand_hyatt_sample', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /interactive estimate workspace/i })).toBeVisible();
  await expect(page.getByText('Draft total')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cost library' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'proposal' })).toBeVisible();
  await expect(page.getByLabel('Selected estimate section for new rows')).toHaveValue('space_ground_floor_bathroom');
  await expect(page.getByLabel(/Proposal section for Tile A/i)).toHaveValue('proposal_section_floor_finishes');
});

test('project page covers library insert, section-aware proposal mapping, and live totals', async ({ page }) => {
  await page.goto('/projects/project_grand_hyatt_sample', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('production-estimate-glide-grid')).toBeVisible();
  await expect(page.getByText('Production grid migration')).toBeVisible();
  await expect(page.getByText('Glide estimate grid')).toBeVisible();

  await page.getByLabel('Selected estimate section for new rows').selectOption('space_general_conditions');
  await expect(page.getByLabel('Selected estimate section for new rows')).toHaveValue('space_general_conditions');
  await page.getByRole('button', { name: /Add blank row/i }).click();
  await expect(page.getByLabel(/Proposal section for Untitled estimate item/i).last()).toHaveValue('proposal_section_general_conditions');

  await page.getByRole('button', { name: /Add to estimate/i }).first().click();
  const insertedProposalSection = page.getByLabel(/Proposal section for Tile A 600 x 600/i).last();
  await insertedProposalSection.selectOption('proposal_section_general_conditions');
  await expect(insertedProposalSection).toHaveValue('proposal_section_general_conditions');

  const tileQuantity = page.getByLabel(/Quantity for Tile A - bathroom floor/i);
  await tileQuantity.fill('30');
  await expect(page.getByText(/₱43,612|PHP\s*43,612/i).first()).toBeVisible();
});

test('project page covers proposal terms, proposal summary, and issued proposal route', async ({ page }) => {
  await page.goto('/projects/project_grand_hyatt_sample', { waitUntil: 'domcontentloaded' });

  await openProposalTab(page);
  await expect(page.getByRole('textbox', { name: 'Subject' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Subject' }).fill('E2E Proposal Package');
  await expect(page.getByRole('heading', { name: 'E2E Proposal Package' })).toBeVisible();
  await expect(page.getByText('A. Floor Finishes')).toBeVisible();
  await expect(page.getByText('B. General Conditions')).toBeVisible();

  await page.getByRole('button', { name: 'Issue immutable proposal snapshot' }).click();
  await expect(page).toHaveURL(/\/proposals\/proposal_/);
  await expect(page.getByText('Issued proposal package')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'E2E Proposal Package' })).toBeVisible();
  await expect(page.getByText('Cost summary')).toBeVisible();
});

test('project page covers local revision controls', async ({ page }) => {
  await page.goto('/projects/project_grand_hyatt_sample', { waitUntil: 'domcontentloaded' });

  await page.getByRole('tab', { name: 'versions' }).click();
  await expect(page.getByRole('heading', { name: 'Versions' })).toBeVisible();
  await page.getByRole('button', { name: 'Duplicate draft locally' }).click();
  await expect(page.getByText('Rev 02', { exact: true })).toBeVisible();
});

test('estimate grid spike renders spreadsheet, space tree, library tray, and click insertion', async ({ page }) => {
  await page.goto('/spikes/estimate-grid', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  await expect(page.getByRole('heading', { name: 'Estimate grid + library drag/drop' })).toBeVisible();
  await expect(page.getByText('Space-organized estimate sheet')).toBeVisible();
  await expect(page.getByText('Material library drag tray')).toBeVisible();
  await expect(page.getByTestId('space-tree')).toBeVisible();
  await expect(page.getByTestId('estimate-grid-spike')).toBeVisible();
  await expect(page.getByTestId('library-drag-tray')).toBeVisible();
  await page.getByLabel('Fallback insert row').fill('3');
  await page.getByRole('button', { name: 'Click insert first item' }).click();
  await expect(page.getByText('insertion line 4')).toBeVisible();
});

test('unknown project route renders the not-found page', async ({ page }) => {
  const response = await page.goto('/projects/does-not-exist', { waitUntil: 'domcontentloaded' });

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});
