package io.github.ilsic.agenda.notification;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.time.Instant;

/** Read-only view of an e-mail the system has "sent". */
@Entity
class SentEmail {

  @Id private Long id;
  private String recipient;
  private String subject;
  private String body;
  private Instant sentAt;

  protected SentEmail() {}

  Long id() {
    return id;
  }

  String recipient() {
    return recipient;
  }

  String subject() {
    return subject;
  }

  String body() {
    return body;
  }

  Instant sentAt() {
    return sentAt;
  }
}
