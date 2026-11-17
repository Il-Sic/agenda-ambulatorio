// What arrives in the address bar can be typed by anyone: these read a URL parameter and treat
// anything that is not what the page expects as if it were absent.

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A positive whole number. */
export function numberOrUndefined(value: string | null): number | undefined {
  const number = Number(value);
  return value !== null && Number.isInteger(number) && number > 0 ? number : undefined;
}

/** A real calendar day written as YYYY-MM-DD. */
export function dayOrUndefined(value: string | null): string | undefined {
  if (value === null || !DAY.test(value)) {
    return undefined;
  }
  const date = new Date(`${value}T12:00:00Z`);
  // "2027-02-30" either fails to parse or rolls over to March: both are rejected.
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? value : undefined;
}

/** A date and time the browser can read, such as 2027-03-01T08:00:00Z. */
export function instantOrUndefined(value: string | null): string | undefined {
  return value !== null && !Number.isNaN(Date.parse(value)) ? value : undefined;
}
