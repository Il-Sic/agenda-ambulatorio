package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.scheduling.DoctorDirectory;
import io.github.ilsic.agenda.scheduling.DoctorSummary;
import io.github.ilsic.agenda.shared.ClinicTime;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class BookingService {

  static final int MAX_DAYS_PER_SEARCH = 31;

  // PostgreSQL error codes for "you lost the race for this slot".
  private static final String EXCLUSION_VIOLATION = "23P01";
  private static final String DEADLOCK_DETECTED = "40P01";

  private final AppointmentRepository appointments;
  private final FreeSlotFinder freeSlots;
  private final DoctorDirectory doctors;
  private final BookingCodeGenerator codes;
  private final Clock clock;

  BookingService(
      AppointmentRepository appointments,
      FreeSlotFinder freeSlots,
      DoctorDirectory doctors,
      BookingCodeGenerator codes,
      Clock clock) {
    this.appointments = appointments;
    this.freeSlots = freeSlots;
    this.doctors = doctors;
    this.codes = codes;
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
    return freeSlots.find(doctorId, from, to, clock.instant());
  }

  @Transactional
  BookingDetails book(BookingRequest request) {
    DoctorSummary doctor = doctors.get(request.doctorId());
    Instant now = clock.instant();
    Slot slot = offeredSlot(doctor.id(), request.startsAt(), now);
    Appointment appointment =
        Appointment.book(codes.next(), doctor.id(), slot, request.patient(), now);
    try {
      // Flush now: the database has the last word on whether the slot is still free.
      appointments.saveAndFlush(appointment);
    } catch (DataAccessException exception) {
      if (lostTheRaceForTheSlot(exception)) {
        throw new SlotNotAvailableException();
      }
      throw exception;
    }
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
    appointment.cancel(clock.instant());
    return BookingDetails.of(appointment, doctors.get(appointment.doctorId()));
  }

  /** A friendly early check. The exclusion constraint is what actually guarantees the rule. */
  private Slot offeredSlot(long doctorId, Instant startsAt, Instant now) {
    LocalDate day = LocalDate.ofInstant(startsAt, ClinicTime.ZONE);
    return freeSlots.find(doctorId, day, day, now).stream()
        .filter(slot -> slot.startsAt().equals(startsAt))
        .findFirst()
        .orElseThrow(SlotNotAvailableException::new);
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
    return exception.getMostSpecificCause() instanceof SQLException sqlException
        && (EXCLUSION_VIOLATION.equals(sqlException.getSQLState())
            || DEADLOCK_DETECTED.equals(sqlException.getSQLState()));
  }
}
