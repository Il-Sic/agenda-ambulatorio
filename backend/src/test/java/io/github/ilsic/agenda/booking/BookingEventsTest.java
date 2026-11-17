package io.github.ilsic.agenda.booking;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static java.time.DayOfWeek.MONDAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import com.jayway.jsonpath.JsonPath;
import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Every booking and cancellation must leave an event in the outbox, in the same transaction. */
@IntegrationTest
class BookingEventsTest {

  private static final String NINE = "2027-03-01T08:00:00Z";

  @Autowired MockMvcTester mvc;
  @Autowired JdbcClient jdbc;
  @Autowired TestData data;

  long doctor;

  @BeforeEach
  void setUp() {
    data.reset();
    doctor = data.doctor(data.specialty("Cardiologia"), "Marchetti");
    data.availability(doctor, MONDAY, "09:00", "10:00", 30);
  }

  @Test
  void aBookingStoresAConfirmationEventKeyedByItsCode() throws Exception {
    String code = codeOf(book("giulia.bianchi@example.com"));

    Map<String, Object> event = events().getFirst();
    assertThat(events()).hasSize(1);
    assertThat(event)
        .containsEntry("topic", "agenda.booking-events")
        .containsEntry("message_key", code);
    String payload = (String) event.get("payload");
    assertThat(JsonPath.<String>read(payload, "$.eventId"))
        .isEqualTo(event.get("event_id").toString());
    assertThat(JsonPath.<String>read(payload, "$.type")).isEqualTo("BOOKING_CONFIRMED");
    assertThat(JsonPath.<String>read(payload, "$.bookingCode")).isEqualTo(code);
    assertThat(JsonPath.<String>read(payload, "$.patientName")).isEqualTo("Giulia Bianchi");
    assertThat(JsonPath.<String>read(payload, "$.patientEmail"))
        .isEqualTo("giulia.bianchi@example.com");
    assertThat(JsonPath.<String>read(payload, "$.doctorName"))
        .isEqualTo("Dott.ssa Elena Marchetti");
    assertThat(JsonPath.<String>read(payload, "$.specialty")).isEqualTo("Cardiologia");
    assertThat(JsonPath.<String>read(payload, "$.startsAt")).isEqualTo(NINE);
  }

  @Test
  void aRefusedBookingStoresNoEvent() {
    book("giulia.bianchi@example.com");

    book("marco.conti@example.com");

    assertThat(events()).hasSize(1);
  }

  @Test
  void aCancellationByThePatientStoresACancellationEvent() throws Exception {
    String code = codeOf(book("giulia.bianchi@example.com"));

    mvc.post()
        .uri("/api/v1/bookings/{code}/cancellation", code)
        .with(csrf())
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\": \"giulia.bianchi@example.com\"}")
        .exchange();

    assertThat(eventTypes()).containsExactly("BOOKING_CONFIRMED", "BOOKING_CANCELLED");
  }

  @Test
  void aCancellationByTheStaffStoresACancellationEvent() {
    Instant nextMonday = Instant.parse("2027-02-22T08:00:00Z");
    long id = data.appointment(doctor, nextMonday, nextMonday.plusSeconds(1800), "BOOKED");

    mvc.post()
        .uri("/api/v1/staff/appointments/{id}/cancellation", id)
        .with(user("anna").roles("STAFF"))
        .with(csrf())
        .exchange();

    assertThat(eventTypes()).containsExactly("BOOKING_CANCELLED");
  }

  @Test
  void recordingAnArrivalStoresNoEvent() {
    Instant todayAtEleven = Instant.parse("2027-02-15T10:00:00Z");
    long id = data.appointment(doctor, todayAtEleven, todayAtEleven.plusSeconds(1800), "BOOKED");

    mvc.post()
        .uri("/api/v1/staff/appointments/{id}/arrival", id)
        .with(user("anna").roles("STAFF"))
        .with(csrf())
        .exchange();

    assertThat(events()).isEmpty();
  }

  private MvcTestResult book(String email) {
    return mvc.post()
        .uri("/api/v1/bookings")
        .with(csrf())
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            """
            {"doctorId": %d, "startsAt": "%s", "patientName": "Giulia Bianchi",
             "patientEmail": "%s", "patientPhone": "333 1234567"}
            """
                .formatted(doctor, NINE, email))
        .exchange();
  }

  private List<Map<String, Object>> events() {
    return jdbc.sql("SELECT * FROM outbox_event ORDER BY id").query().listOfRows();
  }

  private List<String> eventTypes() {
    return events().stream()
        .map(event -> JsonPath.<String>read((String) event.get("payload"), "$.type"))
        .toList();
  }

  private static String codeOf(MvcTestResult booking) throws Exception {
    return JsonPath.read(
        booking.getResponse().getContentAsString(StandardCharsets.UTF_8), "$.code");
  }
}
