/**
 * Like the coloured lines painted on a hospital floor, every specialty has its own colour and
 * the patient follows it through the booking, and then through the building.
 */
type Line = { colour: string; name: string };

const RED: Line = { colour: 'var(--color-line-red)', name: 'rossa' };
const OCHRE: Line = { colour: 'var(--color-line-ochre)', name: 'ocra' };
const BLUE: Line = { colour: 'var(--color-line-blue)', name: 'blu' };
const GREEN: Line = { colour: 'var(--color-line-green)', name: 'verde' };
const VIOLET: Line = { colour: 'var(--color-line-violet)', name: 'viola' };
const NEUTRAL: Line = { colour: 'var(--color-line-slate)', name: 'grigia' };

const LINES: Record<string, Line> = {
  Cardiologia: RED,
  Dermatologia: OCHRE,
  Oculistica: BLUE,
  Ortopedia: GREEN,
  Pediatria: VIOLET,
};

const OTHER_LINES = [BLUE, GREEN, VIOLET, RED, OCHRE];

export const NEUTRAL_LINE = NEUTRAL.colour;

function lineOf(specialty: string | undefined): Line {
  if (!specialty) {
    return NEUTRAL;
  }
  return LINES[specialty] ?? OTHER_LINES[hash(specialty) % OTHER_LINES.length] ?? NEUTRAL;
}

/** The colour of a specialty's line, as a CSS value. */
export function lineColor(specialty: string | undefined): string {
  return lineOf(specialty).colour;
}

/** The colour of a specialty's line in words, as said to a patient: "segui la linea rossa". */
export function lineName(specialty: string | undefined): string {
  return lineOf(specialty).name;
}

// A specialty added later still gets a colour, and always the same one.
function hash(text: string): number {
  let sum = 0;
  for (const character of text) {
    sum += character.codePointAt(0) ?? 0;
  }
  return sum;
}
