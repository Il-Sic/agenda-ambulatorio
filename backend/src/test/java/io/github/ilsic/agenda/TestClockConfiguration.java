package io.github.ilsic.agenda;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** Freezes time for integration tests, so fixed dates in tests never drift into the past. */
@TestConfiguration(proxyBeanMethods = false)
public class TestClockConfiguration {

  /** Monday 15 February 2027, 10:00 in Rome. */
  public static final Instant NOW = Instant.parse("2027-02-15T09:00:00Z");

  @Bean
  @Primary
  Clock fixedClock() {
    return Clock.fixed(NOW, ZoneOffset.UTC);
  }
}
