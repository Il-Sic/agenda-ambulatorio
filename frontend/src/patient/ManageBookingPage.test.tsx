import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { renderApp } from '../test/render';
import { server } from '../test/server';

const booking = {
  code: 'ABCD2345',
  status: 'BOOKED',
  startsAt: '2027-03-01T08:00:00Z',
  endsAt: '2027-03-01T08:30:00Z',
  doctorName: 'Dott.ssa Elena Marchetti',
  specialty: 'Cardiologia',
  patientName: 'Giulia Bianchi',
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

  const slip = await screen.findByRole('region', { name: 'Promemoria della visita' });
  expect(within(slip).getByText('lunedì 1 marzo 2027, ore 09:00')).toBeVisible();
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
