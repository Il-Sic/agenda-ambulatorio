package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.scheduling.DoctorSummary;
import java.time.Instant;

record BookingDetails(
    String code,
    AppointmentStatus status,
    Instant startsAt,
    Instant endsAt,
    String doctorName,
    String specialty,
    String patientName) {

  static BookingDetails of(Appointment appointment, DoctorSummary doctor) {
    return new BookingDetails(
        appointment.code(),
        appointment.status(),
        appointment.slot().startsAt(),
        appointment.slot().endsAt(),
        doctor.name(),
        doctor.specialty(),
        appointment.patient().name());
  }
}
