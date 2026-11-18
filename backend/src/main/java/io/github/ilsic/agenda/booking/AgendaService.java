package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.scheduling.DoctorDirectory;
import io.github.ilsic.agenda.scheduling.DoctorSummary;
import io.github.ilsic.agenda.scheduling.OpeningHours;
import io.github.ilsic.agenda.scheduling.OpeningHours.WorkingPeriod;
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
  private final OpeningHours openingHours;
  private final FreeSlotFinder freeSlots;
  private final BookingEvents events;
  private final CallNumbers callNumbers;
  private final Clock clock;

  AgendaService(
      AppointmentRepository appointments,
      DoctorDirectory doctors,
      OpeningHours openingHours,
      FreeSlotFinder freeSlots,
      BookingEvents events,
      CallNumbers callNumbers,
      Clock clock) {
    this.appointments = appointments;
    this.doctors = doctors;
    this.openingHours = openingHours;
    this.freeSlots = freeSlots;
    this.events = events;
    this.callNumbers = callNumbers;
    this.clock = clock;
  }

  /** The day drawn for the front desk: every doctor, with hours, free slots and appointments. */
  @Transactional(readOnly = true)
  DayPlan plan(LocalDate date) {
    Instant now = clock.instant();
    List<AgendaEntry> appointments = day(date, null);
    Map<Long, List<Slot>> hours =
        openingHours.on(date).stream()
            .collect(
                Collectors.groupingBy(
                    WorkingPeriod::doctorId,
                    Collectors.mapping(
                        period -> new Slot(period.startsAt(), period.endsAt()),
                        Collectors.toList())));
    Map<Long, List<Slot>> free =
        BookingService.withinBookingHorizon(date, now) ? freeSlots.onDay(date, now) : Map.of();
    List<DayPlan.DoctorDay> doctorDays =
        doctors.all().stream()
            .map(doctor ->
                new DayPlan.DoctorDay(
                    doctor.id(),
                    doctor.name(),
                    doctor.lastName(),
                    doctor.specialty(),
                    hours.getOrDefault(doctor.id(), List.of()),
                    free.getOrDefault(doctor.id(), List.of()),
                    appointments.stream()
                        .filter(appointment -> appointment.doctorId() == doctor.id())
                        .toList()))
            .toList();
    return new DayPlan(date, openingHours.closure(date).orElse(""), doctorDays);
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

  /** On the day of the visit the patient also takes the next number, from the same transaction. */
  @Transactional
  AgendaEntry markArrived(long appointmentId) {
    return change(
        appointmentId,
        (appointment, now) ->
            appointment.markArrived(
                now, () -> callNumbers.next(LocalDate.ofInstant(now, ClinicTime.ZONE))));
  }

  /** The number goes on the waiting room screen. */
  @Transactional
  AgendaEntry call(long appointmentId) {
    return change(appointmentId, Appointment::call);
  }

  @Transactional
  AgendaEntry markNoShow(long appointmentId) {
    return change(appointmentId, Appointment::markNoShow);
  }

  /** The patient is told about it: a cancellation, unlike an outcome, produces an event. */
  @Transactional
  AgendaEntry cancel(long appointmentId) {
    Appointment appointment = find(appointmentId);
    DoctorSummary doctor = doctors.get(appointment.doctorId());
    appointment.cancel(clock.instant());
    events.cancelled(appointment, doctor);
    return AgendaEntry.of(appointment, doctor);
  }

  private AgendaEntry change(long appointmentId, BiConsumer<Appointment, Instant> change) {
    Appointment appointment = find(appointmentId);
    change.accept(appointment, clock.instant());
    return AgendaEntry.of(appointment, doctors.get(appointment.doctorId()));
  }

  private Appointment find(long appointmentId) {
    return appointments
        .findById(appointmentId)
        .orElseThrow(() -> new AppointmentNotFoundException(appointmentId));
  }
}
