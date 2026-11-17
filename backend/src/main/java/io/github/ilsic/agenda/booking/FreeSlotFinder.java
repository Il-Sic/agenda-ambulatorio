package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.shared.ClinicTime;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Finds the slots a patient can still book.
 *
 * <p>Written in SQL because the database can do the whole job in one pass: it expands the weekly
 * availability into concrete slots, converts clinic-local times into instants (so daylight saving
 * time is handled by PostgreSQL's time zone rules) and removes closure days and taken slots.
 */
@Repository
class FreeSlotFinder {

  private static final String FREE_SLOTS =
      """
      WITH calendar AS (
          SELECT CAST(day AS date) AS day
            FROM generate_series(
                     CAST(:from AS timestamp), CAST(:to AS timestamp), interval '1 day') AS day
      )
      SELECT slot.starts_at,
             slot.starts_at + make_interval(mins => wa.slot_minutes) AS ends_at
        FROM calendar
        JOIN weekly_availability wa
          ON wa.doctor_id = :doctorId
         AND wa.day_of_week = EXTRACT(ISODOW FROM calendar.day)
       CROSS JOIN LATERAL generate_series(
                 (calendar.day + wa.start_time) AT TIME ZONE :zone,
                 (calendar.day + wa.end_time) AT TIME ZONE :zone
                     - make_interval(mins => wa.slot_minutes),
                 make_interval(mins => wa.slot_minutes)) AS slot(starts_at)
       WHERE slot.starts_at > :after
         AND NOT EXISTS (SELECT 1 FROM closure_day c WHERE c.day = calendar.day)
         AND NOT EXISTS (
                 SELECT 1
                   FROM appointment a
                  WHERE a.doctor_id = wa.doctor_id
                    AND a.status <> 'CANCELLED'
                    AND tstzrange(a.starts_at, a.ends_at, '[)')
                        && tstzrange(
                               slot.starts_at,
                               slot.starts_at + make_interval(mins => wa.slot_minutes),
                               '[)'))
       ORDER BY slot.starts_at
      """;

  private final JdbcClient jdbc;

  FreeSlotFinder(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Free slots of a doctor between two calendar days (both included) that start after a moment. */
  List<Slot> find(long doctorId, LocalDate from, LocalDate to, Instant after) {
    return jdbc.sql(FREE_SLOTS)
        .param("doctorId", doctorId)
        .param("from", from)
        .param("to", to)
        .param("zone", ClinicTime.ZONE.getId())
        .param("after", after.atOffset(ZoneOffset.UTC))
        .query((row, rowNumber) ->
            new Slot(
                row.getObject("starts_at", OffsetDateTime.class).toInstant(),
                row.getObject("ends_at", OffsetDateTime.class).toInstant()))
        .list();
  }
}
