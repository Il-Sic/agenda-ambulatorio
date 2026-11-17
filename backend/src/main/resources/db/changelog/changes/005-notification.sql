--liquibase formatted sql

--changeset agenda:005-sent-email
CREATE TABLE sent_email (
    id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id  uuid         NOT NULL,
    recipient varchar(254) NOT NULL,
    subject   varchar(200) NOT NULL,
    body      text         NOT NULL,
    sent_at   timestamptz  NOT NULL,
    -- Kafka may deliver an event more than once. One event, one e-mail.
    CONSTRAINT sent_email_event_unique UNIQUE (event_id)
);
CREATE INDEX sent_email_sent_at_idx ON sent_email (sent_at DESC);
--rollback DROP TABLE sent_email;
