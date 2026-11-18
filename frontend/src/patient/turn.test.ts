import { describe, expect, test } from 'vitest';
import type { Schemas } from '../api/client';
import { isWatched, turnOf } from './turn';

// Monday 1 March 2027: the visit is from 09:00 to 09:30 in Rome.
const BOOKING: Schemas['BookingDetails'] = {
  code: 'ABCD2345',
  status: 'BOOKED',
  startsAt: '2027-03-01T08:00:00Z',
  endsAt: '2027-03-01T08:30:00Z',
  doctorId: 7,
  doctorName: 'Dott.ssa Elena Marchetti',
  specialty: 'Cardiologia',
  patientName: 'Giulia Bianchi',
  callNumber: null,
  calledAt: null,
  room: 'Ambulatorio 4',
  floor: 'Primo piano',
};

const EARLY_THAT_MORNING = new Date('2027-03-01T06:00:00Z');
const THE_DAY_BEFORE = new Date('2027-02-28T10:00:00Z');

describe('the turn of a patient', () => {
  test('there is none before the day of the visit', () => {
    expect(turnOf(BOOKING, THE_DAY_BEFORE)).toBeUndefined();
    expect(isWatched(BOOKING, THE_DAY_BEFORE)).toBe(false);
  });

  test('on the day, a booked patient is about to come, until the visit is over', () => {
    expect(turnOf(BOOKING, EARLY_THAT_MORNING)).toEqual({ kind: 'arriving' });
    expect(isWatched(BOOKING, EARLY_THAT_MORNING)).toBe(true);
    expect(turnOf(BOOKING, new Date('2027-03-01T08:45:00Z'))).toBeUndefined();
  });

  test('with a number taken at the desk the patient waits, and the page keeps asking', () => {
    const waiting = { ...BOOKING, status: 'ARRIVED' as const, callNumber: 12 };

    expect(turnOf(waiting, EARLY_THAT_MORNING)).toEqual({ kind: 'waiting', number: 12 });
    expect(isWatched(waiting, EARLY_THAT_MORNING)).toBe(true);
  });

  test('once called it is the patient’s turn, and the page stops asking', () => {
    const called = {
      ...BOOKING,
      status: 'ARRIVED' as const,
      callNumber: 12,
      calledAt: '2027-03-01T08:05:00Z',
    };
    const justAfter = new Date('2027-03-01T08:06:00Z');

    expect(turnOf(called, justAfter)).toEqual({ kind: 'called', number: 12 });
    expect(isWatched(called, justAfter)).toBe(false);
  });

  test('the call stays for a quarter of an hour, or until the visit is over if later', () => {
    const calledLate = {
      ...BOOKING,
      status: 'ARRIVED' as const,
      callNumber: 12,
      calledAt: '2027-03-01T08:25:00Z',
    };

    expect(turnOf(calledLate, new Date('2027-03-01T08:39:00Z'))).toEqual({
      kind: 'called',
      number: 12,
    });
    expect(turnOf(calledLate, new Date('2027-03-01T08:41:00Z'))).toBeUndefined();
  });

  test('a patient who arrived without a number, or did not show up, has no turn', () => {
    expect(turnOf({ ...BOOKING, status: 'ARRIVED' }, EARLY_THAT_MORNING)).toBeUndefined();
    expect(
      turnOf({ ...BOOKING, status: 'NO_SHOW', callNumber: 12 }, EARLY_THAT_MORNING),
    ).toBeUndefined();
  });
});
