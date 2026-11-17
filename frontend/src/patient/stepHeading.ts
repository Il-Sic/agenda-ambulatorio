/** The id of a step's heading: focus is moved there when the step becomes the current one. */
export function stepHeadingId(number: number): string {
  return `passo-${String(number)}`;
}
