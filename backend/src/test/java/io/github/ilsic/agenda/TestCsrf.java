package io.github.ilsic.agenda;

import jakarta.servlet.http.Cookie;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Sends the CSRF token the way the single-page app does: the value of the XSRF-TOKEN cookie is
 * repeated in the X-XSRF-TOKEN header.
 *
 * <p>Used instead of Spring Security's own {@code csrf()} test helper, which swaps the
 * application's token repository for a test double. With this one, every test goes through the real
 * CSRF configuration.
 */
public final class TestCsrf {

  private static final String TOKEN = "token-chosen-by-the-test";

  private TestCsrf() {}

  public static RequestPostProcessor csrf() {
    return request -> {
      request.setCookies(new Cookie("XSRF-TOKEN", TOKEN));
      request.addHeader("X-XSRF-TOKEN", TOKEN);
      return request;
    };
  }
}
