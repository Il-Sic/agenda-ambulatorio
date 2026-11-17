package io.github.ilsic.agenda.shared;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class TimeConfiguration {

  /** The only source of "now" in the application, so tests can replace it. */
  @Bean
  Clock clock() {
    return Clock.systemUTC();
  }
}
