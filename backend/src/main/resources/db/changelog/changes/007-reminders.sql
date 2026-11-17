--liquibase formatted sql

--changeset agenda:007-appointment-reminder
ALTER TABLE appointment ADD COLUMN reminder_sent_at timestamptz;
-- The reminder job only ever looks at booked visits that have not been reminded yet.
CREATE INDEX appointment_reminder_due_idx ON appointment (starts_at)
    WHERE status = 'BOOKED' AND reminder_sent_at IS NULL;
--rollback DROP INDEX appointment_reminder_due_idx; ALTER TABLE appointment DROP COLUMN reminder_sent_at;
