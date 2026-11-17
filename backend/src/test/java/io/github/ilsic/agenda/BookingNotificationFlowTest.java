package io.github.ilsic.agenda;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static java.time.DayOfWeek.MONDAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import io.github.ilsic.agenda.outbox.OutboxPublisher;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * The whole journey of an event, through a real Kafka broker: a patient books, the outbox
 * publishes, the notification module consumes and the e-mail shows up for the staff.
 */
@IntegrationTest
class BookingNotificationFlowTest {

  @Autowired MockMvcTester mvc;
  @Autowired OutboxPublisher outboxPublisher;
  @Autowired TestData data;

  @BeforeEach
  void setUp() {
    data.reset();
  }

  @Test
  void aBookingEndsUpAsAnEmailInTheStaffList() {
    long doctor = data.doctor(data.specialty("Cardiologia"), "Marchetti");
    data.availability(doctor, MONDAY, "09:00", "10:00", 30);
    assertThat(
            mvc.post()
                .uri("/api/v1/bookings")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"doctorId": %d, "startsAt": "2027-03-01T08:00:00Z",
                     "patientName": "Giulia Bianchi", "patientEmail": "giulia.bianchi@example.com",
                     "patientPhone": "333 1234567"}
                    """
                        .formatted(doctor)))
        .hasStatus(HttpStatus.CREATED);

    outboxPublisher.publishPending();

    await()
        .atMost(Duration.ofSeconds(20))
        .untilAsserted(() ->
            assertThat(
                    mvc.get().uri("/api/v1/staff/notifications").with(user("anna").roles("STAFF")))
                .bodyJson()
                .extractingPath("$[*].recipient")
                .asArray()
                .containsExactly("giulia.bianchi@example.com"));
  }
}
