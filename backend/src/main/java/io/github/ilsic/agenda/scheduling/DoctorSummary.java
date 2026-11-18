package io.github.ilsic.agenda.scheduling;

/**
 * What the rest of the application, and the public API, needs to know about a doctor.
 *
 * @param lastName the surname alone, for where only a word fits, such as a column of the front
 *     desk's grid; given here because a surname cannot be told apart from a full name reliably
 */
public record DoctorSummary(long id, String name, String lastName, String specialty) {

  static DoctorSummary of(Doctor doctor) {
    return new DoctorSummary(
        doctor.id(), doctor.displayName(), doctor.lastName(), doctor.specialty().name());
  }
}
