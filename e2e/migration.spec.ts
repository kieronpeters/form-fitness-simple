import { expect, test } from '@playwright/test';

const legacyState = {
  state: {
    profile: { unitSystem: 'imperial' },
    customExercises: [],
    programs: [
      {
        id: 'legacy-program',
        name: 'Legacy Upper Day',
        description: 'An older custom workout',
        isExample: false,
        days: [
          {
            id: 'legacy-day',
            name: 'Upper',
            focus: 'Chest and arms',
            exercises: [
              { id: 'legacy-pe', exerciseId: 'bench-press', sets: 3, repsMin: 8, repsMax: 10, restSec: 90 },
            ],
          },
        ],
      },
      {
        id: 'legacy-example',
        name: 'Old Example',
        isExample: true,
        days: [],
      },
    ],
    sessions: [
      {
        id: 'legacy-session',
        name: 'Legacy Upper Day',
        programId: 'legacy-program',
        programDayId: 'legacy-day',
        startedAt: '2025-01-01T10:00:00.000Z',
        completedAt: '2025-01-01T11:00:00.000Z',
        status: 'completed',
        isSample: false,
        exercises: [
          {
            id: 'legacy-se',
            exerciseId: 'bench-press',
            targetSets: 3,
            targetRepsMin: 8,
            targetRepsMax: 10,
            sets: [{ weightKg: 50, reps: 10, type: 'normal' }],
          },
        ],
      },
      {
        id: 'legacy-sample',
        name: 'Demo session',
        startedAt: '2025-01-02T10:00:00.000Z',
        completedAt: '2025-01-02T11:00:00.000Z',
        status: 'completed',
        isSample: true,
        exercises: [],
      },
    ],
  },
  version: 1,
};

test('migrates legacy Form Fitness programmes and sessions, excludes samples and keeps a backup', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((legacy) => {
    window.localStorage.setItem('form-fitness-app-v1', JSON.stringify(legacy));
    window.localStorage.removeItem('form-fitness-workout-v1');
    window.localStorage.removeItem('form-fitness-legacy-backup-v1');
  }, legacyState);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Workouts' })).toBeVisible();
  await expect(page.getByText('Legacy Upper Day', { exact: true })).toBeVisible();
  await expect(page.locator('.program-card')).toHaveCount(6);
  await page.goto('/history');
  await expect(page.locator('.history-card')).toHaveCount(1);
  await expect(page.getByText('Legacy Upper Day')).toBeVisible();

  await page.goto('/settings');
  await expect(page.getByText('lb, minutes/seconds')).toBeVisible();
  await page.getByText('Backup & Restore').click();
  await expect(page.getByRole('button', { name: /Download legacy backup/ })).toBeVisible();
});
