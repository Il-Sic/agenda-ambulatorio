import { useEffect, useRef } from 'react';
import type { Schemas } from '../api/client';
import { dayKey, todayAtTheClinic } from '../lib/dates';

type Booking = Schemas['BookingDetails'];

/** Where the patient is, on the day of the visit. */
export type Turn =
  { kind: 'arriving' } | { kind: 'waiting'; number: number } | { kind: 'called'; number: number };

/** Once the visit is over the call is old news, but never before a quarter of an hour. */
const CALL_SHOWN_FOR = 15 * 60_000;

/** On the day of the visit: about to come, waiting with a number, or called. Otherwise nothing. */
export function turnOf(booking: Booking, now: Date): Turn | undefined {
  if (dayKey(booking.startsAt) !== todayAtTheClinic(now)) {
    return undefined;
  }
  if (booking.status === 'BOOKED') {
    return new Date(booking.endsAt) > now ? { kind: 'arriving' } : undefined;
  }
  if (booking.status !== 'ARRIVED' || booking.callNumber === null) {
    return undefined;
  }
  if (booking.calledAt === null) {
    return { kind: 'waiting', number: booking.callNumber };
  }
  const shownUntil = Math.max(
    new Date(booking.endsAt).getTime(),
    new Date(booking.calledAt).getTime() + CALL_SHOWN_FOR,
  );
  return now.getTime() < shownUntil ? { kind: 'called', number: booking.callNumber } : undefined;
}

/** Worth asking the server again: the number or the call may come at any moment. */
export function isWatched(booking: Booking, now: Date): boolean {
  const turn = turnOf(booking, now);
  return turn?.kind === 'arriving' || turn?.kind === 'waiting';
}

/** A phone that buzzes when the number is called, if the phone can. Not when the page opens. */
export function useBuzzWhenCalled(calledAt: string | null) {
  const before = useRef(calledAt);
  useEffect(() => {
    if (calledAt !== null && calledAt !== before.current && 'vibrate' in navigator) {
      navigator.vibrate([300, 150, 300]);
    }
    before.current = calledAt;
  }, [calledAt]);
}
