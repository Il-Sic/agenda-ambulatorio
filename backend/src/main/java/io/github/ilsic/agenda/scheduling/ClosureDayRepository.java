package io.github.ilsic.agenda.scheduling;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ClosureDayRepository extends JpaRepository<ClosureDay, Long> {

  List<ClosureDay> findByDayGreaterThanEqualOrderByDay(LocalDate from);
}
