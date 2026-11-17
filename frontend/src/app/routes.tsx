import type { RouteObject } from 'react-router';
import { BookingPage } from '../patient/BookingPage';
import { ManageBookingPage } from '../patient/ManageBookingPage';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <BookingPage /> },
      { path: '/prenotazione', element: <ManageBookingPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
