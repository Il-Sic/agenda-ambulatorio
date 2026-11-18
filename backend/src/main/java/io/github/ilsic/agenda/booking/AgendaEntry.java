package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.scheduling.DoctorSummary;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * One line of the staff agenda: the visit, the doctor and how to reach the patient.
 *
 * @param callNumber the number the patient took on arriving on the day of the visit, or null
 * @param calledAt when that number was last called to the doctor's room, or null
 */
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
    String patientPhone,
    @Schema(
            types = {"integer", "null"},
            format = "int32")
        Integer callNumber,
    @Schema(
            types = {"string", "null"},
            format = "date-time")
        Instant calledAt) {

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
        appointment.patient().phone(),
        appointment.callNumber(),
        appointment.calledAt());
  }
}
