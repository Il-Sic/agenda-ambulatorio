import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { renderApp } from '../test/render';
import { server } from '../test/server';
import { signedInAs } from '../test/staff';

test('lists the e-mails sent to patients, with their text', async () => {
  signedInAs('STAFF');
  server.use(
    http.get('*/api/v1/staff/notifications', () =>
      HttpResponse.json([
        {
          id: 2,
          recipient: 'marco.conti@example.com',
          subject: 'Prenotazione annullata - codice WXYZ6789',
          body: 'Gentile Marco Conti,\n\nla sua visita è stata annullata.',
          sentAt: '2026-01-12T09:15:00Z',
        },
        {
          id: 1,
          recipient: 'giulia.bianchi@example.com',
          subject: 'Prenotazione confermata - codice ABCD2345',
          body: 'Gentile Giulia Bianchi,\n\nla sua visita è confermata.',
          sentAt: '2026-01-12T08:00:00Z',
        },
      ]),
    ),
  );

  renderApp('/segreteria/notifiche');

  const emails = await screen.findAllByRole('article');
  expect(emails).toHaveLength(2);
  const newest = within(emails[0] as HTMLElement);
  expect(
    newest.getByRole('heading', { name: 'Prenotazione annullata - codice WXYZ6789' }),
  ).toBeVisible();
  expect(newest.getByText('marco.conti@example.com')).toBeVisible();
  expect(newest.getByText('lunedì 12 gennaio 2026, ore 10:15')).toBeVisible();
  expect(newest.getByText(/la sua visita è stata annullata/)).toBeInTheDocument();
});

test('says so when nothing has been sent yet', async () => {
  signedInAs('STAFF');
  server.use(http.get('*/api/v1/staff/notifications', () => HttpResponse.json([])));

  renderApp('/segreteria/notifiche');

  expect(await screen.findByText(/Nessuna email inviata/)).toBeVisible();
});
