import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, test } from 'vitest';
import { formatDayKeyLong, todayAtTheClinic } from '../lib/dates';
import { renderApp } from '../test/render';
import { server } from '../test/server';
import { problem, signedInAs } from '../test/staff';

// 12 January 2026 is in the past: outcomes can be recorded. 16 February 2099 is in the future.
const PAST_DAY = '2026-01-12';
const FUTURE_DAY = '2099-02-16';

function visit(overrides: object = {}) {
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

function doctor(day: string, overrides: object = {}) {
  return {
    id: 2,
    name: 'Dott.ssa Elena Marchetti',
    lastName: 'Marchetti',
    specialty: 'Cardiologia',
    // 9:00 to 13:00 in Rome, in winter.
    hours: [{ startsAt: `${day}T08:00:00Z`, endsAt: `${day}T12:00:00Z` }],
    freeSlots: [],
    appointments: [],
    ...overrides,
  };
}

function dayPlan(date: string, doctors: object[], closure = '') {
  return HttpResponse.json({ date, closure, doctors });
}

const FUTURE_VISIT = { startsAt: '2099-02-16T08:00:00Z', endsAt: '2099-02-16T08:30:00Z' };

beforeEach(() => {
  signedInAs('STAFF');
});

test('draws the day doctor by doctor, with each visit and its status', async () => {
  let requestedDate: string | null = null;
  server.use(
    http.get('*/api/v1/staff/day-plan', ({ request }) => {
      requestedDate = new URL(request.url).searchParams.get('date');
      return dayPlan(PAST_DAY, [
        doctor(PAST_DAY, { appointments: [visit()] }),
        doctor(PAST_DAY, {
          id: 6,
          name: 'Dott. Luca Ferri',
          lastName: 'Ferri',
          specialty: 'Ortopedia',
          appointments: [
            visit({
              id: 2,
              code: 'EFGH2345',
              doctorId: 6,
              doctorName: 'Dott. Luca Ferri',
              startsAt: '2026-01-12T09:00:00Z',
              endsAt: '2026-01-12T09:30:00Z',
              patientName: 'Marco Conti',
              status: 'ARRIVED',
            }),
          ],
        }),
        doctor(PAST_DAY, {
          id: 9,
          name: 'Dott. Andrea Vitale',
          lastName: 'Vitale',
          specialty: 'Oculistica',
          hours: [],
        }),
      ]);
    }),
  );

  renderApp(`/segreteria?giorno=${PAST_DAY}`);

  expect(await screen.findByRole('heading', { name: 'lunedì 12 gennaio 2026' })).toBeVisible();
  const marchetti = await screen.findByRole('region', { name: 'Dott.ssa Elena Marchetti' });
  // The column is headed by the surname: the full name does not fit in it.
  expect(within(marchetti).getByText('Marchetti')).toBeVisible();
  expect(within(marchetti).getByRole('button', { name: /Giulia Bianchi/ })).toHaveTextContent(
    '9:00 Giulia Bianchi In attesa',
  );
  const ferri = screen.getByRole('region', { name: 'Dott. Luca Ferri' });
  expect(within(ferri).getByRole('button', { name: /Marco Conti/ })).toHaveTextContent(
    '10:00 Marco Conti Arrivato',
  );
  expect(screen.getByText('2 visite: 1 arrivato, 1 in attesa.')).toBeVisible();
  expect(screen.getByText('Non ricevono in questo giorno: Dott. Andrea Vitale.')).toBeVisible();
  expect(requestedDate).toBe(PAST_DAY);
});

test('shows the data of a visit and records that the patient has arrived', async () => {
  let arrived = false;
  server.use(
    http.get('*/api/v1/staff/day-plan', () =>
      dayPlan(PAST_DAY, [
        doctor(PAST_DAY, { appointments: [visit({ status: arrived ? 'ARRIVED' : 'BOOKED' })] }),
      ]),
    ),
    http.post('*/api/v1/staff/appointments/1/arrival', () => {
      arrived = true;
      return HttpResponse.json(visit({ status: 'ARRIVED' }));
    }),
  );
  const { user } = renderApp(`/segreteria?giorno=${PAST_DAY}`);

  await user.click(await screen.findByRole('button', { name: /Giulia Bianchi/ }));
  const panel = screen.getByRole('region', { name: 'Giulia Bianchi' });
  expect(within(panel).getByText('333 5550101')).toBeVisible();
  expect(within(panel).getByText('ABCD2345')).toBeVisible();
  await user.click(within(panel).getByRole('button', { name: 'Segna arrivato: Giulia Bianchi' }));

  expect(await within(panel).findByText('Arrivato')).toBeVisible();
  expect(
    within(panel).getByRole('button', { name: 'Segna non presentato: Giulia Bianchi' }),
  ).toBeVisible();
});

test('cancels a future visit only after asking for confirmation', async () => {
  let cancelled = false;
  server.use(
    http.get('*/api/v1/staff/day-plan', () =>
      dayPlan(FUTURE_DAY, [
        doctor(FUTURE_DAY, {
          appointments: [visit({ ...FUTURE_VISIT, status: cancelled ? 'CANCELLED' : 'BOOKED' })],
        }),
      ]),
    ),
    http.post('*/api/v1/staff/appointments/1/cancellation', () => {
      cancelled = true;
      return HttpResponse.json(visit({ ...FUTURE_VISIT, status: 'CANCELLED' }));
    }),
  );
  const { user } = renderApp(`/segreteria?giorno=${FUTURE_DAY}`);

  await user.click(await screen.findByRole('button', { name: /Giulia Bianchi/ }));
  await user.click(screen.getByRole('button', { name: 'Annulla visita: Giulia Bianchi' }));
  expect(cancelled).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Sì, annulla la visita' }));

  expect(await screen.findByRole('region', { name: 'Annullate' })).toHaveTextContent(
    'Giulia Bianchi',
  );
  expect(
    screen.queryByRole('button', { name: 'Annulla visita: Giulia Bianchi' }),
  ).not.toBeInTheDocument();
});

test('does not offer to record an outcome for a visit on a later day', async () => {
  server.use(
    http.get('*/api/v1/staff/day-plan', () =>
      dayPlan(FUTURE_DAY, [doctor(FUTURE_DAY, { appointments: [visit(FUTURE_VISIT)] })]),
    ),
  );
  const { user } = renderApp(`/segreteria?giorno=${FUTURE_DAY}`);

  await user.click(await screen.findByRole('button', { name: /Giulia Bianchi/ }));

  expect(screen.getByRole('button', { name: 'Annulla visita: Giulia Bianchi' })).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Segna arrivato: Giulia Bianchi' }),
  ).not.toBeInTheDocument();
});

