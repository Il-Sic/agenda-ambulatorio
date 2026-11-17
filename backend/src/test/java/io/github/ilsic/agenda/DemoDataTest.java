package io.github.ilsic.agenda;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.jayway.jsonpath.JsonPath;
import io.github.ilsic.agenda.outbox.OutboxPublisher;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * Starts the application the way {@code docker compose up} does, with the demo data loaded, and
 * checks that what the README promises is there.
 */
@IntegrationTest
@TestPropertySource(properties = "spring.liquibase.contexts=demo")
class DemoDataTest {

  @Autowired MockMvcTester mvc;
  @Autowired JdbcClient jdbc;
  @Autowired OutboxPublisher outboxPublisher;

  @ParameterizedTest
  @CsvSource({"admin, admin-demo", "segreteria, segreteria-demo"})
  void theDemoAccountsDeclaredInTheReadmeCanSignIn(String username, String password) {
    assertThat(
            mvc.post()
                .uri("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("username", username)
                .param("password", password))
        .hasStatus(HttpStatus.NO_CONTENT);
  }

  @Test
  void everyDemoDoctorCanBeBookedWithinAWeek() throws Exception {
    List<Integer> specialtyIds = JsonPath.read(get("/api/v1/specialties"), "$[*].id");
    assertThat(specialtyIds).isNotEmpty();

    for (Integer specialtyId : specialtyIds) {
      List<Integer> doctorIds =
          JsonPath.read(get("/api/v1/doctors?specialtyId=" + specialtyId), "$[*].id");
      assertThat(doctorIds).isNotEmpty();
      for (Integer doctorId : doctorIds) {
        // The test clock says it is 15 February 2027.
        List<String> slots =
            JsonPath.read(
                get("/api/v1/doctors/" + doctorId + "/slots?from=2027-02-15&to=2027-02-21"),
                "$[*].startsAt");
        assertThat(slots).as("slots of doctor %s", doctorId).isNotEmpty();
      }
    }
  }

  /** The demo events are written in SQL: this proves the application can still read them. */
  @Test
  void theDemoBookingsAreAnnouncedByEmailThroughKafka() {
    outboxPublisher.publishPending();

    await()
        .atMost(Duration.ofSeconds(20))
        .untilAsserted(() ->
            assertThat(
                    jdbc.sql(
                            """
                            SELECT count(*) FROM sent_email
                             WHERE subject LIKE 'Prenotazione confermata - codice DEMO%'
                            """)
                        .query(Long.class)
                        .single())
                .isEqualTo(8));
  }

  @Test
  void theAgendaIsNotEmptyOnFirstStart() {
    Long appointments = jdbc.sql("SELECT count(*) FROM appointment").query(Long.class).single();

    assertThat(appointments).isPositive();
  }

  private String get(String uri) throws Exception {
    return mvc.get().uri(uri).exchange().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }
}
