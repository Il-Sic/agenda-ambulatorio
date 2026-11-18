import { devices, expect, test, type Page } from '@playwright/test';
import { expectNoAccessibilityViolations } from './accessibility';
import { clinicDay, signIn } from './journeys';

type Visit = {
  code: string;
  status: string;
  callNumber: number | null;
  patientName: string;
  patientEmail: string;
};

/**
 * A visit of today the desk can call, whatever the hour of the run: one still to come or missed,
 * which first needs its arrival, or else one already called, which is called again.
 */
async function visitToCall(page: Page): Promise<Visit | undefined> {
  const response = await page.request.get(`/api/v1/staff/day-plan?date=${clinicDay(new Date())}`);
  const plan = (await response.json()) as { doctors: { appointments: Visit[] }[] };
  const visits = plan.doctors.flatMap((doctor) => doctor.appointments);
  return (
    visits.find((visit) => visit.status === 'BOOKED' || visit.status === 'NO_SHOW') ??
    visits.find((visit) => visit.status === 'ARRIVED' && visit.callNumber !== null)
  );
}

test('the desk calls a patient: the screen shows the number and the phone says it is their turn', async ({
  page,
  browser,
  baseURL,
  isMobile,
}) => {
  test.skip(isMobile, 'The desk works on a computer; the patient’s phone is opened in this test.');
  await signIn(page, 'segreteria', 'segreteria-demo');
  const visit = await visitToCall(page);
  if (!visit) {
    test.skip(true, 'No visits today: the clinic is closed.');
    return;
  }

  // Found by the code, as when the patient reads it out at the desk.
  const search = page.getByLabel('Cerca paziente o codice');
  await search.fill(visit.code);
  await search.press('Enter');
  const panel = page.getByRole('region', { name: visit.patientName });
  if (visit.status !== 'ARRIVED') {
    await panel.getByRole('button', { name: `Segna arrivato: ${visit.patientName}` }).click();
    await expect(page.getByRole('status')).toContainText(
      `Arrivo registrato: ${visit.patientName} ha il numero`,
    );
  }
  await panel
    .getByRole('button', { name: new RegExp(`^Chiama (in sala|di nuovo): ${visit.patientName}$`) })
    .click();
  const called = page.getByRole('status');
  await expect(called).toContainText(/^Numero \d+ chiamato/);
  const number = /Numero (\d+)/.exec((await called.textContent()) ?? '')?.[1] ?? '';

  // The screen of the waiting room: nobody signs in, and no name is on it.
  const screen = await page.context().newPage();
  await screen.goto('/sala');
  const now = screen.getByRole('region', { name: 'Ora tocca al numero' });
  await expect(now).toContainText(number);
  await expect(screen.getByRole('main')).not.toContainText(visit.patientName);
  await expectNoAccessibilityViolations(screen);

  // The patient's own phone, with the booking open.
  const phone = await browser.newContext({ ...devices['Pixel 7'], baseURL, locale: 'it-IT' });
  const patient = await phone.newPage();
  await patient.goto('/prenotazione');
  await patient.getByLabel('Codice di prenotazione').fill(visit.code);
  await patient.getByLabel('Email').fill(visit.patientEmail);
  await patient.getByRole('button', { name: 'Cerca prenotazione' }).click();
  const turn = patient.getByRole('alert');
  await expect(turn).toContainText('È il tuo turno');
  await expect(turn).toContainText(number);
  await expectNoAccessibilityViolations(patient);
  await phone.close();
});
