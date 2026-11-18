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
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.IntSupplier;
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

  /** The desk's numbers of the day: 1, 2, 3 and so on. */
  private final IntSupplier numbers = new AtomicInteger()::incrementAndGet;

  @Test
  void canBeMovedBeforeItStartsKeepingItsCode() {
    Slot later = new Slot(START.plus(1, DAYS), START.plus(1, DAYS).plus(30, MINUTES));

    appointment.moveTo(later, TWO_DAYS_BEFORE);

    assertThat(appointment.slot()).isEqualTo(later);
    assertThat(appointment.code()).isEqualTo("ABCD2345");
    assertThat(appointment.status()).isEqualTo(BOOKED);
  }

  @Test
  void aMovedVisitIsRemindedAgainForItsNewTime() {
    appointment.markReminded(START.minus(1, DAYS));

    appointment.moveTo(
        new Slot(START.plus(2, DAYS), START.plus(2, DAYS).plus(30, MINUTES)), START.minus(1, DAYS));

    assertThat(appointment.reminderSentAt()).isNull();
  }

  @Test
  void cannotBeMovedOnceItHasStartedOrIsCancelled() {
    Slot later = new Slot(START.plus(1, DAYS), START.plus(1, DAYS).plus(30, MINUTES));

    assertThatThrownBy(() -> appointment.moveTo(later, START))
        .isInstanceOf(AppointmentStateException.class);
    appointment.cancel(TWO_DAYS_BEFORE);
    assertThatThrownBy(() -> appointment.moveTo(later, TWO_DAYS_BEFORE))
        .isInstanceOf(AppointmentStateException.class);
  }

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

    appointment.markArrived(halfPastSevenThatMorning, numbers);

    assertThat(appointment.status()).isEqualTo(ARRIVED);
  }

  @Test
  void arrivalCannotBeRecordedBeforeTheDayOfTheVisit() {
    assertThatThrownBy(() -> appointment.markArrived(TWO_DAYS_BEFORE, numbers))
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

    appointment.markArrived(START, numbers);

    assertThat(appointment.status()).isEqualTo(ARRIVED);
  }

  @Test
  void cannotBeCancelledOnceAnOutcomeIsRecorded() {
    Instant halfPastSevenThatMorning = Instant.parse("2027-03-01T06:30:00Z");
    appointment.markArrived(halfPastSevenThatMorning, numbers);

    assertThatThrownBy(() -> appointment.cancel(halfPastSevenThatMorning))
        .isInstanceOf(AppointmentStateException.class);
  }

  @Test
  void noOutcomeCanBeRecordedOnceCancelled() {
    appointment.cancel(TWO_DAYS_BEFORE);

    assertThatThrownBy(() -> appointment.markArrived(START, numbers))
        .isInstanceOf(AppointmentStateException.class);
  }

  @Test
  void aPatientWhoArrivesOnTheDayOfTheVisitTakesTheNextNumberOfThatDay() {
    numbers.getAsInt();

    appointment.markArrived(START, numbers);

    assertThat(appointment.callNumber()).isEqualTo(2);
    assertThat(appointment.calledAt()).isNull();
  }

  @Test
  void thePatientKeepsTheNumberWhenTheArrivalIsRecordedAgain() {
    appointment.markArrived(START, numbers);
    appointment.markNoShow(START);

    appointment.markArrived(START, numbers);

    assertThat(appointment.callNumber()).isEqualTo(1);
  }

  @Test
  void anArrivalRecordedOnALaterDayTakesNoNumber() {
    appointment.markArrived(START.plus(1, DAYS), numbers);

    assertThat(appointment.status()).isEqualTo(ARRIVED);
    assertThat(appointment.callNumber()).isNull();
  }

  @Test
  void callingThePatientRecordsWhenAndCanBeRepeated() {
    appointment.markArrived(START, numbers);

    appointment.call(START);
    appointment.call(START.plus(5, MINUTES));

    assertThat(appointment.calledAt()).isEqualTo(START.plus(5, MINUTES));
  }

  @Test
  void onlyAPatientWaitingWithANumberCanBeCalled() {
    assertThatThrownBy(() -> appointment.call(START)).isInstanceOf(AppointmentStateException.class);

    appointment.markArrived(START.plus(1, DAYS), numbers);
    assertThatThrownBy(() -> appointment.call(START.plus(1, DAYS)))
        .isInstanceOf(AppointmentStateException.class);
  }

  @Test
  void aNumberIsCalledOnlyOnTheDayItWasGiven() {
    appointment.markArrived(START, numbers);

    assertThatThrownBy(() -> appointment.call(START.plus(1, DAYS)))
        .isInstanceOf(AppointmentStateException.class);
  }

  @Test
  void aPatientMarkedAsNotShownCannotBeCalled() {
    appointment.markArrived(START, numbers);
    appointment.markNoShow(START);

    assertThatThrownBy(() -> appointment.call(START)).isInstanceOf(AppointmentStateException.class);
  }
}
