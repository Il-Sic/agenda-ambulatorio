package io.github.ilsic.agenda.shared;

import java.net.URI;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

/** Builds RFC 9457 error bodies. Clients tell errors apart by {@code type}, not by the text. */
public final class Problems {

  private Problems() {}

  public static ProblemDetail of(HttpStatus status, String slug, String title, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setType(URI.create("/problems/" + slug));
    problem.setTitle(title);
    return problem;
  }

  /** "bad-request" for 400, "method-not-allowed" for 405, and so on. */
  public static String slugOf(HttpStatus status) {
    return status.name().toLowerCase(Locale.ROOT).replace('_', '-');
  }
}
