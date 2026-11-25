import { expect, test } from '@playwright/test';

test('production build boots, registers the service worker and supports offline navigation', async ({ page, context }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Form Fitness');
  await expect(page.getByRole('heading', { name: 'Workouts' })).toBeVisible();
  await expect(page.locator('.program-card')).toHaveCount(5);

  const manifest = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest');
    return response.ok ? response.json() : null;
  });
  expect(manifest?.name).toBe('Form Fitness');
  expect(manifest?.icons?.length).toBeGreaterThan(0);
  const icons = await Promise.all(
    manifest.icons.map(async (icon: { src: string }) => {
      const response = await page.request.get(icon.src);
      return response.ok();
    }),
  );
  expect(icons.every(Boolean)).toBe(true);

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Workouts' })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Workouts' })).toBeVisible();
  await context.setOffline(false);
});
