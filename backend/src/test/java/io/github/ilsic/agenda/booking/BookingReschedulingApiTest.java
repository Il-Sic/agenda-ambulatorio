package io.github.ilsic.agenda.booking;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static java.time.DayOfWeek.MONDAY;
import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Tests run "on" 15 February 2027; the visits are on Monday 1 March, at 9:00 in Rome. */
@IntegrationTest
class BookingReschedulingApiTest {

  private static final String EMAIL = "giulia.bianchi@example.com";
  private static final String NINE = "2027-03-01T08:00:00Z";
  private static final String HALF_PAST_NINE = "2027-03-01T08:30:00Z";
  private static final String TEN = "2027-03-01T09:00:00Z";

  @Autowired MockMvcTester mvc;
  @Autowired TestData data;
  @Autowired JdbcClient jdbc;

  long doctor;
  String code;

  @BeforeEach
  void setUp() throws Exception {
    data.reset();
    doctor = data.doctor(data.specialty("Cardiologia"), "Marchetti");
    data.availability(doctor, MONDAY, "09:00", "10:30", 30);
    code = JsonPath.read(book(NINE, EMAIL).getResponse().getContentAsString(), "$.code");
  }

  @Test
  void movesAVisitToAnotherFreeSlotOfTheSameDoctorAndFreesTheOldOne() {
    assertThat(move(code, EMAIL, HALF_PAST_NINE))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            {"code": "%s", "status": "BOOKED", "doctorId": %d,
             "startsAt": "2027-03-01T08:30:00Z", "endsAt": "2027-03-01T09:00:00Z"}
            """
                .formatted(code, doctor));
    assertThat(book(NINE, "un.altro.paziente@example.com")).hasStatus(HttpStatus.CREATED);
  }

  @Test
  void tellsThePatientWithAnEvent() {
    move(code, EMAIL, HALF_PAST_NINE);

    assertThat(eventTypes()).containsExactly("BOOKING_CONFIRMED", "BOOKING_MOVED");
  }

  @Test
  void refusesASlotThatIsTaken() {
    book(HALF_PAST_NINE, "un.altro.paziente@example.com");

    assertThat(move(code, EMAIL, HALF_PAST_NINE))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/slot-not-available");
  }

  @Test
  void theSameRequestSentTwiceMovesTheVisitOnce() {
    move(code, EMAIL, TEN);

    assertThat(move(code, EMAIL, TEN))
        .hasStatusOk()
        .bodyJson()
        .extractingPath("$.startsAt")
        .isEqualTo(TEN);
    assertThat(eventTypes()).containsExactly("BOOKING_CONFIRMED", "BOOKING_MOVED");
  }

  @Test
  void needsTheEmailUsedToBook() {
    assertThat(move(code, "qualcun.altro@example.com", HALF_PAST_NINE))
        .hasStatus(HttpStatus.NOT_FOUND)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/booking-not-found");
  }

  @Test
  void aCancelledVisitCannotBeMoved() {
    mvc.post()
        .uri("/api/v1/bookings/{code}/cancellation", code)
        .with(csrf())
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\": \"%s\"}".formatted(EMAIL))
        .exchange();

    assertThat(move(code, EMAIL, HALF_PAST_NINE))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/appointment-state");
  }

  private MvcTestResult book(String startsAt, String email) {
    return mvc.post()
        .uri("/api/v1/bookings")
        .with(csrf())
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            """
            {"doctorId": %d, "startsAt": "%s", "patientName": "Giulia Bianchi",
             "patientEmail": "%s", "patientPhone": "333 1234567"}
            """
                .formatted(doctor, startsAt, email))
        .exchange();
  }

  private MvcTestResult move(String bookingCode, String email, String startsAt) {
    return mvc.post()
        .uri("/api/v1/bookings/{code}/rescheduling", bookingCode)
        .with(csrf())
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\": \"%s\", \"startsAt\": \"%s\"}".formatted(email, startsAt))
        .exchange();
  }

  private List<String> eventTypes() {
    return jdbc.sql(
            """
            SELECT CAST(payload AS jsonb) ->> 'type' FROM outbox_event
             WHERE message_key = :code
             ORDER BY id
            """)
        .param("code", code)
        .query(String.class)
        .list();
  }
}
