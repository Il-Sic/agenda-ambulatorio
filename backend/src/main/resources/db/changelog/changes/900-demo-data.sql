--liquibase formatted sql

--changeset agenda:900-demo-data context:demo
-- Invented people, loaded only when Liquibase runs with the "demo" context
-- (docker compose does; tests and any real deployment do not).
-- Every date is relative to the day the database is created.

-- crypt() makes the same BCrypt hashes Spring Security checks. The passwords are the demo
-- credentials published in the README; they exist nowhere else.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO staff_user (username, display_name, role, password_hash)
VALUES ('admin', 'Direzione Valdoria', 'ADMIN',
        '{bcrypt}' || crypt('admin-demo', gen_salt('bf', 10))),
       ('segreteria', 'Marta Colombo', 'STAFF',
        '{bcrypt}' || crypt('segreteria-demo', gen_salt('bf', 10)));

INSERT INTO specialty (name)
VALUES ('Cardiologia'), ('Dermatologia'), ('Oculistica'), ('Ortopedia'), ('Pediatria');

INSERT INTO doctor (specialty_id, title, first_name, last_name)
SELECT s.id, d.title, d.first_name, d.last_name
  FROM (VALUES ('Cardiologia', 'Dott.ssa', 'Elena', 'Marchetti'),
               ('Cardiologia', 'Dott.', 'Paolo', 'Rinaldi'),
               ('Dermatologia', 'Dott.ssa', 'Chiara', 'Fontana'),
               ('Oculistica', 'Dott.', 'Andrea', 'Vitale'),
               ('Ortopedia', 'Dott.', 'Luca', 'Ferri'),
               ('Ortopedia', 'Dott.ssa', 'Sara', 'Colonna'),
               ('Pediatria', 'Dott.ssa', 'Marta', 'Gentile')
       ) AS d(specialty, title, first_name, last_name)
  JOIN specialty s ON s.name = d.specialty;

-- Weekdays are ISO numbers: 1 = Monday … 6 = Saturday.
INSERT INTO weekly_availability (doctor_id, day_of_week, start_time, end_time, slot_minutes)
SELECT d.id, weekday, w.start_time, w.end_time, w.slot_minutes
  FROM (VALUES ('Marchetti', ARRAY[1, 3, 5], time '09:00', time '13:00', 30),
               ('Marchetti', ARRAY[2], time '15:00', time '18:00', 30),
               ('Rinaldi', ARRAY[2, 4], time '09:00', time '13:00', 30),
               ('Rinaldi', ARRAY[6], time '09:00', time '12:00', 30),
               ('Fontana', ARRAY[1, 2, 3, 4], time '14:30', time '18:30', 20),
               ('Vitale', ARRAY[1, 3], time '08:30', time '12:30', 20),
               ('Vitale', ARRAY[5], time '14:00', time '18:00', 20),
               ('Ferri', ARRAY[1, 2, 3, 4, 5], time '09:00', time '12:00', 30),
               ('Colonna', ARRAY[2, 4], time '14:00', time '19:00', 30),
               ('Colonna', ARRAY[6], time '09:00', time '13:00', 30),
               ('Gentile', ARRAY[1, 2, 3, 4, 5], time '15:00', time '19:00', 20)
       ) AS w(last_name, weekdays, start_time, end_time, slot_minutes)
  JOIN doctor d ON d.last_name = w.last_name
 CROSS JOIN unnest(w.weekdays) AS weekday;

-- The next occurrence of a few public holidays.
INSERT INTO closure_day (day, reason)
SELECT holiday.day, holiday.reason
  FROM (SELECT CAST(EXTRACT(YEAR FROM now() AT TIME ZONE 'Europe/Rome') AS integer) + year_offset
                   AS year
          FROM generate_series(0, 1) AS year_offset) AS calendar
 CROSS JOIN LATERAL (VALUES (make_date(calendar.year, 1, 1), 'Capodanno'),
                            (make_date(calendar.year, 1, 6), 'Epifania'),
                            (make_date(calendar.year, 8, 15), 'Ferragosto'),
                            (make_date(calendar.year, 12, 25), 'Natale'),
                            (make_date(calendar.year, 12, 26), 'Santo Stefano')
       ) AS holiday(day, reason)
 WHERE holiday.day >= CAST(now() AT TIME ZONE 'Europe/Rome' AS date);

-- One slot in three, from yesterday to the day after tomorrow, already has a patient.
-- Visits that have started are marked as arrived (now and then as a no-show).
WITH today AS (
    SELECT CAST(now() AT TIME ZONE 'Europe/Rome' AS date) AS day
), slots AS (
    SELECT wa.doctor_id,
           slot.starts_at,
           slot.starts_at + make_interval(mins => wa.slot_minutes) AS ends_at,
           row_number() OVER (ORDER BY slot.starts_at, wa.doctor_id) AS position
      FROM today
     CROSS JOIN generate_series(-1, 2) AS day_offset
      JOIN weekly_availability wa
        ON wa.day_of_week = EXTRACT(ISODOW FROM today.day + day_offset)
     CROSS JOIN LATERAL generate_series(
               (today.day + day_offset + wa.start_time) AT TIME ZONE 'Europe/Rome',
               (today.day + day_offset + wa.end_time) AT TIME ZONE 'Europe/Rome'
                   - make_interval(mins => wa.slot_minutes),
               make_interval(mins => wa.slot_minutes)) AS slot(starts_at)
     WHERE NOT EXISTS (SELECT 1 FROM closure_day c WHERE c.day = today.day + day_offset)
), patients AS (
    SELECT patient.name, patient.position
      FROM unnest(ARRAY['Giulia Bianchi', 'Marco Conti', 'Francesca Greco', 'Davide Moretti',
                        'Silvia Barbieri', 'Alessandro Fabbri', 'Laura Santoro', 'Matteo Leone',
                        'Valentina Caruso', 'Simone Gatti', 'Roberta Pellegrini', 'Giorgio Serra'])
           WITH ORDINALITY AS patient(name, position)
)
INSERT INTO appointment (code, doctor_id, starts_at, ends_at, status,
                         patient_name, patient_email, patient_phone, created_at)
SELECT 'DEMO' || lpad(CAST(row_number() OVER (ORDER BY s.position) AS text), 4, '0'),
       s.doctor_id,
       s.starts_at,
       s.ends_at,
       CASE
           WHEN s.starts_at > now() THEN 'BOOKED'
           WHEN s.position % 21 = 1 THEN 'NO_SHOW'
           ELSE 'ARRIVED'
       END,
       p.name,
       lower(replace(p.name, ' ', '.')) || '@example.com',
       '333 55501' || lpad(CAST(p.position AS text), 2, '0'),
       now() - interval '3 days'
  FROM slots s
  JOIN patients p ON p.position = 1 + (s.position / 3) % 12
 WHERE s.position % 3 = 1;
