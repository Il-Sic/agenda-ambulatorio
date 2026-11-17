package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.shared.Problems;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class BookingExceptionHandler {

  @ExceptionHandler
  ProblemDetail slotNotAvailable(SlotNotAvailableException exception) {
    return Problems.of(
        HttpStatus.CONFLICT, "slot-not-available", "Slot not available", exception.getMessage());
  }

  @ExceptionHandler
  ProblemDetail bookingNotFound(BookingNotFoundException exception) {
    return Problems.of(
        HttpStatus.NOT_FOUND, "booking-not-found", "Booking not found", exception.getMessage());
  }

  @ExceptionHandler
  ProblemDetail appointmentNotFound(AppointmentNotFoundException exception) {
    return Problems.of(
        HttpStatus.NOT_FOUND,
        "appointment-not-found",
        "Appointment not found",
        exception.getMessage());
  }

  @ExceptionHandler
  ProblemDetail appointmentState(AppointmentStateException exception) {
    return Problems.of(
        HttpStatus.CONFLICT,
        "appointment-state",
        "Not possible for this appointment",
        exception.getMessage());
  }

  @ExceptionHandler
  ProblemDetail invalidPeriod(InvalidPeriodException exception) {
    return Problems.of(
        HttpStatus.BAD_REQUEST, "invalid-period", "Invalid period", exception.getMessage());
  }
}
