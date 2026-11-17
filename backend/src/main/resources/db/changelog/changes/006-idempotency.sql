--liquibase formatted sql

--changeset agenda:006-appointment-idempotency-key
-- Chosen by the client and sent again when it retries. The unique constraint is what stops two
-- simultaneous retries from both creating a booking (PostgreSQL lets many rows have no key).
ALTER TABLE appointment
    ADD COLUMN idempotency_key varchar(100),
    ADD CONSTRAINT appointment_idempotency_key_unique UNIQUE (idempotency_key);
--rollback ALTER TABLE appointment DROP COLUMN idempotency_key;
