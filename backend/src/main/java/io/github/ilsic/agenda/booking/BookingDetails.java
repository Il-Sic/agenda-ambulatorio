package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.scheduling.DoctorSummary;
import java.time.Instant;

/** A booking as its patient sees it; the doctor's id lets the patient move it to another slot. */
record BookingDetails(
    String code,
    AppointmentStatus status,
    Instant startsAt,
    Instant endsAt,
    long doctorId,
    String doctorName,
    String specialty,
    String patientName) {

  static BookingDetails of(Appointment appointment, DoctorSummary doctor) {
    return new BookingDetails(
        appointment.code(),
        appointment.status(),
        appointment.slot().startsAt(),
        appointment.slot().endsAt(),
        doctor.id(),
        doctor.name(),
        doctor.specialty(),
        appointment.patient().name());
  }
}
