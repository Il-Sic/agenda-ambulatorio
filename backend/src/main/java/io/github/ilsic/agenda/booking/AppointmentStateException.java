package io.github.ilsic.agenda.booking;

/** The requested change does not make sense for the appointment as it is now. */
public class AppointmentStateException extends RuntimeException {

  public AppointmentStateException(String message) {
    super(message);
  }
}
