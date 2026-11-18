package io.github.ilsic.agenda.scheduling;

import io.github.ilsic.agenda.shared.ClinicTime;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * When the doctors receive on a given day: the weekly availability turned into periods of that day,
 * in instants. A closure day has none.
 */
@Service
public class OpeningHours {

  private static final String PERIODS =
      """
      SELECT wa.doctor_id,
             (CAST(:day AS date) + wa.start_time) AT TIME ZONE :zone AS starts_at,
             (CAST(:day AS date) + wa.end_time) AT TIME ZONE :zone AS ends_at
        FROM weekly_availability wa
       WHERE wa.day_of_week = :dayOfWeek
         AND NOT EXISTS (SELECT 1 FROM closure_day c WHERE c.day = CAST(:day AS date))
       ORDER BY wa.doctor_id, wa.start_time
      """;

  private final JdbcClient jdbc;

  OpeningHours(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** The periods each doctor receives on a day, earliest first. */
  public List<WorkingPeriod> on(LocalDate day) {
    return jdbc.sql(PERIODS)
        .param("day", day)
        .param("dayOfWeek", day.getDayOfWeek().getValue())
        .param("zone", ClinicTime.ZONE.getId())
        .query((row, rowNumber) ->
            new WorkingPeriod(
                row.getLong("doctor_id"),
                row.getObject("starts_at", OffsetDateTime.class).toInstant(),
                row.getObject("ends_at", OffsetDateTime.class).toInstant()))
        .list();
  }

  /** Why the clinic is closed on a day, if it is. */
  public Optional<String> closure(LocalDate day) {
    return jdbc.sql("SELECT reason FROM closure_day WHERE day = :day")
        .param("day", day)
        .query(String.class)
        .optional();
  }

  /** A period in which a doctor receives patients. */
  public record WorkingPeriod(long doctorId, Instant startsAt, Instant endsAt) {}
}
