package io.github.ilsic.agenda.scheduling;

import java.time.LocalDate;

public class ClosureExistsException extends RuntimeException {

  public ClosureExistsException(LocalDate day) {
    super("The clinic is already closed on " + day);
  }
}
