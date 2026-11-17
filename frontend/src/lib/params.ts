/** Reads a positive whole number from a URL parameter; anything else counts as absent. */
export function numberOrUndefined(value: string | null): number | undefined {
  const number = Number(value);
  return value !== null && Number.isInteger(number) && number > 0 ? number : undefined;
}
