package io.github.ilsic.agenda.scheduling;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface DoctorRepository extends JpaRepository<Doctor, Long> {

  List<Doctor> findBySpecialtyIdOrderByLastNameAscFirstNameAsc(Long specialtyId);
}
