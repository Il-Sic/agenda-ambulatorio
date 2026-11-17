package io.github.ilsic.agenda.booking;

import static java.time.temporal.ChronoUnit.MINUTES;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * Proves that the database itself refuses overlapping appointments. The rows are written with plain
 * SQL on purpose: no application code stands between the test and the constraint.
 */
@IntegrationTest
class AppointmentOverlapConstraintTest {

  private static final Instant NINE = Instant.parse("2027-03-01T08:00:00Z");
  private static final Instant HALF_PAST_NINE = NINE.plus(30, MINUTES);
  private static final Instant TEN = NINE.plus(60, MINUTES);

  @Autowired TestData data;

  long doctor;

  @BeforeEach
  void setUp() {
    data.reset();
    doctor = data.doctor();
  }

  @Test
  void rejectsASecondAppointmentInTheSameSlot() {
    data.appointment(doctor, NINE, HALF_PAST_NINE, "BOOKED");

    assertThatThrownBy(() -> data.appointment(doctor, NINE, HALF_PAST_NINE, "BOOKED"))
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasMessageContaining("appointment_no_overlap");
  }

  @Test
  void rejectsAnAppointmentThatPartlyOverlapsAnother() {
    data.appointment(doctor, NINE, HALF_PAST_NINE, "BOOKED");

    Instant quarterPastNine = NINE.plus(15, MINUTES);
    assertThatThrownBy(() ->
            data.appointment(doctor, quarterPastNine, quarterPastNine.plus(30, MINUTES), "BOOKED"))
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasMessageContaining("appointment_no_overlap");
  }

  @Test
  void keepsBlockingTheSlotOnceThePatientHasArrived() {
    data.appointment(doctor, NINE, HALF_PAST_NINE, "ARRIVED");

    assertThatThrownBy(() -> data.appointment(doctor, NINE, HALF_PAST_NINE, "BOOKED"))
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasMessageContaining("appointment_no_overlap");
  }

  @Test
  void allowsBackToBackAppointments() {
    data.appointment(doctor, NINE, HALF_PAST_NINE, "BOOKED");

    assertThatCode(() -> data.appointment(doctor, HALF_PAST_NINE, TEN, "BOOKED"))
        .doesNotThrowAnyException();
  }

  @Test
  void allowsTheSameSlotForAnotherDoctor() {
    long anotherDoctor = data.doctor();
    data.appointment(doctor, NINE, HALF_PAST_NINE, "BOOKED");

    assertThatCode(() -> data.appointment(anotherDoctor, NINE, HALF_PAST_NINE, "BOOKED"))
        .doesNotThrowAnyException();
  }

  @Test
  void freesTheSlotWhenTheAppointmentIsCancelled() {
    data.appointment(doctor, NINE, HALF_PAST_NINE, "CANCELLED");

    assertThatCode(() -> data.appointment(doctor, NINE, HALF_PAST_NINE, "BOOKED"))
        .doesNotThrowAnyException();
  }
}
