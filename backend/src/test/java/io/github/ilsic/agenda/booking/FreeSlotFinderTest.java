package io.github.ilsic.agenda.booking;

import static java.time.DayOfWeek.FRIDAY;
import static java.time.DayOfWeek.MONDAY;
import static java.time.DayOfWeek.SUNDAY;
import static org.assertj.core.api.Assertions.assertThat;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import io.github.ilsic.agenda.shared.ClinicTime;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@IntegrationTest
class FreeSlotFinderTest {

  private static final LocalDate A_MONDAY = LocalDate.of(2027, 3, 1);
  private static final Instant LONG_BEFORE = Instant.parse("2027-01-01T00:00:00Z");

  @Autowired FreeSlotFinder finder;
  @Autowired TestData data;

  long doctor;

  @BeforeEach
  void setUp() {
    data.reset();
    doctor = data.doctor();
  }

  @Test
  void splitsAnAvailabilityWindowIntoSlots() {
    data.availability(doctor, MONDAY, "09:00", "11:00", 30);

    List<Slot> slots = finder.find(doctor, A_MONDAY, A_MONDAY, LONG_BEFORE);

    assertThat(localStarts(slots)).containsExactly("09:00", "09:30", "10:00", "10:30");
    assertThat(slots)
        .allSatisfy(slot ->
            assertThat(Duration.between(slot.startsAt(), slot.endsAt()))
                .isEqualTo(Duration.ofMinutes(30)));
  }

  @Test
  void dropsTheLeftoverWhenTheWindowIsNotAMultipleOfTheSlotLength() {
    data.availability(doctor, MONDAY, "09:00", "10:00", 25);

    List<Slot> slots = finder.find(doctor, A_MONDAY, A_MONDAY, LONG_BEFORE);

    assertThat(localStarts(slots)).containsExactly("09:00", "09:25");
  }

  @Test
  void offersNothingOnADayWithoutAvailability() {
    data.availability(doctor, MONDAY, "09:00", "11:00", 30);
    LocalDate tuesday = A_MONDAY.plusDays(1);

    assertThat(finder.find(doctor, tuesday, tuesday, LONG_BEFORE)).isEmpty();
  }

  @Test
  void coversEveryDayOfTheRequestedPeriod() {
    data.availability(doctor, MONDAY, "09:00", "10:00", 60);

    List<Slot> slots = finder.find(doctor, A_MONDAY, A_MONDAY.plusDays(13), LONG_BEFORE);

    assertThat(slots)
        .extracting(Slot::startsAt)
        .containsExactly(at(A_MONDAY, "09:00"), at(A_MONDAY.plusDays(7), "09:00"));
  }

  @Test
  void returnsMorningAndAfternoonWindowsInOrder() {
    data.availability(doctor, MONDAY, "15:00", "16:00", 30);
    data.availability(doctor, MONDAY, "09:00", "10:00", 30);

    List<Slot> slots = finder.find(doctor, A_MONDAY, A_MONDAY, LONG_BEFORE);

    assertThat(localStarts(slots)).containsExactly("09:00", "09:30", "15:00", "15:30");
  }

  @Test
  void leavesOutSlotsThatAreAlreadyBooked() {
    data.availability(doctor, MONDAY, "09:00", "10:30", 30);
    data.appointment(doctor, at(A_MONDAY, "09:30"), at(A_MONDAY, "10:00"), "BOOKED");

    List<Slot> slots = finder.find(doctor, A_MONDAY, A_MONDAY, LONG_BEFORE);

    assertThat(localStarts(slots)).containsExactly("09:00", "10:00");
  }

  @Test
  void leavesOutEverySlotAnAppointmentOverlaps() {
    data.availability(doctor, MONDAY, "09:00", "10:30", 30);
    data.appointment(doctor, at(A_MONDAY, "09:15"), at(A_MONDAY, "09:45"), "BOOKED");

    List<Slot> slots = finder.find(doctor, A_MONDAY, A_MONDAY, LONG_BEFORE);

    assertThat(localStarts(slots)).containsExactly("10:00");
  }

