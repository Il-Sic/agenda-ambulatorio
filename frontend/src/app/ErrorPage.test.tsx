import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { expect, test, vi } from 'vitest';
import { ErrorPage } from './ErrorPage';

function Broken(): never {
  throw new Error('an internal detail');
}

test('a page that breaks shows a plain message in Italian and a way out', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const router = createMemoryRouter([
    { path: '/', element: <Broken />, errorElement: <ErrorPage /> },
  ]);

  render(<RouterProvider router={router} />);

  expect(
    await screen.findByRole('heading', { name: 'Questa pagina non ha funzionato' }),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Torna alla prenotazione' })).toBeVisible();
  expect(screen.queryByText(/internal detail/)).not.toBeInTheDocument();
});
