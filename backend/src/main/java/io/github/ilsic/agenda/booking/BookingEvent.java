package io.github.ilsic.agenda.booking;

import java.time.Instant;
import java.util.UUID;

/**
 * What this module tells the outside world. It is written to Kafka as JSON and carries everything a
 * consumer needs, so nobody has to call back to ask for details.
 */
record BookingEvent(
    UUID eventId,
    Type type,
    Instant occurredAt,
    String bookingCode,
    String patientName,
    String patientEmail,
    String doctorName,
    String specialty,
    Instant startsAt,
    Instant endsAt) {

  enum Type {
    BOOKING_CONFIRMED,
    BOOKING_CANCELLED
  }
}
