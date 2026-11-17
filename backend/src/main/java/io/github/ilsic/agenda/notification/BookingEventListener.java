package io.github.ilsic.agenda.notification;

import io.github.ilsic.agenda.shared.Topics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
class BookingEventListener {

  private static final Logger log = LoggerFactory.getLogger(BookingEventListener.class);

  private final JsonMapper json;
  private final SimulatedEmailSender emails;

  BookingEventListener(JsonMapper json, SimulatedEmailSender emails) {
    this.json = json;
    this.emails = emails;
  }

  @KafkaListener(topics = Topics.BOOKING_EVENTS, groupId = "notification")
  void on(String message) {
    BookingMessage event = json.readValue(message, BookingMessage.class);
    EmailTemplates.render(event)
        .ifPresentOrElse(
            email -> emails.send(event.eventId(), email),
            () -> log.info("No e-mail for events of type {}", event.type()));
  }
}
