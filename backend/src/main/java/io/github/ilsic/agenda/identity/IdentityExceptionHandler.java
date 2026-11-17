package io.github.ilsic.agenda.identity;

import io.github.ilsic.agenda.shared.Problems;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class IdentityExceptionHandler {

  /** An unknown user and a wrong password get the same answer, on purpose. */
  @ExceptionHandler
  ProblemDetail badCredentials(BadCredentialsException exception) {
    return Problems.of(
        HttpStatus.UNAUTHORIZED,
        "bad-credentials",
        "Wrong credentials",
        "Wrong username or password");
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
