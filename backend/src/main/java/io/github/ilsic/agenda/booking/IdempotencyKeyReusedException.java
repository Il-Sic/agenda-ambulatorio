package io.github.ilsic.agenda.booking;

/** The key was already used for a booking with different contents. */
public class IdempotencyKeyReusedException extends RuntimeException {

  public IdempotencyKeyReusedException() {
    super("This idempotency key was already used for a different booking");
  }
}
