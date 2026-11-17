package io.github.ilsic.agenda.booking;

public class InvalidIdempotencyKeyException extends RuntimeException {

  public InvalidIdempotencyKeyException(int maxLength) {
    super("The idempotency key can be at most " + maxLength + " characters long");
  }
}
