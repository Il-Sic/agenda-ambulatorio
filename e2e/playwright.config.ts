import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests drive a real browser against the whole stack started by
 * `docker compose up` (nginx, backend, PostgreSQL, Kafka) with its demo data.
 */
export default defineConfig({
  testDir: './tests',
  // Tests book real slots in a shared database, so they take turns.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    locale: 'it-IT',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'computer', use: { ...devices['Desktop Chrome'] } },
    // Patients book from their phone: the same journeys run on a phone-sized screen.
    { name: 'telefono', use: { ...devices['Pixel 7'] } },
  ],
});
