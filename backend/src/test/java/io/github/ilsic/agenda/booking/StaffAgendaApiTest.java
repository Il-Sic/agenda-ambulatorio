package io.github.ilsic.agenda.booking;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static java.time.DayOfWeek.MONDAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Tests run "on" Monday 15 February 2027 at 10:00 in Rome (09:00 UTC). */
@IntegrationTest
class StaffAgendaApiTest {

  private static final String TODAY = "2027-02-15";
  private static final Instant TODAY_AT_NINE = Instant.parse("2027-02-15T08:00:00Z");
  private static final Instant TODAY_AT_ELEVEN = Instant.parse("2027-02-15T10:00:00Z");
  private static final Instant TOMORROW_AT_NINE = Instant.parse("2027-02-16T08:00:00Z");

  @Autowired MockMvcTester mvc;
  @Autowired TestData data;

  long marchetti;
  long ferri;

  @BeforeEach
  void setUp() {
    data.reset();
    marchetti = data.doctor(data.specialty("Cardiologia"), "Marchetti");
    ferri = data.doctor(data.specialty("Ortopedia"), "Ferri");
  }

  @Test
  void listsTheAppointmentsOfTheDayInOrderOfTime() {
    data.appointment(ferri, "LATE2345", TODAY_AT_ELEVEN, plusHalfHour(TODAY_AT_ELEVEN), "BOOKED");
    data.appointment(marchetti, "EARL2345", TODAY_AT_NINE, plusHalfHour(TODAY_AT_NINE), "ARRIVED");
    data.appointment(
        marchetti, "NEXT2345", TOMORROW_AT_NINE, plusHalfHour(TOMORROW_AT_NINE), "BOOKED");

    assertThat(agenda(TODAY))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            [
              {
                "code": "EARL2345",
                "doctorId": %d,
                "doctorName": "Dott.ssa Elena Marchetti",
                "startsAt": "2027-02-15T08:00:00Z",
                "endsAt": "2027-02-15T08:30:00Z",
                "status": "ARRIVED",
                "patientName": "Paziente Di Prova",
                "patientEmail": "paziente@example.com",
                "patientPhone": "3330000000"
              },
              {"code": "LATE2345", "doctorId": %d, "status": "BOOKED"}
            ]
            """
                .formatted(marchetti, ferri));
  }

  @Test
  void aDayStartsAndEndsAtMidnightInRome() {
    // 23:30 UTC on the 14th is already 00:30 on the 15th in Rome.
    Instant justAfterMidnight = Instant.parse("2027-02-14T23:30:00Z");
    Instant justBeforeNextMidnight = Instant.parse("2027-02-15T22:30:00Z");
    Instant nextDay = Instant.parse("2027-02-15T23:30:00Z");
    data.appointment(
        marchetti, "AAAA2345", justAfterMidnight, plusHalfHour(justAfterMidnight), "BOOKED");
    data.appointment(
        marchetti,
        "BBBB2345",
        justBeforeNextMidnight,
        plusHalfHour(justBeforeNextMidnight),
        "BOOKED");
    data.appointment(marchetti, "CCCC2345", nextDay, plusHalfHour(nextDay), "BOOKED");

    assertThat(agenda(TODAY))
        .bodyJson()
        .extractingPath("$[*].code")
        .asArray()
        .containsExactly("AAAA2345", "BBBB2345");
  }

  @Test
  void canShowASingleDoctor() {
    data.appointment(marchetti, "MARC2345", TODAY_AT_NINE, plusHalfHour(TODAY_AT_NINE), "BOOKED");
    data.appointment(ferri, "FERR2345", TODAY_AT_NINE, plusHalfHour(TODAY_AT_NINE), "BOOKED");

    assertThat(
            mvc.get()
                .uri("/api/v1/staff/agenda?date={date}&doctorId={id}", TODAY, ferri)
                .with(staff()))
        .bodyJson()
        .extractingPath("$[*].code")
        .asArray()
        .containsExactly("FERR2345");
  }

  @Test
  void marksAPatientAsArrived() {
    long id = data.appointment(marchetti, TODAY_AT_ELEVEN, plusHalfHour(TODAY_AT_ELEVEN), "BOOKED");

    assertThat(act(id, "arrival"))
        .hasStatusOk()
        .bodyJson()
        .extractingPath("$.status")
        .isEqualTo("ARRIVED");
    assertThat(agenda(TODAY)).bodyJson().extractingPath("$[0].status").isEqualTo("ARRIVED");
  }

  @Test
  void marksAPatientAsNotShown() {
    long id = data.appointment(marchetti, TODAY_AT_NINE, plusHalfHour(TODAY_AT_NINE), "BOOKED");

    assertThat(act(id, "no-show"))
        .hasStatusOk()
        .bodyJson()
        .extractingPath("$.status")
        .isEqualTo("NO_SHOW");
  }

  @Test
  void cancelsAVisitAndFreesItsSlot() {
    data.availability(marchetti, MONDAY, "09:00", "09:30", 30);
    Instant nextMondayAtNine = Instant.parse("2027-02-22T08:00:00Z");
    long id =
        data.appointment(marchetti, nextMondayAtNine, plusHalfHour(nextMondayAtNine), "BOOKED");

    assertThat(act(id, "cancellation"))
        .hasStatusOk()
        .bodyJson()
        .extractingPath("$.status")
        .isEqualTo("CANCELLED");
    assertThat(mvc.get().uri("/api/v1/doctors/{id}/slots?from=2027-02-22&to=2027-02-22", marchetti))
        .bodyJson()
        .extractingPath("$[*].startsAt")
        .asArray()
        .containsExactly("2027-02-22T08:00:00Z");
  }

  @Test
  void refusesAnOutcomeForAVisitOnALaterDay() {
    long id =
        data.appointment(marchetti, TOMORROW_AT_NINE, plusHalfHour(TOMORROW_AT_NINE), "BOOKED");

    assertThat(act(id, "arrival"))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/appointment-state");
  }

  @Test
  void answersNotFoundForAnUnknownAppointment() {
    assertThat(act(999, "arrival"))
        .hasStatus(HttpStatus.NOT_FOUND)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/appointment-not-found");
  }

  @Test
  void isClosedToVisitorsWhoHaveNotSignedIn() {
    long id = data.appointment(marchetti, TODAY_AT_NINE, plusHalfHour(TODAY_AT_NINE), "BOOKED");

    assertThat(mvc.post().uri("/api/v1/staff/appointments/{id}/arrival", id).with(csrf()))
        .hasStatus(HttpStatus.UNAUTHORIZED);
  }

  private MvcTestResult agenda(String date) {
    return mvc.get().uri("/api/v1/staff/agenda?date={date}", date).with(staff()).exchange();
  }

  private MvcTestResult act(long appointmentId, String action) {
    return mvc.post()
        .uri("/api/v1/staff/appointments/{id}/{action}", appointmentId, action)
        .with(staff())
        .with(csrf())
        .exchange();
  }

  private static org.springframework.test.web.servlet.request.RequestPostProcessor staff() {
    return user("anna").roles("STAFF");
  }

  private static Instant plusHalfHour(Instant start) {
    return start.plusSeconds(30 * 60);
  }
}
