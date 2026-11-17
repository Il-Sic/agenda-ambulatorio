package io.github.ilsic.agenda.booking;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface AppointmentRepository extends JpaRepository<Appointment, Long> {

  Optional<Appointment> findByCode(String code);
}
