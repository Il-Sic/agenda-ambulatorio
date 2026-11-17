package io.github.ilsic.agenda.notification;

import java.time.Instant;

record Notification(long id, String recipient, String subject, String body, Instant sentAt) {

  static Notification of(SentEmail email) {
    return new Notification(
        email.id(), email.recipient(), email.subject(), email.body(), email.sentAt());
  }
}
