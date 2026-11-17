import { defineConfig, devices } from '@playwright/test';

/** Takes the pictures used in the README: `npm run screenshots` with the stack running. */
export default defineConfig({
  testDir: './screenshots',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    locale: 'it-IT',
  },
  projects: [
    {
      name: 'computer',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    { name: 'telefono', use: { ...devices['Pixel 7'] } },
  ],
});
