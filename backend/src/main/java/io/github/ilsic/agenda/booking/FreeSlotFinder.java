package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.shared.ClinicTime;
import java.sql.ResultSet;
import java.sql.SQLException;
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

  /** Every free slot between two days; the placeholder narrows the search to some doctors. */
  private static final String FREE =
      """
      WITH calendar AS (
          SELECT CAST(day AS date) AS day
            FROM generate_series(
                     CAST(:from AS timestamp), CAST(:to AS timestamp), interval '1 day') AS day
      ),
      free AS (
          SELECT d.specialty_id,
                 wa.doctor_id,
                 slot.starts_at,
                 slot.starts_at + make_interval(mins => wa.slot_minutes) AS ends_at
            FROM calendar
            JOIN weekly_availability wa
              ON wa.day_of_week = EXTRACT(ISODOW FROM calendar.day)%s
            JOIN doctor d
              ON d.id = wa.doctor_id
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
      )
      """;

  private static final String FREE_SLOTS_OF_A_DOCTOR =
      FREE.formatted("\n   AND wa.doctor_id = :doctorId")
          + """
          SELECT starts_at, ends_at
            FROM free
           ORDER BY starts_at
          """;

  // Ties go to the doctor added first, so the answer does not change from one call to the next.
  private static final String FIRST_FREE_SLOT_OF_EACH_SPECIALTY =
      FREE.formatted("")
          + """
          SELECT DISTINCT ON (specialty_id) specialty_id, doctor_id, starts_at, ends_at
            FROM free
           ORDER BY specialty_id, starts_at, doctor_id
          """;

  private final JdbcClient jdbc;

  FreeSlotFinder(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Free slots of a doctor between two calendar days (both included) that start after a moment. */
  List<Slot> find(long doctorId, LocalDate from, LocalDate to, Instant after) {
    return jdbc.sql(FREE_SLOTS_OF_A_DOCTOR)
        .param("doctorId", doctorId)
        .param("from", from)
        .param("to", to)
        .param("zone", ClinicTime.ZONE.getId())
        .param("after", after.atOffset(ZoneOffset.UTC))
        .query((row, rowNumber) -> new Slot(instant(row, "starts_at"), instant(row, "ends_at")))
        .list();
  }

  /**
   * The earliest free slot of each specialty between two calendar days (both included), among all
   * its doctors. A specialty with no free slot in the period is left out.
   */
  List<FirstFreeSlot> firstOfEachSpecialty(LocalDate from, LocalDate to, Instant after) {
    return jdbc.sql(FIRST_FREE_SLOT_OF_EACH_SPECIALTY)
        .param("from", from)
        .param("to", to)
        .param("zone", ClinicTime.ZONE.getId())
        .param("after", after.atOffset(ZoneOffset.UTC))
        .query((row, rowNumber) ->
            new FirstFreeSlot(
                row.getLong("specialty_id"),
                row.getLong("doctor_id"),
                instant(row, "starts_at"),
                instant(row, "ends_at")))
        .list();
  }

  private static Instant instant(ResultSet row, String column) throws SQLException {
    return row.getObject(column, OffsetDateTime.class).toInstant();
  }
}
