package io.github.ilsic.agenda.outbox;

import java.time.Clock;
import java.time.Duration;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Moves events from the outbox table to Kafka.
 *
 * <p>Each batch is one transaction: lock some pending rows, send them, wait for Kafka to
 * acknowledge, mark them as published. If anything fails the transaction rolls back and the rows
 * are picked up again later. An event can therefore reach Kafka twice, never zero times, which is
 * why consumers must be idempotent.
 */
@Component
public class OutboxPublisher {

  static final int BATCH_SIZE = 50;
  // Longer than the producer's own delivery timeout (see application.yaml): by the time this
  // gives up, Kafka has given up too, and a late delivery cannot overtake the retry.
  private static final Duration SEND_TIMEOUT = Duration.ofSeconds(15);

  /**
   * SKIP LOCKED makes this safe with several instances of the application: each one takes rows
   * nobody else is holding, without waiting and without publishing the same row twice.
   */
  private static final String LOCK_NEXT_BATCH =
      """
      SELECT id, topic, message_key, payload
        FROM outbox_event
       WHERE published_at IS NULL
       ORDER BY id
       LIMIT :batchSize
         FOR UPDATE SKIP LOCKED
      """;

  private record PendingEvent(long id, String topic, String messageKey, String payload) {}

  private final JdbcClient jdbc;
  private final KafkaTemplate<String, String> kafka;
  private final TransactionTemplate transaction;
  private final Clock clock;

  OutboxPublisher(
      JdbcClient jdbc,
      KafkaTemplate<String, String> kafka,
      TransactionTemplate transaction,
      Clock clock) {
    this.jdbc = jdbc;
    this.kafka = kafka;
    this.transaction = transaction;
    this.clock = clock;
  }

  /** Publishes everything that is waiting and returns how many events were sent. */
  public int publishPending() {
    int total = 0;
    int published;
    do {
      published = publishBatch();
      total += published;
    } while (published == BATCH_SIZE);
    return total;
  }

  private int publishBatch() {
    Integer published =
        transaction.execute(status -> {
          List<PendingEvent> batch =
              jdbc.sql(LOCK_NEXT_BATCH)
                  .param("batchSize", BATCH_SIZE)
                  .query(PendingEvent.class)
                  .list();
          if (batch.isEmpty()) {
            return 0;
          }
          sendAndWaitForAcknowledgement(batch);
          jdbc.sql("UPDATE outbox_event SET published_at = :now WHERE id IN (:ids)")
              .param("now", clock.instant().atOffset(ZoneOffset.UTC))
              .param("ids", batch.stream().map(PendingEvent::id).toList())
              .update();
          return batch.size();
        });
    return published == null ? 0 : published;
  }

  private void sendAndWaitForAcknowledgement(List<PendingEvent> batch) {
    CompletableFuture<?>[] acknowledgements =
        batch.stream()
            .map(event -> kafka.send(event.topic(), event.messageKey(), event.payload()))
            .toArray(CompletableFuture[]::new);
    try {
      CompletableFuture.allOf(acknowledgements).get(SEND_TIMEOUT.toSeconds(), TimeUnit.SECONDS);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Interrupted while publishing outbox events", exception);
    } catch (ExecutionException | TimeoutException exception) {
      throw new IllegalStateException("Kafka did not acknowledge the outbox events", exception);
    }
  }
}
