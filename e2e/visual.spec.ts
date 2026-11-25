import { expect, test } from '@playwright/test';

const roots = [
  { path: '/', heading: 'Workouts' },
  { path: '/history', heading: 'Workout History' },
  { path: '/activities', heading: 'Activities' },
  { path: '/statistics', heading: 'Statistics' },
];

test('all four tabs render without console errors or horizontal overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of roots) {
    await page.goto(route.path);
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `${route.path} should not overflow horizontally`).toBe(false);
  }
  expect(errors).toEqual([]);
});

test('desktop layout stays compact and centred', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Workouts' })).toBeVisible();
  const frame = await page.locator('.app-frame').boundingBox();
  expect(frame?.width).toBeLessThanOrEqual(560);
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
});

test('active workout uses one continuous screen with a single finish action', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Start Day 1/ }).click();
  await expect(page.locator('.workout-activity')).toHaveCount(8);
  await expect(page.getByRole('button', { name: /Finish & Save Workout/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Next Activity/ })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(0);
});