test('says so when a colleague changed the same visit first', async () => {
  server.use(
    http.get('*/api/v1/staff/day-plan', () =>
      dayPlan(PAST_DAY, [doctor(PAST_DAY, { appointments: [visit()] })]),
    ),
    http.post('*/api/v1/staff/appointments/1/arrival', () =>
      problem(409, '/problems/concurrent-update'),
    ),
  );
  const { user } = renderApp(`/segreteria?giorno=${PAST_DAY}`);

  await user.click(await screen.findByRole('button', { name: /Giulia Bianchi/ }));
  await user.click(screen.getByRole('button', { name: 'Segna arrivato: Giulia Bianchi' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Qualcun altro ha appena modificato questa visita.',
  );
});

test('books a free slot for a patient on the phone', async () => {
  let sent: unknown;
  let key: string | null = null;
  server.use(
    http.get('*/api/v1/staff/day-plan', () =>
      dayPlan(FUTURE_DAY, [
        doctor(FUTURE_DAY, {
          freeSlots: [{ startsAt: '2099-02-16T09:30:00Z', endsAt: '2099-02-16T10:00:00Z' }],
        }),
      ]),
    ),
    http.post('*/api/v1/bookings', async ({ request }) => {
      sent = await request.json();
      key = request.headers.get('Idempotency-Key');
      return HttpResponse.json(
        {
          code: 'NEWC2345',
          status: 'BOOKED',
          startsAt: '2099-02-16T09:30:00Z',
          endsAt: '2099-02-16T10:00:00Z',
          doctorName: 'Dott.ssa Elena Marchetti',
          specialty: 'Cardiologia',
          patientName: 'Rosa Ferraro',
        },
        { status: 201 },
      );
    }),
  );
  const { user } = renderApp(`/segreteria?giorno=${FUTURE_DAY}`);

  const free = await screen.findByRole('button', {
    name: '10:30 libero, prenota con Dott.ssa Elena Marchetti',
  });
  expect(screen.getByText('1 posto libero')).toBeVisible();
  await user.click(free);
  await user.type(screen.getByLabelText('Nome e cognome'), 'Rosa Ferraro');
  await user.type(screen.getByLabelText('Telefono'), '333 0000199');
  await user.type(screen.getByLabelText('Email'), 'rosa.ferraro@example.com');
  await user.click(screen.getByRole('button', { name: 'Prenota alle 10:30' }));

  expect(await screen.findByRole('status')).toHaveTextContent(
    'Prenotazione fatta, codice NEWC2345.',
  );
  expect(sent).toEqual({
    doctorId: 2,
    startsAt: '2099-02-16T09:30:00Z',
    patientName: 'Rosa Ferraro',
    patientEmail: 'rosa.ferraro@example.com',
    patientPhone: '333 0000199',
  });
  expect(key).toMatch(/^[0-9a-f]{32}$/);
});

test('finds a visit by the code a patient reads out or a scanner types', async () => {
  server.use(
    http.get('*/api/v1/staff/day-plan', () =>
      dayPlan(PAST_DAY, [doctor(PAST_DAY, { appointments: [visit()] })]),
    ),
  );
  const { user } = renderApp(`/segreteria?giorno=${PAST_DAY}`);

  await user.type(await screen.findByLabelText('Cerca paziente o codice'), 'abcd 2345{Enter}');

  expect(await screen.findByRole('region', { name: 'Giulia Bianchi' })).toBeVisible();
});

test('lists the patients expected next today, ready to be marked as arrived', async () => {
  const today = todayAtTheClinic();
  const inAnHour = new Date(Date.now() + 60 * 60 * 1000);
  const later = {
    startsAt: inAnHour.toISOString(),
    endsAt: new Date(inAnHour.getTime() + 30 * 60 * 1000).toISOString(),
  };
  server.use(
    http.get('*/api/v1/staff/day-plan', () =>
      dayPlan(today, [
        doctor(today, {
          hours: [later],
          appointments: [visit({ ...later, patientName: 'Sofia Piras' })],
        }),
      ]),
    ),
  );

  renderApp('/segreteria');

  const next = await screen.findByRole('region', { name: 'Prossimi arrivi' });
  expect(within(next).getByRole('button', { name: 'Segna arrivato: Sofia Piras' })).toBeVisible();
});

test('says when the clinic is closed', async () => {
  server.use(
    http.get('*/api/v1/staff/day-plan', () => dayPlan(FUTURE_DAY, [doctor(FUTURE_DAY)], 'Natale')),
  );

  renderApp(`/segreteria?giorno=${FUTURE_DAY}`);

  expect(await screen.findByText('Il poliambulatorio è chiuso: Natale.')).toBeVisible();
});

test('moves to the next day', async () => {
  const requests: (string | null)[] = [];
  server.use(
    http.get('*/api/v1/staff/day-plan', ({ request }) => {
      const date = new URL(request.url).searchParams.get('date') ?? '';
      requests.push(date);
      return dayPlan(date, [doctor(date)]);
    }),
  );
  const { user } = renderApp(`/segreteria?giorno=${PAST_DAY}`);

  expect(await screen.findByText('Nessuna visita in questo giorno.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Giorno successivo' }));

  expect(await screen.findByRole('heading', { name: 'martedì 13 gennaio 2026' })).toBeVisible();
  expect(requests).toContain('2026-01-13');
});

test('an unreadable day in the address shows today instead of breaking the page', async () => {
  server.use(
    http.get('*/api/v1/staff/day-plan', ({ request }) =>
      dayPlan(new URL(request.url).searchParams.get('date') ?? '', []),
    ),
  );

  renderApp('/segreteria?giorno=abc');

  expect(
    await screen.findByRole('heading', { name: formatDayKeyLong(todayAtTheClinic()) }),
  ).toBeVisible();
});