  @Test
  void offersAgainASlotWhoseAppointmentWasCancelled() {
    data.availability(doctor, MONDAY, "09:00", "10:00", 30);
    data.appointment(doctor, at(A_MONDAY, "09:30"), at(A_MONDAY, "10:00"), "CANCELLED");

    List<Slot> slots = finder.find(doctor, A_MONDAY, A_MONDAY, LONG_BEFORE);

    assertThat(localStarts(slots)).containsExactly("09:00", "09:30");
  }

  @Test
  void ignoresAppointmentsOfOtherDoctors() {
    long anotherDoctor = data.doctor();
    data.availability(doctor, MONDAY, "09:00", "10:00", 30);
    data.appointment(anotherDoctor, at(A_MONDAY, "09:00"), at(A_MONDAY, "09:30"), "BOOKED");

    List<Slot> slots = finder.find(doctor, A_MONDAY, A_MONDAY, LONG_BEFORE);

    assertThat(localStarts(slots)).containsExactly("09:00", "09:30");
  }

  @Test
  void offersNothingOnAClosureDay() {
    data.availability(doctor, MONDAY, "09:00", "10:00", 30);
    data.closure(A_MONDAY);

    assertThat(finder.find(doctor, A_MONDAY, A_MONDAY, LONG_BEFORE)).isEmpty();
  }

  @Test
  void leavesOutSlotsThatHaveAlreadyStarted() {
    data.availability(doctor, MONDAY, "09:00", "11:00", 30);

    List<Slot> slots = finder.find(doctor, A_MONDAY, A_MONDAY, at(A_MONDAY, "10:00"));

    assertThat(localStarts(slots)).containsExactly("10:30");
  }

  @Test
  void keepsLocalOpeningHoursAcrossTheSwitchToSummerTime() {
    // In 2027 Italy moves its clocks forward on Sunday 28 March.
    // Friday 26 is still UTC+1, Monday 29 is UTC+2: 09:00 in Rome is a different instant.
    LocalDate fridayBefore = LocalDate.of(2027, 3, 26);
    LocalDate mondayAfter = LocalDate.of(2027, 3, 29);
    data.availability(doctor, FRIDAY, "09:00", "10:00", 30);
    data.availability(doctor, MONDAY, "09:00", "10:00", 30);

    List<Slot> slots = finder.find(doctor, fridayBefore, mondayAfter, LONG_BEFORE);

    assertThat(slots)
        .extracting(Slot::startsAt)
        .containsExactly(
            Instant.parse("2027-03-26T08:00:00Z"),
            Instant.parse("2027-03-26T08:30:00Z"),
            Instant.parse("2027-03-29T07:00:00Z"),
            Instant.parse("2027-03-29T07:30:00Z"));
  }

  @Test
  void skipsTheHourThatDoesNotExistWhenClocksGoForward() {
    // On Sunday 28 March 2027 the clock jumps from 02:00 straight to 03:00.
    LocalDate springForward = LocalDate.of(2027, 3, 28);
    data.availability(doctor, SUNDAY, "01:00", "04:00", 30);

    List<Slot> slots = finder.find(doctor, springForward, springForward, LONG_BEFORE);

    assertThat(localStarts(slots)).containsExactly("01:00", "01:30", "03:00", "03:30");
  }

  @Test
  void offersTheRepeatedHourTwiceWhenClocksGoBack() {
    // On Sunday 31 October 2027 the hour between 02:00 and 03:00 happens twice.
    LocalDate fallBack = LocalDate.of(2027, 10, 31);
    data.availability(doctor, SUNDAY, "01:00", "04:00", 30);

    List<Slot> slots = finder.find(doctor, fallBack, fallBack, LONG_BEFORE);

    assertThat(localStarts(slots))
        .containsExactly("01:00", "01:30", "02:00", "02:30", "02:00", "02:30", "03:00", "03:30");
    assertThat(slots).extracting(Slot::startsAt).doesNotHaveDuplicates();
  }

  private static Instant at(LocalDate day, String time) {
    return day.atTime(LocalTime.parse(time)).atZone(ClinicTime.ZONE).toInstant();
  }

  private static List<String> localStarts(List<Slot> slots) {
    DateTimeFormatter hoursAndMinutes = DateTimeFormatter.ofPattern("HH:mm");
    return slots.stream()
        .map(slot -> slot.startsAt().atZone(ClinicTime.ZONE).format(hoursAndMinutes))
        .toList();
  }
}
