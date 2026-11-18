package io.github.ilsic.agenda.booking;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Limit;
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

  /**
   * Booked visits starting in the given period that have not been reminded of. A visit booked less
   * than a day before it starts is left out: its confirmation is reminder enough.
   */
  @Query(
      """
      select a from Appointment a
       where a.status = io.github.ilsic.agenda.booking.AppointmentStatus.BOOKED
         and a.reminderSentAt is null
         and a.slot.startsAt > :now
         and a.slot.startsAt <= :until
         and a.createdAt <= a.slot.startsAt - 24 hour
       order by a.slot.startsAt
      """)
  List<Appointment> dueForReminder(Instant now, Instant until, Limit limit);

  /** The numbers called on a day, the latest call first. */
  @Query(
      """
      select a from Appointment a
       where a.callDay = :day and a.calledAt is not null
       order by a.calledAt desc, a.callNumber desc
      """)
  List<Appointment> latestCalls(LocalDate day, Limit limit);
}
