package io.github.ilsic.agenda.booking;

import static java.time.DayOfWeek.MONDAY;
import static java.time.DayOfWeek.TUESDAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Tests run "on" Monday 15 February 2027 at 10:00 in Rome; the day drawn is a week later. */
@IntegrationTest
class DayPlanApiTest {

  private static final String NEXT_MONDAY = "2027-02-22";

  @Autowired MockMvcTester mvc;
  @Autowired TestData data;

  long marchetti;
  long ferri;
  long gentile;

  @BeforeEach
  void setUp() {
    data.reset();
    marchetti = data.doctor(data.specialty("Cardiologia"), "Marchetti");
    ferri = data.doctor(data.specialty("Ortopedia"), "Ferri");
    gentile = data.doctor(data.specialty("Pediatria"), "Gentile");
    data.availability(marchetti, MONDAY, "09:00", "10:00", 30);
    data.availability(ferri, MONDAY, "15:00", "16:00", 20);
    data.availability(gentile, TUESDAY, "15:00", "16:00", 20);
  }

  @Test
  void drawsTheHoursFreeSlotsAndAppointmentsOfEachDoctor() {
    data.appointment(
        marchetti,
        "BOOK2345",
        Instant.parse("2027-02-22T08:00:00Z"),
        Instant.parse("2027-02-22T08:30:00Z"),
        "BOOKED");
    data.appointment(
        marchetti,
        "GONE2345",
        Instant.parse("2027-02-22T08:30:00Z"),
        Instant.parse("2027-02-22T09:00:00Z"),
        "CANCELLED");

    assertThat(plan(NEXT_MONDAY))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            {
              "date": "2027-02-22",
              "closure": "",
              "doctors": [
                {
                  "id": %d, "name": "Dott.ssa Elena Ferri", "lastName": "Ferri",
                  "specialty": "Ortopedia",
                  "hours": [{"startsAt": "2027-02-22T14:00:00Z", "endsAt": "2027-02-22T15:00:00Z"}],
                  "freeSlots": [
                    {"startsAt": "2027-02-22T14:00:00Z", "endsAt": "2027-02-22T14:20:00Z"},
                    {"startsAt": "2027-02-22T14:20:00Z"},
                    {"startsAt": "2027-02-22T14:40:00Z"}
                  ],
                  "appointments": []
                },
                {"id": %d, "hours": [], "freeSlots": [], "appointments": []},
                {
                  "id": %d, "specialty": "Cardiologia",
                  "hours": [{"startsAt": "2027-02-22T08:00:00Z", "endsAt": "2027-02-22T09:00:00Z"}],
                  "freeSlots": [{"startsAt": "2027-02-22T08:30:00Z"}],
                  "appointments": [
                    {"code": "BOOK2345", "status": "BOOKED"},
                    {"code": "GONE2345", "status": "CANCELLED"}
                  ]
                }
              ]
            }
            """
                .formatted(ferri, gentile, marchetti));
  }

  @Test
  void offersNoFreeSlotThatHasAlreadyStarted() {
    // It is 10:00: the Monday morning slots of 09:00 and 09:30 are gone.
    MvcTestResult today = plan("2027-02-15");

    assertThat(today)
        .bodyJson()
        .extractingPath("$.doctors[2].hours[0].startsAt")
        .isEqualTo("2027-02-15T08:00:00Z");
    assertThat(today).bodyJson().extractingPath("$.doctors[2].freeSlots").asArray().isEmpty();
  }

  @Test
  void offersNoFreeSlotBeyondTheBookingHorizon() {
    // The last bookable day is Sunday 16 May.
    MvcTestResult tooFar = plan("2027-05-17");

    assertThat(tooFar)
        .bodyJson()
        .extractingPath("$.doctors[2].hours[0].startsAt")
        .isEqualTo("2027-05-17T07:00:00Z");
    assertThat(tooFar).bodyJson().extractingPath("$.doctors[2].freeSlots").asArray().isEmpty();
  }

  @Test
  void aClosedDaySaysWhyAndHasNoHours() {
    data.closure(LocalDate.of(2027, 2, 22));

    assertThat(plan(NEXT_MONDAY))
        .bodyJson()
        .isLenientlyEqualTo(
            """
            {
              "closure": "Chiusura",
              "doctors": [
                {"hours": [], "freeSlots": []},
                {"hours": [], "freeSlots": []},
                {"hours": [], "freeSlots": []}
              ]
            }
            """);
  }

  @Test
  void isForTheStaffOnly() {
    assertThat(mvc.get().uri("/api/v1/staff/day-plan?date={date}", NEXT_MONDAY))
        .hasStatus(HttpStatus.UNAUTHORIZED);
  }

  private MvcTestResult plan(String date) {
    return mvc.get()
        .uri("/api/v1/staff/day-plan?date={date}", date)
        .with(user("anna").roles("STAFF"))
        .exchange();
  }
}
