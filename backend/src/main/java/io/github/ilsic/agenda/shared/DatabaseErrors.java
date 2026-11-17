package io.github.ilsic.agenda.shared;

import java.sql.SQLException;
import org.springframework.dao.DataAccessException;

/** Recognises the PostgreSQL errors the application reacts to, by their SQLSTATE code. */
public final class DatabaseErrors {

  private static final String UNIQUE_VIOLATION = "23505";
  private static final String EXCLUSION_VIOLATION = "23P01";
  private static final String DEADLOCK_DETECTED = "40P01";

  private DatabaseErrors() {}

  public static boolean isUniqueViolation(DataAccessException exception) {
    return hasSqlState(exception, UNIQUE_VIOLATION);
  }

  public static boolean isExclusionViolation(DataAccessException exception) {
    return hasSqlState(exception, EXCLUSION_VIOLATION);
  }

  public static boolean isDeadlock(DataAccessException exception) {
    return hasSqlState(exception, DEADLOCK_DETECTED);
  }

  private static boolean hasSqlState(DataAccessException exception, String sqlState) {
    return exception.getMostSpecificCause() instanceof SQLException sqlException
        && sqlState.equals(sqlException.getSQLState());
  }
}
