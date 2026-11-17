package io.github.ilsic.agenda.shared;

import java.util.List;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Turns framework errors (malformed JSON, missing parameters, failed validation…) into Problem
 * Details. Each module adds its own handler for its own exceptions.
 */
@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException exception,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    List<Problem.InvalidField> errors =
        exception.getBindingResult().getFieldErrors().stream()
            .map(error -> new Problem.InvalidField(error.getField(), error.getDefaultMessage()))
            .toList();
    ProblemDetail problem =
        Problems.of(
            HttpStatus.BAD_REQUEST,
            "validation",
            "Invalid request",
            "One or more fields are not valid");
    problem.setProperty("errors", errors);
    return handleExceptionInternal(exception, problem, headers, status, request);
  }

  /** Two people changed the same record; the second one must reload before trying again. */
  @ExceptionHandler
  ProblemDetail concurrentUpdate(OptimisticLockingFailureException exception) {
    return Problems.of(
        HttpStatus.CONFLICT,
        "concurrent-update",
        "Changed by someone else",
        "The data was changed by someone else in the meantime. Reload and try again.");
  }
}
