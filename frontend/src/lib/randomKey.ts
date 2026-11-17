/**
 * A random 32-character key. Built on getRandomValues, which unlike randomUUID also works when the
 * site is opened over plain http from another device on the network.
 */
export function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
