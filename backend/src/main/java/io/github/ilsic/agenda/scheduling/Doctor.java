package io.github.ilsic.agenda.scheduling;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

@Entity
class Doctor {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private Specialty specialty;

  private String title;
  private String firstName;
  private String lastName;

  protected Doctor() {}

  Doctor(Specialty specialty, String title, String firstName, String lastName) {
    this.specialty = specialty;
    this.title = title;
    this.firstName = firstName;
    this.lastName = lastName;
  }

  Long id() {
    return id;
  }

  Specialty specialty() {
    return specialty;
  }

  String displayName() {
    return title + " " + firstName + " " + lastName;
  }

  /** How a patient refers to the doctor in conversation: "Dott.ssa Marchetti". */
  String shortName() {
    return title + " " + lastName;
  }
}
