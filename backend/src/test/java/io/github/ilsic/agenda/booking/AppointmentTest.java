package io.github.ilsic.agenda.booking;

import static io.github.ilsic.agenda.booking.AppointmentStatus.ARRIVED;
import static io.github.ilsic.agenda.booking.AppointmentStatus.BOOKED;
import static io.github.ilsic.agenda.booking.AppointmentStatus.CANCELLED;
import static io.github.ilsic.agenda.booking.AppointmentStatus.NO_SHOW;
import static java.time.temporal.ChronoUnit.DAYS;
import static java.time.temporal.ChronoUnit.MINUTES;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class AppointmentTest {

  // Monday 1 March 2027, 09:00 in Rome.
  private static final Instant START = Instant.parse("2027-03-01T08:00:00Z");
  private static final Slot SLOT = new Slot(START, START.plus(30, MINUTES));
  private static final Patient PATIENT =
      new Patient("Giulia Bianchi", "giulia.bianchi@example.com", "3331234567");
  private static final Instant TWO_DAYS_BEFORE = START.minus(2, DAYS);

  private final Appointment appointment =
      Appointment.book("ABCD2345", 7L, SLOT, PATIENT, TWO_DAYS_BEFORE);

  @Test
  void startsAsBooked() {
    assertThat(appointment.status()).isEqualTo(BOOKED);
  }

  @Test
  void canBeCancelledBeforeItStarts() {
    appointment.cancel(TWO_DAYS_BEFORE);

    assertThat(appointment.status()).isEqualTo(CANCELLED);
  }

  @Test
  void cannotBeCancelledOnceItHasStarted() {
    assertThatThrownBy(() -> appointment.cancel(START))
        .isInstanceOf(AppointmentStateException.class);
  }

  @Test
  void cannotBeCancelledTwice() {
    appointment.cancel(TWO_DAYS_BEFORE);

    assertThatThrownBy(() -> appointment.cancel(TWO_DAYS_BEFORE))
        .isInstanceOf(AppointmentStateException.class);
  }

  @Test
  void arrivalCanBeRecordedOnTheDayOfTheVisit() {
    Instant halfPastSevenThatMorning = Instant.parse("2027-03-01T06:30:00Z");

    appointment.markArrived(halfPastSevenThatMorning);

    assertThat(appointment.status()).isEqualTo(ARRIVED);
  }

  @Test
  void arrivalCannotBeRecordedBeforeTheDayOfTheVisit() {
    assertThatThrownBy(() -> appointment.markArrived(TWO_DAYS_BEFORE))
        .isInstanceOf(AppointmentStateException.class);
  }

  @Test
  void theDayOfTheVisitFollowsTheClinicTimeZone() {
    // 23:30 UTC on the evening before is already 00:30 of the visit day in Rome.
    Instant justAfterMidnightInRome = Instant.parse("2027-02-28T23:30:00Z");

    appointment.markNoShow(justAfterMidnightInRome);

    assertThat(appointment.status()).isEqualTo(NO_SHOW);
  }

  @Test
  void aRecordedOutcomeCanBeCorrected() {
    appointment.markNoShow(START);

    appointment.markArrived(START);

    assertThat(appointment.status()).isEqualTo(ARRIVED);
  }

  @Test
  void cannotBeCancelledOnceAnOutcomeIsRecorded() {
    Instant halfPastSevenThatMorning = Instant.parse("2027-03-01T06:30:00Z");
    appointment.markArrived(halfPastSevenThatMorning);

    assertThatThrownBy(() -> appointment.cancel(halfPastSevenThatMorning))
        .isInstanceOf(AppointmentStateException.class);
  }

  @Test
  void noOutcomeCanBeRecordedOnceCancelled() {
    appointment.cancel(TWO_DAYS_BEFORE);

    assertThatThrownBy(() -> appointment.markArrived(START))
        .isInstanceOf(AppointmentStateException.class);
  }
}
