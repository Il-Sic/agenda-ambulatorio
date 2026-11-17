--liquibase formatted sql

--changeset agenda:002-appointment
CREATE TABLE appointment (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code          varchar(8)   NOT NULL,
    doctor_id     bigint       NOT NULL REFERENCES doctor (id),
    starts_at     timestamptz  NOT NULL,
    ends_at       timestamptz  NOT NULL,
    status        varchar(20)  NOT NULL,
    patient_name  varchar(120) NOT NULL,
    patient_email varchar(254) NOT NULL,
    patient_phone varchar(30)  NOT NULL,
    created_at    timestamptz  NOT NULL,
    version       integer      NOT NULL DEFAULT 0,
    CONSTRAINT appointment_code_unique UNIQUE (code),
    CONSTRAINT appointment_period_valid CHECK (starts_at < ends_at),
    CONSTRAINT appointment_status_valid
        CHECK (status IN ('BOOKED', 'ARRIVED', 'NO_SHOW', 'CANCELLED')),
    -- The rule this project exists to demonstrate: a doctor sees one patient at a time.
    -- Two rows of the same doctor may not have overlapping periods, unless one is cancelled.
    -- The database enforces it, so it holds even when requests race each other.
    CONSTRAINT appointment_no_overlap EXCLUDE USING gist (
        doctor_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
    ) WHERE (status <> 'CANCELLED')
);
CREATE INDEX appointment_starts_at_idx ON appointment (starts_at);
--rollback DROP TABLE appointment;
