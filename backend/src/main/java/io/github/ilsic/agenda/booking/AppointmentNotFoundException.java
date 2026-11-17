package io.github.ilsic.agenda.booking;

public class AppointmentNotFoundException extends RuntimeException {

  public AppointmentNotFoundException(long appointmentId) {
    super("No appointment with id " + appointmentId);
  }
}
