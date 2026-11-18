import type { RouteObject } from 'react-router';
import { BookingPage } from '../patient/BookingPage';
import { ManageBookingPage } from '../patient/ManageBookingPage';
import { ErrorPage } from './ErrorPage';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

// The staff area is one chunk, downloaded only by who opens it: never by a patient on a phone.
const staff = () => import('../staff');
const loading = <p className="p-8 text-ink-soft">Caricamento…</p>;

export const routes: RouteObject[] = [
  {
    // The screen of the waiting room: a page of its own, without the site's header.
    path: '/sala',
    lazy: async () => ({
      Component: (await import('../waiting-room/WaitingRoomPage')).WaitingRoomPage,
    }),
    hydrateFallbackElement: loading,
    errorElement: <ErrorPage />,
  },
  {
    path: '/segreteria',
    lazy: async () => ({ Component: (await staff()).StaffArea }),
    hydrateFallbackElement: loading,
    errorElement: <ErrorPage />,
    children: [
      { index: true, lazy: async () => ({ Component: (await staff()).AgendaPage }) },
      { path: 'orari', lazy: async () => ({ Component: (await staff()).SchedulePage }) },
      { path: 'chiusure', lazy: async () => ({ Component: (await staff()).ClosuresPage }) },
      { path: 'notifiche', lazy: async () => ({ Component: (await staff()).NotificationsPage }) },
    ],
  },
  {
    element: <Layout />,
    hydrateFallbackElement: loading,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <BookingPage /> },
      { path: '/prenotazione', element: <ManageBookingPage /> },
      {
        path: '/segreteria/accesso',
        lazy: async () => ({ Component: (await staff()).LoginPage }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
