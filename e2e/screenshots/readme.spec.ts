import { test, type Page } from '@playwright/test';

const FOLDER = '../docs/screenshots';

async function capture(page: Page, name: string, fullPage: boolean) {
  await page.screenshot({ path: `${FOLDER}/${name}.png`, fullPage, animations: 'disabled' });
}

async function openBooking(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cardiologia' }).waitFor();
}

test.describe('on a phone', () => {
  test.skip(({ isMobile }) => !isMobile);

  test('a patient books a visit', async ({ page }) => {
    await openBooking(page);
    await capture(page, 'telefono-1-specialita', true);

    await page.getByRole('button', { name: 'Cardiologia' }).click();
    await page.getByRole('button', { name: 'Dott.ssa Elena Marchetti' }).click();
    const firstTime = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first();
    await firstTime.waitFor();
    await capture(page, 'telefono-2-orari', true);

    await firstTime.click();
    await page.getByLabel('Nome e cognome').fill('Giulia Bianchi');
    await page.getByLabel('Email').fill('giulia.bianchi@example.com');
    await page.getByLabel('Telefono').fill('333 5550142');
    await page.getByRole('button', { name: 'Conferma prenotazione' }).click();
    await page.getByRole('heading', { name: 'Prenotazione confermata' }).waitFor();
    await capture(page, 'telefono-3-conferma', true);
  });
});

test.describe('on a computer', () => {
  test.skip(({ isMobile }) => isMobile);

  test('the booking page', async ({ page }) => {
    await openBooking(page);
    await page.getByRole('button', { name: 'Ortopedia' }).click();
    await page.getByRole('button', { name: 'Dott. Luca Ferri' }).click();
    await page
      .getByRole('button', { name: /^\d{2}:\d{2}$/ })
      .first()
      .waitFor();
    await capture(page, 'computer-prenotazione', true);
  });

  test('the staff area', async ({ page }) => {
    await page.goto('/segreteria');
    await page.getByLabel('Nome utente').fill('segreteria');
    await page.getByLabel('Password').fill('segreteria-demo');
    await page.getByRole('button', { name: 'Accedi' }).click();
    await page.getByRole('region').first().waitFor();
    await capture(page, 'computer-agenda', false);

    await page.getByRole('link', { name: 'Notifiche inviate' }).click();
    await page.getByRole('article').first().waitFor();
    await page.getByText('Testo dell’email').first().click();
    await capture(page, 'computer-notifiche', false);
  });
});
