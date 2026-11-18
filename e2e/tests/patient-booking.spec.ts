import { expect, test } from '@playwright/test';
import { expectNoAccessibilityViolations } from './accessibility';

test('a patient books a visit and finds it again with the code', async ({ page }, testInfo) => {
  // A different patient for every run and every project.
  const email = `paola.verdi.${String(Date.now())}.${testInfo.project.name}@example.com`;

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Segui la linea.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ortopedia' })).toHaveAccessibleDescription(
    /^Dott\.ssa Colonna, Dott\. Ferri Primo posto libero /,
  );
  await expectNoAccessibilityViolations(page);

  await page.getByRole('link', { name: 'Ortopedia' }).click();
  await page.getByRole('link', { name: 'Dott. Luca Ferri' }).click();

  const firstFreeTime = page.getByRole('button', { name: /^\d{1,2}:\d{2}$/ }).first();
  await expect(firstFreeTime).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await firstFreeTime.click();

  await page.getByLabel('Nome e cognome').fill('Paola Verdi');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Telefono').fill('333 5550199');
  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Conferma prenotazione' }).click();

  await expect(page.getByRole('heading', { name: 'Prenotazione confermata' })).toBeVisible();
  const ticket = page.getByRole('region', { name: 'Tagliando della visita' });
  await expect(ticket).toContainText('Ortopedia');
  await expect(ticket).toContainText('Dott. Luca Ferri');
  await expect(ticket).toContainText('Paola Verdi');
  const code = (await ticket.locator('dt:text-is("Codice") + dd').innerText()).trim();
  expect(code).toMatch(/^[A-Z2-9]{8}$/);
  await expectNoAccessibilityViolations(page);

  // From the confirmation, the booking opens without typing anything.
  await page.getByRole('link', { name: 'Gestisci la prenotazione' }).click();
  await expect(page.getByRole('region', { name: 'Tagliando della visita' })).toContainText(code);
  await expect(page.getByRole('region', { name: 'Tagliando della visita' })).toContainText(
    'Confermata',
  );
  await expect(page.getByRole('button', { name: 'Annulla prenotazione' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aggiungi al calendario' })).toHaveAttribute(
    'download',
    `visita-${code}.ics`,
  );

  // Another time with the same doctor: the code stays, the old time is given up only now.
  await page.getByRole('button', { name: 'Sposta la visita' }).click();
  await page
    .getByRole('button', { name: /^\d{1,2}:\d{2}$/ })
    .last()
    .click();
  await page.getByRole('button', { name: 'Sì, sposta la visita' }).click();
  await expect(page.getByRole('status')).toContainText('Visita spostata');
  await expect(page.getByRole('region', { name: 'Tagliando della visita' })).toContainText(code);
  await expectNoAccessibilityViolations(page);

  // Anyone with the code, typed in any case, and the e-mail finds it again.
  await page.getByRole('button', { name: 'Cerca un’altra prenotazione' }).click();
  await page.getByLabel('Codice di prenotazione').fill(code.toLowerCase());
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Cerca prenotazione' }).click();
  await expect(page.getByRole('region', { name: 'Tagliando della visita' })).toContainText(code);
  await expectNoAccessibilityViolations(page);
});

test('the browser back button undoes the last step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Cardiologia' }).click();
  await page.getByRole('link', { name: 'Dott.ssa Elena Marchetti' }).click();
  await expect(page.getByRole('group', { name: 'Giorno' })).toBeVisible();

  await page.goBack();

  await expect(page.getByRole('link', { name: 'Dott.ssa Elena Marchetti' })).toBeVisible();
});

test('a booking cannot be opened with the wrong e-mail', async ({ page }) => {
  await page.goto('/prenotazione');
  await page.getByLabel('Codice di prenotazione').fill('DEMO0001');
  await page.getByLabel('Email').fill('non.sono.io@example.com');
  await page.getByRole('button', { name: 'Cerca prenotazione' }).click();

  await expect(page.getByRole('alert')).toContainText('Non troviamo una prenotazione');
});
