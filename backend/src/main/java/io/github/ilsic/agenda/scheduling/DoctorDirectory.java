package io.github.ilsic.agenda.scheduling;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The way other modules look doctors up, without touching this module's entities. */
@Service
@Transactional(readOnly = true)
public class DoctorDirectory {

  private final DoctorRepository doctors;

  DoctorDirectory(DoctorRepository doctors) {
    this.doctors = doctors;
  }

  public DoctorSummary get(long doctorId) {
    return doctors
        .findWithSpecialtyById(doctorId)
        .map(DoctorSummary::of)
        .orElseThrow(() -> new DoctorNotFoundException(doctorId));
  }

  public List<DoctorSummary> all() {
    return doctors.findAllByOrderByLastNameAscFirstNameAsc().stream()
        .map(DoctorSummary::of)
        .toList();
  }

  public List<DoctorSummary> ofSpecialty(long specialtyId) {
    return doctors.findBySpecialtyIdOrderByLastNameAscFirstNameAsc(specialtyId).stream()
        .map(DoctorSummary::of)
        .toList();
  }
}
