package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.scheduling.DoctorSummary;
import java.time.Instant;

/** One line of the staff agenda: the visit, the doctor and how to reach the patient. */
record AgendaEntry(
    long id,
    String code,
    long doctorId,
    String doctorName,
    Instant startsAt,
    Instant endsAt,
    AppointmentStatus status,
    String patientName,
    String patientEmail,
    String patientPhone) {

  static AgendaEntry of(Appointment appointment, DoctorSummary doctor) {
    return new AgendaEntry(
        appointment.id(),
        appointment.code(),
        doctor.id(),
        doctor.name(),
        appointment.slot().startsAt(),
        appointment.slot().endsAt(),
        appointment.status(),
        appointment.patient().name(),
        appointment.patient().email(),
        appointment.patient().phone());
  }
}
