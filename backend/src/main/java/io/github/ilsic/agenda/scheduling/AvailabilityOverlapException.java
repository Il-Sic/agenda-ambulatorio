package io.github.ilsic.agenda.scheduling;

public class AvailabilityOverlapException extends RuntimeException {

  public AvailabilityOverlapException() {
    super("The doctor already has availability overlapping this window on that weekday");
  }
}
