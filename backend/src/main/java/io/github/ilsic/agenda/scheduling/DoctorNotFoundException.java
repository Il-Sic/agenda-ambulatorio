package io.github.ilsic.agenda.scheduling;

public class DoctorNotFoundException extends RuntimeException {

  public DoctorNotFoundException(long doctorId) {
    super("No doctor with id " + doctorId);
  }
}
