import { describe, expect, test } from 'vitest';
import {
  addDays,
  clockTime,
  dayCard,
  minutesOfDay,
  dayKey,
  formatDayLong,
  formatDayShort,
  formatTime,
  formatWhen,
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

  test('a visit soon is said the way a person would say it', () => {
    const monday = '2027-03-01';
    expect(formatWhen('2027-03-01T10:30:00Z', monday)).toBe('oggi alle 11:30');
    expect(formatWhen('2027-03-02T08:00:00Z', monday)).toBe('domani alle 9:00');
    expect(formatWhen('2027-03-05T13:00:00Z', monday)).toBe('venerdì alle 14:00');
    expect(formatWhen('2027-03-08T08:00:00Z', monday)).toBe('lunedì 8 marzo alle 9:00');
  });

  test('the minutes of the day are counted at the clinic, across clock changes', () => {
    expect(minutesOfDay('2027-03-01T08:30:00Z')).toBe(570);
    expect(minutesOfDay('2027-07-05T08:30:00Z')).toBe(630);
    expect(clockTime(570)).toBe('9:30');
    expect(clockTime(780)).toBe('13:00');
  });

  test('a day card says today and tomorrow in words', () => {
    const monday = '2027-03-01';
    expect(dayCard('2027-03-01', monday)).toEqual({ weekday: 'oggi', date: '1 mar' });
    expect(dayCard('2027-03-02', monday)).toEqual({ weekday: 'domani', date: '2 mar' });
    expect(dayCard('2027-03-05', monday)).toEqual({ weekday: 'ven', date: '5 mar' });
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
