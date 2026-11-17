import { describe, expect, test } from 'vitest';
import {
  addDays,
  dayKey,
  formatDayLong,
  formatDayShort,
  formatTime,
  groupSlotsByDay,
  todayAtTheClinic,
} from './dates';

describe('clinic dates', () => {
  test('a day is the calendar day in Rome, not in UTC', () => {
    // 23:30 UTC on 1 March is already 00:30 on 2 March in Rome.
    expect(dayKey('2027-03-01T23:30:00Z')).toBe('2027-03-02');
  });

  test('times follow daylight saving time', () => {
    expect(formatTime('2027-03-01T08:00:00Z')).toBe('09:00');
    expect(formatTime('2027-07-05T08:00:00Z')).toBe('10:00');
  });

  test('days are written out in Italian', () => {
    expect(formatDayLong('2027-03-01T08:00:00Z')).toBe('lunedì 1 marzo 2027');
    expect(formatDayShort('2027-03-01')).toBe('lun 1 mar');
  });

  test('today is the day it is at the clinic', () => {
    expect(todayAtTheClinic(new Date('2027-03-01T23:30:00Z'))).toBe('2027-03-02');
  });

  test('adding days crosses months and clock changes without drifting', () => {
    expect(addDays('2027-03-27', 2)).toBe('2027-03-29');
    expect(addDays('2027-01-31', 1)).toBe('2027-02-01');
  });

  test('slots are grouped by day, keeping their order', () => {
    const slots = [
      { startsAt: '2027-03-01T08:00:00Z', endsAt: '2027-03-01T08:30:00Z' },
      { startsAt: '2027-03-01T08:30:00Z', endsAt: '2027-03-01T09:00:00Z' },
      { startsAt: '2027-03-03T08:00:00Z', endsAt: '2027-03-03T08:30:00Z' },
    ];

    expect(groupSlotsByDay(slots)).toEqual([
      { day: '2027-03-01', slots: [slots[0], slots[1]] },
      { day: '2027-03-03', slots: [slots[2]] },
    ]);
  });
});
