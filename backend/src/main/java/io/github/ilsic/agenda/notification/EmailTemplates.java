package io.github.ilsic.agenda.notification;

import io.github.ilsic.agenda.shared.ClinicTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;

/** Writes the e-mails, in Italian and in the clinic's local time. */
final class EmailTemplates {

  private static final DateTimeFormatter WHEN =
      DateTimeFormatter.ofPattern("EEEE d MMMM yyyy 'alle' HH:mm", Locale.ITALIAN)
          .withZone(ClinicTime.ZONE);

  private EmailTemplates() {}

  /** Empty when the event is of a type this module does not send e-mails for. */
  static Optional<Email> render(BookingMessage message) {
    return switch (message.type()) {
      case "BOOKING_CONFIRMED" -> Optional.of(confirmation(message));
      case "BOOKING_CANCELLED" -> Optional.of(cancellation(message));
      default -> Optional.empty();
    };
  }

  private static Email confirmation(BookingMessage message) {
    return new Email(
        message.patientEmail(),
        "Prenotazione confermata - codice " + message.bookingCode(),
        """
        Gentile %s,

        la sua visita è confermata.

        Specialità: %s
        Medico: %s
        Quando: %s
        Codice di prenotazione: %s

        Per rivedere o annullare la prenotazione usi sul nostro sito il codice e questo indirizzo email.

        Poliambulatorio Valdoria
        """
            .formatted(
                message.patientName(),
                message.specialty(),
                message.doctorName(),
                WHEN.format(message.startsAt()),
                message.bookingCode()));
  }

  private static Email cancellation(BookingMessage message) {
    return new Email(
        message.patientEmail(),
        "Prenotazione annullata - codice " + message.bookingCode(),
        """
        Gentile %s,

        la sua visita di %s con %s di %s è stata annullata.

        Può prenotare un nuovo orario sul nostro sito quando vuole.

        Poliambulatorio Valdoria
        """
            .formatted(
                message.patientName(),
                message.specialty(),
                message.doctorName(),
                WHEN.format(message.startsAt())));
  }
}
