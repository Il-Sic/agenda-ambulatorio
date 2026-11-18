package io.github.ilsic.agenda.scheduling;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@IntegrationTest
class CatalogueApiTest {

  @Autowired MockMvcTester mvc;
  @Autowired TestData data;

  @BeforeEach
  void setUp() {
    data.reset();
  }

  @Test
  void listsSpecialtiesInAlphabeticalOrder() {
    data.specialty("Ortopedia");
    data.specialty("Cardiologia");

    assertThat(mvc.get().uri("/api/v1/specialties"))
        .hasStatusOk()
        .bodyJson()
        .extractingPath("$[*].name")
        .asArray()
        .containsExactly("Cardiologia", "Ortopedia");
  }

  @Test
  void listsTheDoctorsOfEachSpecialtyByTitleAndSurname() {
    long cardiology = data.specialty("Cardiologia");
    long paediatrics = data.specialty("Pediatria");
    data.specialty("Dermatologia");
    data.doctor(cardiology, "Rinaldi");
    data.doctor(paediatrics, "Gentile");
    data.doctor(cardiology, "Marchetti");

    assertThat(mvc.get().uri("/api/v1/specialties"))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            [
              {"id": %d, "name": "Cardiologia",
               "doctors": ["Dott.ssa Marchetti", "Dott.ssa Rinaldi"]},
              {"name": "Dermatologia", "doctors": []},
              {"id": %d, "name": "Pediatria", "doctors": ["Dott.ssa Gentile"]}
            ]
            """
                .formatted(cardiology, paediatrics));
  }

  @Test
  void listsTheDoctorsOfASpecialty() {
    long cardiology = data.specialty("Cardiologia");
    long orthopaedics = data.specialty("Ortopedia");
    long marchetti = data.doctor(cardiology, "Marchetti");
    data.doctor(orthopaedics, "Ferri");

    assertThat(mvc.get().uri("/api/v1/doctors?specialtyId={id}", cardiology))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            [{"id": %d, "name": "Dott.ssa Elena Marchetti", "specialty": "Cardiologia"}]
            """
                .formatted(marchetti));
  }
}
