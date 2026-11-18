package io.github.ilsic.agenda.scheduling;

import java.util.Objects;

/**
 * What the rest of the application, and the public API, needs to know about a doctor.
 *
 * @param lastName the surname alone, for where only a word fits, such as a column of the front
 *     desk's grid; given here because a surname cannot be told apart from a full name reliably
 * @param room where the doctor receives, such as "Ambulatorio 4", or an empty text if not set
 * @param floor the floor of that room, such as "Primo piano", or an empty text if not set
 */
public record DoctorSummary(
    long id, String name, String lastName, String specialty, String room, String floor) {

  static DoctorSummary of(Doctor doctor) {
    return new DoctorSummary(
        doctor.id(),
        doctor.displayName(),
        doctor.lastName(),
        doctor.specialty().name(),
        Objects.requireNonNullElse(doctor.room(), ""),
        Objects.requireNonNullElse(doctor.floor(), ""));
  }
}
