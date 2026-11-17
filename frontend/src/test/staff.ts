import { http, HttpResponse } from 'msw';
import { server } from './server';

/** Makes the fake backend answer as if this person had signed in. */
export function signedInAs(role: 'STAFF' | 'ADMIN') {
  server.use(
    http.get('*/api/v1/auth/me', () =>
      HttpResponse.json(
        role === 'ADMIN'
          ? { username: 'admin', displayName: 'Direzione Valdoria', role }
          : { username: 'segreteria', displayName: 'Marta Colombo', role },
      ),
    ),
  );
}

export function problem(status: number, type: string) {
  return HttpResponse.json(
    { type, title: 'Problem', status, detail: 'English detail', instance: '/x' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

export const DOCTORS = [
  { id: 6, name: 'Dott. Luca Ferri', specialty: 'Ortopedia' },
  { id: 2, name: 'Dott.ssa Elena Marchetti', specialty: 'Cardiologia' },
];
