package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.scheduling.DoctorDirectory;
import io.github.ilsic.agenda.scheduling.DoctorSummary;
import io.github.ilsic.agenda.shared.ClinicTime;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** What the screen in the waiting room shows: today's latest calls. */
@Service
class WaitingRoom {

  /** The call on screen and the four before it, for whoever looked away. */
  static final int CALLS_SHOWN = 5;

  private final AppointmentRepository appointments;
  private final DoctorDirectory doctors;
  private final Clock clock;

  WaitingRoom(AppointmentRepository appointments, DoctorDirectory doctors, Clock clock) {
    this.appointments = appointments;
    this.doctors = doctors;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  List<WaitingRoomCall> latestCalls() {
    LocalDate today = LocalDate.ofInstant(clock.instant(), ClinicTime.ZONE);
    List<Appointment> called = appointments.latestCalls(today, Limit.of(CALLS_SHOWN));
    if (called.isEmpty()) {
      return List.of();
    }
    Map<Long, DoctorSummary> doctorsById =
        doctors.all().stream().collect(Collectors.toMap(DoctorSummary::id, Function.identity()));
    return called.stream()
        .map(appointment -> {
          DoctorSummary doctor = doctorsById.get(appointment.doctorId());
          return new WaitingRoomCall(
              appointment.callNumber(),
              doctor.room(),
              doctor.floor(),
              doctor.specialty(),
              appointment.calledAt());
        })
        .toList();
  }
}
