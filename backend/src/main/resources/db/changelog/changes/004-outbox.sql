--liquibase formatted sql

--changeset agenda:004-outbox-event
-- Events waiting to be published to Kafka. A row is written in the same transaction as the
-- change it describes, so there is never a booking without its event or the other way round.
CREATE TABLE outbox_event (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id     uuid         NOT NULL,
    topic        varchar(100) NOT NULL,
    message_key  varchar(100) NOT NULL,
    payload      text         NOT NULL,
    created_at   timestamptz  NOT NULL,
    published_at timestamptz,
    CONSTRAINT outbox_event_id_unique UNIQUE (event_id)
);
-- The publisher only ever looks for rows that are still waiting.
CREATE INDEX outbox_event_pending_idx ON outbox_event (id) WHERE published_at IS NULL;
--rollback DROP TABLE outbox_event;
