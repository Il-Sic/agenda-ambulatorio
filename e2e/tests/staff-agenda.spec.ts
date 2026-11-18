import { expect, test, type Page } from '@playwright/test';
import { expectNoAccessibilityViolations } from './accessibility';
import { bookFirstFreeVisit, clinicDay, signIn, uniquePatient } from './journeys';

// The agenda also has a field called "Giorno": wait for the new page before filling anything.
async function openClosures(page: Page) {
  await page.getByRole('link', { name: 'Giorni di chiusura' }).click();
  await expect(page.getByRole('heading', { name: 'Giorni di chiusura', level: 1 })).toBeVisible();
}

test('the staff cancel a visit and the patient is told by e-mail', async ({ page }, testInfo) => {
  const patient = uniquePatient('Rita', testInfo.project.name);
  const booking = await bookFirstFreeVisit(page, 'Pediatria', 'Dott.ssa Marta Gentile', patient);

  await signIn(page, 'segreteria', 'segreteria-demo');
  const sessionCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'JSESSIONID',
  );
  expect(sessionCookie?.httpOnly, 'JavaScript must not be able to read the session').toBe(true);
  expect(sessionCookie?.sameSite).toBe('Lax');

  await page.goto(`/segreteria?giorno=${clinicDay(booking.startsAt)}`);
  const doctor = page.getByRole('region', { name: 'Dott.ssa Marta Gentile' });
  const visit = doctor.getByRole('button', { name: new RegExp(patient.name) });
  await expect(visit).toContainText('In attesa');
  await expectNoAccessibilityViolations(page);

  await visit.click();
  const details = page.getByRole('region', { name: patient.name });
  await expect(details).toContainText(booking.code);
  await details.getByRole('button', { name: `Annulla visita: ${patient.name}` }).click();
  await details.getByRole('button', { name: 'Sì, annulla la visita' }).click();
  await expect(page.getByRole('region', { name: 'Annullate' })).toContainText(patient.name);
  await expect(visit).toHaveCount(0);

  // The cancellation becomes an event, goes through Kafka and comes back as an e-mail.
  await page.getByRole('link', { name: 'Notifiche inviate' }).click();
  const emails = page.getByRole('article').filter({ hasText: patient.email });
  await expect(
    emails.filter({ hasText: `Prenotazione annullata - codice ${booking.code}` }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    emails.filter({ hasText: `Prenotazione confermata - codice ${booking.code}` }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test('an admin closes a day and reopens it; staff can only look', async ({ page }) => {
  // A day far in the future that no other run is likely to pick.
  const day = new Date(Date.UTC(2031, 0, 1));
  day.setUTCDate(day.getUTCDate() + Math.floor(Math.random() * 3000));
  const isoDay = day.toISOString().slice(0, 10);
  const reason = `Chiusura di prova ${isoDay}`;

  await signIn(page, 'admin', 'admin-demo');
  await openClosures(page);
  await page.getByLabel('Giorno').fill(isoDay);
  await page.getByLabel('Motivo').fill(reason);
  await page.getByRole('button', { name: 'Aggiungi chiusura' }).click();
  const closure = page.getByRole('listitem').filter({ hasText: reason });
  await expect(closure).toBeVisible();
  await expectNoAccessibilityViolations(page);

  await page.getByRole('button', { name: 'Esci' }).click();
  await signIn(page, 'segreteria', 'segreteria-demo');
  await openClosures(page);
  await expect(closure).toBeVisible();
  await expect(page.getByText('Solo la direzione può modificare le chiusure.')).toBeVisible();
  await expect(closure.getByRole('button')).toHaveCount(0);

  await page.getByRole('button', { name: 'Esci' }).click();
  await signIn(page, 'admin', 'admin-demo');
  await openClosures(page);
  await closure.getByRole('button', { name: /^Riapri/ }).click();
  await expect(closure).toHaveCount(0);
});

test('the staff area is closed to visitors who have not signed in', async ({ page }) => {
  await page.goto('/segreteria/notifiche');

  await expect(page.getByRole('heading', { name: 'Accesso segreteria' })).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test('keyboard focus stays visible on the dark header of the staff area', async ({ page }) => {
  await signIn(page, 'segreteria', 'segreteria-demo');
  const link = page.getByRole('link', { name: 'Orari dei medici' });

  // Reach the link the way a keyboard user does, so the browser shows its focus ring.
  for (let presses = 0; presses < 12; presses++) {
    await page.keyboard.press('Tab');
    if (await link.evaluate((element) => element === document.activeElement)) {
      break;
    }
  }
  await expect(link).toBeFocused();

  const colours = await link.evaluate((element) => {
    const style = getComputedStyle(element);
    const header = element.closest('header');
    return {
      ringStyle: style.outlineStyle,
      ring: style.outlineColor,
      background: header ? getComputedStyle(header).backgroundColor : '',
    };
  });
  expect(colours.ringStyle).not.toBe('none');
  expect(colours.ring).not.toBe(colours.background);
});
