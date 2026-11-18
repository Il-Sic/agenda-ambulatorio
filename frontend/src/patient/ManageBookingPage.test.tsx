import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { todayAtTheClinic } from '../lib/dates';
import { renderApp } from '../test/render';
import { server } from '../test/server';

const booking = {
  code: 'ABCD2345',
  status: 'BOOKED',
  startsAt: '2027-03-01T08:00:00Z',
  endsAt: '2027-03-01T08:30:00Z',
  doctorId: 7,
  doctorName: 'Dott.ssa Elena Marchetti',
  specialty: 'Cardiologia',
  patientName: 'Giulia Bianchi',
  callNumber: null,
  calledAt: null,
  room: 'Ambulatorio 4',
  floor: 'Primo piano',
};

async function lookUp(user: ReturnType<typeof renderApp>['user']) {
  await user.type(screen.getByLabelText('Codice di prenotazione'), 'abcd2345');
  await user.type(screen.getByLabelText('Email'), 'giulia.bianchi@example.com');
  await user.click(screen.getByRole('button', { name: 'Cerca prenotazione' }));
}

test('a patient finds a booking with its code and e-mail', async () => {
  let sentEmail: unknown;
  server.use(
    http.post('*/api/v1/bookings/ABCD2345/lookup', async ({ request }) => {
      sentEmail = await request.json();
      return HttpResponse.json(booking);
    }),
  );
  const { user } = renderApp('/prenotazione');

  await lookUp(user);

  const slip = await screen.findByRole('region', { name: 'Tagliando della visita' });
  expect(within(slip).getByText('lunedì 1 marzo')).toBeVisible();
  expect(within(slip).getByText('9:00')).toBeVisible();
  expect(within(slip).getByText('Confermata')).toBeVisible();
  expect(sentEmail).toEqual({ email: 'giulia.bianchi@example.com' });
});

test('a patient cancels a booking after confirming the intention', async () => {
  server.use(
    http.post('*/api/v1/bookings/ABCD2345/lookup', () => HttpResponse.json(booking)),
    http.post('*/api/v1/bookings/ABCD2345/cancellation', () =>
      HttpResponse.json({ ...booking, status: 'CANCELLED' }),
    ),
  );
  const { user } = renderApp('/prenotazione');
  await lookUp(user);

  await user.click(await screen.findByRole('button', { name: 'Annulla prenotazione' }));
  await user.click(screen.getByRole('button', { name: 'Sì, annulla la visita' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Prenotazione annullata.');
  expect(screen.getByText('Annullata')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Annulla prenotazione' })).not.toBeInTheDocument();
});

test('explains what to check when no booking matches', async () => {
  server.use(
    http.post('*/api/v1/bookings/ABCD2345/lookup', () =>
      HttpResponse.json(
        {
          type: '/problems/booking-not-found',
          title: 'Booking not found',
          status: 404,
          detail: 'No booking matches this code and e-mail',
          instance: '/api/v1/bookings/ABCD2345/lookup',
        },
        { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    ),
  );
  const { user } = renderApp('/prenotazione');

  await lookUp(user);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Non troviamo una prenotazione con questo codice e questa email.',
  );
});

test('a patient moves the visit to another time with the same doctor', async () => {
  const later = { startsAt: '2027-03-02T13:30:00Z', endsAt: '2027-03-02T14:00:00Z' };
  let sent: unknown;
  server.use(
    http.post('*/api/v1/bookings/ABCD2345/lookup', () => HttpResponse.json(booking)),
    http.get('*/api/v1/doctors/7/slots', () => HttpResponse.json([later])),
    http.post('*/api/v1/bookings/ABCD2345/rescheduling', async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json({ ...booking, ...later });
    }),
  );
  const { user } = renderApp('/prenotazione');
  await lookUp(user);

  await user.click(await screen.findByRole('button', { name: 'Sposta la visita' }));
  await user.click(await screen.findByRole('button', { name: '14:30' }));
  await user.click(screen.getByRole('button', { name: 'Sì, sposta la visita' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Visita spostata');
  const ticket = screen.getByRole('region', { name: 'Tagliando della visita' });
  expect(within(ticket).getByText('14:30')).toBeVisible();
  expect(within(ticket).getByText('martedì 2 marzo')).toBeVisible();
  expect(sent).toEqual({ email: 'giulia.bianchi@example.com', startsAt: later.startsAt });
});

test('the visit can be added to the calendar of the phone', async () => {
  server.use(http.post('*/api/v1/bookings/ABCD2345/lookup', () => HttpResponse.json(booking)));
  const { user } = renderApp('/prenotazione');
  await lookUp(user);

  const link = await screen.findByRole('link', { name: 'Aggiungi al calendario' });

  expect(link).toHaveAttribute('download', 'visita-ABCD2345.ics');
  expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('DTSTART:20270301T080000Z');
});

/** The visit is today, at ten or eleven in Rome: always today, whatever the hour of the test. */
function today(overrides: object) {
  const day = todayAtTheClinic();
  return {
    ...booking,
    startsAt: `${day}T09:00:00Z`,
    endsAt: `${day}T09:30:00Z`,
    ...overrides,
  };
}

test('on the day of the visit the patient sees the number taken at the desk', async () => {
  server.use(
    http.post('*/api/v1/bookings/ABCD2345/lookup', () =>
      HttpResponse.json(today({ status: 'ARRIVED', callNumber: 12 })),
    ),
  );
  const { user } = renderApp('/prenotazione');
  await lookUp(user);

  const number = await screen.findByRole('region', { name: 'Il tuo numero' });
  expect(number).toHaveTextContent('12');
  expect(number).toHaveTextContent('Ti chiamiamo sullo schermo della sala d’attesa e anche qui');
});

test('when the number is called the page says it is the patient’s turn and where to go', async () => {
  server.use(
    http.post('*/api/v1/bookings/ABCD2345/lookup', () =>
      HttpResponse.json(
        today({
          status: 'ARRIVED',
          callNumber: 12,
          calledAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      ),
    ),
  );
  const { user } = renderApp('/prenotazione');
  await lookUp(user);

  const turn = await screen.findByRole('alert');
  expect(within(turn).getByRole('heading', { name: 'È il tuo turno' })).toBeVisible();
  expect(turn).toHaveTextContent('Ambulatorio 4');
  expect(turn).toHaveTextContent('Primo piano, segui la linea rossa');
  expect(document.title).toBe('È il tuo turno - Poliambulatorio Valdoria');
});

test('a visit on another day says nothing about numbers', async () => {
  server.use(http.post('*/api/v1/bookings/ABCD2345/lookup', () => HttpResponse.json(booking)));
  const { user } = renderApp('/prenotazione');
  await lookUp(user);

  await screen.findByRole('region', { name: 'Tagliando della visita' });
  expect(screen.queryByRole('region', { name: 'Il tuo numero' })).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
