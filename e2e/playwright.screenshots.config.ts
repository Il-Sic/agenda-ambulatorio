import { defineConfig, devices } from '@playwright/test';

/** Takes the pictures used in the README: `npm run screenshots` with the stack running. */
export default defineConfig({
  testDir: './screenshots',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    locale: 'it-IT',
    // Native date and time fields follow the language of the browser itself, not of the page,
    // and only the full Chromium build ships languages other than English.
    channel: 'chromium',
    launchOptions: { args: ['--lang=it-IT'] },
  },
  // The phone goes first: the booking it makes then appears in the staff pages.
  projects: [
    { name: 'telefono', use: { ...devices['Pixel 7'] } },
    {
      name: 'computer',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } },
    },
  ],
});
