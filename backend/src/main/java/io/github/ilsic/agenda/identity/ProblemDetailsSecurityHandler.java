package io.github.ilsic.agenda.identity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerExceptionResolver;

/**
 * Security errors are raised in servlet filters, before Spring MVC. This hands them to the same
 * exception handlers controllers use, so every error leaves the API as Problem Details.
 */
@Component
class ProblemDetailsSecurityHandler
    implements AuthenticationEntryPoint, AccessDeniedHandler, AuthenticationFailureHandler {

  private final HandlerExceptionResolver resolver;

  ProblemDetailsSecurityHandler(
      @Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) {
    this.resolver = resolver;
  }

  @Override
  public void commence(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) {
    resolver.resolveException(request, response, null, exception);
  }

  @Override
  public void handle(
      HttpServletRequest request, HttpServletResponse response, AccessDeniedException exception) {
    resolver.resolveException(request, response, null, exception);
  }

  @Override
  public void onAuthenticationFailure(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) {
    resolver.resolveException(request, response, null, exception);
  }
}
