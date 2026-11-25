import { expect, test } from '@playwright/test';

test('the four-tab app boots with the five seeded programmes', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Form Fitness');
  await expect(page.getByRole('heading', { name: 'Workouts' })).toBeVisible();
  await expect(page.locator('.program-card')).toHaveCount(5);
  await expect(page.locator('.program-card').first().getByText('8 Activities')).toBeVisible();
  await expect(page.getByText('Day 1 – Push')).toBeVisible();
  await expect(page.getByText('Day 5 – Lower (Volume)')).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(nav.getByRole('link', { name: 'Workouts' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'History' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Activities' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Stats' })).toBeVisible();
  await expect(page.getByText('Nutrition')).toHaveCount(0);
  await expect(page.getByText('Calendar')).toHaveCount(0);
});

test('activities contain only the seeded library plus Treadmill and Back Stretches', async ({ page }) => {
  await page.goto('/activities');
  await expect(page.getByRole('heading', { name: 'Activities' })).toBeVisible();
  await expect(page.locator('.activity-card')).toHaveCount(22);
  await expect(page.getByText('Bench Press', { exact: true })).toBeVisible();
  await expect(page.getByText('Treadmill', { exact: true })).toBeVisible();
  await expect(page.getByText('Back Stretches', { exact: true })).toBeVisible();

  await page.getByLabel('Search activities').fill('treadmill');
  await expect(page.locator('.activity-card')).toHaveCount(1);
  await page.getByLabel('Search activities').fill('');
  await page.getByRole('button', { name: 'Legs', exact: true }).click();
  await expect(page.getByText('Hack Squat', { exact: true })).toBeVisible();
  await expect(page.getByText('Bench Press', { exact: true })).toHaveCount(0);
});

test('statistics start empty with no fabricated numbers', async ({ page }) => {
  await page.goto('/statistics');
  await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();
  await expect(page.getByText('Workouts Completed')).toBeVisible();
  await expect(page.getByText('0', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Complete a workout to start building personal records, streaks and training totals.')).toBeVisible();
  await expect(page.getByText('125')).toHaveCount(0);
  await expect(page.getByText('86h 34m')).toHaveCount(0);
});

test('history starts empty and settings expose backup controls', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'Workout History' })).toBeVisible();
  await expect(page.getByText('No workouts logged yet')).toBeVisible();

  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByText('Backup & Restore')).toBeVisible();
  await expect(page.getByText('Data Management')).toBeVisible();
  await expect(page.getByText('Units')).toBeVisible();
});
