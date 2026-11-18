package io.github.ilsic.agenda.scheduling;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Catalogue", description = "Specialties and doctors a patient can choose from")
class CatalogueController {

  private final SpecialtyRepository specialties;
  private final DoctorRepository doctorRepository;
  private final DoctorDirectory doctors;

  CatalogueController(
      SpecialtyRepository specialties, DoctorRepository doctorRepository, DoctorDirectory doctors) {
    this.specialties = specialties;
    this.doctorRepository = doctorRepository;
    this.doctors = doctors;
  }

  @GetMapping("/specialties")
  @Operation(
      summary = "List the specialties, in alphabetical order",
      description = "Each with its doctors by title and surname, in alphabetical order.")
  List<SpecialtySummary> specialties() {
    Map<Long, List<String>> doctorsBySpecialty =
        doctorRepository.findAllByOrderByLastNameAscFirstNameAsc().stream()
            .collect(
                Collectors.groupingBy(
                    doctor -> doctor.specialty().id(),
                    Collectors.mapping(Doctor::shortName, Collectors.toList())));
    return specialties.findAllByOrderByName().stream()
        .map(specialty ->
            SpecialtySummary.of(
                specialty, doctorsBySpecialty.getOrDefault(specialty.id(), List.of())))
        .toList();
  }

  @GetMapping("/doctors")
  @Operation(summary = "List the doctors of a specialty")
  List<DoctorSummary> doctors(@RequestParam long specialtyId) {
    return doctors.ofSpecialty(specialtyId);
  }
}
