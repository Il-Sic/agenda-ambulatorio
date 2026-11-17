package io.github.ilsic.agenda.scheduling;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Catalogue", description = "Specialties and doctors a patient can choose from")
class CatalogueController {

  private final SpecialtyRepository specialties;
  private final DoctorDirectory doctors;

  CatalogueController(SpecialtyRepository specialties, DoctorDirectory doctors) {
    this.specialties = specialties;
    this.doctors = doctors;
  }

  @GetMapping("/specialties")
  @Operation(summary = "List the specialties, in alphabetical order")
  List<SpecialtySummary> specialties() {
    return specialties.findAllByOrderByName().stream().map(SpecialtySummary::of).toList();
  }

  @GetMapping("/doctors")
  @Operation(summary = "List the doctors of a specialty")
  List<DoctorSummary> doctors(@RequestParam long specialtyId) {
    return doctors.ofSpecialty(specialtyId);
  }
}
