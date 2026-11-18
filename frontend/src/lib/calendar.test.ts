import { describe, expect, test } from 'vitest';
import { calendarFile } from './calendar';

const VISIT = {
  code: 'ABCD2345',
  specialty: 'Cardiologia',
  doctorName: 'Dott.ssa Elena Marchetti',
  startsAt: '2027-03-01T08:00:00Z',
  endsAt: '2027-03-01T08:30:00Z',
};

describe('calendar file', () => {
  const file = calendarFile(VISIT, new Date('2027-02-15T09:00:00.000Z'));
  // Unfolded, as a calendar app reads it.
  const unfolded = file.replace(/\r\n /g, '');

  test('the visit is an event in UTC, with the booking code as its identity', () => {
    expect(file.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(unfolded).toContain('UID:ABCD2345@valdoria.example\r\n');
    expect(unfolded).toContain('DTSTART:20270301T080000Z\r\n');
    expect(unfolded).toContain('DTEND:20270301T083000Z\r\n');
    expect(unfolded).toContain('DTSTAMP:20270215T090000Z\r\n');
  });

  test('says what, where and which line to follow, escaping commas', () => {
    expect(unfolded).toContain('SUMMARY:Visita di Cardiologia\r\n');
    expect(unfolded).toContain('LOCATION:Poliambulatorio Valdoria\\, Via dei Tigli 12\\, Valdoria');
    expect(unfolded).toContain('In sede segui la linea rossa.');
  });

  test('no line is longer than 75 octets', () => {
    for (const line of file.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
