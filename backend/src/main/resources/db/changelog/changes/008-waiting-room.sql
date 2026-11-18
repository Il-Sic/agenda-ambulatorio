--liquibase formatted sql

--changeset agenda:008-doctor-room
-- Where a doctor receives, as the waiting room screen says it: "Ambulatorio 4", "Primo piano".
-- Empty until someone sets it; the screen then names the specialty instead.
ALTER TABLE doctor ADD COLUMN room varchar(40);
ALTER TABLE doctor ADD COLUMN floor varchar(40);
--rollback ALTER TABLE doctor DROP COLUMN floor; ALTER TABLE doctor DROP COLUMN room;

--changeset agenda:008-call-number
-- A patient who arrives on the day of the visit gets the next number of that day at the desk:
-- the waiting room screen calls numbers, never names. called_at is the last time it was called.
ALTER TABLE appointment ADD COLUMN call_day date;
ALTER TABLE appointment ADD COLUMN call_number integer;
ALTER TABLE appointment ADD COLUMN called_at timestamptz;
ALTER TABLE appointment ADD CONSTRAINT appointment_call_number_unique UNIQUE (call_day, call_number);
ALTER TABLE appointment ADD CONSTRAINT appointment_call_number_whole
    CHECK ((call_day IS NULL) = (call_number IS NULL));
ALTER TABLE appointment ADD CONSTRAINT appointment_called_with_a_number
    CHECK (called_at IS NULL OR call_number IS NOT NULL);
-- The screen asks for the latest calls of the day every few seconds.
CREATE INDEX appointment_latest_calls_idx ON appointment (call_day, called_at DESC)
    WHERE called_at IS NOT NULL;
--rollback DROP INDEX appointment_latest_calls_idx;
--rollback ALTER TABLE appointment DROP CONSTRAINT appointment_called_with_a_number;
--rollback ALTER TABLE appointment DROP CONSTRAINT appointment_call_number_whole;
--rollback ALTER TABLE appointment DROP CONSTRAINT appointment_call_number_unique;
--rollback ALTER TABLE appointment DROP COLUMN called_at;
--rollback ALTER TABLE appointment DROP COLUMN call_number;
--rollback ALTER TABLE appointment DROP COLUMN call_day;

--changeset agenda:008-call-counter
-- The last number given on each day. It is raised in the same transaction as the arrival: two
-- arrivals at the same moment get two numbers, and an arrival rolled back leaves no gap.
CREATE TABLE call_counter (
    day         date    PRIMARY KEY,
    last_number integer NOT NULL
);
--rollback DROP TABLE call_counter;
