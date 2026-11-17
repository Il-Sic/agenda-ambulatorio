import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { renderApp } from '../test/render';
import { server } from '../test/server';
import { problem, signedInAs } from '../test/staff';

const CHRISTMAS = { id: 1, day: '2026-12-25', reason: 'Natale' };

test('lists the coming closure days', async () => {
  signedInAs('STAFF');
  server.use(http.get('*/api/v1/staff/closures', () => HttpResponse.json([CHRISTMAS])));

  renderApp('/segreteria/chiusure');

  expect(await screen.findByText('venerdì 25 dicembre 2026')).toBeVisible();
  expect(screen.getByText('Natale')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Aggiungi chiusura' })).not.toBeInTheDocument();
});

test('an admin closes a day', async () => {
  signedInAs('ADMIN');
  let sentBody: unknown;
  const closures = [CHRISTMAS];
  server.use(
    http.get('*/api/v1/staff/closures', () => HttpResponse.json(closures)),
    http.post('*/api/v1/staff/closures', async ({ request }) => {
      sentBody = await request.json();
      const created = { id: 2, day: '2027-01-01', reason: 'Capodanno' };
      closures.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
  );
  const { user } = renderApp('/segreteria/chiusure');

  await user.type(await screen.findByLabelText('Giorno'), '2027-01-01');
  await user.type(screen.getByLabelText('Motivo'), 'Capodanno');
  await user.click(screen.getByRole('button', { name: 'Aggiungi chiusura' }));

  expect(await screen.findByText('venerdì 1 gennaio 2027')).toBeVisible();
  expect(sentBody).toEqual({ day: '2027-01-01', reason: 'Capodanno' });
});

test('closing the same day twice is refused with an explanation', async () => {
  signedInAs('ADMIN');
  server.use(
    http.get('*/api/v1/staff/closures', () => HttpResponse.json([CHRISTMAS])),
    http.post('*/api/v1/staff/closures', () => problem(409, '/problems/closure-exists')),
  );
  const { user } = renderApp('/segreteria/chiusure');

  await user.type(await screen.findByLabelText('Giorno'), '2026-12-25');
  await user.type(screen.getByLabelText('Motivo'), 'Di nuovo');
  await user.click(screen.getByRole('button', { name: 'Aggiungi chiusura' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Questo giorno è già segnato come chiuso.',
  );
});

test('an admin reopens a day', async () => {
  signedInAs('ADMIN');
  let reopened = false;
  server.use(
    http.get('*/api/v1/staff/closures', () => HttpResponse.json(reopened ? [] : [CHRISTMAS])),
    http.delete('*/api/v1/staff/closures/1', () => {
      reopened = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const { user } = renderApp('/segreteria/chiusure');

  await user.click(await screen.findByRole('button', { name: 'Riapri venerdì 25 dicembre 2026' }));

  expect(await screen.findByText('Nessun giorno di chiusura in programma.')).toBeVisible();
});

test('a closure needs a day and a reason', async () => {
  signedInAs('ADMIN');
  server.use(http.get('*/api/v1/staff/closures', () => HttpResponse.json([])));
  const { user } = renderApp('/segreteria/chiusure');

  await user.click(await screen.findByRole('button', { name: 'Aggiungi chiusura' }));

  expect(await screen.findByText('Scegli il giorno.')).toBeVisible();
  expect(screen.getByText('Scrivi il motivo della chiusura.')).toBeVisible();
});
