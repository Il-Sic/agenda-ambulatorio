package io.github.ilsic.agenda.shared;

import java.time.ZoneId;

public final class ClinicTime {

  /** Opening hours and calendar days are always meant in the clinic's own time zone. */
  public static final ZoneId ZONE = ZoneId.of("Europe/Rome");

  private ClinicTime() {}
}
