package io.github.ilsic.agenda.booking;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static java.time.DayOfWeek.MONDAY;
import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestClockConfiguration;
import io.github.ilsic.agenda.TestData;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@IntegrationTest
class BookingApiTest {

  // Monday 1 March 2027: 09:00 in Rome is 08:00 UTC. Tests run "on" 15 February 2027.
  private static final LocalDate A_MONDAY = LocalDate.of(2027, 3, 1);
  private static final String NINE = "2027-03-01T08:00:00Z";
  private static final String HALF_PAST_NINE = "2027-03-01T08:30:00Z";

  @Autowired MockMvcTester mvc;
  @Autowired TestData data;

  long doctor;

  @BeforeEach
  void setUp() {
    data.reset();
    doctor = data.doctor(data.specialty("Cardiologia"), "Marchetti");
    data.availability(doctor, MONDAY, "09:00", "10:00", 30);
  }

  @Test
  void listsTheFreeSlotsOfADoctor() {
    assertThat(slots(A_MONDAY, A_MONDAY))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            [
              {"startsAt": "2027-03-01T08:00:00Z", "endsAt": "2027-03-01T08:30:00Z"},
              {"startsAt": "2027-03-01T08:30:00Z", "endsAt": "2027-03-01T09:00:00Z"}
            ]
            """);
  }

  @Test
  void answersNotFoundWhenListingSlotsOfAnUnknownDoctor() {
    assertThat(mvc.get().uri("/api/v1/doctors/999/slots?from=2027-03-01&to=2027-03-01"))
        .hasStatus(HttpStatus.NOT_FOUND)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/doctor-not-found");
  }

  @Test
  void refusesToListSlotsForMoreThanAMonthAtOnce() {
    assertThat(slots(A_MONDAY, A_MONDAY.plusDays(32)))
        .hasStatus(HttpStatus.BAD_REQUEST)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/invalid-period");
  }

  @Test
  void refusesAPeriodThatEndsBeforeItStarts() {
    assertThat(slots(A_MONDAY, A_MONDAY.minusDays(1))).hasStatus(HttpStatus.BAD_REQUEST);
  }

  @Test
  void booksAFreeSlotAndReturnsABookingCode() {
    MvcTestResult result = book(doctor, NINE, "giulia.bianchi@example.com");

    assertThat(result).hasStatus(HttpStatus.CREATED);
    assertThat(result)
        .bodyJson()
        .isLenientlyEqualTo(
            """
            {
              "status": "BOOKED",
              "startsAt": "2027-03-01T08:00:00Z",
              "endsAt": "2027-03-01T08:30:00Z",
              "doctorName": "Dott.ssa Elena Marchetti",
              "specialty": "Cardiologia",
              "patientName": "Giulia Bianchi"
            }
            """);
    assertThat(result).bodyJson().extractingPath("$.code").asString().matches("[A-Z2-9]{8}");
  }

  @Test
  void aBookedSlotIsNoLongerOffered() {
    book(doctor, NINE, "giulia.bianchi@example.com");

    assertThat(slots(A_MONDAY, A_MONDAY))
        .bodyJson()
        .extractingPath("$[*].startsAt")
        .asArray()
        .containsExactly(HALF_PAST_NINE);
  }

  @Test
  void refusesASlotThatIsAlreadyTaken() {
    book(doctor, NINE, "giulia.bianchi@example.com");

    assertThat(book(doctor, NINE, "marco.conti@example.com"))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/slot-not-available");
  }

  @Test
  void describesErrorsAsProblemDetails() {
    book(doctor, NINE, "giulia.bianchi@example.com");

    MvcTestResult result = book(doctor, NINE, "marco.conti@example.com");

    assertThat(result).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
    assertThat(result)
        .bodyJson()
        .isLenientlyEqualTo(
            """
            {
              "type": "/problems/slot-not-available",
              "title": "Slot not available",
              "status": 409,
              "detail": "The requested slot is not available",
              "instance": "/api/v1/bookings"
            }
            """);
  }

  @Test
  void refusesATimeTheDoctorDoesNotOffer() {
    String tenPastNine = "2027-03-01T08:10:00Z";

    assertThat(book(doctor, tenPastNine, "giulia.bianchi@example.com"))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/slot-not-available");
  }

  @Test
  void refusesASlotInThePast() {
    Instant lastMondayAtNine = Instant.parse("2027-02-08T08:00:00Z");
    assertThat(lastMondayAtNine).isBefore(TestClockConfiguration.NOW);

    assertThat(book(doctor, lastMondayAtNine.toString(), "giulia.bianchi@example.com"))
        .hasStatus(HttpStatus.CONFLICT);
  }

  @Test
  void answersNotFoundWhenBookingAnUnknownDoctor() {
    assertThat(book(999, NINE, "giulia.bianchi@example.com"))
        .hasStatus(HttpStatus.NOT_FOUND)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/doctor-not-found");
  }

  @Test
  void reportsEveryInvalidField() {
    MvcTestResult result =
        mvc.post()
            .uri("/api/v1/bookings")
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"doctorId": %d, "startsAt": "%s",
                 "patientName": " ", "patientEmail": "not-an-email", "patientPhone": "abc"}
                """
                    .formatted(doctor, NINE))
            .exchange();

    assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
    assertThat(result).bodyJson().extractingPath("$.type").isEqualTo("/problems/validation");
    assertThat(result)
        .bodyJson()
        .extractingPath("$.errors[*].field")
        .asArray()
        .containsExactlyInAnyOrder("patientName", "patientEmail", "patientPhone");
  }

  @Test
  void findsABookingByCodeAndEmailWhateverTheEmailCase() {
    String code = codeOf(book(doctor, NINE, "giulia.bianchi@example.com"));

    assertThat(lookup(code, "Giulia.Bianchi@Example.com"))
        .hasStatusOk()
        .bodyJson()
        .extractingPath("$.code")
        .isEqualTo(code);
  }

  @Test
  void doesNotRevealABookingToSomeoneWithTheWrongEmail() {
    String code = codeOf(book(doctor, NINE, "giulia.bianchi@example.com"));

    assertThat(lookup(code, "someone.else@example.com"))
        .hasStatus(HttpStatus.NOT_FOUND)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/booking-not-found");
  }

  @Test
  void answersNotFoundForAnUnknownCode() {
    assertThat(lookup("NOPE2345", "giulia.bianchi@example.com")).hasStatus(HttpStatus.NOT_FOUND);
  }

  @Test
  void cancelsABookingAndFreesItsSlot() {
    String code = codeOf(book(doctor, NINE, "giulia.bianchi@example.com"));

    assertThat(cancel(code, "giulia.bianchi@example.com"))
        .hasStatusOk()
        .bodyJson()
        .extractingPath("$.status")
        .isEqualTo("CANCELLED");
    assertThat(slots(A_MONDAY, A_MONDAY))
        .bodyJson()
        .extractingPath("$[*].startsAt")
        .asArray()
        .containsExactly(NINE, HALF_PAST_NINE);
  }

  @Test
  void refusesToCancelTwice() {
    String code = codeOf(book(doctor, NINE, "giulia.bianchi@example.com"));
    cancel(code, "giulia.bianchi@example.com");

    assertThat(cancel(code, "giulia.bianchi@example.com"))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/appointment-state");
  }

  @Test
  void refusesToCancelAVisitThatHasAlreadyStarted() {
    Instant anHourAgo = TestClockConfiguration.NOW.minus(Duration.ofHours(1));
    data.appointment(
        doctor, "PAST2345", anHourAgo, anHourAgo.plus(Duration.ofMinutes(30)), "BOOKED");

    assertThat(cancel("PAST2345", TestData.PATIENT_EMAIL)).hasStatus(HttpStatus.CONFLICT);
  }

  @Test
  void doesNotLetSomeoneWithTheWrongEmailCancel() {
    String code = codeOf(book(doctor, NINE, "giulia.bianchi@example.com"));

    assertThat(cancel(code, "someone.else@example.com")).hasStatus(HttpStatus.NOT_FOUND);
    assertThat(lookup(code, "giulia.bianchi@example.com"))
        .bodyJson()
        .extractingPath("$.status")
        .isEqualTo("BOOKED");
  }

  private MvcTestResult slots(LocalDate from, LocalDate to) {
    return mvc.get()
        .uri("/api/v1/doctors/{id}/slots?from={from}&to={to}", doctor, from, to)
        .exchange();
  }

  private MvcTestResult book(long doctorId, String startsAt, String email) {
    return mvc.post()
        .uri("/api/v1/bookings")
        .with(csrf())
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            """
            {"doctorId": %d, "startsAt": "%s", "patientName": "Giulia Bianchi",
             "patientEmail": "%s", "patientPhone": "333 1234567"}
            """
                .formatted(doctorId, startsAt, email))
        .exchange();
  }

  private MvcTestResult lookup(String code, String email) {
    return postEmail("/api/v1/bookings/{code}/lookup", code, email);
  }

  private MvcTestResult cancel(String code, String email) {
    return postEmail("/api/v1/bookings/{code}/cancellation", code, email);
  }

  private MvcTestResult postEmail(String uri, String code, String email) {
    return mvc.post()
        .uri(uri, code)
        .with(csrf())
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            """
            {"email": "%s"}
            """
                .formatted(email))
        .exchange();
  }

  private static String codeOf(MvcTestResult booking) {
    try {
      return JsonPath.read(booking.getResponse().getContentAsString(), "$.code");
    } catch (java.io.UnsupportedEncodingException e) {
      throw new IllegalStateException(e);
    }
  }
}
