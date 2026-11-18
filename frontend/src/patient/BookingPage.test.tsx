import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, test } from 'vitest';
import { addDays, formatWhen, todayAtTheClinic } from '../lib/dates';
import { renderApp } from '../test/render';
import { server } from '../test/server';

const NINE = '2027-03-01T08:00:00Z';
const HALF_PAST_NINE = '2027-03-01T08:30:00Z';

beforeEach(() => {
  server.use(
    http.get('*/api/v1/specialties', () =>
      HttpResponse.json([
        { id: 1, name: 'Cardiologia', doctors: ['Dott.ssa Marchetti', 'Dott. Rinaldi'] },
        { id: 2, name: 'Ortopedia', doctors: ['Dott. Ferri'] },
      ]),
    ),
    http.get('*/api/v1/first-free-slots', () =>
      HttpResponse.json([{ specialtyId: 1, doctorId: 7, startsAt: NINE, endsAt: HALF_PAST_NINE }]),
    ),
    http.get('*/api/v1/doctors', ({ request }) => {
      expect(new URL(request.url).searchParams.get('specialtyId')).toBe('1');
      return HttpResponse.json([
        {
          id: 7,
          name: 'Dott.ssa Elena Marchetti',
          lastName: 'Marchetti',
          specialty: 'Cardiologia',
        },
      ]);
    }),
    http.get('*/api/v1/doctors/first-free-slots', () =>
      HttpResponse.json([{ specialtyId: 1, doctorId: 7, startsAt: NINE, endsAt: HALF_PAST_NINE }]),
    ),
    http.get('*/api/v1/doctors/7/slots', () =>
      HttpResponse.json([
        { startsAt: NINE, endsAt: HALF_PAST_NINE },
        { startsAt: HALF_PAST_NINE, endsAt: '2027-03-01T09:00:00Z' },
      ]),
    ),
  );
});

async function chooseTheNineOClockSlot(user: ReturnType<typeof renderApp>['user']) {
  await user.click(await screen.findByRole('link', { name: 'Cardiologia' }));
  await user.click(await screen.findByRole('link', { name: 'Dott.ssa Elena Marchetti' }));
  await user.click(await screen.findByRole('button', { name: '9:00' }));
}

async function fillInTheDetails(user: ReturnType<typeof renderApp>['user']) {
  await user.type(screen.getByLabelText('Nome e cognome'), 'Giulia Bianchi');
  await user.type(screen.getByLabelText('Email'), 'giulia.bianchi@example.com');
  await user.type(screen.getByLabelText('Telefono'), '333 1234567');
}

test('the home page shows each specialty with its doctors and its first free slot', async () => {
  renderApp('/');

  expect(await screen.findByRole('heading', { level: 1, name: 'Segui la linea.' })).toBeVisible();
  // The first free slots arrive with a request of their own.
  await screen.findByText(formatWhen(NINE));
  expect(screen.getByRole('link', { name: 'Cardiologia' })).toHaveAccessibleDescription(
    `Dott.ssa Marchetti, Dott. Rinaldi Primo posto libero ${formatWhen(NINE)}`,
  );
  expect(screen.getByRole('link', { name: 'Ortopedia' })).toHaveAccessibleDescription(
    'Dott. Ferri Nessun posto libero nei prossimi 90 giorni',
  );
  expect(screen.getByText(/^Posti liberi aggiornati alle \d{2}:\d{2}$/)).toBeVisible();
});

test('a patient who already booked opens the booking from the home page', async () => {
  let sentEmail: unknown;
  server.use(
    http.post('*/api/v1/bookings/ABCD2345/lookup', async ({ request }) => {
      sentEmail = await request.json();
      return HttpResponse.json({
        code: 'ABCD2345',
        status: 'BOOKED',
        startsAt: NINE,
        endsAt: HALF_PAST_NINE,
        doctorName: 'Dott.ssa Elena Marchetti',
        specialty: 'Cardiologia',
        patientName: 'Giulia Bianchi',
        callNumber: null,
        calledAt: null,
        room: 'Ambulatorio 4',
        floor: 'Primo piano',
      });
    }),
  );
  const { user } = renderApp('/');

  await user.type(await screen.findByLabelText('Codice di prenotazione'), 'abcd2345');
  await user.type(screen.getByLabelText('Email'), 'giulia.bianchi@example.com');
  await user.click(screen.getByRole('button', { name: 'Ritrova la prenotazione' }));

  expect(await screen.findByRole('heading', { name: 'La mia prenotazione' })).toBeVisible();
  expect(await screen.findByRole('region', { name: 'Tagliando della visita' })).toHaveTextContent(
    'ABCD2345',
  );
  expect(sentEmail).toEqual({ email: 'giulia.bianchi@example.com' });
});

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
          callNumber: null,
          calledAt: null,
          room: 'Ambulatorio 4',
          floor: 'Primo piano',
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
  const ticket = screen.getByRole('region', { name: 'Tagliando della visita' });
  expect(ticket).toHaveTextContent('ABCD2345');
  expect(within(ticket).getByText('Dott.ssa Elena Marchetti')).toBeVisible();
  expect(within(ticket).getByText('lunedì 1 marzo')).toBeVisible();
  expect(within(ticket).getByText('9:00')).toBeVisible();
  expect(sentBody).toEqual({
    doctorId: 7,
    startsAt: NINE,
    patientName: 'Giulia Bianchi',
    patientEmail: 'giulia.bianchi@example.com',
    patientPhone: '333 1234567',
  });
  expect(csrfHeader).toBe('test-token');
});

