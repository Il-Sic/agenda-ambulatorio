package io.github.ilsic.agenda.scheduling;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface SpecialtyRepository extends JpaRepository<Specialty, Long> {

  List<Specialty> findAllByOrderByName();
}
