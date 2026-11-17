package io.github.ilsic.agenda.booking;

/** Wrong code or wrong e-mail. The answer never says which, so codes cannot be guessed. */
public class BookingNotFoundException extends RuntimeException {

  public BookingNotFoundException() {
    super("No booking matches this code and e-mail");
  }
}
