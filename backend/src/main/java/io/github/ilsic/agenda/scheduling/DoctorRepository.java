package io.github.ilsic.agenda.scheduling;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

interface DoctorRepository extends JpaRepository<Doctor, Long> {

  @EntityGraph(attributePaths = "specialty")
  Optional<Doctor> findWithSpecialtyById(Long id);

  @EntityGraph(attributePaths = "specialty")
  List<Doctor> findAllByOrderByLastNameAscFirstNameAsc();

  @EntityGraph(attributePaths = "specialty")
  List<Doctor> findBySpecialtyIdOrderByLastNameAscFirstNameAsc(Long specialtyId);
}
