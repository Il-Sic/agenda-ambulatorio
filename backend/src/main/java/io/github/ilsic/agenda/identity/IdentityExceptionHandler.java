package io.github.ilsic.agenda.identity;

import io.github.ilsic.agenda.shared.Problems;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class IdentityExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(IdentityExceptionHandler.class);

  /** An unknown user and a wrong password get the same answer, on purpose. */
  @ExceptionHandler
  ProblemDetail badCredentials(BadCredentialsException exception) {
    return Problems.of(
        HttpStatus.UNAUTHORIZED,
        "bad-credentials",
        "Wrong credentials",
        "Wrong username or password");
  }

  /** The credentials could not even be checked, for example because the database is down. */
  @ExceptionHandler
  ProblemDetail signInFailedForTechnicalReasons(AuthenticationServiceException exception) {
    log.error("Sign-in could not be completed", exception);
    return Problems.of(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "unexpected",
        "Unexpected error",
        "Something went wrong on our side. Try again later.");
  }

  @ExceptionHandler
  ProblemDetail unauthenticated(AuthenticationException exception) {
    return Problems.of(
        HttpStatus.UNAUTHORIZED, "unauthenticated", "Sign-in required", "Sign in to continue");
  }

  @ExceptionHandler
  ProblemDetail forbidden(AccessDeniedException exception) {
    return Problems.of(
        HttpStatus.FORBIDDEN, "forbidden", "Not allowed", "You are not allowed to do this");
  }
}
