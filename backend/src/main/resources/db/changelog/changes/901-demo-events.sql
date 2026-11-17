--liquibase formatted sql

--changeset agenda:901-demo-events context:demo
-- The demo bookings were inserted directly, so no event ever announced them. These outbox rows
-- give the publisher and the notification consumer something to do on first start: the staff
-- page "Notifiche inviate" then already shows a few confirmation e-mails that really travelled
-- through Kafka. The JSON has the same shape as the events written by the application
-- (DemoDataTest fails if the two drift apart).
WITH announced AS MATERIALIZED (
    SELECT gen_random_uuid() AS event_id,
           a.code,
           a.patient_name,
           a.patient_email,
           d.title || ' ' || d.first_name || ' ' || d.last_name AS doctor_name,
           s.name AS specialty,
           a.starts_at,
           a.ends_at
      FROM appointment a
      JOIN doctor d ON d.id = a.doctor_id
      JOIN specialty s ON s.id = d.specialty_id
     WHERE a.status = 'BOOKED'
     ORDER BY a.starts_at, a.id
     LIMIT 8
)
INSERT INTO outbox_event (event_id, topic, message_key, payload, created_at)
SELECT event_id,
       'agenda.booking-events',
       code,
       CAST(jsonb_build_object(
           'eventId', event_id,
           'type', 'BOOKING_CONFIRMED',
           'occurredAt', now(),
           'bookingCode', code,
           'patientName', patient_name,
           'patientEmail', patient_email,
           'doctorName', doctor_name,
           'specialty', specialty,
           'startsAt', starts_at,
           'endsAt', ends_at) AS text),
       now()
  FROM announced;
