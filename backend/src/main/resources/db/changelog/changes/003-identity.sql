--liquibase formatted sql

--changeset agenda:003-staff-user
CREATE TABLE staff_user (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      varchar(50)  NOT NULL,
    display_name  varchar(100) NOT NULL,
    role          varchar(20)  NOT NULL,
    password_hash varchar(100) NOT NULL,
    CONSTRAINT staff_user_username_unique UNIQUE (username),
    CONSTRAINT staff_user_role_valid CHECK (role IN ('ADMIN', 'STAFF'))
);
--rollback DROP TABLE staff_user;
