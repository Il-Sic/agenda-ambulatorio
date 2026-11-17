package io.github.ilsic.agenda.outbox;

import java.time.Clock;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/** Where a module leaves the events it wants the rest of the world to hear about. */
@Component
public class Outbox {

  private final JdbcClient jdbc;
  private final JsonMapper json;
  private final Clock clock;

  Outbox(JdbcClient jdbc, JsonMapper json, Clock clock) {
    this.jdbc = jdbc;
    this.json = json;
    this.clock = clock;
  }

  /**
   * Stores an event to be published later.
   *
   * <p>It insists on an open transaction: the event must be committed, or rolled back, together
   * with the change it describes. That is the whole point of an outbox.
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void append(String topic, String key, UUID eventId, Object payload) {
    jdbc.sql(
            """
            INSERT INTO outbox_event (event_id, topic, message_key, payload, created_at)
            VALUES (:eventId, :topic, :key, :payload, :createdAt)
            """)
        .param("eventId", eventId)
        .param("topic", topic)
        .param("key", key)
        .param("payload", json.writeValueAsString(payload))
        .param("createdAt", clock.instant().atOffset(ZoneOffset.UTC))
        .update();
  }
}
