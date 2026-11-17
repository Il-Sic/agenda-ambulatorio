package io.github.ilsic.agenda.notification;

import java.util.List;
import org.springframework.data.repository.Repository;

interface SentEmailRepository extends Repository<SentEmail, Long> {

  List<SentEmail> findTop50ByOrderBySentAtDescIdDesc();
}
