--liquibase formatted sql

--changeset agenda:902-demo-rooms context:demo
-- Where the invented doctors receive. The waiting room is on the ground floor; two doctors who
-- never work at the same time share a room.
UPDATE doctor d
   SET room = r.room,
       floor = r.floor
  FROM (VALUES ('Ferri', 'Ambulatorio 1', 'Piano terra'),
               ('Colonna', 'Ambulatorio 1', 'Piano terra'),
               ('Gentile', 'Ambulatorio 2', 'Piano terra'),
               ('Vitale', 'Ambulatorio 3', 'Piano terra'),
               ('Marchetti', 'Ambulatorio 4', 'Primo piano'),
               ('Rinaldi', 'Ambulatorio 4', 'Primo piano'),
               ('Fontana', 'Ambulatorio 5', 'Primo piano')
       ) AS r(last_name, room, floor)
 WHERE d.last_name = r.last_name;

--changeset agenda:902-demo-calls context:demo
-- Today's patients who have already arrived got their number at the desk, in the order of their
-- visits, and were called when the visit started: the waiting room screen is not empty.
WITH today AS (
    SELECT CAST(now() AT TIME ZONE 'Europe/Rome' AS date) AS day
), arrived AS (
    SELECT a.id,
           a.starts_at,
           row_number() OVER (ORDER BY a.starts_at, a.id) AS number
      FROM appointment a
      JOIN today ON CAST(a.starts_at AT TIME ZONE 'Europe/Rome' AS date) = today.day
     WHERE a.status = 'ARRIVED'
)
UPDATE appointment a
   SET call_day = today.day,
       call_number = arrived.number,
       called_at = arrived.starts_at
  FROM arrived, today
 WHERE a.id = arrived.id;

-- The next patient who arrives today goes on from the last number given.
INSERT INTO call_counter (day, last_number)
SELECT call_day, max(call_number)
  FROM appointment
 WHERE call_day IS NOT NULL
 GROUP BY call_day;
