import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { BookingPage } from '../patient/BookingPage';
import { ManageBookingPage } from '../patient/ManageBookingPage';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

type StaffModule = typeof import('../staff');
type StaffPage = {
  [Name in keyof StaffModule]: StaffModule[Name] extends ComponentType ? Name : never;
}[keyof StaffModule];

/** Loads a staff page on demand: the staff area is downloaded only by who opens it. */
function staff(page: StaffPage) {
  return async () => ({ Component: (await import('../staff'))[page] });
}

const loading = <p className="p-8 text-ink-soft">Caricamento…</p>;

export const routes: RouteObject[] = [
  {
    path: '/segreteria',
    lazy: staff('StaffArea'),
    hydrateFallbackElement: loading,
    children: [
      { index: true, lazy: staff('AgendaPage') },
    ],
  },
  {
    element: <Layout />,
    hydrateFallbackElement: loading,
    children: [
      { path: '/', element: <BookingPage /> },
      { path: '/prenotazione', element: <ManageBookingPage /> },
      { path: '/segreteria/accesso', lazy: staff('LoginPage') },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
