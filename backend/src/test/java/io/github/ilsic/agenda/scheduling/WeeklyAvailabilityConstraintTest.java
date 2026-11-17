package io.github.ilsic.agenda.scheduling;

import static java.time.DayOfWeek.MONDAY;
import static java.time.DayOfWeek.TUESDAY;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

@IntegrationTest
class WeeklyAvailabilityConstraintTest {

  @Autowired TestData data;

  long doctor;

  @BeforeEach
  void setUp() {
    data.reset();
    doctor = data.doctor();
  }

  @Test
  void rejectsTwoOverlappingWindowsOnTheSameDay() {
    data.availability(doctor, MONDAY, "09:00", "13:00", 30);

    assertThatThrownBy(() -> data.availability(doctor, MONDAY, "12:00", "15:00", 30))
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasMessageContaining("weekly_availability_no_overlap");
  }

  @Test
  void allowsAMorningAndAnAfternoonWindowOnTheSameDay() {
    data.availability(doctor, MONDAY, "09:00", "13:00", 30);

    assertThatCode(() -> data.availability(doctor, MONDAY, "13:00", "17:00", 30))
        .doesNotThrowAnyException();
  }

  @Test
  void allowsTheSameWindowOnDifferentDays() {
    data.availability(doctor, MONDAY, "09:00", "13:00", 30);

    assertThatCode(() -> data.availability(doctor, TUESDAY, "09:00", "13:00", 30))
        .doesNotThrowAnyException();
  }

  @Test
  void rejectsAWindowThatEndsBeforeItStarts() {
    assertThatThrownBy(() -> data.availability(doctor, MONDAY, "13:00", "09:00", 30))
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasMessageContaining("weekly_availability_window_valid");
  }
}
