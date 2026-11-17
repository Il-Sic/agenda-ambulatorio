package io.github.ilsic.agenda.scheduling;

import java.time.LocalDate;

record Closure(long id, LocalDate day, String reason) {

  static Closure of(ClosureDay closureDay) {
    return new Closure(closureDay.id(), closureDay.day(), closureDay.reason());
  }
}
