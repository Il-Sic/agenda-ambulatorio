package io.github.ilsic.agenda.booking;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestClockConfiguration;
import io.github.ilsic.agenda.TestData;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;

@IntegrationTest
class AppointmentVersionTest {

  @Autowired AppointmentRepository appointments;
  @Autowired TestData data;

  @BeforeEach
  void setUp() {
    data.reset();
  }

  @Test
  void theSecondOfTwoPeopleChangingTheSameAppointmentIsRefused() {
    Instant todayAtEleven = Instant.parse("2027-02-15T10:00:00Z");
    long id =
        data.appointment(data.doctor(), todayAtEleven, todayAtEleven.plusSeconds(1800), "BOOKED");
    Appointment seenByAnna = appointments.findById(id).orElseThrow();
    Appointment seenByBruno = appointments.findById(id).orElseThrow();

    seenByAnna.cancel(TestClockConfiguration.NOW);
    appointments.saveAndFlush(seenByAnna);

    seenByBruno.markArrived(TestClockConfiguration.NOW);
    assertThatThrownBy(() -> appointments.saveAndFlush(seenByBruno))
        .isInstanceOf(OptimisticLockingFailureException.class);
  }
}
