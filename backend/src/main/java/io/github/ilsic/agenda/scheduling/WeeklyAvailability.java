package io.github.ilsic.agenda.scheduling;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.DayOfWeek;
import java.time.LocalTime;

/** A window of a weekday in which a doctor receives patients, split into visits of equal length. */
@Entity
class WeeklyAvailability {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long doctorId;
  private DayOfWeek dayOfWeek;
  private LocalTime startTime;
  private LocalTime endTime;
  private int slotMinutes;

  protected WeeklyAvailability() {}

  WeeklyAvailability(
      long doctorId, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime, int slotMinutes) {
    this.doctorId = doctorId;
    this.dayOfWeek = dayOfWeek;
    this.startTime = startTime;
    this.endTime = endTime;
    this.slotMinutes = slotMinutes;
  }

  Long id() {
    return id;
  }

  Long doctorId() {
    return doctorId;
  }

  DayOfWeek dayOfWeek() {
    return dayOfWeek;
  }

  LocalTime startTime() {
    return startTime;
  }

  LocalTime endTime() {
    return endTime;
  }

  int slotMinutes() {
    return slotMinutes;
  }
}
