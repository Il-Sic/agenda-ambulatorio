import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createAppQueryClient } from '../app/queryClient';
import { routes } from '../app/routes';

/** Renders the whole application at a URL, the way a visitor would open it. */
export function renderApp(url: string) {
  const queryClient = createAppQueryClient({ retryNetworkErrors: false });
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), router };
}
