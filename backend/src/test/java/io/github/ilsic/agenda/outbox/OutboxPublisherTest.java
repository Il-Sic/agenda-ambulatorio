package io.github.ilsic.agenda.outbox;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import io.github.ilsic.agenda.TestKafka;
import java.time.Clock;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.transaction.support.TransactionTemplate;

@IntegrationTest
class OutboxPublisherTest {

  record Greeting(String text) {}

  @Autowired Outbox outbox;
  @Autowired OutboxPublisher publisher;
  @Autowired TransactionTemplate transaction;
  @Autowired JdbcClient jdbc;
  @Autowired Clock clock;
  @Autowired TestData data;
  @Autowired TestKafka kafka;

  String topic;

  @BeforeEach
  void setUp() {
    data.reset();
    topic = "outbox-test-" + UUID.randomUUID();
  }

  @Test
  void publishesPendingEventsInTheOrderTheyWereStored() {
    store("booking-1", "first");
    store("booking-1", "second");

    int published = publisher.publishPending();

    assertThat(published).isEqualTo(2);
    assertThat(kafka.read(topic, 2))
        .extracting(ConsumerRecord::key, ConsumerRecord::value)
        .containsExactly(
            org.assertj.core.groups.Tuple.tuple("booking-1", "{\"text\":\"first\"}"),
            org.assertj.core.groups.Tuple.tuple("booking-1", "{\"text\":\"second\"}"));
    assertThat(pendingEvents()).isZero();
  }

  @Test
  void doesNotPublishAnEventASecondTime() {
    store("booking-1", "only once");
    publisher.publishPending();

    int publishedAgain = publisher.publishPending();

    assertThat(publishedAgain).isZero();
    assertThat(kafka.read(topic, 1)).hasSize(1);
  }

  /**
   * What FOR UPDATE SKIP LOCKED is for: with two instances of the application, the second one
   * neither waits for the rows the first is working on nor publishes them again.
   */
  @Test
  void leavesAloneTheEventsAnotherPublisherIsWorkingOn() throws Exception {
    store("booking-1", "taken by the other publisher");
    CountDownLatch rowsLocked = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);

    try (ExecutorService otherInstance = Executors.newSingleThreadExecutor()) {
      Future<?> otherPublisher =
          otherInstance.submit(() ->
              transaction.executeWithoutResult(tx -> {
                jdbc.sql("SELECT id FROM outbox_event FOR UPDATE").query().listOfRows();
                rowsLocked.countDown();
                await(release);
              }));
      assertThat(rowsLocked.await(10, TimeUnit.SECONDS)).isTrue();

      int publishedMeanwhile = publisher.publishPending();

      release.countDown();
      otherPublisher.get(10, TimeUnit.SECONDS);
      assertThat(publishedMeanwhile).isZero();
    }
    assertThat(publisher.publishPending()).isEqualTo(1);
  }

  @Test
  void keepsAnEventPendingWhenKafkaCannotBeReached() {
    store("booking-1", "kafka is down");
    OutboxPublisher publisherWithoutKafka =
        new OutboxPublisher(jdbc, new KafkaTemplate<>(unreachableKafka()), transaction, clock);

    assertThatThrownBy(publisherWithoutKafka::publishPending).isInstanceOf(RuntimeException.class);

    assertThat(pendingEvents()).isEqualTo(1);
    assertThat(publisher.publishPending()).isEqualTo(1);
  }

  private void store(String key, String text) {
    transaction.executeWithoutResult(
        tx -> outbox.append(topic, key, UUID.randomUUID(), new Greeting(text)));
  }

  private long pendingEvents() {
    return jdbc.sql("SELECT count(*) FROM outbox_event WHERE published_at IS NULL")
        .query(Long.class)
        .single();
  }

  private static DefaultKafkaProducerFactory<String, String> unreachableKafka() {
    return new DefaultKafkaProducerFactory<>(
        Map.of(
            ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,
            "localhost:1",
            ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class,
            ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class,
            ProducerConfig.MAX_BLOCK_MS_CONFIG,
            500));
  }

  private static void await(CountDownLatch latch) {
    try {
      latch.await(10, TimeUnit.SECONDS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }
}
