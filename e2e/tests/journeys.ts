import { expect, type Page } from '@playwright/test';

type Patient = { name: string; email: string };

/** Books the first free slot of a doctor through the patient pages. */
export async function bookFirstFreeVisit(
  page: Page,
  specialty: string,
  doctor: string,
  patient: Patient,
): Promise<{ code: string; startsAt: string }> {
  await page.goto('/');
  await page.getByRole('button', { name: specialty }).click();
  await page.getByRole('button', { name: doctor }).click();
  await page
    .getByRole('button', { name: /^\d{2}:\d{2}$/ })
    .first()
    .click();
  await page.getByLabel('Nome e cognome').fill(patient.name);
  await page.getByLabel('Email').fill(patient.email);
  await page.getByLabel('Telefono').fill('333 5550199');

  const booked = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/bookings') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Conferma prenotazione' }).click();
  const booking = (await (await booked).json()) as { code: string; startsAt: string };
  await expect(page.getByRole('heading', { name: 'Prenotazione confermata' })).toBeVisible();
  return booking;
}

export async function signIn(page: Page, username: string, password: string) {
  await page.goto('/segreteria');
  await expect(page.getByRole('heading', { name: 'Accesso segreteria' })).toBeVisible();
  await page.getByLabel('Nome utente').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
}

/** The calendar day at the clinic, as YYYY-MM-DD. */
export function clinicDay(instant: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(instant));
}

/** A name nobody else in the database has, so a test can find its own patient. */
export function uniquePatient(firstName: string, projectName: string): Patient {
  const stamp = `${String(Date.now())}${projectName}`;
  return {
    name: `${firstName} Prova ${stamp.slice(-9)}`,
    email: `${firstName.toLowerCase()}.${stamp}@example.com`,
  };
}
