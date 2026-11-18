import { encode } from 'uqr';

/**
 * The booking code as a QR code, for a reader at the desk. It repeats the code printed beside
 * it, so screen readers skip it.
 */
export function QrCode({ text, size = 84 }: { text: string; size?: number }) {
  const { data, size: modules } = encode(text, { border: 0 });
  let path = '';
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) {
        path += `M${String(x)} ${String(y)}h1v1h-1z`;
      }
    });
  });
  // Two modules of white around it: the paper of the ticket does the rest of the quiet zone.
  const view = `-2 -2 ${String(modules + 4)} ${String(modules + 4)}`;
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox={view}
      shapeRendering="crispEdges"
      className="shrink-0"
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
