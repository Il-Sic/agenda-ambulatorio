package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.shared.ClinicTime;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;

@Entity
class Appointment {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String code;
  private Long doctorId;
  @Embedded private Slot slot;
  @Embedded private Patient patient;

  @Enumerated(EnumType.STRING)
  private AppointmentStatus status;

  private Instant createdAt;
  private String idempotencyKey;
  private Instant reminderSentAt;

  /** Two people changing the same appointment at once: the second one fails instead of winning. */
  @Version private int version;

  protected Appointment() {}

  private Appointment(
      String code,
      long doctorId,
      Slot slot,
      Patient patient,
      Instant createdAt,
      String idempotencyKey) {
    this.code = code;
    this.doctorId = doctorId;
    this.slot = slot;
    this.patient = patient;
    this.status = AppointmentStatus.BOOKED;
    this.createdAt = createdAt;
    this.idempotencyKey = idempotencyKey;
  }

  static Appointment book(String code, long doctorId, Slot slot, Patient patient, Instant now) {
    return book(code, doctorId, slot, patient, now, null);
  }

  /** The key, if any, identifies the client's request so that a retry is recognised. */
  static Appointment book(
      String code, long doctorId, Slot slot, Patient patient, Instant now, String idempotencyKey) {
    return new Appointment(code, doctorId, slot, patient, now, idempotencyKey);
  }

  /** Whether a request with these contents is a repetition of the one that made this booking. */
  boolean wasRequestedAs(long doctorId, Instant startsAt, Patient patient) {
    return this.doctorId == doctorId
        && slot.startsAt().equals(startsAt)
        && this.patient.email().equals(patient.email());
  }

  void cancel(Instant now) {
    if (status != AppointmentStatus.BOOKED) {
      throw new AppointmentStateException("Only a booked appointment can be cancelled");
    }
    if (!slot.startsAt().isAfter(now)) {
      throw new AppointmentStateException(
          "An appointment that has already started cannot be cancelled");
    }
    status = AppointmentStatus.CANCELLED;
  }

  /**
   * A booked visit that has not started yet takes another slot, in place: the code, the patient and
   * the history stay the same. The reminder starts over for the new time.
   */
  void moveTo(Slot newSlot, Instant now) {
    if (status != AppointmentStatus.BOOKED) {
      throw new AppointmentStateException("Only a booked appointment can be moved");
    }
    if (!slot.startsAt().isAfter(now)) {
      throw new AppointmentStateException(
          "An appointment that has already started cannot be moved");
    }
    slot = newSlot;
    reminderSentAt = null;
  }

  void markReminded(Instant now) {
    reminderSentAt = now;
  }

  void markArrived(Instant now) {
    recordOutcome(AppointmentStatus.ARRIVED, now);
  }

  void markNoShow(Instant now) {
    recordOutcome(AppointmentStatus.NO_SHOW, now);
  }

  private void recordOutcome(AppointmentStatus outcome, Instant now) {
    if (status == AppointmentStatus.CANCELLED) {
      throw new AppointmentStateException("A cancelled appointment has no outcome");
    }
    LocalDate today = LocalDate.ofInstant(now, ClinicTime.ZONE);
    LocalDate dayOfTheVisit = LocalDate.ofInstant(slot.startsAt(), ClinicTime.ZONE);
    if (today.isBefore(dayOfTheVisit)) {
      throw new AppointmentStateException(
          "The outcome can only be recorded from the day of the visit");
    }
    status = outcome;
  }

  Long id() {
    return id;
  }

  String code() {
    return code;
  }

  Long doctorId() {
    return doctorId;
  }

  Slot slot() {
    return slot;
  }

  /** When the patient was reminded of the visit, or null if not yet for its current time. */
  Instant reminderSentAt() {
    return reminderSentAt;
  }

  Patient patient() {
    return patient;
  }

  AppointmentStatus status() {
    return status;
  }

  Instant createdAt() {
    return createdAt;
  }
}
