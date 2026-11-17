package io.github.ilsic.agenda.scheduling;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface WeeklyAvailabilityRepository extends JpaRepository<WeeklyAvailability, Long> {

  List<WeeklyAvailability> findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(Long doctorId);
}
