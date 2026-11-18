package io.github.ilsic.agenda.booking;

import static java.time.DayOfWeek.MONDAY;
import static java.time.DayOfWeek.TUESDAY;
import static java.time.DayOfWeek.WEDNESDAY;
import static org.assertj.core.api.Assertions.assertThat;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Tests run on Monday 15 February 2027 at 10:00 in Rome, after the Monday morning slots. */
@IntegrationTest
class FirstFreeSlotsApiTest {

  @Autowired MockMvcTester mvc;
  @Autowired TestData data;

  long cardiology;
  long rinaldi;

  @BeforeEach
  void setUp() {
    data.reset();
    cardiology = data.specialty("Cardiologia");
    rinaldi = data.doctor(cardiology, "Rinaldi");
    data.availability(rinaldi, TUESDAY, "15:00", "16:00", 30);
  }

  @Test
  void givesTheEarliestFreeSlotOfEachSpecialtyAmongAllItsDoctors() {
    long orthopaedics = data.specialty("Ortopedia");
    data.specialty("Dermatologia");
    long marchetti = data.doctor(cardiology, "Marchetti");
    long ferri = data.doctor(orthopaedics, "Ferri");
    data.availability(marchetti, MONDAY, "09:00", "10:00", 30);
    data.availability(ferri, WEDNESDAY, "09:00", "10:00", 20);

    assertThat(mvc.get().uri("/api/v1/first-free-slots"))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            [
              {"specialtyId": %d, "doctorId": %d,
               "startsAt": "2027-02-16T14:00:00Z", "endsAt": "2027-02-16T14:30:00Z"},
              {"specialtyId": %d, "doctorId": %d,
               "startsAt": "2027-02-17T08:00:00Z", "endsAt": "2027-02-17T08:20:00Z"}
            ]
            """
                .formatted(cardiology, rinaldi, orthopaedics, ferri));
  }

  @Test
  void skipsTakenSlotsButNotCancelledOnes() {
    data.appointment(
        rinaldi,
        Instant.parse("2027-02-16T14:00:00Z"),
        Instant.parse("2027-02-16T14:30:00Z"),
        "BOOKED");
    data.appointment(
        rinaldi,
        Instant.parse("2027-02-16T14:30:00Z"),
        Instant.parse("2027-02-16T15:00:00Z"),
        "CANCELLED");

    assertThat(mvc.get().uri("/api/v1/first-free-slots"))
        .bodyJson()
        .extractingPath("$[0].startsAt")
        .isEqualTo("2027-02-16T14:30:00Z");
  }

  @Test
  void skipsClosureDays() {
    data.closure(LocalDate.of(2027, 2, 16));

    assertThat(mvc.get().uri("/api/v1/first-free-slots"))
        .bodyJson()
        .extractingPath("$[0].startsAt")
        .isEqualTo("2027-02-23T14:00:00Z");
  }

  @Test
  void leavesOutASpecialtyWithNoFreeSlotWithinTheBookingHorizon() {
    // The last bookable day is Sunday 16 May: the Tuesday after is too far.
    for (LocalDate tuesday = LocalDate.of(2027, 2, 16);
        tuesday.isBefore(LocalDate.of(2027, 5, 17));
        tuesday = tuesday.plusWeeks(1)) {
      data.closure(tuesday);
    }

    assertThat(mvc.get().uri("/api/v1/first-free-slots")).hasStatusOk().bodyJson().isEqualTo("[]");
  }
}
