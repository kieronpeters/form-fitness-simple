import { expect, test, type Page } from '@playwright/test';

async function startPush(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Start Day 1/ }).click();
  await expect(page).toHaveURL(/\/session$/);
  await expect(page.locator('.workout-activity')).toHaveCount(8);
}

async function fillBench(page: Page, firstReps = '10', firstWeight = '60', secondReps = '10', secondWeight = '60') {
  const bench = page.locator('.workout-activity').filter({ hasText: 'Bench Press' }).first();
  await bench.getByLabel('Set 1 reps').fill(firstReps);
  await bench.getByLabel('Set 1 weight').fill(firstWeight);
  await bench.getByLabel('Set 2 reps').fill(secondReps);
  await bench.getByLabel('Set 2 weight').fill(secondWeight);
}

async function finish(page: Page) {
  await page.getByRole('button', { name: /Finish & Save Workout/ }).click();
  await expect(page.getByText('WORKOUT COMPLETE')).toBeVisible();
}

test('logs a workout, shows PR feedback, history and real statistics', async ({ page }) => {
  await startPush(page);
  await fillBench(page);
  await expect(page.getByText('Bench Press').first()).toBeVisible();
  await finish(page);
  await expect(page.getByText('1200 kg')).toBeVisible();
  await expect(page.getByText('NEW PERSONAL RECORDS')).toBeVisible();
  await expect(page.getByText('Bench Press', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'View workout details' }).click();
  await expect(page.getByRole('heading', { name: 'Workout Details' })).toBeVisible();
  await expect(page.getByText('2 sets · 10 / 10 reps · 60 kg')).toBeVisible();

  await page.goto('/statistics');
  await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('1,200 kg')).toBeVisible();
  await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('20', { exact: true })).toBeVisible();
  await expect(page.getByText('Bench Press', { exact: true })).toBeVisible();

  await page.goto('/');
  await expect(page.getByText('Last completed')).toBeVisible();
});

test('prefills the last performance and leaves the target visible', async ({ page }) => {
  await startPush(page);
  await fillBench(page, '12', '42.5', '10', '42.5');
  await finish(page);
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: /Start Day 1/ }).click();

  const bench = page.locator('.workout-activity').filter({ hasText: 'Bench Press' }).first();
  await expect(bench.getByLabel('Set 1 reps')).toHaveValue('12');
  await expect(bench.getByLabel('Set 1 weight')).toHaveValue('42.5');
  await expect(bench.getByText('3 × 8–10')).toBeVisible();
  await expect(bench.getByText(/Last: 2 sets/)).toBeVisible();
});

test('supports per-set add/remove during an active workout', async ({ page }) => {
  await startPush(page);
  const bench = page.locator('.workout-activity').filter({ hasText: 'Bench Press' }).first();
  await expect(bench.locator('.set-row')).toHaveCount(3);
  await bench.getByRole('button', { name: 'Add Set' }).click();
  await expect(bench.locator('.set-row')).toHaveCount(4);
  await bench.getByLabel('Remove set 4').click();
  await expect(bench.locator('.set-row')).toHaveCount(3);
});

test('edits and deletes history without changing its timestamps or duration', async ({ page }) => {
  await startPush(page);
  await fillBench(page);
  await finish(page);
  await page.getByRole('button', { name: 'View workout details' }).click();
  await expect(page.getByText('1 sec')).toBeVisible();
  const metaBefore = await page.locator('.detail-meta').innerText();

  await page.getByRole('button', { name: 'Edit workout values' }).click();
  await page.getByLabel('Set 1 reps').fill('11');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Workout values updated.')).toBeVisible();
  expect(await page.locator('.detail-meta').innerText()).toBe(metaBefore);
  await expect(page.getByText('11 / 10 reps')).toBeVisible();

  await page.goto('/history');
  await expect(page.locator('.history-card')).toHaveCount(1);
  await page.locator('.history-card').click();
  await page.getByRole('button', { name: 'Delete workout' }).click();
  await page.getByRole('button', { name: 'Delete workout' }).last().click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByText('No workouts logged yet')).toBeVisible();
});

test('creates, renames and deletes a workout programme', async ({ page }) => {
  await page.goto('/workouts/new');
  await page.getByLabel('Workout title').fill('Test Day');
  await page.getByLabel('Description').fill('Chest · arms');
  await page.getByRole('button', { name: 'Add Activity' }).click();
  await page.locator('.picker-row').filter({ hasText: 'Bench Press' }).click();
  await page.getByRole('button', { name: 'Save Workout' }).click();
  await expect(page.getByText('Test Day', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'More actions for Test Day' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByLabel('Workout title').fill('Test Day Renamed');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Test Day Renamed', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'More actions for Test Day Renamed' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete programme' }).click();
  await expect(page.getByText('Test Day Renamed', { exact: true })).toHaveCount(0);
});

test('creates and deletes a custom activity', async ({ page }) => {
  await page.goto('/activities/new');
  await page.getByLabel('Activity name').fill('Cable Row Test');
  await page.getByLabel('Muscle group').selectOption('Back');
  await page.getByRole('button', { name: 'Save Activity' }).click();
  await expect(page.getByText('Cable Row Test')).toBeVisible();

  await page.locator('.activity-card').filter({ hasText: 'Cable Row Test' }).click();
  await page.getByRole('button', { name: 'Delete activity' }).click();
  await page.getByRole('button', { name: 'Delete activity' }).last().click();
  await expect(page).toHaveURL(/\/activities$/);
  await expect(page.getByText('Cable Row Test')).toHaveCount(0);
});

test('exports and restores a backup', async ({ page }) => {
  await page.goto('/settings');
  await page.getByText('Backup & Restore').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export backup/ }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.goto('/activities/new');
  await page.getByLabel('Activity name').fill('Temporary activity');
  await page.getByRole('button', { name: 'Save Activity' }).click();
  await expect(page.getByText('Temporary activity')).toBeVisible();

  await page.goto('/settings');
  await page.getByText('Backup & Restore').click();
  await page.locator('input[type=file]').setInputFiles(path!);
  await expect(page.getByText('Import this backup?')).toBeVisible();
  await page.getByRole('button', { name: 'Replace with backup' }).click();
  await page.getByText('Backup restored.').waitFor();
  await page.goto('/activities');
  await expect(page.getByText('Temporary activity')).toHaveCount(0);
});

test('switches units and shows the stored setting', async ({ page }) => {
  await page.goto('/settings');
  await page.getByText('Units', { exact: true }).click();
  await page.getByRole('button', { name: /lb · mph/ }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('lb, minutes/seconds')).toBeVisible();
});

test('contains exactly the four primary tabs and no obsolete features', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav.getByRole('link')).toHaveCount(4);
  for (const label of ['Workouts', 'History', 'Activities', 'Stats']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible();
  }
  await expect(page.getByText('Calendar')).toHaveCount(0);
  await expect(page.getByText('Nutrition')).toHaveCount(0);
  await expect(page.getByText('Training Circle')).toHaveCount(0);
  await expect(page.getByText('Goals')).toHaveCount(0);
});
