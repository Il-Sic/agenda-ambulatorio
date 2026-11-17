# 5. Transactional outbox instead of publishing directly

Status: accepted

## Context

When a booking is created or cancelled, an event must reach Kafka so the notification module
can e-mail the patient. The booking lives in PostgreSQL and the event in Kafka: two systems that
cannot commit together. Publishing from the request has two failure modes:

- publish first, then the database transaction rolls back: an e-mail for a booking that does
  not exist;
- commit first, then the application dies before publishing: a booking nobody is told about.

## Decision

Write the event to an `outbox_event` table **in the same transaction** as the booking, and
publish it afterwards.

- `Outbox.append` runs with `Propagation.MANDATORY`: it refuses to work outside a transaction.
- `OutboxPublisher` runs every second. In one transaction it locks a batch of pending rows with
  `SELECT … FOR UPDATE SKIP LOCKED`, sends them, waits for Kafka's acknowledgement and marks them
  as published. Any failure rolls the batch back and it is retried.
- `SKIP LOCKED` lets several instances publish in parallel without waiting on each other and
  without sending a row twice.
- Delivery is therefore **at least once**. The consumer is idempotent: `sent_email.event_id` is
  unique and the insert uses `ON CONFLICT DO NOTHING`.
- The booking code is the message key, so events of one booking land on one partition.
- Events carry everything the consumer needs. The notification module never calls back.

## Consequences

- A committed booking always produces its event; a rolled-back one never does.
- Events reach Kafka up to about a second later. Fine for e-mails.
- Kafka being down does not fail bookings: events wait in the table.
- Duplicates can happen and are harmless by design.
- With several publisher instances, two batches may interleave, so order across batches is not
  guaranteed. Acceptable here; a strict order would need one publisher at a time per key.
- Published rows stay in the table. A real system would delete or archive them periodically.

## Alternatives considered

- **`KafkaTemplate.send` inside the service.** The dual-write problem described above.
- **Kafka transactions.** They make Kafka writes atomic with each other, not with PostgreSQL.
- **Change data capture (Debezium).** No polling and very robust, but one more system to run.
- **Spring Modulith's event publication registry.** It implements this pattern and would be a
  reasonable choice in a real project. Here the mechanism itself is what the project shows.
