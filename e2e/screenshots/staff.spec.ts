import { test, type Page } from '@playwright/test';

const FOLDER = '../docs/screenshots';

async function capture(page: Page, name: string, projectName: string) {
  await page.screenshot({
    path: `${FOLDER}/${name}-${projectName}.png`,
    fullPage: true,
    animations: 'disabled',
  });
}

test('staff area', async ({ page }, testInfo) => {
  const project = testInfo.project.name;

  await page.goto('/segreteria');
  await page.getByLabel('Nome utente').fill('admin');
  await page.getByLabel('Password').fill('admin-demo');
  await page.getByRole('button', { name: 'Accedi' }).click();
  await page.getByRole('region').first().waitFor();
  await capture(page, 'segreteria-1-agenda', project);

  await page.getByRole('link', { name: 'Orari dei medici' }).click();
  await page
    .getByRole('button', { name: /^Rimuovi/ })
    .first()
    .waitFor();
  await capture(page, 'segreteria-2-orari', project);

  await page.getByRole('link', { name: 'Notifiche inviate' }).click();
  await page.getByRole('article').first().waitFor();
  await page.getByText('Testo dell’email').first().click();
  await capture(page, 'segreteria-3-notifiche', project);
});
