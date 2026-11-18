package io.github.ilsic.agenda.booking;

import java.time.LocalDate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Hands out the numbers of a day, one after the other. A single statement creates the day's row or
 * raises it, and the row stays locked until the arrival commits: two patients arriving at the same
 * moment get two numbers, and an arrival that fails gives its number back.
 */
@Component
class CallNumbers {

  private final JdbcClient jdbc;

  CallNumbers(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Must run inside the transaction that records the arrival. */
  int next(LocalDate day) {
    return jdbc.sql(
            """
            INSERT INTO call_counter (day, last_number) VALUES (:day, 1)
            ON CONFLICT (day) DO UPDATE SET last_number = call_counter.last_number + 1
            RETURNING last_number
            """)
        .param("day", day)
        .query(Integer.class)
        .single();
  }
}
