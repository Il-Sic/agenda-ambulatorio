package io.github.ilsic.agenda.notification;

import java.time.Instant;
import java.util.UUID;

/**
 * The part of a booking event this module reads. It is this module's own class on purpose: the only
 * thing it shares with the producer is the JSON on the topic. Unknown fields are ignored and the
 * type is a plain string, so the producer can evolve without breaking the consumer.
 */
record BookingMessage(
    UUID eventId,
    String type,
    String bookingCode,
    String patientName,
    String patientEmail,
    String doctorName,
    String specialty,
    Instant startsAt) {}
