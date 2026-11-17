--liquibase formatted sql

--changeset agenda:001-btree-gist
-- Lets a GiST index combine plain equality (doctor, weekday) with range overlap.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--rollback DROP EXTENSION btree_gist;

--changeset agenda:001-specialty
CREATE TABLE specialty (
    id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name varchar(100) NOT NULL,
    CONSTRAINT specialty_name_unique UNIQUE (name)
);
--rollback DROP TABLE specialty;

--changeset agenda:001-doctor
CREATE TABLE doctor (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    specialty_id bigint       NOT NULL REFERENCES specialty (id),
    title        varchar(20)  NOT NULL,
    first_name   varchar(100) NOT NULL,
    last_name    varchar(100) NOT NULL
);
CREATE INDEX doctor_specialty_idx ON doctor (specialty_id);
--rollback DROP TABLE doctor;

--changeset agenda:001-weekly-availability
CREATE TYPE timerange AS RANGE (subtype = time);

CREATE TABLE weekly_availability (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id    bigint   NOT NULL REFERENCES doctor (id),
    day_of_week  smallint NOT NULL,
    start_time   time     NOT NULL,
    end_time     time     NOT NULL,
    slot_minutes integer  NOT NULL,
    CONSTRAINT weekly_availability_day_valid CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT weekly_availability_window_valid CHECK (start_time < end_time),
    CONSTRAINT weekly_availability_slot_valid CHECK (slot_minutes BETWEEN 5 AND 240),
    -- Two windows of the same doctor on the same weekday would produce duplicate slots.
    CONSTRAINT weekly_availability_no_overlap EXCLUDE USING gist (
        doctor_id WITH =,
        day_of_week WITH =,
        timerange(start_time, end_time) WITH &&
    )
);
--rollback DROP TABLE weekly_availability; DROP TYPE timerange;

--changeset agenda:001-closure-day
CREATE TABLE closure_day (
    id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    day    date         NOT NULL,
    reason varchar(200) NOT NULL,
    CONSTRAINT closure_day_unique UNIQUE (day)
);
--rollback DROP TABLE closure_day;
