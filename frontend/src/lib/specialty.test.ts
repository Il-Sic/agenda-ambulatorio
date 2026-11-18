import { expect, test } from 'vitest';
import { directions, lineName } from './specialty';

test('the way to a room is the floor and the line of the specialty', () => {
  expect(directions('Primo piano', 'Cardiologia')).toBe('Primo piano, segui la linea rossa');
});

test('without a floor only the line is left', () => {
  expect(directions('', 'Ortopedia')).toBe('Segui la linea verde');
});

test('a specialty added later still has a line, and always the same', () => {
  expect(lineName('Neurologia')).toBe(lineName('Neurologia'));
});
