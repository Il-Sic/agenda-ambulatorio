import { test, type Page } from '@playwright/test';

const FOLDER = '../docs/screenshots';

async function capture(page: Page, name: string, projectName: string) {
  await page.screenshot({
    path: `${FOLDER}/${name}-${projectName}.png`,
    fullPage: true,
    animations: 'disabled',
  });
}

test('patient journey', async ({ page }, testInfo) => {
  const project = testInfo.project.name;

  await page.goto('/');
  await page.getByRole('button', { name: 'Cardiologia' }).waitFor();
  await capture(page, 'paziente-1-specialita', project);

  await page.getByRole('button', { name: 'Cardiologia' }).click();
  await page.getByRole('button', { name: 'Dott.ssa Elena Marchetti' }).click();
  await page
    .getByRole('button', { name: /^\d{2}:\d{2}$/ })
    .first()
    .waitFor();
  await capture(page, 'paziente-2-orari', project);

  await page
    .getByRole('button', { name: /^\d{2}:\d{2}$/ })
    .first()
    .click();
  await page.getByLabel('Nome e cognome').fill('Giulia Bianchi');
  await page.getByLabel('Email').fill('giulia.bianchi@example.com');
  await page.getByLabel('Telefono').fill('333 5550142');
  await capture(page, 'paziente-3-dati', project);

  await page.getByRole('button', { name: 'Conferma prenotazione' }).click();
  await page.getByRole('heading', { name: 'Prenotazione confermata' }).waitFor();
  await capture(page, 'paziente-4-conferma', project);
});
