package io.github.ilsic.agenda.booking;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestClockConfiguration;
import io.github.ilsic.agenda.TestData;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Tests run "on" Monday 15 February 2027 at 10:00 in Rome. */
@IntegrationTest
class VisitRemindersTest {

  private static final Instant NOW = TestClockConfiguration.NOW;
  private static final Instant LONG_AGO = NOW.minus(Duration.ofDays(10));

  @Autowired VisitReminders reminders;
  @Autowired JdbcClient jdbc;
  @Autowired TestData data;

  long doctor;

  @BeforeEach
  void setUp() {
    data.reset();
    doctor = data.doctor();
  }

  @Test
  void remindsOfAVisitThatStartsWithinADay() {
    data.appointmentBookedAt(doctor, NOW.plus(Duration.ofHours(23)), LONG_AGO);

    int reminded = reminders.remindOfVisitsInTheNextDay();

    assertThat(reminded).isEqualTo(1);
    assertThat(eventTypes()).containsExactly("VISIT_REMINDER");
  }

  @Test
  void remindsOnlyOnce() {
    data.appointmentBookedAt(doctor, NOW.plus(Duration.ofHours(23)), LONG_AGO);
    reminders.remindOfVisitsInTheNextDay();

    int remindedAgain = reminders.remindOfVisitsInTheNextDay();

    assertThat(remindedAgain).isZero();
    assertThat(eventTypes()).hasSize(1);
  }

  @Test
  void waitsUntilTheVisitIsLessThanADayAway() {
    data.appointmentBookedAt(doctor, NOW.plus(Duration.ofHours(25)), LONG_AGO);

    assertThat(reminders.remindOfVisitsInTheNextDay()).isZero();
  }

  @Test
  void doesNotRemindOfACancelledVisit() {
    Instant tomorrowMorning = NOW.plus(Duration.ofHours(23));
    data.appointment(doctor, tomorrowMorning, tomorrowMorning.plusSeconds(1800), "CANCELLED");

    assertThat(reminders.remindOfVisitsInTheNextDay()).isZero();
  }

  @Test
  void doesNotRemindOfAVisitBookedLessThanADayAhead() {
    // Booked an hour ago for this afternoon: the confirmation just sent is reminder enough.
    data.appointmentBookedAt(doctor, NOW.plus(Duration.ofHours(5)), NOW.minus(Duration.ofHours(1)));

    assertThat(reminders.remindOfVisitsInTheNextDay()).isZero();
  }

  @Test
  void doesNotRemindOfAVisitThatHasAlreadyStarted() {
    data.appointmentBookedAt(doctor, NOW.minus(Duration.ofMinutes(10)), LONG_AGO);

    assertThat(reminders.remindOfVisitsInTheNextDay()).isZero();
  }

  private List<String> eventTypes() {
    return jdbc
        .sql("SELECT payload FROM outbox_event ORDER BY id")
        .query(String.class)
        .list()
        .stream()
        .map(payload -> JsonPath.<String>read(payload, "$.type"))
        .toList();
  }
}
