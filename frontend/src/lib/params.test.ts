import { expect, test } from 'vitest';
import { dayOrUndefined, instantOrUndefined, numberOrUndefined } from './params';

test('a positive whole number is read from a URL parameter', () => {
  expect(numberOrUndefined('7')).toBe(7);
  expect(numberOrUndefined('0')).toBeUndefined();
  expect(numberOrUndefined('abc')).toBeUndefined();
  expect(numberOrUndefined(null)).toBeUndefined();
});

test('a day is accepted only if it is a real calendar day', () => {
  expect(dayOrUndefined('2027-03-01')).toBe('2027-03-01');
  expect(dayOrUndefined('2027-02-30')).toBeUndefined();
  expect(dayOrUndefined('abc')).toBeUndefined();
  expect(dayOrUndefined('01/03/2027')).toBeUndefined();
  expect(dayOrUndefined(null)).toBeUndefined();
});

test('an instant is accepted only if it can be read as a date and time', () => {
  expect(instantOrUndefined('2027-03-01T08:00:00Z')).toBe('2027-03-01T08:00:00Z');
  expect(instantOrUndefined('nonsense')).toBeUndefined();
  expect(instantOrUndefined(null)).toBeUndefined();
});
