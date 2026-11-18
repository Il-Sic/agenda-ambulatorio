package io.github.ilsic.agenda.booking;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import com.jayway.jsonpath.JsonPath;
import io.github.ilsic.agenda.AtTheSameTime;
import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestClockConfiguration;
import io.github.ilsic.agenda.TestData;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * The desk gives a number to whoever arrives and calls it; the screen in the waiting room shows
 * numbers and rooms, never names. Tests run "on" Monday 15 February 2027 at 10:00 in Rome.
 */
@IntegrationTest
class WaitingRoomApiTest {

  private static final Instant NOW = TestClockConfiguration.NOW;
  private static final LocalDate TODAY = LocalDate.parse("2027-02-15");
  private static final Instant TODAY_AT_NINE = Instant.parse("2027-02-15T08:00:00Z");
  private static final Instant TODAY_AT_ELEVEN = Instant.parse("2027-02-15T10:00:00Z");
  private static final Instant YESTERDAY_AT_NINE = Instant.parse("2027-02-14T08:00:00Z");

  @Autowired MockMvcTester mvc;
  @Autowired TestData data;

  long marchetti;
  long ferri;

  @BeforeEach
  void setUp() {
    data.reset();
    marchetti = data.doctor(data.specialty("Cardiologia"), "Marchetti");
    ferri = data.doctor(data.specialty("Ortopedia"), "Ferri");
    data.room(marchetti, "Ambulatorio 4", "Primo piano");
    data.room(ferri, "Ambulatorio 1", "Piano terra");
  }

  @Test
  void patientsGetTheNumbersOfTheDayInTheOrderTheyArrive() {
    long later = visit(ferri, TODAY_AT_ELEVEN);
    long earlier = visit(marchetti, TODAY_AT_NINE);

    assertThat(act(later, "arrival"))
        .hasStatusOk()
        .bodyJson()
        .extractingPath("$.callNumber")
        .isEqualTo(1);
    assertThat(act(earlier, "arrival")).bodyJson().extractingPath("$.callNumber").isEqualTo(2);
  }

  @Test
  void numbersStartAgainEveryDay() {
    data.numbersGiven(TODAY.minusDays(1), 40);
    long id = visit(marchetti, TODAY_AT_NINE);

    assertThat(act(id, "arrival")).bodyJson().extractingPath("$.callNumber").isEqualTo(1);
  }

  @Test
  void recordingTheArrivalAgainDoesNotGiveASecondNumber() {
    long first = visit(marchetti, TODAY_AT_NINE);
    long second = visit(ferri, TODAY_AT_ELEVEN);
    act(first, "arrival");

    assertThat(act(first, "arrival")).bodyJson().extractingPath("$.callNumber").isEqualTo(1);
    assertThat(act(second, "arrival")).bodyJson().extractingPath("$.callNumber").isEqualTo(2);
  }

  @Test
  void anArrivalRecordedAfterTheDayOfTheVisitGetsNoNumber() {
    long id = visit(marchetti, YESTERDAY_AT_NINE);

    assertThat(act(id, "arrival")).hasStatusOk().bodyJson().extractingPath("$.callNumber").isNull();
  }

  @Test
  void patientsArrivingAtTheSameMomentGetDifferentNumbers() throws Exception {
    List<Long> ids = new ArrayList<>();
    for (int visit = 0; visit < 4; visit++) {
      Instant start = TODAY_AT_NINE.plusSeconds(visit * 30 * 60L);
      ids.add(visit(marchetti, start));
      ids.add(visit(ferri, start));
    }

    List<Integer> numbers =
        AtTheSameTime.run(
            ids.size(),
            which ->
                JsonPath.read(
                    act(ids.get(which - 1), "arrival")
                        .getResponse()
                        .getContentAsString(StandardCharsets.UTF_8),
                    "$.callNumber"));

    assertThat(numbers)
        .containsExactlyInAnyOrderElementsOf(IntStream.rangeClosed(1, 8).boxed().toList());
  }

  @Test
  void aCallPutsTheNumberAndTheRoomOnTheScreenButNeverTheName() {
    long id = visit(marchetti, TODAY_AT_NINE);
    act(id, "arrival");

    assertThat(act(id, "call"))
        .hasStatusOk()
        .bodyJson()
        .extractingPath("$.calledAt")
        .isEqualTo("2027-02-15T09:00:00Z");
    // Nobody signs in on the screen of the waiting room.
    assertThat(mvc.get().uri("/api/v1/waiting-room/calls"))
        .hasStatusOk()
        .bodyJson()
        .isStrictlyEqualTo(
            """
            [
              {
                "number": 1,
                "room": "Ambulatorio 4",
                "floor": "Primo piano",
                "specialty": "Cardiologia",
                "calledAt": "2027-02-15T09:00:00Z"
              }
            ]
            """);
  }

