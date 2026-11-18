package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.outbox.Outbox;
import io.github.ilsic.agenda.scheduling.DoctorSummary;
import io.github.ilsic.agenda.shared.Topics;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Records booking events in the outbox, as part of the transaction that is changing a booking. */
@Component
class BookingEvents {

  private final Outbox outbox;
  private final Clock clock;

  BookingEvents(Outbox outbox, Clock clock) {
    this.outbox = outbox;
    this.clock = clock;
  }

  void confirmed(Appointment appointment, DoctorSummary doctor) {
    record(BookingEvent.Type.BOOKING_CONFIRMED, appointment, doctor);
  }

  void cancelled(Appointment appointment, DoctorSummary doctor) {
    record(BookingEvent.Type.BOOKING_CANCELLED, appointment, doctor);
  }

  void moved(Appointment appointment, DoctorSummary doctor) {
    record(BookingEvent.Type.BOOKING_MOVED, appointment, doctor);
  }

  void reminder(Appointment appointment, DoctorSummary doctor) {
    record(BookingEvent.Type.VISIT_REMINDER, appointment, doctor);
  }

  private void record(BookingEvent.Type type, Appointment appointment, DoctorSummary doctor) {
    BookingEvent event =
        new BookingEvent(
            UUID.randomUUID(),
            type,
            clock.instant(),
            appointment.code(),
            appointment.patient().name(),
            appointment.patient().email(),
            doctor.name(),
            doctor.specialty(),
            appointment.slot().startsAt(),
            appointment.slot().endsAt());
    // The booking code is the key: events of the same booking land on the same partition.
    outbox.append(Topics.BOOKING_EVENTS, appointment.code(), event.eventId(), event);
  }
}
