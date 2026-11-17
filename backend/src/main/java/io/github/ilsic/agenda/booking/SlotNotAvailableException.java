package io.github.ilsic.agenda.booking;

/** The slot was never offered, or someone else took it first. */
public class SlotNotAvailableException extends RuntimeException {

  public SlotNotAvailableException() {
    super("The requested slot is not available");
  }
}
