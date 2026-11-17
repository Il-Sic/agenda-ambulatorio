import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, test } from 'vitest';
import { renderApp } from '../test/render';
import { server } from '../test/server';
import { DOCTORS, problem, signedInAs } from '../test/staff';

// 12 January 2026 is in the past: outcomes can be recorded. 15 February 2099 is in the future.
const PAST_DAY = '2026-01-12';
const FUTURE_DAY = '2099-02-16';

function visit(overrides: object) {
  return {
    id: 1,
    code: 'ABCD2345',
    doctorId: 2,
    doctorName: 'Dott.ssa Elena Marchetti',
    startsAt: '2026-01-12T08:00:00Z',
    endsAt: '2026-01-12T08:30:00Z',
    status: 'BOOKED',
    patientName: 'Giulia Bianchi',
    patientEmail: 'giulia.bianchi@example.com',
    patientPhone: '333 5550101',
    ...overrides,
  };
}

beforeEach(() => {
  signedInAs('STAFF');
  server.use(http.get('*/api/v1/staff/doctors', () => HttpResponse.json(DOCTORS)));
});

test('shows the visits of the day under each doctor, in order of time', async () => {
  let requestedDate: string | null = null;
  server.use(
    http.get('*/api/v1/staff/agenda', ({ request }) => {
      requestedDate = new URL(request.url).searchParams.get('date');
      return HttpResponse.json([
        visit({ id: 1 }),
        visit({
          id: 2,
          doctorId: 6,
          doctorName: 'Dott. Luca Ferri',
          startsAt: '2026-01-12T09:00:00Z',
          patientName: 'Marco Conti',
          status: 'ARRIVED',
        }),
      ]);
    }),
  );

  renderApp(`/segreteria?giorno=${PAST_DAY}`);

  expect(await screen.findByRole('heading', { name: 'lunedì 12 gennaio 2026' })).toBeVisible();
  const marchetti = await screen.findByRole('region', { name: 'Dott.ssa Elena Marchetti' });
  expect(within(marchetti).getByText('09:00')).toBeVisible();
  expect(within(marchetti).getByText('Giulia Bianchi')).toBeVisible();
  expect(within(marchetti).getByText('333 5550101')).toBeVisible();
  expect(within(marchetti).getByText('In attesa')).toBeVisible();
  const ferri = screen.getByRole('region', { name: 'Dott. Luca Ferri' });
  expect(within(ferri).getByText('10:00')).toBeVisible();
  expect(within(ferri).getByText('Arrivato')).toBeVisible();
  expect(requestedDate).toBe(PAST_DAY);
});

test('records that a patient has arrived', async () => {
  let arrived = false;
  server.use(
    http.get('*/api/v1/staff/agenda', () =>
      HttpResponse.json([visit({ status: arrived ? 'ARRIVED' : 'BOOKED' })]),
    ),
    http.post('*/api/v1/staff/appointments/1/arrival', () => {
      arrived = true;
      return HttpResponse.json(visit({ status: 'ARRIVED' }));
    }),
  );
  const { user } = renderApp(`/segreteria?giorno=${PAST_DAY}`);

  await user.click(await screen.findByRole('button', { name: 'Segna arrivato: Giulia Bianchi' }));

  expect(await screen.findByText('Arrivato')).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Segna non presentato: Giulia Bianchi' }),
  ).toBeVisible();
});

test('cancels a future visit only after asking for confirmation', async () => {
  let cancelled = false;
  const future = { startsAt: '2099-02-16T08:00:00Z', endsAt: '2099-02-16T08:30:00Z' };
  server.use(
    http.get('*/api/v1/staff/agenda', () =>
      HttpResponse.json([visit({ ...future, status: cancelled ? 'CANCELLED' : 'BOOKED' })]),
    ),
    http.post('*/api/v1/staff/appointments/1/cancellation', () => {
      cancelled = true;
      return HttpResponse.json(visit({ ...future, status: 'CANCELLED' }));
    }),
  );
  const { user } = renderApp(`/segreteria?giorno=${FUTURE_DAY}`);

  await user.click(await screen.findByRole('button', { name: 'Annulla visita: Giulia Bianchi' }));
  expect(cancelled).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Sì, annulla la visita' }));

  expect(await screen.findByText('Annullata')).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Annulla visita: Giulia Bianchi' }),
  ).not.toBeInTheDocument();
});

test('does not offer to record an outcome for a visit on a later day', async () => {
  server.use(
    http.get('*/api/v1/staff/agenda', () =>
      HttpResponse.json([visit({ startsAt: '2099-02-16T08:00:00Z' })]),
    ),
  );

  renderApp(`/segreteria?giorno=${FUTURE_DAY}`);

  expect(
    await screen.findByRole('button', { name: 'Annulla visita: Giulia Bianchi' }),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Segna arrivato: Giulia Bianchi' }),
  ).not.toBeInTheDocument();
});

test('says so when a colleague changed the same visit first', async () => {
  server.use(
    http.get('*/api/v1/staff/agenda', () => HttpResponse.json([visit({})])),
    http.post('*/api/v1/staff/appointments/1/arrival', () =>
      problem(409, '/problems/concurrent-update'),
    ),
  );
  const { user } = renderApp(`/segreteria?giorno=${PAST_DAY}`);

  await user.click(await screen.findByRole('button', { name: 'Segna arrivato: Giulia Bianchi' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Qualcun altro ha appena modificato questa visita.',
  );
});

test('moves to the next day and can show a single doctor', async () => {
  const requests: string[] = [];
  server.use(
    http.get('*/api/v1/staff/agenda', ({ request }) => {
      requests.push(new URL(request.url).search);
      return HttpResponse.json([]);
    }),
  );
  const { user } = renderApp(`/segreteria?giorno=${PAST_DAY}`);

  expect(await screen.findByText('Nessuna visita in questo giorno.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Giorno successivo' }));
  expect(await screen.findByRole('heading', { name: 'martedì 13 gennaio 2026' })).toBeVisible();
  await user.selectOptions(screen.getByLabelText('Medico'), 'Dott. Luca Ferri');

  await screen.findByText('Nessuna visita in questo giorno.');
  expect(requests).toContain('?date=2026-01-13&doctorId=6');
});
