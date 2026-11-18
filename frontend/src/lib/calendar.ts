import { lineName } from './specialty';

type CalendarVisit = {
  code: string;
  specialty: string;
  doctorName: string;
  startsAt: string;
  endsAt: string;
};

/**
 * The visit as an iCalendar file (RFC 5545), which every calendar app can import. Times are in
 * UTC, so the visit lands at the right hour whatever the phone's time zone.
 */
export function calendarFile(visit: CalendarVisit, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Poliambulatorio Valdoria//Prenotazioni//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    // The same booking added twice updates the event instead of duplicating it.
    `UID:${visit.code}@valdoria.example`,
    `DTSTAMP:${utc(now.toISOString())}`,
    `DTSTART:${utc(visit.startsAt)}`,
    `DTEND:${utc(visit.endsAt)}`,
    `SUMMARY:${text(`Visita di ${visit.specialty}`)}`,
    `LOCATION:${text('Poliambulatorio Valdoria, Via dei Tigli 12, Valdoria')}`,
    `DESCRIPTION:${text(
      `${visit.doctorName}. Codice di prenotazione ${visit.code}. ` +
        `In sede segui la linea ${lineName(visit.specialty)}.`,
    )}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${text('Visita al Poliambulatorio Valdoria tra due ore')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** 2027-03-01T08:00:00Z, with or without milliseconds, becomes 20270301T080000Z. */
function utc(instant: string): string {
  return new Date(instant)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function text(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Lines longer than 75 octets continue on the next line, which starts with a space.
function fold(line: string): string {
  const bytes = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  for (const character of line) {
    if (bytes.encode(current + character).length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = character;
    } else {
      current += character;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}
