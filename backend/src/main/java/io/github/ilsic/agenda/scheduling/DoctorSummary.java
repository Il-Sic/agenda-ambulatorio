package io.github.ilsic.agenda.scheduling;

/** What the rest of the application, and the public API, needs to know about a doctor. */
public record DoctorSummary(long id, String name, String specialty) {

  static DoctorSummary of(Doctor doctor) {
    return new DoctorSummary(doctor.id(), doctor.displayName(), doctor.specialty().name());
  }
}
