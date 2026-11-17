package io.github.ilsic.agenda.shared;

/** Names of the Kafka topics. Producer and consumer share nothing else. */
public final class Topics {

  /** Bookings confirmed and cancelled, keyed by booking code. */
  public static final String BOOKING_EVENTS = "agenda.booking-events";

  private Topics() {}
}
