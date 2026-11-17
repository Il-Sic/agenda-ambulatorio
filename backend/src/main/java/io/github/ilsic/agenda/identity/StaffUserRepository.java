package io.github.ilsic.agenda.identity;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface StaffUserRepository extends JpaRepository<StaffUser, Long> {

  Optional<StaffUser> findByUsername(String username);
}
