import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, test } from 'vitest';
import { renderApp } from '../test/render';
import { server } from '../test/server';
import { DOCTORS, problem, signedInAs } from '../test/staff';

const MONDAY_MORNING = {
  id: 10,
  dayOfWeek: 'MONDAY',
  startTime: '09:00',
  endTime: '13:00',
  slotMinutes: 30,
};

beforeEach(() => {
  server.use(
    http.get('*/api/v1/staff/doctors', () => HttpResponse.json(DOCTORS)),
    http.get('*/api/v1/staff/doctors/6/availability', () => HttpResponse.json([MONDAY_MORNING])),
  );
});

test('staff can read the weekly availability but not change it', async () => {
  signedInAs('STAFF');

  renderApp('/segreteria/orari');

  expect(await screen.findByText('09:00 – 13:00')).toBeVisible();
  expect(screen.getByText('lunedì')).toBeVisible();
  expect(screen.getByText('visite da 30 minuti')).toBeVisible();
  expect(screen.getByText('Solo la direzione può modificare gli orari.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Aggiungi fascia' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Rimuovi/ })).not.toBeInTheDocument();
});

test('an admin adds an availability window', async () => {
  signedInAs('ADMIN');
  let sentBody: unknown;
  const windows = [MONDAY_MORNING];
  server.use(
    http.get('*/api/v1/staff/doctors/6/availability', () => HttpResponse.json(windows)),
    http.post('*/api/v1/staff/doctors/6/availability', async ({ request }) => {
      sentBody = await request.json();
      const created = {
        id: 11,
        dayOfWeek: 'TUESDAY',
        startTime: '15:00',
        endTime: '18:00',
        slotMinutes: 20,
      };
      windows.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
  );
  const { user } = renderApp('/segreteria/orari');

  await user.selectOptions(await screen.findByLabelText('Giorno della settimana'), 'martedì');
  await user.type(screen.getByLabelText('Dalle'), '15:00');
  await user.type(screen.getByLabelText('Alle'), '18:00');
  await user.selectOptions(screen.getByLabelText('Durata della visita'), '20 minuti');
  await user.click(screen.getByRole('button', { name: 'Aggiungi fascia' }));

  expect(await screen.findByText('15:00 – 18:00')).toBeVisible();
  expect(sentBody).toEqual({
    dayOfWeek: 'TUESDAY',
    startTime: '15:00',
    endTime: '18:00',
    slotMinutes: 20,
  });
});

test('an overlapping window is refused with an explanation', async () => {
  signedInAs('ADMIN');
  server.use(
    http.post('*/api/v1/staff/doctors/6/availability', () =>
      problem(409, '/problems/availability-overlap'),
    ),
  );
  const { user } = renderApp('/segreteria/orari');

  await user.type(await screen.findByLabelText('Dalle'), '12:00');
  await user.type(screen.getByLabelText('Alle'), '15:00');
  await user.click(screen.getByRole('button', { name: 'Aggiungi fascia' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Questa fascia si sovrappone a un’altra dello stesso giorno.',
  );
});

test('an admin removes a window', async () => {
  signedInAs('ADMIN');
  let removed = false;
  server.use(
    http.get('*/api/v1/staff/doctors/6/availability', () =>
      HttpResponse.json(removed ? [] : [MONDAY_MORNING]),
    ),
    http.delete('*/api/v1/staff/availability/10', () => {
      removed = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const { user } = renderApp('/segreteria/orari');

  await user.click(
    await screen.findByRole('button', { name: 'Rimuovi la fascia di lunedì 09:00 – 13:00' }),
  );

  expect(await screen.findByText('Nessuna fascia: questo medico non è prenotabile.')).toBeVisible();
});

test('the availability of another doctor can be opened', async () => {
  signedInAs('STAFF');
  server.use(
    http.get('*/api/v1/staff/doctors/2/availability', () =>
      HttpResponse.json([{ ...MONDAY_MORNING, id: 20, startTime: '08:00', endTime: '12:00' }]),
    ),
  );
  const { user } = renderApp('/segreteria/orari');

  await screen.findByRole('option', { name: 'Dott.ssa Elena Marchetti' });
  await user.selectOptions(screen.getByLabelText('Medico'), 'Dott.ssa Elena Marchetti');

  expect(await screen.findByText('08:00 – 12:00')).toBeVisible();
});
