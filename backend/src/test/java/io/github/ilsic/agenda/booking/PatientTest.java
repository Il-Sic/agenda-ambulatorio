package io.github.ilsic.agenda.booking;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PatientTest {

  @Test
  void trimsContactDetailsAndLowersTheEmailSoLookupsAreNotCaseSensitive() {
    Patient patient =
        new Patient("  Giulia Bianchi ", " Giulia.Bianchi@Example.COM ", " 333 1234567 ");

    assertThat(patient.name()).isEqualTo("Giulia Bianchi");
    assertThat(patient.email()).isEqualTo("giulia.bianchi@example.com");
    assertThat(patient.phone()).isEqualTo("333 1234567");
  }
}
