package io.github.ilsic.agenda;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.core.ConsumerFactory;

/** Reads what really arrived on a topic, with a throwaway consumer group. */
public class TestKafka {

  private final ConsumerFactory<String, String> consumers;

  public TestKafka(ConsumerFactory<String, String> consumers) {
    this.consumers = consumers;
  }

  /** Waits until at least {@code expected} records have arrived, then keeps listening briefly. */
  public List<ConsumerRecord<String, String>> read(String topic, int expected) {
    List<ConsumerRecord<String, String>> records = new ArrayList<>();
    try (Consumer<String, String> consumer =
        consumers.createConsumer("test-" + UUID.randomUUID(), null)) {
      consumer.subscribe(List.of(topic));
      Instant deadline = Instant.now().plusSeconds(20);
      while (records.size() < expected && Instant.now().isBefore(deadline)) {
        consumer.poll(Duration.ofMillis(250)).forEach(records::add);
      }
      // A little longer, so a record that should not be there has time to show up.
      consumer.poll(Duration.ofMillis(500)).forEach(records::add);
    }
    return records;
  }
}
