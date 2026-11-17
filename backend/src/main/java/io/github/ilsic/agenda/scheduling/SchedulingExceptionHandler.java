package io.github.ilsic.agenda.scheduling;

import io.github.ilsic.agenda.shared.Problems;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class SchedulingExceptionHandler {

  @ExceptionHandler
  ProblemDetail doctorNotFound(DoctorNotFoundException exception) {
    return Problems.of(
        HttpStatus.NOT_FOUND, "doctor-not-found", "Doctor not found", exception.getMessage());
  }

  @ExceptionHandler
  ProblemDetail invalidAvailability(InvalidAvailabilityException exception) {
    return Problems.of(
        HttpStatus.BAD_REQUEST,
        "invalid-availability",
        "Invalid availability",
        exception.getMessage());
  }

  @ExceptionHandler
  ProblemDetail availabilityOverlap(AvailabilityOverlapException exception) {
    return Problems.of(
        HttpStatus.CONFLICT,
        "availability-overlap",
        "Availability overlaps",
        exception.getMessage());
  }

  @ExceptionHandler
  ProblemDetail closureExists(ClosureExistsException exception) {
    return Problems.of(
        HttpStatus.CONFLICT, "closure-exists", "Day already closed", exception.getMessage());
  }
}
