package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.scheduling.DoctorDirectory;
import io.github.ilsic.agenda.scheduling.DoctorSummary;
import io.github.ilsic.agenda.shared.ClinicTime;
import io.github.ilsic.agenda.shared.DatabaseErrors;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class BookingService {

  static final int MAX_DAYS_PER_SEARCH = 31;

  /** How far ahead a visit can be booked. */
  static final int BOOKING_HORIZON_DAYS = 90;

  private final AppointmentRepository appointments;
  private final FreeSlotFinder freeSlots;
  private final DoctorDirectory doctors;
  private final BookingCodeGenerator codes;
  private final BookingEvents events;
  private final Clock clock;

  BookingService(
      AppointmentRepository appointments,
      FreeSlotFinder freeSlots,
      DoctorDirectory doctors,
      BookingCodeGenerator codes,
      BookingEvents events,
      Clock clock) {
    this.appointments = appointments;
    this.freeSlots = freeSlots;
    this.doctors = doctors;
    this.codes = codes;
    this.events = events;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  List<Slot> freeSlots(long doctorId, LocalDate from, LocalDate to) {
    if (to.isBefore(from)) {
      throw new InvalidPeriodException("The period ends before it starts");
    }
    if (ChronoUnit.DAYS.between(from, to) >= MAX_DAYS_PER_SEARCH) {
      throw new InvalidPeriodException(
          "At most " + MAX_DAYS_PER_SEARCH + " days can be searched at once");
    }
    doctors.get(doctorId);
    Instant now = clock.instant();
    LocalDate firstDay = max(from, firstBookableDay(now));
    LocalDate lastDay = min(to, lastBookableDay(now));
    if (lastDay.isBefore(firstDay)) {
      return List.of();
    }
    return freeSlots.find(doctorId, firstDay, lastDay, now);
  }

  /** The earliest free slot of each specialty, from now to the end of the booking horizon. */
  @Transactional(readOnly = true)
  List<FirstFreeSlot> firstFreeSlots() {
    Instant now = clock.instant();
    return freeSlots.firstOfEachSpecialty(firstBookableDay(now), lastBookableDay(now), now);
  }

  /** The earliest free slot of each doctor of a specialty, to the end of the booking horizon. */
  @Transactional(readOnly = true)
  List<FirstFreeSlot> firstFreeSlotsOfDoctors(long specialtyId) {
    Instant now = clock.instant();
    return freeSlots.firstOfEachDoctor(
        specialtyId, firstBookableDay(now), lastBookableDay(now), now);
  }

  /** The booking made earlier with this key, if the request is the same one sent again. */
  @Transactional(readOnly = true)
  Optional<BookingDetails> madeWith(String idempotencyKey, BookingRequest request) {
    return appointments
        .findByIdempotencyKey(idempotencyKey)
        .map(appointment -> {
          if (!appointment.wasRequestedAs(
              request.doctorId(), request.startsAt(), request.patient())) {
            throw new IdempotencyKeyReusedException();
          }
          return BookingDetails.of(appointment, doctors.get(appointment.doctorId()));
        });
  }

  @Transactional
  BookingDetails book(BookingRequest request, String idempotencyKey) {
    DoctorSummary doctor = doctors.get(request.doctorId());
    Instant now = clock.instant();
    Slot slot = offeredSlot(doctor.id(), request.startsAt(), now);
    Appointment appointment =
        Appointment.book(codes.next(), doctor.id(), slot, request.patient(), now, idempotencyKey);
    try {
      // Flush now: the database has the last word on whether the slot is still free.
      appointments.saveAndFlush(appointment);
    } catch (DataAccessException exception) {
      if (lostTheRaceForTheSlot(exception)) {
        throw new SlotNotAvailableException();
      }
      throw exception;
    }
    // Same transaction as the insert: the event exists if and only if the booking does.
    events.confirmed(appointment, doctor);
    return BookingDetails.of(appointment, doctor);
  }

  @Transactional(readOnly = true)
  BookingDetails find(String code, String email) {
    Appointment appointment = ownedBy(code, email);
    return BookingDetails.of(appointment, doctors.get(appointment.doctorId()));
  }

  @Transactional
  BookingDetails cancel(String code, String email) {
    Appointment appointment = ownedBy(code, email);
    DoctorSummary doctor = doctors.get(appointment.doctorId());
    appointment.cancel(clock.instant());
    events.cancelled(appointment, doctor);
    return BookingDetails.of(appointment, doctor);
  }

  /** A friendly early check. The exclusion constraint is what actually guarantees the rule. */
  private Slot offeredSlot(long doctorId, Instant startsAt, Instant now) {
    LocalDate day = LocalDate.ofInstant(startsAt, ClinicTime.ZONE);
    if (day.isBefore(firstBookableDay(now)) || day.isAfter(lastBookableDay(now))) {
      throw new SlotNotAvailableException();
    }
    return freeSlots.find(doctorId, day, day, now).stream()
        .filter(slot -> slot.startsAt().equals(startsAt))
        .findFirst()
        .orElseThrow(SlotNotAvailableException::new);
  }

  private static LocalDate firstBookableDay(Instant now) {
    return LocalDate.ofInstant(now, ClinicTime.ZONE);
  }

  private static LocalDate lastBookableDay(Instant now) {
    return firstBookableDay(now).plusDays(BOOKING_HORIZON_DAYS);
  }

  private static LocalDate max(LocalDate a, LocalDate b) {
    return a.isAfter(b) ? a : b;
  }

  private static LocalDate min(LocalDate a, LocalDate b) {
    return a.isBefore(b) ? a : b;
  }

  private Appointment ownedBy(String code, String email) {
    String normalizedEmail = email.strip().toLowerCase(Locale.ROOT);
    return appointments
        .findByCode(code.strip().toUpperCase(Locale.ROOT))
        .filter(appointment -> appointment.patient().email().equals(normalizedEmail))
        .orElseThrow(BookingNotFoundException::new);
  }

  /**
   * Two requests can pass the early check together. The exclusion constraint then refuses the
   * second insert. If both rows are written before either is checked, each transaction waits for
   * the other and PostgreSQL ends the deadlock by aborting one of them. Either way one booking
   * survives and the other request lost.
   */
  private static boolean lostTheRaceForTheSlot(DataAccessException exception) {
    return DatabaseErrors.isExclusionViolation(exception) || DatabaseErrors.isDeadlock(exception);
  }
}
