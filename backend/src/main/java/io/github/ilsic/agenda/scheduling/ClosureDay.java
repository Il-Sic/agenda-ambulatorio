package io.github.ilsic.agenda.scheduling;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;

/** A day on which the whole clinic is closed and nobody can be booked. */
@Entity
class ClosureDay {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private LocalDate day;
  private String reason;

  protected ClosureDay() {}

  ClosureDay(LocalDate day, String reason) {
    this.day = day;
    this.reason = reason;
  }

  Long id() {
    return id;
  }

  LocalDate day() {
    return day;
  }

  String reason() {
    return reason;
  }
}
