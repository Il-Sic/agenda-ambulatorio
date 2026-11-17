package io.github.ilsic.agenda.scheduling;

import io.github.ilsic.agenda.shared.ClinicTime;
import io.github.ilsic.agenda.shared.DatabaseErrors;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Maintains weekly availability and closure days. Slots are derived from these on the fly. */
@Service
class ScheduleService {

  private final DoctorRepository doctors;
  private final WeeklyAvailabilityRepository availabilities;
  private final ClosureDayRepository closures;
  private final Clock clock;

  ScheduleService(
      DoctorRepository doctors,
      WeeklyAvailabilityRepository availabilities,
      ClosureDayRepository closures,
      Clock clock) {
    this.doctors = doctors;
    this.availabilities = availabilities;
    this.closures = closures;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  List<AvailabilityWindow> availabilityOf(long doctorId) {
    requireDoctor(doctorId);
    return availabilities.findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(doctorId).stream()
        .map(AvailabilityWindow::of)
        .toList();
  }

  @Transactional
  AvailabilityWindow addAvailability(long doctorId, AvailabilityRequest request) {
    requireDoctor(doctorId);
    if (!request.startTime().isBefore(request.endTime())) {
      throw new InvalidAvailabilityException("The window must end after it starts");
    }
    WeeklyAvailability availability =
        new WeeklyAvailability(
            doctorId,
            request.dayOfWeek(),
            request.startTime(),
            request.endTime(),
            request.slotMinutes());
    try {
      // As with appointments, an exclusion constraint decides whether two windows overlap.
      return AvailabilityWindow.of(availabilities.saveAndFlush(availability));
    } catch (DataAccessException exception) {
      if (DatabaseErrors.isExclusionViolation(exception)) {
        throw new AvailabilityOverlapException();
      }
      throw exception;
    }
  }

  @Transactional
  void removeAvailability(long availabilityId) {
    availabilities.deleteById(availabilityId);
  }

  @Transactional(readOnly = true)
  List<Closure> upcomingClosures() {
    LocalDate today = LocalDate.now(clock.withZone(ClinicTime.ZONE));
    return closures.findByDayGreaterThanEqualOrderByDay(today).stream().map(Closure::of).toList();
  }

  @Transactional
  Closure close(ClosureRequest request) {
    try {
      return Closure.of(
          closures.saveAndFlush(new ClosureDay(request.day(), request.reason().strip())));
    } catch (DataAccessException exception) {
      if (DatabaseErrors.isUniqueViolation(exception)) {
        throw new ClosureExistsException(request.day());
      }
      throw exception;
    }
  }

  @Transactional
  void reopen(long closureId) {
    closures.deleteById(closureId);
  }

  private void requireDoctor(long doctorId) {
    if (!doctors.existsById(doctorId)) {
      throw new DoctorNotFoundException(doctorId);
    }
  }
}
