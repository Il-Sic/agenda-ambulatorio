package io.github.ilsic.agenda.booking;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static java.time.DayOfWeek.MONDAY;
import static java.time.temporal.ChronoUnit.MINUTES;
import static org.assertj.core.api.Assertions.assertThat;

import io.github.ilsic.agenda.AtTheSameTime;
import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** The headline rule under fire: many patients, one slot, at the same instant. */
@IntegrationTest
class ConcurrentBookingTest {

  private static final int PATIENTS = 12;

  // Monday 1 March 2027, 09:00 in Rome.
  private static final Instant NINE = Instant.parse("2027-03-01T08:00:00Z");

  @Autowired MockMvcTester mvc;
  @Autowired AppointmentRepository appointments;
  @Autowired JdbcClient jdbc;
  @Autowired TestData data;

  long doctor;

  @BeforeEach
  void setUp() {
    data.reset();
    doctor = data.doctor();
    data.availability(doctor, MONDAY, "09:00", "10:00", 30);
  }

  @Test
  void onlyOnePatientGetsTheSlotWhenManyBookAtTheSameTime() throws Exception {
    List<Integer> statuses =
        AtTheSameTime.run(
            PATIENTS,
            patient ->
                mvc.post()
                    .uri("/api/v1/bookings")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"doctorId": %d, "startsAt": "%s", "patientName": "Paziente %d",
                         "patientEmail": "paziente%d@example.com", "patientPhone": "3330000000"}
                        """
                            .formatted(doctor, NINE, patient, patient))
                    .exchange()
                    .getResponse()
                    .getStatus());

    assertThat(statuses).filteredOn(status -> status == HttpStatus.CREATED.value()).hasSize(1);
    assertThat(statuses)
        .filteredOn(status -> status == HttpStatus.CONFLICT.value())
        .hasSize(PATIENTS - 1);
    assertThat(appointmentsInTheDatabase()).isEqualTo(1);
  }

  /**
   * Skips the service and its "is the slot free?" check on purpose. Each thread writes an
   * appointment that overlaps all the others, and the database still lets exactly one through.
   */
  @Test
  void theDatabaseAloneLetsOnlyOneOverlappingAppointmentThrough() throws Exception {
    List<Boolean> saved =
        AtTheSameTime.run(
            PATIENTS,
            patient -> {
              // Different start times, all overlapping: 09:00–09:30, 09:01–09:31, …
              Instant start = NINE.plus(patient, MINUTES);
              Appointment appointment =
                  Appointment.book(
                      "RACE%04d".formatted(patient),
                      doctor,
                      new Slot(start, start.plus(30, MINUTES)),
                      new Patient("Paziente " + patient, "p" + patient + "@example.com", "333"),
                      NINE);
              try {
                appointments.saveAndFlush(appointment);
                return true;
              } catch (DataAccessException refusedByTheDatabase) {
                return false;
              }
            });

    assertThat(saved).filteredOn(wasSaved -> wasSaved).hasSize(1);
    assertThat(appointmentsInTheDatabase()).isEqualTo(1);
  }

  private long appointmentsInTheDatabase() {
    return jdbc.sql("SELECT count(*) FROM appointment WHERE status <> 'CANCELLED'")
        .query(Long.class)
        .single();
  }
}
