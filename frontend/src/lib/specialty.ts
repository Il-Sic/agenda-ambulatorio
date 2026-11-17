/**
 * Like the coloured lines painted on a hospital floor, every specialty has its own colour and
 * the patient follows it through the booking.
 */
const LINES: Record<string, string> = {
  Cardiologia: 'var(--color-line-red)',
  Dermatologia: 'var(--color-line-ochre)',
  Oculistica: 'var(--color-line-blue)',
  Ortopedia: 'var(--color-line-green)',
  Pediatria: 'var(--color-line-violet)',
};

const OTHER_LINES = [
  'var(--color-line-blue)',
  'var(--color-line-green)',
  'var(--color-line-violet)',
  'var(--color-line-red)',
  'var(--color-line-ochre)',
];

export const NEUTRAL_LINE = 'var(--color-line-slate)';

export function lineColor(specialty: string | undefined): string {
  if (!specialty) {
    return NEUTRAL_LINE;
  }
  return LINES[specialty] ?? OTHER_LINES[hash(specialty) % OTHER_LINES.length] ?? NEUTRAL_LINE;
}

// A specialty added later still gets a colour, and always the same one.
function hash(text: string): number {
  let sum = 0;
  for (const character of text) {
    sum += character.codePointAt(0) ?? 0;
  }
  return sum;
}
