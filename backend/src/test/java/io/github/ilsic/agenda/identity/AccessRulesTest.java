package io.github.ilsic.agenda.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@IntegrationTest
class AccessRulesTest {

  @Autowired MockMvcTester mvc;
  @Autowired TestData data;

  @BeforeEach
  void setUp() {
    data.reset();
    data.staffUser("anna", "Anna Russo", "STAFF", "correct-horse-battery");
  }

  @Test
  void patientsNeedNoAccountToBrowse() {
    assertThat(mvc.get().uri("/api/v1/specialties")).hasStatusOk();
    assertThat(mvc.get().uri("/api/v1/first-free-slots")).hasStatusOk();
    assertThat(mvc.get().uri("/actuator/health")).hasStatusOk();
    assertThat(mvc.get().uri("/v3/api-docs")).hasStatusOk();
  }

  @Test
  void theStaffAreaRequiresSigningIn() {
    assertThat(mvc.get().uri("/api/v1/staff/agenda?date=2027-02-15"))
        .hasStatus(HttpStatus.UNAUTHORIZED)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/unauthenticated");
  }

  @Test
  void theStaffAreaIsOpenToASignedInUser() {
    assertThat(
            mvc.get().uri("/api/v1/staff/agenda?date=2027-02-15").with(user("anna").roles("STAFF")))
        .hasStatusOk();
  }

  @Test
  void anythingNotExplicitlyOpenedIsClosed() {
    assertThat(mvc.get().uri("/api/v1/something-else")).hasStatus(HttpStatus.UNAUTHORIZED);
    assertThat(mvc.get().uri("/actuator/env")).hasStatus(HttpStatus.UNAUTHORIZED);
    assertThat(mvc.get().uri("/api/v1/something-else").with(user("anna").roles("STAFF")))
        .hasStatus(HttpStatus.FORBIDDEN);
  }

  @Test
  void refusesAStateChangingRequestWithoutACsrfToken() {
    MvcTestResult result =
        mvc.post()
            .uri("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .param("username", "anna")
            .param("password", "correct-horse-battery")
            .exchange();

    assertThat(result)
        .hasStatus(HttpStatus.FORBIDDEN)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/forbidden");
  }

  /**
   * The real browser flow, without test shortcuts: every response carries the token in a cookie
   * JavaScript can read, and the application sends it back in a header.
   */
  @Test
  void acceptsTheCsrfTokenThatASinglePageAppReadsFromTheCookie() {
    String setCookie =
        mvc.get().uri("/api/v1/specialties").exchange().getResponse().getHeader("Set-Cookie");
    assertThat(setCookie).startsWith("XSRF-TOKEN=").doesNotContainIgnoringCase("HttpOnly");
    String token = setCookie.substring("XSRF-TOKEN=".length(), setCookie.indexOf(';'));

    MvcTestResult result =
        mvc.post()
            .uri("/api/v1/auth/login")
            .cookie(new Cookie("XSRF-TOKEN", token))
            .header("X-XSRF-TOKEN", token)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .param("username", "anna")
            .param("password", "correct-horse-battery")
            .exchange();

    assertThat(result).hasStatus(HttpStatus.NO_CONTENT);
  }
}
