package io.github.ilsic.agenda.shared;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The last resort. An exception no handler knows about is forwarded here by the servlet container,
 * and leaves as a 500 Problem Detail that says nothing about what went wrong inside. The container
 * has already logged the exception with its stack trace.
 */
@RestController
@Hidden
class UnexpectedErrorController implements ErrorController {

  @RequestMapping("${server.error.path:/error}")
  ProblemDetail unexpected(HttpServletRequest request) {
    HttpStatus status = statusOf(request);
    ProblemDetail problem =
        status.is5xxServerError()
            ? Problems.of(
                status,
                "unexpected",
                "Unexpected error",
                "Something went wrong on our side. Try again later.")
            : Problems.of(
                status,
                Problems.slugOf(status),
                status.getReasonPhrase(),
                status.getReasonPhrase());
    if (request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI) instanceof String path) {
      problem.setInstance(URI.create(path));
    }
    return problem;
  }

  private static HttpStatus statusOf(HttpServletRequest request) {
    HttpStatus status =
        request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE) instanceof Integer code
            ? HttpStatus.resolve(code)
            : null;
    return status == null ? HttpStatus.INTERNAL_SERVER_ERROR : status;
  }
}
