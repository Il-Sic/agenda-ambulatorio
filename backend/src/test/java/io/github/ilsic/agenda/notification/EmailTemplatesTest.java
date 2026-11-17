package io.github.ilsic.agenda.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EmailTemplatesTest {

  @Test
  void aConfirmationTellsThePatientWhenAndWithWhomInClinicTime() {
    Email email =
        EmailTemplates.render(message("BOOKING_CONFIRMED", "2027-03-01T08:00:00Z")).orElseThrow();

    assertThat(email.recipient()).isEqualTo("giulia.bianchi@example.com");
    assertThat(email.subject()).isEqualTo("Prenotazione confermata - codice ABCD2345");
    assertThat(email.body())
        .contains("Gentile Giulia Bianchi")
        .contains("Dott.ssa Elena Marchetti")
        .contains("Cardiologia")
        .contains("lunedì 1 marzo 2027 alle 09:00")
        .contains("ABCD2345");
  }

  @Test
  void summerTimeIsAppliedToTheHourThePatientReads() {
    // 08:00 UTC is 10:00 in Rome in July.
    Email email =
        EmailTemplates.render(message("BOOKING_CONFIRMED", "2027-07-05T08:00:00Z")).orElseThrow();

    assertThat(email.body()).contains("lunedì 5 luglio 2027 alle 10:00");
  }

  @Test
  void aCancellationSaysSoInTheSubject() {
    Email email =
        EmailTemplates.render(message("BOOKING_CANCELLED", "2027-03-01T08:00:00Z")).orElseThrow();

    assertThat(email.subject()).isEqualTo("Prenotazione annullata - codice ABCD2345");
    assertThat(email.body())
        .contains("è stata annullata")
        .contains("lunedì 1 marzo 2027 alle 09:00");
  }

  @Test
  void anEventOfAnUnknownTypeProducesNoEmail() {
    assertThat(EmailTemplates.render(message("SOMETHING_NEW", "2027-03-01T08:00:00Z"))).isEmpty();
  }

  private static BookingMessage message(String type, String startsAt) {
    return new BookingMessage(
        UUID.randomUUID(),
        type,
        "ABCD2345",
        "Giulia Bianchi",
        "giulia.bianchi@example.com",
        "Dott.ssa Elena Marchetti",
        "Cardiologia",
        Instant.parse(startsAt));
  }
}
