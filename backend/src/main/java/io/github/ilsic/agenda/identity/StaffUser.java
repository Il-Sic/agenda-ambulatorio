package io.github.ilsic.agenda.identity;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
class StaffUser {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String username;
  private String displayName;

  @Enumerated(EnumType.STRING)
  private StaffRole role;

  private String passwordHash;

  protected StaffUser() {}

  String username() {
    return username;
  }

  String displayName() {
    return displayName;
  }

  StaffRole role() {
    return role;
  }

  String passwordHash() {
    return passwordHash;
  }
}
