package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.scheduling.DoctorDirectory;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reminds patients of their visit a day before, through the same events as everything else. */
@Service
class VisitReminders {

  static final Duration NOTICE = Duration.ofHours(24);
  private static final int BATCH_SIZE = 100;

  private final AppointmentRepository appointments;
  private final DoctorDirectory doctors;
  private final BookingEvents events;
  private final Clock clock;

  VisitReminders(
      AppointmentRepository appointments,
      DoctorDirectory doctors,
      BookingEvents events,
      Clock clock) {
    this.appointments = appointments;
    this.doctors = doctors;
    this.events = events;
    this.clock = clock;
  }

  /**
   * Records a reminder for every booked visit that starts within a day and has not had one.
   *
   * <p>Marking the visit and writing the event share one transaction. If two instances of the
   * application pick the same visit, its version column lets only one of them commit: the other
   * rolls back, reminder event included, so the patient gets one e-mail.
   *
   * @return how many visits were reminded
   */
  @Transactional
  int remindOfVisitsInTheNextDay() {
    Instant now = clock.instant();
    List<Appointment> due =
        appointments.dueForReminder(now, now.plus(NOTICE), Limit.of(BATCH_SIZE));
    for (Appointment appointment : due) {
      appointment.markReminded(now);
      events.reminder(appointment, doctors.get(appointment.doctorId()));
    }
    return due.size();
  }
}
