import { expect, test } from '@playwright/test';
import { expectNoAccessibilityViolations } from './accessibility';

test('a patient books a visit and finds it again with the code', async ({ page }, testInfo) => {
  // A different patient for every run and every project.
  const email = `paola.verdi.${String(Date.now())}.${testInfo.project.name}@example.com`;

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Prenota una visita' })).toBeVisible();
  await expectNoAccessibilityViolations(page);

  await page.getByRole('button', { name: 'Ortopedia' }).click();
  await page.getByRole('button', { name: 'Dott. Luca Ferri' }).click();

  const firstFreeTime = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first();
  await expect(firstFreeTime).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await firstFreeTime.click();

  await page.getByLabel('Nome e cognome').fill('Paola Verdi');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Telefono').fill('333 5550199');
  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Conferma prenotazione' }).click();

  await expect(page.getByRole('heading', { name: 'Prenotazione confermata' })).toBeVisible();
  const slip = page.getByRole('region', { name: 'Promemoria della visita' });
  await expect(slip).toContainText('Ortopedia');
  await expect(slip).toContainText('Dott. Luca Ferri');
  await expect(slip).toContainText('Confermata');
  const code = (await slip.locator('dd').first().innerText()).trim();
  expect(code).toMatch(/^[A-Z2-9]{8}$/);
  await expectNoAccessibilityViolations(page);

  await page.getByRole('link', { name: 'Gestisci la prenotazione' }).click();
  await page.getByLabel('Codice di prenotazione').fill(code.toLowerCase());
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Cerca prenotazione' }).click();

  await expect(page.getByRole('region', { name: 'Promemoria della visita' })).toContainText(code);
  await expect(page.getByRole('button', { name: 'Annulla prenotazione' })).toBeVisible();
});

test('the browser back button undoes the last step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cardiologia' }).click();
  await page.getByRole('button', { name: 'Dott.ssa Elena Marchetti' }).click();
  await expect(page.getByRole('group', { name: 'Giorno' })).toBeVisible();

  await page.goBack();

  await expect(page.getByRole('button', { name: 'Dott.ssa Elena Marchetti' })).toBeVisible();
});

test('a booking cannot be opened with the wrong e-mail', async ({ page }) => {
  await page.goto('/prenotazione');
  await page.getByLabel('Codice di prenotazione').fill('DEMO0001');
  await page.getByLabel('Email').fill('non.sono.io@example.com');
  await page.getByRole('button', { name: 'Cerca prenotazione' }).click();

  await expect(page.getByRole('alert')).toContainText('Non troviamo una prenotazione');
});
