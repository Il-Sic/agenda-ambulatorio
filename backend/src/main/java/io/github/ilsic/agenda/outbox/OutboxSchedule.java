package io.github.ilsic.agenda.outbox;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/** Runs the publisher in the background. Tests switch this off and call the publisher directly. */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnProperty(name = "agenda.outbox.scheduling.enabled", matchIfMissing = true)
class OutboxSchedule {

  private static final Logger log = LoggerFactory.getLogger(OutboxSchedule.class);

  private final OutboxPublisher publisher;

  OutboxSchedule(OutboxPublisher publisher) {
    this.publisher = publisher;
  }

  @Scheduled(fixedDelayString = "${agenda.outbox.poll-interval:1s}")
  void publishPending() {
    try {
      publisher.publishPending();
    } catch (RuntimeException exception) {
      // Nothing is lost: the events are still in the table and the next run tries again.
      log.warn("Outbox events not published, will retry: {}", exception.getMessage());
    }
  }
}
