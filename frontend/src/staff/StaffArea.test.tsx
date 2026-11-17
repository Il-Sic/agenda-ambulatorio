import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { renderApp } from '../test/render';
import { server } from '../test/server';
import { DOCTORS, problem, signedInAs } from '../test/staff';

function agendaIsEmpty() {
  server.use(
    http.get('*/api/v1/staff/agenda', () => HttpResponse.json([])),
    http.get('*/api/v1/staff/doctors', () => HttpResponse.json(DOCTORS)),
  );
}

test('a visitor who has not signed in is sent to the sign-in page', async () => {
  server.use(http.get('*/api/v1/auth/me', () => problem(401, '/problems/unauthenticated')));

  renderApp('/segreteria');

  expect(await screen.findByRole('heading', { name: 'Accesso segreteria' })).toBeVisible();
});

test('signing in opens the agenda and shows who is signed in', async () => {
  let signedIn = false;
  let sentForm: string | undefined;
  let csrfHeader: string | null = null;
  server.use(
    http.get('*/api/v1/auth/me', () =>
      signedIn
        ? HttpResponse.json({ username: 'segreteria', displayName: 'Marta Colombo', role: 'STAFF' })
        : problem(401, '/problems/unauthenticated'),
    ),
    http.post('*/api/v1/auth/login', async ({ request }) => {
      sentForm = await request.text();
      csrfHeader = request.headers.get('X-XSRF-TOKEN');
      signedIn = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  agendaIsEmpty();
  const { user } = renderApp('/segreteria/accesso');

  await user.type(await screen.findByLabelText('Nome utente'), 'segreteria');
  await user.type(screen.getByLabelText('Password'), 'segreteria-demo');
  await user.click(screen.getByRole('button', { name: 'Accedi' }));

  expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeVisible();
  expect(screen.getByText('Marta Colombo')).toBeVisible();
  expect(sentForm).toBe('username=segreteria&password=segreteria-demo');
  expect(csrfHeader).toBe('test-token');
});

test('wrong credentials are reported without saying which one is wrong', async () => {
  server.use(
    http.get('*/api/v1/auth/me', () => problem(401, '/problems/unauthenticated')),
    http.post('*/api/v1/auth/login', () => problem(401, '/problems/bad-credentials')),
  );
  const { user } = renderApp('/segreteria/accesso');

  await user.type(await screen.findByLabelText('Nome utente'), 'segreteria');
  await user.type(screen.getByLabelText('Password'), 'sbagliata');
  await user.click(screen.getByRole('button', { name: 'Accedi' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Nome utente o password non corretti.',
  );
});

test('signing out goes back to the sign-in page', async () => {
  let signedIn = true;
  server.use(
    http.get('*/api/v1/auth/me', () =>
      signedIn
        ? HttpResponse.json({ username: 'segreteria', displayName: 'Marta Colombo', role: 'STAFF' })
        : problem(401, '/problems/unauthenticated'),
    ),
    http.post('*/api/v1/auth/logout', () => {
      signedIn = false;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  agendaIsEmpty();
  const { user } = renderApp('/segreteria');

  await user.click(await screen.findByRole('button', { name: 'Esci' }));

  expect(await screen.findByRole('heading', { name: 'Accesso segreteria' })).toBeVisible();
});

test('when the session expires the next request leads back to the sign-in page', async () => {
  signedInAs('STAFF');
  server.use(
    http.get('*/api/v1/staff/doctors', () => HttpResponse.json(DOCTORS)),
    http.get('*/api/v1/staff/agenda', () => {
      // From now on the server no longer knows this browser.
      server.use(http.get('*/api/v1/auth/me', () => problem(401, '/problems/unauthenticated')));
      return problem(401, '/problems/unauthenticated');
    }),
  );

  renderApp('/segreteria');

  expect(await screen.findByRole('heading', { name: 'Accesso segreteria' })).toBeVisible();
});
