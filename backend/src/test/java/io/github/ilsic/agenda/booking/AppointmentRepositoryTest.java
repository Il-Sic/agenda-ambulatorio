package io.github.ilsic.agenda.booking;

import static java.time.temporal.ChronoUnit.MINUTES;
import static org.assertj.core.api.Assertions.assertThat;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@IntegrationTest
class AppointmentRepositoryTest {

  private static final Instant START = Instant.parse("2027-03-01T08:00:00Z");
  private static final Slot SLOT = new Slot(START, START.plus(30, MINUTES));
  private static final Patient PATIENT =
      new Patient("Giulia Bianchi", "giulia.bianchi@example.com", "3331234567");

  @Autowired AppointmentRepository appointments;
  @Autowired TestData data;

  @BeforeEach
  void setUp() {
    data.reset();
  }

  @Test
  void storesAnAppointmentAndFindsItByCode() {
    long doctor = data.doctor();
    Instant bookedAt = Instant.parse("2027-02-20T10:15:00Z");
    appointments.save(Appointment.book("ABCD2345", doctor, SLOT, PATIENT, bookedAt));

    Appointment found = appointments.findByCode("ABCD2345").orElseThrow();

    assertThat(found.id()).isNotNull();
    assertThat(found.doctorId()).isEqualTo(doctor);
    assertThat(found.slot()).isEqualTo(SLOT);
    assertThat(found.patient()).isEqualTo(PATIENT);
    assertThat(found.status()).isEqualTo(AppointmentStatus.BOOKED);
    assertThat(found.createdAt()).isEqualTo(bookedAt);
  }

  @Test
  void findsNothingForAnUnknownCode() {
    assertThat(appointments.findByCode("NOPE0000")).isEmpty();
  }
}
