package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.scheduling.DoctorDirectory;
import io.github.ilsic.agenda.scheduling.DoctorSummary;
import io.github.ilsic.agenda.shared.ClinicTime;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** What the staff do with appointments: read the day's agenda and record what happened. */
@Service
class AgendaService {

  private final AppointmentRepository appointments;
  private final DoctorDirectory doctors;
  private final Clock clock;

  AgendaService(AppointmentRepository appointments, DoctorDirectory doctors, Clock clock) {
    this.appointments = appointments;
    this.doctors = doctors;
    this.clock = clock;
  }

  /** Appointments of one calendar day at the clinic, optionally of a single doctor. */
  @Transactional(readOnly = true)
  List<AgendaEntry> day(LocalDate date, Long doctorId) {
    Instant from = date.atStartOfDay(ClinicTime.ZONE).toInstant();
    Instant to = date.plusDays(1).atStartOfDay(ClinicTime.ZONE).toInstant();
    Map<Long, DoctorSummary> doctorsById =
        doctors.all().stream().collect(Collectors.toMap(DoctorSummary::id, Function.identity()));
    return appointments.startingBetween(from, to).stream()
        .filter(appointment -> doctorId == null || doctorId.equals(appointment.doctorId()))
        .map(appointment -> AgendaEntry.of(appointment, doctorsById.get(appointment.doctorId())))
        .toList();
  }

  @Transactional
  AgendaEntry markArrived(long appointmentId) {
    return change(appointmentId, Appointment::markArrived);
  }

  @Transactional
  AgendaEntry markNoShow(long appointmentId) {
    return change(appointmentId, Appointment::markNoShow);
  }

  @Transactional
  AgendaEntry cancel(long appointmentId) {
    return change(appointmentId, Appointment::cancel);
  }

  private AgendaEntry change(long appointmentId, BiConsumer<Appointment, Instant> change) {
    Appointment appointment =
        appointments
            .findById(appointmentId)
            .orElseThrow(() -> new AppointmentNotFoundException(appointmentId));
    change.accept(appointment, clock.instant());
    return AgendaEntry.of(appointment, doctors.get(appointment.doctorId()));
  }
}
