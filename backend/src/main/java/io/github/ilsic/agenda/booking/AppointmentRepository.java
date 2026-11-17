package io.github.ilsic.agenda.booking;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface AppointmentRepository extends JpaRepository<Appointment, Long> {

  Optional<Appointment> findByCode(String code);

  Optional<Appointment> findByIdempotencyKey(String idempotencyKey);

  @Query(
      """
      select a from Appointment a
       where a.slot.startsAt >= :from and a.slot.startsAt < :to
       order by a.slot.startsAt, a.doctorId
      """)
  List<Appointment> startingBetween(Instant from, Instant to);
}
