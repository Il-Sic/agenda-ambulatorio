package io.github.ilsic.agenda.scheduling;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static java.time.DayOfWeek.MONDAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Tests run "on" Monday 15 February 2027. */
@IntegrationTest
class ClosureApiTest {

  private static final RequestPostProcessor ADMIN = user("dir").roles("ADMIN");
  private static final RequestPostProcessor STAFF = user("anna").roles("STAFF");

  @Autowired MockMvcTester mvc;
  @Autowired TestData data;

  @BeforeEach
  void setUp() {
    data.reset();
  }

  @Test
  void listsTodayAndFutureClosureDaysOnly() {
    data.closure(LocalDate.of(2027, 1, 1));
    data.closure(LocalDate.of(2027, 2, 15));
    data.closure(LocalDate.of(2027, 12, 25));

    assertThat(mvc.get().uri("/api/v1/staff/closures").with(STAFF))
        .hasStatusOk()
        .bodyJson()
        .extractingPath("$[*].day")
        .asArray()
        .containsExactly("2027-02-15", "2027-12-25");
  }

  @Test
  void anAdminClosesADayAndItsSlotsDisappear() {
    long doctor = data.doctor();
    data.availability(doctor, MONDAY, "09:00", "10:00", 30);

    assertThat(close(ADMIN, "2027-03-01", "Festa del patrono"))
        .hasStatus(HttpStatus.CREATED)
        .bodyJson()
        .isLenientlyEqualTo(
            """
            {"day": "2027-03-01", "reason": "Festa del patrono"}
            """);
    assertThat(mvc.get().uri("/api/v1/doctors/{id}/slots?from=2027-03-01&to=2027-03-01", doctor))
        .bodyJson()
        .isLenientlyEqualTo("[]");
  }

  @Test
  void refusesToCloseTheSameDayTwice() {
    data.closure(LocalDate.of(2027, 3, 1));

    assertThat(close(ADMIN, "2027-03-01", "Di nuovo"))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/closure-exists");
  }

  @Test
  void refusesAClosureWithoutAReason() {
    assertThat(close(ADMIN, "2027-03-01", " ")).hasStatus(HttpStatus.BAD_REQUEST);
  }

  @Test
  void anAdminReopensADay() {
    assertThat(close(ADMIN, "2027-03-01", "Festa del patrono")).hasStatus(HttpStatus.CREATED);
    Number id =
        com.jayway.jsonpath.JsonPath.read(
            body(mvc.get().uri("/api/v1/staff/closures").with(STAFF).exchange()), "$[0].id");

    assertThat(mvc.delete().uri("/api/v1/staff/closures/{id}", id).with(ADMIN).with(csrf()))
        .hasStatus(HttpStatus.NO_CONTENT);
    assertThat(mvc.get().uri("/api/v1/staff/closures").with(STAFF))
        .bodyJson()
        .isLenientlyEqualTo("[]");
  }

  @Test
  void onlyAnAdminMayCloseADay() {
    assertThat(close(STAFF, "2027-03-01", "Festa del patrono"))
        .hasStatus(HttpStatus.FORBIDDEN)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/forbidden");
  }

  private MvcTestResult close(RequestPostProcessor who, String day, String reason) {
    return mvc.post()
        .uri("/api/v1/staff/closures")
        .with(who)
        .with(csrf())
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            """
            {"day": "%s", "reason": "%s"}
            """
                .formatted(day, reason))
        .exchange();
  }

  private static String body(MvcTestResult result) {
    try {
      return result.getResponse().getContentAsString();
    } catch (java.io.UnsupportedEncodingException e) {
      throw new IllegalStateException(e);
    }
  }
}
