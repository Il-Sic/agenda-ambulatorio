package io.github.ilsic.agenda.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Feeds messages straight to the listener; the trip through Kafka has its own test. */
@IntegrationTest
class BookingEventListenerTest {

  @Autowired BookingEventListener listener;
  @Autowired MockMvcTester mvc;
  @Autowired JdbcClient jdbc;
  @Autowired TestData data;

  @BeforeEach
  void setUp() {
    data.reset();
  }

  @Test
  void savesTheEmailAStaffMemberCanThenRead() {
    listener.on(message(UUID.randomUUID(), "BOOKING_CONFIRMED", "giulia.bianchi@example.com"));

    assertThat(mvc.get().uri("/api/v1/staff/notifications").with(user("anna").roles("STAFF")))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            [{
              "recipient": "giulia.bianchi@example.com",
              "subject": "Prenotazione confermata - codice ABCD2345",
              "sentAt": "2027-02-15T09:00:00Z"
            }]
            """);
  }

  @Test
  void anEventDeliveredTwiceProducesOneEmail() {
    UUID eventId = UUID.randomUUID();

    listener.on(message(eventId, "BOOKING_CONFIRMED", "giulia.bianchi@example.com"));
    listener.on(message(eventId, "BOOKING_CONFIRMED", "giulia.bianchi@example.com"));

    assertThat(sentEmails()).isEqualTo(1);
  }

  @Test
  void ignoresFieldsAndEventTypesItDoesNotKnow() {
    listener.on(message(UUID.randomUUID(), "SOMETHING_NEW", "giulia.bianchi@example.com"));

    assertThat(sentEmails()).isZero();
  }

  @Test
  void listsTheNewestEmailFirst() {
    listener.on(message(UUID.randomUUID(), "BOOKING_CONFIRMED", "first@example.com"));
    listener.on(message(UUID.randomUUID(), "BOOKING_CANCELLED", "second@example.com"));

    assertThat(mvc.get().uri("/api/v1/staff/notifications").with(user("anna").roles("STAFF")))
        .bodyJson()
        .extractingPath("$[*].recipient")
        .asArray()
        .containsExactly("second@example.com", "first@example.com");
  }

  @Test
  void theListIsClosedToVisitorsWhoHaveNotSignedIn() {
    assertThat(mvc.get().uri("/api/v1/staff/notifications")).hasStatus(HttpStatus.UNAUTHORIZED);
  }

  private long sentEmails() {
    return jdbc.sql("SELECT count(*) FROM sent_email").query(Long.class).single();
  }

  private static String message(UUID eventId, String type, String email) {
    return """
    {
      "eventId": "%s",
      "type": "%s",
      "occurredAt": "2027-02-15T09:00:00Z",
      "bookingCode": "ABCD2345",
      "patientName": "Giulia Bianchi",
      "patientEmail": "%s",
      "doctorName": "Dott.ssa Elena Marchetti",
      "specialty": "Cardiologia",
      "startsAt": "2027-03-01T08:00:00Z",
      "endsAt": "2027-03-01T08:30:00Z",
      "aFieldAddedLater": true
    }
    """
        .formatted(eventId, type, email);
  }
}
