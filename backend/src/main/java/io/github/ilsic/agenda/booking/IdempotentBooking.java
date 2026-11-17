package io.github.ilsic.agenda.booking;

import java.util.Optional;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;

/**
 * Makes booking safe to retry. A client that does not know whether its request arrived sends it
 * again with the same Idempotency-Key and gets the booking made the first time, not a second
 * booking and not "slot taken".
 *
 * <p>Deliberately not transactional: when two retries race, the loser's transaction fails and is
 * rolled back, and only then can it see the winner's booking.
 */
@Component
class IdempotentBooking {

  static final int MAX_KEY_LENGTH = 100;

  private final BookingService bookings;

  IdempotentBooking(BookingService bookings) {
    this.bookings = bookings;
  }

  BookingDetails book(BookingRequest request, String idempotencyKey) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      return bookings.book(request, null);
    }
    if (idempotencyKey.length() > MAX_KEY_LENGTH) {
      throw new InvalidIdempotencyKeyException(MAX_KEY_LENGTH);
    }
    Optional<BookingDetails> alreadyMade = bookings.madeWith(idempotencyKey, request);
    if (alreadyMade.isPresent()) {
      return alreadyMade.get();
    }
    try {
      return bookings.book(request, idempotencyKey);
    } catch (SlotNotAvailableException | DataAccessException lostToAnEarlierAttempt) {
      // Either someone else took the slot, or our own first attempt did, a moment ago.
      return bookings.madeWith(idempotencyKey, request).orElseThrow(() -> lostToAnEarlierAttempt);
    }
  }
}
