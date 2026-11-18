package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.scheduling.DoctorSummary;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * A booking as its patient sees it; the doctor's id lets the patient move it to another slot.
 *
 * @param callNumber the number taken at the desk on the day of the visit, or null before that
 * @param calledAt when the waiting room screen last called that number, or null
 * @param room where the doctor receives, or an empty text if not set
 * @param floor the floor of that room, or an empty text if not set
 */
record BookingDetails(
    String code,
    AppointmentStatus status,
    Instant startsAt,
    Instant endsAt,
    long doctorId,
    String doctorName,
    String specialty,
    String patientName,
    @Schema(
            types = {"integer", "null"},
            format = "int32")
        Integer callNumber,
    @Schema(
            types = {"string", "null"},
            format = "date-time")
        Instant calledAt,
    String room,
    String floor) {

  static BookingDetails of(Appointment appointment, DoctorSummary doctor) {
    return new BookingDetails(
        appointment.code(),
        appointment.status(),
        appointment.slot().startsAt(),
        appointment.slot().endsAt(),
        doctor.id(),
        doctor.name(),
        doctor.specialty(),
        appointment.patient().name(),
        appointment.callNumber(),
        appointment.calledAt(),
        doctor.room(),
        doctor.floor());
  }
}
