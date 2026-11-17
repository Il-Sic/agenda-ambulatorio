package io.github.ilsic.agenda.outbox;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.support.TransactionTemplate;

@IntegrationTest
class OutboxTest {

  record Greeting(String text) {}

  @Autowired Outbox outbox;
  @Autowired TransactionTemplate transaction;
  @Autowired JdbcClient jdbc;
  @Autowired TestData data;

  @BeforeEach
  void setUp() {
    data.reset();
  }

  @Test
  void storesTheEventAsJsonWaitingToBePublished() {
    UUID eventId = UUID.randomUUID();

    transaction.executeWithoutResult(
        tx -> outbox.append("some-topic", "key-1", eventId, new Greeting("ciao")));

    Map<String, Object> row =
        jdbc.sql("SELECT * FROM outbox_event WHERE event_id = :eventId")
            .param("eventId", eventId)
            .query()
            .singleRow();
    assertThat(row)
        .containsEntry("topic", "some-topic")
        .containsEntry("message_key", "key-1")
        .containsEntry("payload", "{\"text\":\"ciao\"}")
        .containsEntry("published_at", null);
  }

  @Test
  void theEventVanishesIfTheSurroundingTransactionRollsBack() {
    transaction.executeWithoutResult(tx -> {
      outbox.append("some-topic", "key-1", UUID.randomUUID(), new Greeting("ciao"));
      tx.setRollbackOnly();
    });

    assertThat(jdbc.sql("SELECT count(*) FROM outbox_event").query(Long.class).single()).isZero();
  }

  @Test
  void refusesToStoreAnEventOutsideATransaction() {
    assertThatThrownBy(
            () -> outbox.append("some-topic", "key-1", UUID.randomUUID(), new Greeting("ciao")))
        .isInstanceOf(IllegalTransactionStateException.class);
  }
}
