package io.github.ilsic.agenda.notification;

import java.time.Clock;
import java.time.ZoneOffset;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** No e-mail leaves this demo: "sending" means storing the message where the staff can read it. */
@Component
class SimulatedEmailSender {

  private static final Logger log = LoggerFactory.getLogger(SimulatedEmailSender.class);

  private final JdbcClient jdbc;
  private final Clock clock;

  SimulatedEmailSender(JdbcClient jdbc, Clock clock) {
    this.jdbc = jdbc;
    this.clock = clock;
  }

  /**
   * Sends at most one e-mail per event. Kafka delivers "at least once", so the same event can
   * arrive again; the unique constraint on the event id turns the repeat into a no-op.
   */
  void send(UUID eventId, Email email) {
    int stored =
        jdbc.sql(
                """
                INSERT INTO sent_email (event_id, recipient, subject, body, sent_at)
                VALUES (:eventId, :recipient, :subject, :body, :sentAt)
                ON CONFLICT (event_id) DO NOTHING
                """)
            .param("eventId", eventId)
            .param("recipient", email.recipient())
            .param("subject", email.subject())
            .param("body", email.body())
            .param("sentAt", clock.instant().atOffset(ZoneOffset.UTC))
            .update();
    if (stored == 0) {
      log.info("Event {} was already handled, no second e-mail", eventId);
    }
  }
}