  @Test
  void theScreenShowsTheFiveLatestCallsOfTheDayLatestFirst() {
    for (int number = 1; number <= 6; number++) {
      long id = visit(marchetti, TODAY_AT_NINE.plusSeconds(number * 30 * 60L));
      data.called(id, TODAY, number, NOW.minusSeconds((7 - number) * 60L));
    }
    long yesterday = visit(ferri, YESTERDAY_AT_NINE);
    data.called(yesterday, TODAY.minusDays(1), 9, YESTERDAY_AT_NINE);

    assertThat(mvc.get().uri("/api/v1/waiting-room/calls"))
        .bodyJson()
        .extractingPath("$[*].number")
        .asArray()
        .containsExactly(6, 5, 4, 3, 2);
  }

  @Test
  void callingAgainBringsTheNumberBackOnTop() {
    long first = visit(marchetti, TODAY_AT_NINE);
    long second = visit(ferri, TODAY_AT_NINE);
    data.called(first, TODAY, 1, NOW.minusSeconds(600));
    data.called(second, TODAY, 2, NOW.minusSeconds(300));

    assertThat(act(first, "call")).hasStatusOk();

    assertThat(mvc.get().uri("/api/v1/waiting-room/calls"))
        .bodyJson()
        .extractingPath("$[*].number")
        .asArray()
        .containsExactly(1, 2);
  }

  @Test
  void onlyAPatientWhoArrivedTodayWithANumberCanBeCalled() {
    long booked = visit(marchetti, TODAY_AT_NINE);
    long numberedYesterday = visit(ferri, YESTERDAY_AT_NINE);
    data.called(numberedYesterday, TODAY.minusDays(1), 3, YESTERDAY_AT_NINE);

    assertThat(act(booked, "call"))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/appointment-state");
    assertThat(act(numberedYesterday, "call")).hasStatus(HttpStatus.CONFLICT);
  }

  @Test
  void thePatientSeesTheNumberAndThenThatItIsTheirTurn() {
    long id =
        data.appointment(
            marchetti, "TURN2345", TODAY_AT_NINE, TODAY_AT_NINE.plusSeconds(30 * 60L), "BOOKED");
    act(id, "arrival");

    assertThat(lookup("TURN2345"))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            {
              "code": "TURN2345",
              "status": "ARRIVED",
              "callNumber": 1,
              "calledAt": null,
              "room": "Ambulatorio 4",
              "floor": "Primo piano"
            }
            """);

    act(id, "call");

    assertThat(lookup("TURN2345"))
        .bodyJson()
        .extractingPath("$.calledAt")
        .isEqualTo("2027-02-15T09:00:00Z");
  }

  @Test
  void aDoctorWithoutARoomIsShownWithEmptyTexts() {
    long gentile = data.doctor(data.specialty("Pediatria"), "Gentile");
    long id = visit(gentile, TODAY_AT_NINE);
    act(id, "arrival");
    act(id, "call");

    assertThat(mvc.get().uri("/api/v1/waiting-room/calls"))
        .bodyJson()
        .isLenientlyEqualTo(
            """
            [{"number": 1, "room": "", "floor": "", "specialty": "Pediatria"}]
            """);
  }

  @Test
  void callingIsForTheStaffOnly() {
    long id = visit(marchetti, TODAY_AT_NINE);

    assertThat(mvc.post().uri("/api/v1/staff/appointments/{id}/call", id).with(csrf()).exchange())
        .hasStatus(HttpStatus.UNAUTHORIZED);
  }

  private long visit(long doctorId, Instant startsAt) {
    return data.appointment(doctorId, startsAt, startsAt.plusSeconds(30 * 60L), "BOOKED");
  }

  private MvcTestResult act(long appointmentId, String action) {
    return mvc.post()
        .uri("/api/v1/staff/appointments/{id}/{action}", appointmentId, action)
        .with(staff())
        .with(csrf())
        .exchange();
  }

  private MvcTestResult lookup(String code) {
    return mvc.post()
        .uri("/api/v1/bookings/{code}/lookup", code)
        .with(csrf())
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\": \"%s\"}".formatted(TestData.PATIENT_EMAIL))
        .exchange();
  }

  private static RequestPostProcessor staff() {
    return user("anna").roles("STAFF");
  }
}
