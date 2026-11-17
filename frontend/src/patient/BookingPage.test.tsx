import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, test } from 'vitest';
import { renderApp } from '../test/render';
import { server } from '../test/server';

const NINE = '2027-03-01T08:00:00Z';
const HALF_PAST_NINE = '2027-03-01T08:30:00Z';

beforeEach(() => {
  server.use(
    http.get('*/api/v1/specialties', () =>
      HttpResponse.json([
        { id: 1, name: 'Cardiologia' },
        { id: 2, name: 'Ortopedia' },
      ]),
    ),
    http.get('*/api/v1/doctors', ({ request }) => {
      expect(new URL(request.url).searchParams.get('specialtyId')).toBe('1');
      return HttpResponse.json([
        { id: 7, name: 'Dott.ssa Elena Marchetti', specialty: 'Cardiologia' },
      ]);
    }),
    http.get('*/api/v1/doctors/7/slots', () =>
      HttpResponse.json([
        { startsAt: NINE, endsAt: HALF_PAST_NINE },
        { startsAt: HALF_PAST_NINE, endsAt: '2027-03-01T09:00:00Z' },
      ]),
    ),
  );
});

async function chooseTheNineOClockSlot(user: ReturnType<typeof renderApp>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Cardiologia' }));
  await user.click(await screen.findByRole('button', { name: 'Dott.ssa Elena Marchetti' }));
  await user.click(await screen.findByRole('button', { name: '09:00' }));
}

async function fillInTheDetails(user: ReturnType<typeof renderApp>['user']) {
  await user.type(screen.getByLabelText('Nome e cognome'), 'Giulia Bianchi');
  await user.type(screen.getByLabelText('Email'), 'giulia.bianchi@example.com');
  await user.type(screen.getByLabelText('Telefono'), '333 1234567');
}

test('a patient books a visit step by step and gets a booking code', async () => {
  let sentBody: unknown;
  let csrfHeader: string | null = null;
  server.use(
    http.post('*/api/v1/bookings', async ({ request }) => {
      sentBody = await request.json();
      csrfHeader = request.headers.get('X-XSRF-TOKEN');
      return HttpResponse.json(
        {
          code: 'ABCD2345',
          status: 'BOOKED',
          startsAt: NINE,
          endsAt: HALF_PAST_NINE,
          doctorName: 'Dott.ssa Elena Marchetti',
          specialty: 'Cardiologia',
          patientName: 'Giulia Bianchi',
        },
        { status: 201 },
      );
    }),
  );
  const { user } = renderApp('/');

  await chooseTheNineOClockSlot(user);
  await fillInTheDetails(user);
  await user.click(screen.getByRole('button', { name: 'Conferma prenotazione' }));

  expect(await screen.findByRole('heading', { name: 'Prenotazione confermata' })).toBeVisible();
  const slip = screen.getByRole('region', { name: 'Promemoria della visita' });
  expect(within(slip).getByText('ABCD2345')).toBeVisible();
  expect(within(slip).getByText('Dott.ssa Elena Marchetti')).toBeVisible();
  expect(within(slip).getByText('lunedì 1 marzo 2027, ore 09:00')).toBeVisible();
  expect(sentBody).toEqual({
    doctorId: 7,
    startsAt: NINE,
    patientName: 'Giulia Bianchi',
    patientEmail: 'giulia.bianchi@example.com',
    patientPhone: '333 1234567',
  });
  expect(csrfHeader).toBe('test-token');
});

test('the steps already taken stay visible and can be changed', async () => {
  const { user } = renderApp('/');

  await chooseTheNineOClockSlot(user);

  const path = screen.getByRole('list', { name: 'Passi della prenotazione' });
  expect(within(path).getByText('Cardiologia')).toBeVisible();
  expect(within(path).getByText('Dott.ssa Elena Marchetti')).toBeVisible();
  expect(within(path).getByText('lunedì 1 marzo 2027, ore 09:00')).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Cambia giorno e ora' }));

  expect(await screen.findByRole('button', { name: '09:30' })).toBeVisible();
});

test('says what is wrong with each field before sending anything', async () => {
  const { user } = renderApp('/');
  await chooseTheNineOClockSlot(user);

  await user.type(screen.getByLabelText('Email'), 'not-an-email');
  await user.click(screen.getByRole('button', { name: 'Conferma prenotazione' }));

  expect(await screen.findByText('Scrivi nome e cognome.')).toBeVisible();
  expect(
    screen.getByText('Scrivi un indirizzo email valido, per esempio nome@esempio.it.'),
  ).toBeVisible();
  expect(screen.getByText('Scrivi un numero di telefono, solo cifre e spazi.')).toBeVisible();
  expect(screen.getByLabelText('Nome e cognome')).toHaveAccessibleDescription(
    'Scrivi nome e cognome.',
  );
  expect(screen.getByLabelText('Nome e cognome')).toBeInvalid();
});

test('when someone else takes the slot first, says so and offers the remaining ones', async () => {
  server.use(
    http.post('*/api/v1/bookings', () =>
      HttpResponse.json(
        {
          type: '/problems/slot-not-available',
          title: 'Slot not available',
          status: 409,
          detail: 'The requested slot is not available',
          instance: '/api/v1/bookings',
        },
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    ),
  );
  const { user } = renderApp('/');
  await chooseTheNineOClockSlot(user);
  await fillInTheDetails(user);

  await user.click(screen.getByRole('button', { name: 'Conferma prenotazione' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Questo orario non è più disponibile. Scegline un altro.',
  );
  expect(await screen.findByRole('button', { name: '09:30' })).toBeVisible();
});

test('says so when the doctor has no free slot in the coming days', async () => {
  server.use(http.get('*/api/v1/doctors/7/slots', () => HttpResponse.json([])));
  const { user } = renderApp('/');

  await user.click(await screen.findByRole('button', { name: 'Cardiologia' }));
  await user.click(await screen.findByRole('button', { name: 'Dott.ssa Elena Marchetti' }));

  expect(await screen.findByText(/Nessun orario libero/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Giorni successivi' })).toBeVisible();
});

test('says so when the list of specialties cannot be loaded', async () => {
  server.use(http.get('*/api/v1/specialties', () => HttpResponse.error()));

  renderApp('/');

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Connessione non riuscita. Controlla la rete e riprova.',
  );
});