test('the choices made so far stay in view and can be changed', async () => {
  const { user } = renderApp('/');

  await chooseTheNineOClockSlot(user);

  const band = screen.getByRole('region', { name: 'Il tuo percorso' });
  expect(within(band).getByText('Cardiologia')).toBeVisible();
  expect(within(band).getByText('Dott.ssa Elena Marchetti')).toBeVisible();
  const steps = within(band).getByRole('list', { name: 'Passi della prenotazione' });
  expect(within(steps).getByText('I tuoi dati').closest('li')).toHaveAttribute(
    'aria-current',
    'step',
  );
  const ticket = within(screen.getByRole('complementary', { name: 'Il tuo tagliando' })).getByRole(
    'region',
    { name: 'Tagliando della visita' },
  );
  expect(within(ticket).getByText('lunedì 1 marzo')).toBeVisible();
  expect(within(ticket).getByText('9:00')).toBeVisible();

  await user.click(within(steps).getByRole('link', { name: 'Cambia Giorno e ora' }));

  expect(await screen.findByRole('button', { name: '9:30' })).toBeVisible();
});

test('the doctors come with the first free slot of each', async () => {
  const { user } = renderApp('/');

  await user.click(await screen.findByRole('link', { name: 'Cardiologia' }));

  expect(await screen.findByRole('heading', { level: 1, name: 'Con quale medico?' })).toBeVisible();
  await screen.findByText(formatWhen(NINE));
  expect(
    screen.getByRole('link', { name: 'Dott.ssa Elena Marchetti' }),
  ).toHaveAccessibleDescription(`Primo posto libero ${formatWhen(NINE)}`);
});

test('the times of a day are split into morning and afternoon', async () => {
  server.use(
    http.get('*/api/v1/doctors/7/slots', () =>
      HttpResponse.json([
        { startsAt: NINE, endsAt: HALF_PAST_NINE },
        { startsAt: '2027-03-01T14:00:00Z', endsAt: '2027-03-01T14:30:00Z' },
      ]),
    ),
  );

  renderApp('/?specialita=1&medico=7');

  const morning = await screen.findByRole('list', { name: 'Mattina' });
  expect(within(morning).getByRole('button', { name: '9:00' })).toBeVisible();
  const afternoon = screen.getByRole('list', { name: 'Pomeriggio' });
  expect(within(afternoon).getByRole('button', { name: '15:00' })).toBeVisible();
  expect(
    screen.getByText('Le visite durano 30 minuti. Gli orari sono quelli di Roma.'),
  ).toBeVisible();
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
  expect(await screen.findByRole('button', { name: '9:30' })).toBeVisible();
});

test('says so when the doctor has no free slot in the coming days', async () => {
  server.use(http.get('*/api/v1/doctors/7/slots', () => HttpResponse.json([])));
  const { user } = renderApp('/');

  await user.click(await screen.findByRole('link', { name: 'Cardiologia' }));
  await user.click(await screen.findByRole('link', { name: 'Dott.ssa Elena Marchetti' }));

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

test('nonsense typed into the address bar is ignored instead of breaking the page', async () => {
  renderApp('/?specialita=1&medico=7&dal=abc&orario=nonsense');

  expect(await screen.findByRole('button', { name: '9:00' })).toBeVisible();
});

test('does not offer days beyond the ninety the clinic takes bookings for', async () => {
  server.use(http.get('*/api/v1/doctors/7/slots', () => HttpResponse.json([])));
  const lastPage = addDays(todayAtTheClinic(), 84);

  renderApp(`/?specialita=1&medico=7&dal=${lastPage}`);

  expect(await screen.findByText(/Nessun orario libero/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Giorni precedenti' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Giorni successivi' })).not.toBeInTheDocument();
});

test('a retry after a lost connection repeats the same idempotency key', async () => {
  const keys: (string | null)[] = [];
  server.use(
    http.post('*/api/v1/bookings', ({ request }) => {
      keys.push(request.headers.get('Idempotency-Key'));
      if (keys.length === 1) {
        // The request may or may not have reached the server: the patient cannot know.
        return HttpResponse.error();
      }
      return HttpResponse.json(
        {
          code: 'ABCD2345',
          status: 'BOOKED',
          startsAt: NINE,
          endsAt: HALF_PAST_NINE,
          doctorName: 'Dott.ssa Elena Marchetti',
          specialty: 'Cardiologia',
          patientName: 'Giulia Bianchi',
          callNumber: null,
          calledAt: null,
          room: 'Ambulatorio 4',
          floor: 'Primo piano',
        },
        { status: 201 },
      );
    }),
  );
  const { user } = renderApp('/');
  await chooseTheNineOClockSlot(user);
  await fillInTheDetails(user);

  await user.click(screen.getByRole('button', { name: 'Conferma prenotazione' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connessione non riuscita.');
  await user.click(screen.getByRole('button', { name: 'Conferma prenotazione' }));

  expect(await screen.findByRole('heading', { name: 'Prenotazione confermata' })).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toMatch(/^[0-9a-f]{32}$/);
  expect(keys[1]).toBe(keys[0]);
});
