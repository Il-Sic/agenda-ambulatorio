/** Everything a person reads on screen is in the clinic's time zone, wherever the browser is. */
const ZONE = 'Europe/Rome';

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const timeFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: ZONE,
  hour: '2-digit',
  minute: '2-digit',
});
const longDayFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDayFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const spokenTimeFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: ZONE,
  hour: 'numeric',
  minute: '2-digit',
});
const weekdayFormat = new Intl.DateTimeFormat('it-IT', { timeZone: ZONE, weekday: 'long' });
const weekdayAndDateFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export type Slot = { startsAt: string; endsAt: string };

/** The calendar day at the clinic, as YYYY-MM-DD. */
export function dayKey(instant: string | Date): string {
  return dayKeyFormat.format(new Date(instant));
}

export function todayAtTheClinic(now: Date = new Date()): string {
  return dayKey(now);
}

export function formatTime(instant: string): string {
  return timeFormat.format(new Date(instant));
}

/** "lunedì 1 marzo 2027" */
export function formatDayLong(instant: string): string {
  return longDayFormat.format(new Date(instant));
}

/** "lunedì 1 marzo 2027, ore 09:00" */
export function formatDateTime(instant: string): string {
  return `${formatDayLong(instant)}, ore ${formatTime(instant)}`;
}

/**
 * When a visit is, the way a person would say it: "oggi alle 11:30", "domani alle 9:00",
 * "venerdì alle 14:00" within the week, "lunedì 6 dicembre alle 9:00" further on.
 */
export function formatWhen(instant: string, today: string = todayAtTheClinic()): string {
  const day = dayKey(instant);
  const time = spokenTimeFormat.format(new Date(instant));
  if (day === today) {
    return `oggi alle ${time}`;
  }
  if (day === addDays(today, 1)) {
    return `domani alle ${time}`;
  }
  const date = new Date(instant);
  const when =
    day <= addDays(today, 6) ? weekdayFormat.format(date) : weekdayAndDateFormat.format(date);
  return `${when} alle ${time}`;
}

/** "lunedì 1 marzo 2027", from a YYYY-MM-DD day. */
export function formatDayKeyLong(day: string): string {
  return longDayFormat.format(atNoonUtc(day));
}

/** "lun 1 mar", from a YYYY-MM-DD day. */
export function formatDayShort(day: string): string {
  return shortDayFormat.format(atNoonUtc(day));
}

export function addDays(day: string, days: number): string {
  const date = atNoonUtc(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function groupSlotsByDay(slots: Slot[]): { day: string; slots: Slot[] }[] {
  const days: { day: string; slots: Slot[] }[] = [];
  for (const slot of slots) {
    const day = dayKey(slot.startsAt);
    const last = days.at(-1);
    if (last?.day === day) {
      last.slots.push(slot);
    } else {
      days.push({ day, slots: [slot] });
    }
  }
  return days;
}

// Noon keeps a plain calendar day clear of any midnight or daylight saving edge.
function atNoonUtc(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}
