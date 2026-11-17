package io.github.ilsic.agenda.scheduling;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
class Specialty {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;

  protected Specialty() {}

  Specialty(String name) {
    this.name = name;
  }

  Long id() {
    return id;
  }

  String name() {
    return name;
  }
}
