import { test, type Page } from '@playwright/test';

const FOLDER = '../docs/screenshots';

/** Finished animations are fast-forwarded, so every picture shows the page at rest. */
async function capture(page: Page, name: string, fullPage: boolean) {
  await page.screenshot({ path: `${FOLDER}/${name}.png`, fullPage, animations: 'disabled' });
}

async function openHome(page: Page) {
  await page.goto('/');
  // The first free slots arrive with a request of their own.
  await page.getByText(/^Posti liberi aggiornati alle/).waitFor();
}

async function chooseFirstTime(page: Page, specialty: string, doctor: string) {
  await page.getByRole('link', { name: specialty }).click();
  await page.getByRole('link', { name: doctor }).click();
  const firstTime = page.getByRole('button', { name: /^\d{1,2}:\d{2}$/ }).first();
  await firstTime.waitFor();
  return firstTime;
}

async function fillDetails(page: Page) {
  await page.getByLabel('Nome e cognome').fill('Giulia Bianchi');
  await page.getByLabel('Email').fill('giulia.bianchi@example.com');
  await page.getByLabel('Telefono').fill('333 5550142');
}

test.describe('on a phone', () => {
  test.skip(({ isMobile }) => !isMobile);

  test('a patient books a visit', async ({ page }) => {
    await openHome(page);
    await capture(page, 'telefono-1-specialita', true);

    const firstTime = await chooseFirstTime(page, 'Cardiologia', 'Dott.ssa Elena Marchetti');
    // Not the whole page: the ticket waits at the bottom of the screen.
    await capture(page, 'telefono-2-orari', false);

    await firstTime.click();
    await fillDetails(page);
    await page.getByRole('button', { name: 'Conferma prenotazione' }).click();
    await page.getByRole('heading', { name: 'Prenotazione confermata' }).waitFor();
    await capture(page, 'telefono-3-conferma', true);
  });
});

test.describe('on a computer', () => {
  test.skip(({ isMobile }) => isMobile);

  test('the home page and a booking', async ({ page }) => {
    await openHome(page);
    await capture(page, 'computer-pagina-iniziale', false);

    await chooseFirstTime(page, 'Ortopedia', 'Dott. Luca Ferri');
    await capture(page, 'computer-prenotazione', true);
  });

  test('the waiting room screen', async ({ page }) => {
    // The size of a television, scaled down: the screen fills it exactly.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/sala');
    await page
      .getByRole('region', { name: /Ora tocca al numero|Nessuna chiamata per ora/ })
      .waitFor();
    await capture(page, 'computer-sala', false);
  });

  test('the staff area', async ({ page }) => {
    await page.goto('/segreteria');
    await page.getByLabel('Nome utente').fill('segreteria');
    await page.getByLabel('Password').fill('segreteria-demo');
    await page.getByRole('button', { name: 'Accedi' }).click();
    await page.getByRole('region', { name: 'Griglia del giorno' }).waitFor();
    await capture(page, 'computer-agenda', false);

    await page.getByRole('link', { name: 'Notifiche inviate' }).click();
    await page.getByRole('article').first().waitFor();
    await page.getByText('Testo dell’email').first().click();
    await capture(page, 'computer-notifiche', false);
  });
});
