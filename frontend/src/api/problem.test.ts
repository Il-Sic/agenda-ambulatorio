import { expect, test } from 'vitest';
import { ApiError, fieldErrors, messageFor } from './problem';

function problem(type: string, extra: object = {}) {
  return { type, title: 't', status: 409, detail: 'English detail', instance: '/x', ...extra };
}

test('explains a known problem in Italian, by its type', () => {
  const error = new ApiError(409, problem('/problems/slot-not-available'));

  expect(messageFor(error)).toBe('Questo orario non è più disponibile. Scegline un altro.');
});

test('falls back to a generic message for a problem it does not know', () => {
  expect(messageFor(new ApiError(500, problem('/problems/brand-new')))).toBe(
    'Qualcosa non ha funzionato. Riprova tra poco.',
  );
});

test('recognises a network failure', () => {
  expect(messageFor(new TypeError('Failed to fetch'))).toBe(
    'Connessione non riuscita. Controlla la rete e riprova.',
  );
});

test('lists the fields the server rejected', () => {
  const error = new ApiError(
    400,
    problem('/problems/validation', {
      errors: [{ field: 'patientEmail', message: 'must be a well-formed email address' }],
    }),
  );

  expect(fieldErrors(error)).toEqual(['patientEmail']);
  expect(fieldErrors(new ApiError(409, problem('/problems/slot-not-available')))).toEqual([]);
});
