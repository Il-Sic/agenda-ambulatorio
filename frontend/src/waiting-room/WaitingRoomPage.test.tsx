import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { renderApp } from '../test/render';
import { server } from '../test/server';

function calls(body: object[]) {
  server.use(http.get('*/api/v1/waiting-room/calls', () => HttpResponse.json(body)));
}

const LATEST = {
  number: 12,
  room: 'Ambulatorio 4',
  floor: 'Primo piano',
  specialty: 'Cardiologia',
  calledAt: '2027-03-01T09:41:00Z',
};

test('shows the number called now and where to go, without any account', async () => {
  calls([
    LATEST,
    { ...LATEST, number: 11, room: 'Ambulatorio 1', specialty: 'Ortopedia', floor: 'Piano terra' },
  ]);

  renderApp('/sala');

  const now = await screen.findByRole('region', { name: 'Ora tocca al numero' });
  expect(now).toHaveTextContent('12');
  expect(now).toHaveTextContent('Ambulatorio 4');
  expect(within(now).getByText('Cardiologia')).toBeVisible();
  expect(now).toHaveTextContent('Primo piano, segui la linea rossa');
  expect(document.title).toBe('Sala d’attesa - Poliambulatorio Valdoria');
});

test('lists the calls before, for whoever looked away', async () => {
  calls([
    LATEST,
    { ...LATEST, number: 11, room: 'Ambulatorio 1', specialty: 'Ortopedia', floor: 'Piano terra' },
    { ...LATEST, number: 10, room: 'Ambulatorio 2', specialty: 'Pediatria', floor: 'Piano terra' },
  ]);

  renderApp('/sala');

  const earlier = await screen.findByRole('region', { name: 'Chiamate precedenti' });
  const [eleven, ten] = await within(earlier).findAllByRole('listitem');
  expect(eleven).toHaveTextContent(/11.*Ambulatorio 1.*Ortopedia/);
  expect(ten).toHaveTextContent(/10.*Ambulatorio 2.*Pediatria/);
});

test('says what will happen before the first call of the day', async () => {
  calls([]);

  renderApp('/sala');

  expect(await screen.findByRole('region', { name: 'Nessuna chiamata per ora' })).toHaveTextContent(
    'Quando tocca a te, qui compaiono il tuo numero e dove andare.',
  );
});

test('names the specialty when the doctor has no room set', async () => {
  calls([{ ...LATEST, room: '', floor: '' }]);

  renderApp('/sala');

  const now = await screen.findByRole('region', { name: 'Ora tocca al numero' });
  expect(now).toHaveTextContent(/12\s*Cardiologia\s*Segui la linea rossa/);
});

test('the screen grows with the window while it is shown', async () => {
  calls([]);

  renderApp('/sala');

  await screen.findByRole('region', { name: 'Nessuna chiamata per ora' });
  expect(document.documentElement).toHaveClass('board-scale');
});
