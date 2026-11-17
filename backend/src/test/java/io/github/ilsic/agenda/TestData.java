package io.github.ilsic.agenda;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Inserts fixtures with plain SQL, so tests do not depend on the code they verify. */
public class TestData {

  public static final String PATIENT_EMAIL = "paziente@example.com";

  private final JdbcClient jdbc;
  private final AtomicInteger sequence = new AtomicInteger();

  private final PasswordEncoder passwordEncoder;

  public TestData(JdbcClient jdbc, PasswordEncoder passwordEncoder) {
    this.jdbc = jdbc;
    this.passwordEncoder = passwordEncoder;
  }

  public void reset() {
    jdbc.sql(
            """
            TRUNCATE appointment, closure_day, weekly_availability, doctor, specialty, staff_user,
                     outbox_event, sent_email
            RESTART IDENTITY CASCADE
            """)
        .update();
  }

  public void staffUser(String username, String displayName, String role, String password) {
    jdbc.sql(
            """
            INSERT INTO staff_user (username, display_name, role, password_hash)
            VALUES (:username, :displayName, :role, :passwordHash)
            """)
        .param("username", username)
        .param("displayName", displayName)
        .param("role", role)
        .param("passwordHash", passwordEncoder.encode(password))
        .update();
  }

  public long specialty(String name) {
    return jdbc.sql("INSERT INTO specialty (name) VALUES (:name) RETURNING id")
        .param("name", name)
        .query(Long.class)
        .single();
  }

  public long doctor() {
    return doctor(specialty("Specialty " + sequence.incrementAndGet()), "Marchetti");
  }

  public long doctor(long specialtyId, String lastName) {
    return jdbc.sql(
            """
            INSERT INTO doctor (specialty_id, title, first_name, last_name)
            VALUES (:specialtyId, 'Dott.ssa', 'Elena', :lastName)
            RETURNING id
            """)
        .param("specialtyId", specialtyId)
        .param("lastName", lastName)
        .query(Long.class)
        .single();
  }

  public long availability(
      long doctorId, DayOfWeek day, String startTime, String endTime, int slotMinutes) {
    return jdbc.sql(
            """
            INSERT INTO weekly_availability
                (doctor_id, day_of_week, start_time, end_time, slot_minutes)
            VALUES (:doctorId, :day, :startTime, :endTime, :slotMinutes)
            RETURNING id
            """)
        .param("doctorId", doctorId)
        .param("day", day.getValue())
        .param("startTime", LocalTime.parse(startTime))
        .param("endTime", LocalTime.parse(endTime))
        .param("slotMinutes", slotMinutes)
        .query(Long.class)
        .single();
  }

  public void closure(LocalDate day) {
    jdbc.sql("INSERT INTO closure_day (day, reason) VALUES (:day, 'Chiusura')")
        .param("day", day)
        .update();
  }

  public long appointment(long doctorId, Instant startsAt, Instant endsAt, String status) {
    String code = "T%07d".formatted(sequence.incrementAndGet());
    return appointment(doctorId, code, startsAt, endsAt, status);
  }

  public long appointment(
      long doctorId, String code, Instant startsAt, Instant endsAt, String status) {
    // Booked long before any date the tests use.
    return appointment(
        doctorId, code, startsAt, endsAt, status, Instant.parse("2026-01-01T09:00:00Z"));
  }

  public long appointmentBookedAt(long doctorId, Instant startsAt, Instant bookedAt) {
    String code = "T%07d".formatted(sequence.incrementAndGet());
    return appointment(doctorId, code, startsAt, startsAt.plusSeconds(30 * 60), "BOOKED", bookedAt);
  }

  private long appointment(
      long doctorId,
      String code,
      Instant startsAt,
      Instant endsAt,
      String status,
      Instant bookedAt) {
    return jdbc.sql(
            """
            INSERT INTO appointment
                (code, doctor_id, starts_at, ends_at, status,
                 patient_name, patient_email, patient_phone, created_at)
            VALUES (:code, :doctorId, :startsAt, :endsAt, :status,
                    'Paziente Di Prova', :email, '3330000000', :bookedAt)
            RETURNING id
            """)
        .param("code", code)
        .param("email", PATIENT_EMAIL)
        .param("doctorId", doctorId)
        .param("startsAt", startsAt.atOffset(ZoneOffset.UTC))
        .param("endsAt", endsAt.atOffset(ZoneOffset.UTC))
        .param("status", status)
        .param("bookedAt", bookedAt.atOffset(ZoneOffset.UTC))
        .query(Long.class)
        .single();
  }
}
