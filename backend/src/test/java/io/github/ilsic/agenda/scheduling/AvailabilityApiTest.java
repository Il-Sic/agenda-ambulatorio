package io.github.ilsic.agenda.scheduling;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static java.time.DayOfWeek.MONDAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@IntegrationTest
class AvailabilityApiTest {

  private static final RequestPostProcessor ADMIN = user("dir").roles("ADMIN");
  private static final RequestPostProcessor STAFF = user("anna").roles("STAFF");

  @Autowired MockMvcTester mvc;
  @Autowired TestData data;

  long doctor;

  @BeforeEach
  void setUp() {
    data.reset();
    doctor = data.doctor(data.specialty("Cardiologia"), "Marchetti");
  }

  @Test
  void listsEveryDoctorForTheStaff() {
    assertThat(mvc.get().uri("/api/v1/staff/doctors").with(STAFF))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            [{"id": %d, "name": "Dott.ssa Elena Marchetti", "specialty": "Cardiologia"}]
            """
                .formatted(doctor));
  }

  @Test
  void listsTheWeeklyAvailabilityOfADoctor() {
    data.availability(doctor, MONDAY, "15:00", "18:00", 20);
    data.availability(doctor, MONDAY, "09:00", "13:00", 30);

    assertThat(mvc.get().uri("/api/v1/staff/doctors/{id}/availability", doctor).with(STAFF))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            [
              {"dayOfWeek": "MONDAY", "startTime": "09:00", "endTime": "13:00", "slotMinutes": 30},
              {"dayOfWeek": "MONDAY", "startTime": "15:00", "endTime": "18:00", "slotMinutes": 20}
            ]
            """);
  }

  @Test
  void anAdminAddsAWindowAndPatientsCanBookInIt() {
    assertThat(add(ADMIN, "MONDAY", "09:00", "10:00", 30)).hasStatus(HttpStatus.CREATED);

    assertThat(mvc.get().uri("/api/v1/doctors/{id}/slots?from=2027-03-01&to=2027-03-01", doctor))
        .bodyJson()
        .extractingPath("$[*].startsAt")
        .asArray()
        .containsExactly("2027-03-01T08:00:00Z", "2027-03-01T08:30:00Z");
  }

  @Test
  void refusesAWindowThatOverlapsAnExistingOne() {
    data.availability(doctor, MONDAY, "09:00", "13:00", 30);

    assertThat(add(ADMIN, "MONDAY", "12:00", "15:00", 30))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/availability-overlap");
  }

  @Test
  void refusesAWindowThatEndsBeforeItStarts() {
    assertThat(add(ADMIN, "MONDAY", "13:00", "09:00", 30))
        .hasStatus(HttpStatus.BAD_REQUEST)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/invalid-availability");
  }

  @Test
  void refusesAVisitLengthThatMakesNoSense() {
    assertThat(add(ADMIN, "MONDAY", "09:00", "13:00", 0))
        .hasStatus(HttpStatus.BAD_REQUEST)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/validation");
  }

  @Test
  void answersNotFoundForAnUnknownDoctor() {
    assertThat(
            mvc.post()
                .uri("/api/v1/staff/doctors/999/availability")
                .with(ADMIN)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(window("MONDAY", "09:00", "10:00", 30)))
        .hasStatus(HttpStatus.NOT_FOUND);
  }

  @Test
  void anAdminRemovesAWindow() {
    long window = data.availability(doctor, MONDAY, "09:00", "13:00", 30);

    assertThat(mvc.delete().uri("/api/v1/staff/availability/{id}", window).with(ADMIN).with(csrf()))
        .hasStatus(HttpStatus.NO_CONTENT);
    assertThat(mvc.get().uri("/api/v1/staff/doctors/{id}/availability", doctor).with(STAFF))
        .bodyJson()
        .isLenientlyEqualTo("[]");
  }

  @Test
  void onlyAnAdminMayChangeAvailability() {
    long window = data.availability(doctor, MONDAY, "09:00", "13:00", 30);

    assertThat(add(STAFF, "TUESDAY", "09:00", "10:00", 30))
        .hasStatus(HttpStatus.FORBIDDEN)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/forbidden");
    assertThat(mvc.delete().uri("/api/v1/staff/availability/{id}", window).with(STAFF).with(csrf()))
        .hasStatus(HttpStatus.FORBIDDEN);
  }

  private MvcTestResult add(
      RequestPostProcessor who, String day, String start, String end, int slotMinutes) {
    return mvc.post()
        .uri("/api/v1/staff/doctors/{id}/availability", doctor)
        .with(who)
        .with(csrf())
        .contentType(MediaType.APPLICATION_JSON)
        .content(window(day, start, end, slotMinutes))
        .exchange();
  }

  private static String window(String day, String start, String end, int slotMinutes) {
    return """
    {"dayOfWeek": "%s", "startTime": "%s", "endTime": "%s", "slotMinutes": %d}
    """
        .formatted(day, start, end, slotMinutes);
  }
}
