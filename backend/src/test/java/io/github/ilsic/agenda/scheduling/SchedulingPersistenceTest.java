package io.github.ilsic.agenda.scheduling;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

@IntegrationTest
class SchedulingPersistenceTest {

  @Autowired SpecialtyRepository specialties;
  @Autowired DoctorRepository doctors;
  @Autowired WeeklyAvailabilityRepository availabilities;
  @Autowired ClosureDayRepository closures;
  @Autowired JdbcClient jdbc;
  @Autowired TestData data;

  @BeforeEach
  void setUp() {
    data.reset();
  }

  @Test
  void findsTheDoctorsOfASpecialtyByLastName() {
    Specialty cardiology = specialties.save(new Specialty("Cardiologia"));
    Specialty dermatology = specialties.save(new Specialty("Dermatologia"));
    doctors.save(new Doctor(cardiology, "Dott.", "Paolo", "Rinaldi"));
    doctors.save(new Doctor(cardiology, "Dott.ssa", "Elena", "Marchetti"));
    doctors.save(new Doctor(dermatology, "Dott.", "Luca", "Ferri"));

    List<Doctor> found = doctors.findBySpecialtyIdOrderByLastNameAscFirstNameAsc(cardiology.id());

    assertThat(found)
        .extracting(Doctor::displayName)
        .containsExactly("Dott.ssa Elena Marchetti", "Dott. Paolo Rinaldi");
  }

  @Test
  void storesTheWeekdayAsItsIsoNumber() {
    long doctor = data.doctor();
    availabilities.save(
        new WeeklyAvailability(
            doctor, DayOfWeek.SUNDAY, LocalTime.of(9, 0), LocalTime.of(13, 0), 30));

    Integer stored =
        jdbc.sql("SELECT day_of_week FROM weekly_availability").query(Integer.class).single();
    WeeklyAvailability loaded =
        availabilities.findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(doctor).getFirst();

    assertThat(stored).isEqualTo(7);
    assertThat(loaded.dayOfWeek()).isEqualTo(DayOfWeek.SUNDAY);
  }

  @Test
  void listsClosureDaysFromAGivenDate() {
    closures.save(new ClosureDay(LocalDate.of(2027, 1, 1), "Capodanno"));
    closures.save(new ClosureDay(LocalDate.of(2027, 12, 25), "Natale"));
    closures.save(new ClosureDay(LocalDate.of(2027, 8, 15), "Ferragosto"));

    List<ClosureDay> upcoming =
        closures.findByDayGreaterThanEqualOrderByDay(LocalDate.of(2027, 6, 1));

    assertThat(upcoming).extracting(ClosureDay::reason).containsExactly("Ferragosto", "Natale");
  }
}
